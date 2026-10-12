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
  Wand2,
  Mic,
  Clock,
  Trash2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  AppSettings,
  ImageStyleChoice,
  ImageAspectRatio,
  GeneratedImageItem,
} from '../types';
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../services/speech';
import {
  loadImageHistory,
  saveImageToHistory,
  deleteImageFromHistory,
  clearImageHistory,
} from '../services/imageHistory';

interface ImageGenScreenProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  userId?: string;
}

const STYLE_CHOICES: Array<{ id: ImageStyleChoice; labelHi: string; icon: string }> = [
  { id: 'Realistic', labelHi: 'Realistic (यथार्थवादी)', icon: '📸' },
  { id: '3D Cartoon', labelHi: '3D Cartoon (3D कार्टून)', icon: '🧸' },
  { id: 'Cinematic', labelHi: 'Cinematic (सिनेमैटिक)', icon: '🎬' },
  { id: 'Product Photo', labelHi: 'Product Photo (प्रोडक्ट)', icon: '📦' },
  { id: 'Illustration', labelHi: 'Illustration (इलस्ट्रेशन)', icon: '🎨' },
  { id: 'Anime', labelHi: 'Anime (एनिमे)', icon: '⚡' },
];

const ASPECT_RATIOS: Array<{ id: ImageAspectRatio; label: string; desc: string }> = [
  { id: '1:1', label: 'Square 1:1', desc: 'स्क्वायर' },
  { id: '9:16', label: 'Portrait 9:16', desc: 'वर्टिकल / रील' },
  { id: '16:9', label: 'Landscape 16:9', desc: 'हॉरिज़ॉन्टल / बैनर' },
];

const PRESET_PROMPTS = [
  {
    label: '🤖 3D Robot in Rain',
    prompt: 'बारिश में खड़ा एक प्यारा 3D cartoon robot, cinematic lighting, vertical 9:16',
    ratio: '9:16' as ImageAspectRatio,
    style: '3D Cartoon' as ImageStyleChoice,
  },
  {
    label: '🏰 Space Palace',
    prompt: 'अंतरिक्ष में तैरता हुआ सुंदर भारतीय महल, cosmic stars, glowing neon aura',
    ratio: '16:9' as ImageAspectRatio,
    style: 'Cinematic' as ImageStyleChoice,
  },
  {
    label: '☕ Cozy Morning Tea',
    prompt: 'बारिश की खिड़की के पास रखी गर्म भारतीय मसाला चाय और बिस्कुट, soft steam, warm lighting',
    ratio: '1:1' as ImageAspectRatio,
    style: 'Realistic' as ImageStyleChoice,
  },
  {
    label: '👟 Luxury Sneaker',
    prompt: 'Minimalist neon futuristic running shoes on a clean studio display podium',
    ratio: '1:1' as ImageAspectRatio,
    style: 'Product Photo' as ImageStyleChoice,
  },
  {
    label: '🌸 Anime Mountain Shrine',
    prompt: 'Cherry blossom trees on a serene mountain shrine at golden hour sunset, clouds',
    ratio: '16:9' as ImageAspectRatio,
    style: 'Anime' as ImageStyleChoice,
  },
];

