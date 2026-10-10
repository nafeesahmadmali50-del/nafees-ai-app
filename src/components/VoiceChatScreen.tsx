import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  GraduationCap,
  Briefcase,
  Bot,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { AppMode, AppSettings } from '../types';
import { speakText, stopSpeaking } from '../services/speech';

interface VoiceChatScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChatAndOpen: (userPrompt: string, aiResponse: string, mode: AppMode) => void;
  settings: AppSettings;
  initialMode?: AppMode;
}

export const VoiceChatScreen: React.FC<VoiceChatScreenProps> = ({
  isOpen,
  onClose,
  onSendToChatAndOpen,
  settings,
  initialMode,
}) => {
  const [voiceMode, setVoiceMode] = useState<AppMode>(initialMode || 'normal');

  useEffect(() => {
    if (isOpen && initialMode) {
      setVoiceMode(initialMode);
    }
  }, [isOpen, initialMode]);
  const [lang, setLang] = useState<'hi-IN' | 'en-IN'>(
    settings.speechLang === 'en-US' ? 'en-IN' : 'hi-IN'
  );

  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References for MediaRecorder and audio handling
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);

  // State guards to prevent duplicate sessions or overlapping turns
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;
  const isProcessingRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const silenceTimerRef = useRef<any>(null);

  // Stop all active audio, recording, and speech synthesis
  const stopAllAudioAndSpeech = () => {
    stopSpeaking();
    if (nativeAudioRef.current) {
      try {
        nativeAudioRef.current.pause();
        nativeAudioRef.current.currentTime = 0;
      } catch {}
      nativeAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // Full teardown of microphone and recorder
  const cleanupRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      } catch {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }

    speechDetectedRef.current = false;
    isRecordingRef.current = false;
    setIsRecording(false);
  };

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopAllAudioAndSpeech();
      cleanupRecording();
      isProcessingRef.current = false;
      setIsThinking(false);
      setUserTranscript('');
      setAiResponse('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Start recording using getUserMedia and MediaRecorder
  const startRecording = async () => {
    // If AI is currently speaking, stop it immediately
    stopAllAudioAndSpeech();
    cleanupRecording();
    setErrorMessage(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('आपके ब्राउज़र में ऑडियो रिकॉर्डिंग समर्थित नहीं है (Audio recording not supported)।');
      return;
    }

    // 1. Request microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.warn('[VoiceChat Microphone Access Error]:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMessage('माइक्रोफोन की अनुमति नहीं मिली (Microphone denied)। कृपया ब्राउज़र सेटिंग्स में माइक्रोफोन चालू करें।');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setErrorMessage('कोई माइक्रोफोन नहीं मिला (No microphone found)। कृपया माइक्रोफोन कनेक्ट करें।');
      } else {
        setErrorMessage(`माइक्रोफोन चालू नहीं हो पाया: ${err?.message || 'अज्ञात त्रुटि'}`);
      }
      return;
    }

    // 2. Determine optimal supported audio MIME type
    let mimeType = 'audio/webm';
    if (typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
    }

    try {
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 32000,
      };
      if (mimeType) {
        options.mimeType = mimeType;
      }
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100); // 100ms slices for responsive capture
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsThinking(false);
      speechDetectedRef.current = false;
      speechStartTimeRef.current = Date.now();
    } catch (err: any) {
      console.warn('[MediaRecorder Init Error]:', err);
      setErrorMessage(`रिकॉर्डर शुरू नहीं हो पाया: ${err?.message || 'अज्ञात त्रुटि'}`);
      cleanupRecording();
      return;
    }

    // 3. Setup VAD (Voice Activity Detection) with AudioContext
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current || isProcessingRef.current) return;

        const input = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < input.length; i++) {
          sum += input[i] * input[i];
        }
        const rms = Math.sqrt(sum / input.length);

        // Voice energy threshold
        if (rms > 0.04) {
          if (!speechDetectedRef.current) {
            speechDetectedRef.current = true;
            speechStartTimeRef.current = Date.now();
          }

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (speechDetectedRef.current) {
          // User spoke and is now silent: wait 1100ms before auto-submitting
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              stopRecordingAndProcess();
            }, 1100);
          }
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (vadErr) {
      // AudioContext VAD is optional; manual tap-to-stop always works
      console.warn('[VAD AudioContext Notice]:', vadErr);
    }
  };

  // Stop recording and send audio to Gemini API
  const stopRecordingAndProcess = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {}
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setIsThinking(true);
    setErrorMessage(null);

    // Wait a brief moment for recorder dataavailable to flush
    await new Promise((r) => setTimeout(r, 150));

    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    // Cleanup mic stream to release hardware
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }

    if (chunks.length === 0) {
      isProcessingRef.current = false;
      setIsThinking(false);
      setErrorMessage('कोई आवाज़ रिकॉर्ड नहीं हुई (No audio recorded)। कृपया माइक दबाकर दोबारा बोलें।');
      return;
    }

    const rawMime = recorder?.mimeType || 'audio/webm';
    const cleanMime = rawMime.split(';')[0].trim() || 'audio/webm';
    const blob = new Blob(chunks, { type: rawMime });

    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      let base64Data = (reader.result as string) || '';
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      base64Data = base64Data.trim();

      if (!base64Data) {
        isProcessingRef.current = false;
        setIsThinking(false);
        setErrorMessage('ऑडियो डेटा प्रोसेस नहीं हो पाया। फिर कोशिश करें।');
        return;
      }

      try {
        let response: Response | null = null;
        let lastError: any = null;

        // Try request with a single automatic retry on network drops
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await fetch('/api/voice-turn', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                audio: base64Data,
                mimeType: cleanMime,
                mode: voiceMode,
                lang: lang,
              }),
            });
            if (response.ok) break;
          } catch (err: any) {
            lastError = err;
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }

        if (!response || !response.ok) {
          if (!response && lastError) {
            throw lastError;
          }
          const errData = response ? await response.json().catch(() => ({})) : {};
          throw new Error(errData.error || `HTTP ${response?.status || 500} API failed`);
        }

        const data = await response.json();
        const userText = data.userText || '';
        const aiText = data.aiText || '';
        const audioWav = data.audioWav || null;

        if (userText) {
          setUserTranscript(userText);
        }
        if (aiText) {
          setAiResponse(aiText);
        }

        setIsThinking(false);
        isProcessingRef.current = false;

        // Speak response out loud using Hindi TTS
        if (aiText) {
          stopAllAudioAndSpeech();
          setIsSpeaking(true);

          // If high-resolution WAV audio is available from Gemini, play it
          if (audioWav) {
            try {
              const audioObj = new Audio(`data:audio/wav;base64,${audioWav}`);
              nativeAudioRef.current = audioObj;
              audioObj.onended = () => {
                setIsSpeaking(false);
                nativeAudioRef.current = null;
              };
              audioObj.onerror = () => {
                nativeAudioRef.current = null;
                speakText(aiText, {
                  lang: lang === 'en-IN' ? 'en-IN' : 'hi-IN',
                  rate: settings.voiceRate || 1.0,
                  onEnd: () => setIsSpeaking(false),
                  onError: () => setIsSpeaking(false),
                });
              };
              await audioObj.play();
            } catch (playErr) {
              console.warn('[Native WAV Playback Notice]:', playErr);
              speakText(aiText, {
                lang: lang === 'en-IN' ? 'en-IN' : 'hi-IN',
                rate: settings.voiceRate || 1.0,
                onEnd: () => setIsSpeaking(false),
                onError: () => setIsSpeaking(false),
              });
            }
          } else {
            // Browser speech synthesis with speechSynthesis.cancel()
            speakText(aiText, {
              lang: lang === 'en-IN' ? 'en-IN' : 'hi-IN',
              rate: settings.voiceRate || 1.0,
              onEnd: () => setIsSpeaking(false),
              onError: () => setIsSpeaking(false),
            });
          }
        }
      } catch (apiErr: any) {
        console.error('[Voice Turn Request Error]:', apiErr);
        isProcessingRef.current = false;
        setIsThinking(false);
        const errMsg = String(apiErr?.message || apiErr || '');
        if (
          errMsg.includes('Failed to fetch') ||
          errMsg.includes('NetworkError') ||
          errMsg.includes('fetch resource') ||
          !navigator.onLine
        ) {
          setErrorMessage('इंटरनेट या नेटवर्क कनेक्शन में समस्या है (Network failed)। कृपया कनेक्शन जांचें।');
        } else {
          setErrorMessage(`AI सेवा से संपर्क नहीं हो पाया (API failed): ${apiErr?.message || 'सर्वर व्यस्त है'}`);
        }
      }
    };

    reader.onerror = () => {
      isProcessingRef.current = false;
      setIsThinking(false);
      setErrorMessage('ऑडियो फ़ाइल पढ़ने में त्रुटि हुई।');
    };

    reader.readAsDataURL(blob);
  };

  // Toggle microphone action:
  // 1st tap: start recording
  // 2nd tap while recording: stop recording and send immediately
  // tap while speaking: stop speech
  const handleMicTap = () => {
    if (isSpeaking) {
      stopAllAudioAndSpeech();
      return;
    }

    if (isRecording) {
      stopRecordingAndProcess();
    } else if (!isThinking) {
      startRecording();
    }
  };

  const handleStopSpeaking = () => {
    stopAllAudioAndSpeech();
  };

  const handleModeChange = (newMode: AppMode) => {
    stopAllAudioAndSpeech();
    cleanupRecording();
    setVoiceMode(newMode);
  };

  const handleLangChange = (newLang: 'hi-IN' | 'en-IN') => {
    stopAllAudioAndSpeech();
    cleanupRecording();
    setLang(newLang);
  };

  const handleContinueInChat = () => {
    stopAllAudioAndSpeech();
    cleanupRecording();
    if (userTranscript || aiResponse) {
      onSendToChatAndOpen(
        userTranscript || 'Voice conversation',
        aiResponse || 'Voice conversation completed',
        voiceMode
      );
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#040711] text-white">
      {/* Top Bar */}
      <div className="flex h-16 items-center justify-between border-b border-cyan-500/20 px-4 sm:px-6">
        <button
          onClick={() => {
            stopAllAudioAndSpeech();
            cleanupRecording();
            onClose();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#090f1d] text-slate-300 hover:text-white transition-all active:scale-95"
          title="बंद करें"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isRecording
                ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse'
                : isSpeaking
                ? 'bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-pulse'
                : isThinking
                ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse'
                : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
            }`}
          />
          <span className="font-extrabold text-sm sm:text-base tracking-wider bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            NAFEES AI LIVE VOICE
          </span>
        </div>

        {/* Language selector */}
        <button
          onClick={() => handleLangChange(lang === 'hi-IN' ? 'en-IN' : 'hi-IN')}
          className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 transition-colors"
        >
          {lang === 'hi-IN' ? 'हिन्दी (Hindi)' : 'English (India)'}
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex justify-center p-3">
        <div className="inline-flex rounded-2xl border border-slate-800 bg-[#090e1c] p-1 shadow-inner">
          <button
            onClick={() => handleModeChange('normal')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              voiceMode === 'normal'
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Normal</span>
          </button>

          <button
            onClick={() => handleModeChange('study')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              voiceMode === 'study'
                ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Study (पढ़ाई)</span>
          </button>

          <button
            onClick={() => handleModeChange('business')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              voiceMode === 'business'
                ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Business (बिजनेस)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        {/* Glowing Orb & Large Mic Button */}
        <div className="relative my-6 flex items-center justify-center">
          {/* Animated Neon Ripple Rings */}
          {(isRecording || isThinking || isSpeaking) && (
            <>
              <div
                className={`absolute -inset-8 rounded-full opacity-40 blur-xl animate-ping ${
                  isRecording
                    ? 'bg-rose-500'
                    : isThinking
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
              />
              <div
                className={`absolute -inset-4 rounded-full opacity-60 blur-md ${
                  isRecording
                    ? 'bg-rose-600'
                    : isThinking
                    ? 'bg-amber-600'
                    : 'bg-cyan-600'
                }`}
              />
            </>
          )}

          {/* Central Mic Button */}
          <button
            onClick={handleMicTap}
            className={`relative z-10 flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-full border-4 shadow-2xl transition-all duration-300 active:scale-95 ${
              isRecording
                ? 'border-rose-400 bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-[0_0_40px_rgba(244,63,94,0.6)] animate-pulse'
                : isThinking
                ? 'border-amber-400 bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-[0_0_40px_rgba(245,158,11,0.6)]'
                : isSpeaking
                ? 'border-cyan-300 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_40px_rgba(6,182,212,0.7)]'
                : 'border-cyan-500/40 bg-gradient-to-tr from-[#0a1224] to-[#122244] text-cyan-300 hover:border-cyan-400 hover:text-white shadow-[0_0_25px_rgba(6,182,212,0.3)]'
            }`}
            title={
              isRecording
                ? 'बोलना समाप्त करने के लिए टैप करें (Tap to Send)'
                : isSpeaking
                ? 'आवाज़ रोकने के लिए टैप करें'
                : 'बोलने के लिए टैप करें (Tap to Speak)'
            }
          >
            {isRecording ? (
              <Mic className="h-12 w-12 sm:h-14 sm:w-14 animate-bounce" />
            ) : isThinking ? (
              <RefreshCw className="h-12 w-12 sm:h-14 sm:w-14 animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="h-12 w-12 sm:h-14 sm:w-14 animate-pulse" />
            ) : (
              <Mic className="h-12 w-12 sm:h-14 sm:w-14" />
            )}
          </button>
        </div>

        {/* Status text */}
        <p className="text-sm sm:text-base font-bold text-slate-200">
          {isRecording
            ? 'सुन रहा हूँ... बोलिए (बोलना बंद करें या दोबारा दबाएं)'
            : isThinking
            ? 'विचार कर रहा हूँ... (Thinking...)'
            : isSpeaking
            ? 'NAFEES AI बोल रहा है... (Speaking...)'
            : 'माइक दबाकर सवाल पूछें (Tap to Talk)'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {voiceMode === 'study'
            ? 'Study Mode: किसी भी विषय या परीक्षा पर चर्चा करें'
            : voiceMode === 'business'
            ? 'Business Mode: बिजनेस प्लान और रणनीतियों पर बात करें'
            : 'बोलिए, पूरा वाक्य सुनकर AI सटीक जवाब देगा (दोबारा दबाकर भी भेज सकते हैं)'}
        </p>

        {/* Error message with specific real reason */}
        {errorMessage && (
          <div className="mt-3 max-w-md rounded-xl border border-rose-500/40 bg-rose-950/70 p-2.5 text-xs text-rose-300 animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Live Transcript Display Box - Clean final text only */}
        {(userTranscript || aiResponse) && (
          <div className="mt-5 w-full max-w-lg space-y-3 rounded-2xl border border-cyan-500/20 bg-[#080d1a]/90 p-4 text-left shadow-xl backdrop-blur max-h-52 overflow-y-auto">
            {userTranscript && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  आप (You):
                </span>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5">{userTranscript}</p>
              </div>
            )}

            {aiResponse && (
              <div className="border-t border-slate-800 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    NAFEES AI:
                  </span>
                  {isSpeaking && (
                    <button
                      onClick={handleStopSpeaking}
                      className="flex items-center gap-1 text-[10px] text-rose-400 hover:underline"
                    >
                      <VolumeX className="h-3 w-3" />
                      <span>आवाज़ रोकें</span>
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-cyan-100 mt-0.5 whitespace-pre-wrap">
                  {aiResponse}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Action to continue in chat */}
      <div className="border-t border-cyan-500/15 bg-[#050811] p-4 flex items-center justify-between max-w-xl mx-auto w-full">
        <button
          onClick={() => {
            stopAllAudioAndSpeech();
            cleanupRecording();
            onClose();
          }}
          className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          बंद करें
        </button>

        {(userTranscript || aiResponse) && (
          <button
            onClick={handleContinueInChat}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95 transition-all"
          >
            <MessageSquare className="h-4 w-4" />
            <span>चैट में खोलें (Open in Chat)</span>
          </button>
        )}
      </div>
    </div>
  );
};
