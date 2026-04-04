import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { YahooImapService } from '../services/yahooImapService';
import { buildYahooMessageId, parseYahooMessageId } from '../services/yahooMessageId';

type EnsureConnectedFn = (email: string) => Promise<any>;

const serviceClass = YahooImapService as unknown as {
  ensureConnected: EnsureConnectedFn;
};

const originalEnsureConnected = serviceClass.ensureConnected;

afterEach(() => {
  serviceClass.ensureConnected = originalEnsureConnected;
});

function installFakeImap(imap: any): void {
  serviceClass.ensureConnected = async () => imap;
}

function emitMessage(fetchEmitter: EventEmitter, options: { uid: number; raw: string; flags?: string[] }): Promise<void> {
  const messageEmitter = new EventEmitter();
  fetchEmitter.emit('message', messageEmitter);

  return new Promise((resolve) => {
    process.nextTick(() => {
      const stream = new EventEmitter();
      messageEmitter.emit('body', stream);
      stream.emit('data', Buffer.from(options.raw, 'utf8'));
      stream.emit('end');
      messageEmitter.emit('attributes', {
        uid: options.uid,
        flags: options.flags ?? [],
      });
      messageEmitter.emit('end');
      resolve();
    });
  });
}

test('parseYahooMessageId parses canonical Yahoo UID IDs', () => {
  assert.deepEqual(parseYahooMessageId('yahoo-uid-123'), {
    uid: 123,
    isLegacy: false,
  });
  assert.equal(buildYahooMessageId(123), 'yahoo-uid-123');
});

test('parseYahooMessageId keeps best-effort legacy support and rejects malformed IDs', () => {
  assert.deepEqual(parseYahooMessageId('yahoo-456'), {
    uid: 456,
    isLegacy: true,
  });
  assert.throws(() => parseYahooMessageId('yahoo-uid-nope'), /Invalid message ID/);
  assert.throws(() => parseYahooMessageId(''), /Invalid message ID/);
});

test('fetchEmailDetail resolves only the exact requested Yahoo UID', async () => {
  const fakeImap = {
    state: 'authenticated',
    openBox: (_name: string, _readOnly: boolean, cb: (err: Error | null, box: any) => void) =>
      cb(null, { messages: { total: 1 } }),
    fetch: (uid: number) => {
      assert.equal(uid, 42);
      const fetchEmitter = new EventEmitter();

      setImmediate(async () => {
        await emitMessage(fetchEmitter, {
          uid: 42,
          raw: 'Subject: Exact match\r\nFrom: Sender <sender@example.com>\r\nDate: Fri, 01 Jan 2026 00:00:00 +0000\r\n\r\nHello exact match',
          flags: ['\\Seen'],
        });
        fetchEmitter.emit('end');
      });

      return fetchEmitter;
    },
  };

  installFakeImap(fakeImap);

  const detail = await YahooImapService.fetchEmailDetail('user@yahoo.com', 'yahoo-uid-42');

  assert.equal(detail.id, 'yahoo-uid-42');
  assert.equal(detail.subject, 'Exact match');
  assert.equal(detail.senderEmail, 'sender@example.com');
  assert.match(detail.bodyText, /Hello exact match/);
});

test('fetchEmailDetail rejects when the requested UID is not found', async () => {
  const fakeImap = {
    state: 'authenticated',
    openBox: (_name: string, _readOnly: boolean, cb: (err: Error | null, box: any) => void) =>
      cb(null, { messages: { total: 1 } }),
    fetch: (uid: number) => {
      assert.equal(uid, 99);
      const fetchEmitter = new EventEmitter();
      process.nextTick(() => {
        fetchEmitter.emit('end');
      });
      return fetchEmitter;
    },
  };

  installFakeImap(fakeImap);

  await assert.rejects(
    YahooImapService.fetchEmailDetail('user@yahoo.com', 'yahoo-uid-99'),
    /Yahoo message not found for UID 99/
  );
});

test('fetchEmailDetail rejects when multiple messages match a requested UID', async () => {
  const fakeImap = {
    state: 'authenticated',
    openBox: (_name: string, _readOnly: boolean, cb: (err: Error | null, box: any) => void) =>
      cb(null, { messages: { total: 2 } }),
    fetch: (uid: number) => {
      assert.equal(uid, 77);
      const fetchEmitter = new EventEmitter();

      setImmediate(async () => {
        await emitMessage(fetchEmitter, {
          uid: 77,
          raw: 'Subject: First\r\nFrom: Sender <sender@example.com>\r\n\r\nOne',
        });
        await emitMessage(fetchEmitter, {
          uid: 77,
          raw: 'Subject: Second\r\nFrom: Sender <sender@example.com>\r\n\r\nTwo',
        });
        fetchEmitter.emit('end');
      });

      return fetchEmitter;
    },
  };

  installFakeImap(fakeImap);

  await assert.rejects(
    YahooImapService.fetchEmailDetail('user@yahoo.com', 'yahoo-uid-77'),
    /multiple matches for UID 77/
  );
});

test('trashEmails uses UID-based moves and reports invalid IDs as failures', async () => {
  const moved: Array<{ uid: number; mailbox: string }> = [];

  const fakeImap = {
    state: 'authenticated',
    openBox: (_name: string, _readOnly: boolean, cb: (err: Error | null) => void) => cb(null),
    move: (uid: number, mailbox: string, cb: (err?: Error | null) => void) => {
      moved.push({ uid, mailbox });
      process.nextTick(() => cb(null));
    },
    closeBox: (_expunge: boolean, cb: (err?: Error | null) => void) => cb(null),
  };

  installFakeImap(fakeImap);

  const result = await YahooImapService.trashEmails('user@yahoo.com', [
    'yahoo-uid-10',
    'yahoo-20',
    'bad-id',
  ]);

  assert.deepEqual(moved, [
    { uid: 10, mailbox: 'Trash' },
    { uid: 20, mailbox: 'Trash' },
  ]);
  assert.equal(result.trashedCount, 2);
  assert.deepEqual(result.failedIds, ['bad-id']);
});
