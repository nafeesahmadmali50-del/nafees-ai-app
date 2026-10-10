import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  GraduationCap,
  Briefcase,
  Mic,
  Settings,
  HelpCircle,
  X,
  Trash2,
  Edit2,
  Check,
  Search,
  Bot,
  Sparkles,
  Wand2,
  Film,
  User,
} from 'lucide-react';
import { Conversation, AppMode, AppSettings, UserProfile } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: (mode?: AppMode) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onClearAllChats: () => void;
  onOpenVoice: () => void;
  onOpenStudyTools: () => void;
  onOpenBusinessTools: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
  user: UserProfile | null;
  settings: AppSettings;
  onSetMode?: (mode: AppMode) => void;
  onOpenImageGen: () => void;
  onOpenVideoGen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onClearAllChats,
  onOpenVoice,
  onOpenStudyTools,
  onOpenBusinessTools,
  onOpenSettings,
  onOpenHelp,
  onOpenProfile,
  user,
  settings,
  onSetMode,
  onOpenImageGen,
  onOpenVideoGen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  // Group conversations by date
  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const startEditing = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveEditing = (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${timeStr}`;
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[85%] max-w-[320px] flex-col border-r border-cyan-500/20 bg-[#070b16] text-slate-200 shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-wider text-cyan-300">NAFEES AI</h2>
              <p className="text-[10px] text-slate-400">आपका स्मार्ट AI साथी</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile Card */}
        {user && (
          <div className="p-3 pb-0">
            <button
              onClick={() => {
                onOpenProfile();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-2xl p-2.5 text-xs text-slate-200 bg-[#090f20]/90 hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-500/40 transition-all group shadow-sm text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden border border-cyan-500/30 bg-[#070b16] shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-cyan-600 text-white font-bold text-xs">
                      {user.name ? user.name.slice(0, 1).toUpperCase() : <User className="h-4 w-4" />}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                    <span className="truncate">{user.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {user.identifier}
                  </div>
                </div>
              </div>
              <span className="rounded-lg bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300 border border-cyan-500/20 shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                प्रोफ़ाइल
              </span>
            </button>
          </div>
        )}

        {/* Primary Action: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat('normal');
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 py-2.5 px-4 font-semibold text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all hover:brightness-110 active:scale-98 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>+ नया चैट (New Chat)</span>
          </button>
        </div>

        {/* Core Navigation Items */}
        <div className="px-3 py-1 space-y-1 text-xs font-medium">
          <button
            onClick={() => {
              onSetMode?.('study');
              onOpenStudyTools();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="font-semibold text-sm">Study Mode (पढ़ाई)</span>
            </div>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 font-mono">6 टूल्स</span>
          </button>

          <button
            onClick={() => {
              onSetMode?.('business');
              onOpenBusinessTools();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-300 border border-transparent hover:border-emerald-500/30 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Briefcase className="h-4 w-4" />
              </span>
              <span className="font-semibold text-sm">Business Mode (बिजनेस)</span>
            </div>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 font-mono">6 टूल्स</span>
          </button>

          <button
            onClick={() => {
              onOpenVoice();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 border border-transparent hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
                <Mic className="h-4 w-4" />
              </span>
              <span className="font-semibold text-sm">Voice Chat (बोलकर बात)</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
          </button>

          <button
            onClick={() => {
              onOpenImageGen();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-slate-200 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 hover:text-cyan-200 border border-transparent hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                <Wand2 className="h-4 w-4" />
              </span>
              <span className="font-semibold text-sm">Image (AI Image बनाएं)</span>
            </div>
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300 font-mono">NEW</span>
          </button>

          <button
            onClick={() => {
              onOpenVideoGen();
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-slate-200 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-indigo-500/10 hover:text-cyan-200 border border-transparent hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                <Film className="h-4 w-4" />
              </span>
              <span className="font-semibold text-sm">Video (AI Video बनाएं)</span>
            </div>
            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300 font-mono">NEW</span>
          </button>
        </div>

        {/* Chat History Header & Search */}
        <div className="mt-2 border-t border-slate-800/80 px-4 pt-3 pb-1">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            <span>चैट हिस्ट्री (History)</span>
            <span className="text-[11px] text-cyan-400 font-mono">({conversations.length})</span>
          </div>

          {/* Quick search */}
          {conversations.length > 3 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="चैट खोजें..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-[#0c1220] py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Chat History Scroll List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {searchQuery ? 'कोई चैट नहीं मिला' : 'अभी कोई पुरानी चैट नहीं है। नया सवाल पूछें!'}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeChatId;
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectChat(c.id);
                      onClose();
                    }
                  }}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => saveEditing(c.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 w-full"
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-full rounded bg-slate-800 px-2 py-0.5 text-xs text-white border border-cyan-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded p-1 text-emerald-400 hover:bg-slate-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatTimestamp(c.updatedAt)}
                          {c.mode !== 'normal' && (
                            <span className="ml-1 text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {c.mode}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions (Rename, Delete) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEditing(c, e)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                        title="नाम बदलें"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(c.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400"
                        title="चैट हटाएं"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Clear All History if conversations exist */}
        {conversations.length > 0 && (
          <div className="px-3 py-1">
            {confirmClear ? (
              <div className="flex items-center justify-between rounded-lg bg-rose-950/40 border border-rose-500/30 p-2 text-xs">
                <span className="text-rose-300">सभी चैट हटाएं?</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      onClearAllChats();
                      setConfirmClear(false);
                    }}
                    className="rounded bg-rose-600 px-2 py-0.5 font-bold text-white"
                  >
                    हाँ
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="rounded bg-slate-800 px-2 py-0.5 text-slate-300"
                  >
                    नहीं
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>सभी इतिहास साफ़ करें</span>
              </button>
            )}
          </div>
        )}

        {/* Footer: Profile, Settings & Help */}
        <div className="border-t border-slate-800/80 p-3 space-y-1 bg-[#050811]">
          <button
            onClick={() => {
              onOpenProfile();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <User className="h-4 w-4 text-emerald-400" />
            <span className="font-medium">Profile (प्रोफ़ाइल)</span>
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Settings className="h-4 w-4 text-cyan-400" />
            <span className="font-medium">Settings (सेटिंग्स)</span>
          </button>

          <button
            onClick={() => {
              onOpenHelp();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <HelpCircle className="h-4 w-4 text-blue-400" />
            <span className="font-medium">Help & Support (मदद)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
