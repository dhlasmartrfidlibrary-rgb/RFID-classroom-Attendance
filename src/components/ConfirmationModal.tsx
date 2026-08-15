import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Check,
  X,
  Database,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { teacherAccount } = useAuth();
  const {
    stagedChanges,
    saveSeatingArrangement,
    isSavingSeating,
    selectedGradeSection,
  } = useAttendance();

  if (!isOpen) return null;

  const handleConfirmSave = async () => {
    try {
      await saveSeatingArrangement();
      onClose();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  return (
    <div
      id="confirmation-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700/80 flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Confirm Seating Update</h3>
              <p className="text-xs text-amber-100 font-mono">
                Updating SEATING_PLAN in Google Sheet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSavingSeating}
            className="p-1.5 rounded-lg bg-amber-700/80 hover:bg-amber-700 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                You are about to write changes for Grade &amp; Section <strong>{selectedGradeSection}</strong>.
              </p>
              <p className="mt-1 text-slate-600">
                This operation will update the <strong>SEATING_PLAN</strong> sheet and create audit records in <strong>ACTIVITY_LOG</strong> with your authenticated email (<code>{teacherAccount?.googleEmail}</code>).
              </p>
            </div>
          </div>

          {/* Staged modifications list */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Summary of Modifications ({stagedChanges.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {stagedChanges.map((change, index) => (
                <div
                  key={index}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 uppercase ${
                        change.action === 'SEAT_ASSIGNED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : change.action === 'SEAT_MOVED'
                          ? 'bg-blue-100 text-blue-800'
                          : change.action === 'SEAT_SWAPPED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {change.action.replace('SEAT_', '')}
                    </span>
                    <span className="font-medium text-slate-800">{change.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSavingSeating}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmSave}
            disabled={isSavingSeating}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            {isSavingSeating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Writing to Google Sheets...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Write to Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
