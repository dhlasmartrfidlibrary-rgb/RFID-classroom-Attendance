import React, { useState, useEffect, useRef } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Radio,
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LogIn,
  LogOut,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Keyboard,
  UserCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  playPresentChime,
  playLateChime,
  playTimeOutChime,
  playErrorBuzzer,
} from '../utils/audio';

interface RfidScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RfidScannerModal: React.FC<RfidScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    students,
    sectionStudents,
    selectedGradeSection,
    selectGradeSection,
    selectedSchedule,
    simulateRfidScan,
    selectedDate,
  } = useAttendance();

  const [rfidInput, setRfidInput] = useState<string>('');
  const [scanMode, setScanMode] = useState<'AUTO' | 'IN' | 'OUT'>('AUTO');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [searchRoster, setSearchRoster] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentScans, setRecentScans] = useState<
    Array<{
      timestamp: string;
      studentName: string;
      studentId: string;
      rfidUid: string;
      gradeSection: string;
      status: string;
      mode: 'IN' | 'OUT';
      message: string;
      success: boolean;
    }>
  >([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleScanSubmit = async (uidToScan?: string) => {
    const targetUid = (uidToScan || rfidInput).trim();
    if (!targetUid || isScanning) return;

    setIsScanning(true);
    try {
      const result = await simulateRfidScan(targetUid, scanMode);
      const nowStr = new Date().toLocaleTimeString();

      // Find student info for log
      const cleanUid = targetUid.toUpperCase();
      const matched = students.find(
        (s) =>
          s.rfidUid.trim().toUpperCase() === cleanUid ||
          s.studentId.trim().toLowerCase() === targetUid.toLowerCase()
      );

      const isOut =
        scanMode === 'OUT' ||
        (scanMode === 'AUTO' && result.message.toLowerCase().includes('time out'));

      if (result.success) {
        if (soundEnabled) {
          if (isOut) {
            playTimeOutChime();
          } else if (result.message.toLowerCase().includes('late')) {
            playLateChime();
          } else {
            playPresentChime();
          }
        }

        setRecentScans((prev) => [
          {
            timestamp: nowStr,
            studentName: matched?.studentName || result.record?.studentName || 'Student',
            studentId: matched?.studentId || result.record?.studentId || targetUid,
            rfidUid: targetUid,
            gradeSection: matched?.gradeSection || result.record?.gradeSection || selectedGradeSection,
            status: result.record?.status || (isOut ? 'TIMED_OUT' : 'PRESENT'),
            mode: isOut ? 'OUT' : 'IN',
            message: result.message,
            success: true,
          },
          ...prev.slice(0, 9),
        ]);

        setRfidInput('');
      } else {
        if (soundEnabled) {
          playErrorBuzzer();
        }
        setRecentScans((prev) => [
          {
            timestamp: nowStr,
            studentName: 'Unrecognized RFID Tag',
            studentId: 'Unknown',
            rfidUid: targetUid,
            gradeSection: 'None',
            status: 'ERROR',
            mode: 'IN',
            message: result.message,
            success: false,
          },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (err: unknown) {
      if (soundEnabled) playErrorBuzzer();
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanSubmit();
    }
  };

  if (!isOpen) return null;

  const filteredStudents = (searchRoster ? students : sectionStudents).filter((s) => {
    if (!searchRoster) return true;
    const q = searchRoster.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.rfidUid.toLowerCase().includes(q) ||
      s.gradeSection.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        id="rfid-scanner-dialog"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 border border-blue-400/40 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Live RFID Card Reader &amp; Scanner</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Ready
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Supports USB RFID hardware reader, barcode wedge, or 1-click tap simulation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Scan Mode Selector & Schedule Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 font-medium mr-1.5">Mode:</span>
              <button
                onClick={() => setScanMode('AUTO')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  scanMode === 'AUTO'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Auto (Arrival &rarr; Dismissal)
              </button>
              <button
                onClick={() => setScanMode('IN')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                  scanMode === 'IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LogIn className="w-3 h-3" />
                <span>Time In</span>
              </button>
              <button
                onClick={() => setScanMode('OUT')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                  scanMode === 'OUT'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LogOut className="w-3 h-3" />
                <span>Time Out</span>
              </button>
            </div>

            {selectedSchedule && (
              <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Late Cutoff: <strong className="text-amber-400">{selectedSchedule.lateCutoff}</strong></span>
                <span>&bull;</span>
                <span>Dismissal: <strong className="text-blue-400">{selectedSchedule.endTime}</strong></span>
              </div>
            )}
          </div>

          {/* Primary Input Box for Scanner Hardware */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Hardware Scanner &amp; Manual UID Input
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                id="rfid-scan-input"
                placeholder="Scan RFID card / type UID (e.g. E2000019... or Student ID) & press Enter..."
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isScanning}
                className="w-full pl-10 pr-24 py-3 bg-slate-950 border-2 border-blue-500/80 focus:border-blue-400 rounded-xl text-sm font-mono text-white placeholder-slate-500 shadow-inner focus:outline-hidden"
              />
              <Keyboard className="w-5 h-5 text-blue-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <button
                onClick={() => handleScanSubmit()}
                disabled={!rfidInput.trim() || isScanning}
                className="absolute right-2 top-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isScanning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Tap / Scan</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>
                Tip: Physical USB RFID readers automatically input the UID and press Enter.
              </span>
            </p>
          </div>

          {/* Recent Scans Feedback Feed */}
          {recentScans.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Recent Live Scans:</span>
                <span>{recentScans.length} taps recorded</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      scan.success
                        ? scan.mode === 'OUT'
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                          : scan.status === 'LATE'
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                          : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {scan.success ? (
                        scan.mode === 'OUT' ? (
                          <LogOut className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{scan.studentName}</span>
                          <span className="font-mono text-[10px] opacity-75">
                            ({scan.studentId})
                          </span>
                          {scan.gradeSection && scan.gradeSection !== selectedGradeSection && (
                            <button
                              onClick={() => selectGradeSection(scan.gradeSection)}
                              className="px-1.5 py-0.2 bg-blue-900 hover:bg-blue-800 text-blue-200 text-[10px] rounded font-mono underline cursor-pointer"
                            >
                              Switch to {scan.gradeSection}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] opacity-80">{scan.message}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] opacity-60 shrink-0">
                      {scan.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Tap Student Roster (1-Click Simulator) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>1-Click Student Card Tap (Quick Simulation)</span>
              </label>
              <div className="relative w-48 sm:w-60">
                <input
                  type="text"
                  placeholder="Filter student name or ID..."
                  value={searchRoster}
                  onChange={(e) => setSearchRoster(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden"
                />
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-xs text-slate-500">
                  No students matched in STUDENT_MASTER.
                </div>
              ) : (
                filteredStudents.map((st) => (
                  <button
                    key={st.studentId}
                    onClick={() => handleScanSubmit(st.rfidUid || st.studentId)}
                    disabled={isScanning}
                    className="p-2 bg-slate-950 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-700/80 rounded-xl text-left transition-all duration-150 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="truncate mr-2">
                      <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                        {st.studentName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span>ID: {st.studentId}</span>
                        <span>&bull;</span>
                        <span className="text-blue-400">RFID: {st.rfidUid || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 px-2 py-1 bg-slate-800 group-hover:bg-blue-600 text-slate-300 group-hover:text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1">
                      <span>Tap</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center space-x-1 font-mono text-[11px]">
            <span>Active Section:</span>
            <strong className="text-blue-300">{selectedGradeSection || 'ALL'}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
