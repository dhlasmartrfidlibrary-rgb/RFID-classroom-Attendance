import React, { useState } from 'react';
import { SeatDisplayInfo, AttendanceStatus } from '../types';
import { useAttendance } from '../context/AttendanceContext';
import {
  Clock,
  X,
  ArrowLeftRight,
  UserPlus,
  LogOut,
  LogIn,
  AlertCircle,
} from 'lucide-react';

interface SeatCardProps {
  seat: SeatDisplayInfo;
}

export const SeatCard: React.FC<SeatCardProps> = ({ seat }) => {
  const {
    openStudentProfile,
    isEditingSeating,
    selectedSeatForAction,
    setSelectedSeatForAction,
    moveOrSwapSeat,
    removeStudentFromSeat,
    assignStudentToSeat,
    students,
    highlightedSeatId,
    draggedItem,
    setDraggedItem,
  } = useAttendance();

  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const isOccupied = !!seat.student;
  const isHighlighted = highlightedSeatId === seat.seatId;
  const isSelectedForAction = selectedSeatForAction?.seatNumber === seat.seatNumber;

  // Status Styling Maps
  const getStatusStyles = (status: AttendanceStatus, occupied: boolean) => {
    if (!occupied) {
      return {
        cardBg: 'bg-white hover:bg-slate-50',
        borderColor: 'border-slate-300 border-dashed hover:border-slate-400',
        badgeBg: 'bg-slate-100 text-slate-500 border border-slate-200',
        textColor: 'text-slate-400',
        statusLabel: 'Empty Seat',
        accentBar: 'bg-slate-200',
      };
    }

    switch (status) {
      case 'PRESENT':
        return {
          cardBg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
          borderColor: 'border-emerald-400/80 shadow-xs shadow-emerald-100',
          badgeBg: 'bg-emerald-600 text-white font-bold',
          textColor: 'text-emerald-950',
          statusLabel: 'PRESENT',
          accentBar: 'bg-emerald-500',
        };
      case 'LATE':
        return {
          cardBg: 'bg-amber-50/90 hover:bg-amber-100/90',
          borderColor: 'border-amber-400/80 shadow-xs shadow-amber-100',
          badgeBg: 'bg-amber-500 text-slate-900 font-bold',
          textColor: 'text-amber-950',
          statusLabel: 'LATE',
          accentBar: 'bg-amber-500',
        };
      case 'ABSENT':
        return {
          cardBg: 'bg-rose-50/90 hover:bg-rose-100/90',
          borderColor: 'border-rose-400/80 shadow-xs shadow-rose-100',
          badgeBg: 'bg-rose-600 text-white font-bold',
          textColor: 'text-rose-950',
          statusLabel: 'ABSENT',
          accentBar: 'bg-rose-500',
        };
      case 'EARLY_OUT':
        return {
          cardBg: 'bg-orange-50/90 hover:bg-orange-100/90',
          borderColor: 'border-orange-400/80',
          badgeBg: 'bg-orange-600 text-white font-bold',
          textColor: 'text-orange-950',
          statusLabel: 'EARLY OUT',
          accentBar: 'bg-orange-500',
        };
      case 'EXCUSED':
        return {
          cardBg: 'bg-blue-50/90 hover:bg-blue-100/90',
          borderColor: 'border-blue-400/80',
          badgeBg: 'bg-blue-600 text-white font-bold',
          textColor: 'text-blue-950',
          statusLabel: 'EXCUSED',
          accentBar: 'bg-blue-500',
        };
      case 'NO_SCAN':
      default:
        return {
          cardBg: 'bg-slate-100/90 hover:bg-slate-200/80',
          borderColor: 'border-slate-300',
          badgeBg: 'bg-slate-500 text-white font-semibold',
          textColor: 'text-slate-800',
          statusLabel: 'NO SCAN',
          accentBar: 'bg-slate-400',
        };
    }
  };

  const style = getStatusStyles(seat.attendanceStatus, isOccupied);

  const handleClick = () => {
    if (isEditingSeating) {
      if (selectedSeatForAction) {
        // Move or swap with previously selected seat
        moveOrSwapSeat(selectedSeatForAction.seatNumber, seat.seatNumber);
        setSelectedSeatForAction(null);
      } else {
        // Select this seat as origin for action
        setSelectedSeatForAction(seat);
      }
    } else {
      if (isOccupied) {
        openStudentProfile(seat);
      }
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditingSeating || !isOccupied) return;
    setDraggedItem({
      type: 'SEAT',
      seatNumber: seat.seatNumber,
      studentId: seat.student?.studentId,
      studentName: seat.student?.studentName,
    });
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        type: 'SEAT_MOVE',
        seatNumber: seat.seatNumber,
        studentId: seat.student?.studentId,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditingSeating) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditingSeating) return;
    e.preventDefault();
    setIsDragOver(false);
    setDraggedItem(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type === 'UNASSIGNED_STUDENT' || data.type === 'STUDENT_ASSIGN') {
        const student = students.find(
          (s) => s.studentId.toLowerCase() === data.studentId?.toLowerCase()
        );
        if (student) {
          assignStudentToSeat(student, seat.seatNumber);
        }
      } else if (data.type === 'SEAT_MOVE' || data.type === 'SEAT_STUDENT') {
        if (data.seatNumber && data.seatNumber !== seat.seatNumber) {
          moveOrSwapSeat(data.seatNumber, seat.seatNumber);
        }
      }
    } catch {
      // ignore parsing error
    }
  };

  // Compute visual dragging highlights
  const isSelfBeingDragged =
    draggedItem?.type === 'SEAT' && draggedItem.seatNumber === seat.seatNumber;

  let dragTargetBorder = '';
  if (isEditingSeating && draggedItem && !isSelfBeingDragged) {
    if (!isOccupied) {
      dragTargetBorder = isDragOver
        ? 'ring-4 ring-emerald-500 scale-[1.04] bg-emerald-50 border-emerald-500 z-30 shadow-lg'
        : 'border-2 border-dashed border-emerald-400 bg-emerald-50/40 animate-pulse';
    } else {
      dragTargetBorder = isDragOver
        ? 'ring-4 ring-amber-500 scale-[1.04] bg-amber-50 border-amber-500 z-30 shadow-lg'
        : 'border-2 border-indigo-400 bg-indigo-50/30';
    }
  }

  return (
    <div
      id={`seat-card-${seat.seatNumber}`}
      onClick={handleClick}
      draggable={isEditingSeating && isOccupied}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group rounded-xl border-2 p-1.5 sm:p-2 lg:p-2.5 transition-all duration-150 flex flex-col justify-between select-none h-full min-h-0 overflow-hidden ${
        style.cardBg
      } ${style.borderColor} ${dragTargetBorder} ${
        isSelfBeingDragged ? 'opacity-40 scale-95 border-dashed border-slate-400' : ''
      } ${
        isHighlighted
          ? 'ring-4 ring-blue-500 scale-[1.02] z-20 shadow-md'
          : ''
      } ${
        isSelectedForAction
          ? 'ring-4 ring-amber-500 scale-[1.02] z-20'
          : ''
      } ${
        isEditingSeating
          ? isOccupied
            ? 'cursor-grab active:cursor-grabbing hover:shadow-md'
            : 'cursor-pointer hover:shadow-md'
          : isOccupied
          ? 'cursor-pointer hover:shadow-xs'
          : ''
      }`}
    >
      {/* Top Header: Seat Number & Seat ID & Status */}
      <div className="flex items-center justify-between gap-1 shrink-0">
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <span className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded bg-slate-900 text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-2xs shrink-0">
            {seat.seatNumber}
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-medium hidden 2xl:inline">
            {seat.seatId}
          </span>
        </div>

        {/* Status Badge or Drag Status */}
        {isEditingSeating && isDragOver ? (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-white flex items-center gap-1 shrink-0">
            {!isOccupied ? <UserPlus className="w-3 h-3 text-emerald-400" /> : <ArrowLeftRight className="w-3 h-3 text-amber-400" />}
            <span>{!isOccupied ? 'DROP' : 'SWAP'}</span>
          </span>
        ) : (
          <span
            className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 leading-tight ${style.badgeBg}`}
          >
            {style.statusLabel}
          </span>
        )}
      </div>

      {/* Center Body: Student Name & ID & Time In/Out */}
      <div className="my-auto py-0.5 min-w-0">
        {isOccupied ? (
          <div>
            <h4
              className={`font-black text-[11px] sm:text-xs xl:text-[13px] leading-snug line-clamp-1 truncate ${style.textColor}`}
              title={seat.student?.studentName}
            >
              {seat.student?.studentName}
            </h4>
            <div className="flex items-center justify-between gap-1 mt-0.5 text-[10px] text-slate-500 font-mono">
              <span className="font-semibold truncate text-[9px] sm:text-[10px]">{seat.student?.studentId}</span>
              {seat.hasTimedIn ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="flex items-center gap-0.5 text-slate-700 font-sans font-bold bg-white/80 px-1 py-0.2 rounded border border-slate-200/70 text-[8.5px] sm:text-[9px]"
                    title={`Time In: ${seat.timeIn || seat.attendanceTime}`}
                  >
                    <LogIn className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    <span>In: {(seat.timeIn || seat.attendanceTime || '').substring(0, 5)}</span>
                  </span>
                  {seat.hasTimedOut ? (
                    <span
                      className="flex items-center gap-0.5 text-blue-900 font-sans font-bold bg-blue-100/90 px-1 py-0.2 rounded border border-blue-300 text-[8.5px] sm:text-[9px]"
                      title={`Time Out: ${seat.timeOut}`}
                    >
                      <LogOut className="w-2.5 h-2.5 text-blue-700 shrink-0" />
                      <span>Out: {(seat.timeOut || '').substring(0, 5)}</span>
                    </span>
                  ) : (
                    <span
                      className="flex items-center gap-0.5 text-amber-900 font-sans font-bold bg-amber-100/95 px-1 py-0.2 rounded border border-amber-300 text-[8px] sm:text-[8.5px] leading-tight"
                      title="Student has not timed out / tapped out today"
                    >
                      <AlertCircle className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                      <span>Didn't Time Out</span>
                    </span>
                  )}
                </div>
              ) : seat.attendanceStatus === 'NO_SCAN' ? (
                <span className="text-[8.5px] sm:text-[9px] text-slate-400 italic">No Scan</span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-center py-0.5">
            {isEditingSeating && draggedItem ? (
              <span className="text-[11px] sm:text-xs text-emerald-700 font-bold flex items-center justify-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> Drop here
              </span>
            ) : (
              <span className="text-[11px] sm:text-xs text-slate-400 font-semibold italic">
                {isEditingSeating ? '+ Click or Drop' : 'Empty Desk'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Edit Mode: Quick Remove */}
      {isEditingSeating && isOccupied && (
        <div
          className="absolute -top-1.5 -right-1.5 flex items-center space-x-1 bg-slate-900 text-white rounded-full p-0.5 shadow-md z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            title="Unassign / Remove student from this seat"
            onClick={() => removeStudentFromSeat(seat.seatNumber)}
            className="w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* Active Select Indicator in Edit Mode */}
      {isSelectedForAction && (
        <div className="absolute inset-0 bg-amber-500/10 rounded-xl border-2 border-amber-500 pointer-events-none flex items-center justify-center">
          <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-2xs">
            Target to Move/Swap
          </span>
        </div>
      )}
    </div>
  );
};
