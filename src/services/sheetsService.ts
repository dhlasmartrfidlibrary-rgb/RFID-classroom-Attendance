import {
  StudentMaster,
  DailySchedule,
  AttendanceRecord,
  TeacherAccount,
  SeatAssignment,
  ActivityLogEntry,
} from '../types';

export const DEFAULT_SPREADSHEET_ID = '10KdB24z92UbICBdQCpHrFWpsGgDCx1IOr957d6auCjg';

export function getSpreadsheetId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_spreadsheet_id');
    if (custom && custom.trim().length > 0) return custom.trim();
  }
  return DEFAULT_SPREADSHEET_ID;
}

export function setSpreadsheetId(newId: string): void {
  if (typeof window !== 'undefined') {
    if (!newId || newId.trim() === DEFAULT_SPREADSHEET_ID) {
      localStorage.removeItem('custom_spreadsheet_id');
    } else {
      localStorage.setItem('custom_spreadsheet_id', newId.trim());
    }
  }
}

export const SPREADSHEET_ID = DEFAULT_SPREADSHEET_ID;

// Standard headers for all required sheets (Whole-day attendance system)
export const SHEET_HEADERS = {
  STUDENT_MASTER: [
    'RFID_UID',
    'STUDENT_ID',
    'STUDENT_NAME',
    'GRADE_SECTION',
    'PARENT_NAME',
    'PARENT_EMAIL',
    'PARENT_CONTACT',
    'ACTIVE',
  ],
  DAILY_SCHEDULE: [
    'GRADE_SECTION',
    'START_TIME',
    'LATE_CUTOFF',
    'END_TIME',
    'ACTIVE',
  ],
  ATTENDANCE_LOG: [
    'TIMESTAMP',
    'DATE',
    'TIME',
    'RFID_UID',
    'STUDENT_ID',
    'STUDENT_NAME',
    'GRADE_SECTION',
    'DEVICE_ID',
    'STATUS',
    'MESSAGE',
  ],
  NOTIFICATION_LOG: [
    'TIMESTAMP',
    'STUDENT_ID',
    'PARENT_EMAIL',
    'STATUS',
    'MESSAGE',
    'TYPE',
  ],
  TEACHER_ACCOUNTS: [
    'TEACHER_ID',
    'TEACHER_NAME',
    'GOOGLE_EMAIL',
    'ROLE',
    'ASSIGNED_SECTION',
    'ACTIVE',
    'LAST_LOGIN',
  ],
  SEATING_PLAN: [
    'SEAT_ID',
    'SEAT_NUMBER',
    'BLOCK',
    'ROW',
    'COLUMN',
    'STUDENT_ID',
    'GRADE_SECTION',
    'UPDATED_AT',
    'UPDATED_BY',
  ],
  ACTIVITY_LOG: [
    'TIMESTAMP',
    'TEACHER_ID',
    'TEACHER_NAME',
    'GOOGLE_EMAIL',
    'ACTION',
    'GRADE_SECTION',
    'STUDENT_ID',
    'DETAILS',
  ],
};

function getBaseUrl(): string {
  return `https://sheets.googleapis.com/v4/spreadsheets/${getSpreadsheetId()}`;
}

async function apiRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    let errorDetail = errText;
    try {
      const errJson = JSON.parse(errText);
      errorDetail = errJson.error?.message || errText;
    } catch {
      // Keep raw text
    }

    if (response.status === 401) {
      throw new Error(`AUTH_EXPIRED: Google session token has expired. Please re-authenticate.`);
    } else if (response.status === 403) {
      throw new Error(
        `PERMISSION_DENIED: Your Google account does not have Edit access to spreadsheet (${getSpreadsheetId()}). Please verify share permissions.`
      );
    } else if (response.status === 404) {
      throw new Error(
        `SHEET_NOT_FOUND: Spreadsheet ID (${getSpreadsheetId()}) was not found. Please verify the ID.`
      );
    }

    throw new Error(`Google Sheets API Error (${response.status}): ${errorDetail}`);
  }

  return response.json();
}

/**
 * Fetch spreadsheet metadata to check which sheet tabs exist
 */
export async function getSpreadsheetMeta(accessToken: string) {
  interface SheetMetaResponse {
    properties: { title: string };
    sheets: Array<{
      properties: {
        sheetId: number;
        title: string;
        gridProperties?: { rowCount: number; columnCount: number };
      };
    }>;
  }
  return apiRequest<SheetMetaResponse>('?fields=sheets.properties', accessToken);
}

// In-memory sheet title resolver cache
let cachedSheetTitles: string[] = [];

/**
 * Find matching sheet title in existing spreadsheet tabs (case-insensitive and tolerant of spaces/underscores)
 */
