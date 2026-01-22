import { Email, EmailDetail, MailboxProviderType, TrashOperationResult } from '../types';
import { generateMockEmails } from '../utils/mockData';

// --- CONFIGURATION ---
const DEFAULT_GOOGLE_CLIENT_ID = '580373285034-ckli1oefnfr46set1p62t9teeq9h7qvb.apps.googleusercontent.com'; 
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // Optional

export interface MailboxProvider {
  providerName: string;
  isAuthenticated: boolean;
  connect(provider: MailboxProviderType, customClientId?: string): Promise<void>;
  fetchUnreadEmails(limit?: number): Promise<Email[]>;
}

// Yahoo backend API URL - Use environment variable for production
const YAHOO_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/yahoo';

export const PROVIDER_CONFIG: Record<MailboxProviderType, { name: string; scopes: string[], authEndpoint: string }> = {
  google: {
    name: 'Google Gmail',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'],
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
  },
  yahoo: {
    name: 'Yahoo Mail',
    scopes: [], // Not using OAuth, using IMAP via backend
    authEndpoint: '' // Backend proxy handles auth
  }
};

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

class MailboxService implements MailboxProvider {
  providerName = 'MockProvider';
  isAuthenticated = false;
  private useMock = true;
  private tokenClient: any;
  private clientId = DEFAULT_GOOGLE_CLIENT_ID;
  private yahooEmail: string | null = null;

  async connect(provider: MailboxProviderType, customClientId?: string): Promise<void> {
    const config = PROVIDER_CONFIG[provider];
    this.providerName = config.name;

    // Update Client ID if provided
    if (customClientId && customClientId.trim() !== '') {
      this.clientId = customClientId;
    }

    // Determine if we should use Real Auth or Mock
    // We use real auth if:
    // 1. Provider is Google
    // 2. We have a valid-looking Client ID (not the default placeholder)
    const isRealConfigured = this.clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && !this.clientId.includes('YOUR_GOOGLE');

    if (provider === 'google' && isRealConfigured) {
      this.useMock = false;
      await this.connectToRealGmail();
    } else if (provider === 'yahoo') {
      // Yahoo uses backend proxy - should call connectYahoo instead
      throw new Error('Use connectYahoo() for Yahoo Mail authentication');
    } else {
      this.useMock = true;
      await this.connectToMock(config);
    }
  }