export const ImageGenScreen: React.FC<ImageGenScreenProps> = ({
  isOpen,
  onClose,
  settings,
  userId,
}) => {
  const [prompt, setPrompt] = useState('बारिश में खड़ा एक प्यारा 3D cartoon robot, cinematic lighting, vertical 9:16');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('9:16');
  const [style, setStyle] = useState<ImageStyleChoice>('3D Cartoon');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentImageItem, setCurrentImageItem] = useState<GeneratedImageItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [historyTabOpen, setHistoryTabOpen] = useState(false);
  const [historyList, setHistoryList] = useState<GeneratedImageItem[]>([]);

  const recognizerRef = useRef<any>(null);

  // Load history on mount or open or when userId changes
  useEffect(() => {
    if (isOpen) {
      setHistoryList(loadImageHistory(userId));
    }
  }, [isOpen, userId]);

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

  // Image Generation Handler
  const handleGenerate = async (customPrompt?: string, customRatio?: ImageAspectRatio, customStyle?: ImageStyleChoice) => {
    const finalPrompt = (customPrompt || prompt).trim();
    const finalRatio = customRatio || aspectRatio;
    const finalStyle = customStyle || style;

    if (!finalPrompt) {
      setErrorMessage('कृपया इमेज बनाने के लिए कोई विवरण (prompt) लिखें।');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setDownloadSuccess(false);
    setSavedSuccess(false);

    try {
    fetch('https://nafees-ai-app-2.onrender.com/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio: finalRatio,
          style: finalStyle,
        }),
      });

      if (!response.ok) {
        throw new Error('FAILED');
      }

      const data = await response.json();
      if (!data.imageUrl) {
        throw new Error('FAILED');
      }

      const newItem: GeneratedImageItem = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        prompt: finalPrompt,
        style: finalStyle,
        aspectRatio: finalRatio,
        imageUrl: data.imageUrl,
        createdAt: Date.now(),
      };

      setCurrentImage(data.imageUrl);
      setCurrentImageItem(newItem);

      // Automatically add to history list state as well
      const updated = saveImageToHistory(newItem, userId);
      setHistoryList(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      setIsGenerating(false);
    } catch {
      setIsGenerating(false);
      // Strictly show required message and never show raw API errors
      setErrorMessage('इमेज अभी नहीं बन पाई। कृपया फिर कोशिश करें।');
    }
  };

  // Explicit Save to History Button
  const handleSaveToHistory = () => {
    if (!currentImageItem) return;
    const updated = saveImageToHistory(currentImageItem, userId);
    setHistoryList(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Download Handler
  const handleDownload = () => {
    if (!currentImage) return;

    try {
      const link = document.createElement('a');
      link.href = currentImage;
      link.download = `nafees_ai_${style.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch {
      // Fallback
    }
  };

  // Clear / New Image Handler
  const handleClearNewImage = () => {
    setCurrentImage(null);
    setCurrentImageItem(null);
    setErrorMessage(null);
    setPrompt('');
  };

  // Select Item from History to View
  const handleSelectHistoryItem = (item: GeneratedImageItem) => {
    setCurrentImage(item.imageUrl);
    setCurrentImageItem(item);
    setPrompt(item.prompt);
    setAspectRatio(item.aspectRatio);
    setStyle(item.style);
    setHistoryTabOpen(false);
    setErrorMessage(null);
  };

  // Delete Item from History
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteImageFromHistory(id, userId);
    setHistoryList(updated);
    if (currentImageItem?.id === id) {
      setCurrentImageItem(null);
    }
  };

  // Clear All History
  const handleClearAllHistory = () => {
    clearImageHistory(userId);
    setHistoryList([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050811] text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-cyan-500/20 bg-[#050811]/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-base tracking-wide text-cyan-300">
              AI Image बनाएं
            </h2>
            <p className="text-[11px] text-slate-400">
              Hindi, Hinglish या English प्रॉम्प्ट से शानदार इमेज जनरेट करें
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
            title="इमेज हिस्ट्री देखें"
          >
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">इमेज हिस्ट्री</span>
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
        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-rose-200 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <p className="text-sm font-semibold">{errorMessage}</p>
            </div>
            <button
              onClick={() => handleGenerate()}
              className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-500 active:scale-95 transition-all shrink-0"
            >
              फिर कोशिश करें
            </button>
          </div>
        )}

        {/* Image History Modal / Drawer Section */}
        {historyTabOpen && (
          <div className="rounded-3xl border border-cyan-500/30 bg-[#080d1a] p-4 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-cyan-200">
                  सेव की गई इमेज हिस्ट्री ({historyList.length})
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
                अभी तक कोई इमेज सेव नहीं हुई है। इमेज बनाकर "Save to History" दबाएं।
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistoryItem(item)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-[#050811] hover:border-cyan-500/50 transition-all p-2 flex flex-col justify-between"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/40 mb-2">
                      <img
                        src={item.imageUrl}
                        alt={item.prompt}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        title="हटाएं"
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-lg bg-black/70 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-colors opacity-80 hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-tight font-medium">
                        {item.prompt}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                        <span className="text-cyan-400">{item.style}</span>
                        <span>{item.aspectRatio}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Image Preview Area */}
        {currentImage && (
          <div className="rounded-3xl border border-cyan-500/35 bg-[#090e1c] p-4 sm:p-6 shadow-[0_0_35px_rgba(6,182,212,0.18)] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
                <span className="text-xs font-bold text-emerald-300">
                  इमेज तैयार है! (Generated Image)
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-md">
                  {style}
                </span>
                <span className="bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md">
                  {aspectRatio}
                </span>
              </div>
            </div>

            <div className="relative mx-auto flex items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/30 bg-black/60 shadow-2xl p-1">
  <img
    src={currentImage}
    alt="Generated AI Image"
    referrerPolicy="no-referrer"
    className={`max-h-[60vh] w-auto object-contain rounded-xl ${
      aspectRatio === '9:16'
        ? 'aspect-[9/16]'
        : aspectRatio === '16:9'
        ? 'aspect-video'
        : 'aspect-square'
    }`}
  />

  <div className="absolute bottom-4 right-4 rounded-md bg-black/45 px-3 py-1 text-sm font-bold tracking-wide text-white/90 backdrop-blur-sm">
    NAFEES AI
  </div>
            </div>

            {/* Prompt details */}
            <p className="text-xs text-slate-300 bg-[#060a14] p-3 rounded-xl border border-slate-800/80 italic leading-relaxed">
              &ldquo;{prompt}&rdquo;
            </p>

            {/* Action Buttons: Download, Save to History, Generate Again, Clear / New Image */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* 1. Download Button */}
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
                    <span>Download (डाउनलोड)</span>
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

              {/* 4. Clear / New Image */}
              <button
                onClick={handleClearNewImage}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 py-3 px-3 font-bold text-slate-200 hover:bg-slate-800 active:scale-95 transition-all text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Clear / New Image</span>
              </button>
            </div>
          </div>
        )}

        {/* Generator Controls Form */}
        <div className="rounded-3xl border border-cyan-500/25 bg-[#090e1c]/90 p-4 sm:p-6 shadow-xl backdrop-blur space-y-6">
          {/* Large Prompt Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>Prompt (इमेज का विवरण लिखें):</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Hindi, Hinglish या English सपोर्ट
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="उदा. बारिश में खड़ा एक प्यारा 3D cartoon robot, cinematic lighting, vertical 9:16..."
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

          {/* Style Choices (Realistic, 3D Cartoon, Cinematic, Product Photo, Illustration, Anime) */}
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
                      ? 'border-cyan-500/70 bg-gradient-to-b from-cyan-500/20 to-blue-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                      : 'border-slate-800 bg-[#070c18] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl mb-1">{s.icon}</span>
                  <span className="text-xs font-semibold">{s.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Options (Square 1:1, Portrait 9:16, Landscape 16:9) */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2">
              Image Aspect Ratio चुनें:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {ASPECT_RATIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setAspectRatio(item.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                    aspectRatio === item.id
                      ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold'
                      : 'border-slate-800 bg-[#070c18] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="font-extrabold text-sm">{item.label}</span>
                  <span className="text-[10px] opacity-80 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sample Prompts */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">
              सुझाव (Quick Prompts):
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setAspectRatio(p.ratio);
                    setStyle(p.style);
                  }}
                  className="rounded-xl border border-slate-800 bg-[#070c18] px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200 transition-all active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button or Loading State */}
          <div className="pt-2">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-cyan-500/30 bg-[#060a14] space-y-3 shadow-inner">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                <p className="text-base font-bold text-cyan-200 tracking-wide animate-pulse">
                  इमेज बनाई जा रही है...
                </p>
                <p className="text-xs text-slate-400">
                  कृपया प्रतीक्षा करें, AI आपके विवरण और स्टाइल को रेंडर कर रहा है...
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={!prompt.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 py-4 px-6 font-extrabold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 text-base tracking-wide"
              >
                <Wand2 className="h-5 w-5" />
                <span>Generate (इमेज बनाएं)</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
