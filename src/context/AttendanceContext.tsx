import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import {
  StudentMaster,
  DailySchedule,
  AttendanceRecord,
  SeatAssignment,
  SeatDisplayInfo,
  AttendanceStatus,
  ActivityLogEntry,
} from '../types';
import {
  fetchStudentMaster,
  fetchDailySchedules,
  fetchAttendanceLogs,
  fetchSeatingPlan,
  saveSeatingPlanForSection,
  logActivity,
  recordAttendance,
  recordTimeOutInLog,
  saveDailySchedule,
} from '../services/sheetsService';
import {
  playPresentChime,
  playLateChime,
  playTimeOutChime,
  playErrorBuzzer,
} from '../utils/audio';

// Date normalization helper for matching Google Sheet timestamps & dates in any locale format
function normalizeDateStr(input?: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Extract date component if includes time
  const datePart = trimmed.split(/[ T]/)[0];

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // M/D/YYYY or MM/DD/YYYY or D/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) {
    const parts = datePart.split('/');
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const year = parts[2];
    if (p1 > 12) {
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
  }
  // D-M-YYYY or DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(datePart)) {
    const parts = datePart.split('-');
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const year = parts[2];
    if (p1 > 12) {
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
  }

  // Fallback try standard Date parsing
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().substring(0, 10);
    }
  } catch {}

  return datePart;
}

function isSameDay(dateA?: string, dateB?: string): boolean {
  if (!dateA || !dateB) return false;
  if (dateA === dateB) return true;
  const normA = normalizeDateStr(dateA);
  const normB = normalizeDateStr(dateB);
  if (normA && normB && normA === normB) return true;
  return dateA.includes(dateB) || dateB.includes(dateA);
}

interface StagedSeatChange {
  action: 'SEAT_ASSIGNED' | 'SEAT_MOVED' | 'SEAT_SWAPPED' | 'SEAT_REMOVED';
  studentId: string;
  studentName: string;
  details: string;
}

interface AttendanceContextType {
  // Data
  students: StudentMaster[];
  dailySchedules: DailySchedule[];
  availableSections: string[];
  selectedGradeSection: string;
  selectedSchedule: DailySchedule | null;
  attendanceLogs: AttendanceRecord[];
  seatingAssignments: SeatAssignment[];
  seatGrid: SeatDisplayInfo[];
  sectionStudents: StudentMaster[];
  unassignedStudents: StudentMaster[];
  
  // Status & Sync
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  autoSync: boolean;
  setAutoSync: (enabled: boolean) => void;
  syncNow: () => Promise<void>;

  // Selection & Filtering
  selectGradeSection: (section: string) => Promise<void>;
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  highlightedSeatId: string | null;

  // Student Profile Modal
  selectedStudentSeat: SeatDisplayInfo | null;
  openStudentProfile: (seat: SeatDisplayInfo) => Promise<void>;
  closeStudentProfile: () => void;

  // Edit Seating Mode
  isEditingSeating: boolean;
  setIsEditingSeating: (editing: boolean) => void;
  draftAssignments: SeatAssignment[];
  selectedSeatForAction: SeatDisplayInfo | null;
  setSelectedSeatForAction: (seat: SeatDisplayInfo | null) => void;
  draggedItem: {
    type: 'UNASSIGNED' | 'SEAT';
    studentId?: string;
    studentName?: string;
    seatNumber?: number;
  } | null;
  setDraggedItem: (
    item: {
      type: 'UNASSIGNED' | 'SEAT';
      studentId?: string;
      studentName?: string;
      seatNumber?: number;
    } | null
  ) => void;
  assignStudentToSeat: (student: StudentMaster, seatNumber: number) => void;
  moveOrSwapSeat: (fromSeatNumber: number, toSeatNumber: number) => void;
  removeStudentFromSeat: (seatNumber: number) => void;
  saveSeatingArrangement: () => Promise<void>;
  discardSeatingChanges: () => void;
  stagedChanges: StagedSeatChange[];
  isSavingSeating: boolean;

  // RFID Scan Simulator & Manual Attendance
  simulateRfidScan: (
    rfidUid: string,
    scanType?: 'AUTO' | 'IN' | 'OUT'
  ) => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
  recordManualAttendance: (
    studentId: string,
    status: AttendanceStatus,
    message?: string
  ) => Promise<{ success: boolean; message: string }>;
  recordTimeOut: (
    studentId: string,
    customTime?: string,
    message?: string
  ) => Promise<{ success: boolean; message: string }>;

  // Scanner UI & Global Wedge state
  isScannerModalOpen: boolean;
  setIsScannerModalOpen: (open: boolean) => void;
  lastScanNotice: {
    studentName: string;
    studentId: string;
    rfidUid: string;
    gradeSection: string;
    status: string;
    message: string;
    timestamp: string;
    isCurrentSection: boolean;
  } | null;
  dismissScanNotice: () => void;

  // Quick schedule update
  updateCurrentSchedule: (startTime: string, lateCutoff: string, endTime: string) => Promise<void>;

