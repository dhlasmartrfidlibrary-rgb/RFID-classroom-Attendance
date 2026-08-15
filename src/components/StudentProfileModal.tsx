import React, { useState, useMemo } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { AttendanceStatus, AttendanceRecord } from '../types';
import {
  X,
  User,
  CreditCard,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Shield,
  Layers,
  Calendar,
  History,
  Send,
  LogIn,
  LogOut,
  AlertCircle,
} from 'lucide-react';

export const StudentProfileModal: React.FC = () => {
  const {
    selectedStudentSeat,
    closeStudentProfile,
    attendanceLogs,
    selectedGradeSection,
    selectedDate,
    recordManualAttendance,
    recordTimeOut,
  } = useAttendance();

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [manualNote, setManualNote] = useState<string>('');

  const student = selectedStudentSeat?.student;
  const assignment = selectedStudentSeat?.assignment;
  const attendanceStatus = selectedStudentSeat?.attendanceStatus || 'NO_SCAN';
  const hasTimedIn = selectedStudentSeat?.hasTimedIn || false;
  const hasTimedOut = selectedStudentSeat?.hasTimedOut || false;
  const timeIn = selectedStudentSeat?.timeIn || selectedStudentSeat?.attendanceTime;
  const timeOut = selectedStudentSeat?.timeOut;

  // Get student's recent attendance logs from ATTENDANCE_LOG
  const studentHistory: AttendanceRecord[] = useMemo(() => {
    if (!student) return [];
    return attendanceLogs
      .filter((l) => l.studentId?.toLowerCase() === student.studentId?.toLowerCase())
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 10);
  }, [attendanceLogs, student]);

  if (!selectedStudentSeat || !student) return null;

  const handleQuickStatus = async (status: AttendanceStatus) => {
    setIsUpdatingStatus(true);
    try {
      await recordManualAttendance(student.studentId, status, manualNote);
      setManualNote('');
    } catch (err) {
      console.error('Failed to update attendance:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRecordTimeOut = async () => {
    setIsUpdatingStatus(true);
    try {
      await recordTimeOut(student.studentId, undefined, manualNote || undefined);
      setManualNote('');
    } catch (err) {
      console.error('Failed to record time out:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PRESENT
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            LATE
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            ABSENT
          </span>
        );
      case 'EARLY_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-300">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            EARLY OUT
          </span>
        );
      case 'EXCUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            EXCUSED
          </span>
        );
      case 'NO_SCAN':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            NO SCAN
          </span>
        );
    }
  };

  return (
    <div
      id="student-profile-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-white font-black text-xl shadow-md">
              {student.studentName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-200 text-[11px] font-mono font-bold">
                  Seat #{selectedStudentSeat.seatNumber} ({selectedStudentSeat.seatId})
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedStudentSeat.block} Block &bull; Row {selectedStudentSeat.row}, Col {selectedStudentSeat.column}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{student.studentName}</h2>
              <div className="flex items-center space-x-3 text-xs text-slate-300 font-mono mt-0.5">
                <span>ID: {student.studentId}</span>
                <span>&bull;</span>
                <span>Section: {student.gradeSection}</span>
              </div>
            </div>
          </div>

          <button
            onClick={closeStudentProfile}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Time In & Time Out Detailed Status Card */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Daily Attendance &amp; RFID Time Log
              </span>
              <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-500 font-mono text-[11px]">RFID:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {student.rfidUid || 'Unregistered'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* TIME IN Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                      Time In (Arrival)
                    </span>
                    {getStatusBadge(attendanceStatus)}
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {hasTimedIn && timeIn ? timeIn : '—'}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {hasTimedIn
                    ? 'Student marked present for whole day'
                    : 'Awaiting morning RFID badge scan'}
                </p>
              </div>

              {/* TIME OUT Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5 text-blue-600" />
                      Time Out (Departure)
                    </span>
                    {hasTimedOut ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        TIMED OUT
                      </span>
                    ) : hasTimedIn ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        DIDN'T TIME OUT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-300">
                        NO SCAN
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {hasTimedOut && timeOut ? (
                      <span className="text-blue-900">{timeOut}</span>
                    ) : hasTimedIn ? (
                      <span className="text-amber-800 text-sm font-bold">Didn't Time Out</span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500">
                    {hasTimedOut
                      ? 'Departure / Dismissal recorded'
                      : hasTimedIn
                      ? 'Student has not tapped RFID for exit'
                      : 'No arrival record today'}
                  </p>
                  {hasTimedIn && !hasTimedOut && (
                    <button
                      disabled={isUpdatingStatus}
                      onClick={handleRecordTimeOut}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      Time Out Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Parent / Guardian Information Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              Parent / Guardian Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                  Parent Name
                </span>
                <span className="font-semibold text-slate-800">
                  {student.parentName || 'Not specified'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                  Parent Email
                </span>
                <a
                  href={`mailto:${student.parentEmail}`}
                  className="font-semibold text-blue-600 hover:underline truncate block"
                >
                  {student.parentEmail || 'Not specified'}
                </a>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                  Contact Number
                </span>
                <a
                  href={`tel:${student.parentContact}`}
                  className="font-semibold text-slate-800 hover:text-blue-600 font-mono block"
                >
                  {student.parentContact || 'Not specified'}
                </a>
              </div>
            </div>
          </div>

          {/* Quick Attendance Override / Simulator */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Manual Attendance &amp; Time Actions</span>
              {isUpdatingStatus && (
                <span className="text-blue-600 text-[11px] animate-pulse font-normal">
                  Writing to ATTENDANCE_LOG...
                </span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus('PRESENT')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                Mark Present (In)
              </button>
              <button
                disabled={isUpdatingStatus}
                onClick={handleRecordTimeOut}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                Record Time Out
              </button>
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus('LATE')}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                Mark Late
              </button>
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus('EARLY_OUT')}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                Early Out
              </button>
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus('ABSENT')}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                Mark Absent
              </button>
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus('EXCUSED')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                Mark Excused
              </button>
            </div>
          </div>

          {/* Recent Attendance History Table from ATTENDANCE_LOG */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Attendance Log History (from ATTENDANCE_LOG)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {studentHistory.length} records found
              </span>
            </div>

            {studentHistory.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                No previous attendance logs recorded for this student in ATTENDANCE_LOG.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Device</th>
                      <th className="px-3 py-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {studentHistory.map((log, idx) => {
                      const msg = (log.message || '').toLowerCase();
                      const isOut =
                        msg.includes('time out') ||
                        msg.includes('dismissal') ||
                        msg.includes('exit') ||
                        msg.includes('early out') ||
                        log.status === 'EARLY_OUT';

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                            {log.date || log.timestamp.split(' ')[0]}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap font-bold">
                            {log.time || log.timestamp.split(' ')[1] || ''}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isOut ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                TIME OUT
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                TIME IN
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.status === 'LATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : log.status === 'ABSENT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : log.status === 'EARLY_OUT'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">
                            {log.deviceId}
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-[11px] truncate max-w-[150px]">
                            {log.message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex justify-end">
          <button
            onClick={closeStudentProfile}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};

