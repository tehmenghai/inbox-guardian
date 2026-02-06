import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  LogOut,
  Info
} from 'lucide-react';
import { Email, ViewState, AIAnalysisResult, SenderGroup, MailboxProviderType, EmailDetail, EmailAIAnalysis } from './types';
import { mailboxService } from './services/mailboxService';
import { analyzeEmailsWithGemini, analyzeSenderGroup, analyzeEmailDetail } from './services/geminiService';
import { groupEmailsBySender, removeTrashedEmailsFromGroups } from './utils/emailGrouping';
import { APP_VERSION } from './changelog';

// --- Components ---
import AuthScreen from './components/AuthScreen';
import ScanningScreen from './components/ScanningScreen';
import SenderGroupsScreen from './components/SenderGroupsScreen';
import SenderDetailScreen from './components/SenderDetailScreen';
import EmailDetailScreen from './components/EmailDetailScreen';
import SuccessScreen from './components/SuccessScreen';
import ChangelogModal from './components/ChangelogModal';
import logo from './assets/app_logo.png';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('auth');
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [senderGroups, setSenderGroups] = useState<SenderGroup[]>([]);
  const [selectedSenderEmail, setSelectedSenderEmail] = useState<string | null>(null);
  const [emailAnalysisCache, setEmailAnalysisCache] = useState<Map<string, AIAnalysisResult>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAnalyzingGroup, setIsAnalyzingGroup] = useState<string | null>(null);
  const [isAnalyzingEmail, setIsAnalyzingEmail] = useState<string | null>(null);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [isTrashingSelected, setIsTrashingSelected] = useState(false);
  const [trashingGroupEmail, setTrashingGroupEmail] = useState<string | null>(null);
  const [isTrashingMultiple, setIsTrashingMultiple] = useState(false);

  // Email detail state
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emailDetail, setEmailDetail] = useState<EmailDetail | null>(null);
  const [emailAIAnalysis, setEmailAIAnalysis] = useState<EmailAIAnalysis | null>(null);
  const [isLoadingEmailDetail, setIsLoadingEmailDetail] = useState(false);
  const [isAnalyzingEmailDetail, setIsAnalyzingEmailDetail] = useState(false);
  const [emailTrashSuccess, setEmailTrashSuccess] = useState(false);

  // Changelog modal state
  const [showChangelog, setShowChangelog] = useState(false);

  // Scroll position restoration
  const [senderGroupsScrollPos, setSenderGroupsScrollPos] = useState(0);
  const [senderDetailScrollPos, setSenderDetailScrollPos] = useState(0);

  // Ref to always access the latest senderGroups (avoids stale closure issues)
  const senderGroupsRef = useRef<SenderGroup[]>(senderGroups);
  useEffect(() => {
    senderGroupsRef.current = senderGroups;
  }, [senderGroups]);

  // Navigate back to sender list if the selected sender group becomes empty after deletion
  useEffect(() => {
    if (view === 'senderDetail' && selectedSenderEmail) {
      const currentGroup = senderGroups.find(g => g.senderEmail === selectedSenderEmail);
      if (!currentGroup) {
        setSelectedSenderEmail(null);
        setView('senderGroups');
      }
    }
  }, [senderGroups, selectedSenderEmail, view]);

  // Check for OAuth redirect or existing session on mount
  useEffect(() => {
    if (initialCheckDone) return;

    // Check if we returned from Google OAuth redirect (token in URL or session)
    if (mailboxService.isAuthenticated) {
      console.log('[App] Found existing Google session, starting email fetch...');
      setInitialCheckDone(true);
      startScanningAfterAuth();
    } else {
      setInitialCheckDone(true);
    }
  }, [initialCheckDone]);

  // Separate function for scanning after OAuth redirect (already authenticated)
  const startScanningAfterAuth = async () => {
    setIsProcessing(true);
    setView('scanning');

    try {
      setProcessingStage('Initializing Google API...');
      // Complete the GAPI initialization with the existing token
      await mailboxService.connect('google');

      setProcessingStage('Fetching emails...');
      const fetchedEmails = await mailboxService.fetchUnreadEmails(300);

      setProcessingStage('Grouping by sender...');
      const groups = groupEmailsBySender(fetchedEmails);

      setSenderGroups(groups);
      setIsProcessing(false);
      setView('senderGroups');
    } catch (error: any) {
      console.error("Post-OAuth scanning failed", error);
      setIsProcessing(false);
      setAuthError(error.message || 'Failed to connect to Gmail after authentication');
      setView('auth');
    }
  };

  const handleLogin = (provider: MailboxProviderType, clientId?: string) => {
    setAuthError(null);
    startScanning(provider, clientId);
  };

  const handleYahooLogin = async (email: string, appPassword: string) => {
    setAuthError(null);
    setIsProcessing(true);
    setView('scanning');

    try {
      setProcessingStage('Connecting to Yahoo Mail...');
      await mailboxService.connectYahoo(email, appPassword);

      setProcessingStage('Fetching emails...');
      // Use smaller limit for Yahoo (IMAP is slow and drops connections)
      const fetchedEmails = await mailboxService.fetchUnreadEmails(50);

      setProcessingStage('Grouping by sender...');
      const groups = groupEmailsBySender(fetchedEmails);

      setSenderGroups(groups);
      setIsProcessing(false);
      setView('senderGroups');
    } catch (error: any) {
      console.error("Yahoo login failed", error);
      setIsProcessing(false);
      setAuthError(error.message || 'Failed to connect to Yahoo Mail');
      setView('auth');
    }
  };

  const startScanning = useCallback(async (provider: MailboxProviderType, clientId?: string) => {
    setIsProcessing(true);
    setView('scanning');

    try {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      setProcessingStage(`Connecting to ${providerName}...`);

      await mailboxService.connect(provider, clientId);

      setProcessingStage('Fetching emails...');
      const fetchedEmails = await mailboxService.fetchUnreadEmails(300);

      setProcessingStage('Grouping by sender...');
      const groups = groupEmailsBySender(fetchedEmails);

      setSenderGroups(groups);
      setIsProcessing(false);
      setView('senderGroups');
    } catch (error: any) {
      console.error("Scanning process failed", error);
      setIsProcessing(false);

      let errorMessage = "An unexpected error occurred during connection.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error === "idpiframe_initialization_failed") {
        errorMessage = "Google initialization failed. Check your authorized origins in Google Cloud Console.";
      } else if (error?.error === "popup_closed_by_user") {
        errorMessage = "Authentication cancelled. The popup was closed.";
      }

      setAuthError(errorMessage);
      setView('auth');
    }
  }, []);

  const handleSelectSender = (senderEmail: string, scrollPosition?: number) => {
    // Save scroll position before navigating away
    if (scrollPosition !== undefined) {
      setSenderGroupsScrollPos(scrollPosition);
    }
    setSelectedSenderEmail(senderEmail);
    setSenderDetailScrollPos(0); // Reset email list scroll when selecting new sender
    setView('senderDetail');
  };

  const handleBackToGroups = (scrollPosition?: number) => {
    // Save email list scroll position (though not needed for back navigation)
    if (scrollPosition !== undefined) {
      setSenderDetailScrollPos(scrollPosition);
    }
    setSelectedSenderEmail(null);
    setView('senderGroups');
  };

  const handleAnalyzeGroup = async (senderEmail: string) => {
    // Use ref to get latest senderGroups (avoids stale closure)
    const group = senderGroupsRef.current.find(g => g.senderEmail === senderEmail);
    if (!group || group.analysis) return;

    setIsAnalyzingGroup(senderEmail);

    try {
      const analysis = await analyzeSenderGroup(senderEmail, group.senderName, group.emails);

      setSenderGroups(prev =>
        prev.map(g =>
          g.senderEmail === senderEmail ? { ...g, analysis } : g
        )
      );
    } catch (error) {
      console.error('Error analyzing sender group:', error);
    } finally {
      setIsAnalyzingGroup(null);
    }
  };

  const handleTrashGroup = async (senderEmail: string) => {
    // Use ref to get latest senderGroups (avoids stale closure)
    const group = senderGroupsRef.current.find(g => g.senderEmail === senderEmail);
    if (!group) return;

    setTrashingGroupEmail(senderEmail);
    const emailIds = group.emails.map(e => e.id);
    try {
      await handleTrashEmails(emailIds);
    } finally {
      setTrashingGroupEmail(null);
    }
  };

  const handleTrashMultipleGroups = async (senderEmails: string[]) => {
    if (senderEmails.length === 0) return;

    setIsTrashingMultiple(true);

    try {
      // Collect all email IDs from all selected senders
      // Use ref to get latest senderGroups (avoids stale closure)
      const allEmailIds: string[] = [];
      for (const senderEmail of senderEmails) {
        const group = senderGroupsRef.current.find(g => g.senderEmail === senderEmail);
        if (group) {
          allEmailIds.push(...group.emails.map(e => e.id));
        }
      }

      if (allEmailIds.length > 0) {
        await handleTrashEmails(allEmailIds);
      }
    } finally {
      setIsTrashingMultiple(false);
    }
  };

  const handleAnalyzeEmail = async (emailId: string) => {
    if (emailAnalysisCache.has(emailId)) return;

    // Use ref to get latest senderGroups (avoids stale closure)
    const selectedGroup = senderGroupsRef.current.find(g => g.senderEmail === selectedSenderEmail);
    const email = selectedGroup?.emails.find(e => e.id === emailId);
    if (!email) return;

    setIsAnalyzingEmail(emailId);

    try {
      const results = await analyzeEmailsWithGemini([email]);
      if (results.length > 0) {
        setEmailAnalysisCache(prev => new Map(prev).set(emailId, results[0]));
      }
    } catch (error) {
      console.error('Error analyzing email:', error);
    } finally {
      setIsAnalyzingEmail(null);
    }
  };

  const handleAnalyzeAllEmails = async () => {
    // Use ref to get latest senderGroups (avoids stale closure)
    const selectedGroup = senderGroupsRef.current.find(g => g.senderEmail === selectedSenderEmail);
    if (!selectedGroup) return;

    const unanalyzedEmails = selectedGroup.emails.filter(e => !emailAnalysisCache.has(e.id));
    if (unanalyzedEmails.length === 0) return;

    setIsAnalyzingAll(true);

    try {
      // Analyze in batches of 10 to avoid rate limits
      const BATCH_SIZE = 10;
      for (let i = 0; i < unanalyzedEmails.length; i += BATCH_SIZE) {
        const batch = unanalyzedEmails.slice(i, i + BATCH_SIZE);
        const results = await analyzeEmailsWithGemini(batch);

        setEmailAnalysisCache(prev => {
          const newCache = new Map(prev);
          results.forEach(r => newCache.set(r.emailId, r));
          return newCache;
        });
      }
    } catch (error) {
      console.error('Error analyzing all emails:', error);
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const handleTrashEmails = async (emailIds: string[]) => {
    if (emailIds.length === 0) return;

    setIsTrashingSelected(true);

    try {
      const result = await mailboxService.trashEmails(emailIds);

      if (result.trashedCount > 0) {
        const trashedIds = emailIds.filter(id => !result.failedIds.includes(id));

        // Use functional updater to always operate on the latest state,
        // avoiding stale closure issues after async API calls
        setSenderGroups(prev => removeTrashedEmailsFromGroups(prev, trashedIds));

        // Remove from analysis cache
        setEmailAnalysisCache(prev => {
          const newCache = new Map(prev);
          trashedIds.forEach(id => newCache.delete(id));
          return newCache;
        });
      }

      if (result.failedIds.length > 0) {
        console.warn(`Failed to trash ${result.failedIds.length} emails`);
      }
    } catch (error) {
      console.error('Error trashing emails:', error);
    } finally {
      setIsTrashingSelected(false);
    }
  };

  const handleViewEmailDetail = async (emailId: string, scrollPosition?: number) => {
    // Save scroll position before navigating to email detail
    if (scrollPosition !== undefined) {
      setSenderDetailScrollPos(scrollPosition);
    }

    // Use ref to get latest senderGroups (avoids stale closure issues)
    const selectedGroup = senderGroupsRef.current.find(g => g.senderEmail === selectedSenderEmail);
    const basicEmail = selectedGroup?.emails.find(e => e.id === emailId);
    if (!basicEmail) return;

    setSelectedEmailId(emailId);
    setEmailDetail(null);
    setEmailAIAnalysis(null);
    setIsLoadingEmailDetail(true);
    setView('emailDetail');

    try {
      const detail = await mailboxService.fetchEmailContent(emailId, basicEmail);
      setEmailDetail(detail);
    } catch (error) {
      console.error('Error fetching email detail:', error);
    } finally {
      setIsLoadingEmailDetail(false);
    }
  };

  const handleAnalyzeEmailDetail = async () => {
    if (!emailDetail || isAnalyzingEmailDetail) return;

    setIsAnalyzingEmailDetail(true);

    try {
      const analysis = await analyzeEmailDetail(emailDetail);
      setEmailAIAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing email:', error);
    } finally {
      setIsAnalyzingEmailDetail(false);
    }
  };

  const handleBackToSenderDetail = () => {
    setSelectedEmailId(null);
    setEmailDetail(null);
    setEmailAIAnalysis(null);
    setView('senderDetail');
  };

  const handleTrashFromEmailDetail = async () => {
    if (!selectedEmailId) return;

    await handleTrashEmails([selectedEmailId]);

    // Show success state briefly before navigating back
    setEmailTrashSuccess(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setEmailTrashSuccess(false);

    // After trashing, go back to sender detail
    handleBackToSenderDetail();
  };

  const handleLogout = () => {
    // Clear Gmail session token from storage
    sessionStorage.removeItem('gmail_access_token');

    // Reset mailbox service state
    mailboxService.isAuthenticated = false;

    setView('auth');
    setSenderGroups([]);
    setSelectedSenderEmail(null);
    setEmailAnalysisCache(new Map());
    setAuthError(null);
    // Don't reset initialCheckDone - we don't want to trigger auto-reconnect
  };

  const handleSuccess = () => {
    setView('success');
  };

  const selectedGroup = senderGroups.find(g => g.senderEmail === selectedSenderEmail);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      {view !== 'auth' && (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600">
              {/* <ShieldCheck className="w-6 h-6" /> */}
             <img src={logo} alt="Logo" className="w-6 h-6" />
              <span className="font-bold text-lg tracking-tight">Inbox Guardian</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setShowChangelog(true)}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 sm:px-3 py-1 rounded-full transition-colors"
                title="View changelog"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="font-medium">v{APP_VERSION}</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Protected
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'auth' && (
          <AuthScreen
            onLogin={handleLogin}
            onYahooLogin={handleYahooLogin}
            error={authError}
          />
        )}

        {view === 'scanning' && (
          <ScanningScreen stage={processingStage} />
        )}

        {view === 'senderGroups' && (
          <SenderGroupsScreen
            senderGroups={senderGroups}
            onSelectSender={handleSelectSender}
            onAnalyzeGroup={handleAnalyzeGroup}
            onTrashGroup={handleTrashGroup}
            onTrashMultipleGroups={handleTrashMultipleGroups}
            isAnalyzing={isAnalyzingGroup}
            trashingGroupEmail={trashingGroupEmail}
            isTrashingMultiple={isTrashingMultiple}
            initialScrollPosition={senderGroupsScrollPos}
          />
        )}

        {view === 'senderDetail' && (
          selectedGroup ? (
            <SenderDetailScreen
              senderGroup={selectedGroup}
              emailAnalysis={emailAnalysisCache}
              onBack={handleBackToGroups}
              onAnalyzeEmail={handleAnalyzeEmail}
              onAnalyzeAll={handleAnalyzeAllEmails}
              onTrashSelected={handleTrashEmails}
              onViewEmailDetail={handleViewEmailDetail}
              isAnalyzing={isAnalyzingEmail}
              isAnalyzingAll={isAnalyzingAll}
              isTrashingSelected={isTrashingSelected}
              initialScrollPosition={senderDetailScrollPos}
            />
          ) : (
            // Fallback: redirect to sender groups if group not found
            <SenderGroupsScreen
              senderGroups={senderGroups}
              onSelectSender={handleSelectSender}
              onAnalyzeGroup={handleAnalyzeGroup}
              onTrashGroup={handleTrashGroup}
              onTrashMultipleGroups={handleTrashMultipleGroups}
              isAnalyzing={isAnalyzingGroup}
              trashingGroupEmail={trashingGroupEmail}
              isTrashingMultiple={isTrashingMultiple}
              initialScrollPosition={senderGroupsScrollPos}
            />
          )
        )}

        {view === 'emailDetail' && (
          <EmailDetailScreen
            email={emailDetail}
            analysis={emailAIAnalysis}
            isLoading={isLoadingEmailDetail}
            isAnalyzing={isAnalyzingEmailDetail}
            onBack={handleBackToSenderDetail}
            onAnalyze={handleAnalyzeEmailDetail}
            onTrash={handleTrashFromEmailDetail}
            isTrashing={isTrashingSelected}
            trashSuccess={emailTrashSuccess}
          />
        )}

        {view === 'success' && (
          <SuccessScreen onHome={() => setView('senderGroups')} />
        )}
      </main>

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
    </div>
  );
};

export default App;
