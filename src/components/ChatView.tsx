import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowDown,
  GraduationCap,
  Briefcase,
  Lightbulb,
  Code2,
  BookOpen,
  AlertCircle,
  RefreshCw,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { Message, AppMode, AppSettings } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  WELCOME_MESSAGE_HINDI,
  QUICK_ACTIONS,
  isTechnicalErrorText,
  PAST_BUSY_MESSAGE,
  CURRENT_BUSY_MESSAGE,
} from '../services/storage';
import { copyToClipboard } from '../services/clipboard';
import { speakText, stopSpeaking } from '../services/speech';

interface ChatViewProps {
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  retryNotice?: string | null;
  onSendPrompt: (prompt: string) => void;
  onRegenerate: () => void;
  onRetryMessage?: (messageId: string) => void;
  currentMode: AppMode;
  settings: AppSettings;
  onOpenStudyTools: () => void;
  onOpenBusinessTools: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  isStreaming,
  streamingText,
  retryNotice,
  onSendPrompt,
  onRegenerate,
  onRetryMessage,
  currentMode,
  settings,
  onOpenStudyTools,
  onOpenBusinessTools,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'success' | 'error' | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll when messages update or streaming changes
  useEffect(() => {
    if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, streamingText, isStreaming, showScrollBottom]);

