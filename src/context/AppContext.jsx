import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { insforge } from '../lib/insforge';
import { getT } from '../lib/i18n';
import { deleteUserData } from '../lib/useData';

const AppContext = createContext(null);

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

  // Auth hydration
  useEffect(() => {
    let cancelled = false;
    insforge.auth.getCurrentUser().then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data?.user) setUser(data.user);
      setAuthLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setUser(data.user);
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
