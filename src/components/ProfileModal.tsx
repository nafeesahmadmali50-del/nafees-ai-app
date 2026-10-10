import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Camera,
  LogOut,
  Check,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Calendar,
  Sparkles,
  MessageSquare,
  Cpu,
} from 'lucide-react';
import { UserProfile, AppSettings } from '../types';
import { updateUserProfile, changeUserPassword } from '../services/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  chatCount: number;
  settings: AppSettings;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  chatCount,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'edit' | 'password'>('info');

  // Edit fields
  const [editName, setEditName] = useState(user.name);
  const [editIdentifier, setEditIdentifier] = useState(user.identifier);
  const [editAvatar, setEditAvatar] = useState(user.avatarUrl || '');

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // Status
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setEditName(user.name);
      setEditIdentifier(user.identifier);
      setEditAvatar(user.avatarUrl || '');
      setError(null);
      setSuccess(null);
      setShowLogoutConfirm(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Avatar presets
  const avatarPresets = [
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`,
    `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(user.name)}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=nafees`,
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'user')}`,
  ];

  // Photo upload from device with automatic canvas downscaling to lightweight thumbnail (~3KB)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('फोटो का आकार 5MB से कम होना चाहिए।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) return;

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 96;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/jpeg', 0.70);
            setEditAvatar(compressed);
          } else {
            setEditAvatar(avatarPresets[0]);
          }
        } catch {
          setEditAvatar(avatarPresets[0]);
        }
      };
      img.onerror = () => {
        setError('फोटो लोड नहीं हो सकी।');
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
    // Reset file input so re-uploading the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = updateUserProfile(user.id, {
        name: editName,
        identifier: editIdentifier,
        avatarUrl: editAvatar,
      });

      if (res.success && res.user) {
        onUpdateUser(res.user);
        setSuccess('प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई!');
        setTimeout(() => {
          setSuccess(null);
          setActiveTab('info');
        }, 1200);
      } else {
        setError(res.error || 'अपडेट नहीं हो पाया।');
      }
    } catch {
      setError('अपडेट करने में समस्या हुई। कृपया दोबारा प्रयास करें।');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPass !== confirmNewPass) {
      setError('नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं।');
      return;
    }

    setIsSaving(true);
    try {
      const res = await changeUserPassword(user.id, currentPass, newPass);
      if (res.success) {
        setSuccess('पासवर्ड सफलतापूर्वक बदल दिया गया!');
        setCurrentPass('');
        setNewPass('');
        setConfirmNewPass('');
        setTimeout(() => {
          setSuccess(null);
          setActiveTab('info');
        }, 1200);
      } else {
        setError(res.error || 'पासवर्ड नहीं बदल पाया।');
      }
    } catch (err: any) {
      setError(err?.message || 'पासवर्ड बदलने में त्रुटि हुई।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] sm:max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 bg-[#070b16] text-slate-100 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 bg-[#090f1f]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-cyan-300">यूज़र प्रोफ़ाइल (Profile)</h2>
              <p className="text-xs text-slate-400">खाता विवरण और व्यक्तिगत सेटिंग्स</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-800 bg-[#060a16] px-4 py-1.5 gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveTab('info');
              setShowLogoutConfirm(false);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === 'info'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            खाता विवरण (Info)
          </button>
          <button
            onClick={() => {
              setActiveTab('edit');
              setShowLogoutConfirm(false);
              setError(null);
              setSuccess(null);
              setEditName(user.name);
              setEditIdentifier(user.identifier);
              setEditAvatar(user.avatarUrl || '');
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === 'edit'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            संपादित करें (Edit)
          </button>
          <button
            onClick={() => {
              setActiveTab('password');
              setShowLogoutConfirm(false);
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === 'password'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            पासवर्ड (Password)
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Notifications */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* TAB 1: USER INFO OVERVIEW */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Profile Card */}
              <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-[#0a1126] to-[#070b16] p-5 text-center relative overflow-hidden">
                <div className="relative mx-auto mb-3.5 h-20 w-20 rounded-full border-2 border-cyan-400/40 p-1 shadow-[0_0_16px_rgba(6,182,212,0.3)] bg-[#050811]">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 font-extrabold text-xl">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-100">{user.name}</h3>
                <p className="text-xs text-cyan-300/90 font-mono mt-0.5">{user.identifier}</p>

                <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>सक्रिय व्यक्तिगत खाता (Active Account)</span>
                </div>
              </div>

              {/* Account Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-3.5">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                    <span>व्यक्तिगत चैट:</span>
                  </div>
                  <p className="text-base font-bold text-slate-100 font-mono">{chatCount} सुरक्षित</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-3.5">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Cpu className="h-3.5 w-3.5 text-purple-400" />
                    <span>AI मॉडल मोड:</span>
                  </div>
                  <p className="text-base font-bold text-purple-300 font-mono capitalize">
                    {settings.modelMode}
                  </p>
                </div>
              </div>

              {/* Data Isolation Guarantee */}
              <div className="rounded-2xl border border-slate-800/80 bg-[#060a16] p-3.5 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  इस खाते का चैट इतिहास, फाइलें और सेटिंग्स पूरी तरह अलग और सुरक्षित हैं। किसी अन्य यूजर के खाते में आपका डेटा कभी दिखाई नहीं देगा।
                </p>
              </div>

              {/* Logout button & Confirmation */}
              <div className="pt-2 border-t border-slate-800/80">
                {showLogoutConfirm ? (
                  <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-b from-rose-950/60 to-[#070b16] p-4 text-center space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-100">
                        क्या आप NAFEES AI से लॉगआउट करना चाहते हैं?
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        आपका डेटा और चैट इतिहास सुरक्षित रहेगा। आप कभी भी दोबारा लॉगिन कर सकते हैं।
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLogoutConfirm(false);
                          onLogout();
                        }}
                        className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(225,29,72,0.4)] hover:from-rose-500 hover:to-red-500 transition-all active:scale-95"
                      >
                        हाँ, लॉगआउट करें
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-950/30 border border-rose-500/30 py-2.5 px-4 text-xs font-bold text-rose-300 hover:bg-rose-900/40 hover:text-white transition-all active:scale-98"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>खाते से लॉगआउट करें (Logout)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-150">
              {/* Avatar Selection & Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  प्रोफ़ाइल फोटो (Profile Photo)
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full border-2 border-cyan-500/40 p-0.5 bg-[#050811] shrink-0">
                    {editAvatar ? (
                      <img
                        src={editAvatar}
                        alt="Preview"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 font-bold">
                        {editName.charAt(0) || 'U'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-black shadow-md hover:bg-cyan-400 transition-colors"
                      title="डिवाइस से फोटो चुनें"
                    >
                      <Camera className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      गैलरी/डिवाइस से अपलोड करें
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1">
                      JPG, PNG या WEBP (अधिकतम 2MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                </div>

                {/* Preset Avatars */}
                <div className="mt-3">
                  <span className="text-[11px] text-slate-400 block mb-1.5">
                    या इनमें से कोई अवतार चुनें:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {avatarPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditAvatar(preset)}
                        className={`h-10 w-10 rounded-full border-2 p-0.5 shrink-0 transition-transform hover:scale-105 ${
                          editAvatar === preset
                            ? 'border-cyan-400 ring-2 ring-cyan-500/40'
                            : 'border-slate-800 bg-[#060a16]'
                        }`}
                      >
                        <img src={preset} alt="preset" className="h-full w-full rounded-full" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Name field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  यूज़र का नाम (User Name)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Mobile / Email field */}
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
                    value={editIdentifier}
                    onChange={(e) => setEditIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 px-4 font-bold text-black hover:bg-cyan-400 active:scale-98 transition-all text-xs sm:text-sm shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>बदलाव सहेजें (Save Changes)</span>
              </button>
            </form>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  वर्तमान पासवर्ड (Current Password)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="वर्तमान पासवर्ड दर्ज करें"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  नया पासवर्ड (New Password - न्यूनतम 4 अक्षर)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="नया पासवर्ड दर्ज करें"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  नया पासवर्ड कन्फर्म करें (Confirm New Password)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={confirmNewPass}
                    onChange={(e) => setConfirmNewPass(e.target.value)}
                    placeholder="नया पासवर्ड दोबारा दर्ज करें"
                    className="w-full rounded-xl border border-slate-800 bg-[#060a16] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 px-4 font-bold text-black hover:bg-cyan-400 active:scale-98 transition-all text-xs sm:text-sm shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{isSaving ? 'सहेजा जा रहा है...' : 'पासवर्ड अपडेट करें (Update Password)'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-[#050811] px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