export async function resolveSheetName(
  accessToken: string,
  targetName: string,
  forceRefresh = false
): Promise<string> {
  if (cachedSheetTitles.length === 0 || forceRefresh) {
    try {
      const meta = await getSpreadsheetMeta(accessToken);
      cachedSheetTitles = meta.sheets?.map((s) => s.properties.title) || [];
    } catch (e) {
      console.warn('Could not fetch spreadsheet metadata:', e);
      return targetName;
    }
  }

  const normalize = (s: string) => s.trim().toUpperCase().replace(/[\s-_]+/g, '');
  const targetNorm = normalize(targetName);

  // Exact normalized match
  for (const title of cachedSheetTitles) {
    if (normalize(title) === targetNorm) return title;
  }

  // Synonym/partial matches
  if (targetName === 'STUDENT_MASTER') {
    const match = cachedSheetTitles.find((t) => {
      const n = normalize(t);
      return n.includes('STUDENT') || n === 'STUDENTS' || n === 'ROSTER' || n === 'MASTERLIST';
    });
    if (match) return match;
  }
  if (targetName === 'DAILY_SCHEDULE') {
    const match = cachedSheetTitles.find((t) => {
      const n = normalize(t);
      return n.includes('SCHEDULE') || n.includes('TIMETABLE') || n.includes('BELL');
    });
    if (match) return match;
  }
  if (targetName === 'ATTENDANCE_LOG') {
    const match = cachedSheetTitles.find((t) => {
      const n = normalize(t);
      return n.includes('ATTENDANCE') || n.includes('LOG') || n === 'SCANS';
    });
    if (match) return match;
  }
  if (targetName === 'TEACHER_ACCOUNTS') {
    const match = cachedSheetTitles.find((t) => {
      const n = normalize(t);
      return n.includes('TEACHER') || n.includes('FACULTY') || n.includes('ADMIN');
    });
    if (match) return match;
  }
  if (targetName === 'SEATING_PLAN') {
    const match = cachedSheetTitles.find((t) => {
      const n = normalize(t);
      return n.includes('SEAT') || n.includes('ROOM') || n.includes('LAYOUT');
    });
    if (match) return match;
  }
  if (targetName === 'ACTIVITY_LOG') {
    const match = cachedSheetTitles.find((t) => {
      const n = normalize(t);
      return n.includes('ACTIVITY') || n.includes('AUDIT');
    });
    if (match) return match;
  }

  return targetName;
}

/**
 * Ensure all required sheets exist and have header rows.
 */
export async function ensureRequiredSheets(accessToken: string): Promise<string[]> {
  const meta = await getSpreadsheetMeta(accessToken);
  cachedSheetTitles = meta.sheets?.map((s) => s.properties.title) || [];
  const normalize = (s: string) => s.trim().toUpperCase().replace(/[\s-_]+/g, '');

  const sheetsToCreate: string[] = [];

  for (const sheetKey of Object.keys(SHEET_HEADERS)) {
    const targetNorm = normalize(sheetKey);
    const exists = cachedSheetTitles.some((t) => normalize(t) === targetNorm);
    if (!exists) {
      sheetsToCreate.push(sheetKey);
    }
  }

  if (sheetsToCreate.length > 0) {
    // Add missing sheets via batchUpdate
    const requests = sheetsToCreate.map((title) => ({
      addSheet: {
        properties: { title },
      },
    }));

    await apiRequest<unknown>(':batchUpdate', accessToken, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    // Populate headers for newly created sheets
    for (const sheetName of sheetsToCreate) {
      const headerRow = SHEET_HEADERS[sheetName as keyof typeof SHEET_HEADERS];
      await apiRequest<unknown>(
        `/values/${encodeURIComponent(sheetName)}!A1:Z1?valueInputOption=USER_ENTERED`,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: `${sheetName}!A1:Z1`,
            majorDimension: 'ROWS',
            values: [headerRow],
          }),
        }
      );
    }

    // Refresh cached titles
    const updatedMeta = await getSpreadsheetMeta(accessToken);
    cachedSheetTitles = updatedMeta.sheets?.map((s) => s.properties.title) || [];
  }

  return sheetsToCreate;
}

/**
 * Read values from a specific sheet range
 */