  async connectYahoo(email: string, appPassword: string): Promise<void> {
    console.log("[MailboxService] Connecting to Yahoo Mail via backend...");
    this.providerName = 'Yahoo Mail';

    try {
      const response = await fetch(`${YAHOO_API_BASE}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, appPassword })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to connect to Yahoo Mail');
      }

      this.yahooEmail = email;
      this.useMock = false;
      this.isAuthenticated = true;
      console.log("[MailboxService] Connected to Yahoo Mail!");
    } catch (error: any) {
      console.error("[MailboxService] Yahoo connection error:", error);
      throw new Error(error.message || 'Failed to connect to Yahoo Mail');
    }
  }

  async disconnectYahoo(): Promise<void> {
    if (!this.yahooEmail) return;

    try {
      await fetch(`${YAHOO_API_BASE}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.yahooEmail })
      });
    } catch (e) {
      // Ignore disconnect errors
    }

    this.yahooEmail = null;
    this.isAuthenticated = false;
    console.log("[MailboxService] Disconnected from Yahoo Mail");
  }

  private async connectToRealGmail(): Promise<void> {
    console.log("[MailboxService] Initializing Real Google Auth with ID:", this.clientId);
    
    return new Promise((resolve, reject) => {
      const initializeGapiClient = async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_API_KEY !== 'YOUR_GOOGLE_API_KEY' ? GOOGLE_API_KEY : undefined,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
          });
          
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: PROVIDER_CONFIG.google.scopes.join(' '),
            callback: (resp: any) => {
              if (resp.error) {
                console.error("Auth callback error:", resp);
                reject(resp);
                return;
              }
              if (resp.access_token) {
                 this.isAuthenticated = true;
                 console.log("[MailboxService] Authenticated with Google!");
                 resolve();
              } else {
                 reject(new Error("No access token received"));
              }
            },
          });

          // Trigger the popup
          // Note: If the Client ID is invalid or origin mismatch, 
          // the popup will show a 400 error and callback might not fire, 
          // or fire with an error field depending on the failure mode.
          this.tokenClient.requestAccessToken({ prompt: 'consent' });

        } catch (error) {
          console.error("GAPI Init Error", error);
          reject(error);
        }
      };

      if (window.gapi && window.google) {
        window.gapi.load('client', initializeGapiClient);
      } else {
        reject(new Error("Google API scripts not loaded. Check your internet connection."));
      }
    });
  }

  private async connectToMock(config: any): Promise<void> {
    console.log(`[MailboxService] Initiating ${config.name} OAuth Handshake (Mock)...`);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    this.isAuthenticated = true;
    console.log(`[MailboxService] Successfully connected to ${config.name} (Mock Mode)`);
  }

  async fetchUnreadEmails(limit: number = 50): Promise<Email[]> {
    if (!this.isAuthenticated) {
      throw new Error("User not authenticated. Please login first.");
    }

    if (!this.useMock && this.providerName === 'Google Gmail') {
      return this.fetchRealGmail(limit);
    }

    if (!this.useMock && this.providerName === 'Yahoo Mail' && this.yahooEmail) {
      return this.fetchYahooEmails(limit);
    }

    // Mock Fallback
    await new Promise(resolve => setTimeout(resolve, 800));
    return generateMockEmails(limit);
  }

  private async fetchYahooEmails(limit: number): Promise<Email[]> {
    console.log("[MailboxService] Fetching emails from Yahoo via backend...");

    try {
      const response = await fetch(
        `${YAHOO_API_BASE}/emails?email=${encodeURIComponent(this.yahooEmail!)}&limit=${limit}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch Yahoo emails');
      }

      // Map Yahoo email format to our Email type
      return data.emails.map((e: any) => ({
        id: e.id,
        subject: e.subject,
        sender: e.sender,
        senderEmail: e.senderEmail,
        snippet: e.snippet,
        date: e.date,
        isRead: e.isRead
      }));
    } catch (error: any) {
      console.error("[MailboxService] Yahoo fetch error:", error);
      throw new Error(error.message || 'Failed to fetch Yahoo emails');
    }
  }

  private async fetchRealGmail(limit: number): Promise<Email[]> {
    try {
      console.log("[MailboxService] Fetching real emails from Gmail API...");

      const response = await window.gapi.client.gmail.users.messages.list({
        'userId': 'me',
        'q': 'is:unread',
        'maxResults': limit
      });

      const messages = response.result.messages || [];
      const emails: Email[] = [];

      // Batch fetch to avoid rate limiting (429 errors)
      // Fetch 5 emails at a time with a small delay between batches
      const BATCH_SIZE = 5;
      const DELAY_MS = 100;

      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (msg: any) => {
          const detail = await window.gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': msg.id
          });
          return this.parseGmailMessage(detail.result);
        });

        const batchResults = await Promise.all(batchPromises);
        emails.push(...batchResults);

        // Add delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < messages.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      return emails;
    } catch (error) {
      console.error("Error fetching Gmail messages", error);
      throw error;
    }
  }

  private parseGmailMessage(message: any): Email {
    const headers = message.payload.headers;
    const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

    const fromHeader = getHeader('From');
    // Parse "Name <email@domain.com>"
    const nameMatch = fromHeader.match(/(^.*?)\s*<(.*)>/);
    const sender = nameMatch ? nameMatch[1].replace(/"/g, '') : fromHeader.split('@')[0];
    const senderEmail = nameMatch ? nameMatch[2] : fromHeader;

    return {
      id: message.id,
      subject: getHeader('Subject') || '(No Subject)',
      sender: sender,
      senderEmail: senderEmail,
      snippet: message.snippet,
      date: new Date(Number(message.internalDate)).toISOString(),
      isRead: !message.labelIds?.includes('UNREAD')
    };
  }

  async searchEmailsBySender(senderEmail: string, limit: number = 50): Promise<Email[]> {
    if (!this.isAuthenticated) {
      throw new Error("User not authenticated. Please login first.");
    }

    if (!this.useMock && this.providerName === 'Google Gmail') {
      return this.searchRealGmailBySender(senderEmail, limit);
    }

    // Mock fallback
    return this.mockSearchBySender(senderEmail, limit);
  }

  private async searchRealGmailBySender(senderEmail: string, limit: number): Promise<Email[]> {
    try {
      console.log(`[MailboxService] Searching Gmail for emails from: ${senderEmail}`);

      const response = await window.gapi.client.gmail.users.messages.list({
        'userId': 'me',
        'q': `from:${senderEmail}`,
        'maxResults': limit
      });

      const messages = response.result.messages || [];

      if (messages.length === 0) {
        return [];
      }

      const emails: Email[] = [];

      // Batch fetch to avoid rate limiting
      const BATCH_SIZE = 5;
      const DELAY_MS = 100;

      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (msg: any) => {
          const detail = await window.gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': msg.id
          });
          return this.parseGmailMessage(detail.result);
        });

        const batchResults = await Promise.all(batchPromises);
        emails.push(...batchResults);

        if (i + BATCH_SIZE < messages.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      return emails;
    } catch (error) {
      console.error("Error searching Gmail by sender:", error);
      throw error;
    }
  }

  private async mockSearchBySender(senderEmail: string, limit: number): Promise<Email[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`[MailboxService] Mock: Searching for emails from ${senderEmail}`);

    // Generate mock emails from the same sender
    const mockEmails: Email[] = [];
    const senderName = senderEmail.split('@')[0].replace(/[._]/g, ' ');
    const count = Math.min(limit, Math.floor(Math.random() * 15) + 3); // 3-17 emails

    for (let i = 0; i < count; i++) {
      mockEmails.push({
        id: `mock-search-${Date.now()}-${i}`,
        subject: this.generateMockSubject(senderEmail),
        sender: senderName.charAt(0).toUpperCase() + senderName.slice(1),
        senderEmail: senderEmail,
        snippet: 'This is a mock email snippet for demonstration purposes...',
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        isRead: Math.random() > 0.5
      });
    }

    return mockEmails;
  }

  private generateMockSubject(senderEmail: string): string {
    const domain = senderEmail.split('@')[1]?.split('.')[0] || 'company';
    const subjects = [
      `Your ${domain} order has shipped`,
      `Thanks for your purchase at ${domain}`,
      `${domain}: Your weekly digest`,
      `Special offer from ${domain}`,
      `Your ${domain} account update`,
      `New deals at ${domain}`,
      `${domain} newsletter`,
      `Receipt from ${domain}`,
    ];
    return subjects[Math.floor(Math.random() * subjects.length)];
  }

  async trashEmails(emailIds: string[]): Promise<TrashOperationResult> {
    if (!this.isAuthenticated) {
      return {
        success: false,
        trashedCount: 0,
        failedIds: emailIds,
        errorMessage: "User not authenticated. Please login first."
      };
    }

    if (emailIds.length === 0) {
      return {
        success: true,
        trashedCount: 0,
        failedIds: []
      };
    }

    if (!this.useMock && this.providerName === 'Google Gmail') {
      return this.trashRealGmailEmails(emailIds);
    }

    if (!this.useMock && this.providerName === 'Yahoo Mail' && this.yahooEmail) {
      return this.trashYahooEmails(emailIds);
    }

    // Mock fallback
    return this.mockTrashEmails(emailIds);
  }

  private async trashYahooEmails(emailIds: string[]): Promise<TrashOperationResult> {
    console.log("[MailboxService] Moving Yahoo emails to trash via backend...", emailIds.length, "emails");

    try {
      const response = await fetch(`${YAHOO_API_BASE}/trash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.yahooEmail,
          messageIds: emailIds
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trash Yahoo emails');
      }

      return {
        success: data.success,
        trashedCount: data.trashedCount,
        failedIds: data.failedIds || [],
        errorMessage: data.failedIds?.length > 0
          ? `Failed to trash ${data.failedIds.length} email(s)`
          : undefined
      };
    } catch (error: any) {
      console.error("[MailboxService] Yahoo trash error:", error);
      return {
        success: false,
        trashedCount: 0,
        failedIds: emailIds,
        errorMessage: error.message || 'Failed to trash Yahoo emails'
      };
    }
  }

  private async trashRealGmailEmails(emailIds: string[]): Promise<TrashOperationResult> {
    try {
      console.log("[MailboxService] Moving emails to trash via Gmail API...", emailIds.length, "emails");

      const failedIds: string[] = [];
      let trashedCount = 0;

      // Batch trash to avoid rate limiting (429 errors)
      const BATCH_SIZE = 5;
      const DELAY_MS = 200;

      for (let i = 0; i < emailIds.length; i += BATCH_SIZE) {
        const batch = emailIds.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
          batch.map(id =>
            window.gapi.client.gmail.users.messages.trash({
              userId: 'me',
              id: id
            })
          )
        );

        batchResults.forEach((result, index) => {
          const emailId = batch[index];
          if (result.status === 'fulfilled') {
            trashedCount++;
            console.log(`[MailboxService] Trashed email ${emailId}`);
          } else {
            const errorDetails = result.reason?.result?.error || result.reason;
            console.error(`[MailboxService] Failed to trash email ${emailId}:`, errorDetails);
            failedIds.push(emailId);
          }
        });

        // Add delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < emailIds.length) {
          console.log(`[MailboxService] Processed ${Math.min(i + BATCH_SIZE, emailIds.length)}/${emailIds.length}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      console.log(`[MailboxService] Trash complete: ${trashedCount} succeeded, ${failedIds.length} failed`);

      return {
        success: failedIds.length === 0,
        trashedCount,
        failedIds,
        errorMessage: failedIds.length > 0
          ? `Failed to trash ${failedIds.length} email(s)`
          : undefined
      };
    } catch (error: any) {
      console.error("[MailboxService] Error trashing emails:", error);
      return {
        success: false,
        trashedCount: 0,
        failedIds: emailIds,
        errorMessage: error?.message || "Failed to move emails to trash"
      };
    }
  }

  private async mockTrashEmails(emailIds: string[]): Promise<TrashOperationResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    console.log("[MailboxService] Mock: Moving emails to trash:", emailIds);

    // Simulate occasional partial failures (10% chance per email)
    const failedIds: string[] = [];
    let trashedCount = 0;

    for (const id of emailIds) {
      if (Math.random() > 0.9) {
        failedIds.push(id);
      } else {
        trashedCount++;
      }
    }

    return {
      success: failedIds.length === 0,
      trashedCount,
      failedIds,
      errorMessage: failedIds.length > 0
        ? `Failed to trash ${failedIds.length} email(s)`
        : undefined
    };
  }

  // Fetch full email content
  async fetchEmailContent(emailId: string, basicEmail: Email): Promise<EmailDetail> {
    if (!this.isAuthenticated) {
      throw new Error("User not authenticated. Please login first.");
    }

    if (!this.useMock && this.providerName === 'Google Gmail') {
      return this.fetchGmailContent(emailId, basicEmail);
    }

    if (!this.useMock && this.providerName === 'Yahoo Mail' && this.yahooEmail) {
      return this.fetchYahooContent(emailId, basicEmail);
    }

    // Mock fallback
    return this.mockFetchEmailContent(basicEmail);
  }

  private async fetchGmailContent(emailId: string, basicEmail: Email): Promise<EmailDetail> {
    try {
      console.log("[MailboxService] Fetching full email content from Gmail API...");

      const response = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      });

      const message = response.result;
      let body = '';
      let bodyText = '';

      // Extract body from message parts
      const extractBody = (parts: any[]): { html: string; text: string } => {
        let html = '';
        let text = '';

        for (const part of parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } else if (part.parts) {
            const nested = extractBody(part.parts);
            if (nested.html) html = nested.html;
            if (nested.text) text = nested.text;
          }
        }

        return { html, text };
      };

      if (message.payload.parts) {
        const extracted = extractBody(message.payload.parts);
        body = extracted.html || extracted.text;
        bodyText = extracted.text || extracted.html;
      } else if (message.payload.body?.data) {
        body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        bodyText = body;
      }

      // Extract attachments
      const attachments = message.payload.parts
        ?.filter((part: any) => part.filename && part.body?.attachmentId)
        .map((part: any) => ({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0
        })) || [];

      return {
        ...basicEmail,
        body,
        bodyText,
        attachments
      };
    } catch (error) {
      console.error("[MailboxService] Error fetching Gmail content:", error);
      // Fall back to snippet
      return {
        ...basicEmail,
        body: basicEmail.snippet,
        bodyText: basicEmail.snippet
      };
    }
  }

  private async fetchYahooContent(emailId: string, basicEmail: Email): Promise<EmailDetail> {
    try {
      console.log("[MailboxService] Fetching full email content from Yahoo via backend...");

      const response = await fetch(
        `${YAHOO_API_BASE}/email/${emailId}?email=${encodeURIComponent(this.yahooEmail!)}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch Yahoo email content');
      }

      const emailDetail = data.email;

      return {
        ...basicEmail,
        body: emailDetail.body || basicEmail.snippet,
        bodyText: emailDetail.bodyText || basicEmail.snippet,
        attachments: emailDetail.attachments || [],
        replyTo: emailDetail.replyTo,
        cc: emailDetail.cc,
        bcc: emailDetail.bcc
      };
    } catch (error) {
      console.error("[MailboxService] Error fetching Yahoo content:", error);
      // Fall back to snippet
      return {
        ...basicEmail,
        body: basicEmail.snippet,
        bodyText: basicEmail.snippet
      };
    }
  }

  private async mockFetchEmailContent(basicEmail: Email): Promise<EmailDetail> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate mock email body based on snippet
    const mockBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <p>Dear User,</p>
        <p>${basicEmail.snippet}</p>
        <p>This is a mock email body generated for demonstration purposes. The actual email content would appear here with full formatting, images, and links.</p>
        <p>Key information in this email:</p>
        <ul>
          <li>Subject: ${basicEmail.subject}</li>
          <li>From: ${basicEmail.sender}</li>
          <li>Date: ${new Date(basicEmail.date).toLocaleDateString()}</li>
        </ul>
        <p>Best regards,<br/>${basicEmail.sender}</p>
      </div>
    `;

    return {
      ...basicEmail,
      body: mockBody,
      bodyText: basicEmail.snippet,
      attachments: []
    };
  }
}

export const mailboxService = new MailboxService();