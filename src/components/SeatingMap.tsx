import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { SeatCard } from './SeatCard';
import { Footprints } from 'lucide-react';

export const SeatingMap: React.FC = () => {
  const { seatGrid } = useAttendance();

  // Split the 50 seats into Left Block (Seats 41-45, 31-35, 21-25, 11-15, 1-5)
  // and Right Block (Seats 46-50, 36-40, 26-30, 16-20, 6-10)
  const leftBlockSeats = seatGrid.filter((s) => s.block === 'LEFT');
  const rightBlockSeats = seatGrid.filter((s) => s.block === 'RIGHT');

  return (
    <div className="flex-1 min-h-0 bg-slate-100/90 border border-slate-300 rounded-xl p-1.5 sm:p-2 lg:p-2.5 flex flex-col justify-between overflow-hidden shadow-2xs relative">
      {/* THE 50-SEAT DUAL-BLOCK SEATING PLAN (EXPANSIVE & FITS AVAILABLE HEIGHT) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_36px_1fr] xl:grid-cols-[1fr_48px_1fr] gap-1.5 sm:gap-2 lg:gap-2.5 items-stretch overflow-hidden mb-1.5">
        {/* LEFT BLOCK (5 cols x 5 rows = 25 seats: 41-45, 31-35, 21-25, 11-15, 1-5) */}
        <div className="flex-1 min-h-0 bg-white/95 p-1.5 sm:p-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-2xs" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest">
                LEFT BLOCK
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-bold">5 Rows &times; 5 Columns</span>
          </div>

          {/* 5x5 Grid for Left Block (Responsive row heights) */}
          <div className="grid grid-cols-5 grid-rows-5 gap-1 sm:gap-1.5 flex-1 min-h-0">
            {leftBlockSeats.map((seat) => (
              <SeatCard key={seat.seatId} seat={seat} />
            ))}
          </div>
        </div>

        {/* CENTER AISLE */}
        <div className="hidden lg:flex flex-col items-center justify-center h-full py-2 text-slate-400 select-none shrink-0">
          <div className="w-px h-8 bg-slate-300" />
          <div className="my-2 py-1 px-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center [writing-mode:vertical-lr] rotate-180 flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 rotate-90 text-slate-400" />
            <span>Center Aisle</span>
          </div>
          <div className="w-px flex-1 bg-slate-300" />
        </div>

        {/* RIGHT BLOCK (5 cols x 5 rows = 25 seats: 46-50, 36-40, 26-30, 16-20, 6-10) */}
        <div className="flex-1 min-h-0 bg-white/95 p-1.5 sm:p-2 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-2xs" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest">
                RIGHT BLOCK
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-bold">5 Rows &times; 5 Columns</span>
          </div>

          {/* 5x5 Grid for Right Block (Responsive row heights) */}
          <div className="grid grid-cols-5 grid-rows-5 gap-1 sm:gap-1.5 flex-1 min-h-0">
            {rightBlockSeats.map((seat) => (
              <SeatCard key={seat.seatId} seat={seat} />
            ))}
          </div>
        </div>
      </div>

      {/* TEACHER’S TABLE (Prominent, Centered below the seating blocks) */}
      <div className="pt-0.5 shrink-0 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg bg-slate-900 text-white rounded-lg py-1 sm:py-1.5 px-6 shadow-xs border border-slate-700 flex items-center justify-center text-center">
          <h4 className="text-xs sm:text-sm font-black tracking-widest uppercase text-white">
            TEACHER’S TABLE
          </h4>
        </div>
      </div>
    </div>
  );
};
