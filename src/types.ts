export interface StudentMaster {
  rfidUid: string;
  studentId: string;
  studentName: string;
  gradeSection: string;
  parentName: string;
  parentEmail: string;
  parentContact: string;
  active: boolean;
}

export interface DailySchedule {
  gradeSection: string;
  startTime: string;
  lateCutoff: string;
  endTime: string;
  active: boolean;
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'EARLY_OUT'
  | 'EXCUSED'
  | 'NO_SCAN'
  | 'EMPTY';

export interface AttendanceRecord {
  timestamp: string;
  date: string;
  time: string;
  timeIn?: string;
  timeOut?: string;
  rfidUid: string;
  studentId: string;
  studentName: string;
  gradeSection: string;
  deviceId: string;
  status: AttendanceStatus | string;
  message: string;
  type?: string;
}

export interface NotificationRecord {
  timestamp: string;
  studentId: string;
  parentEmail: string;
  status: string;
  message: string;
  type?: string;
}

export type TeacherRole = 'ADMIN' | 'TEACHER';

export interface TeacherAccount {
  teacherId: string;
  teacherName: string;
  googleEmail: string;
  role: TeacherRole;
  assignedSection: string; // e.g. "Grade 10 - Rizal", "Grade 7 - Einstein", or "ALL"
  active: boolean;
  lastLogin: string;
}

export interface SeatAssignment {
  seatId: string; // e.g. "L-R1-C1", "R-R2-C3"
  seatNumber: number; // 1 to 50
  block: 'LEFT' | 'RIGHT';
  row: number; // 1 to 5
  column: number; // 1 to 5
  studentId: string;
  gradeSection: string;
  updatedAt: string;
  updatedBy: string;
}

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SECTION_SELECTED'
  | 'SEAT_ASSIGNED'
  | 'SEAT_MOVED'
  | 'SEAT_SWAPPED'
  | 'SEAT_REMOVED'
  | 'SEATING_SAVED'
  | 'STUDENT_PROFILE_VIEWED'
  | 'MANUAL_ATTENDANCE_LOGGED';

export interface ActivityLogEntry {
  timestamp: string;
  teacherId: string;
  teacherName: string;
  googleEmail: string;
  action: ActivityAction | string;
  gradeSection: string;
  studentId: string;
  details: string;
}

export interface SeatDisplayInfo {
  seatId: string;
  seatNumber: number;
  block: 'LEFT' | 'RIGHT';
  row: number;
  column: number;
  student?: StudentMaster;
  assignment?: SeatAssignment;
  attendanceStatus: AttendanceStatus;
  attendanceTime?: string; // Legacy / Display time
  timeIn?: string;         // e.g. "07:35:12"
  timeOut?: string;        // e.g. "16:02:40"
  hasTimedIn: boolean;     // true if student scanned in today
  hasTimedOut: boolean;    // true if student scanned out today
  rawAttendanceRecord?: AttendanceRecord;
  rawTimeOutRecord?: AttendanceRecord;
  dayLogs?: AttendanceRecord[];
}

