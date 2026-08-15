import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import { Navbar } from './components/Navbar';
import { ClassSelector } from './components/ClassSelector';
import { AttendanceSummary } from './components/AttendanceSummary';
import { SeatingMap } from './components/SeatingMap';
import { StudentProfileModal } from './components/StudentProfileModal';
import { EditSeatingDrawer } from './components/EditSeatingDrawer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ActivityLogModal } from './components/ActivityLogModal';
import { AttendanceLogView } from './components/AttendanceLogView';
import { SpreadsheetSettingsModal } from './components/SpreadsheetSettingsModal';
import { RfidScannerModal } from './components/RfidScannerModal';
import { ScanNoticeToast } from './components/ScanNoticeToast';
import { SignInView } from './components/SignInView';
import {
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  Sliders,
  LogIn,
} from 'lucide-react';

function DashboardContent() {
  const {
    isLoading,
    syncError,
    syncNow,
    isScannerModalOpen,
    setIsScannerModalOpen,
  } = useAttendance();
  const { login } = useAuth();
  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);
  const [isAttendanceLogOpen, setIsAttendanceLogOpen] = useState<boolean>(false);
  const [isSpreadsheetSettingsOpen, setIsSpreadsheetSettingsOpen] = useState<boolean>(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState<boolean>(false);

  const isAuthError =
    syncError?.includes('AUTH_EXPIRED') ||
    syncError?.includes('401') ||
    syncError?.includes('token');

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col text-slate-900">
      {/* Top Navigation Bar - Compact */}
      <Navbar
        onOpenActivityLog={() => setIsActivityLogOpen(true)}
        onOpenAttendanceLog={() => setIsAttendanceLogOpen(true)}
        onOpenSpreadsheetSettings={() => setIsSpreadsheetSettingsOpen(true)}
      />

      {/* Main Container - Full viewport height and width without scrolling */}
      <main className="flex-1 min-h-0 w-full max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 flex flex-col gap-1.5 sm:gap-2 overflow-hidden relative">
        {/* Sync Error Banner if any */}
        {syncError && (
          <div className="shrink-0 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="truncate">
                <strong className="font-bold">Sync Notice:</strong>{' '}
                <span>{syncError}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isAuthError ? (
                <button
                  onClick={() => login()}
                  className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Reconnect</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsSpreadsheetSettingsOpen(true)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] rounded font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Sliders className="w-3 h-3 text-cyan-400" />
                  <span>Settings</span>
                </button>
              )}
              <button
                onClick={() => syncNow()}
                className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] rounded font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Initial Loading Screen */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm text-slate-800">
                Loading Classroom Attendance &amp; Seating Plan...
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Fetching records from Google Sheets database
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-1.5 sm:gap-2 overflow-hidden">
            {/* 1. Class Selector Toolbar (Ultra-Compact) */}
            <ClassSelector />

            {/* 2. Real-time Attendance Summary Metrics Ribbon */}
            <AttendanceSummary />

            {/* 3. The 50-Desk Physical Classroom Seating Map (Expansive & Responsive Height) */}
            <SeatingMap />

            {/* 4. Seating Editor Drawer (Floating Overlay Drawer when in Edit mode) */}
            <EditSeatingDrawer
              onOpenConfirmSave={() => setIsConfirmSaveOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}
      <StudentProfileModal />
      <ConfirmationModal
        isOpen={isConfirmSaveOpen}
        onClose={() => setIsConfirmSaveOpen(false)}
      />
      <ActivityLogModal
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
      />
      <AttendanceLogView
        isOpen={isAttendanceLogOpen}
        onClose={() => setIsAttendanceLogOpen(false)}
      />
      <SpreadsheetSettingsModal
        isOpen={isSpreadsheetSettingsOpen}
        onClose={() => setIsSpreadsheetSettingsOpen(false)}
      />
      <RfidScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
      />
      <ScanNoticeToast />
    </div>
  );
}

function MainApp() {
  const { authStatus } = useAuth();

  if (authStatus !== 'AUTHORIZED') {
    return <SignInView />;
  }

  return (
    <AttendanceProvider>
      <DashboardContent />
    </AttendanceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
