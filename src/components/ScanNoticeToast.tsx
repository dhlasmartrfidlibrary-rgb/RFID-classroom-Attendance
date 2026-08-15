import React, { useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogOut,
  X,
  ArrowRight,
  Radio,
} from 'lucide-react';

export const ScanNoticeToast: React.FC = () => {
  const { lastScanNotice, dismissScanNotice, selectGradeSection, selectedGradeSection } =
    useAttendance();

  useEffect(() => {
    if (!lastScanNotice) return;
    const timer = setTimeout(() => {
      dismissScanNotice();
    }, 6000);
    return () => clearTimeout(timer);
  }, [lastScanNotice, dismissScanNotice]);

  if (!lastScanNotice) return null;

  const isOut =
    lastScanNotice.status === 'TIMED_OUT' ||
    lastScanNotice.status === 'EARLY_OUT' ||
    lastScanNotice.message.toLowerCase().includes('time out');
  const isLate = lastScanNotice.status === 'LATE';
  const isError = lastScanNotice.status === 'ERROR';

  return (
    <aside
      id="scan-live-toast"
      aria-label="RFID Scan Notification"
      className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div
        className={`p-3.5 rounded-2xl shadow-2xl border backdrop-blur-md text-slate-100 flex items-start justify-between gap-3 ${
          isError
            ? 'bg-rose-950/90 border-rose-700/80 shadow-rose-950/50'
            : isOut
            ? 'bg-amber-950/90 border-amber-700/80 shadow-amber-950/50'
            : isLate
            ? 'bg-amber-950/90 border-amber-700/80 shadow-amber-950/50'
            : 'bg-slate-900/95 border-emerald-500/80 shadow-emerald-950/40'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isError
                ? 'bg-rose-600 text-white'
                : isOut
                ? 'bg-amber-600 text-white'
                : isLate
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isError ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isOut ? (
              <LogOut className="w-5 h-5" />
            ) : isLate ? (
              <Clock className="w-5 h-5" />
            ) : (
              <Radio className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">
                {lastScanNotice.studentName}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {lastScanNotice.studentId}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-snug">
              {lastScanNotice.message}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-mono text-slate-400">
                {lastScanNotice.timestamp}
              </span>
              {lastScanNotice.gradeSection &&
                lastScanNotice.gradeSection !== selectedGradeSection && (
                  <button
                    onClick={() => {
                      selectGradeSection(lastScanNotice.gradeSection);
                      dismissScanNotice();
                    }}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <span>View Section {lastScanNotice.gradeSection}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
            </div>
          </div>
        </div>

        <button
          onClick={dismissScanNotice}
          aria-label="Dismiss scan notification"
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