  // Track scroll position
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const handleCopy = async (id: string, text: string) => {
    // Only copy clean AI answer content (no technical codes or UI elements)
    const success = await copyToClipboard(text);
    setCopiedId(id);
    setCopyStatus(success ? 'success' : 'error');
    setTimeout(() => {
      setCopiedId(null);
      setCopyStatus(null);
    }, 2400);
  };

  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }

    stopSpeaking();
    setSpeakingId(id);
    speakText(text, {
      lang: settings.speechLang || 'hi-IN',
      rate: settings.voiceRate || 1.0,
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 no-scrollbar"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        {!hasMessages ? (
          // Welcome Screen
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            {/* Logo Emblem */}
            <div className="relative mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 shadow-[0_0_30px_rgba(6,182,212,0.45)]">
              <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-white animate-pulse" />
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 opacity-30 blur-md"></div>
            </div>

            {/* App Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              NAFEES AI
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-cyan-400">
              आपका अपना सुपरफास्ट AI साथी • Hindi & English
            </p>

            {/* Hindi Welcome Box */}
            <div className="mt-5 w-full max-w-lg rounded-2xl border border-cyan-500/25 bg-[#090e1c]/80 p-4 sm:p-5 text-left shadow-[0_4px_25px_rgba(0,0,0,0.5)] backdrop-blur">
              <div className="whitespace-pre-line text-sm sm:text-[15px] leading-relaxed text-slate-200 font-medium">
                {WELCOME_MESSAGE_HINDI}
              </div>
            </div>

            {/* Mode-specific quick entry banners */}
            {currentMode === 'study' && (
              <div className="mt-4 flex w-full max-w-lg items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-left">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="h-5 w-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-300">Study Mode एक्टिव है</p>
                    <p className="text-[11px] text-amber-200/80">टाइमटेबल, नोट्स, MCQ प्रैक्टिस व आसान स्पष्टीकरण</p>
                  </div>
                </div>
                <button
                  onClick={onOpenStudyTools}
                  className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-400"
                >
                  टूल्स खोलें
                </button>
              </div>
            )}

            {currentMode === 'business' && (
              <div className="mt-4 flex w-full max-w-lg items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-left">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Business Mode एक्टिव है</p>
                    <p className="text-[11px] text-emerald-200/80">बिजनेस प्लान, मार्केटिंग, लागत और मुनाफा कैलकुलेटर</p>
                  </div>
                </div>
                <button
                  onClick={onOpenBusinessTools}
                  className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-emerald-400"
                >
                  टूल्स खोलें
                </button>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="mt-6 w-full max-w-lg">
              <p className="text-xs font-semibold text-slate-400 mb-2.5 text-center">
                सुझाव (Quick Actions):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => {
                  let Icon = Lightbulb;
                  if (action.id === 'study') Icon = GraduationCap;
                  if (action.id === 'business') Icon = Briefcase;
                  if (action.id === 'code') Icon = Code2;

                  return (
                    <button
                      key={action.id}
                      onClick={() => onSendPrompt(action.prompt)}
                      className="group flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0a0f1d] p-3 text-left text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:bg-[#0e162a] hover:text-cyan-200 shadow-md transition-all active:scale-98"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-950/70 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 font-semibold">{action.labelHi}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Message List
          <div className="space-y-5">
            {/* Study Mode Active Sticky Badge & Quick Tutor Helpers */}
            {currentMode === 'study' && (
              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#0e1628] to-amber-950/30 p-2.5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <GraduationCap className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-amber-300">
                      Study Mode (पढ़ाई) • पर्सनल ट्यूटर एक्टिव है
                    </span>
                  </div>
                  <button
                    onClick={onOpenStudyTools}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    🛠️ सभी टूल्स
                  </button>
                </div>
                {/* Quick interactive tutor actions */}
                <div className="mt-2 flex flex-wrap gap-1.5 pt-1.5 border-t border-amber-500/15">
                  <button
                    onClick={() => onSendPrompt('कृपया इस टॉपिक को और आसान भाषा में रोज़मर्रा के उदाहरण से समझाइए।')}
                    className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 transition-all active:scale-95"
                  >
                    💡 और आसान भाषा में समझाओ
                  </button>
                  <button
                    onClick={() => onSendPrompt('अब इसी topic पर मेरा 3 सवालों का test लो।')}
                    className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 transition-all active:scale-95"
                  >
                    📝 मेरा 3 सवालों का Test लो
                  </button>
                  <button
                    onClick={() => onSendPrompt('कृपया इस विषय के मुख्य बिंदु और परीक्षा रिवीजन नोट्स बनाएं।')}
                    className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 transition-all active:scale-95"
                  >
                    📚 रिवीजन नोट्स बनाएं
                  </button>
                </div>
              </div>
            )}

            {/* Business Mode Active Sticky Badge & Quick Assistant Helpers */}
            {currentMode === 'business' && (
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#0a151f] to-emerald-950/30 p-2.5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Briefcase className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-emerald-300">
                      Business Mode (बिजनेस) • प्रैक्टिकल बिजनेस असिस्टेंट एक्टिव है
                    </span>
                  </div>
                  <button
                    onClick={onOpenBusinessTools}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    🛠️ सभी टूल्स
                  </button>
                </div>
                {/* Quick interactive business actions */}
                <div className="mt-2 flex flex-wrap gap-1.5 pt-1.5 border-t border-emerald-500/15">
                  <button
                    onClick={() => onSendPrompt('कृपया मेरे प्रोडक्ट की लागत और सेलिंग प्राइस से सटीक Profit और Profit Percentage निकालें।')}
                    className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:text-emerald-200 border border-slate-800 hover:border-emerald-500/40 transition-all active:scale-95"
                  >
                    📈 प्रॉफिट व मार्जिन कैलकुलेटर
                  </button>
                  <button
                    onClick={() => onSendPrompt('कृपया मेरे लिए एक आसान और स्टेप-बाय-स्टेप बिजनेस प्लान (Step-by-step Business Plan) तैयार करें।')}
                    className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:text-emerald-200 border border-slate-800 hover:border-emerald-500/40 transition-all active:scale-95"
                  >
                    📋 मेरा Business Plan बनाओ
                  </button>
                  <button
                    onClick={() => onSendPrompt('Amazon, Flipkart और Meesho पर ऑनलाइन सेलिंग शुरू करने की पूरी गाइड और टिप्स दें।')}
                    className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:text-emerald-200 border border-slate-800 hover:border-emerald-500/40 transition-all active:scale-95"
                  >
                    🛒 Amazon / Meesho ऑनलाइन सेलिंग
                  </button>
                  <button
                    onClick={() => onSendPrompt('कृपया मेरे प्रोडक्ट के लिए आकर्षक WhatsApp बिक्री संदेश और ऑफर तैयार करें।')}
                    className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:text-emerald-200 border border-slate-800 hover:border-emerald-500/40 transition-all active:scale-95"
                  >
                    💬 WhatsApp सेल्स मैसेज
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* User Bubble */}
                  {isUser ? (
                    <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-700 to-cyan-700 px-4 py-3 text-white shadow-[0_4px_16px_rgba(6,182,212,0.2)]">
                      {/* Attachment Preview (Image, PDF, Document, CSV) */}
                      {message.attachment && (
                        <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20 bg-black/40">
                          {message.attachment.category === 'image' || message.attachment.mimeType?.startsWith('image/') ? (
                            message.attachment.previewUrl || message.attachment.data ? (
                              <img
                                src={
                                  message.attachment.previewUrl ||
                                  (message.attachment.data.startsWith('data:')
                                    ? message.attachment.data
                                    : `data:${message.attachment.mimeType || 'image/jpeg'};base64,${message.attachment.data}`)
                                }
                                alt={message.attachment.name || 'Attached Image'}
                                className="max-h-64 w-auto rounded-lg object-contain bg-black/50"
                              />
                            ) : (
                              <div className="p-3 text-xs bg-black/40 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>{message.attachment.name || 'इमेज संलग्न'}</span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-black/40">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                                  message.attachment.mimeType === 'application/pdf' ||
                                  message.attachment.name?.endsWith('.pdf')
                                    ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50'
                                    : message.attachment.mimeType?.includes('csv') ||
                                      message.attachment.name?.endsWith('.csv')
                                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                                    : 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                                }`}
                              >
                                {message.attachment.mimeType === 'application/pdf' ||
                                message.attachment.name?.endsWith('.pdf') ? (
                                  <span className="font-extrabold text-[11px]">PDF</span>
                                ) : message.attachment.mimeType?.includes('csv') ||
                                  message.attachment.name?.endsWith('.csv') ? (
                                  <FileSpreadsheet className="h-5 w-5" />
                                ) : (
                                  <FileText className="h-5 w-5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-white">
                                  {message.attachment.name || 'संलग्न दस्तावेज़'}
                                </p>
                                <p className="text-[10px] text-cyan-100/75 mt-0.5 font-mono">
                                  {message.attachment.mimeType === 'application/pdf' ||
                                  message.attachment.name?.endsWith('.pdf')
                                    ? 'PDF Document'
                                    : 'Attached File'}{' '}
                                  {message.attachment.size
                                    ? `• ${(message.attachment.size / 1024).toFixed(0)} KB`
                                    : ''}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed break-words">
                        {message.text}
                      </p>
                      <span className="mt-1 block text-right text-[10px] text-cyan-100/70 font-mono">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ) : (
                    // AI Bubble
                    <div className="group relative w-full rounded-2xl border border-cyan-500/15 bg-[#090e1c] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                      {/* AI Header */}
                      <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.35)]">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-cyan-300">NAFEES AI</span>
                            <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                              {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons on AI bubble */}
                        <div className="flex items-center gap-1">
                          {/* Speak Button */}
                          <button
                            onClick={() => handleSpeak(message.id, message.text)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              speakingId === message.id
                                ? 'bg-cyan-500 text-black shadow-[0_0_8px_#06b6d4]'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
                            }`}
                            title={speakingId === message.id ? 'आवाज़ बंद करें' : 'सुनें (Listen)'}
                          >
                            {speakingId === message.id ? (
                              <VolumeX className="h-3.5 w-3.5" />
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Copy Button */}
                          <div className="relative flex items-center">
                            <button
                              onClick={() => handleCopy(message.id, message.text)}
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all ${
                                copiedId === message.id
                                  ? copyStatus === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
                              }`}
                              title="कॉपी करें"
                              aria-label="जवाब कॉपी करें"
                            >
                              {copiedId === message.id ? (
                                copyStatus === 'success' ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-[11px] font-semibold text-emerald-300">
                                      जवाब कॉपी हो गया ✓
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                                    <span className="text-[11px] font-semibold text-rose-300">
                                      कॉपी नहीं हो पाया। फिर कोशिश करें।
                                    </span>
                                  </>
                                )
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      {(() => {
                        const isError = message.isError || isTechnicalErrorText(message.text);
                        if (isError) {
                          const cleanText = isTechnicalErrorText(message.text)
                            ? (message.text.includes('उस समय') ? PAST_BUSY_MESSAGE : CURRENT_BUSY_MESSAGE)
                            : (message.text.startsWith('⚠️') ? message.text.replace(/^⚠️\s*/, '') : message.text);

                          return (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-sm text-rose-300">
                              <div className="flex items-start gap-2.5 mb-2.5">
                                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                <span className="leading-relaxed font-medium">{cleanText}</span>
                              </div>
                              {onRetryMessage && (
                                <button
                                  onClick={() => onRetryMessage(message.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 active:scale-95 transition-all shadow-sm"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>फिर कोशिश करें</span>
                                </button>
                              )}
                            </div>
                          );
                        }

                        return <MarkdownRenderer content={message.text} />;
                      })()}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Streaming Response Bubble */}
            {isStreaming && (
              <div className="w-full rounded-2xl border border-cyan-500/30 bg-[#090e1c] p-4 sm:p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-in fade-in duration-150">
                <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                      <Sparkles className="h-4 w-4 text-white animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-cyan-300">
                      {streamingText ? 'NAFEES AI' : 'NAFEES AI लिख रहा है...'}
                    </span>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                </div>

                {/* Busy / Auto-Retry Notice */}
                {retryNotice && (
                  <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-300 animate-pulse">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
                    <span>{retryNotice}</span>
                  </div>
                )}

                {streamingText ? (
                  <div>
                    <MarkdownRenderer content={streamingText} />
                    <span className="inline-block h-4 w-1.5 ml-1 bg-cyan-400 animate-pulse"></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2 text-xs text-cyan-400">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce"></span>
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-slate-400 text-xs ml-1">विचार कर रहा हूँ...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-5 sm:right-8 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/40 bg-[#090f20]/90 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur hover:bg-cyan-500 hover:text-black transition-all"
          title="नीचे स्क्रॉल करें"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
