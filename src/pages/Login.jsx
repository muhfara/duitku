import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import logoFull from '../assets/logo-full.svg';

export default function Login() {
  const { login, register, verifyEmail, sendResetEmail, t } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await login(email, password);
      setLoading(false);
      if (res.error) { setError(res.error); return; }
      navigate('/', { replace: true });
    } catch (err) { setLoading(false); setError(err.message ?? 'Error'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await register(email, password, name);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.data?.requireEmailVerification) setMode('verify');
  };

  const handleVerify = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await verifyEmail(email, otp);
      setLoading(false);
      if (res.error) { setError(res.error); return; }
      navigate('/', { replace: true });
    } catch (err) { setLoading(false); setError(err.message ?? 'Error'); }
  };

  const handleForgot = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const res = await sendResetEmail(email);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setMode('forgot-sent');
  };

  const ic = `w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logoFull} alt="DuitKu" className="h-12 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('tagline')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          {(mode === 'register' || mode === 'verify' || mode === 'forgot' || mode === 'forgot-sent') && (
            <button onClick={() => { setMode('login'); setError(''); }} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
              <ArrowLeft size={14} /> {t('back')}
            </button>
          )}

          {mode === 'login' && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-5">{t('loginTitle')}</h2>
              {error && <ErrorBox msg={error} />}
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" cls={ic} />
                <PasswordField label="Password" value={password} onChange={setPassword} show={showPass} toggle={() => setShowPass(v => !v)} cls={ic} />
                <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-green-600 hover:underline">{t('forgotPassword')}</button>
                <SubmitBtn loading={loading} label={t('loginBtn')} />
              </form>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                {t('noAccount')}{' '}
                <button onClick={() => { setMode('register'); setError(''); }} className="text-green-600 font-medium hover:underline">{t('registerBtn')}</button>
              </p>
            </>
          )}

          {mode === 'register' && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-5">{t('registerTitle')}</h2>
              {error && <ErrorBox msg={error} />}
              <form onSubmit={handleRegister} className="space-y-4">
                <Field label={t('displayName')} type="text" value={name} onChange={setName} placeholder="Full Name" cls={ic} />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" cls={ic} />
                <PasswordField label={t('passwordMin')} value={password} onChange={setPassword} show={showPass} toggle={() => setShowPass(v => !v)} cls={ic} />
                <SubmitBtn loading={loading} label={t('registerBtn')} />
              </form>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                {t('hasAccount')}{' '}
                <button onClick={() => { setMode('login'); setError(''); }} className="text-green-600 font-medium hover:underline">{t('loginBtn')}</button>
              </p>
            </>
          )}

          {mode === 'verify' && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('verifyEmail')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('verifyDesc')} <strong>{email}</strong></p>
              {error && <ErrorBox msg={error} />}
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('otp')}</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    className={`${ic} text-center text-2xl tracking-widest font-mono`}
                    placeholder="000000" required />
                </div>
                <SubmitBtn loading={loading} label={t('verifyBtn')} />
              </form>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('resetTitle')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('resetDesc')}</p>
              {error && <ErrorBox msg={error} />}
              <form onSubmit={handleForgot} className="space-y-4">
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" cls={ic} />
                <SubmitBtn loading={loading} label={t('sendResetBtn')} />
              </form>
            </>
          )}

          {mode === 'forgot-sent' && (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('emailSent')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('checkEmail')} <strong>{email}</strong></p>
              <button onClick={() => setMode('login')} className="text-sm text-green-600 hover:underline">{t('backToLogin')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2.5 mb-4">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, cls }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className={cls} placeholder={placeholder} required />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, toggle, cls }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          className={`${cls} pr-10`} placeholder="••••••••" required minLength={6} />
        <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function SubmitBtn({ loading, label }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
      {loading ? '...' : label}
    </button>
  );
}