  // Summary Metrics for Teacher Dashboard
  summaryMetrics: {
    totalStudents: number;
    present: number;
    late: number;
    absent: number;
    noScan: number;
    earlyOut: number;
    excused: number;
    timedOut: number;
    didntTimeOut: number;
    totalSeats: number;
    assignedSeats: number;
    emptySeats: number;
  };
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

// Generate static 50 seat physical room layout matching classroom diagram:
// LEFT BLOCK (R5 to R1):
// 41 42 43 44 45
// 31 32 33 34 35
// 21 22 23 24 25
// 11 12 13 14 15
//  1  2  3  4  5
// RIGHT BLOCK (R5 to R1):
// 46 47 48 49 50
// 36 37 38 39 40
// 26 27 28 29 30
// 16 17 18 19 20
//  6  7  8  9 10
// Bottom: TEACHER'S TABLE
function createInitial50Seats(): Array<{
  seatId: string;
  seatNumber: number;
  block: 'LEFT' | 'RIGHT';
  row: number;
  column: number;
}> {
  const seats: Array<{
    seatId: string;
    seatNumber: number;
    block: 'LEFT' | 'RIGHT';
    row: number;
    column: number;
  }> = [];

  // Left Block: 5 rows (R5 at top down to R1 at bottom) x 5 cols
  for (let r = 5; r >= 1; r--) {
    for (let c = 1; c <= 5; c++) {
      const seatNumber = (r - 1) * 10 + c;
      seats.push({
        seatId: `L-R${r}-C${c}`,
        seatNumber,
        block: 'LEFT',
        row: r,
        column: c,
      });
    }
  }

  // Right Block: 5 rows (R5 at top down to R1 at bottom) x 5 cols
  for (let r = 5; r >= 1; r--) {
    for (let c = 1; c <= 5; c++) {
      const seatNumber = (r - 1) * 10 + 5 + c;
      seats.push({
        seatId: `R-R${r}-C${c}`,
        seatNumber,
        block: 'RIGHT',
        row: r,
        column: c,
      });
    }
  }

  return seats;
}

const ALL_50_SEATS = createInitial50Seats();

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { accessToken, teacherAccount, authStatus } = useAuth();

  const [students, setStudents] = useState<StudentMaster[]>([]);
  const [dailySchedules, setDailySchedules] = useState<DailySchedule[]>([]);
  const [selectedGradeSection, setSelectedGradeSection] = useState<string>('');
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [seatingAssignments, setSeatingAssignments] = useState<SeatAssignment[]>([]);

  // Draft assignments during seating arrangement edit mode
  const [draftAssignments, setDraftAssignments] = useState<SeatAssignment[]>([]);
  const [isEditingSeating, setIsEditingSeating] = useState<boolean>(false);
  const [selectedSeatForAction, setSelectedSeatForAction] = useState<SeatDisplayInfo | null>(null);
  const [draggedItem, setDraggedItem] = useState<{
    type: 'UNASSIGNED' | 'SEAT';
    studentId?: string;
    studentName?: string;
    seatNumber?: number;
  } | null>(null);
  const [stagedChanges, setStagedChanges] = useState<StagedSeatChange[]>([]);
  const [isSavingSeating, setIsSavingSeating] = useState<boolean>(false);

