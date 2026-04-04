import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { buildYahooMessageId, parseYahooMessageId } from './yahooMessageId';

export interface YahooEmail {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  snippet: string;
  date: string;
  isRead: boolean;
}

export interface YahooEmailDetail extends YahooEmail {
  body: string;
  bodyText: string;
  attachments?: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

interface ImapSession {
  imap: Imap;
  email: string;
  appPassword: string;
  connected: boolean;
}

export interface YahooConnectionStatus {
  hasSession: boolean;
  connected: boolean;
  reconnectable: boolean;
}

// Store active sessions (in production, use Redis or similar)
const sessions: Map<string, ImapSession> = new Map();

export class YahooImapService {
  private static logUidAction(action: string, email: string, details: Record<string, string | number | boolean>): void {
    console.log(`[YahooIMAP] ${action} (${email})`, details);
  }

  private static getSessionId(email: string): string {
    return email.toLowerCase();
  }

  static async connect(email: string, appPassword: string): Promise<{ success: boolean; error?: string }> {
    const sessionId = this.getSessionId(email);

    // Close existing connection if any
    if (sessions.has(sessionId)) {
      await this.disconnect(email);
    }

    return new Promise((resolve) => {
      const imap = new Imap({
        user: email,
        password: appPassword,
        host: 'imap.mail.yahoo.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
        connTimeout: 15000,
        keepalive: true,
      });

      imap.once('ready', () => {
        console.log(`[YahooIMAP] Connected: ${email}`);
        sessions.set(sessionId, { imap, email, appPassword, connected: true });
        resolve({ success: true });
      });

      imap.once('error', (err: Error) => {
        console.error(`[YahooIMAP] Connection error:`, err.message);
        const session = sessions.get(sessionId);
        if (session) {
          session.connected = false;
        }
        resolve({ success: false, error: err.message });
      });

      imap.once('end', () => {
        console.log(`[YahooIMAP] Connection ended: ${email}`);
        const session = sessions.get(sessionId);
        if (session) {
          session.connected = false;
        }
      });

      imap.once('close', (hadError: boolean) => {
        console.log(`[YahooIMAP] Connection closed: ${email}, hadError: ${hadError}`);
        const session = sessions.get(sessionId);
        if (session) {
          session.connected = false;
        }
      });

      imap.connect();
    });
  }

  // Ensure connection is active, reconnect if needed
  private static async ensureConnected(email: string): Promise<Imap> {
    const sessionId = this.getSessionId(email);
    const session = sessions.get(sessionId);

    if (!session) {
      throw new Error('No session found. Please connect first.');
    }

    // Check if connection is still active
    if (!session.connected || session.imap.state !== 'authenticated') {
      console.log(`[YahooIMAP] Reconnecting: ${email}`);

      // Try to reconnect using stored credentials
      const result = await this.connect(email, session.appPassword);
      if (!result.success) {
        throw new Error(`Reconnection failed: ${result.error}`);
      }

      const newSession = sessions.get(sessionId);
      if (!newSession) {
        throw new Error('Reconnection failed: no session created');
      }
      return newSession.imap;
    }

    return session.imap;
  }

  static async disconnect(email: string): Promise<void> {
    const sessionId = this.getSessionId(email);
    const session = sessions.get(sessionId);

    if (session) {
      try {
        session.imap.end();
      } catch (e) {
        // Ignore errors during disconnect
      }
      sessions.delete(sessionId);
      console.log(`[YahooIMAP] Disconnected: ${email}`);
    }
  }

  static isConnected(email: string): boolean {
    const sessionId = this.getSessionId(email);
    // We can reconnect if we have credentials, so just check if session exists
    return sessions.has(sessionId);
  }

  static getConnectionStatus(email: string): YahooConnectionStatus {
    const sessionId = this.getSessionId(email);
    const session = sessions.get(sessionId);

    if (!session) {
      return {
        hasSession: false,
        connected: false,
        reconnectable: false,
      };
    }

    return {
      hasSession: true,
      connected: session.connected && session.imap.state === 'authenticated',
      reconnectable: Boolean(session.appPassword),
    };
  }

