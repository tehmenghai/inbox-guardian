import { Email } from '../types';

const SENDERS = [
  { name: 'Amazon.com', email: 'shipment-tracking@amazon.com' },
  { name: 'Netflix', email: 'info@mailer.netflix.com' },
  { name: 'LinkedIn', email: 'notifications@linkedin.com' },
  { name: 'Uber Eats', email: 'uber@uber.com' },
  { name: 'Slack', email: 'notification@slack.com' },
  { name: 'Old Navy', email: 'promos@oldnavy.com' },
  { name: 'Robinhood', email: 'statements@robinhood.com' },
  { name: 'Sarah Jenkins', email: 'sarah.j@workplace.com' },
  { name: 'Atlassian Jira', email: 'jira@atlassian.net' },
  { name: 'Spotify', email: 'no-reply@spotify.com' },
];

const SUBJECTS = [
  "Your package has shipped!",
  "Top picks for you: New Dramas",
  "You appeared in 4 searches this week",
  "50% off your next order",
  "New login detected on Mac OS X",
  "Huge Sale! Everything must go.",
  "Your monthly statement is ready",
  "Project Sync - Q3 Goals",
  "Wait, you forgot items in your cart",
  "Your Daily Mix is here",
];

const SNIPPETS = [
  "Track your package now. Expected delivery tomorrow by 8 PM.",
  "We added a new show you might like based on your history.",
  "People are looking at your profile. See who they are.",
  "Use code SAVE50 at checkout. Valid until Sunday.",
  "If this wasn't you, please secure your account immediately.",
  "Don't miss out on these doorbuster deals. In-store only.",
  "View your statement for the period ending Oct 31.",
  "Hey, just following up on the meeting notes from yesterday.",
  "Complete your purchase now and get free shipping.",
  "Music tailored just for you. Listen now."
];

export const generateMockEmails = (count: number): Email[] => {
  return Array.from({ length: count }).map((_, i) => {
    const senderIdx = Math.floor(Math.random() * SENDERS.length);
    const subjectIdx = Math.floor(Math.random() * SUBJECTS.length);
    // Mix and match sometimes for variety
    const sender = SENDERS[senderIdx];
    
    return {
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      sender: sender.name,
      senderEmail: sender.email,
      subject: SUBJECTS[subjectIdx],
      snippet: SNIPPETS[subjectIdx],
      date: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      isRead: Math.random() > 0.8, // Mostly unread
    };
  });
};
