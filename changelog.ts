export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'breaking';
    description: string;
  }[];
}

export const APP_VERSION = '1.0.0';

export const changelog: ChangelogEntry[] = [
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