  static async fetchEmails(email: string, limit: number = 100): Promise<YahooEmail[]> {
    const imap = await this.ensureConnected(email);

    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open inbox: ${err.message}`));
          return;
        }

        const totalMessages = box.messages.total;
        if (totalMessages === 0) {
          resolve([]);
          return;
        }

        // Fetch most recent emails using sequence numbers for range
        const start = Math.max(1, totalMessages - limit + 1);
        const range = `${start}:${totalMessages}`;

        const emails: YahooEmail[] = [];
        // Use seq.fetch but get the UID from attributes for stable IDs
        const fetch = imap.seq.fetch(range, {
          bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
          struct: true,
        });

        fetch.on('message', (msg) => {
          let header = '';
          let body = '';
          const emailData: Partial<YahooEmail> = {
            isRead: true,
          };
          let uid: number | undefined;

          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', () => {
              if (info.which.includes('HEADER')) {
                header = buffer;
              } else {
                body = buffer;
              }
            });
          });

          msg.once('attributes', (attrs) => {
            // Get the UID - this is a permanent identifier that doesn't change
            uid = attrs.uid;
            // Check if SEEN flag is present
            emailData.isRead = attrs.flags?.includes('\\Seen') ?? false;
          });

          msg.once('end', () => {
            if (!uid) {
              return;
            }

            // Use UID for stable ID instead of sequence number
            emailData.id = buildYahooMessageId(uid);

            // Parse header
            const fromMatch = header.match(/From:\s*(.+)/i);
            const subjectMatch = header.match(/Subject:\s*(.+)/i);
            const dateMatch = header.match(/Date:\s*(.+)/i);

            if (fromMatch) {
              const fromRaw = fromMatch[1].trim();
              const emailMatch = fromRaw.match(/<(.+)>/);
              const nameMatch = fromRaw.match(/^"?([^"<]+)"?\s*</);

              emailData.senderEmail = emailMatch ? emailMatch[1] : fromRaw;
              emailData.sender = nameMatch ? nameMatch[1].trim() : emailData.senderEmail.split('@')[0];
            }

            emailData.subject = subjectMatch ? subjectMatch[1].trim() : '(No Subject)';
            emailData.date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
            emailData.snippet = body.substring(0, 200).replace(/\s+/g, ' ').trim() || '';

            if (emailData.senderEmail) {
              emails.push(emailData as YahooEmail);
            }
          });
        });

        fetch.once('error', (err) => {
          reject(new Error(`Fetch error: ${err.message}`));
        });

        fetch.once('end', () => {
          // Sort by date descending (newest first)
          emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          resolve(emails);
        });
      });
    });
  }

  static async fetchEmailDetail(email: string, messageId: string): Promise<YahooEmailDetail> {
    const imap = await this.ensureConnected(email);
    const { uid, isLegacy } = parseYahooMessageId(messageId);
    this.logUidAction('Fetch detail requested', email, { messageId, uid, isLegacy });

    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(new Error(`Failed to open inbox: ${err.message}`));
          return;
        }

        // Use UID-based fetch instead of sequence number
        const fetch = imap.fetch(uid, {
          bodies: '',
          struct: true,
        });

        let settled = false;
        const matches: YahooEmailDetail[] = [];
        const parseTasks: Promise<void>[] = [];

        fetch.on('message', (msg) => {
          let rawEmail = '';
          let isRead = false;
          let fetchedUid: number | undefined;

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              rawEmail += chunk.toString('utf8');
            });
          });

          msg.once('attributes', (attrs) => {
            fetchedUid = attrs.uid;
            isRead = attrs.flags?.includes('\\Seen') ?? false;
          });

          msg.once('end', async () => {
            const parseTask = (async () => {
              if (fetchedUid !== uid) {
                return;
              }

              const parsed = await simpleParser(rawEmail);

              matches.push({
                id: buildYahooMessageId(uid),
                subject: parsed.subject || '(No Subject)',
                sender: parsed.from?.value[0]?.name || parsed.from?.value[0]?.address?.split('@')[0] || 'Unknown',
                senderEmail: parsed.from?.value[0]?.address || '',
                snippet: (parsed.text || '').substring(0, 200).replace(/\s+/g, ' ').trim(),
                date: parsed.date?.toISOString() || new Date().toISOString(),
                isRead,
                body: parsed.html || parsed.textAsHtml || '',
                bodyText: parsed.text || '',
                replyTo: Array.isArray(parsed.replyTo)
                  ? parsed.replyTo[0]?.value[0]?.address
                  : parsed.replyTo?.value[0]?.address,
                cc: parsed.cc
                  ? (Array.isArray(parsed.cc)
                      ? parsed.cc.flatMap(addr => addr.value.map(v => v.address).filter(Boolean))
                      : parsed.cc.value.map(v => v.address).filter(Boolean)) as string[]
                  : undefined,
                attachments: parsed.attachments?.map((att, idx) => ({
                  id: `att-${idx}`,
                  filename: att.filename || 'attachment',
                  mimeType: att.contentType || 'application/octet-stream',
                  size: att.size || 0,
                })),
              });
            })();

            parseTasks.push(parseTask);
          });
        });

        fetch.once('error', (fetchErr) => {
          if (!settled) {
            settled = true;
            reject(new Error(`Fetch error: ${fetchErr.message}`));
          }
        });

        fetch.once('end', async () => {
          if (settled) {
            return;
          }

          try {
            const parseResults = await Promise.allSettled(parseTasks);
            const parseFailure = parseResults.find(
              (result): result is PromiseRejectedResult => result.status === 'rejected'
            );

            if (parseFailure) {
              settled = true;
              const reason = parseFailure.reason as Error;
              reject(new Error(`Failed to parse email: ${reason.message}`));
              return;
            }
          } catch (parseErr: any) {
            settled = true;
            reject(new Error(`Failed to parse email: ${parseErr.message}`));
            return;
          }

          this.logUidAction('Fetch detail completed', email, {
            messageId,
            uid,
            matches: matches.length,
          });

          if (matches.length === 0) {
            settled = true;
            reject(new Error(`Yahoo message not found for UID ${uid}`));
            return;
          }

          if (matches.length > 1) {
            settled = true;
            reject(new Error(`Yahoo message fetch returned multiple matches for UID ${uid}`));
            return;
          }

          settled = true;
          resolve(matches[0]);
        });
      });
    });
  }

  static async trashEmails(email: string, messageIds: string[]): Promise<{ success: boolean; trashedCount: number; failedIds: string[] }> {
    const imap = await this.ensureConnected(email);
    const trashedIds: string[] = [];
    const failedIds: string[] = [];

    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, async (err) => {
        if (err) {
          reject(new Error(`Failed to open inbox: ${err.message}`));
          return;
        }

        for (const msgId of messageIds) {
          try {
            const { uid, isLegacy } = parseYahooMessageId(msgId);
            this.logUidAction('Trash requested', email, { messageId: msgId, uid, isLegacy });

            await new Promise<void>((resolveMove) => {
              // Move to Trash folder using UID (Yahoo uses "Trash" folder)
              imap.move(uid, 'Trash', (moveErr) => {
                if (moveErr) {
                  console.error(`[YahooIMAP] Failed to trash ${msgId}:`, moveErr.message);
                  failedIds.push(msgId);
                  resolveMove(); // Don't reject, continue with others
                } else {
                  this.logUidAction('Trash succeeded', email, { messageId: msgId, uid });
                  trashedIds.push(msgId);
                  resolveMove();
                }
              });
            });
          } catch (e) {
            console.error(`[YahooIMAP] Failed to parse message ID for trash: ${msgId}`, e);
            failedIds.push(msgId);
          }
        }

        // Close the box with expunge=true to sync the mailbox state
        // This ensures moved messages are properly removed from the inbox view
        imap.closeBox(true, (closeErr) => {
          if (closeErr) {
            console.error(`[YahooIMAP] Failed to close/expunge:`, closeErr.message);
          }
          resolve({
            success: failedIds.length === 0,
            trashedCount: trashedIds.length,
            failedIds,
          });
        });
      });
    });
  }
}
