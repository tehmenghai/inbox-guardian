import React, { useState } from 'react';
import { EmailDetail, EmailAIAnalysis, EmailAction } from '../types';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Trash2,
  Reply,
  Forward,
  Archive,
  Star,
  Clock,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Link,
  Users,
  Building,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  ExternalLink,
  Mail,
  Paperclip,
} from 'lucide-react';

interface EmailDetailScreenProps {
  email: EmailDetail | null;
  onBack: () => void;
  onAnalyze: () => Promise<void>;
  onTrash: () => void;
  analysis: EmailAIAnalysis | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  isTrashing?: boolean;
  trashSuccess?: boolean;
}

const EmailDetailScreen: React.FC<EmailDetailScreenProps> = ({
  email,
  onBack,
  onAnalyze,
  onTrash,
  analysis,
  isLoading,
  isAnalyzing,
  isTrashing = false,
  trashSuccess = false,
}) => {
  const [showFullAnalysis, setShowFullAnalysis] = useState(true);
  const [showReplyDraft, setShowReplyDraft] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const formatDate = (dateStr: string, short = false) => {
    const date = new Date(dateStr);
    if (short) {
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-700 border-green-200';
      case 'negative': return 'bg-red-100 text-red-700 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700 animate-pulse',
    };
    return colors[urgency as keyof typeof colors] || colors.low;
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'reply': return <Reply className="w-4 h-4" />;
      case 'forward': return <Forward className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'archive': return <Archive className="w-4 h-4" />;
      case 'star': return <Star className="w-4 h-4" />;
      case 'snooze': return <Clock className="w-4 h-4" />;
      case 'unsubscribe': return <XCircle className="w-4 h-4" />;
      case 'mark_spam': return <AlertTriangle className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getActionButtonStyle = (priority: string, type: string) => {
    if (type === 'delete' || type === 'mark_spam') {
      return 'bg-red-600 hover:bg-red-700 text-white';
    }
    if (type === 'reply') {
      return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
    switch (priority) {
      case 'primary': return 'bg-indigo-600 hover:bg-indigo-700 text-white';
      case 'secondary': return 'bg-slate-200 hover:bg-slate-300 text-slate-700';
      default: return 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  // Loading state
  if (isLoading || !email) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col">
        <div className="mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Emails
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-500">Loading email content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Emails
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Email Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 mb-4 shadow-sm">
          {/* Mobile Layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Row 1: Avatar + Sender + Analyze Button */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                {email.sender.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{email.sender}</p>
                <p className="text-xs text-slate-500 truncate">{email.senderEmail}</p>
              </div>
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing || !!analysis}
                className={`p-2 rounded-lg flex items-center gap-1 transition-all flex-shrink-0 ${
                  analysis
                    ? 'bg-green-100 text-green-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : analysis ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Row 2: Subject */}
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {email.subject || '(No Subject)'}
            </h1>

            {/* Row 3: Date + Unread badge + Attachments */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(email.date, true)}
              </div>
              {!email.isRead && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Unread
                </span>
              )}
              {email.attachments && email.attachments.length > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  {email.attachments.length}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-start gap-4">
            {/* Sender Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {email.sender.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {/* Subject */}
              <h1 className="text-xl font-bold text-slate-900 mb-2">{email.subject || '(No Subject)'}</h1>

              {/* Sender Info */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium text-slate-800">{email.sender}</span>
                <span className="text-slate-400 text-sm">&lt;{email.senderEmail}&gt;</span>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                {formatDate(email.date)}
                {!email.isRead && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Unread
                  </span>
                )}
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                  <Paperclip className="w-4 h-4" />
                  {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing || !!analysis}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  analysis
                    ? 'bg-green-100 text-green-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : analysis ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Analyzed
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyze with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis Panel */}
        {analysis && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4 sm:p-6 mb-4">
            {/* Analysis Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">AI Analysis</h2>
                  <p className="text-sm text-slate-500">Powered by Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                {showFullAnalysis ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showFullAnalysis && (
              <>
                {/* Tags Row */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSentimentColor(analysis.sentiment)}`}>
                    {analysis.sentiment.charAt(0).toUpperCase() + analysis.sentiment.slice(1)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyBadge(analysis.urgency)}`}>
                    {analysis.urgency.charAt(0).toUpperCase() + analysis.urgency.slice(1)} Priority
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    {analysis.category}
                  </span>
                  {analysis.requiresResponse && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      Response Required
                    </span>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-white/60 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-slate-700 mb-2">Summary</h3>
                  <p className="text-slate-600">{analysis.summary}</p>
                </div>

                {/* Key Points */}
                {analysis.keyPoints.length > 0 && (
                  <div className="bg-white/60 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-slate-700 mb-2">Key Points</h3>
                    <ul className="space-y-2">
                      {analysis.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extracted Information */}
                {analysis.extractedInfo && (
                  <div className="bg-white/60 rounded-lg p-3 sm:p-4 mb-4">
                    <h3 className="font-medium text-slate-700 mb-3 text-sm sm:text-base">Extracted Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {analysis.extractedInfo.dates && analysis.extractedInfo.dates.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-500">Dates</span>
                            <p className="text-sm text-slate-700">{analysis.extractedInfo.dates.join(', ')}</p>
                          </div>
                        </div>
                      )}
                      {analysis.extractedInfo.amounts && analysis.extractedInfo.amounts.length > 0 && (
                        <div className="flex items-start gap-2">
                          <DollarSign className="w-4 h-4 text-green-500 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-500">Amounts</span>
                            <p className="text-sm text-slate-700">{analysis.extractedInfo.amounts.join(', ')}</p>
                          </div>
                        </div>
                      )}
                      {analysis.extractedInfo.people && analysis.extractedInfo.people.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-purple-500 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-500">People</span>
                            <p className="text-sm text-slate-700">{analysis.extractedInfo.people.join(', ')}</p>
                          </div>
                        </div>
                      )}
                      {analysis.extractedInfo.organizations && analysis.extractedInfo.organizations.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Building className="w-4 h-4 text-orange-500 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-500">Organizations</span>
                            <p className="text-sm text-slate-700">{analysis.extractedInfo.organizations.join(', ')}</p>
                          </div>
                        </div>
                      )}
                      {analysis.extractedInfo.links && analysis.extractedInfo.links.length > 0 && (
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <Link className="w-4 h-4 text-indigo-500 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-500">Links</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {analysis.extractedInfo.links.slice(0, 3).map((link, i) => (
                                <a
                                  key={i}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {new URL(link).hostname}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Suggested Actions */}
                <div className="bg-white/60 rounded-lg p-4">
                  <h3 className="font-medium text-slate-700 mb-3">Suggested Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (action.type === 'reply' && action.draftContent) {
                            setReplyContent(action.draftContent);
                            setShowReplyDraft(true);
                          } else if (action.type === 'delete') {
                            onTrash();
                          }
                          // Other actions could be implemented in the future
                        }}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${getActionButtonStyle(action.priority, action.type)}`}
                        title={action.description}
                      >
                        {getActionIcon(action.type)}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Reply Draft Panel */}
        {showReplyDraft && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Reply className="w-5 h-5 text-indigo-600" />
                AI Generated Reply Draft
              </h3>
              <button
                onClick={() => setShowReplyDraft(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full h-40 p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Edit your reply..."
            />
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => navigator.clipboard.writeText(replyContent)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReplyDraft(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Copy to clipboard and close
                    navigator.clipboard.writeText(replyContent);
                    setShowReplyDraft(false);
                    alert('Reply copied to clipboard! Paste it in your email client.');
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Body */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <h3 className="font-medium text-slate-700 mb-3 sm:mb-4 pb-2 border-b border-slate-100 text-sm sm:text-base">Email Content</h3>
          <div
            className="prose prose-slate prose-sm sm:prose max-w-none overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: email.body || email.bodyText || email.snippet }}
          />
        </div>
      </div>

      {/* Bottom Action Bar - Always visible */}
      <div className={`fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] sm:w-full max-w-xl z-20 transition-opacity ${isTrashing ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className={`text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl transition-colors ${isTrashing ? 'bg-red-800' : 'bg-slate-900'}`}>
          {/* Mobile Layout */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm">
                {isTrashing ? 'Deleting...' : 'Quick Actions'}
              </span>
              <span className="text-xs text-slate-400 truncate">
                {isTrashing ? 'Please wait' : analysis ? 'AI analysis complete' : 'Analyze for suggestions'}
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!analysis && !isTrashing && (
                <button
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={onTrash}
                disabled={isTrashing}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTrashing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isTrashing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold">
                {isTrashing ? 'Deleting Email...' : 'Quick Actions'}
              </span>
              <span className="text-xs text-slate-400">
                {isTrashing ? 'Please wait while we move this email to trash' : analysis ? 'AI analysis complete' : 'Or analyze with AI for smart suggestions'}
              </span>
            </div>
            <div className="flex gap-2">
              {!analysis && !isTrashing && (
                <button
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              )}
              <button
                onClick={onTrash}
                disabled={isTrashing}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTrashing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isTrashing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deletion Overlay */}
      {(isTrashing || trashSuccess) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className={`bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 mx-4 max-w-sm w-full transform transition-all duration-300 ${trashSuccess ? 'scale-100' : 'scale-100'}`}>
            {trashSuccess ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Email Deleted</h3>
                  <p className="text-sm text-slate-500">Moving to trash...</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <div className="relative">
                    <Trash2 className="w-8 h-8 text-red-600" />
                    <div className="absolute -top-1 -right-1">
                      <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Deleting Email</h3>
                  <p className="text-sm text-slate-500">Moving to trash...</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-600 h-1.5 rounded-full animate-pulse w-2/3"></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDetailScreen;
