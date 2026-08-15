import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  getSpreadsheetId,
  setSpreadsheetId,
  DEFAULT_SPREADSHEET_ID,
  getSpreadsheetMeta,
  ensureRequiredSheets,
  SHEET_HEADERS,
} from '../services/sheetsService';
import { useAuth } from '../context/AuthContext';
import { useAttendanceOptional } from '../context/AttendanceContext';

interface SpreadsheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpreadsheetSettingsModal: React.FC<SpreadsheetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { accessToken, user, teacherAccount, registerInitialAdmin } = useAuth();
  const attendance = useAttendanceOptional();
  const syncNow = attendance?.syncNow;

  const [currentId, setCurrentId] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    title?: string;
    tabs?: string[];
    missingTabs?: string[];
    error?: string;
  } | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSuccess, setRepairSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeId = getSpreadsheetId();
      setCurrentId(activeId);
      setInputVal(activeId);
      setTestResult(null);
      setRepairSuccess(null);
      if (accessToken) {
        testConnection(activeId);
      }
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const extractId = (urlOrId: string): string => {
    const trimmed = urlOrId.trim();
    if (trimmed.includes('/d/')) {
      const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
    }
    return trimmed;
  };

  const handleSave = () => {
    const cleaned = extractId(inputVal);
    if (!cleaned) return;
    setSpreadsheetId(cleaned);
    setCurrentId(cleaned);
    testConnection(cleaned);
    if (syncNow) {
      syncNow();
    }
  };

  const handleReset = () => {
    setInputVal(DEFAULT_SPREADSHEET_ID);
    setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
    setCurrentId(DEFAULT_SPREADSHEET_ID);
    testConnection(DEFAULT_SPREADSHEET_ID);
    if (syncNow) {
      syncNow();
    }
  };

  const testConnection = async (sheetIdToTest: string) => {
    if (!accessToken) {
      setTestResult({
        success: false,
        error: 'Not authenticated with Google. Please sign in first.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const meta = await getSpreadsheetMeta(accessToken);
      const existingTabs = meta.sheets?.map((s) => s.properties.title) || [];
      const normalize = (s: string) => s.trim().toUpperCase().replace(/[\s-_]+/g, '');

      const requiredKeys = Object.keys(SHEET_HEADERS);
      const missing = requiredKeys.filter((key) => {
        const targetNorm = normalize(key);
        return !existingTabs.some((t) => normalize(t) === targetNorm);
      });

      setTestResult({
        success: true,
        title: meta.properties?.title || 'Google Sheet Database',
        tabs: existingTabs,
        missingTabs: missing,
      });
    } catch (err: any) {
      console.error('Test connection error:', err);
      setTestResult({
        success: false,
        error: err?.message || 'Failed to connect to Google Sheets',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRepairSheets = async () => {
    if (!accessToken) return;
    setIsRepairing(true);
    setRepairSuccess(null);
    try {
      const created = await ensureRequiredSheets(accessToken);
      setRepairSuccess(
        created.length > 0
          ? `Successfully initialized ${created.length} missing sheet tabs (${created.join(', ')})!`
          : 'All required sheet tabs and headers are now in place.'
      );
      testConnection(getSpreadsheetId());
      if (syncNow) syncNow();
    } catch (err: any) {
      alert(`Failed to repair sheets: ${err?.message || err}`);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div
      id="spreadsheet-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Google Sheet Database Settings</h3>
              <p className="text-[11px] text-slate-400">
                Configure spreadsheet ID, verify permissions, and validate data sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Spreadsheet ID Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 block text-xs">
              Google Spreadsheet ID or URL
            </label>
            <div className="flex gap-2">
              <input
                id="input-spreadsheet-id"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. 10KdB24z92UbICBdQCpHrFWpsGgDCx1IOr957d6auCjg"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono"
              />
              <button
                onClick={handleSave}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shrink-0 cursor-pointer"
              >
                Apply
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>
                Active ID: <code className="text-blue-300 font-mono">{currentId}</code>
              </span>
              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {/* Quick Direct Link */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 truncate">
                Direct Spreadsheet Link
              </span>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${currentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-[11px] border border-slate-700"
            >
              <span>Open in Google Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Connection Test / Status */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs">
                Connection & Schema Diagnostics
              </span>
              <button
                onClick={() => testConnection(currentId)}
                disabled={isTesting || !accessToken}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-bold">
                    {testResult.success
                      ? `Connected: ${testResult.title}`
                      : 'Connection Issue Detected'}
                  </span>
                </div>

                {testResult.success && testResult.tabs && (
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div className="text-slate-300">
                      <strong>Found Tabs:</strong>{' '}
                      <span className="font-mono">{testResult.tabs.join(', ')}</span>
                    </div>

                    {testResult.missingTabs && testResult.missingTabs.length > 0 ? (
                      <div className="p-2 bg-amber-950/60 border border-amber-800 rounded-lg text-amber-200 flex items-center justify-between gap-2 mt-2">
                        <div>
                          <div className="font-semibold">
                            Missing Required Tabs: {testResult.missingTabs.join(', ')}
                          </div>
                          <div className="text-[10px] text-amber-300/80">
                            The dashboard requires these tabs for full attendance and seating functionality.
                          </div>
                        </div>
                        <button
                          onClick={handleRepairSheets}
                          disabled={isRepairing}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] shrink-0 cursor-pointer"
                        >
                          {isRepairing ? 'Creating...' : 'Auto-Create Tabs'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>All required database tabs are present and ready!</span>
                      </div>
                    )}
                  </div>
                )}

                {!testResult.success && (
                  <div className="space-y-1 text-[11px] text-rose-300">
                    <p>{testResult.error}</p>
                    <p className="text-slate-400 text-[10px]">
                      Tip: Ensure your Google Account is logged in and has edit access to this spreadsheet in Google Drive.
                    </p>
                  </div>
                )}
              </div>
            )}

            {repairSuccess && (
              <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-200 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{repairSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-800/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
