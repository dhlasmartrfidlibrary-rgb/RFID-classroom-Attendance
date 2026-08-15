import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Armchair,
} from 'lucide-react';

export const AttendanceSummary: React.FC = () => {
  const { summaryMetrics } = useAttendance();

  const metrics = [
    {
      id: 'metric-total',
      label: 'TOTAL STUDENTS',
      sublabel: `${summaryMetrics.assignedSeats} seated / ${summaryMetrics.totalStudents}`,
      value: summaryMetrics.totalStudents,
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-300',
      textColor: 'text-slate-900',
      icon: Users,
    },
    {
      id: 'metric-present',
      label: 'PRESENT',
      sublabel: 'On-time RFID Scans',
      value: summaryMetrics.present,
      bgColor: 'bg-emerald-50/90',
      borderColor: 'border-emerald-300',
      textColor: 'text-emerald-900',
      icon: CheckCircle2,
    },
    {
      id: 'metric-late',
      label: 'LATE',
      sublabel: 'Past Late Cutoff',
      value: summaryMetrics.late,
      bgColor: 'bg-amber-50/90',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-900',
      icon: Clock,
    },
    {
      id: 'metric-absent',
      label: 'ABSENT',
      sublabel: 'Verified Absent',
      value: summaryMetrics.absent,
      bgColor: 'bg-rose-50/90',
      borderColor: 'border-rose-300',
      textColor: 'text-rose-900',
      icon: XCircle,
    },
    {
      id: 'metric-no-scan',
      label: 'NO SCAN',
      sublabel: 'Awaiting Badge',
      value: summaryMetrics.noScan,
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
      textColor: 'text-slate-700',
      icon: HelpCircle,
    },
    {
      id: 'metric-timed-out',
      label: 'TIMED OUT',
      sublabel: 'Dismissal / Exit Scans',
      value: summaryMetrics.timedOut ?? 0,
      bgColor: 'bg-blue-50/90',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-900',
      icon: LogOut,
    },
    {
      id: 'metric-didnt-time-out',
      label: "DIDN'T TIME OUT",
      sublabel: 'Arrived but no exit scan',
      value: summaryMetrics.didntTimeOut ?? 0,
      bgColor: 'bg-orange-50/90',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-950',
      icon: Clock,
    },
    {
      id: 'metric-empty',
      label: 'EMPTY SEATS',
      sublabel: 'Unassigned Desks',
      value: summaryMetrics.emptySeats,
      bgColor: 'bg-slate-50',
      borderColor: 'border-dashed border-slate-300',
      textColor: 'text-slate-600',
      icon: Armchair,
    },
  ];

  return (
    <div className="shrink-0 bg-white/90 rounded-xl border border-slate-200/90 px-2.5 py-1 sm:px-3 sm:py-1.5 flex flex-wrap items-center justify-between gap-1.5 shadow-2xs">
      {/* Metric Cards Ribbon */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              id={m.id}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border ${m.borderColor} ${m.bgColor} flex items-center space-x-1.5 transition-all duration-150`}
            >
              <Icon className="w-3 h-3 text-slate-700 opacity-70 shrink-0" />
              <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                {m.label}:
              </span>
              <span className={`text-xs sm:text-sm font-black ${m.textColor}`}>
                {m.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Inline Minimal Legend */}
      <div className="hidden xl:flex items-center gap-2.5 text-[10px] text-slate-600 pl-2 border-l border-slate-200">
        <span className="font-bold text-slate-700 uppercase tracking-wider">Legend:</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-emerald-950">Present</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="font-semibold text-amber-950">Late</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="font-semibold text-rose-950">Absent</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="font-semibold text-orange-950">Early Out</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="font-semibold text-blue-950">Excused</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="font-semibold text-slate-700">No Scan</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300" />
          <span className="font-semibold text-slate-500">Empty</span>
        </span>
      </div>
    </div>
  );
};
