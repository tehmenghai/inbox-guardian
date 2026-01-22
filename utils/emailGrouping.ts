import { Email, SenderGroup } from '../types';

export function groupEmailsBySender(emails: Email[]): SenderGroup[] {
  const groupMap = new Map<string, SenderGroup>();

  for (const email of emails) {
    const key = email.senderEmail.toLowerCase();

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        senderEmail: email.senderEmail,
        senderName: email.sender,
        emailCount: 0,
        emails: [],
        unreadCount: 0,
        oldestDate: email.date,
        newestDate: email.date,
      });
    }

    const group = groupMap.get(key)!;
    group.emails.push(email);
    group.emailCount++;

    if (!email.isRead) {
      group.unreadCount++;
    }

    // Update date range
    if (email.date < group.oldestDate) {
      group.oldestDate = email.date;
    }
    if (email.date > group.newestDate) {
      group.newestDate = email.date;
    }
  }

  // Sort by email count descending (most emails first)
  return Array.from(groupMap.values()).sort((a, b) => b.emailCount - a.emailCount);
}

export type SortOption = 'count' | 'name' | 'newest' | 'oldest';

export function sortSenderGroups(groups: SenderGroup[], sortBy: SortOption): SenderGroup[] {
  const sorted = [...groups];

  switch (sortBy) {
    case 'count':
      return sorted.sort((a, b) => b.emailCount - a.emailCount);
    case 'name':
      return sorted.sort((a, b) => a.senderName.localeCompare(b.senderName));
    case 'newest':
      return sorted.sort((a, b) => new Date(b.newestDate).getTime() - new Date(a.newestDate).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.oldestDate).getTime() - new Date(b.oldestDate).getTime());
    default:
      return sorted;
  }
}

export function filterSenderGroups(groups: SenderGroup[], searchTerm: string): SenderGroup[] {
  if (!searchTerm.trim()) {
    return groups;
  }

  const term = searchTerm.toLowerCase();
  return groups.filter(
    group =>
      group.senderName.toLowerCase().includes(term) ||
      group.senderEmail.toLowerCase().includes(term)
  );
}

export function removeTrashedEmailsFromGroups(
  groups: SenderGroup[],
  trashedIds: string[]
): SenderGroup[] {
  const trashedSet = new Set(trashedIds);

  return groups
    .map(group => {
      const remainingEmails = group.emails.filter(e => !trashedSet.has(e.id));

      if (remainingEmails.length === 0) {
        return null; // Remove empty groups
      }

      return {
        ...group,
        emails: remainingEmails,
        emailCount: remainingEmails.length,
        unreadCount: remainingEmails.filter(e => !e.isRead).length,
        oldestDate: remainingEmails.reduce(
          (oldest, e) => (e.date < oldest ? e.date : oldest),
          remainingEmails[0].date
        ),
        newestDate: remainingEmails.reduce(
          (newest, e) => (e.date > newest ? e.date : newest),
          remainingEmails[0].date
        ),
      };
    })
    .filter((group): group is SenderGroup => group !== null);
}
