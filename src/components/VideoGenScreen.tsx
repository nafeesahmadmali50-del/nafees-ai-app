import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Bookmark,
  RotateCcw,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Mic,
  Clock,
  Trash2,
  ShieldAlert,
  ExternalLink,
  Copy,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  AppSettings,
  VideoStyleChoice,
  VideoAspectRatio,
  VideoDuration,
  GeneratedVideoItem,
} from '../types';
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../services/speech';
import {
  loadVideoHistory,
  saveVideoToHistory,
  deleteVideoFromHistory,
  clearVideoHistory,
} from '../services/videoHistory';

interface VideoGenScreenProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

const STYLE_CHOICES: Array<{ id: VideoStyleChoice; labelHi: string; icon: string }> = [
  { id: 'Realistic', labelHi: 'Realistic (यथार्थवादी)', icon: '🎥' },
  { id: 'Cinematic', labelHi: 'Cinematic (सिनेमैटिक)', icon: '🎬' },
  { id: '3D Cartoon', labelHi: '3D Cartoon (3D कार्टून)', icon: '🧸' },
  { id: 'Product Ad', labelHi: 'Product Ad (प्रोडक्ट विज्ञापन)', icon: '💎' },
  { id: 'Islamic', labelHi: 'Islamic (इस्लामिक दृश्य)', icon: '🌙' },
  { id: 'Animation', labelHi: 'Animation (एनिमेशन)', icon: '⚡' },
];

const ASPECT_RATIOS: Array<{ id: VideoAspectRatio; label: string; desc: string }> = [
  { id: '9:16', label: 'Portrait 9:16', desc: 'रील्स / शॉर्ट्स / वर्टिकल' },
  { id: '16:9', label: 'Landscape 16:9', desc: 'यूट्यूब / टीवी / हॉरिज़ॉन्टल' },
];

const DURATIONS: Array<{ id: VideoDuration; label: string }> = [
  { id: 8, label: '8 सेकंड (8s) - Default' },
  { id: 6, label: '6 सेकंड (6s)' },
  { id: 4, label: '4 सेकंड (4s)' },
];

const PROMPT_SUGGESTIONS = [
  {
    label: '🤖 बारिश में चलता हुआ रोबोट',
    prompt:
      'बारिश वाली रात में एक futuristic robot सड़क पर धीरे-धीरे आगे चलता है। उसके हाथ और पैर प्राकृतिक रूप से चलें, बारिश गिरती रहे, सड़क पर पानी में reflections हिलें, camera धीरे-धीरे robot के साथ आगे tracking करे, cinematic realistic video, vertical 9:16.',
    ratio: '9:16' as VideoAspectRatio,
    style: 'Realistic' as VideoStyleChoice,
    duration: 8 as VideoDuration,
  },
  {
    label: '🧸 3D कार्टून बच्चा',
    prompt: '3D cartoon बच्चा पार्क में दौड़ रहा है, green trees, bright daylight, laughing',
    ratio: '9:16' as VideoAspectRatio,
    style: '3D Cartoon' as VideoStyleChoice,
    duration: 6 as VideoDuration,
  },
  {
    label: '✨ Luxury Cosmetic Ad',
    prompt: 'luxury cosmetic product ad with soft golden light, water drops, 360 slow rotation',
    ratio: '16:9' as VideoAspectRatio,
    style: 'Product Ad' as VideoStyleChoice,
    duration: 8 as VideoDuration,
  },
  {
    label: '🌙 Islamic Night Scene',
    prompt: 'Islamic night scene with moon and lanterns, warm candles, peaceful spiritual night sky',
    ratio: '16:9' as VideoAspectRatio,
    style: 'Islamic' as VideoStyleChoice,
    duration: 8 as VideoDuration,
  },
];

