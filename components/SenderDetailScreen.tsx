import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SenderGroup, Email, AIAnalysisResult } from '../types';
import {
  ArrowLeft,
  Check,
  Trash2,
  Sparkles,
  Loader2,
  Mail,
  Calendar,
  Archive,
  AlertCircle,
  Eye,
  ChevronRight,
} from 'lucide-react';

interface SenderDetailScreenProps {
  senderGroup: SenderGroup;
  emailAnalysis: Map<string, AIAnalysisResult>;
  onBack: (scrollPosition?: number) => void;
  onAnalyzeEmail: (emailId: string) => Promise<void>;
  onAnalyzeAll: () => Promise<void>;
  onTrashSelected: (emailIds: string[]) => void;
  onViewEmailDetail: (emailId: string, scrollPosition?: number) => void;
  isAnalyzing: string | null;
  isAnalyzingAll: boolean;
  isTrashingSelected: boolean;
  initialScrollPosition?: number;
}

const SenderDetailScreen: React.FC<SenderDetailScreenProps> = ({
  senderGroup,
  emailAnalysis,
  onBack,
  onAnalyzeEmail,
  onAnalyzeAll,
  onTrashSelected,
  onViewEmailDetail,
  isAnalyzing,
  isAnalyzingAll,
  isTrashingSelected,
  initialScrollPosition = 0,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trashingIds, setTrashingIds] = useState<Set<string>>(new Set());
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

  const sortedEmails = useMemo(() => {
    return [...senderGroup.emails].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [senderGroup.emails]);

  const toggleSelection = (emailId: string) => {
    // Prevent selection changes during trashing
    if (isTrashingSelected) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    // Prevent selection changes during trashing
    if (isTrashingSelected) return;

    if (selectedIds.size === sortedEmails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedEmails.map(e => e.id)));
    }
  };

  const handleTrash = () => {
    if (selectedIds.size === 0 || isTrashingSelected) return;
    const ids = Array.from(selectedIds);
    setTrashingIds(new Set(ids)); // Track which emails are being trashed
    onTrashSelected(ids);
    setSelectedIds(new Set());
  };

  // Clear trashing IDs when trashing is complete
  React.useEffect(() => {
    if (!isTrashingSelected && trashingIds.size > 0) {
      setTrashingIds(new Set());
    }
  }, [isTrashingSelected]);

  const getAnalysisBadge = (analysis: AIAnalysisResult) => {
    const colors = {
      keep: 'bg-green-100 text-green-700',
      archive: 'bg-orange-100 text-orange-700',
      delete: 'bg-red-100 text-red-700',
      mark_read: 'bg-blue-100 text-blue-700',
    };

    const icons = {
      keep: <Check className="w-3 h-3" />,
      archive: <Archive className="w-3 h-3" />,
      delete: <Trash2 className="w-3 h-3" />,
      mark_read: <Mail className="w-3 h-3" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[analysis.suggestedAction]}`}
      >
        {icons[analysis.suggestedAction]}
        {analysis.suggestedAction}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const analyzedCount = sortedEmails.filter(e => emailAnalysis.has(e.id)).length;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col relative">
      {/* Trashing Overlay */}
      {isTrashingSelected && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200 text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Moving to Trash</h3>
            <p className="text-slate-500 mb-4">
              Deleting {trashingIds.size} email{trashingIds.size !== 1 ? 's' : ''}...
            </p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              <span className="text-sm text-slate-600">Please wait</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          disabled={isTrashingSelected}
          className={`flex items-center transition-colors mb-4 ${
            isTrashingSelected
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Senders
        </button>

        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0">
            {senderGroup.senderName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{senderGroup.senderName}</h1>
                <p className="text-sm sm:text-base text-slate-500 truncate">{senderGroup.senderEmail}</p>
              </div>

              {/* Analyze All Button - Compact on mobile */}
              <button
                onClick={onAnalyzeAll}
                disabled={isAnalyzingAll || analyzedCount === sortedEmails.length || isTrashingSelected}
                className="px-2 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-1 sm:gap-2 transition-colors flex-shrink-0 text-xs sm:text-sm"
              >
                {isAnalyzingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">Analyzing...</span>
                  </>
                ) : analyzedCount === sortedEmails.length ? (
                  <>
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">All Analyzed</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Analyze All</span>
                  </>
                )}
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 sm:gap-4 mt-1 text-xs sm:text-sm text-slate-400">
              <span>{senderGroup.emailCount} emails</span>
              <span>{senderGroup.unreadCount} unread</span>
              <span>{analyzedCount} analyzed</span>
            </div>
          </div>
        </div>

        {/* Group Analysis Summary */}
        {senderGroup.analysis && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="font-medium text-slate-700">AI Analysis</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  senderGroup.analysis.recommendation === 'delete'
                    ? 'bg-red-100 text-red-700'
                    : senderGroup.analysis.recommendation === 'archive'
                    ? 'bg-orange-100 text-orange-700'
                    : senderGroup.analysis.recommendation === 'keep'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {senderGroup.analysis.recommendation}
              </span>
            </div>
            <p className="text-sm text-slate-600">{senderGroup.analysis.summary}</p>
          </div>
        )}
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <button
          onClick={toggleSelectAll}
          disabled={isTrashingSelected}
          className={`text-sm font-medium ${
            isTrashingSelected
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          {selectedIds.size === sortedEmails.length ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-sm text-slate-500">
          {selectedIds.size} of {sortedEmails.length} selected
        </span>
      </div>

      {/* Email List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-2 pb-24">
        {sortedEmails.map(email => {
          const isSelected = selectedIds.has(email.id);
          const analysis = emailAnalysis.get(email.id);
          const isCurrentlyAnalyzing = isAnalyzing === email.id;
          const isBeingTrashed = trashingIds.has(email.id);

          // Clean up snippet - remove MIME boundaries and excessive whitespace
          const cleanSnippet = email.snippet
            .replace(/[-=]+_Part_\d+_\d+\.?\d*[-=]*/g, '')
            .replace(/\s+/g, ' ')
            .trim() || 'No preview available';

          return (
            <div
              key={email.id}
              onClick={() => toggleSelection(email.id)}
              className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 ${
                isBeingTrashed
                  ? 'border-red-300 bg-red-50 opacity-60 cursor-not-allowed animate-pulse'
                  : isTrashingSelected
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 cursor-pointer'
                  : 'border-slate-200 hover:border-indigo-300 bg-white cursor-pointer'
              }`}
            >
              {/* Mobile Layout */}
              <div className="flex flex-col gap-2 sm:hidden">
                {/* Row 1: Checkbox + Subject + Unread indicator */}
                <div className="flex items-start gap-2">
                  {isBeingTrashed ? (
                    <div className="mt-0.5 w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    </div>
                  ) : (
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                      } ${isTrashingSelected ? 'opacity-50' : ''}`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!email.isRead && !isBeingTrashed && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" title="Unread" />
                      )}
                      <h4 className={`font-medium text-sm leading-tight ${
                        isBeingTrashed
                          ? 'text-red-600 line-through'
                          : !email.isRead
                          ? 'text-slate-900'
                          : 'text-slate-600'
                      }`}>
                        {email.subject || '(No Subject)'}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Row 2: Snippet */}
                <p className={`text-xs line-clamp-2 pl-7 ${isBeingTrashed ? 'text-red-400' : 'text-slate-500'}`}>
                  {cleanSnippet}
                </p>

                {/* Row 3: Date + Actions */}
                <div className="flex items-center justify-between pl-7">
                  <span className={`text-xs ${isBeingTrashed ? 'text-red-400' : 'text-slate-400'}`}>
                    {isBeingTrashed ? 'Deleting...' : formatDate(email.date)}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* View Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingSelected && !isBeingTrashed) {
                          onViewEmailDetail(email.id, getCurrentScrollPosition());
                        }
                      }}
                      disabled={isTrashingSelected || isBeingTrashed}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isBeingTrashed
                          ? 'bg-red-100 text-red-400'
                          : 'bg-slate-100 text-slate-500'
                      } disabled:opacity-50`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {/* Analyze Button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isTrashingSelected) {
                          onAnalyzeEmail(email.id);
                        }
                      }}
                      disabled={isCurrentlyAnalyzing || !!analysis || isTrashingSelected}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isBeingTrashed
                          ? 'bg-red-100 text-red-400'
                          : analysis
                          ? 'bg-green-100 text-green-600'
                          : 'bg-slate-100 text-slate-500'
                      } disabled:opacity-50`}
                    >
                      {isCurrentlyAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : analysis ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Analysis Result (if available) */}
                {analysis && !isBeingTrashed && (
                  <div className="flex items-center gap-2 pl-7">
                    {getAnalysisBadge(analysis)}
                    <span className="text-xs text-slate-400 truncate">{analysis.reasoning}</span>
                  </div>
                )}
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-start gap-3">
                {/* Checkbox or Trash Icon */}
                {isBeingTrashed ? (
                  <div className="mt-1 w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  </div>
                ) : (
                  <div
                    className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                    } ${isTrashingSelected ? 'opacity-50' : ''}`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                )}

                {/* Email Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium truncate ${
                      isBeingTrashed
                        ? 'text-red-600 line-through'
                        : !email.isRead
                        ? 'text-slate-900'
                        : 'text-slate-600'
                    }`}>
                      {email.subject || '(No Subject)'}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {isBeingTrashed && (
                        <span className="text-xs text-red-500 font-medium">Deleting...</span>
                      )}
                      {!email.isRead && !isBeingTrashed && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
                      )}
                      <span className="text-xs text-slate-400">{formatDate(email.date)}</span>
                    </div>
                  </div>
                  <p className={`text-sm truncate ${isBeingTrashed ? 'text-red-400' : 'text-slate-500'}`}>
                    {cleanSnippet}
                  </p>

                  {/* Analysis Result */}
                  {analysis && !isBeingTrashed && (
                    <div className="mt-2 flex items-center gap-2">
                      {getAnalysisBadge(analysis)}
                      <span className="text-xs text-slate-400">{analysis.reasoning}</span>
                    </div>
                  )}
                </div>

                {/* View Email Detail Button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (!isTrashingSelected && !isBeingTrashed) {
                      onViewEmailDetail(email.id, getCurrentScrollPosition());
                    }
                  }}
                  disabled={isTrashingSelected || isBeingTrashed}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isBeingTrashed
                      ? 'bg-red-100 text-red-400'
                      : 'bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isTrashingSelected ? 'Please wait...' : 'View email with AI analysis'}
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Analyze Button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (!isTrashingSelected) {
                      onAnalyzeEmail(email.id);
                    }
                  }}
                  disabled={isCurrentlyAnalyzing || !!analysis || isTrashingSelected}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isBeingTrashed
                      ? 'bg-red-100 text-red-400'
                      : analysis
                      ? 'bg-green-100 text-green-600'
                      : 'bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isTrashingSelected ? 'Please wait...' : analysis ? 'Already analyzed' : 'Analyze with AI'}
                >
                  {isCurrentlyAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isBeingTrashed ? (
                    <Trash2 className="w-4 h-4" />
                  ) : analysis ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Footer Action Bar */}
      <div className={`fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] sm:w-full max-w-xl z-20 transition-opacity ${
        isTrashingSelected ? 'opacity-50 pointer-events-none' : ''
      }`}>
        <div className={`text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl transition-colors ${
          isTrashingSelected ? 'bg-red-800' : 'bg-slate-900'
        }`}>
          {/* Mobile Layout */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base">
                {isTrashingSelected ? `Deleting ${trashingIds.size}...` : `${selectedIds.size} Selected`}
              </span>
              <span className="text-xs text-slate-400">
                {isTrashingSelected ? 'Please wait' : 'Ready to clean'}
              </span>
            </div>
            <button
              onClick={handleTrash}
              disabled={selectedIds.size === 0 || isTrashingSelected}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-all flex items-center gap-2 flex-shrink-0"
            >
              {isTrashingSelected ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Move to Trash</span>
            </button>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-lg">
                {isTrashingSelected ? `Deleting ${trashingIds.size}...` : `${selectedIds.size} Selected`}
              </span>
              <span className="text-xs text-slate-400">
                {isTrashingSelected ? 'Please wait' : 'Ready to clean'}
              </span>
            </div>
            <div className="flex gap-3">
              {selectedIds.size > 0 && !isTrashingSelected && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  disabled={isTrashingSelected}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleTrash}
                disabled={selectedIds.size === 0 || isTrashingSelected}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-all flex items-center gap-2"
              >
                {isTrashingSelected ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Trashing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Move to Trash
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

export default SenderDetailScreen;
