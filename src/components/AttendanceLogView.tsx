import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { AttendanceRecord } from '../types';
import {
  X,
  ClipboardList,
  Search,
  Filter,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Shield,
  AlertTriangle,
} from 'lucide-react';

interface AttendanceLogViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceLogView: React.FC<AttendanceLogViewProps> = ({
  isOpen,
  onClose,
}) => {
  const { attendanceLogs, selectedGradeSection } = useAttendance();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  if (!isOpen) return null;

  const filteredLogs = attendanceLogs.filter((log) => {
    const matchStatus =
      statusFilter === 'ALL' ||
      (log.status && log.status.toUpperCase().includes(statusFilter));
    const matchDate =
      !dateFilter ||
      log.date === dateFilter ||
      log.timestamp.startsWith(dateFilter);
    const query = searchQuery.toLowerCase();
    const matchQuery =
      !query ||
      log.studentName.toLowerCase().includes(query) ||
      log.studentId.toLowerCase().includes(query) ||
      log.rfidUid.toLowerCase().includes(query) ||
      log.gradeSection.toLowerCase().includes(query) ||
      log.message.toLowerCase().includes(query);

    return matchStatus && matchDate && matchQuery;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('PRESENT')) {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
          PRESENT
        </span>
      );
    }
    if (s.includes('LATE')) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
          LATE
        </span>
      );
    }
    if (s.includes('ABSENT')) {
      return (
        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
          ABSENT
        </span>
      );
    }
    if (s.includes('EARLY')) {
      return (
        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold">
          EARLY OUT
        </span>
      );
    }
    if (s.includes('EXCUSED')) {
      return (
        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
          EXCUSED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
        {status}
      </span>
    );
  };

  return (
    <div
      id="attendance-log-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  RFID Attendance Log History
                </h3>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded border border-slate-700">
                  ATTENDANCE_LOG Sheet
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Source of truth for all classroom badge taps &amp; attendance events
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, ID, RFID UID, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 cursor-pointer"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="ABSENT">ABSENT</option>
                <option value="EARLY">EARLY OUT</option>
                <option value="EXCUSED">EXCUSED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic">
              No attendance logs found matching your criteria.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Timestamp</th>
                    <th className="px-3 py-2.5 text-left">Type</th>
                    <th className="px-3 py-2.5 text-left">Time In</th>
                    <th className="px-3 py-2.5 text-left">Time Out</th>
                    <th className="px-3 py-2.5 text-left">Student Name</th>
                    <th className="px-3 py-2.5 text-left">Student ID</th>
                    <th className="px-3 py-2.5 text-left">RFID UID</th>
                    <th className="px-3 py-2.5 text-left">Grade & Section</th>
                    <th className="px-3 py-2.5 text-left">Device ID</th>
                    <th className="px-3 py-2.5 text-left">Status</th>
                    <th className="px-3 py-2.5 text-left">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLogs.map((log, index) => {
                    const msg = (log.message || '').toLowerCase();
                    const isOut =
                      (log.type || '').toUpperCase() === 'OUT' ||
                      msg.includes('time out') ||
                      msg.includes('dismissal') ||
                      msg.includes('exit') ||
                      msg.includes('early out') ||
                      log.status === 'EARLY_OUT';

                    const displayTimeIn =
                      log.timeIn || (!isOut ? log.time || (log.timestamp ? log.timestamp.split(' ')[1] : '') : '—');
                    const displayTimeOut =
                      log.timeOut || (isOut ? log.time || (log.timestamp ? log.timestamp.split(' ')[1] : '') : '—');

                    return (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                          {log.timestamp || `${log.date} ${log.time}`}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px] border border-blue-200">
                              TIME OUT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-200">
                              TIME IN
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-emerald-800 whitespace-nowrap">
                          {displayTimeIn}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-blue-800 whitespace-nowrap">
                          {displayTimeOut}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">
                          {log.studentName || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                          {log.studentId}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">
                          {log.rfidUid || '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">
                          {log.gradeSection}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {log.deviceId || 'RFID-MAIN-PORTAL'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="px-3 py-2 text-slate-600 text-[11px] max-w-[200px] truncate" title={log.message}>
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

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredLogs.length} attendance scan records</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