export async function getSheetValues(
  accessToken: string,
  range: string
): Promise<string[][]> {
  try {
    const res = await apiRequest<{ values?: string[][] }>(
      `/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
      accessToken
    );
    return res.values || [];
  } catch (e) {
    console.warn(`Could not read sheet range ${range}:`, e);
    return [];
  }
}

/**
 * Append rows to a sheet
 */
export async function appendSheetValues(
  accessToken: string,
  sheetName: string,
  rows: (string | number | boolean)[][]
) {
  const actualSheetName = await resolveSheetName(accessToken, sheetName);
  return apiRequest<unknown>(
    `/values/${encodeURIComponent(actualSheetName)}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );
}

/**
 * Update an exact range with values
 */
export async function updateSheetValues(
  accessToken: string,
  range: string,
  values: (string | number | boolean)[][]
) {
  return apiRequest<unknown>(
    `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );
}

/**
 * Clear a specific range
 */
export async function clearSheetValues(accessToken: string, range: string) {
  return apiRequest<unknown>(`/values/${encodeURIComponent(range)}:clear`, accessToken, {
    method: 'POST',
  });
}

// ----------------------------------------------------
// Specific Sheet Entities with Dynamic Column Header Detection
// ----------------------------------------------------

/**
 * TEACHER_ACCOUNTS
 * Columns: TEACHER_ID, TEACHER_NAME, GOOGLE_EMAIL, ROLE, ASSIGNED_SECTION, ACTIVE, LAST_LOGIN
 */
export async function fetchTeacherAccounts(accessToken: string): Promise<TeacherAccount[]> {
  const sheetName = await resolveSheetName(accessToken, 'TEACHER_ACCOUNTS');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0].map((h) =>
    (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
  );

  const isHeaderRow = firstRow.some((h) =>
    ['TEACHER_ID', 'TEACHER_NAME', 'GOOGLE_EMAIL', 'ROLE', 'EMAIL'].includes(h)
  );

  const headers = isHeaderRow ? firstRow : [];
  const dataRows = isHeaderRow ? rows.slice(1) : rows;

  const getColIndex = (aliases: string[], fallback: number): number => {
    if (!isHeaderRow) return fallback;
    for (const alias of aliases) {
      const idx = headers.findIndex(
        (h) => h === alias || h.startsWith(alias) || h.endsWith(alias)
      );
      if (idx !== -1) return idx;
    }
    return fallback;
  };

  const idIdx = getColIndex(['TEACHER_ID', 'ID', 'FACULTY_ID', 'EMPLOYEE_ID'], 0);
  const nameIdx = getColIndex(['TEACHER_NAME', 'NAME', 'FULL_NAME', 'TEACHER'], 1);
  const emailIdx = getColIndex(['GOOGLE_EMAIL', 'EMAIL', 'GOOGLE_ACCOUNT', 'MAIL'], 2);
  const roleIdx = getColIndex(['ROLE', 'USER_ROLE', 'TYPE', 'ACCESS_LEVEL'], 3);
  const secIdx = getColIndex(['ASSIGNED_SECTION', 'SECTION', 'GRADE_SECTION', 'CLASS'], 4);
  const activeIdx = getColIndex(['ACTIVE', 'IS_ACTIVE', 'STATUS'], 5);
  const loginIdx = getColIndex(['LAST_LOGIN', 'LOGIN_TIME'], 6);

  return dataRows
    .map((row) => ({
      teacherId: (idIdx < row.length ? row[idIdx] : '')?.trim() || '',
      teacherName: (nameIdx < row.length ? row[nameIdx] : '')?.trim() || '',
      googleEmail: (emailIdx < row.length ? row[emailIdx] : '')?.trim() || '',
      role: ((roleIdx < row.length ? row[roleIdx] : '')?.trim().toUpperCase() === 'ADMIN'
        ? 'ADMIN'
        : 'TEACHER') as 'ADMIN' | 'TEACHER',
      assignedSection: (secIdx < row.length ? row[secIdx] : '')?.trim() || '',
      active:
        activeIdx < row.length
          ? String(row[activeIdx]).trim().toUpperCase() !== 'FALSE' &&
            String(row[activeIdx]).trim() !== '0'
          : true,
      lastLogin: (loginIdx < row.length ? row[loginIdx] : '')?.trim() || '',
    }))
    .filter((t) => t.googleEmail.length > 0);
}

/**
 * Update Teacher Last Login in TEACHER_ACCOUNTS
 */
export async function updateTeacherLastLogin(
  accessToken: string,
  googleEmail: string,
  timestamp: string
): Promise<boolean> {
  const sheetName = await resolveSheetName(accessToken, 'TEACHER_ACCOUNTS');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (rows.length <= 1) return false;

  const firstRow = rows[0].map((h) =>
    (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
  );
  let emailColIdx = 2;
  let loginColIdx = 6;

  firstRow.forEach((h, idx) => {
    if (h.includes('EMAIL')) emailColIdx = idx;
    if (h.includes('LOGIN')) loginColIdx = idx;
  });

  for (let i = 1; i < rows.length; i++) {
    const rowEmail = rows[i][emailColIdx]?.trim().toLowerCase();
    if (rowEmail === googleEmail.trim().toLowerCase()) {
      const rowIndex = i + 1; // 1-based index
      const colLetter = String.fromCharCode(65 + loginColIdx);
      await updateSheetValues(accessToken, `${sheetName}!${colLetter}${rowIndex}`, [[timestamp]]);
      return true;
    }
  }
  return false;
}

/**
 * Register or seed a teacher account
 */
export async function createTeacherAccount(
  accessToken: string,
  teacher: TeacherAccount
) {
  const sheetName = await resolveSheetName(accessToken, 'TEACHER_ACCOUNTS');
  return appendSheetValues(accessToken, sheetName, [
    [
      teacher.teacherId,
      teacher.teacherName,
      teacher.googleEmail,
      teacher.role,
      teacher.assignedSection,
      teacher.active ? 'TRUE' : 'FALSE',
      teacher.lastLogin || '',
    ],
  ]);
}

/**
 * STUDENT_MASTER
 * Columns: RFID_UID, STUDENT_ID, STUDENT_NAME, GRADE_SECTION, PARENT_NAME, PARENT_EMAIL, PARENT_CONTACT, ACTIVE
 */
export async function fetchStudentMaster(accessToken: string): Promise<StudentMaster[]> {
  const sheetName = await resolveSheetName(accessToken, 'STUDENT_MASTER');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0].map((h) =>
    (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
  );

  const isHeaderRow = firstRow.some((h) =>
    [
      'RFID_UID',
      'RFID',
      'UID',
      'STUDENT_ID',
      'STUDENT_NO',
      'STUDENT_NAME',
      'GRADE_SECTION',
      'SECTION',
      'NAME',
      'LRN',
    ].includes(h)
  );

  const headers = isHeaderRow ? firstRow : [];
  const dataRows = isHeaderRow ? rows.slice(1) : rows;

  const getColIndex = (aliases: string[], fallback: number): number => {
    if (!isHeaderRow) return fallback;
    for (const alias of aliases) {
      const idx = headers.findIndex(
        (h) => h === alias || h.startsWith(alias) || h.endsWith(alias)
      );
      if (idx !== -1) return idx;
    }
    return fallback;
  };

  const rfidIdx = getColIndex(['RFID_UID', 'RFID', 'UID', 'TAG_ID', 'CARD_ID', 'CARD_NUMBER', 'TAG', 'RFID_NUMBER'], 0);
  const idIdx = getColIndex(['STUDENT_ID', 'STUDENT_NO', 'STUDENT_NUMBER', 'LRN', 'ID_NUMBER', 'ID'], 1);
  const nameIdx = getColIndex(['STUDENT_NAME', 'NAME', 'FULL_NAME', 'FULLNAME', 'STUDENT', 'LEARNER_NAME'], 2);
  const secIdx = getColIndex(['GRADE_SECTION', 'GRADE_AND_SECTION', 'SECTION', 'GRADE', 'CLASS'], 3);
  const parentNameIdx = getColIndex(['PARENT_NAME', 'PARENT', 'GUARDIAN', 'GUARDIAN_NAME'], 4);
  const parentEmailIdx = getColIndex(['PARENT_EMAIL', 'EMAIL', 'GUARDIAN_EMAIL', 'PARENT_MAIL'], 5);
  const parentContactIdx = getColIndex(['PARENT_CONTACT', 'CONTACT', 'PHONE', 'MOBILE', 'CONTACT_NO', 'PHONE_NUMBER'], 6);
  const activeIdx = getColIndex(['ACTIVE', 'IS_ACTIVE', 'STATUS'], 7);

  return dataRows
    .map((row) => ({
      rfidUid: (rfidIdx < row.length ? row[rfidIdx] : '')?.trim() || '',
      studentId: (idIdx < row.length ? row[idIdx] : '')?.trim() || '',
      studentName: (nameIdx < row.length ? row[nameIdx] : '')?.trim() || '',
      gradeSection: (secIdx < row.length ? row[secIdx] : '')?.trim() || '',
      parentName: (parentNameIdx < row.length ? row[parentNameIdx] : '')?.trim() || '',
      parentEmail: (parentEmailIdx < row.length ? row[parentEmailIdx] : '')?.trim() || '',
      parentContact: (parentContactIdx < row.length ? row[parentContactIdx] : '')?.trim() || '',
      active:
        activeIdx < row.length
          ? String(row[activeIdx]).trim().toUpperCase() !== 'FALSE' &&
            String(row[activeIdx]).trim() !== '0'
          : true,
    }))
    .filter((s) => s.studentId.length > 0 || s.studentName.length > 0 || s.rfidUid.length > 0);
}

/**
 * DAILY_SCHEDULE
 * Columns: GRADE_SECTION, START_TIME, LATE_CUTOFF, END_TIME, ACTIVE
 */
export async function fetchDailySchedules(accessToken: string): Promise<DailySchedule[]> {
  const sheetName = await resolveSheetName(accessToken, 'DAILY_SCHEDULE');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0].map((h) =>
    (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
  );

  const isHeaderRow = firstRow.some((h) =>
    ['GRADE_SECTION', 'SECTION', 'START_TIME', 'LATE_CUTOFF', 'END_TIME'].includes(h)
  );

  const headers = isHeaderRow ? firstRow : [];
  const dataRows = isHeaderRow ? rows.slice(1) : rows;

  const getColIndex = (aliases: string[], fallback: number): number => {
    if (!isHeaderRow) return fallback;
    for (const alias of aliases) {
      const idx = headers.findIndex(
        (h) => h === alias || h.startsWith(alias) || h.endsWith(alias)
      );
      if (idx !== -1) return idx;
    }
    return fallback;
  };

  const secIdx = getColIndex(['GRADE_SECTION', 'SECTION', 'GRADE', 'CLASS'], 0);
  const startIdx = getColIndex(['START_TIME', 'START', 'TIME_IN_START', 'IN_TIME'], 1);
  const lateIdx = getColIndex(['LATE_CUTOFF', 'CUTOFF', 'LATE', 'LATE_TIME', 'LATE_THRESHOLD'], 2);
  const endIdx = getColIndex(['END_TIME', 'END', 'DISMISSAL', 'OUT_TIME'], 3);
  const activeIdx = getColIndex(['ACTIVE', 'IS_ACTIVE', 'STATUS'], 4);

  return dataRows
    .map((row) => ({
      gradeSection: (secIdx < row.length ? row[secIdx] : '')?.trim() || '',
      startTime: (startIdx < row.length ? row[startIdx] : '')?.trim() || '07:30',
      lateCutoff: (lateIdx < row.length ? row[lateIdx] : '')?.trim() || '08:00',
      endTime: (endIdx < row.length ? row[endIdx] : '')?.trim() || '16:00',
      active:
        activeIdx < row.length
          ? String(row[activeIdx]).trim().toUpperCase() !== 'FALSE' &&
            String(row[activeIdx]).trim() !== '0'
          : true,
    }))
    .filter((d) => d.gradeSection.length > 0);
}

/**
 * Save/Update or seed DAILY_SCHEDULE row
 */
export async function saveDailySchedule(
  accessToken: string,
  schedule: DailySchedule
) {
  const sheetName = await resolveSheetName(accessToken, 'DAILY_SCHEDULE');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:E`);
  if (rows.length <= 1) {
    return appendSheetValues(accessToken, sheetName, [
      [
        schedule.gradeSection,
        schedule.startTime,
        schedule.lateCutoff,
        schedule.endTime,
        schedule.active ? 'TRUE' : 'FALSE',
      ],
    ]);
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.trim().toLowerCase() === schedule.gradeSection.trim().toLowerCase()) {
      const rowIndex = i + 1;
      return updateSheetValues(accessToken, `${sheetName}!A${rowIndex}:E${rowIndex}`, [
        [
          schedule.gradeSection,
          schedule.startTime,
          schedule.lateCutoff,
          schedule.endTime,
          schedule.active ? 'TRUE' : 'FALSE',
        ],
      ]);
    }
  }

  return appendSheetValues(accessToken, sheetName, [
    [
      schedule.gradeSection,
      schedule.startTime,
      schedule.lateCutoff,
      schedule.endTime,
      schedule.active ? 'TRUE' : 'FALSE',
    ],
  ]);
}

