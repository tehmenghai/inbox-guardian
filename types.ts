export type ViewState = 'auth' | 'scanning' | 'senderGroups' | 'senderDetail' | 'emailDetail' | 'success';

export type EmailCategory = 'Promotional' | 'Notification' | 'Newsletter' | 'Social' | 'Finance' | 'Personal' | 'Spam';

export type MailboxProviderType = 'google' | 'yahoo';

export interface Email {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  snippet: string;
  date: string;
  isRead: boolean;
}

export interface AIAnalysisResult {
  emailId: string;
  category: EmailCategory;
  confidence: number; // 0-1
  reasoning: string;
  suggestedAction: 'archive' | 'delete' | 'keep' | 'mark_read';
  riskLevel: 'low' | 'medium' | 'high'; // Risk of deleting accidentally
}

export interface MockUserStats {
  totalEmails: number;
  unread: number;
  storageUsedGB: number;
  clutterScore: number; // 0-100
}

export interface SimilarEmailResult {
  emailId: string;
  similarityScore: number;  // 0-1
  matchReason: string;
}

export interface TrashOperationResult {
  success: boolean;
  trashedCount: number;
  failedIds: string[];
  errorMessage?: string;
}

export interface SenderGroup {
  senderEmail: string;
  senderName: string;
  emailCount: number;
  emails: Email[];
  unreadCount: number;
  oldestDate: string;
  newestDate: string;
  analysis?: SenderGroupAnalysis;
}

export interface SenderGroupAnalysis {
  category: EmailCategory;
  recommendation: 'keep' | 'archive' | 'delete' | 'review';
  summary: string;
  confidence: number;
}

// Full email content for detail view
export interface EmailDetail extends Email {
  body: string;        // Full email body (HTML or plain text)
  bodyText: string;    // Plain text version
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

// AI analysis with actionable suggestions
export type EmailActionType = 'reply' | 'forward' | 'delete' | 'archive' | 'star' | 'snooze' | 'unsubscribe' | 'mark_spam';

export interface EmailAction {
  type: EmailActionType;
  label: string;
  description: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  icon?: string;
  draftContent?: string; // For reply/forward actions
}

export interface EmailAIAnalysis {
  emailId: string;
  summary: string;           // Brief summary of the email
  keyPoints: string[];       // Bullet points of important info
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  category: EmailCategory;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  suggestedActions: EmailAction[];
  requiresResponse: boolean;
  responseDeadline?: string; // If there's a deadline mentioned
  extractedInfo?: {          // Extracted structured data
    dates?: string[];
    amounts?: string[];
    links?: string[];
    people?: string[];
    organizations?: string[];
  };
}