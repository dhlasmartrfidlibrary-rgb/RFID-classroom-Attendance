import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  GraduationCap,
  Calendar,
  Search,
  Clock,
  LayoutGrid,
  X,
  Sparkles,
  Users,
  Radio,
} from 'lucide-react';

export const ClassSelector: React.FC = () => {
  const {
    availableSections,
    selectedGradeSection,
    selectedSchedule,
    selectGradeSection,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    isEditingSeating,
    setIsEditingSeating,
    highlightedSeatId,
    sectionStudents,
    setIsScannerModalOpen,
  } = useAttendance();

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectGradeSection(e.target.value);
  };

  return (
    <div id="section-selector-card" className="shrink-0 bg-white rounded-xl shadow-2xs border border-slate-200/90 px-3 py-1.5 sm:px-3.5 sm:py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Section Dropdown & Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Section Dropdown */}
          <div className="relative min-w-[180px] sm:min-w-[210px]">
            <select
              id="grade-section-select"
              value={selectedGradeSection || ''}
              onChange={handleSectionChange}
              className="w-full pl-7 pr-6 py-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer appearance-none"
            >
              {availableSections.length === 0 ? (
                <option value="">No sections registered</option>
              ) : (
                availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))
              )}
            </select>
            <GraduationCap className="w-3.5 h-3.5 text-blue-600 absolute left-2 top-1.5 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none">
              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Section Info Pills */}
          {selectedGradeSection && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200/80 text-blue-900 text-[11px] font-semibold">
                <Users className="w-3 h-3 text-blue-600 shrink-0" />
                <span>{sectionStudents.length} Students</span>
              </div>

              {selectedSchedule && (
                <div className="hidden md:flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-mono">
                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>
                    {selectedSchedule.startTime || '07:30'} &ndash; {selectedSchedule.endTime || '16:00'}
                  </span>
                  {selectedSchedule.lateCutoff && (
                    <span className="text-amber-800 font-bold bg-amber-100 px-1 rounded border border-amber-300">
                      Late: {selectedSchedule.lateCutoff}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Date Picker, Search & Edit Seating Toggle */}
        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-slate-700">
            <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              id="attendance-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-[11px] font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              title="Select Attendance Date"
            />
          </div>

          {/* Student Search */}
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <input
              id="student-search-input"
              type="text"
              placeholder="Search Student/Desk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-5 py-0.5 bg-slate-50 border border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:bg-white rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden transition-colors"
            />
            <Search className="w-3 h-3 text-slate-400 absolute left-1.5 top-1.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
            {highlightedSeatId && (
              <span className="absolute -top-5 right-0 text-[10px] bg-blue-600 text-white font-bold px-1.5 rounded shadow-2xs flex items-center gap-1 z-20">
                <Sparkles className="w-2.5 h-2.5 text-amber-300" /> Desk #{highlightedSeatId.replace(/[^\d]/g, '') || highlightedSeatId}
              </span>
            )}
          </div>

          {/* Edit Seating Toggle */}
          <button
            id="btn-toggle-edit-seating"
            onClick={() => setIsEditingSeating(!isEditingSeating)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0 ${
              isEditingSeating
                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>{isEditingSeating ? 'Close Editor' : 'Edit Seating'}</span>
          </button>

          {/* Quick Scan Button */}
          <button
            id="btn-quick-scan-toolbar"
            onClick={() => setIsScannerModalOpen(true)}
            title="Scan student RFID card"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Scan RFID</span>
          </button>
        </div>
      </div>
    </div>
  );
};

