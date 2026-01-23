import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SenderGroup, SenderGroupAnalysis } from '../types';
import { sortSenderGroups, filterSenderGroups, SortOption } from '../utils/emailGrouping';
import {
  Search,
  Mail,
  ChevronRight,
  Sparkles,
  Loader2,
  Trash2,
  Archive,
  Check,
  AlertCircle,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';

interface SenderGroupsScreenProps {
  senderGroups: SenderGroup[];
  onSelectSender: (senderEmail: string, scrollPosition?: number) => void;
  onAnalyzeGroup: (senderEmail: string) => Promise<void>;
  onTrashGroup: (senderEmail: string) => void;
  onTrashMultipleGroups: (senderEmails: string[]) => void;
  isAnalyzing: string | null;
  trashingGroupEmail: string | null;
  isTrashingMultiple: boolean;
  initialScrollPosition?: number;
}

const SenderGroupsScreen: React.FC<SenderGroupsScreenProps> = ({
  senderGroups,
  onSelectSender,
  onAnalyzeGroup,
  onTrashGroup,
  onTrashMultipleGroups,
  isAnalyzing,
  trashingGroupEmail,
  isTrashingMultiple,
  initialScrollPosition = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('count');
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(new Set());
  const [trashingSenders, setTrashingSenders] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollContainerRef.current && initialScrollPosition > 0) {
      scrollContainerRef.current.scrollTop = initialScrollPosition;
    }
  }, []);

  // Helper to get current scroll position
  const getCurrentScrollPosition = () => {
    return scrollContainerRef.current?.scrollTop || 0;
  };

  const filteredAndSortedGroups = useMemo(() => {
    const filtered = filterSenderGroups(senderGroups, searchTerm);
    return sortSenderGroups(filtered, sortBy);
  }, [senderGroups, searchTerm, sortBy]);

  const totalEmails = senderGroups.reduce((sum, g) => sum + g.emailCount, 0);
  const totalUnread = senderGroups.reduce((sum, g) => sum + g.unreadCount, 0);

  // Selection functions
  const toggleSenderSelection = (senderEmail: string) => {
    if (isTrashingAny || isTrashingMultiple) return;
    const newSelection = new Set(selectedSenders);
    if (newSelection.has(senderEmail)) {
      newSelection.delete(senderEmail);
    } else {
      newSelection.add(senderEmail);
    }
    setSelectedSenders(newSelection);
  };

  const toggleSelectAll = () => {
    if (isTrashingAny || isTrashingMultiple) return;
    if (selectedSenders.size === filteredAndSortedGroups.length) {
      setSelectedSenders(new Set());
    } else {
      setSelectedSenders(new Set(filteredAndSortedGroups.map(g => g.senderEmail)));
    }
  };

  const handleTrashSelected = () => {
    if (selectedSenders.size === 0 || isTrashingAny || isTrashingMultiple) return;
    const senderEmails = Array.from(selectedSenders);
    setTrashingSenders(new Set(senderEmails)); // Track which senders are being trashed
    onTrashMultipleGroups(senderEmails);
    // Don't clear selection here - will be cleared when isTrashingMultiple becomes false
  };

  // Clear trashing senders and selection when deletion completes
  React.useEffect(() => {
    if (!isTrashingMultiple && trashingSenders.size > 0) {
      setTrashingSenders(new Set());
      setSelectedSenders(new Set());
    }
  }, [isTrashingMultiple]);

  // Calculate total emails in selected senders
  const selectedEmailCount = filteredAndSortedGroups
    .filter(g => selectedSenders.has(g.senderEmail))
    .reduce((sum, g) => sum + g.emailCount, 0);

  // Calculate total emails being trashed
  const trashingEmailCount = senderGroups
    .filter(g => trashingSenders.has(g.senderEmail))
    .reduce((sum, g) => sum + g.emailCount, 0);

  const getRecommendationBadge = (analysis: SenderGroupAnalysis) => {
    const colors = {
      keep: 'bg-green-100 text-green-700',
      archive: 'bg-orange-100 text-orange-700',
      delete: 'bg-red-100 text-red-700',
      review: 'bg-blue-100 text-blue-700',
    };

    const icons = {
      keep: <Check className="w-3 h-3" />,
      archive: <Archive className="w-3 h-3" />,
      delete: <Trash2 className="w-3 h-3" />,
      review: <AlertCircle className="w-3 h-3" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[analysis.recommendation]}`}
      >
        {icons[analysis.recommendation]}
        {analysis.recommendation}
      </span>
    );
  };

  const formatDateRange = (oldest: string, newest: string) => {
    const oldestDate = new Date(oldest);
    const newestDate = new Date(newest);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 365) {
      return `${Math.floor(daysDiff / 365)}+ years`;
    } else if (daysDiff > 30) {
      return `${Math.floor(daysDiff / 30)} months`;
    } else if (daysDiff > 0) {
      return `${daysDiff} days`;
    }
    return 'Today';
  };

  const isTrashingAny = trashingGroupEmail !== null || isTrashingMultiple;

  return (
    <div className="h-full flex flex-col">
      {/* Header Stats */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Email Senders</h1>
        <p className="text-slate-500">
          {senderGroups.length} senders · {totalEmails} emails · {totalUnread} unread
        </p>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search senders..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            disabled={isTrashingAny}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            disabled={isTrashingAny}
            className="px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="count">Most Emails</option>
            <option value="name">Sender Name</option>
            <option value="newest">Most Recent</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <button
          onClick={toggleSelectAll}
          disabled={isTrashingAny}
          className={`text-sm font-medium ${
            isTrashingAny
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          {selectedSenders.size === filteredAndSortedGroups.length && filteredAndSortedGroups.length > 0
            ? 'Deselect All'
            : 'Select All'}
        </button>
        <span className="text-sm text-slate-500">
          {selectedSenders.size} of {filteredAndSortedGroups.length} senders selected
          {selectedSenders.size > 0 && ` (${selectedEmailCount} emails)`}
        </span>
      </div>

      {/* Sender List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-3 pb-24">
        {filteredAndSortedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Mail className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No senders found</p>
            <p className="text-sm">Try adjusting your search</p>
          </div>
        ) : (
          filteredAndSortedGroups.map(group => {
            const isBeingTrashed = trashingGroupEmail === group.senderEmail ||
              (isTrashingMultiple && trashingSenders.has(group.senderEmail));
            const isSelected = selectedSenders.has(group.senderEmail);

            return (
              <div
                key={group.senderEmail}
                className={`rounded-xl p-4 transition-all ${
                  isBeingTrashed
                    ? 'bg-red-50 border-2 border-red-400 cursor-not-allowed shadow-lg ring-2 ring-red-200'
                    : isSelected
                    ? 'bg-indigo-50 border-2 border-indigo-400 ring-1 ring-indigo-300'
                    : isTrashingAny
                    ? 'bg-slate-50 border border-slate-200 opacity-40 cursor-not-allowed'
                    : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer group'
                }`}
                onClick={() => !isTrashingAny && toggleSenderSelection(group.senderEmail)}
              >
                {/* Mobile Layout (stacked) */}
                <div className="flex flex-col gap-3 sm:hidden">
                  {/* Top Row: Checkbox + Avatar + Name + Count */}
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        toggleSenderSelection(group.senderEmail);
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
                        isBeingTrashed
                          ? 'bg-red-500 border-red-500'
                          : isSelected
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-slate-300'
                      } ${isTrashingAny ? 'cursor-not-allowed' : ''}`}
                    >
                      {isBeingTrashed ? (
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      ) : isSelected ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${
                      isBeingTrashed
                        ? 'bg-red-400'
                        : isSelected
                        ? 'bg-indigo-500'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                    }`}>
                      {isBeingTrashed ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        group.senderName.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Name and Email */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-sm truncate ${
                        isBeingTrashed ? 'text-red-600 line-through' : 'text-slate-900'
                      }`}>
                        {group.senderName}
                      </h3>
                      <p className={`text-xs truncate ${isBeingTrashed ? 'text-red-400' : 'text-slate-500'}`}>
                        {group.senderEmail}
                      </p>
                    </div>

                    {/* Email Count */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-lg font-bold ${isBeingTrashed ? 'text-red-500' : 'text-slate-900'}`}>
                        {group.emailCount}
                      </div>
                      {group.unreadCount > 0 && !isBeingTrashed && (
                        <span className="text-xs text-blue-600 font-medium">
                          {group.unreadCount} unread
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Date + Analysis (if available) */}
                  <div className="flex items-center justify-between pl-8">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateRange(group.oldestDate, group.newestDate)}
                    </div>
                    {isBeingTrashed && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
                        Deleting...
                      </span>
                    )}
                    {group.analysis && !isBeingTrashed && getRecommendationBadge(group.analysis)}
                  </div>

                  {/* Bottom Row: Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pl-8">
                    {/* Analyze Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingAny) {
                          onAnalyzeGroup(group.senderEmail);
                        }
                      }}
                      disabled={isAnalyzing === group.senderEmail || !!group.analysis || isTrashingAny}
                      className={`p-2 rounded-lg transition-colors ${
                        isBeingTrashed
                          ? 'bg-red-100 text-red-400'
                          : group.analysis
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isAnalyzing === group.senderEmail ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : group.analysis ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </button>

                    {/* Trash Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingAny && confirm(`Move all ${group.emailCount} emails from ${group.senderName} to trash?`)) {
                          onTrashGroup(group.senderEmail);
                        }
                      }}
                      disabled={isTrashingAny}
                      className={`p-2 rounded-lg transition-colors ${
                        isBeingTrashed
                          ? 'bg-red-200 text-red-600'
                          : 'bg-slate-100 text-slate-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isBeingTrashed ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>

                    {/* View Details */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingAny) {
                          onSelectSender(group.senderEmail, getCurrentScrollPosition());
                        }
                      }}
                      disabled={isTrashingAny}
                      className={`p-2 rounded-lg transition-colors ${
                        isBeingTrashed || isTrashingAny
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-400 bg-slate-100'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Desktop Layout (horizontal) */}
                <div className="hidden sm:flex items-center gap-4">
                  {/* Checkbox */}
                  <div
                    onClick={e => {
                      e.stopPropagation();
                      toggleSenderSelection(group.senderEmail);
                    }}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
                      isBeingTrashed
                        ? 'bg-red-500 border-red-500'
                        : isSelected
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-slate-300 hover:border-indigo-400'
                    } ${isTrashingAny ? 'cursor-not-allowed' : ''}`}
                  >
                    {isBeingTrashed ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : isSelected ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : null}
                  </div>

                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                    isBeingTrashed
                      ? 'bg-red-400'
                      : isSelected
                      ? 'bg-indigo-500'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  }`}>
                    {isBeingTrashed ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      group.senderName.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Sender Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold truncate ${
                        isBeingTrashed ? 'text-red-600 line-through' : 'text-slate-900'
                      }`}>
                        {group.senderName}
                      </h3>
                      {isBeingTrashed && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
                          Deleting...
                        </span>
                      )}
                      {!isBeingTrashed && group.unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          {group.unreadCount} unread
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${isBeingTrashed ? 'text-red-400' : 'text-slate-500'}`}>
                      {group.senderEmail}
                    </p>

                    {/* Analysis Result */}
                    {group.analysis && !isBeingTrashed && (
                      <div className="mt-2 flex items-center gap-2">
                        {getRecommendationBadge(group.analysis)}
                        <span className="text-xs text-slate-400 truncate">{group.analysis.summary}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats and Actions */}
                  <div className="flex items-center gap-4">
                    {/* Email Count */}
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isBeingTrashed ? 'text-red-500' : 'text-slate-900'}`}>
                        {group.emailCount}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateRange(group.oldestDate, group.newestDate)}
                      </div>
                    </div>

                    {/* Analyze Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingAny) {
                          onAnalyzeGroup(group.senderEmail);
                        }
                      }}
                      disabled={isAnalyzing === group.senderEmail || !!group.analysis || isTrashingAny}
                      className={`p-2 rounded-lg transition-colors ${
                        isBeingTrashed
                          ? 'bg-red-100 text-red-400'
                          : group.analysis
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={isTrashingAny ? 'Please wait...' : group.analysis ? 'Already analyzed' : 'Analyze with AI'}
                    >
                      {isAnalyzing === group.senderEmail ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : group.analysis ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </button>

                    {/* Trash All Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingAny && confirm(`Move all ${group.emailCount} emails from ${group.senderName} to trash?`)) {
                          onTrashGroup(group.senderEmail);
                        }
                      }}
                      disabled={isTrashingAny}
                      className={`p-2 rounded-lg transition-colors ${
                        isBeingTrashed
                          ? 'bg-red-200 text-red-600'
                          : 'bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={isTrashingAny ? 'Please wait...' : 'Trash all emails from this sender'}
                    >
                      {isBeingTrashed ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>

                    {/* View Details Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingAny) {
                          onSelectSender(group.senderEmail, getCurrentScrollPosition());
                        }
                      }}
                      disabled={isTrashingAny}
                      className={`p-2 rounded-lg transition-colors ${
                        isBeingTrashed
                          ? 'text-red-300 cursor-not-allowed'
                          : isTrashingAny
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'
                      }`}
                      title="View emails"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Bar */}
      <div className={`fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] sm:w-full max-w-xl z-20 transition-all ${
        isTrashingAny ? 'opacity-50 pointer-events-none' : ''
      }`}>
        <div className={`text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl transition-colors ${
          isTrashingMultiple ? 'bg-red-800' : 'bg-slate-900'
        }`}>
          {/* Mobile Layout */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base truncate">
                {isTrashingMultiple
                  ? `Deleting ${trashingSenders.size}...`
                  : `${selectedSenders.size} Selected`}
              </span>
              <span className="text-xs text-slate-400 truncate">
                {isTrashingMultiple
                  ? `${trashingEmailCount} emails`
                  : selectedSenders.size > 0
                  ? `${selectedEmailCount} emails`
                  : 'Select to delete'}
              </span>
            </div>
            <button
              onClick={handleTrashSelected}
              disabled={selectedSenders.size === 0 || isTrashingAny}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-all flex items-center gap-2 flex-shrink-0"
            >
              {isTrashingMultiple ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Delete All</span>
            </button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-lg">
                {isTrashingMultiple
                  ? `Deleting ${trashingSenders.size} senders...`
                  : `${selectedSenders.size} Senders Selected`}
              </span>
              <span className="text-xs text-slate-400">
                {isTrashingMultiple
                  ? `Deleting ${trashingEmailCount} emails...`
                  : selectedSenders.size > 0
                  ? `${selectedEmailCount} emails will be deleted`
                  : 'Select senders to delete'}
              </span>
            </div>
            <div className="flex gap-3">
              {selectedSenders.size > 0 && !isTrashingMultiple && (
                <button
                  onClick={() => setSelectedSenders(new Set())}
                  disabled={isTrashingAny}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleTrashSelected}
                disabled={selectedSenders.size === 0 || isTrashingAny}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-all flex items-center gap-2"
              >
                {isTrashingMultiple ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SenderGroupsScreen;
