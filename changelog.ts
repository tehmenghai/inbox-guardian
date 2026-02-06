export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'breaking';
    description: string;
  }[];
}

export const APP_VERSION = '1.0.2';

export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.2',
    date: '2026-02-06',
    title: 'Yahoo Mail Bug Fix',
    changes: [
      {
        type: 'fix',
        description: 'Fixed Yahoo Mail email mismatch bug after deletion by forcing component re-render',
      },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-02-06',
    title: 'Bug Fix Release',
    changes: [
      {
        type: 'fix',
        description: 'Fixed critical bug where email content would mismatch after deleting emails',
      },
      {
        type: 'fix',
        description: 'Fixed stale state issues in async handlers causing incorrect email selection',
      },
      {
        type: 'improvement',
        description: 'Improved Yahoo Mail reliability by reducing email fetch limit',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-01-24',
    title: 'Initial Release',
    changes: [
      {
        type: 'feature',
        description: 'Email inbox scanning with Google Gmail and Yahoo Mail support',
      },
      {
        type: 'feature',
        description: 'AI-powered email analysis using Google Gemini',
      },
      {
        type: 'feature',
        description: 'Smart sender grouping to organize emails by sender',
      },
      {
        type: 'feature',
        description: 'Bulk email deletion with multi-select support',
      },
      {
        type: 'feature',
        description: 'Detailed email view with full content and attachments',
      },
      {
        type: 'feature',
        description: 'AI-generated email summaries, key points, and suggested actions',
      },
      {
        type: 'feature',
        description: 'AI-generated reply drafts for quick responses',
      },
      {
        type: 'improvement',
        description: 'Enhanced deletion UI with progress indicator and success animation',
      },
      {
        type: 'improvement',
        description: 'Responsive design for mobile and desktop',
      },
      {
        type: 'feature',
        description: 'Version display and changelog viewer',
      },
    ],
  },
];
