import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Radio,
  Lock,
  Database,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { getSpreadsheetId } from '../services/sheetsService';
import { SpreadsheetSettingsModal } from './SpreadsheetSettingsModal';

export const SignInView: React.FC = () => {
  const {
    login,
    logout,
    user,
    authStatus,
    authErrorMessage,
    registerInitialAdmin,
  } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [assignedClassInput, setAssignedClassInput] = useState<string>('Grade 10 - Rizal');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const isAccessDenied = authStatus === 'ACCESS_DENIED';
  const isNoAccountsFound = authErrorMessage === 'NO_ACCOUNTS_FOUND';
  const isPopupBlocked =
    authStatus === 'ERROR' &&
    (authErrorMessage === 'POPUP_BLOCKED' ||
      authErrorMessage?.includes('popup-blocked') ||
      authErrorMessage?.includes('POPUP_BLOCKED'));

  const activeSheetId = getSpreadsheetId();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Branding & Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 border border-blue-400/30 text-white shadow-xl shadow-blue-900/30 mb-4">
            <Radio className="w-8 h-8 text-blue-100 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            RFID Student Attendance
          </h1>
          <p className="text-sm font-semibold text-blue-400 mt-1 uppercase tracking-wider">
            Teacher Dashboard System
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Single Source of Truth &bull; Google Sheets Database
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {authStatus === 'CHECKING_AUTHORIZATION' ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Verifying Teacher Authorization...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Checking email against <code>TEACHER_ACCOUNTS</code> in Google Sheet.
                </p>
              </div>
            </div>
          ) : isAccessDenied ? (
            /* ACCESS DENIED SCREEN */
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="text-center">
                <span className="px-2.5 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[11px] font-bold uppercase tracking-wider">
                  Teacher Authorization Required
                </span>
                <h2 className="text-base font-bold text-white mt-2">
                  Account Not Registered as Faculty
                </h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {user?.email
                    ? `The Google account (${user.email}) is signed in, but was not found in the TEACHER_ACCOUNTS database.`
                    : authErrorMessage ||
                      'This Google account is not authorized to access the Teacher Dashboard.'}
                </p>
                {user?.email && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-300">
                    Signed in: <strong className="text-blue-300">{user.email}</strong>
                  </div>
                )}
              </div>

              {/* 1-Click Authorize / Register this account as Admin/Teacher */}
              <div className="p-3 bg-blue-950/50 border border-blue-800/80 rounded-xl text-xs space-y-2">
                <div className="flex items-center space-x-1.5 text-blue-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Authorize This Google Account</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  If you are the instructor or administrator of this classroom, click below to register <strong>{user?.email}</strong> into <code>TEACHER_ACCOUNTS</code>:
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Assigned Section (e.g. Grade 10 - Rizal or ALL)"
                    value={assignedClassInput}
                    onChange={(e) => setAssignedClassInput(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                  <button
                    onClick={() => registerInitialAdmin(assignedClassInput || 'ALL')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Add to TEACHER_ACCOUNTS &amp; Enter Dashboard
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="btn-switch-account"
                  onClick={() => logout()}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Try Another Google Account
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Spreadsheet ID &amp; Diagnostics</span>
                </button>
              </div>
            </div>
          ) : isPopupBlocked ? (
            /* POPUP BLOCKED SCREEN */
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="px-2.5 py-0.5 rounded bg-amber-900/80 text-amber-200 text-[11px] font-bold uppercase tracking-wider">
                  Pop-up Blocked by Browser
                </span>
                <h3 className="text-base font-bold text-white mt-2">
                  Enable Pop-ups to Sign In
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Your browser blocked the Google authentication window. To proceed:
                </p>
              </div>

              {/* Instructions Box */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300">
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-blue-400">1.</span>
                  <span>
                    Look for the <strong>Pop-up blocked</strong> icon in your browser address bar (top right or top left).
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-blue-400">2.</span>
                  <span>
                    Click it and choose <strong>&ldquo;Always allow pop-ups and redirects&rdquo;</strong>, then click retry below.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="btn-retry-popup"
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 shadow-md cursor-pointer"
                >
                  <span>{isLoading ? 'Opening Sign-In...' : 'Retry Google Sign-In'}</span>
                </button>
                <button
                  id="btn-open-tab"
                  onClick={handleOpenInNewTab}
                  className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors border border-slate-700 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open App in New Tab (Bypasses Preview Iframe)</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="w-full py-1.5 text-slate-400 hover:text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : authStatus === 'ERROR' ? (
            /* GENERAL ERROR SCREEN */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Connection Error</h3>
              <p className="text-xs text-slate-300">
                {authErrorMessage || 'Unable to synchronize with the Google Sheet database.'}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleSignIn}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Retry Google Sign-In
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open App in New Tab</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Spreadsheet ID &amp; Diagnostics</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="w-full py-2 px-4 bg-transparent hover:bg-slate-800 text-slate-400 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* DEFAULT SIGN IN PROMPT */
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-white text-center">
                  Teacher &amp; Faculty Authentication
                </h2>
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Sign in with your authorized Google Workspace account. Access permissions and assigned classes are verified against <code>TEACHER_ACCOUNTS</code>.
                </p>
              </div>

              {/* Official Google Sign-In Button */}
              <div className="space-y-2.5">
                <button
                  id="btn-google-signin"
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 border border-slate-200"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isLoading ? 'Connecting...' : 'Sign In with Google'}
                  </span>
                </button>

                <div className="text-center">
                  <button
                    onClick={handleOpenInNewTab}
                    className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <span>Trouble with pop-ups in preview?</span>
                    <strong className="underline flex items-center gap-0.5">
                      Open in new tab <ExternalLink className="w-2.5 h-2.5" />
                    </strong>
                  </button>
                </div>
              </div>

              {/* Security Notices */}
              <div className="pt-4 border-t border-slate-800 space-y-2.5 text-[11px] text-slate-400">
                <div className="flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Google handles authentication securely. No passwords stored in sheets.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Active teacher status verified in Google Sheet database.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-6 text-xs text-slate-500 px-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>DB Settings</span>
          </button>
          <div>
            <span>Sheet: </span>
            <a
              href={`https://docs.google.com/spreadsheets/d/${activeSheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-300 underline font-mono text-[11px]"
            >
              {activeSheetId.substring(0, 10)}...
            </a>
          </div>
        </div>
      </div>

      <SpreadsheetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
