import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, Mic, Sparkles, GraduationCap, Briefcase, Bot, Wand2, MessageSquarePlus, Film, User } from 'lucide-react';
import { AppMode, AppSettings, UserProfile } from '../types';

interface HeaderProps {
  onOpenSidebar: () => void;
  onNewChat: () => void;
  onOpenVoice: () => void;
  onOpenModeModal: (mode: 'study' | 'business') => void;
  currentMode: AppMode;
  settings: AppSettings;
  onSetMode: (mode: AppMode) => void;
  onOpenImageGen: () => void;
  onOpenVideoGen: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  user?: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  onNewChat,
  onOpenVoice,
  onOpenModeModal,
  currentMode,
  settings,
  onSetMode,
  onOpenImageGen,
  onOpenVideoGen,
  onOpenSettings,
  onOpenProfile,
  user,
}) => {
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };

    if (isPlusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPlusMenuOpen]);
  const getModeInfo = () => {
    switch (currentMode) {
      case 'study':
        return {
          label: 'Study Mode',
          labelHi: 'पढ़ाई मोड',
          icon: GraduationCap,
          color: 'from-amber-400 to-orange-500',
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/10 text-amber-300',
        };
      case 'business':
        return {
          label: 'Business Mode',
          labelHi: 'बिजनेस मोड',
          icon: Briefcase,
          color: 'from-emerald-400 to-teal-500',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10 text-emerald-300',
        };
      default:
        return {
          label: 'Normal Mode',
          labelHi: 'सामान्य मोड',
          icon: Bot,
          color: 'from-cyan-400 to-blue-500',
          border: 'border-cyan-500/30',
          bg: 'bg-cyan-500/10 text-cyan-300',
        };
    }
  };

  const modeInfo = getModeInfo();
  const ModeIcon = modeInfo.icon;

  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] w-full items-center justify-between border-b border-cyan-500/15 bg-[#050811]/95 px-3 sm:px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 backdrop-blur-md">
      {/* Left: Hamburger Menu */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0c1220]/80 text-slate-200 hover:border-cyan-500/40 hover:text-cyan-400 active:scale-95 transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand & Mode */}
        <div className="flex min-w-0 flex-col select-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-wider text-base sm:text-lg bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              NAFEES AI
            </span>
            <button
              onClick={onOpenSettings}
              title="सेटिंग्स में AI मॉडल मोड बदलें"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                settings.modelMode === 'fast'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : settings.modelMode === 'advanced'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/35 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-current" />
              <span>
                {settings.modelMode === 'fast'
                  ? '⚡ Fast'
                  : settings.modelMode === 'advanced'
                  ? '🧠 Advanced'
                  : '⚖️ Balanced'}
              </span>
              <span className="hidden sm:inline opacity-75 font-normal">Mode</span>
            </button>
          </div>

          {/* Mode Tabs: Normal, Study, Business */}
          <div className="flex items-center gap-1 mt-0.5">
            <button
              onClick={() => onSetMode('normal')}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold transition-all ${
                currentMode === 'normal'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
              title="Normal Mode (सामान्य मोड)"
            >
              <Bot className="h-3 w-3" />
              <span>Normal</span>
            </button>

            <button
              onClick={() => {
                if (currentMode === 'study') {
                  onOpenModeModal('study');
                } else {
                  onSetMode('study');
                }
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold transition-all ${
                currentMode === 'study'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400 hover:text-amber-300/80 border border-transparent'
              }`}
              title={currentMode === 'study' ? 'Study टूल्स खोलें' : 'Study Mode (पढ़ाई) एक्टिव करें'}
            >
              <GraduationCap className="h-3 w-3 text-amber-400" />
              <span>Study (पढ़ाई)</span>
              {currentMode === 'study' && (
                <span className="text-[9px] bg-amber-500/30 px-1 rounded text-amber-200 ml-0.5">टूल्स</span>
              )}
            </button>

            <button
              onClick={() => {
                if (currentMode === 'business') {
                  onOpenModeModal('business');
                } else {
                  onSetMode('business');
                }
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold transition-all ${
                currentMode === 'business'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-emerald-300/80 border border-transparent'
              }`}
              title={currentMode === 'business' ? 'Business टूल्स खोलें' : 'Business Mode (बिजनेस) एक्टिव करें'}
            >
              <Briefcase className="h-3 w-3 text-emerald-400" />
              <span>Business</span>
              {currentMode === 'business' && (
                <span className="text-[9px] bg-emerald-500/30 px-1 rounded text-emerald-200 ml-0.5">टूल्स</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Profile Avatar Trigger */}
        {user && onOpenProfile && (
          <button
            onClick={onOpenProfile}
            aria-label="User Profile"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-[#0c1326] hover:border-cyan-400/60 active:scale-95 transition-all overflow-hidden shadow-sm shrink-0"
            title={`${user.name} - प्रोफ़ाइल देखें`}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-cyan-600 text-white font-bold text-xs">
                {user.name ? user.name.slice(0, 1).toUpperCase() : <User className="h-4 w-4" />}
              </div>
            )}
          </button>
        )}

        {/* Voice Chat Direct Jump */}
        <button
          onClick={onOpenVoice}
          aria-label="Open Voice Chat"
          className="flex h-10 w-10 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all"
          title="वॉइस चैट स्क्रीन खोलें"
        >
          <Mic className="h-4 w-4 text-cyan-400" />
          <span className="hidden sm:inline text-xs font-semibold">वॉइस चैट</span>
        </button>

        {/* Plus / Options Button with Dropdown Menu */}
        <div className="relative" ref={plusMenuRef}>
          <button
            onClick={() => setIsPlusMenuOpen((prev) => !prev)}
            aria-label="Options Menu"
            className="flex h-10 w-10 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:brightness-110 active:scale-95 transition-all"
            title="नया चैट या इमेज जनरेट करें"
          >
            <Plus className={`h-4 w-4 transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
            <span className="hidden sm:inline text-xs font-semibold">नया</span>
          </button>

          {/* Dropdown Options Popup */}
          {isPlusMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-cyan-500/30 bg-[#090e1c]/95 p-1.5 shadow-2xl backdrop-blur-md animate-fadeIn">
              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  onNewChat();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950/70 text-cyan-400">
                  <MessageSquarePlus className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <p className="font-bold">+ नया चैट (New Chat)</p>
                  <p className="text-[10px] text-slate-400">ताज़ा बातचीत शुरू करें</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  onOpenImageGen();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:text-cyan-200 transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  <Wand2 className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <p className="font-bold text-cyan-300">🎨 इमेज बनाएं (Image Gen)</p>
                  <p className="text-[10px] text-slate-400">AI द्वारा तस्वीरें बनाएं</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  onOpenVideoGen();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-indigo-500/20 hover:text-cyan-200 transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  <Film className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <p className="font-bold text-cyan-300">🎬 AI Video बनाएं (Video Gen)</p>
                  <p className="text-[10px] text-slate-400">शॉर्ट वीडियो क्लिप्स बनाएं</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
