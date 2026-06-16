import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { insforge } from '../lib/insforge';
import { getT } from '../lib/i18n';
import { deleteUserData } from '../lib/useData';

const AppContext = createContext(null);

// ---- Persistent session helpers ----
// Insforge SDK hanya menyimpan token di memory → hilang saat refresh.
// Solusi: simpan token ke localStorage saat rememberMe=true, restore saat page load.
const PK = {
  flag: 'persist_login',
  at:   'persist_at',     // timestamp kunjungan terakhir (untuk 2-hari expiry)
  tok:  'persist_tok',    // access token
  rt:   'persist_rt',     // refresh token
  user: 'persist_user',   // user object (JSON)
};
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function clearPersist() {
  Object.values(PK).forEach(k => localStorage.removeItem(k));
}

function savePersist(data) {
  localStorage.setItem(PK.flag, '1');
  localStorage.setItem(PK.at,   String(Date.now()));
  if (data.accessToken)  localStorage.setItem(PK.tok,  data.accessToken);
  if (data.refreshToken) localStorage.setItem(PK.rt,   data.refreshToken);
  if (data.user)         localStorage.setItem(PK.user, JSON.stringify(data.user));
}

function restoreSdkSession({ accessToken, refreshToken, user }) {
  try {
    // setAccessToken adalah public API InsForgeClient
    if (accessToken)  insforge.setAccessToken(accessToken);
    // tokenManager & getHttpClient() keduanya accessible
    if (user)         insforge.auth.tokenManager.setUser(user);
    if (refreshToken) insforge.getHttpClient().setRefreshToken(refreshToken);
  } catch (_) { /* jika SDK berubah struktur internalnya */ }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Language
  const [lang, setLang] = useState(() => localStorage.getItem('lang') ?? 'id');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const toggleDark = useCallback(() => setDarkMode(v => !v), []);
  const toggleLang = useCallback(() => setLang(v => v === 'id' ? 'en' : 'id'), []);
  const t = getT(lang);

  // Auth hydration — dijalankan sekali saat app load / page refresh
  useEffect(() => {
    let cancelled = false;
    const persistLogin = localStorage.getItem(PK.flag) === '1';
    const sessionOnly  = sessionStorage.getItem('session_only') === '1';

    // Tidak ada sesi sama sekali → signOut untuk bersih-bersih lalu redirect ke login
    if (!persistLogin && !sessionOnly) {
      insforge.auth.signOut().finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
      return () => { cancelled = true; };
    }

    if (persistLogin) {
      // Cek apakah sudah 2 hari tanpa kunjungan
      const lastAt = Number(localStorage.getItem(PK.at) ?? '0');
      if (Date.now() - lastAt > TWO_DAYS_MS) {
        clearPersist();
        insforge.auth.signOut().finally(() => {
          if (!cancelled) setAuthLoading(false);
        });
        return () => { cancelled = true; };
      }

      // Restore session: token + user dikembalikan ke SDK memory
      const storedUser = JSON.parse(localStorage.getItem(PK.user) ?? 'null');
      restoreSdkSession({
        accessToken:  localStorage.getItem(PK.tok) ?? '',
        refreshToken: localStorage.getItem(PK.rt)  ?? '',
        user:         storedUser,
      });

      if (storedUser && !cancelled) {
        setUser(storedUser);
        // Perbarui timestamp kunjungan terakhir
        localStorage.setItem(PK.at, String(Date.now()));
        setAuthLoading(false);
        // Token sudah ada di memory SDK; jika expired, refresh otomatis
        // terjadi saat API call pertama (handleRequest → refreshAndSaveSession)
      } else {
        setAuthLoading(false);
      }
      return () => { cancelled = true; };
    }

    // sessionOnly: tidak ada stored token, andalkan HTTP-only cookie refresh
    insforge.auth.getCurrentUser().then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data?.user) setUser(data.user);
      setAuthLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password, rememberMe = true) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setUser(data.user);
    if (rememberMe) {
      savePersist(data);   // simpan token + user ke localStorage
      sessionStorage.removeItem('session_only');
    } else {
      clearPersist();      // pastikan tidak ada sisa persist dari session sebelumnya
      sessionStorage.setItem('session_only', '1');
    }
    return { ok: true };
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data, error } = await insforge.auth.signUp({
      email, password, name,
      redirectTo: window.location.origin + '/login',
    });
    if (error) return { error: error.message };
    return { data };
  }, []);

  const verifyEmail = useCallback(async (email, otp) => {
    const { data, error } = await insforge.auth.verifyEmail({ email, otp });
    if (error) return { error: error.message };
    setUser(data.user);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await insforge.auth.signOut();
    setUser(null);
    setProfile(null);
    clearPersist();
    sessionStorage.removeItem('session_only');
  }, []);

  const sendResetEmail = useCallback(async (email) => {
    const { error } = await insforge.auth.sendResetPasswordEmail({
      email,
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) return { error: error.message };
    return { ok: true };
  }, []);

  const resetPassword = useCallback(async (code, email, newPassword) => {
    const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email, code });
    if (error) return { error: error.message };
    const { error: resetErr } = await insforge.auth.resetPassword({ newPassword, otp: data.token });
    if (resetErr) return { error: resetErr.message };
    return { ok: true };
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user?.id) return { error: 'Not logged in' };
    try {
      await deleteUserData(user.id);
      await insforge.auth.signOut();
      setUser(null);
      setProfile(null);
      clearPersist();
      sessionStorage.removeItem('session_only');
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  }, [user]);

  return (
    <AppContext.Provider value={{
      user, profile, authLoading,
      darkMode, toggleDark,
      lang, toggleLang, t,
      login, register, verifyEmail,
      logout, sendResetEmail, resetPassword, deleteAccount,
      insforge,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
