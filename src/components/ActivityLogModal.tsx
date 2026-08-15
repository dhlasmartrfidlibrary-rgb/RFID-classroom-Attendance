import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ActivityLogEntry } from '../types';
import { fetchActivityLogs, SPREADSHEET_ID } from '../services/sheetsService';
import {
  X,
  History,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Shield,
  FileText,
} from 'lucide-react';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');

  const loadLogs = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await fetchActivityLogs(accessToken);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadLogs();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchAction =
      selectedActionFilter === 'ALL' || log.action === selectedActionFilter;
    const query = searchQuery.toLowerCase();
    const matchQuery =
      !query ||
      log.details.toLowerCase().includes(query) ||
      log.teacherName.toLowerCase().includes(query) ||
      log.googleEmail.toLowerCase().includes(query) ||
      log.gradeSection.toLowerCase().includes(query) ||
      log.studentId.toLowerCase().includes(query);

    return matchAction && matchQuery;
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN')) {
      return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">LOGIN</span>;
    }
    if (act.includes('LOGOUT')) {
      return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">LOGOUT</span>;
    }
    if (act.includes('SEATING_SAVED')) {
      return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">SEATING_SAVED</span>;
    }
    if (act.includes('SEAT_ASSIGNED') || act.includes('SEAT_MOVED') || act.includes('SEAT_SWAPPED') || act.includes('SEAT_REMOVED')) {
      return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">{act}</span>;
    }
    if (act.includes('SECTION_SELECTED')) {
      return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">SECTION_SELECT</span>;
    }
    if (act.includes('PROFILE')) {
      return <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">PROFILE_VIEW</span>;
    }
    if (act.includes('MANUAL_ATTENDANCE')) {
      return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">MANUAL_ATTENDANCE</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">{act}</span>;
  };

  return (
    <div
      id="activity-log-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Teacher Dashboard Audit Trail
                </h3>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded border border-slate-700">
                  ACTIVITY_LOG Sheet
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Real-time audit log stored in Google Spreadsheet
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by teacher, student ID, action, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="SECTION_SELECTED">SECTION_SELECTED</option>
              <option value="SEAT_ASSIGNED">SEAT_ASSIGNED</option>
              <option value="SEAT_MOVED">SEAT_MOVED</option>
              <option value="SEAT_SWAPPED">SEAT_SWAPPED</option>
              <option value="SEAT_REMOVED">SEAT_REMOVED</option>
              <option value="SEATING_SAVED">SEATING_SAVED</option>
              <option value="MANUAL_ATTENDANCE_LOGGED">MANUAL_ATTENDANCE_LOGGED</option>
              <option value="STUDENT_PROFILE_VIEWED">STUDENT_PROFILE_VIEWED</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Fetching audit trail from Google Sheet...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs italic">
              No activity log records found matching your filters.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Timestamp</th>
                    <th className="px-3 py-2.5 text-left">Action</th>
                    <th className="px-3 py-2.5 text-left">Teacher</th>
                    <th className="px-3 py-2.5 text-left">Grade & Section</th>
                    <th className="px-3 py-2.5 text-left">Student ID</th>
                    <th className="px-3 py-2.5 text-left">Activity Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                        <div>{log.teacherName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.googleEmail}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                        {log.gradeSection || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                        {log.studentId || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredLogs.length} activity audit log records</span>
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
