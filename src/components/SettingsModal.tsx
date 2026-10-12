import React, { useState } from 'react';
import {
  X,
  Settings,
  Cpu,
  Volume2,
  Globe,
  Palette,
  ShieldCheck,
  Trash2,
  Check,
  Zap,
  Download,
  Info,
  MessageSquare,
  Sparkles,
  FileText,
  CheckCircle2,
  Lock,
  GraduationCap,
  Briefcase,
  Play,
} from 'lucide-react';
import { AppSettings, ModelMode, Conversation } from '../types';
import { exportChatHistoryAsJson, exportChatHistoryAsText } from '../services/storage';

export type SettingsTabId =
  | 'model'
  | 'voice'
  | 'language'
  | 'theme'
  | 'history'
  | 'download'
  | 'privacy'
  | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClearAllChats: () => void;
  chatCount: number;
  conversations?: Conversation[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllChats,
  chatCount,
  conversations = [],
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('model');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Model Mode Selection (Fast, Balanced, Advanced)
  const handleModelModeChange = (mode: ModelMode) => {
    let targetModel = 'gemini-3.1-flash-lite';
    if (mode === 'fast') {
      targetModel = 'gemini-3.1-flash-lite';
    } else if (mode === 'balanced') {
      targetModel = 'gemini-3.1-flash-lite';
    } else if (mode === 'advanced') {
      targetModel = 'gemini-3.8-flash';
    }
    onUpdateSettings({
      ...settings,
      modelMode: mode,
      model: targetModel,
    });
  };

  const handleLanguageChange = (uiLanguage: AppSettings['uiLanguage']) => {
    onUpdateSettings({ ...settings, uiLanguage });
  };

  const handleSpeechLangChange = (speechLang: AppSettings['speechLang']) => {
    onUpdateSettings({ ...settings, speechLang });
  };

  const handleRateChange = (voiceRate: number) => {
    onUpdateSettings({ ...settings, voiceRate });
  };

  const handleAutoSpeakToggle = () => {
    onUpdateSettings({ ...settings, autoSpeak: !settings.autoSpeak });
  };

  const handleThemeChange = (theme: AppSettings['theme']) => {
    onUpdateSettings({ ...settings, theme });
  };

  const handleDownload = (type: 'json' | 'txt') => {
    if (type === 'json') {
      exportChatHistoryAsJson(conversations);
      setDownloadSuccess('JSON फाइल डाउनलोड हो गई!');
    } else {
      exportChatHistoryAsText(conversations);
      setDownloadSuccess('टेक्स्ट (.TXT) फाइल डाउनलोड हो गई!');
    }
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleTestVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text =
        settings.speechLang === 'hi-IN'
          ? 'अस्सलामु अलैकुम! मैं NAFEES AI हूँ, आपका स्मार्ट AI साथी।'
          : 'Hello! I am NAFEES AI, your personal AI assistant.';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.speechLang;
      utterance.rate = settings.voiceRate;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Tab definitions
  const tabs = [
    { id: 'model', label: 'AI Model', labelHi: 'AI मॉडल', icon: Cpu },
    { id: 'voice', label: 'Voice Settings', labelHi: 'वॉइस', icon: Volume2 },
    { id: 'language', label: 'Language', labelHi: 'भाषा', icon: Globe },
    { id: 'theme', label: 'Theme', labelHi: 'थीम', icon: Palette },
    { id: 'history', label: 'Chat History', labelHi: 'चैट इतिहास', icon: MessageSquare },
    { id: 'download', label: 'Download History', labelHi: 'डाउनलोड', icon: Download },
    { id: 'privacy', label: 'Privacy & Security', labelHi: 'प्राइवेसी', icon: ShieldCheck },
    { id: 'about', label: 'About NAFEES AI', labelHi: 'परिचय', icon: Info },
  ];

  // Calculate message count
  const totalMessages = conversations.reduce((acc, c) => acc + (c.messages?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] sm:max-h-[85vh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 bg-[#070b16] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 sm:px-6 py-3.5 bg-[#090f1f]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-cyan-300">Settings (सेटिंग्स)</h2>
              <p className="text-xs text-slate-400">NAFEES AI को अपनी सुविधा अनुसार कस्टमाइज़ करें</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#060a16] px-2 sm:px-4 overflow-x-auto no-scrollbar gap-1 py-1.5 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTabId)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.labelHi}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: AI Model Section */}
          {activeTab === 'model' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-cyan-400" />
                    <span>AI मॉडल चयन (Gemini AI Models)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    अपनी ज़रूरत के अनुसार गति या बुद्धिमत्ता चुनें (चैट इतिहास सुरक्षित रहता है)
                  </p>
                </div>
              </div>

              {/* 3 User-friendly modes: Fast, Balanced, Advanced */}
              <div className="space-y-3">
                {/* 1. Fast Mode (Default) */}
                <div
                  onClick={() => handleModelModeChange('fast')}
                  className={`relative flex items-start justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.modelMode === 'fast'
                      ? 'border-emerald-500 bg-emerald-950/25 shadow-[0_0_16px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/50'
                      : 'border-slate-800/90 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-100">Fast (फास्ट मोड - डिफ़ॉल्ट)</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-mono border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                        ⚡ Ultra Fast (डिफ़ॉल्ट)
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 font-medium">
                      प्राथमिकता: सबसे तेज़ उत्तर (Lowest Latency)
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      सामान्य चैट, त्वरित सवाल और दैनिक बातचीत के लिए सबसे उपयुक्त।
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <span>संचालित: Gemini 3.1 Flash Lite (अल्ट्रा-फास्ट)</span>
                    </div>
                  </div>
                  <div
                    className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      settings.modelMode === 'fast'
                        ? 'border-emerald-400 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {settings.modelMode === 'fast' && <Check className="h-4 w-4 stroke-[3]" />}
                  </div>
                </div>

                {/* 2. Balanced Mode */}
                <div
                  onClick={() => handleModelModeChange('balanced')}
                  className={`relative flex items-start justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.modelMode === 'balanced'
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_16px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/50'
                      : 'border-slate-800/90 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-100">Balanced (संतुलित मोड)</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-mono border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                        ⚖️ Balanced
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 font-medium">
                      गति और बुद्धिमत्ता का संतुलन
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      दैनिक कार्य, पढ़ाई के सवाल, सामान्य बिजनेस और सभी तरह की बातचीत के लिए।
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-400/90 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-md">
                      <span>संचालित: Gemini 3.1 Flash Lite</span>
                    </div>
                  </div>
                  <div
                    className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      settings.modelMode === 'balanced'
                        ? 'border-cyan-400 bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {settings.modelMode === 'balanced' && <Check className="h-4 w-4 stroke-[3]" />}
                  </div>
                </div>

                {/* 3. Advanced Mode */}
                <div
                  onClick={() => handleModelModeChange('advanced')}
                  className={`relative flex items-start justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.modelMode === 'advanced'
                      ? 'border-purple-500 bg-purple-950/25 shadow-[0_0_16px_rgba(168,85,247,0.2)] ring-1 ring-purple-500/50'
                      : 'border-slate-800/90 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-100">Advanced (एडवांस मोड)</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-mono border bg-purple-500/20 text-purple-300 border-purple-500/40">
                        🧠 Deep Thinking
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300 font-medium">
                      गहरी रीजनिंग और जटिल समस्याओं का हल (Deep Reasoning)
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      कठिन प्रश्न, कोडिंग, गणित, विस्तृत स्टडी नोट्स और बिज़नेस रिपोर्ट विश्लेषण।
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-purple-400/90 font-mono bg-purple-500/10 px-2 py-0.5 rounded-md">
                      <span>संचालित: Gemini 3.8 Flash (स्मार्ट रीजनिंग)</span>
                    </div>
                  </div>
                  <div
                    className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      settings.modelMode === 'advanced'
                        ? 'border-purple-400 bg-purple-500 text-black shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {settings.modelMode === 'advanced' && <Check className="h-4 w-4 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Reliability & Graceful Fallback Guarantee Notice */}
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 text-xs text-cyan-200/90 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-cyan-300">स्वचालित सुरक्षा और बैकअप (Smart Fallback)</p>
                  <p className="text-[11px] text-cyan-200/75 leading-relaxed">
                    यदि कोई चुना हुआ मॉडल अस्थायी रूप से व्यस्त या ओवरलोड होता है, तो NAFEES AI बिना किसी त्रुटि संदेश के तुरंत सबसे तेज़ बैकअप मॉडल का उपयोग करता है।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Voice Settings */}
          {activeTab === 'voice' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                  <span>वॉइस और स्पीच सेटिंग्स (Voice & Speech)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">वॉइस टाइपिंग और AI आवाज़ को अनुकूलित करें</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 space-y-4">
                {/* Language selection for speech */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    वॉइस इनपुट भाषा (Voice Typing Language):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleSpeechLangChange('hi-IN')}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-semibold text-left transition-all flex items-center justify-between ${
                        settings.speechLang === 'hi-IN'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-800 bg-[#070c17] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🇮🇳 हिन्दी (Hindi India)</span>
                      {settings.speechLang === 'hi-IN' && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                    </button>
                    <button
                      onClick={() => handleSpeechLangChange('en-IN')}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-semibold text-left transition-all flex items-center justify-between ${
                        settings.speechLang === 'en-IN'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-800 bg-[#070c17] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🇮🇳 English (Indian)</span>
                      {settings.speechLang === 'en-IN' && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                    </button>
                    <button
                      onClick={() => handleSpeechLangChange('en-US')}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-semibold text-left transition-all flex items-center justify-between ${
                        settings.speechLang === 'en-US'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-800 bg-[#070c17] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🇺🇸 English (US)</span>
                      {settings.speechLang === 'en-US' && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                    </button>
                  </div>
                </div>

                {/* Speech rate slider */}
                <div className="pt-2 border-t border-slate-800/70">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span>बोलने की गति (Speech Speed):</span>
                    <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      {settings.voiceRate.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.1"
                    value={settings.voiceRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>धीमी (0.7x)</span>
                    <span>सामान्य (1.0x)</span>
                    <span>तेज़ (1.3x)</span>
                  </div>
                </div>

                {/* Auto speak AI toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">जवाब अपने आप पढ़कर सुनाएं</span>
                    <p className="text-[11px] text-slate-400">हर AI उत्तर के बाद स्वतः ऑडियो बोलें</p>
                  </div>
                  <button
                    onClick={handleAutoSpeakToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.autoSpeak ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.autoSpeak ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Test Voice Button */}
                <div className="pt-2 border-t border-slate-800/70">
                  <button
                    onClick={handleTestVoice}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all"
                  >
                    <Play className="h-3.5 w-3.5 text-cyan-400" />
                    <span>आवाज़ टेस्ट करें (Preview Voice)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Language */}
          {activeTab === 'language' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <span>भाषा सेटिंग (App Language)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ऐप के मेन्यू और इंटरफ़ेस की भाषा चुनें</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => handleLanguageChange('hi')}
                  className={`flex items-start justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.uiLanguage === 'hi'
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'border-slate-800 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-sm font-bold text-slate-100">🇮🇳 हिन्दी (Hindi)</span>
                    <p className="text-xs text-slate-400 mt-1">
                      सभी टूल्स, बटन और निर्देश सहज हिंदी में प्रदर्शित होंगे।
                    </p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                      settings.uiLanguage === 'hi'
                        ? 'border-cyan-400 bg-cyan-500 text-black'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {settings.uiLanguage === 'hi' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div
                  onClick={() => handleLanguageChange('en')}
                  className={`flex items-start justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.uiLanguage === 'en'
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'border-slate-800 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-sm font-bold text-slate-100">🌐 English</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Interface menus, tools and guidance will be in English.
                    </p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                      settings.uiLanguage === 'en'
                        ? 'border-cyan-400 bg-cyan-500 text-black'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {settings.uiLanguage === 'en' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Theme */}
          {activeTab === 'theme' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-cyan-400" />
                  <span>थीम और रंग (Theme & Appearance)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">NAFEES AI का डार्क लुक चुनें</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Neon Navy (Default) */}
                <div
                  onClick={() => handleThemeChange('neon-navy')}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.theme === 'neon-navy'
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'border-slate-800 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-100">Neon Navy</span>
                    {settings.theme === 'neon-navy' && <Check className="h-4 w-4 text-cyan-400" />}
                  </div>
                  <div className="h-10 rounded-lg bg-[#050811] border border-cyan-500/30 flex items-center justify-center mb-2">
                    <span className="h-3 w-12 rounded-full bg-cyan-500/40" />
                  </div>
                  <p className="text-[11px] text-slate-400">साइबर नेवी ग्लो (डिफ़ॉल्ट लुक)</p>
                </div>

                {/* 2. OLED Black */}
                <div
                  onClick={() => handleThemeChange('oled-black')}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.theme === 'oled-black'
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'border-slate-800 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-100">OLED Black</span>
                    {settings.theme === 'oled-black' && <Check className="h-4 w-4 text-cyan-400" />}
                  </div>
                  <div className="h-10 rounded-lg bg-black border border-slate-800 flex items-center justify-center mb-2">
                    <span className="h-3 w-12 rounded-full bg-slate-700" />
                  </div>
                  <p className="text-[11px] text-slate-400">गहरा काला, बैटरी बचत और शुद्ध डार्क</p>
                </div>

                {/* 3. Midnight Blue */}
                <div
                  onClick={() => handleThemeChange('midnight-blue')}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    settings.theme === 'midnight-blue'
                      ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'border-slate-800 bg-[#0a0f1d] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-100">Midnight Blue</span>
                    {settings.theme === 'midnight-blue' && <Check className="h-4 w-4 text-cyan-400" />}
                  </div>
                  <div className="h-10 rounded-lg bg-[#030712] border border-blue-500/30 flex items-center justify-center mb-2">
                    <span className="h-3 w-12 rounded-full bg-blue-500/40" />
                  </div>
                  <p className="text-[11px] text-slate-400">गहरे इंडिगो और शांत नीला रंग</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Chat History */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-cyan-400" />
                  <span>चैट इतिहास प्रबंधन (Chat History)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">आपकी स्थानीय बातचीत की स्थिति और नियंत्रण</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800">
                  <div className="rounded-xl bg-[#060a16] border border-slate-800/80 p-3">
                    <span className="text-[11px] text-slate-400">कुल बातचीत:</span>
                    <p className="text-lg font-bold text-cyan-300 font-mono mt-0.5">{chatCount}</p>
                  </div>
                  <div className="rounded-xl bg-[#060a16] border border-slate-800/80 p-3">
                    <span className="text-[11px] text-slate-400">कुल मैसेजेस:</span>
                    <p className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{totalMessages}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  आपकी सभी चैट और वॉइस डेटा आपके डिवाइस के लोकल स्टोरेज में सुरक्षित रूप से संरक्षित हैं। मॉडल बदलने पर आपका इतिहास नहीं हटाया जाता।
                </p>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          'क्या आप वाकई सभी चैट इतिहास हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।'
                        )
                      ) {
                        onClearAllChats();
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2 rounded-xl bg-rose-950/30 border border-rose-500/30 px-3.5 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 hover:text-white transition-all w-full justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>सभी बातचीत साफ़ करें (Clear All Chats)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Download History */}
          {activeTab === 'download' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Download className="h-4 w-4 text-cyan-400" />
                  <span>इतिहास डाउनलोड करें (Export & Download History)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">अपनी बातचीत का ऑफ़लाइन बैकअप अपने डिवाइस में सहेजें</p>
              </div>

              {downloadSuccess && (
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{downloadSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Download as JSON */}
                <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-7 w-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-100">JSON बैकअप (.json)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      संपूर्ण बातचीत का संरचित डेटा, जिसमें समय, रोल्स और अटैचमेंट्स मेटाडेटा शामिल हैं।
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload('json')}
                    disabled={chatCount === 0}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 py-2.5 px-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>JSON डाउनलोड करें</span>
                  </button>
                </div>

                {/* 2. Download as TXT */}
                <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-100">टेक्स्ट फाइल (.txt)</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      आसानी से पढ़ने योग्य सादा टेक्स्ट दस्तावेज़, जिसे किसी भी फोन या कंप्यूटर पर खोला जा सकता है।
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload('txt')}
                    disabled={chatCount === 0}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 py-2.5 px-3 text-xs font-semibold text-blue-300 hover:bg-blue-500/30 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>TXT डाउनलोड करें</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Privacy & Security */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <span>प्राइवेसी और सुरक्षा (Privacy & Security)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">आपकी जानकारी और फाइलों की सुरक्षा नीति</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">100% ऑन-डिवाइस डेटा सुरक्षा</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      आपकी सभी बातचीत, संदेश और वॉयस इनपुट केवल आपके डिवाइस के लोकल स्टोरेज में सुरक्षित रहते हैं। किसी बाहरी डेटाबेस पर आपका इतिहास स्टोर नहीं किया जाता।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-slate-800/80">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">सुरक्षित सर्वर-साइड प्रॉक्सी</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      सभी AI रिक्वेस्ट सुरक्षित सर्वर प्रॉक्सी के माध्यम से प्रोसेस होती हैं। आपकी निजी API चाबियां कभी भी क्लाइंट-साइड पर एक्सपोज़ नहीं होतीं।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-slate-800/80">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">प्राइवेट फाइल व दस्तावेज़ विश्लेषण</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      आपके द्वारा अपलोड की गई कोई भी PDF, इमेज या कोड फाइल पब्लिकली शेयर नहीं की जाती। केवल सक्रिय सत्र में ही उसका तात्कालिक विश्लेषण होता है।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: About NAFEES AI */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#091124] to-[#070b16] p-5 text-center relative overflow-hidden">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-3">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  NAFEES AI
                </h3>
                <p className="text-xs text-slate-300 mt-1">आपका बुद्धिमान एवं व्यक्तिगत AI साथी</p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  <span>Version 2.5 • Multi-Model AI Edition</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  सक्रिय फीचर्स (Active Capabilities)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>सामान्य स्मार्ट चैट</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>लाइव वॉइस एवं टाइपिंग</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>स्टडी मोड (पर्सनल ट्यूटर)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>बिजनेस मोड (प्लान व फाइनेंस)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>AI इमेज जनरेशन</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>PDF, फाइल व विज़न विश्लेषण</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                  <p>
                    NAFEES AI को विशेष रूप से सरल हिंदी, हिंग्लिश और अंग्रेजी में तेज़, सटीक और मददगार बातचीत के लिए तैयार किया गया है।
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-[#050811] px-4 sm:px-6 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              मोड:{' '}
              <strong className="text-slate-200">
                {settings.modelMode === 'fast'
                  ? 'Fast'
                  : settings.modelMode === 'advanced'
                  ? 'Advanced'
                  : 'Balanced (डिफ़ॉल्ट)'}
              </strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.35)] active:scale-95"
          >
            सहेजें और बंद करें (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
