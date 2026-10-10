import React, { useRef, useState, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  X,
  Image as ImageIcon,
  Loader2,
  FileText,
  FileSpreadsheet,
  File,
  Code,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ChatAttachment, AttachmentCategory, AppMode } from '../types';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  startAudioRecording,
  transcribeAudioWithGemini,
  MIC_PERMISSION_DENIED_MESSAGE,
  AudioRecorderController,
} from '../services/speech';

const CODE_EXTENSIONS = [
  '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss',
  '.json', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb',
  '.go', '.rs', '.swift', '.kt', '.sql', '.sh', '.bash', '.yaml', '.yml',
  '.xml', '.dart', '.r', '.lua', '.vue'
];

interface MessageInputProps {
  onSendMessage: (text: string, attachment?: ChatAttachment) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  speechLang: string;
  uiLanguage: 'hi' | 'en';
  currentMode?: AppMode;
  activeAttachment?: ChatAttachment;
  onClearActiveAttachment?: () => void;
}

type VoiceState = 'idle' | 'listening' | 'transcribing';
type FileState = 'idle' | 'uploading' | 'processing';

function detectFileCategory(file: File): AttachmentCategory {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  // 1. PDF: strictly .pdf or application/pdf
  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';

  // 2. Images: image mime or image extension
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(name)) return 'image';

  // 3. Source-code text files
  if (CODE_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'code';

  // 4. CSV
  if (name.endsWith('.csv') || mime === 'text/csv') return 'csv';

  // 5. Word documents
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return 'document';
  }

  // 6. Text files
  return 'text';
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryBadge(category?: AttachmentCategory) {
  switch (category) {
    case 'code':
      return { label: 'कोड फ़ाइल (Code)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: 'code' };
    case 'pdf':
      return { label: 'PDF दस्तावेज़', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: 'pdf' };
    case 'image':
      return { label: 'इमेज (JPG/PNG/WEBP)', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: 'image' };
    case 'csv':
      return { label: 'CSV डेटा फ़ाइल', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40', icon: 'csv' };
    case 'document':
      return { label: 'वर्ड दस्तावेज़ (DOCX)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: 'doc' };
    case 'text':
      return { label: 'टेक्स्ट फ़ाइल (.txt/.md)', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', icon: 'text' };
    default:
      return { label: 'फ़ाइल', color: 'bg-slate-700/40 text-slate-300 border-slate-600/40', icon: 'file' };
  }
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  speechLang,
  uiLanguage,
  currentMode = 'normal',
  activeAttachment,
  onClearActiveAttachment,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | undefined>(undefined);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [fileState, setFileState] = useState<FileState>('idle');
  const [fileError, setFileError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorderController | null>(null);
  const baseInputBeforeVoiceRef = useRef<string>('');
  const hasLiveTranscriptRef = useRef<boolean>(false);

  const isRecording = voiceState === 'listening';
  const isTranscribing = voiceState === 'transcribing';

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Handle submit
  const handleSend = () => {
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed && !attachment && !activeAttachment) return;

    // Stop voice if recording
    if (isRecording || isTranscribing) {
      stopVoiceRecording();
    }

    onSendMessage(trimmed, attachment);
    setInputText('');
    setAttachment(undefined);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (window.innerWidth > 768) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  // Handle file attachment (PDF, Images, Text, DOCX, CSV)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Maximum 25MB file limit
    const MAX_SIZE_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setFileError('फाइल का आकार बहुत बड़ा है (अधिकतम 25MB)। कृपया छोटी फाइल चुनें।');
      setTimeout(() => setFileError(null), 5000);
      e.target.value = '';
      return;
    }

    const category = detectFileCategory(file);

    try {
      setFileState('uploading');

      // Small async tick for UI smooth feedback
      await new Promise((r) => setTimeout(r, 100));
      setFileState('processing');

      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64Data = result.split(',')[1] || '';

          let previewUrl: string | undefined = undefined;
          if (category === 'image') {
            previewUrl = result;
          }

          let extractedText: string | undefined = undefined;
          // For code, text and CSV files, extract raw text directly
          if (category === 'code' || category === 'text' || category === 'csv') {
            try {
              extractedText = await file.text();
            } catch {
              try {
                extractedText = atob(base64Data);
              } catch {
                // fallback
              }
            }
          }

          let resolvedMime = file.type;
          if (!resolvedMime || resolvedMime === 'application/octet-stream') {
            if (category === 'code' || category === 'text') resolvedMime = 'text/plain';
            else if (category === 'csv') resolvedMime = 'text/csv';
            else if (category === 'pdf') resolvedMime = 'application/pdf';
          }

          setAttachment({
            data: base64Data,
            mimeType: resolvedMime || (category === 'pdf' ? 'application/pdf' : 'text/plain'),
            name: file.name,
            size: file.size,
            previewUrl,
            category,
            extractedText,
          });

          setFileState('idle');
        } catch {
          setFileState('idle');
          setFileError('फाइल अभी प्रोसेस नहीं हो पाई। कृपया फिर कोशिश करें।');
          setTimeout(() => setFileError(null), 5000);
        }
      };

      reader.onerror = () => {
        setFileState('idle');
        setFileError('फाइल अभी प्रोसेस नहीं हो पाई। कृपया फिर कोशिश करें।');
        setTimeout(() => setFileError(null), 5000);
      };

      reader.readAsDataURL(file);
    } catch {
      setFileState('idle');
      setFileError('फाइल अभी प्रोसेस नहीं हो पाई। कृपया फिर कोशिश करें।');
      setTimeout(() => setFileError(null), 5000);
    }

    // Reset input so same file can be re-selected if removed
    e.target.value = '';
  };

  // Fallback to MediaRecorder + Gemini
  const fallbackToAudioRecorder = async () => {
    try {
      baseInputBeforeVoiceRef.current = inputText;
      const controller = await startAudioRecording();
      recorderRef.current = controller;
      setVoiceState('listening');
    } catch (err: any) {
      console.warn('[Microphone Internal Debug Reason]:', err?.name, err?.message, err);
      setVoiceState('idle');
      setSpeechError(MIC_PERMISSION_DENIED_MESSAGE);
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    setSpeechError(null);
    hasLiveTranscriptRef.current = false;
    baseInputBeforeVoiceRef.current = inputText;

    if (isSpeechRecognitionSupported()) {
      try {
        const recognizer = createSpeechRecognizer(speechLang || 'hi-IN', {
          onStart: () => {
            setVoiceState('listening');
          },
          onResult: (transcript, _isFinal) => {
            if (transcript) {
              hasLiveTranscriptRef.current = true;
              setInputText(() => {
                const base = baseInputBeforeVoiceRef.current.trim();
                return base ? `${base} ${transcript}` : transcript;
              });
            }
          },
          onError: (err) => {
            console.warn('SpeechRecognition error:', err);
            if (err === MIC_PERMISSION_DENIED_MESSAGE) {
              setSpeechError(MIC_PERMISSION_DENIED_MESSAGE);
              setTimeout(() => setSpeechError(null), 4000);
              setVoiceState('idle');
            } else {
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch {}
                recognitionRef.current = null;
              }
              fallbackToAudioRecorder();
            }
          },
          onEnd: () => {
            setVoiceState('idle');
          },
        });

        if (recognizer) {
          recognitionRef.current = recognizer;
          recognizer.start();
          return;
        }
      } catch {
        fallbackToAudioRecorder();
        return;
      }
    }

    fallbackToAudioRecorder();
  };

  // Stop voice recording
  const stopVoiceRecording = async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
      setVoiceState('idle');
      return;
    }

    if (recorderRef.current) {
      try {
        setVoiceState('transcribing');
        const audioData = await recorderRef.current.stop();
        recorderRef.current = null;

        const transcript = await transcribeAudioWithGemini(
          audioData.base64,
          audioData.mimeType,
          speechLang || 'hi-IN'
        );
        if (transcript) {
          setInputText(() => {
            const base = baseInputBeforeVoiceRef.current.trim();
            return base ? `${base} ${transcript}` : transcript;
          });
        }
      } catch {
        setSpeechError('वॉइस टाइपिंग नहीं हो पाई। कृपया फिर बोलें।');
        setTimeout(() => setSpeechError(null), 3000);
      } finally {
        setVoiceState('idle');
      }
    } else {
      setVoiceState('idle');
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording || isTranscribing) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Quick Action Chips depending on Mode & Attachment
  const effectiveAttachment = attachment || activeAttachment;

  const getQuickActionChips = () => {
    if (!effectiveAttachment) return null;

    // 1. Source-code specific quick chips (Requirement 6)
    if (effectiveAttachment.category === 'code') {
      return [
        { label: '💻 कोड समझाएं', prompt: 'इस कोड को विस्तार से समझाएं कि यह कैसे काम करता है।' },
        { label: '🔍 गलती ढूंढें', prompt: 'इस कोड में क्या गलतियाँ (bugs/errors) हैं, ढूंढकर बताएं।' },
        { label: '📋 सारांश बताएं', prompt: 'इस कोड फाइल का संक्षिप्त सारांश और मुख्य कार्यप्रणाली बताएं।' },
        { label: '🛠️ कोड सुधारें', prompt: 'इस कोड को बेहतर, ऑप्टिमाइज़्ड और साफ बनाकर सुधारें।' },
      ];
    }

    // 2. PDF specific quick chips (Requirement 7)
    if (effectiveAttachment.category === 'pdf') {
      return [
        { label: '📄 सारांश बताएं', prompt: 'इस PDF का पूरा और स्पष्ट सारांश बताएं।' },
        { label: '📌 5 जरूरी points', prompt: 'इस PDF के 5 सबसे जरूरी points बुलेट लिस्ट में बताएं।' },
        { label: '🎯 MCQ बनाएं', prompt: 'इस PDF के आधार पर महत्वपूर्ण बहुविकल्पीय प्रश्न (MCQs) उत्तर सहित बनाएं।' },
        { label: '💡 आसान भाषा में समझाएं', prompt: 'इस PDF के मुख्य विषयों को आसान भाषा में समझाएं।' },
      ];
    }

    if (currentMode === 'study') {
      return [
        { label: '📝 सारांश बताओ', prompt: 'इस फाइल का पूरा और स्पष्ट सारांश बताओ।' },
        { label: '📌 मुख्य नोट्स बनाएं', prompt: 'इस दस्तावेज़ से परीक्षा के लिए जरूरी रिवीजन नोट्स बनाओ।' },
        { label: '🎯 MCQ प्रश्न बनाएं', prompt: 'इस फाइल के आधार पर 5 महत्वपूर्ण बहुविकल्पीय प्रश्न (MCQs) उत्तर सहित बनाओ।' },
        { label: '❓ जरूरी प्रश्न-उत्तर', prompt: 'इस फाइल से सबसे महत्वपूर्ण प्रश्न और उनके उत्तर तैयार करो।' },
        { label: '💡 आसान भाषा में समझाएं', prompt: 'इस फाइल के मुख्य कॉन्सेप्ट्स को बहुत आसान हिंदी में उदाहरण सहित समझाओ।' },
      ];
    }

    if (currentMode === 'business') {
      return [
        { label: '📊 डेटा समझाएं', prompt: 'इस फाइल में दिए गए डेटा और आंकड़ों को विस्तार से समझाओ।' },
        { label: '📌 जरूरी पॉइंट्स', prompt: 'इस दस्तावेज़ के मुख्य बिंदु और निष्कर्ष (Key Takeaways) बताओ।' },
        { label: '📈 बिजनेस रिपोर्ट', prompt: 'इस फाइल के आधार पर एक व्यावसायिक सारांश और रिपोर्ट तैयार करो।' },
        { label: '💰 खर्च/मुनाफा विश्लेषण', prompt: 'इस डेटा से लागत, खर्च और लाभ का विश्लेषण करके बताओ।' },
        { label: '📦 प्रोडक्ट जानकारी', prompt: 'इस दस्तावेज़ में दिए गए प्रोडक्ट्स और उनकी खासियतों का ब्योरा दो।' },
      ];
    }

    // Normal mode default chips
    return [
      { label: '📄 इस फाइल का सारांश बताओ', prompt: 'इस फाइल का मुख्य सारांश और जरूरी बातें बताओ।' },
      { label: '📌 जरूरी points बताओ', prompt: 'इस दस्तावेज़ के मुख्य बिंदु (Key Points) बुलेट पॉइंट्स में बताओ।' },
      { label: '💡 आसान हिंदी में समझाओ', prompt: 'इस फाइल को बहुत सरल और स्पष्ट हिंदी में समझाओ।' },
      { label: '❓ इस file से questions बनाओ', prompt: 'इस फाइल के आधार पर महत्वपूर्ण सवाल-जवाब तैयार करो।' },
    ];
  };

  const quickChips = getQuickActionChips();

  return (
    <div className="sticky bottom-0 z-20 w-full bg-gradient-to-t from-[#050811] via-[#050811]/95 to-transparent px-3 pb-3 pt-2">
      {/* Speech Error Banner */}
      {speechError && (
        <div className="mx-auto mb-2 max-w-3xl flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/60 p-2.5 text-xs text-rose-200 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="rounded p-1 text-rose-400 hover:bg-rose-900/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* File Error Banner */}
      {fileError && (
        <div className="mx-auto mb-2 max-w-3xl flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/70 p-2.5 text-xs text-rose-200 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{fileError}</span>
          </div>
          <button
            onClick={() => setFileError(null)}
            className="rounded p-1 text-rose-400 hover:bg-rose-900/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* File Uploading Status: फाइल अपलोड हो रही है... */}
      {fileState === 'uploading' && (
        <div className="mx-auto mb-2 max-w-3xl flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-3 py-1.5 text-xs text-cyan-300 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          <span className="font-semibold">फाइल अपलोड हो रही है...</span>
        </div>
      )}

      {/* File Processing Status: फाइल समझी जा रही है... */}
      {fileState === 'processing' && (
        <div className="mx-auto mb-2 max-w-3xl flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/60 px-3 py-1.5 text-xs text-indigo-300 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
          <span className="font-semibold">फाइल समझी जा रही है...</span>
        </div>
      )}

      {/* Selected File Preview Box (Before Sending) */}
      {attachment && (
        <div className="mx-auto mb-2 max-w-3xl animate-fadeIn">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/35 bg-[#0a1022] p-2 sm:p-2.5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {attachment.category === 'image' && attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt="Upload preview"
                  className="h-11 w-11 rounded-xl object-cover border border-cyan-500/40 bg-black/40 shrink-0 shadow-sm"
                />
              ) : (
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-bold text-xs ${
                    attachment.category === 'pdf'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : attachment.category === 'csv'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : attachment.category === 'document'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  {attachment.category === 'pdf' ? (
                    <span className="text-[11px] font-extrabold tracking-tight">PDF</span>
                  ) : attachment.category === 'csv' ? (
                    <FileSpreadsheet className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs sm:text-sm font-bold text-slate-100">
                    {attachment.name || 'संलग्न फ़ाइल'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span
                    className={`font-semibold px-1.5 py-0.2 rounded border text-[10px] ${
                      getCategoryBadge(attachment.category).color
                    }`}
                  >
                    {getCategoryBadge(attachment.category).label}
                  </span>
                  {attachment.size ? <span>{formatBytes(attachment.size)}</span> : null}
                  <span className="text-cyan-400">• Gemini AI द्वारा पढ़ा जाएगा</span>
                </div>
              </div>
            </div>

            {/* Remove File Button */}
            <button
              type="button"
              onClick={() => setAttachment(undefined)}
              title="फाइल हटाएं"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-300 active:scale-95 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Conversation Attachment Badge (When following up on previous upload) */}
      {!attachment && activeAttachment && (
        <div className="mx-auto mb-2 max-w-3xl flex items-center justify-between gap-2 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-3 py-1.5 text-xs text-indigo-200 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
            <span className="font-semibold text-cyan-300 shrink-0">सक्रिय फ़ाइल:</span>
            <span className="truncate text-slate-200">{activeAttachment.name}</span>
            <span className="hidden sm:inline text-[10px] text-indigo-300/80">
              (इस फ़ाइल पर फॉलो-अप सवाल पूछें)
            </span>
          </div>
          {onClearActiveAttachment && (
            <button
              onClick={onClearActiveAttachment}
              title="फ़ाइल संदर्भ हटाएं"
              className="text-slate-400 hover:text-rose-300 transition-colors p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* One-Click Suggested Prompt Chips (Study Mode, Business Mode & Normal Mode) */}
      {quickChips && (
        <div className="mx-auto mb-2 max-w-3xl overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 shrink-0 pl-1">
              <Sparkles className="h-3 w-3" />
              <span>सुझाव:</span>
            </span>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(chip.prompt);
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                  }
                }}
                className="rounded-xl border border-cyan-500/30 bg-[#0a1122] px-2.5 py-1 text-xs text-slate-200 hover:border-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-200 active:scale-95 transition-all shadow-sm"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Recording Visual Banner: सुन रहा हूँ... */}
      {isRecording && (
        <div className="mx-auto mb-2 max-w-3xl flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-semibold">सुन रहा हूँ... बोलिए</span>
          </div>
          <button
            onClick={stopVoiceRecording}
            className="rounded bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-rose-500 active:scale-95 transition-all shadow-sm"
          >
            रोकें (Done)
          </button>
        </div>
      )}

      {/* Voice Transcribing Visual Banner: लिख रहा हूँ... */}
      {isTranscribing && (
        <div className="mx-auto mb-2 max-w-3xl flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/50 px-3 py-1.5 text-xs text-cyan-300 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
          <span className="font-semibold">लिख रहा हूँ...</span>
        </div>
      )}

      {/* Main Input Dock */}
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-1.5 sm:gap-2 rounded-2xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-1.5 sm:p-2 shadow-[0_4px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl focus-within:border-cyan-400/60 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all">
          {/* Hidden File Input for PDF, Images, Text, DOCX, CSV */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/jpg,text/plain,text/csv,text/markdown,.pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.md,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            aria-label="Attach File or PDF"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95 transition-all disabled:opacity-50"
            title="PDF, इमेज या फाइल अटैच करें"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachment
                ? `इस ${getCategoryBadge(attachment.category).label} के बारे में कुछ भी पूछें...`
                : activeAttachment
                ? `सक्रिय ${activeAttachment.name} पर सवाल पूछें...`
                : uiLanguage === 'hi'
                ? 'NAFEES AI से कुछ भी पूछें (PDF/इमेज अटैच कर सकते हैं)...'
                : 'Ask NAFEES AI anything (PDFs/Images supported)...'
            }
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 px-1 text-[14.5px] leading-relaxed text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          {/* Mic Button for Voice Typing */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            disabled={isTranscribing}
            aria-label="Voice typing"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
              isRecording
                ? 'bg-rose-500/25 text-rose-400 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                : isTranscribing
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 cursor-wait'
                : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300'
            }`}
            title={
              isRecording
                ? 'सुन रहा हूँ... रोकने के लिए टैप करें'
                : isTranscribing
                ? 'लिख रहा हूँ...'
                : 'बोलकर टाइप करें'
            }
          >
            {isRecording ? (
              <MicOff className="h-5 w-5 animate-pulse" />
            ) : isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          {/* Send / Stop Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!isStreaming && !inputText.trim() && !attachment && !activeAttachment}
            aria-label={isStreaming ? 'Stop generation' : 'Send message'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold transition-all active:scale-95 ${
              isStreaming
                ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)] hover:bg-rose-500'
                : inputText.trim() || attachment || activeAttachment
                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-[0_0_14px_rgba(6,182,212,0.4)] hover:brightness-110'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isStreaming ? (
              <Square className="h-4 w-4 fill-white" />
            ) : (
              <Send className="h-4 w-4 ml-0.5" />
            )}
          </button>
        </div>

        {/* Small sub-hint */}
        <div className="mt-1 flex items-center justify-between px-2 text-[10px] text-slate-500">
          <span>NAFEES AI • PDF, इमेज, टेक्स्ट फ़ाइल सपोर्ट और वॉइस टाइपिंग</span>
          <span className="hidden sm:inline">Enter भेजता है, Shift+Enter नई लाइन</span>
        </div>
      </div>
    </div>
  );
};
