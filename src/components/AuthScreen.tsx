import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { UserProfile } from '../types';
import { registerUser, loginUser, resetPassword } from '../services/auth';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Clear messages on mode switch
  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginUser(identifier, password, name);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'लॉगिन नहीं हो पाया। कृपया जानकारी जांचें।');
      }
    } catch (err: any) {
      setError(err?.message || 'लॉगिन में त्रुटि हुई।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerUser(name, identifier, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'खाता नहीं बन पाया।');
      }
    } catch (err: any) {
      setError(err?.message || 'रजिस्ट्रेशन में त्रुटि हुई।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError('नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(identifier, password);
      if (res.success) {
        setSuccessMsg('पासवर्ड सफलतापूर्वक बदल दिया गया! अब लॉगिन करें।');
        setTimeout(() => {
          switchMode('login');
        }, 1500);
      } else {
        setError(res.error || 'पासवर्ड रीसेट नहीं हो पाया।');
      }
    } catch (err: any) {
      setError(err?.message || 'पासवर्ड बदलने में त्रुटि हुई।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#050811] text-slate-100 p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Decorative Neon Glows */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Top Branding Card */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_24px_rgba(6,182,212,0.4)] mb-3 border border-cyan-400/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            NAFEES AI
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            आपका बुद्धिमान एवं व्यक्तिगत AI साथी
          </p>
        </div>

        {/* Main Form Box */}
        <div className="rounded-3xl border border-cyan-500/25 bg-[#080d1c]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          {/* Header Title for Mode */}
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-100">
              {mode === 'login' && 'खाते में लॉगिन करें (Login)'}
              {mode === 'register' && 'नया खाता बनाएं (Create Account)'}
              {mode === 'forgot' && 'पासवर्ड रीसेट करें (Reset Password)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'login' && 'अपनी अलग चैट हिस्ट्री और सुरक्षित प्रोफ़ाइल के लिए लॉगिन करें'}
              {mode === 'register' && 'अपनी बातचीत और फाइलों को सुरक्षित रखने के लिए खाता बनाएं'}
              {mode === 'forgot' && 'अपना पंजीकृत मोबाइल/ईमेल दर्ज कर नया पासवर्ड सेट करें'}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  नाम (Name)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="अपना नाम दर्ज करें (उदा. नाफ़िस)"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  मोबाइल नंबर या ईमेल (Mobile or Email)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="उदा. 9876543210 या user@example.com"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    पासवर्ड (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    पासवर्ड भूल गए?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="अपना पासवर्ड दर्ज करें"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 py-3 px-4 font-bold text-white shadow-[0_0_16px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-98 transition-all text-sm disabled:opacity-50"
              >
                <span>{isLoading ? 'लॉगिन हो रहा है...' : 'लॉगिन करें (Login)'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  नया खाता चाहिए?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1"
                  >
                    नया खाता बनाएं (Create Account)
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 2. REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  पूरा नाम (Full Name)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="उदा. राहुल शर्मा या नाफ़िस"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  मोबाइल नंबर या ईमेल (Mobile or Email)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="उदा. 9876543210 या user@example.com"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  पासवर्ड बनाएं (Create Password - सरल व न्यूनतम 4 अक्षर)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="कम से कम 4 अक्षर का पासवर्ड"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  कन्फर्म पासवर्ड (Confirm Password)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="पासवर्ड दोबारा दर्ज करें"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 py-3 px-4 font-bold text-white shadow-[0_0_16px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-98 transition-all text-sm disabled:opacity-50"
              >
                <span>{isLoading ? 'खाता बन रहा है...' : 'खाता बनाएं (Create Account)'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="pt-2.5 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  पहले से खाता मौजूद है?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1"
                  >
                    लॉगिन करें (Login)
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  पंजीकृत मोबाइल नंबर या ईमेल
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="पंजीकृत मोबाइल या ईमेल दर्ज करें"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  नया पासवर्ड (New Password)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="नया पासवर्ड दर्ज करें (न्यूनतम 4 अक्षर)"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  नया पासवर्ड कन्फर्म करें
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="नया पासवर्ड दोबारा दर्ज करें"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 py-3 px-4 font-bold text-white shadow-[0_0_16px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-98 transition-all text-sm disabled:opacity-50"
              >
                <span>{isLoading ? 'पासवर्ड बदल रहा है...' : 'पासवर्ड रीसेट करें (Reset Password)'}</span>
                <RotateCcw className="h-4 w-4" />
              </button>

              <div className="pt-2.5 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  ← वापस लॉगिन पर जाएं (Back to Login)
                </button>
              </div>
            </form>
          )}

          {/* Privacy Note */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-500/80" />
            <span>100% सुरक्षित और ऑन-डिवाइस एन्क्रिप्टेड स्टोरेज</span>
          </div>
        </div>
      </div>
    </div>
  );
};