export const VideoGenScreen: React.FC<VideoGenScreenProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [prompt, setPrompt] = useState(
    'बारिश वाली रात में एक futuristic robot सड़क पर धीरे-धीरे आगे चलता है। उसके हाथ और पैर प्राकृतिक रूप से चलें, बारिश गिरती रहे, सड़क पर पानी में reflections हिलें, camera धीरे-धीरे robot के साथ आगे tracking करे, cinematic realistic video, vertical 9:16.'
  );
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('9:16');
  const [style, setStyle] = useState<VideoStyleChoice>('Realistic');
  const [duration, setDuration] = useState<VideoDuration>(8);
  const [activeMethod, setActiveMethod] = useState<'direct' | 'flow'>('direct');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [currentVideoItem, setCurrentVideoItem] = useState<GeneratedVideoItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBillingNotice, setIsBillingNotice] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [flowToast, setFlowToast] = useState<string | null>(null);
  const [copiedPromptSuccess, setCopiedPromptSuccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [historyTabOpen, setHistoryTabOpen] = useState(false);
  const [historyList, setHistoryList] = useState<GeneratedVideoItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const recognizerRef = useRef<any>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Load history on mount or open
  useEffect(() => {
    if (isOpen) {
      setHistoryList(loadVideoHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle Voice Input for Prompt
  const toggleVoiceInput = () => {
    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (isSpeechRecognitionSupported()) {
      try {
        const recognizer = createSpeechRecognizer(settings.speechLang || 'hi-IN', {
          onStart: () => setIsListening(true),
          onResult: (text) => {
            if (text) {
              setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
            }
          },
          onError: () => setIsListening(false),
          onEnd: () => setIsListening(false),
        });
        if (recognizer) {
          recognizerRef.current = recognizer;
          recognizer.start();
        }
      } catch {
        setIsListening(false);
      }
    }
  };

  // Copy Prompt to Clipboard helper
  const copyPromptToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      return true;
    } catch {
      return false;
    }
  };

  // Handler: Open in Google Flow
  const handleOpenGoogleFlow = () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      setErrorMessage('कृपया पहले वीडियो के लिए कोई प्रॉम्प्ट लिखें।');
      return;
    }

    // 1. Copy current video prompt to clipboard
    copyPromptToClipboard(finalPrompt);

    // 2. Show exact required message
    setFlowToast('Prompt कॉपी हो गया। Google Flow में Paste करें।');
    setTimeout(() => setFlowToast(null), 5000);

    // 3. Open official Google Flow website in a new tab/window
    window.open('https://labs.google/flow', '_blank', 'noopener,noreferrer');
  };

  // Quick manual Copy Prompt button handler
  const handleManualCopyPrompt = () => {
    if (!prompt.trim()) return;
    copyPromptToClipboard(prompt.trim());
    setCopiedPromptSuccess(true);
    setTimeout(() => setCopiedPromptSuccess(false), 2500);
  };

  // Video Generation Handler: Direct Veo API
  const handleGenerate = async (
    customPrompt?: string,
    customRatio?: VideoAspectRatio,
    customStyle?: VideoStyleChoice,
    customDuration?: VideoDuration
  ) => {
    const finalPrompt = (customPrompt || prompt).trim();
    const finalRatio = customRatio || aspectRatio;
    const finalStyle = customStyle || style;
    const finalDuration = customDuration || duration;

    if (!finalPrompt) {
      setErrorMessage('कृपया वीडियो बनाने के लिए कोई विवरण (prompt) लिखें।');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setIsBillingNotice(false);
    setDownloadSuccess(false);
    setSavedSuccess(false);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio: finalRatio,
          style: finalStyle,
          duration: finalDuration,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (
          response.status === 429 ||
          data?.error?.includes('billing') ||
          data?.error?.includes('API access')
        ) {
          setIsBillingNotice(true);
          setErrorMessage('Veo वीडियो जनरेशन के लिए API access या billing की आवश्यकता है।');
        } else {
          setErrorMessage(data?.error || 'असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।');
        }
        setIsGenerating(false);
        return;
      }

      if (!data?.videoUrl) {
        setErrorMessage('असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।');
        setIsGenerating(false);
        return;
      }

      const newItem: GeneratedVideoItem = {
        id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        prompt: finalPrompt,
        style: finalStyle,
        aspectRatio: finalRatio,
        duration: finalDuration,
        videoUrl: data.videoUrl,
        isVeoVideo: true,
        createdAt: Date.now(),
      };

      setCurrentVideo(data.videoUrl);
      setCurrentVideoItem(newItem);

      // Save to history automatically
      const updated = saveVideoToHistory(newItem);
      setHistoryList(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      setIsGenerating(false);
    } catch {
      setIsGenerating(false);
      setErrorMessage('असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।');
    }
  };

  // Explicit Save to History Button
  const handleSaveToHistory = () => {
    if (!currentVideoItem) return;
    const updated = saveVideoToHistory(currentVideoItem);
    setHistoryList(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Download Handler
  const handleDownload = () => {
    if (!currentVideo) return;

    try {
      const link = document.createElement('a');
      link.href = currentVideo;
      link.download = `nafees_ai_veo_${style.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch {
      window.open(currentVideo, '_blank');
    }
  };

  // Clear / New Video Handler
  const handleClearNewVideo = () => {
    setCurrentVideo(null);
    setCurrentVideoItem(null);
    setErrorMessage(null);
    setIsBillingNotice(false);
    setPrompt('');
  };

  // Select Item from History
  const handleSelectHistoryItem = (item: GeneratedVideoItem) => {
    setCurrentVideo(item.videoUrl);
    setCurrentVideoItem(item);
    setPrompt(item.prompt);
    setAspectRatio(item.aspectRatio);
    setStyle(item.style);
    setDuration(item.duration);
    setHistoryTabOpen(false);
    setErrorMessage(null);
    setIsBillingNotice(false);
  };

  // Delete Item from History
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteVideoFromHistory(id);
    setHistoryList(updated);
    if (currentVideoItem?.id === id) {
      setCurrentVideoItem(null);
    }
  };

  // Clear All Video History
  const handleClearAllHistory = () => {
    if (window.confirm('क्या आप सच में पूरी वीडियो हिस्ट्री हटाना चाहते हैं?')) {
      clearVideoHistory();
      setHistoryList([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050811] text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-cyan-500/20 bg-[#050811]/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base tracking-wide text-cyan-300">
                AI Video बनाएं
              </h2>
              <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                Google Veo & Flow
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Direct Veo API या Google Flow Subscription द्वारा असली मोशन AI वीडियो तैयार करें
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History Toggle Button */}
          <button
            onClick={() => setHistoryTabOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              historyTabOpen
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-800 bg-[#0c1220] text-slate-300 hover:border-cyan-500/40 hover:text-white'
            }`}
            title="वीडियो हिस्ट्री देखें"
          >
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">वीडियो हिस्ट्री</span>
            <span className="font-mono text-[10px] bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-300">
              {historyList.length}
            </span>
          </button>

          {/* Close Screen Button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0c1220] text-slate-300 hover:border-cyan-500/40 hover:text-white active:scale-95 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Google Flow Toast Notification */}
        {flowToast && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-950/70 p-4 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Check className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="text-sm font-bold">{flowToast}</p>
            </div>
            <button
              onClick={() => setFlowToast(null)}
              className="text-xs text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Banner: Billing / API Access Notice OR Generation Failure */}
        {errorMessage && (
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border p-4 shadow-lg animate-fadeIn ${
              isBillingNotice
                ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
                : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isBillingNotice ? (
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-bold">{errorMessage}</p>
                {isBillingNotice && (
                  <p className="text-xs text-amber-300/90 font-medium">
                    💡 <strong>सिफारिश:</strong> आप Google Flow subscription से वीडियो बना सकते हैं।
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              {isBillingNotice ? (
                <button
                  onClick={handleOpenGoogleFlow}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:brightness-110 active:scale-95 transition-all w-full sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Google Flow में खोलें</span>
                </button>
              ) : (
                <button
                  onClick={() => handleGenerate()}
                  className="rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 active:scale-95 transition-all"
                >
                  फिर कोशिश करें
                </button>
              )}
            </div>
          </div>
        )}

        {/* Video History Drawer / Section */}
        {historyTabOpen && (
          <div className="rounded-3xl border border-cyan-500/30 bg-[#080d1a] p-4 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-cyan-200">
                  सेव की गई असली वीडियो हिस्ट्री ({historyList.length})
                </h3>
              </div>
              {historyList.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>पूरी हिस्ट्री हटाएं</span>
                </button>
              )}
            </div>

            {historyList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                अभी तक कोई असली वीडियो सेव नहीं हुआ है। वीडियो बनाकर "Save to History" दबाएं।
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-96 overflow-y-auto pr-1">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistoryItem(item)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-[#050811] hover:border-cyan-500/50 transition-all p-2.5 flex flex-col justify-between"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black mb-2 flex items-center justify-center">
                      <video
                        src={item.videoUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                        <div className="h-8 w-8 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-lg">
                          <Play className="h-4 w-4 ml-0.5 fill-white" />
                        </div>
                      </div>
                      <span className="absolute top-1.5 left-1.5 bg-black/80 font-mono text-[9px] text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                        Veo AI Video
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 bg-black/80 font-mono text-[10px] text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                        {item.duration}s
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        title="हटाएं"
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-lg bg-black/70 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-colors opacity-80 hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[12px] text-slate-200 line-clamp-2 leading-snug font-medium">
                        {item.prompt}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60 font-mono">
                        <span className="text-cyan-400">{item.style}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Real Video Preview Player */}
        {currentVideo && (
          <div className="rounded-3xl border border-cyan-500/35 bg-[#090e1c] p-4 sm:p-6 shadow-[0_0_35px_rgba(6,182,212,0.18)] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
                <span className="text-xs font-bold text-emerald-300">
                  असली AI वीडियो तैयार है!
                </span>
                <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  Veo AI Video
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-md">
                  {style}
                </span>
                <span className="bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md">
                  {aspectRatio}
                </span>
                <span className="bg-cyan-900/60 text-cyan-200 px-2 py-0.5 rounded-md font-bold">
                  {duration}s
                </span>
              </div>
            </div>

            {/* Video Player Box with Full HTML5 Video Controls (Play, Pause, Seek, Sound, Fullscreen, Loop) */}
            <div className="relative mx-auto flex items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/30 bg-black shadow-2xl p-1">
              <video
                ref={videoPlayerRef}
                src={currentVideo}
                controls
                autoPlay
                loop
                playsInline
                muted={isMuted}
                className={`max-h-[60vh] w-auto object-contain rounded-xl bg-black ${
                  aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
                }`}
              />
              {/* Floating Veo Badge */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur border border-cyan-500/40 rounded-lg px-2 py-1 text-[11px] font-bold text-cyan-300 flex items-center gap-1.5 shadow-md pointer-events-none">
                <Film className="h-3 w-3 text-cyan-400" />
                <span>Veo AI Video</span>
              </div>
            </div>

            {/* Prompt details */}
            <p className="text-xs text-slate-300 bg-[#060a14] p-3 rounded-xl border border-slate-800/80 italic leading-relaxed">
              &ldquo;{prompt}&rdquo;
            </p>

            {/* Action Buttons: Download, Save to History, Generate Again, Clear / New Video */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* 1. Download Video Button */}
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 px-3 font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all text-xs sm:text-sm"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>डाउनलोड हो गया!</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Video</span>
                  </>
                )}
              </button>

              {/* 2. Save to History Button */}
              <button
                onClick={handleSaveToHistory}
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 py-3 px-3 font-bold text-blue-300 hover:bg-blue-500/20 active:scale-95 transition-all text-xs sm:text-sm"
              >
                {savedSuccess ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-300">हिस्ट्री में सेव है!</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    <span>Save to History</span>
                  </>
                )}
              </button>

              {/* 3. Generate Again */}
              <button
                onClick={() => handleGenerate()}
                className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-3 px-3 font-bold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all text-xs sm:text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                <span>दोबारा बनाएं</span>
              </button>

              {/* 4. Clear / New Video */}
              <button
                onClick={handleClearNewVideo}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 py-3 px-3 font-bold text-slate-200 hover:bg-slate-800 active:scale-95 transition-all text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Clear / New Video</span>
              </button>
            </div>
          </div>
        )}

        {/* Video Generator Controls Form */}
        <div className="rounded-3xl border border-cyan-500/25 bg-[#090e1c]/90 p-4 sm:p-6 shadow-xl backdrop-blur space-y-6">
          {/* Method Selection Tabs: 1. Direct Veo API  |  2. Google Flow Subscription */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <p className="text-xs font-semibold text-slate-400">वीडियो बनाने का माध्यम (Generation Method):</p>
              <h3 className="text-sm font-bold text-cyan-300 mt-0.5">
                {activeMethod === 'flow' ? 'Google Flow Subscription Mode' : 'Direct Veo API Mode'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 bg-[#060a14] p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveMethod('direct')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeMethod === 'direct'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Direct Veo API
              </button>
              <button
                type="button"
                onClick={() => setActiveMethod('flow')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  activeMethod === 'flow'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>2. Google Flow</span>
                <span className="bg-indigo-900/60 text-indigo-300 px-1 py-0.2 rounded text-[9px]">SUB</span>
              </button>
            </div>
          </div>

          {/* Large Prompt Input Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>Video Prompt (वीडियो का वास्तविक विवरण):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualCopyPrompt}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
                  title="प्रॉम्प्ट कॉपी करें"
                >
                  {copiedPromptSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-300">कॉपी हो गया!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>प्रॉम्प्ट कॉपी करें</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-500">|</span>
                <span className="text-[11px] text-slate-400">Hindi / Hinglish / English</span>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="उदा. बारिश वाली रात में एक futuristic robot सड़क पर धीरे-धीरे आगे चलता है। उसके हाथ और पैर प्राकृतिक रूप से चलें, बारिश गिरती रहे, camera धीरे-धीरे robot के साथ आगे tracking करे..."
                className="w-full resize-none rounded-2xl border border-slate-800 bg-[#060a14] p-4 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 leading-relaxed font-sans"
              />

              {/* Voice Typing Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isGenerating}
                title={isListening ? 'माइक बंद करें' : 'बोलकर लिखें (Voice Typing)'}
                className={`absolute right-3.5 bottom-3.5 flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                  isListening
                    ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse'
                    : 'border-slate-800 bg-[#0c1220] text-slate-400 hover:text-cyan-300'
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Style Choices (Realistic, 3D Cartoon, Cinematic, Product Ad, Islamic, Animation) */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2">
              Style चुनें:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {STYLE_CHOICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setStyle(s.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    style === s.id
                      ? 'border-cyan-500/70 bg-gradient-to-b from-cyan-500/20 to-indigo-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                      : 'border-slate-800 bg-[#070c18] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl mb-1">{s.icon}</span>
                  <span className="text-xs font-semibold">{s.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Video Duration (4s, 6s, 8s) & Aspect Ratio (9:16, 16:9) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Duration (4s, 6s, 8s - Default: 8s) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2">
                Video Duration (लंबाई):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setDuration(d.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                      duration === d.id
                        ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                        : 'border-slate-800 bg-[#070c18] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold">{d.id} सेकंड</span>
                    <span className="text-[10px] opacity-75">{d.id === 8 ? 'Default' : `${d.id}s`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio (Portrait 9:16, Landscape 16:9 - No 1:1) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2">
                Aspect Ratio (आस्पेक्ट रेशियो):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setAspectRatio(item.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                      aspectRatio === item.id
                        ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                        : 'border-slate-800 bg-[#070c18] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-extrabold text-xs">{item.label}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Settings Summary Chips - Always visible in NAFEES AI */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-[#060a14] border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-semibold">चयनित सेटिंग्स:</span>
            <span className="bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-md font-mono">
              Style: {style}
            </span>
            <span className="bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-md font-mono">
              Ratio: {aspectRatio}
            </span>
            <span className="bg-blue-950/80 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-md font-mono">
              Duration: {duration}s
            </span>
          </div>

          {/* Prompt Suggestions */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">
              प्रॉम्प्ट सुझाव (Prompt Suggestions):
            </p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setAspectRatio(p.ratio);
                    setStyle(p.style);
                    setDuration(p.duration);
                  }}
                  className="rounded-xl border border-slate-800 bg-[#070c18] px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200 transition-all active:scale-95 text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Google Flow Instruction Card */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-[#070d1d] to-cyan-950/30 p-4 space-y-2 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                Google Flow गाइड (Step-by-step Instruction):
              </p>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200 bg-[#050811]/70 p-3 rounded-xl border border-indigo-500/20 leading-relaxed font-mono">
              Google Flow खुले → Prompt paste करें → Veo model चुनें → Generate करें → वीडियो Download करें.
            </p>
          </div>

          {/* Primary Action Buttons: 
              1. Large "Google Flow में खोलें" button (Subscription Mode)
              2. "Generate Video (Direct Veo API)" button */}
          <div className="space-y-3 pt-1">
            {/* 1. Large Button: "Google Flow में खोलें" */}
            <button
              type="button"
              onClick={handleOpenGoogleFlow}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 py-4 px-6 font-extrabold text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:brightness-110 active:scale-98 transition-all text-base tracking-wide"
            >
              <ExternalLink className="h-5 w-5" />
              <span>Google Flow में खोलें</span>
            </button>

            {/* 2. Direct Veo API Button (or Generating loader) */}
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-cyan-500/30 bg-[#060a14] space-y-3 shadow-inner">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                <p className="text-base font-bold text-cyan-200 tracking-wide animate-pulse">
                  वीडियो बनाया जा रहा है...
                </p>
                <p className="text-xs text-slate-400 text-center">
                  Google Veo 3.1 मॉडल द्वारा असली वीडियो तैयार किया जा रहा है। इसमें कुछ समय लग सकता है...
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={!prompt.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/40 bg-[#070c18] hover:bg-cyan-500/10 py-3 px-5 font-bold text-cyan-300 hover:text-white active:scale-98 transition-all disabled:opacity-50 text-sm"
              >
                <Film className="h-4 w-4 text-cyan-400" />
                <span>Direct Veo API से बनाएं (API Mode)</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
