export interface ParsedYahooMessageId {
  uid: number;
  isLegacy: boolean;
}

const UID_PREFIX = 'yahoo-uid-';
const LEGACY_PREFIX = 'yahoo-';

export function buildYahooMessageId(uid: number): string {
  if (!Number.isInteger(uid) || uid <= 0) {
    throw new Error(`Invalid Yahoo UID: ${uid}`);
  }

  return `${UID_PREFIX}${uid}`;
}

export function parseYahooMessageId(messageId: string): ParsedYahooMessageId {
  if (typeof messageId !== 'string' || messageId.trim() === '') {
    throw new Error(`Invalid message ID: ${messageId}`);
  }

  if (messageId.startsWith(UID_PREFIX)) {
    const uid = Number.parseInt(messageId.slice(UID_PREFIX.length), 10);
    if (Number.isInteger(uid) && uid > 0) {
      return { uid, isLegacy: false };
    }
  } else if (messageId.startsWith(LEGACY_PREFIX)) {
    const uid = Number.parseInt(messageId.slice(LEGACY_PREFIX.length), 10);
    if (Number.isInteger(uid) && uid > 0) {
      return { uid, isLegacy: true };
    }
  }

  throw new Error(`Invalid message ID: ${messageId}`);
}
