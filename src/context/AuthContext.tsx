import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  setCachedAccessToken,
} from '../lib/firebase';
import { TeacherAccount, ActivityLogEntry } from '../types';
import {
  ensureRequiredSheets,
  fetchTeacherAccounts,
  updateTeacherLastLogin,
  logActivity,
  createTeacherAccount,
} from '../services/sheetsService';

export type AuthStateStatus =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'CHECKING_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'ACCESS_DENIED'
  | 'ERROR';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  teacherAccount: TeacherAccount | null;
  authStatus: AuthStateStatus;
  authErrorMessage: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  registerInitialAdmin: (assignedClass?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [teacherAccount, setTeacherAccount] = useState<TeacherAccount | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStateStatus>('INITIALIZING');
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  const verifyTeacherAuthorization = useCallback(
    async (currentUser: User, token: string) => {
      setAuthStatus('CHECKING_AUTHORIZATION');
      setAuthErrorMessage(null);

      try {
        // Ensure all required sheet tabs exist
        await ensureRequiredSheets(token);

        const email = (currentUser.email || '').trim().toLowerCase();
        const accounts = await fetchTeacherAccounts(token);

        // Find teacher by email (case-insensitive)
        const matched = accounts.find(
          (t) => t.googleEmail.trim().toLowerCase() === email
        );

        if (matched) {
          if (!matched.active) {
            setTeacherAccount(null);
            setAuthStatus('ACCESS_DENIED');
            setAuthErrorMessage(
              'Your Google account is registered but currently marked INACTIVE. Please contact the administrator.'
            );
            return;
          }

          // Valid active teacher
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
          // Update LAST_LOGIN
          await updateTeacherLastLogin(token, matched.googleEmail, nowStr);

          // Log to ACTIVITY_LOG
          const loginLog: ActivityLogEntry = {
            timestamp: nowStr,
            teacherId: matched.teacherId,
            teacherName: matched.teacherName,
            googleEmail: matched.googleEmail,
            action: 'LOGIN',
            gradeSection: matched.assignedSection || 'ALL',
            studentId: '',
            details: `Teacher ${matched.teacherName} logged in via Google Sign-In (${matched.role})`,
          };
          await logActivity(token, loginLog);

          setTeacherAccount({ ...matched, lastLogin: nowStr });
          setAuthStatus('AUTHORIZED');
        } else {
          // If no accounts exist at all in TEACHER_ACCOUNTS, allow initial admin setup
          if (accounts.length === 0) {
            setAuthStatus('ACCESS_DENIED');
            setAuthErrorMessage(
              'NO_ACCOUNTS_FOUND' // Special code to offer 1-click initial Admin setup for the spreadsheet owner
            );
            return;
          }

          setTeacherAccount(null);
          setAuthStatus('ACCESS_DENIED');
          setAuthErrorMessage(
            'This Google account is not authorized to access the Teacher Dashboard. Only registered teacher emails in TEACHER_ACCOUNTS are permitted.'
          );
        }
      } catch (err: unknown) {
        console.error('Error verifying teacher account in Google Sheets:', err);
        setAuthStatus('ERROR');
        setAuthErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to synchronize with the Google Sheet database. Please check permissions.'
        );
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        verifyTeacherAuthorization(currentUser, token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setTeacherAccount(null);
        setAuthStatus('UNAUTHENTICATED');
        setAuthErrorMessage(null);
      }
    );

    return () => unsubscribe();
  }, [verifyTeacherAuthorization]);

  const login = async () => {
    try {
      setAuthErrorMessage(null);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        await verifyTeacherAuthorization(res.user, res.accessToken);
      }
    } catch (err: any) {
      const errCode = err?.code || '';
      const errMsg = err?.message || '';

      if (errCode === 'auth/popup-closed-by-user' || errMsg.includes('closed before completing')) {
        setAuthStatus('UNAUTHENTICATED');
        setAuthErrorMessage(null);
        return;
      }

      if (errCode === 'auth/popup-blocked' || errMsg.includes('POPUP_BLOCKED') || errMsg.includes('popup-blocked')) {
        setAuthStatus('ERROR');
        setAuthErrorMessage('POPUP_BLOCKED');
        return;
      }

      console.error('Sign in failed:', err);
      setAuthStatus('ERROR');
      setAuthErrorMessage(
        err instanceof Error ? err.message : 'Unable to verify Google account.'
      );
    }
  };

  const logout = async () => {
    try {
      const currentToken = accessToken || getAccessToken();
      if (currentToken && teacherAccount) {
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        await logActivity(currentToken, {
          timestamp: nowStr,
          teacherId: teacherAccount.teacherId,
          teacherName: teacherAccount.teacherName,
          googleEmail: teacherAccount.googleEmail,
          action: 'LOGOUT',
          gradeSection: teacherAccount.assignedSection || 'ALL',
          studentId: '',
          details: `Teacher ${teacherAccount.teacherName} logged out`,
        }).catch(() => {
          // ignore logout logging errors
        });
      }
    } catch (e) {
      console.error('Error recording logout:', e);
    } finally {
      await logoutGoogle();
      setUser(null);
      setAccessToken(null);
      setCachedAccessToken(null);
      setTeacherAccount(null);
      setAuthStatus('UNAUTHENTICATED');
    }
  };

  const refreshAuth = async () => {
    if (user && accessToken) {
      await verifyTeacherAuthorization(user, accessToken);
    }
  };

  // Helper if sheet has no accounts or user is bootstrapping the school database
  const registerInitialAdmin = async (assignedSection: string = 'Grade 10 - Rizal') => {
    if (!user || !accessToken) return;
    try {
      setAuthStatus('CHECKING_AUTHORIZATION');
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newAdmin: TeacherAccount = {
        teacherId: 'TCH-001',
        teacherName: user.displayName || user.email?.split('@')[0] || 'Administrator',
        googleEmail: user.email || '',
        role: 'ADMIN',
        assignedSection: assignedSection,
        active: true,
        lastLogin: nowStr,
      };

      await createTeacherAccount(accessToken, newAdmin);
      await logActivity(accessToken, {
        timestamp: nowStr,
        teacherId: newAdmin.teacherId,
        teacherName: newAdmin.teacherName,
        googleEmail: newAdmin.googleEmail,
        action: 'LOGIN',
        gradeSection: assignedSection,
        studentId: '',
        details: 'Initial Admin teacher account initialized in Google Sheets',
      });

      setTeacherAccount(newAdmin);
      setAuthStatus('AUTHORIZED');
      setAuthErrorMessage(null);
    } catch (err: unknown) {
      console.error('Failed to initialize admin:', err);
      setAuthStatus('ERROR');
      setAuthErrorMessage(
        err instanceof Error ? err.message : 'Failed to initialize teacher account in Google Sheets'
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        teacherAccount,
        authStatus,
        authErrorMessage,
        login,
        logout,
        refreshAuth,
        registerInitialAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
