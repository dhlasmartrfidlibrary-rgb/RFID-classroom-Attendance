import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { StudentMaster } from '../types';
import {
  Users,
  Save,
  XCircle,
  Plus,
  Search,
  CheckCircle,
  GripVertical,
  ArrowDownCircle,
} from 'lucide-react';

interface EditSeatingDrawerProps {
  onOpenConfirmSave: () => void;
}

export const EditSeatingDrawer: React.FC<EditSeatingDrawerProps> = ({
  onOpenConfirmSave,
}) => {
  const {
    isEditingSeating,
    unassignedStudents,
    selectedGradeSection,
    stagedChanges,
    discardSeatingChanges,
    assignStudentToSeat,
    removeStudentFromSeat,
    isSavingSeating,
    seatGrid,
    draggedItem,
    setDraggedItem,
  } = useAttendance();

  const [searchStudent, setSearchStudent] = useState<string>('');
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState<StudentMaster | null>(null);
  const [isPoolDragOver, setIsPoolDragOver] = useState<boolean>(false);

  if (!isEditingSeating) return null;

  const filteredUnassigned = unassignedStudents.filter((s) => {
    if (!searchStudent.trim()) return true;
    const query = searchStudent.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(query) ||
      s.studentId.toLowerCase().includes(query) ||
      s.rfidUid.toLowerCase().includes(query)
    );
  });

  const handleStudentSelect = (student: StudentMaster) => {
    if (selectedStudentToAssign?.studentId === student.studentId) {
      setSelectedStudentToAssign(null);
    } else {
      setSelectedStudentToAssign(student);
    }
  };

  // Find first empty seat to quick-assign
  const handleQuickAssignFirstAvailable = (student: StudentMaster) => {
    const firstEmpty = seatGrid.find((s) => !s.student);
    if (firstEmpty) {
      assignStudentToSeat(student, firstEmpty.seatNumber);
      setSelectedStudentToAssign(null);
    }
  };

  // Drag over pool to unassign a seated student
  const handlePoolDragOver = (e: React.DragEvent) => {
    if (draggedItem?.type === 'SEAT') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!isPoolDragOver) setIsPoolDragOver(true);
    }
  };

  const handlePoolDragLeave = () => {
    setIsPoolDragOver(false);
  };

  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPoolDragOver(false);
    setDraggedItem(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if ((data.type === 'SEAT_MOVE' || data.type === 'SEAT_STUDENT') && data.seatNumber) {
        removeStudentFromSeat(data.seatNumber);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed bottom-2 left-2 right-2 sm:left-4 sm:right-4 lg:left-6 lg:right-6 z-40 bg-amber-50/95 backdrop-blur-md border-2 border-amber-500 rounded-2xl p-3 sm:p-3.5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200 flex flex-col max-h-[46vh] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-[10px] uppercase tracking-wider">
            EDIT SEATING DOCK
          </span>
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
            {selectedGradeSection} &bull; Drag students to/from desks
          </h3>
        </div>

        {/* Primary Action Buttons: SAVE SEATING & CANCEL */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="btn-cancel-seating"
            onClick={discardSeatingChanges}
            disabled={isSavingSeating}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>CANCEL</span>
          </button>

          <button
            id="btn-save-seating"
            onClick={onOpenConfirmSave}
            disabled={isSavingSeating || stagedChanges.length === 0}
            className="flex items-center space-x-1.5 px-4 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-black tracking-wide shadow-md transition-all cursor-pointer ring-1 ring-emerald-500"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              SAVE SEATING {stagedChanges.length > 0 ? `(${stagedChanges.length})` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Unassigned Students Pool Container (also drop zone for returning students) */}
      <div
        onDragOver={handlePoolDragOver}
        onDragLeave={handlePoolDragLeave}
        onDrop={handlePoolDrop}
        className={`mt-2 flex-1 min-h-0 bg-white rounded-xl border-2 p-2 sm:p-2.5 flex flex-col transition-all duration-200 overflow-hidden ${
          isPoolDragOver
            ? 'border-dashed border-rose-500 bg-rose-50/70 ring-4 ring-rose-300 scale-[1.01]'
            : draggedItem?.type === 'SEAT'
            ? 'border-dashed border-amber-400 bg-amber-50/40'
            : 'border-amber-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Unassigned Pool ({filteredUnassigned.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Filter student..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full pl-6 pr-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            <Search className="w-3 h-3 text-slate-400 absolute left-1.5 top-1.5" />
          </div>
        </div>

        {/* Drop zone visual notification when dragging a student from a seat */}
        {draggedItem?.type === 'SEAT' && (
          <div className="mb-1.5 py-1 px-2 bg-amber-100/90 border border-dashed border-amber-400 rounded-lg text-xs text-amber-900 font-bold flex items-center justify-center gap-1.5 animate-pulse shrink-0">
            <ArrowDownCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>Drop seated student here to unassign</span>
          </div>
        )}

        {filteredUnassigned.length === 0 ? (
          <div className="py-2 text-center text-xs text-slate-500 italic bg-slate-50 rounded-lg border border-dashed border-slate-200 my-auto">
            {unassignedStudents.length === 0
              ? 'All active students in this section are assigned to desks!'
              : 'No unassigned students match your filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
            {filteredUnassigned.map((student) => {
              const isSelected = selectedStudentToAssign?.studentId === student.studentId;
              const isBeingDragged =
                draggedItem?.type === 'UNASSIGNED' &&
                draggedItem.studentId === student.studentId;

              return (
                <div
                  key={student.studentId}
                  draggable
                  onDragStart={(e) => {
                    setDraggedItem({
                      type: 'UNASSIGNED',
                      studentId: student.studentId,
                      studentName: student.studentName,
                    });
                    e.dataTransfer.setData(
                      'text/plain',
                      JSON.stringify({
                        type: 'UNASSIGNED_STUDENT',
                        studentId: student.studentId,
                      })
                    );
                    e.dataTransfer.effectAllowed = 'copyMove';
                  }}
                  onDragEnd={() => setDraggedItem(null)}
                  className={`p-1.5 rounded-lg border text-xs flex items-center justify-between transition-all select-none cursor-grab active:cursor-grabbing hover:shadow-xs ${
                    isBeingDragged
                      ? 'opacity-40 border-dashed border-slate-400 bg-slate-100'
                      : isSelected
                      ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-400'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                  onClick={() => handleStudentSelect(student)}
                >
                  <div className="flex items-center space-x-1 min-w-0 flex-1 pr-1.5">
                    <GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-slate-800 text-[11px] truncate" title={student.studentName}>
                        {student.studentName}
                      </h5>
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        {student.studentId}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAssignFirstAvailable(student);
                    }}
                    title="Auto-assign to first available desk"
                    className="px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Auto</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