/**
 * ATTENDANCE_LOG
 * Columns can include: TIMESTAMP, DATE, TIME / TIME_IN, TIME_OUT, RFID_UID, STUDENT_ID, STUDENT_NAME, GRADE_SECTION, DEVICE_ID, STATUS, MESSAGE, TYPE
 */
export async function fetchAttendanceLogs(accessToken: string): Promise<AttendanceRecord[]> {
  const sheetName = await resolveSheetName(accessToken, 'ATTENDANCE_LOG');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0].map((h) =>
    (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
  );
  const isHeaderRow = firstRow.some((h) =>
    [
      'TIMESTAMP',
      'DATE',
      'TIME',
      'TIME_IN',
      'TIME_OUT',
      'TIMEOUT',
      'STUDENT_ID',
      'RFID_UID',
      'STATUS',
    ].includes(h)
  );

  const headers = isHeaderRow ? firstRow : [];
  const dataRows = isHeaderRow ? rows.slice(1) : rows;

  const getColIndex = (aliases: string[]): number => {
    if (!isHeaderRow) return -1;
    for (const alias of aliases) {
      const idx = headers.findIndex(
        (h) => h === alias || h.startsWith(alias) || h.endsWith(alias)
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const tsIdx = getColIndex(['TIMESTAMP', 'DATETIME', 'DATE_TIME']);
  const dateIdx = getColIndex(['DATE']);
  const timeIdx = getColIndex(['TIME', 'TIME_IN', 'TIMEIN', 'IN_TIME', 'ARRIVAL_TIME']);
  const timeInIdx = getColIndex(['TIME_IN', 'TIMEIN', 'IN_TIME', 'ARRIVAL_TIME']);
  const timeOutIdx = getColIndex([
    'TIME_OUT',
    'TIMEOUT',
    'OUT_TIME',
    'DEPARTURE_TIME',
    'DISMISSAL_TIME',
    'EXIT_TIME',
  ]);
  const rfidIdx = getColIndex(['RFID_UID', 'RFID', 'UID']);
  const studentIdIdx = getColIndex(['STUDENT_ID', 'STUDENT_NO', 'LRN', 'ID']);
  const studentNameIdx = getColIndex(['STUDENT_NAME', 'NAME', 'FULL_NAME']);
  const gradeSectionIdx = getColIndex(['GRADE_SECTION', 'SECTION', 'GRADE', 'CLASS']);
  const deviceIdIdx = getColIndex(['DEVICE_ID', 'DEVICE', 'SCANNER']);
  const statusIdx = getColIndex(['STATUS', 'ATTENDANCE_STATUS']);
  const msgIdx = getColIndex(['MESSAGE', 'REMARKS', 'NOTES', 'NOTE']);
  const typeIdx = getColIndex(['TYPE', 'SCAN_TYPE', 'EVENT_TYPE', 'MODE']);

  return dataRows
    .map((row) => {
      const rawTimestamp = (tsIdx !== -1 && tsIdx < row.length ? row[tsIdx] : row[0])?.trim() || '';
      const rawDate = (dateIdx !== -1 && dateIdx < row.length ? row[dateIdx] : row[1])?.trim() || '';
      const rawTime = (timeIdx !== -1 && timeIdx < row.length ? row[timeIdx] : row[2])?.trim() || '';
      const rawTimeIn = (timeInIdx !== -1 && timeInIdx < row.length ? row[timeInIdx] : '')?.trim() || '';
      const rawTimeOut = (timeOutIdx !== -1 && timeOutIdx < row.length ? row[timeOutIdx] : '')?.trim() || '';
      const rawRfid = (rfidIdx !== -1 && rfidIdx < row.length ? row[rfidIdx] : row[3])?.trim() || '';
      const rawStudentId = (studentIdIdx !== -1 && studentIdIdx < row.length ? row[studentIdIdx] : row[4])?.trim() || '';
      const rawStudentName = (studentNameIdx !== -1 && studentNameIdx < row.length ? row[studentNameIdx] : row[5])?.trim() || '';
      const rawSection = (gradeSectionIdx !== -1 && gradeSectionIdx < row.length ? row[gradeSectionIdx] : row[6])?.trim() || '';
      const rawDeviceId = (deviceIdIdx !== -1 && deviceIdIdx < row.length ? row[deviceIdIdx] : row[7])?.trim() || '';
      const rawStatus = (statusIdx !== -1 && statusIdx < row.length ? row[statusIdx] : row[8])?.trim().toUpperCase() || 'NO_SCAN';
      const rawMessage = (msgIdx !== -1 && msgIdx < row.length ? row[msgIdx] : row[9])?.trim() || '';
      const rawType = (typeIdx !== -1 && typeIdx < row.length ? row[typeIdx] : '')?.trim().toUpperCase() || '';

      const derivedDate = rawDate || (rawTimestamp.includes(' ') ? rawTimestamp.split(' ')[0] : '');
      const derivedTime = rawTime || rawTimeIn || (rawTimestamp.includes(' ') ? rawTimestamp.split(' ')[1] : '');

      return {
        timestamp: rawTimestamp || `${derivedDate} ${derivedTime}`.trim(),
        date: derivedDate,
        time: derivedTime,
        timeIn: rawTimeIn || derivedTime,
        timeOut: rawTimeOut || undefined,
        rfidUid: rawRfid,
        studentId: rawStudentId,
        studentName: rawStudentName,
        gradeSection: rawSection,
        deviceId: rawDeviceId || 'RFID-MAIN-PORTAL',
        status: rawStatus,
        message: rawMessage,
        type: rawType || undefined,
      };
    })
    .filter(
      (r) =>
        r.studentId.length > 0 ||
        r.rfidUid.length > 0 ||
        r.studentName.length > 0 ||
        r.timestamp.length > 0 ||
        r.date.length > 0
    );
}

/**
 * SEATING_PLAN
 * Columns: SEAT_ID, SEAT_NUMBER, BLOCK, ROW, COLUMN, STUDENT_ID, GRADE_SECTION, UPDATED_AT, UPDATED_BY
 */
export async function fetchSeatingPlan(accessToken: string): Promise<SeatAssignment[]> {
  const sheetName = await resolveSheetName(accessToken, 'SEATING_PLAN');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0].map((h) =>
    (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
  );
  const isHeaderRow = firstRow.some((h) =>
    ['SEAT_ID', 'SEAT_NUMBER', 'SEAT_NO', 'DESK_NUMBER', 'STUDENT_ID'].includes(h)
  );

  const headers = isHeaderRow ? firstRow : [];
  const dataRows = isHeaderRow ? rows.slice(1) : rows;

  const getColIndex = (aliases: string[], fallback: number): number => {
    if (!isHeaderRow) return fallback;
    for (const alias of aliases) {
      const idx = headers.findIndex(
        (h) => h === alias || h.startsWith(alias) || h.endsWith(alias)
      );
      if (idx !== -1) return idx;
    }
    return fallback;
  };

  const idIdx = getColIndex(['SEAT_ID', 'ID'], 0);
  const numIdx = getColIndex(['SEAT_NUMBER', 'SEAT_NO', 'SEAT', 'DESK_NUMBER', 'DESK_NO'], 1);
  const blockIdx = getColIndex(['BLOCK', 'SIDE', 'WING'], 2);
  const rowIdx = getColIndex(['ROW', 'ROW_NUMBER'], 3);
  const colIdx = getColIndex(['COLUMN', 'COL', 'COLUMN_NUMBER'], 4);
  const studentIdIdx = getColIndex(['STUDENT_ID', 'STUDENT_NO', 'LRN', 'ID'], 5);
  const secIdx = getColIndex(['GRADE_SECTION', 'SECTION', 'GRADE', 'CLASS'], 6);
  const updatedIdx = getColIndex(['UPDATED_AT', 'TIMESTAMP', 'DATE'], 7);
  const byIdx = getColIndex(['UPDATED_BY', 'TEACHER', 'USER', 'EMAIL'], 8);

  return dataRows
    .map((row) => ({
      seatId: (idIdx < row.length ? row[idIdx] : '')?.trim() || '',
      seatNumber: parseInt((numIdx < row.length ? row[numIdx] : '0')?.trim() || '0', 10),
      block: ((blockIdx < row.length ? row[blockIdx] : '')?.trim().toUpperCase() === 'RIGHT'
        ? 'RIGHT'
        : 'LEFT') as 'LEFT' | 'RIGHT',
      row: parseInt((rowIdx < row.length ? row[rowIdx] : '1')?.trim() || '1', 10),
      column: parseInt((colIdx < row.length ? row[colIdx] : '1')?.trim() || '1', 10),
      studentId: (studentIdIdx < row.length ? row[studentIdIdx] : '')?.trim() || '',
      gradeSection: (secIdx < row.length ? row[secIdx] : '')?.trim() || '',
      updatedAt: (updatedIdx < row.length ? row[updatedIdx] : '')?.trim() || '',
      updatedBy: (byIdx < row.length ? row[byIdx] : '')?.trim() || '',
    }))
    .filter((s) => s.seatNumber > 0 && s.gradeSection.length > 0);
}

/**
 * Save / Update seating plan for a specific Grade & Section
 */
export async function saveSeatingPlanForSection(
  accessToken: string,
  gradeSection: string,
  newAssignments: SeatAssignment[],
  teacherEmail: string
) {
  const sheetName = await resolveSheetName(accessToken, 'SEATING_PLAN');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:I`);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Keep rows that belong to OTHER gradeSections
  const otherSectionRows: (string | number | boolean)[][] = [];
  if (rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      const rowSection = rows[i][6]?.trim();
      if (rowSection && rowSection.toLowerCase() !== gradeSection.trim().toLowerCase()) {
        otherSectionRows.push(rows[i]);
      }
    }
  }

  // Format new assignments
  const newSectionRows = newAssignments
    .filter((a) => a.studentId && a.studentId.trim().length > 0)
    .map((a) => [
      a.seatId,
      a.seatNumber,
      a.block,
      a.row,
      a.column,
      a.studentId,
      gradeSection,
      now,
      teacherEmail,
    ]);

  const allRowsToSave = [SHEET_HEADERS.SEATING_PLAN, ...otherSectionRows, ...newSectionRows];

  await clearSheetValues(accessToken, `${sheetName}!A:I`);
  await updateSheetValues(accessToken, `${sheetName}!A1`, allRowsToSave);
}

/**
 * ACTIVITY_LOG
 * Columns: TIMESTAMP, TEACHER_ID, TEACHER_NAME, GOOGLE_EMAIL, ACTION, GRADE_SECTION, STUDENT_ID, DETAILS
 */
export async function logActivity(
  accessToken: string,
  entry: ActivityLogEntry
) {
  const sheetName = await resolveSheetName(accessToken, 'ACTIVITY_LOG');
  return appendSheetValues(accessToken, sheetName, [
    [
      entry.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      entry.teacherId,
      entry.teacherName,
      entry.googleEmail,
      entry.action,
      entry.gradeSection,
      entry.studentId,
      entry.details,
    ],
  ]);
}

/**
 * Fetch Activity Logs
 */
export async function fetchActivityLogs(accessToken: string): Promise<ActivityLogEntry[]> {
  const sheetName = await resolveSheetName(accessToken, 'ACTIVITY_LOG');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (!rows || rows.length <= 1) return [];

  const dataRows = rows.slice(1);
  return dataRows
    .map((row) => ({
      timestamp: row[0]?.trim() || '',
      teacherId: row[1]?.trim() || '',
      teacherName: row[2]?.trim() || '',
      googleEmail: row[3]?.trim() || '',
      action: row[4]?.trim() || '',
      gradeSection: row[5]?.trim() || '',
      studentId: row[6]?.trim() || '',
      details: row[7]?.trim() || '',
    }))
    .reverse(); // latest first
}

/**
 * Record whole-day attendance or simulate RFID scan into ATTENDANCE_LOG
 */
export async function recordAttendance(
  accessToken: string,
  record: AttendanceRecord
) {
  const sheetName = await resolveSheetName(accessToken, 'ATTENDANCE_LOG');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (rows && rows.length > 0) {
    const firstRow = rows[0].map((h) =>
      (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
    );
    const hasTimeIn = firstRow.some((h) => ['TIME_IN', 'TIMEIN'].includes(h));
    const hasTimeOut = firstRow.some((h) => ['TIME_OUT', 'TIMEOUT'].includes(h));

    if (hasTimeIn || hasTimeOut) {
      const rowData = firstRow.map((header) => {
        switch (header) {
          case 'TIMESTAMP':
          case 'DATETIME':
            return record.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
          case 'DATE':
            return record.date;
          case 'TIME':
          case 'TIME_IN':
          case 'TIMEIN':
            return record.timeIn || record.time;
          case 'TIME_OUT':
          case 'TIMEOUT':
            return record.timeOut || '';
          case 'RFID_UID':
          case 'RFID':
          case 'UID':
            return record.rfidUid;
          case 'STUDENT_ID':
          case 'STUDENT_NO':
          case 'LRN':
            return record.studentId;
          case 'STUDENT_NAME':
          case 'NAME':
            return record.studentName;
          case 'GRADE_SECTION':
          case 'SECTION':
            return record.gradeSection;
          case 'DEVICE_ID':
          case 'DEVICE':
            return record.deviceId || 'RFID-MAIN-PORTAL';
          case 'STATUS':
            return record.status;
          case 'MESSAGE':
          case 'REMARKS':
            return record.message;
          case 'TYPE':
          case 'SCAN_TYPE':
            return record.type || (record.timeOut ? 'OUT' : 'IN');
          default:
            return '';
        }
      });
      return appendSheetValues(accessToken, sheetName, [rowData]);
    }
  }

  return appendSheetValues(accessToken, sheetName, [
    [
      record.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      record.date,
      record.time,
      record.rfidUid,
      record.studentId,
      record.studentName,
      record.gradeSection,
      record.deviceId || 'RFID-MAIN-PORTAL',
      record.status,
      record.message,
    ],
  ]);
}

/**
 * Record or update TIME_OUT in Google Sheets ATTENDANCE_LOG
 */
export async function recordTimeOutInLog(
  accessToken: string,
  record: AttendanceRecord
): Promise<void> {
  const sheetName = await resolveSheetName(accessToken, 'ATTENDANCE_LOG');
  const rows = await getSheetValues(accessToken, `${sheetName}!A1:Z`);
  if (rows && rows.length > 0) {
    const firstRow = rows[0].map((h) =>
      (h || '').trim().toUpperCase().replace(/[\s-_]+/g, '_')
    );
    const dateIdx = firstRow.findIndex((h) => h === 'DATE');
    const studentIdIdx = firstRow.findIndex((h) =>
      ['STUDENT_ID', 'STUDENT_NO', 'LRN', 'ID'].includes(h)
    );
    const timeOutIdx = firstRow.findIndex((h) =>
      ['TIME_OUT', 'TIMEOUT', 'OUT_TIME', 'DEPARTURE_TIME', 'DISMISSAL_TIME', 'EXIT_TIME'].includes(h)
    );
    const statusIdx = firstRow.findIndex((h) => ['STATUS', 'ATTENDANCE_STATUS'].includes(h));

    // If there is an explicit TIME_OUT column and matching row for today:
    if (timeOutIdx !== -1 && dateIdx !== -1 && studentIdIdx !== -1) {
      for (let i = 1; i < rows.length; i++) {
        const rowDate = rows[i][dateIdx]?.trim();
        const rowStudent = rows[i][studentIdIdx]?.trim().toLowerCase();
        if (
          rowDate === record.date &&
          rowStudent === record.studentId.toLowerCase()
        ) {
          const rowIndex = i + 1; // 1-based sheet row
          const colLetter = String.fromCharCode(65 + timeOutIdx);
          await updateSheetValues(accessToken, `${sheetName}!${colLetter}${rowIndex}`, [
            [record.timeOut || record.time],
          ]);
          if (record.status === 'EARLY_OUT' && statusIdx !== -1) {
            const statusCol = String.fromCharCode(65 + statusIdx);
            await updateSheetValues(accessToken, `${sheetName}!${statusCol}${rowIndex}`, [
              [record.status],
            ]);
          }
          return;
        }
      }
    }
  }

  // If no matching existing row with a TIME_OUT column, append a new record row
  await recordAttendance(accessToken, {
    ...record,
    type: 'OUT',
    timeOut: record.timeOut || record.time,
  });
}