  // Sync state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Search & Filter
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentSeat, setSelectedStudentSeat] = useState<SeatDisplayInfo | null>(null);

  // Scanner UI & Last Scan Alert State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [lastScanNotice, setLastScanNotice] = useState<{
    studentName: string;
    studentId: string;
    rfidUid: string;
    gradeSection: string;
    status: string;
    message: string;
    timestamp: string;
    isCurrentSection: boolean;
  } | null>(null);

  const dismissScanNotice = useCallback(() => {
    setLastScanNotice(null);
  }, []);

  // Load all master data from Google Sheets
  const loadData = useCallback(
    async (isBackground = false) => {
      if (!accessToken || authStatus !== 'AUTHORIZED') return;

      if (!isBackground) setIsLoading(true);
      setIsSyncing(true);
      setSyncError(null);

      try {
        const [fetchedStudents, fetchedSchedules, fetchedLogs, fetchedSeating] =
          await Promise.all([
            fetchStudentMaster(accessToken),
            fetchDailySchedules(accessToken),
            fetchAttendanceLogs(accessToken),
            fetchSeatingPlan(accessToken),
          ]);

        setStudents(fetchedStudents);
        setDailySchedules(fetchedSchedules);
        setAttendanceLogs(fetchedLogs);
        setSeatingAssignments(fetchedSeating);
        setLastSyncedAt(new Date());

        // Derive distinct grade sections
        const sectionsSet = new Set<string>();
        fetchedSchedules.forEach((s) => {
          if (s.gradeSection) sectionsSet.add(s.gradeSection.trim());
        });
        fetchedStudents.forEach((s) => {
          if (s.gradeSection) sectionsSet.add(s.gradeSection.trim());
        });
        const sectionList = Array.from(sectionsSet).filter(Boolean).sort();

        // Default select section if none is currently selected
        if (!selectedGradeSection && sectionList.length > 0) {
          // If teacher account has assigned section, prioritize it
          if (teacherAccount && teacherAccount.assignedSection && teacherAccount.assignedSection !== 'ALL') {
            const assignedList = teacherAccount.assignedSection
              .split(',')
              .map((s) => s.trim().toLowerCase());
            const matched = sectionList.find((sec) =>
              assignedList.some((a) => sec.toLowerCase().includes(a) || a.includes(sec.toLowerCase()))
            );
            setSelectedGradeSection(matched || sectionList[0]);
          } else {
            setSelectedGradeSection(sectionList[0]);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load Google Sheets data:', err);
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Unable to synchronize with the Google Sheet database.'
        );
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [accessToken, authStatus, selectedGradeSection, teacherAccount]
  );

  // Initial load
  useEffect(() => {
    if (authStatus === 'AUTHORIZED' && accessToken) {
      loadData(false);
    }
  }, [authStatus, accessToken, loadData]);

  // Periodic polling for live RFID scans
  useEffect(() => {
    if (!autoSync || authStatus !== 'AUTHORIZED' || !accessToken || isEditingSeating) {
      return;
    }

    const interval = setInterval(() => {
      loadData(true);
    }, 10000); // 10 seconds poll

    return () => clearInterval(interval);
  }, [autoSync, authStatus, accessToken, isEditingSeating, loadData]);

  // Sync manual trigger
  const syncNow = async () => {
    await loadData(false);
  };

  // Compute all available sections
  const availableSections = useMemo(() => {
    const sectionsSet = new Set<string>();
    dailySchedules.forEach((s) => {
      if (s.gradeSection) sectionsSet.add(s.gradeSection.trim());
    });
    students.forEach((s) => {
      if (s.gradeSection) sectionsSet.add(s.gradeSection.trim());
    });
    let list = Array.from(sectionsSet).filter(Boolean).sort();

    // Teacher role restriction
    if (teacherAccount && teacherAccount.role === 'TEACHER' && teacherAccount.assignedSection && teacherAccount.assignedSection !== 'ALL') {
      const allowed = teacherAccount.assignedSection.split(',').map((s) => s.trim().toLowerCase());
      const filtered = list.filter((sec) =>
        allowed.some((a) => sec.toLowerCase().includes(a) || a.includes(sec.toLowerCase()))
      );
      if (filtered.length > 0) {
        list = filtered;
      }
    }

    return list;
  }, [dailySchedules, students, teacherAccount]);

  // Selected Daily Schedule
  const selectedSchedule = useMemo(() => {
    if (!selectedGradeSection) return null;
    const found = dailySchedules.find(
      (s) => s.gradeSection.toLowerCase() === selectedGradeSection.toLowerCase()
    );
    if (found) return found;

    // Fallback default schedule if not explicitly in DAILY_SCHEDULE tab
    return {
      gradeSection: selectedGradeSection,
      startTime: '07:30',
      lateCutoff: '08:00',
      endTime: '16:00',
      active: true,
    };
  }, [dailySchedules, selectedGradeSection]);

  // All registered active students in this Grade & Section
  const sectionStudents = useMemo(() => {
    if (!selectedGradeSection) return [];
    return students.filter(
      (s) =>
        s.active &&
        s.gradeSection &&
        s.gradeSection.toLowerCase().trim() === selectedGradeSection.toLowerCase().trim()
    );
  }, [students, selectedGradeSection]);

  // Select Grade & Section
  const selectGradeSection = async (section: string) => {
    setSelectedGradeSection(section);
    setSelectedSeatForAction(null);
    if (accessToken && teacherAccount) {
      const logEntry: ActivityLogEntry = {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        teacherId: teacherAccount.teacherId,
        teacherName: teacherAccount.teacherName,
        googleEmail: teacherAccount.googleEmail,
        action: 'SECTION_SELECTED',
        gradeSection: section,
        studentId: '',
        details: `Selected Grade & Section: ${section}`,
      };
      await logActivity(accessToken, logEntry).catch((err) =>
        console.error('Error logging section selection:', err)
      );
    }
  };

  // Sync draft assignments when entering edit mode or changing section
  useEffect(() => {
    const activeAssignments = seatingAssignments.filter(
      (s) => s.gradeSection.toLowerCase() === selectedGradeSection.toLowerCase()
    );
    setDraftAssignments(activeAssignments);
    setStagedChanges([]);
    setSelectedSeatForAction(null);
  }, [selectedGradeSection, seatingAssignments, isEditingSeating]);

  // Current active assignments (either draft if editing, or confirmed from sheet)
  const currentAssignments = useMemo(() => {
    if (isEditingSeating) {
      return draftAssignments;
    }
    return seatingAssignments.filter(
      (s) => s.gradeSection.toLowerCase() === selectedGradeSection.toLowerCase()
    );
  }, [isEditingSeating, draftAssignments, seatingAssignments, selectedGradeSection]);

  // Build 50 Seat Grid with Whole-Day Attendance Status (Time In & Time Out)
  const seatGrid: SeatDisplayInfo[] = useMemo(() => {
    // Multi-key student index
    const studentById = new Map<string, StudentMaster>();
    const studentByRfid = new Map<string, StudentMaster>();
    const studentByName = new Map<string, StudentMaster>();

    students.forEach((s) => {
      if (s.studentId) studentById.set(s.studentId.trim().toLowerCase(), s);
      if (s.rfidUid) {
        const uid = s.rfidUid.trim().toUpperCase();
        studentByRfid.set(uid, s);
        // also store without leading zeros
        const noZeros = uid.replace(/^0+/, '');
        if (noZeros && noZeros !== uid) {
          studentByRfid.set(noZeros, s);
        }
      }
      if (s.studentName) studentByName.set(s.studentName.trim().toLowerCase(), s);
    });

    // Map all daily attendance records for each student on selectedDate
    const studentDailyLogsMap = new Map<string, AttendanceRecord[]>();

    const appendLogToKey = (key: string, log: AttendanceRecord) => {
      if (!key) return;
      const cleanKey = key.trim().toLowerCase();
      const existing = studentDailyLogsMap.get(cleanKey) || [];
      existing.push(log);
      studentDailyLogsMap.set(cleanKey, existing);
    };

    attendanceLogs.forEach((log) => {
      const matchSection =
        !log.gradeSection ||
        !selectedGradeSection ||
        log.gradeSection.toLowerCase().trim() === selectedGradeSection.toLowerCase().trim();

      const matchDate =
        !selectedDate ||
        isSameDay(log.date, selectedDate) ||
        isSameDay(log.timestamp, selectedDate);

      if (matchDate) {
        // Resolve student from log data
        const cleanId = log.studentId?.trim().toLowerCase();
        const cleanRfid = log.rfidUid?.trim().toUpperCase();
        const cleanName = log.studentName?.trim().toLowerCase();

        const resolvedStudent =
          (cleanId ? studentById.get(cleanId) : undefined) ||
          (cleanRfid ? studentByRfid.get(cleanRfid) : undefined) ||
          (cleanName ? studentByName.get(cleanName) : undefined);

        if (resolvedStudent) {
          appendLogToKey(resolvedStudent.studentId, log);
          if (resolvedStudent.rfidUid) appendLogToKey(resolvedStudent.rfidUid, log);
        }
        if (cleanId) appendLogToKey(cleanId, log);
        if (cleanRfid) appendLogToKey(cleanRfid, log);
      }
    });

    const assignmentMap = new Map<number, SeatAssignment>(
      currentAssignments.map((a) => [a.seatNumber, a])
    );

    return ALL_50_SEATS.map((seat) => {
      const assignment = assignmentMap.get(seat.seatNumber);
      const studentId = assignment?.studentId?.trim();
      const student = studentId ? studentById.get(studentId.toLowerCase()) : undefined;

      if (!assignment || !studentId) {
        return {
          ...seat,
          attendanceStatus: 'EMPTY' as AttendanceStatus,
          hasTimedIn: false,
          hasTimedOut: false,
        };
      }

      // Check daily attendance for this student across keys
      const rawLogs: AttendanceRecord[] = [
        ...(studentDailyLogsMap.get(studentId.toLowerCase()) || []),
        ...(student?.rfidUid ? studentDailyLogsMap.get(student.rfidUid.toLowerCase()) || [] : []),
      ];

      // Remove duplicate logs
      const uniqueLogsMap = new Map<string, AttendanceRecord>();
      rawLogs.forEach((l) => {
        const key = `${l.timestamp}-${l.time}-${l.status}-${l.type}`;
        if (!uniqueLogsMap.has(key)) {
          uniqueLogsMap.set(key, l);
        }
      });

      const logs = Array.from(uniqueLogsMap.values()).sort((a, b) =>
        (a.timestamp || '').localeCompare(b.timestamp || '')
      );

      let attendanceStatus: AttendanceStatus = 'NO_SCAN';
      let timeIn: string | undefined = undefined;
      let timeOut: string | undefined = undefined;
      let hasTimedIn = false;
      let hasTimedOut = false;
      let primaryRecord: AttendanceRecord | undefined = undefined;
      let timeOutRecord: AttendanceRecord | undefined = undefined;

      if (logs.length > 0) {
        // 1. Direct Time Out column value from Google Sheets
        const logWithDirectTimeOut = logs.find(
          (l) => Boolean(l.timeOut && l.timeOut.trim().length > 0)
        );
        if (logWithDirectTimeOut && logWithDirectTimeOut.timeOut) {
          timeOut = logWithDirectTimeOut.timeOut.trim();
          hasTimedOut = true;
          timeOutRecord = logWithDirectTimeOut;
        }

        // 2. Identify Time In log (arrival / first scan / on-time / present)
        const inLog =
          logs.find((l) => {
            const msg = (l.message || '').toLowerCase();
            const st = (l.status || '').toUpperCase();
            const type = (l.type || '').toUpperCase();
            return (
              type === 'IN' ||
              msg.includes('arrival') ||
              msg.includes('time in') ||
              msg.includes('on-time') ||
              st === 'PRESENT' ||
              st === 'LATE'
            );
          }) || logs[0];

        if (inLog) {
          primaryRecord = inLog;
          const rawStatus = (inLog.status || '').toUpperCase();
          timeIn = inLog.timeIn || inLog.time || inLog.timestamp.split(' ')[1] || '';
          hasTimedIn = true;

          if (rawStatus.includes('PRESENT')) {
            attendanceStatus = 'PRESENT';
          } else if (rawStatus.includes('LATE')) {
            attendanceStatus = 'LATE';
          } else if (rawStatus.includes('ABSENT')) {
            attendanceStatus = 'ABSENT';
            hasTimedIn = false;
          } else if (rawStatus.includes('EARLY')) {
            attendanceStatus = 'EARLY_OUT';
          } else if (rawStatus.includes('EXCUSED')) {
            attendanceStatus = 'EXCUSED';
          } else {
            attendanceStatus = 'PRESENT';
          }
        }

        // 3. If Time Out was not directly in a column, check for separate Time Out record
        if (!hasTimedOut) {
          const outLog =
            logs.find((l) => {
              const msg = (l.message || '').toLowerCase();
              const st = (l.status || '').toUpperCase();
              const type = (l.type || '').toUpperCase();
              return (
                type === 'OUT' ||
                msg.includes('time out') ||
                msg.includes('dismissal') ||
                msg.includes('exit') ||
                msg.includes('departure') ||
                st === 'EARLY_OUT'
              );
            }) || (logs.length >= 2 ? logs[logs.length - 1] : undefined);

          if (outLog && outLog !== inLog) {
            timeOut = outLog.timeOut || outLog.time || outLog.timestamp.split(' ')[1] || '';
            hasTimedOut = true;
            timeOutRecord = outLog;
          } else if (outLog && logs.length === 1) {
            const msg = (outLog.message || '').toLowerCase();
            const st = (outLog.status || '').toUpperCase();
            const type = (outLog.type || '').toUpperCase();
            if (
              type === 'OUT' ||
              msg.includes('time out') ||
              msg.includes('dismissal') ||
              msg.includes('exit') ||
              st === 'EARLY_OUT'
            ) {
              timeOut = outLog.timeOut || outLog.time || outLog.timestamp.split(' ')[1] || '';
              hasTimedOut = true;
              timeOutRecord = outLog;
              if (st === 'EARLY_OUT') attendanceStatus = 'EARLY_OUT';
            }
          }
        }
      }

      return {
        ...seat,
        student,
        assignment,
        attendanceStatus,
        attendanceTime: timeIn,
        timeIn,
        timeOut,
        hasTimedIn,
        hasTimedOut,
        rawAttendanceRecord: primaryRecord,
        rawTimeOutRecord: timeOutRecord,
        dayLogs: logs,
      };
    });
  }, [
    selectedGradeSection,
    students,
    attendanceLogs,
    selectedDate,
    currentAssignments,
  ]);

  // Unassigned active students for the selected Grade & Section (not yet given a seat in the 50-desk grid)
  const unassignedStudents = useMemo(() => {
    const assignedStudentIds = new Set(
      currentAssignments
        .map((a) => a.studentId?.toLowerCase())
        .filter(Boolean)
    );

    return sectionStudents.filter(
      (s) => !assignedStudentIds.has(s.studentId.toLowerCase())
    );
  }, [sectionStudents, currentAssignments]);

  // Highlighted seat from search
  const highlightedSeatId = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim().toLowerCase();

    const matchedSeat = seatGrid.find((seat) => {
      if (!seat.student) return false;
      const matchName = seat.student.studentName.toLowerCase().includes(query);
      const matchId = seat.student.studentId.toLowerCase().includes(query);
      const matchRfid = seat.student.rfidUid.toLowerCase().includes(query);
      return matchName || matchId || matchRfid;
    });

    return matchedSeat ? matchedSeat.seatId : null;
  }, [searchQuery, seatGrid]);

  // Student Profile Click Handler
  const openStudentProfile = async (seat: SeatDisplayInfo) => {
    if (!seat.student || isEditingSeating) return;

    setSelectedStudentSeat(seat);

    // Audit log: STUDENT_PROFILE_VIEWED
    if (accessToken && teacherAccount) {
      await logActivity(accessToken, {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        teacherId: teacherAccount.teacherId,
        teacherName: teacherAccount.teacherName,
        googleEmail: teacherAccount.googleEmail,
        action: 'STUDENT_PROFILE_VIEWED',
        gradeSection: selectedGradeSection,
        studentId: seat.student.studentId,
        details: `Viewed profile for student ${seat.student.studentName} (Seat #${seat.seatNumber}) in ${selectedGradeSection}`,
      }).catch((e) => console.error('Failed to log student profile view:', e));
    }
  };

  const closeStudentProfile = () => {
    setSelectedStudentSeat(null);
  };

  // Seating Arrangement Edit Handlers
  const assignStudentToSeat = (student: StudentMaster, seatNumber: number) => {
    const seatTemplate = ALL_50_SEATS.find((s) => s.seatNumber === seatNumber);
    if (!seatTemplate) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Remove any existing assignment for this student or this seat in the current section
    const updated = draftAssignments.filter(
      (a) =>
        a.seatNumber !== seatNumber &&
        a.studentId.toLowerCase() !== student.studentId.toLowerCase()
    );

    const newAssignment: SeatAssignment = {
      seatId: seatTemplate.seatId,
      seatNumber: seatNumber,
      block: seatTemplate.block,
      row: seatTemplate.row,
      column: seatTemplate.column,
      studentId: student.studentId,
      gradeSection: selectedGradeSection,
      updatedAt: nowStr,
      updatedBy: teacherAccount?.googleEmail || '',
    };

    setDraftAssignments([...updated, newAssignment]);
    setStagedChanges((prev) => [
      ...prev,
      {
        action: 'SEAT_ASSIGNED',
        studentId: student.studentId,
        studentName: student.studentName,
        details: `Assigned ${student.studentName} (${student.studentId}) to Seat ${seatNumber} (${seatTemplate.seatId})`,
      },
    ]);
  };

  const moveOrSwapSeat = (fromSeatNumber: number, toSeatNumber: number) => {
    if (fromSeatNumber === toSeatNumber) return;

    const fromTemplate = ALL_50_SEATS.find((s) => s.seatNumber === fromSeatNumber);
    const toTemplate = ALL_50_SEATS.find((s) => s.seatNumber === toSeatNumber);
    if (!fromTemplate || !toTemplate) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const fromAssignment = draftAssignments.find((a) => a.seatNumber === fromSeatNumber);
    const toAssignment = draftAssignments.find((a) => a.seatNumber === toSeatNumber);

    if (!fromAssignment) return; // Nothing to move

    const updated = draftAssignments.filter(
      (a) => a.seatNumber !== fromSeatNumber && a.seatNumber !== toSeatNumber
    );

    if (toAssignment) {
      // SWAP
      const swappedA: SeatAssignment = {
        ...fromAssignment,
        seatId: toTemplate.seatId,
        seatNumber: toTemplate.seatNumber,
        block: toTemplate.block,
        row: toTemplate.row,
        column: toTemplate.column,
        updatedAt: nowStr,
        updatedBy: teacherAccount?.googleEmail || '',
      };
      const swappedB: SeatAssignment = {
        ...toAssignment,
        seatId: fromTemplate.seatId,
        seatNumber: fromTemplate.seatNumber,
        block: fromTemplate.block,
        row: fromTemplate.row,
        column: fromTemplate.column,
        updatedAt: nowStr,
        updatedBy: teacherAccount?.googleEmail || '',
      };
      setDraftAssignments([...updated, swappedA, swappedB]);

      setStagedChanges((prev) => [
        ...prev,
        {
          action: 'SEAT_SWAPPED',
          studentId: `${fromAssignment.studentId} & ${toAssignment.studentId}`,
          studentName: 'Swapped seats',
          details: `Swapped student (${fromAssignment.studentId}) at Seat ${fromSeatNumber} with student (${toAssignment.studentId}) at Seat ${toSeatNumber}`,
        },
      ]);
    } else {
      // MOVE
      const moved: SeatAssignment = {
        ...fromAssignment,
        seatId: toTemplate.seatId,
        seatNumber: toTemplate.seatNumber,
        block: toTemplate.block,
        row: toTemplate.row,
        column: toTemplate.column,
        updatedAt: nowStr,
        updatedBy: teacherAccount?.googleEmail || '',
      };
      setDraftAssignments([...updated, moved]);

      setStagedChanges((prev) => [
        ...prev,
        {
          action: 'SEAT_MOVED',
          studentId: fromAssignment.studentId,
          studentName: 'Moved student',
          details: `Moved student (${fromAssignment.studentId}) from Seat ${fromSeatNumber} to Seat ${toSeatNumber}`,
        },
      ]);
    }
  };

  const removeStudentFromSeat = (seatNumber: number) => {
    const assignment = draftAssignments.find((a) => a.seatNumber === seatNumber);
    if (!assignment) return;

    setDraftAssignments(draftAssignments.filter((a) => a.seatNumber !== seatNumber));
    setStagedChanges((prev) => [
      ...prev,
      {
        action: 'SEAT_REMOVED',
        studentId: assignment.studentId,
        studentName: 'Unassigned student',
        details: `Removed student (${assignment.studentId}) from Seat ${seatNumber}`,
      },
    ]);
  };

  const discardSeatingChanges = () => {
    const activeAssignments = seatingAssignments.filter(
      (s) => s.gradeSection.toLowerCase() === selectedGradeSection.toLowerCase()
    );
    setDraftAssignments(activeAssignments);
    setStagedChanges([]);
    setSelectedSeatForAction(null);
    setIsEditingSeating(false);
  };

  const saveSeatingArrangement = async () => {
    if (!accessToken || !teacherAccount || !selectedGradeSection) return;

    setIsSavingSeating(true);
    try {
      // 1. Write updated seating assignments to Google Sheets SEATING_PLAN
      await saveSeatingPlanForSection(
        accessToken,
        selectedGradeSection,
        draftAssignments,
        teacherAccount.googleEmail
      );

      // 2. Log individual audit changes in ACTIVITY_LOG
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      for (const change of stagedChanges) {
        await logActivity(accessToken, {
          timestamp: nowStr,
          teacherId: teacherAccount.teacherId,
          teacherName: teacherAccount.teacherName,
          googleEmail: teacherAccount.googleEmail,
          action: change.action,
          gradeSection: selectedGradeSection,
          studentId: change.studentId,
          details: change.details,
        });
      }

      // 3. Log overall SEATING_SAVED
      await logActivity(accessToken, {
        timestamp: nowStr,
        teacherId: teacherAccount.teacherId,
        teacherName: teacherAccount.teacherName,
        googleEmail: teacherAccount.googleEmail,
        action: 'SEATING_SAVED',
        gradeSection: selectedGradeSection,
        studentId: '',
        details: `Saved ${draftAssignments.length} seat assignments for ${selectedGradeSection} with ${stagedChanges.length} changes`,
      });

      // 4. Update local state
      const otherSectionAssignments = seatingAssignments.filter(
        (a) => a.gradeSection.toLowerCase() !== selectedGradeSection.toLowerCase()
      );
      setSeatingAssignments([...otherSectionAssignments, ...draftAssignments]);
      setStagedChanges([]);
      setIsEditingSeating(false);
      setSelectedSeatForAction(null);
      setLastSyncedAt(new Date());
    } catch (err: unknown) {
      console.error('Failed to save seating arrangement:', err);
      throw err;
    } finally {
      setIsSavingSeating(false);
    }
  };

  // Simulate RFID scan flow:
  // "RFID scan -> STUDENT_MASTER -> get GRADE_SECTION -> DAILY_SCHEDULE -> Present/Late -> ATTENDANCE_LOG"
  // Handles Time In (Arrival) and Time Out (Departure / Dismissal)
  const simulateRfidScan = useCallback(
    async (
      rfidUid: string,
      scanType: 'AUTO' | 'IN' | 'OUT' = 'AUTO'
    ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> => {
      const cleanUid = (rfidUid || '').trim().toUpperCase();
      if (!cleanUid) {
        return { success: false, message: 'RFID UID cannot be empty.' };
      }

      // Multi-key student lookup
      const student =
        students.find((s) => s.rfidUid && s.rfidUid.trim().toUpperCase() === cleanUid) ||
        students.find((s) => s.studentId && s.studentId.trim().toLowerCase() === cleanUid.toLowerCase()) ||
        students.find((s) => {
          if (!s.rfidUid) return false;
          const sClean = s.rfidUid.trim().replace(/^0+/, '').toUpperCase();
          const qClean = cleanUid.replace(/^0+/, '');
          return sClean === qClean;
        }) ||
        students.find((s) => s.studentName && s.studentName.trim().toLowerCase() === cleanUid.toLowerCase());

      if (!student) {
        playErrorBuzzer();
        setLastScanNotice({
          studentName: 'Unknown RFID Tag',
          studentId: cleanUid,
          rfidUid: cleanUid,
          gradeSection: 'Unregistered',
          status: 'ERROR',
          message: `RFID UID "${cleanUid}" is not registered in STUDENT_MASTER.`,
          timestamp: new Date().toLocaleTimeString(),
          isCurrentSection: false,
        });
        return {
          success: false,
          message: `RFID UID "${cleanUid}" is not registered in STUDENT_MASTER.`,
        };
      }

      const now = new Date();
      const dateStr = selectedDate || now.toISOString().substring(0, 10);
      const timeStr = now.toTimeString().substring(0, 8); // HH:MM:SS
      const nowStr = `${dateStr} ${timeStr}`;

      // Check existing daily logs for this student on dateStr
      const todayLogs = attendanceLogs.filter(
        (l) =>
          (l.studentId && l.studentId.toLowerCase() === student.studentId.toLowerCase()) ||
          (l.rfidUid && l.rfidUid.toUpperCase() === student.rfidUid.toUpperCase())
      ).filter((l) => isSameDay(l.date, dateStr) || isSameDay(l.timestamp, dateStr));

      // Determine if this scan is a Time In or Time Out
      const studentSection = student.gradeSection || selectedGradeSection;
      const schedule =
        dailySchedules.find(
          (ds) => ds.gradeSection.toLowerCase().trim() === studentSection.toLowerCase().trim()
        ) || selectedSchedule;

      let isOut = false;
      if (scanType === 'OUT') {
        isOut = true;
      } else if (scanType === 'IN') {
        isOut = false;
      } else {
        // AUTO mode: if student already has a log today, subsequent tap is Time Out
        isOut = todayLogs.length > 0;
      }

      const isCurrentSection =
        Boolean(studentSection) &&
        Boolean(selectedGradeSection) &&
        studentSection.toLowerCase().trim() === selectedGradeSection.toLowerCase().trim();

      if (isOut) {
        // Record TIME OUT (Departure / Dismissal)
        const endTime = schedule?.endTime || '16:00';
        const scanTimeFormatted = timeStr.substring(0, 5);
        const isEarly = scanTimeFormatted < endTime;

        const status: AttendanceStatus = isEarly ? 'EARLY_OUT' : 'PRESENT';
        const statusMessage = isEarly
          ? `Early Time Out recorded at ${timeStr} (Regular dismissal is ${endTime}).`
          : `Dismissal Time Out recorded at ${timeStr}.`;

        const newRecord: AttendanceRecord = {
          timestamp: nowStr,
          date: dateStr,
          time: timeStr,
          timeOut: timeStr,
          rfidUid: student.rfidUid || cleanUid,
          studentId: student.studentId,
          studentName: student.studentName,
          gradeSection: studentSection,
          deviceId: 'RFID-MAIN-PORTAL',
          status: status,
          message: statusMessage,
          type: 'OUT',
        };

        // Optimistic UI Update immediately
        setAttendanceLogs((prev) => [newRecord, ...prev]);
        playTimeOutChime();

        setLastScanNotice({
          studentName: student.studentName,
          studentId: student.studentId,
          rfidUid: student.rfidUid || cleanUid,
          gradeSection: studentSection,
          status: isEarly ? 'EARLY_OUT' : 'TIMED_OUT',
          message: `Time Out: ${student.studentName} tapped OUT at ${timeStr} (${statusMessage})`,
          timestamp: timeStr,
          isCurrentSection,
        });

        // Write to Google Sheets in background
        if (accessToken) {
          try {
            await recordTimeOutInLog(accessToken, newRecord);
          } catch (err: unknown) {
            console.error('Failed to sync Time Out to Google Sheets:', err);
          }
        }

        return {
          success: true,
          message: `Time Out: ${student.studentName} tapped OUT at ${timeStr} (${statusMessage})`,
          record: newRecord,
        };
      } else {
        // Record TIME IN (Arrival)
        const lateCutoff = schedule?.lateCutoff || '08:00';
        const scanTimeFormatted = timeStr.substring(0, 5);
        let status: AttendanceStatus = 'PRESENT';
        let statusMessage = `On-time arrival (Time In) at ${timeStr}.`;

        if (scanTimeFormatted > lateCutoff) {
          status = 'LATE';
          statusMessage = `Late arrival (Time In) at ${timeStr} (Cutoff was ${lateCutoff}).`;
          playLateChime();
        } else {
          playPresentChime();
        }

        const newRecord: AttendanceRecord = {
          timestamp: nowStr,
          date: dateStr,
          time: timeStr,
          timeIn: timeStr,
          rfidUid: student.rfidUid || cleanUid,
          studentId: student.studentId,
          studentName: student.studentName,
          gradeSection: studentSection,
          deviceId: 'RFID-MAIN-PORTAL',
          status: status,
          message: statusMessage,
          type: 'IN',
        };

        // Optimistic UI Update immediately
        setAttendanceLogs((prev) => [newRecord, ...prev]);

        setLastScanNotice({
          studentName: student.studentName,
          studentId: student.studentId,
          rfidUid: student.rfidUid || cleanUid,
          gradeSection: studentSection,
          status: status,
          message: `Time In: ${student.studentName} marked ${status} at ${timeStr}`,
          timestamp: timeStr,
          isCurrentSection,
        });

        // Write to Google Sheets in background
        if (accessToken) {
          try {
            await recordAttendance(accessToken, newRecord);
          } catch (err: unknown) {
            console.error('Failed to sync Time In to Google Sheets:', err);
          }
        }

        return {
          success: true,
          message: `Time In: ${student.studentName} marked ${status} at ${timeStr}`,
          record: newRecord,
        };
      }
    },
    [
      students,
      attendanceLogs,
      dailySchedules,
      selectedGradeSection,
      selectedSchedule,
      selectedDate,
      accessToken,
    ]
  );

  // Global USB RFID hardware keyboard wedge listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const currentTime = Date.now();
      // Hardware barcode / RFID scanners type characters extremely fast (< 100ms per char)
      if (currentTime - lastKeyTime > 300) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          const scanned = buffer.trim();
          buffer = '';
          simulateRfidScan(scanned, 'AUTO');
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulateRfidScan]);

  // Record Time Out for a student manually or via quick action
  const recordTimeOut = async (
    studentId: string,
    customTime?: string,
    message?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!accessToken) {
      return { success: false, message: 'Google Sheets access token missing.' };
    }

    const student = students.find((s) => s.studentId === studentId);
    if (!student) {
      return { success: false, message: 'Student not found.' };
    }

    const now = new Date();
    const dateStr = selectedDate || now.toISOString().substring(0, 10);
    const timeStr = customTime || now.toTimeString().substring(0, 8);
    const nowStr = `${dateStr} ${timeStr}`;

    const studentSection = student.gradeSection || selectedGradeSection;
    const schedule =
      dailySchedules.find(
        (ds) => ds.gradeSection.toLowerCase() === studentSection.toLowerCase()
      ) || selectedSchedule;

    const endTime = schedule?.endTime || '16:00';
    const scanTimeFormatted = timeStr.substring(0, 5);
    const isEarly = scanTimeFormatted < endTime;

    const status: AttendanceStatus = isEarly ? 'EARLY_OUT' : 'PRESENT';
    const outMessage =
      message ||
      (isEarly
        ? `Manual Early Time Out logged at ${timeStr} by instructor`
        : `Manual Time Out recorded at ${timeStr} by instructor`);

    const newRecord: AttendanceRecord = {
      timestamp: nowStr,
      date: dateStr,
      time: timeStr,
      timeOut: timeStr,
      rfidUid: student.rfidUid || 'MANUAL',
      studentId: studentId,
      studentName: student.studentName,
      gradeSection: studentSection,
      deviceId: 'TEACHER-DASHBOARD',
      status: status,
      message: outMessage,
      type: 'OUT',
    };

    try {
      await recordTimeOutInLog(accessToken, newRecord);
      setAttendanceLogs((prev) => [newRecord, ...prev]);

      if (teacherAccount) {
        await logActivity(accessToken, {
          timestamp: nowStr,
          teacherId: teacherAccount.teacherId,
          teacherName: teacherAccount.teacherName,
          googleEmail: teacherAccount.googleEmail,
          action: 'MANUAL_TIMEOUT_LOGGED',
          gradeSection: selectedGradeSection,
          studentId: studentId,
          details: `Time Out recorded at ${timeStr} for student ${student.studentName}`,
        }).catch((e) => console.error('Failed to log manual time out:', e));
      }

      return { success: true, message: `Time Out logged at ${timeStr}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error writing to Google Sheets';
      return { success: false, message: msg };
    }
  };

  // Manual Attendance recording by teacher
  const recordManualAttendance = async (
    studentId: string,
    status: AttendanceStatus,
    message?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!accessToken) {
      return { success: false, message: 'Google Sheets access token missing.' };
    }

    const student = students.find((s) => s.studentId === studentId);
    if (!student) {
      return { success: false, message: 'Student not found.' };
    }

    const now = new Date();
    const dateStr = selectedDate || now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 8);
    const nowStr = `${dateStr} ${timeStr}`;

    // Duplicate Check: Check if record exists for this student on selected date
    const existingIndex = attendanceLogs.findIndex(
      (l) =>
        l.studentId.toLowerCase() === studentId.toLowerCase() &&
        (l.date === dateStr || l.timestamp.startsWith(dateStr))
    );

    const newRecord: AttendanceRecord = {
      timestamp: nowStr,
      date: dateStr,
      time: timeStr,
      rfidUid: student.rfidUid || 'MANUAL',
      studentId: studentId,
      studentName: student.studentName,
      gradeSection: student.gradeSection || selectedGradeSection,
      deviceId: 'TEACHER-DASHBOARD',
      status: status,
      message: message || `Manual whole-day status updated to ${status} by instructor`,
    };

    try {
      await recordAttendance(accessToken, newRecord);

      // Update state (replacing existing day record if present to enforce one-record-per-day rule in local cache)
      if (existingIndex >= 0) {
        const updated = [...attendanceLogs];
        updated[existingIndex] = newRecord;
        setAttendanceLogs(updated);
      } else {
        setAttendanceLogs((prev) => [newRecord, ...prev]);
      }

      // Log teacher activity
      if (teacherAccount) {
        await logActivity(accessToken, {
          timestamp: nowStr,
          teacherId: teacherAccount.teacherId,
          teacherName: teacherAccount.teacherName,
          googleEmail: teacherAccount.googleEmail,
          action: 'MANUAL_ATTENDANCE_LOGGED',
          gradeSection: selectedGradeSection,
          studentId: studentId,
          details: `Manual status set to ${status} for student ${student.studentName}`,
        }).catch((e) => console.error('Failed to log manual attendance action:', e));
      }

      return { success: true, message: `Status updated to ${status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error writing to Google Sheets';
      return { success: false, message: msg };
    }
  };

  // Update schedule for current section in Google Sheets
  const updateCurrentSchedule = async (
    startTime: string,
    lateCutoff: string,
    endTime: string
  ) => {
    if (!accessToken || !selectedGradeSection) return;

    const newSchedule: DailySchedule = {
      gradeSection: selectedGradeSection,
      startTime,
      lateCutoff,
      endTime,
      active: true,
    };

    await saveDailySchedule(accessToken, newSchedule);

    // Update local state
    setDailySchedules((prev) => {
      const idx = prev.findIndex(
        (s) => s.gradeSection.toLowerCase() === selectedGradeSection.toLowerCase()
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSchedule;
        return copy;
      }
      return [...prev, newSchedule];
    });
  };

  // Summary Metrics Calculation for Teacher Dashboard:
  // "Show Total Students, Present, Late, Absent, No Scan, Timed Out, Didn't Time Out"
  const summaryMetrics = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let earlyOut = 0;
    let excused = 0;
    let noScan = 0;
    let assignedSeats = 0;
    let timedOut = 0;
    let didntTimeOut = 0;

    seatGrid.forEach((seat) => {
      if (seat.student) {
        assignedSeats++;
        switch (seat.attendanceStatus) {
          case 'PRESENT':
            present++;
            break;
          case 'LATE':
            late++;
            break;
          case 'ABSENT':
            absent++;
            break;
          case 'EARLY_OUT':
            earlyOut++;
            break;
          case 'EXCUSED':
            excused++;
            break;
          case 'NO_SCAN':
          default:
            noScan++;
            break;
        }

        if (seat.hasTimedOut) {
          timedOut++;
        } else if (seat.hasTimedIn) {
          didntTimeOut++;
        }
      }
    });

    const totalSectionStudentsCount = sectionStudents.length;

    return {
      totalStudents: totalSectionStudentsCount,
      present,
      late,
      absent,
      noScan,
      earlyOut,
      excused,
      timedOut,
      didntTimeOut,
      totalSeats: 50,
      assignedSeats,
      emptySeats: 50 - assignedSeats,
    };
  }, [seatGrid, sectionStudents]);

  return (
    <AttendanceContext.Provider
      value={{
        students,
        dailySchedules,
        availableSections,
        selectedGradeSection,
        selectedSchedule,
        attendanceLogs,
        seatingAssignments,
        seatGrid,
        sectionStudents,
        unassignedStudents,
        isLoading,
        isSyncing,
        lastSyncedAt,
        syncError,
        autoSync,
        setAutoSync,
        syncNow,
        selectGradeSection,
        selectedDate,
        setSelectedDate,
        searchQuery,
        setSearchQuery,
        highlightedSeatId,
        selectedStudentSeat,
        openStudentProfile,
        closeStudentProfile,
        isEditingSeating,
        setIsEditingSeating,
        draftAssignments,
        selectedSeatForAction,
        setSelectedSeatForAction,
        draggedItem,
        setDraggedItem,
        assignStudentToSeat,
        moveOrSwapSeat,
        removeStudentFromSeat,
        saveSeatingArrangement,
        discardSeatingChanges,
        stagedChanges,
        isSavingSeating,
        simulateRfidScan,
        recordManualAttendance,
        recordTimeOut,
        isScannerModalOpen,
        setIsScannerModalOpen,
        lastScanNotice,
        dismissScanNotice,
        updateCurrentSchedule,
        summaryMetrics,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

export const useAttendanceOptional = () => {
  return useContext(AttendanceContext);
};

