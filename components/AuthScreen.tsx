import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Settings, Copy, AlertCircle, Info, Mail, Key, ExternalLink, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { MailboxProviderType } from '../types';

const YAHOO_CREDENTIALS_KEY = 'inbox_guardian_yahoo_credentials';

interface AuthScreenProps {
  onLogin: (provider: MailboxProviderType, clientId?: string) => void;
  onYahooLogin: (email: string, appPassword: string) => void;
  error?: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onYahooLogin, error }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [showYahooForm, setShowYahooForm] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [yahooEmail, setYahooEmail] = useState('');
  const [yahooAppPassword, setYahooAppPassword] = useState('');
  const [yahooLoading, setYahooLoading] = useState(false);
  const [showYahooHelp, setShowYahooHelp] = useState(false);
  const [rememberYahoo, setRememberYahoo] = useState(true);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Debug helper
  const addDebug = (msg: string) => {
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Check Google scripts on mount
  useEffect(() => {
    const checkGoogle = () => {
      const hasGapi = !!(window as any).gapi;
      addDebug(`GAPI script loaded: ${hasGapi}`);
      // Check for OAuth redirect token
      if (window.location.hash.includes('access_token')) {
        addDebug('OAuth redirect detected with token');
      }
    };
    // Check after a delay to allow scripts to load
    setTimeout(checkGoogle, 1000);
  }, []);

  // Load saved Yahoo credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(YAHOO_CREDENTIALS_KEY);
      if (saved) {
        const { email, appPassword } = JSON.parse(saved);
        if (email && appPassword) {
          setYahooEmail(email);
          setYahooAppPassword(appPassword);
          setHasSavedCredentials(true);
          setShowYahooForm(true); // Auto-expand if credentials exist
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }, []);

  const saveYahooCredentials = (email: string, appPassword: string) => {
    try {
      localStorage.setItem(YAHOO_CREDENTIALS_KEY, JSON.stringify({ email, appPassword }));
      setHasSavedCredentials(true);
    } catch (e) {
      console.error('Failed to save credentials:', e);
    }
  };

  const clearYahooCredentials = () => {
    try {
      localStorage.removeItem(YAHOO_CREDENTIALS_KEY);
      setYahooEmail('');
      setYahooAppPassword('');
      setHasSavedCredentials(false);
    } catch (e) {
      console.error('Failed to clear credentials:', e);
    }
  };

  const copyOrigin = () => {
    navigator.clipboard.writeText(currentOrigin);
  };

  const handleYahooLogin = async () => {
    if (!yahooEmail || !yahooAppPassword) return;
    setYahooLoading(true);
    try {
      await onYahooLogin(yahooEmail, yahooAppPassword);
      // Save credentials on successful login if "Remember me" is checked
      if (rememberYahoo) {
        saveYahooCredentials(yahooEmail, yahooAppPassword);
      }
    } finally {
      setYahooLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="mb-8 p-6 bg-indigo-50 rounded-full animate-bounce-slow">
        <ShieldCheck className="w-16 h-16 text-indigo-600" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
        Tame your inbox <br/>
        <span className="text-indigo-600">with AI Intelligence</span>
      </h1>
      
      <p className="text-lg text-slate-600 max-w-xl mb-10 leading-relaxed">
        Inbox Guardian scans thousands of unread emails, categorizes them safely, 
        and helps you reach Inbox Zero in minutes, not hours.
      </p>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm max-w-md flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Connection Failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => {
            const hasGapi = !!(window as any).gapi;
            addDebug(`Login clicked: gapi=${hasGapi}, redirecting to Google...`);
            onLogin('google', googleClientId);
          }}
          className="w-full group relative flex items-center justify-center gap-3 px-8 py-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
          <span className="font-semibold text-slate-700 group-hover:text-indigo-600">Continue with Google</span>
          <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4" />
        </button>

        {/* Yahoo Mail with credentials form */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowYahooForm(!showYahooForm)}
            className="w-full group relative flex items-center justify-center gap-3 px-8 py-4 hover:bg-slate-50 transition-all duration-200"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#6001D2"/>
              <path d="M8.5 8l3.5 4.5L8.5 17h2l2.5-3.2L15.5 17h2l-3.5-4.5L17.5 8h-2l-2.5 3.2L10.5 8h-2z" fill="white"/>
            </svg>
            <span className="font-semibold text-slate-700 group-hover:text-indigo-600">Continue with Yahoo</span>
            {showYahooForm ? (
              <ChevronUp className="w-4 h-4 text-slate-400 absolute right-4" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4" />
            )}
          </button>

          {showYahooForm && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
              <div className="pt-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Yahoo Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={yahooEmail}
                    onChange={(e) => setYahooEmail(e.target.value)}
                    placeholder="your@yahoo.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">App Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={yahooAppPassword}
                    onChange={(e) => setYahooAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Remember me checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberYahoo}
                  onChange={(e) => setRememberYahoo(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
                <span className="text-xs text-slate-600">Remember my credentials</span>
              </label>

              <button
                onClick={handleYahooLogin}
                disabled={!yahooEmail || !yahooAppPassword || yahooLoading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {yahooLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect to Yahoo Mail
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Clear saved credentials button */}
              {hasSavedCredentials && (
                <button
                  onClick={clearYahooCredentials}
                  className="w-full text-xs text-red-500 hover:text-red-600 flex items-center justify-center gap-1 py-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear saved credentials
                </button>
              )}

              <button
                onClick={() => setShowYahooHelp(!showYahooHelp)}
                className="w-full text-xs text-slate-500 hover:text-purple-600 flex items-center justify-center gap-1"
              >
                <Info className="w-3 h-3" />
                {showYahooHelp ? 'Hide instructions' : 'How to get App Password?'}
              </button>

              {showYahooHelp && (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-800 space-y-2">
                  <p className="font-semibold">Generate Yahoo App Password:</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Go to Yahoo Account Security</li>
                    <li>Enable 2-Step Verification (required)</li>
                    <li>Click "Generate app password"</li>
                    <li>Select "Mail" as the app</li>
                    <li>Copy the 16-character password</li>
                  </ol>
                  <a
                    href="https://login.yahoo.com/account/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium mt-1"
                  >
                    Open Yahoo Security Settings
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 w-full max-w-sm">
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="text-xs text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors mx-auto mb-4"
        >
          <Settings className="w-3 h-3" />
          {showConfig ? 'Hide Developer Settings' : 'Developer Settings (for Real Data)'}
        </button>
        
        {showConfig && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl w-full text-left space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Google Client ID</label>
              <input 
                type="text" 
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="Paste your Client ID here..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold text-xs">
                <Info className="w-3 h-3" />
                <span>Required Configuration</span>
              </div>
              <p className="text-[10px] text-amber-800 leading-relaxed mb-2">
                To use real Google Auth, you must add this exact URL to "Authorized JavaScript origins" in your Google Cloud Console for the Client ID above.
              </p>
              <div className="flex items-start gap-2">
                <code className="flex-1 block p-1.5 bg-white border border-amber-200 rounded text-[10px] text-slate-600 font-mono break-all whitespace-pre-wrap">
                  {currentOrigin}
                </code>
                <button 
                  onClick={copyOrigin}
                  className="p-1.5 bg-white border border-amber-200 rounded hover:bg-amber-100 transition-colors text-amber-700 flex-shrink-0"
                  title="Copy Origin URL"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel - tap to show */}
      {debugInfo.length > 0 && (
        <div className="mt-6 w-full max-w-sm">
          <details className="bg-slate-100 rounded-lg p-2">
            <summary className="text-xs text-slate-500 cursor-pointer">Debug Log ({debugInfo.length})</summary>
            <div className="mt-2 text-[10px] font-mono text-slate-600 space-y-1 max-h-32 overflow-y-auto">
              {debugInfo.map((msg, i) => (
                <div key={i} className="bg-white p-1 rounded">{msg}</div>
              ))}
            </div>
          </details>
        </div>
      )}

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          Read-only Mode Available
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          256-bit Encryption
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;