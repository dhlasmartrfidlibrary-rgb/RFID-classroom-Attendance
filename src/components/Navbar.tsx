import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import {
  LogOut,
  RefreshCw,
  Database,
  UserCheck,
  ShieldCheck,
  ClipboardList,
  History,
  Radio,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import { getSpreadsheetId } from '../services/sheetsService';

interface NavbarProps {
  onOpenActivityLog: () => void;
  onOpenAttendanceLog: () => void;
  onOpenSpreadsheetSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenActivityLog,
  onOpenAttendanceLog,
  onOpenSpreadsheetSettings,
}) => {
  const { teacherAccount, logout } = useAuth();
  const {
    isSyncing,
    lastSyncedAt,
    syncNow,
    autoSync,
    setAutoSync,
    syncError,
    setIsScannerModalOpen,
  } = useAttendance();

  const currentSheetId = getSpreadsheetId();

  const formattedTime = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Not yet';

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shrink-0 z-30 shadow-sm">
      <div className="w-full max-w-[1920px] mx-auto px-2.5 sm:px-4">
        <div className="flex items-center justify-between h-10 sm:h-11">
          {/* App Branding */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-inner font-bold text-xs">
              <Radio className="w-3.5 h-3.5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-100 tracking-tight">
                  RFID Attendance
                </span>
                <span className="hidden md:inline-block px-1.5 py-0.2 text-[10px] font-semibold rounded bg-blue-900/80 text-blue-200 border border-blue-700/60">
                  Dashboard
                </span>
              </div>
            </div>
          </div>

          {/* Center Tools / Date & Status */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px]">
              <span className="text-slate-400">Date:</span>
              <span className="font-semibold text-slate-200">{todayFormatted}</span>
            </div>

            {/* Sync Status Badge */}
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  syncError
                    ? 'bg-rose-500'
                    : isSyncing
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-slate-300">
                {isSyncing ? 'Syncing...' : `Sync: ${formattedTime}`}
              </span>
              <button
                id="btn-manual-sync"
                onClick={() => syncNow()}
                disabled={isSyncing}
                title="Sync with Google Sheets now"
                aria-label="Sync with Google Sheets now"
                className="ml-1 p-0.5 hover:text-white text-slate-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Auto-sync Toggle */}
            <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-400 hover:text-slate-300 text-[11px]">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-3 h-3 rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Live RFID Polling</span>
            </label>
          </div>

          {/* Right Actions & Teacher Profile */}
          <div className="flex items-center space-x-2">
            {/* Live RFID Scanner Modal Button */}
            <button
              id="btn-open-rfid-scanner"
              onClick={() => setIsScannerModalOpen(true)}
              title="Open Live RFID Card Reader & Scanner"
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs border border-blue-400/50 transition-colors cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Scan RFID</span>
            </button>

            {/* Database Sheets Link */}
            <a
              href={`https://docs.google.com/spreadsheets/d/${currentSheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Google Sheet Database"
              className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-colors"
            >
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Sheet</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>

            {/* Spreadsheet Settings modal button */}
            <button
              id="btn-open-spreadsheet-settings"
              onClick={onOpenSpreadsheetSettings}
              title="Configure Google Sheet Database & Sync"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-colors cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span className="hidden md:inline">DB Settings</span>
            </button>

            {/* Attendance Log modal button */}
            <button
              id="btn-open-attendance-log"
              onClick={onOpenAttendanceLog}
              title="View Attendance Logs"
              className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-colors cursor-pointer"
            >
              <ClipboardList className="w-3 h-3 text-blue-400" />
              <span>Logs</span>
            </button>

            {/* Activity Log modal button */}
            <button
              id="btn-open-activity-log"
              onClick={onOpenActivityLog}
              title="View Dashboard Audit Trail"
              className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-colors cursor-pointer"
            >
              <History className="w-3 h-3 text-indigo-400" />
              <span>Audit</span>
            </button>

            {/* Teacher info badge */}
            {teacherAccount && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-300 font-semibold text-[11px]">
                  {teacherAccount.teacherName.charAt(0).toUpperCase() || 'T'}
                </div>
                <span className="hidden xl:inline font-medium text-xs text-slate-200">
                  {teacherAccount.teacherName}
                </span>
              </div>
            )}

            {/* Log out */}
            <button
              id="btn-logout"
              onClick={() => logout()}
              title="Sign out of Teacher Dashboard"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 hover:text-rose-100 text-xs border border-rose-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
