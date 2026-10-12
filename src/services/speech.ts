// Speech Synthesis (Text-to-Speech) and Speech Recognition (Speech-to-Text)
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
// Check if speech synthesis is supported
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Speak text using browser speech synthesis
export function speakText(
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): void {
  if (!isSpeechSynthesisSupported()) return;

  try {
    window.speechSynthesis.cancel(); // stop any current speech

    // Clean markdown symbols for cleaner voice narration
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'कोड ब्लॉक छोड़ दिया गया')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;

    // Pick suitable voice
    const voices = window.speechSynthesis.getVoices();
    const preferredLang = options?.lang || 'hi-IN';

    // Try finding matching voice
    const voice = voices.find(v => v.lang.toLowerCase().startsWith(preferredLang.toLowerCase().slice(0, 2))) ||
                  voices.find(v => v.lang.includes('IN')) ||
                  voices[0];

    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = preferredLang;

    if (options?.onStart) utterance.onstart = options.onStart;
    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('TTS error:', err);
    options?.onError?.(err);
  }
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export const MIC_PERMISSION_DENIED_MESSAGE = 'माइक्रोफोन चालू नहीं हो पाया। फिर कोशिश करें।';

// Speech Recognition (Speech-to-Text)
export function isSpeechRecognitionSupported(): boolean {
  return true;
}

export interface SpeechRecognizerHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function createSpeechRecognizer(
  lang: string = 'hi-IN',
  handlers: SpeechRecognizerHandlers
) {
  let partialListener: any = null;
  let stopped = false;

  return {
    start: async () => {
      try {
        const permission = await SpeechRecognition.checkPermissions();

        if (permission.speechRecognition !== 'granted') {
          const requested = await SpeechRecognition.requestPermissions();
          if (requested.speechRecognition !== 'granted') {
            handlers.onError(MIC_PERMISSION_DENIED_MESSAGE);
            return;
          }
        }

        const availability = await SpeechRecognition.available();
        if (!availability.available) {
          handlers.onError('इस फोन में वॉइस पहचान उपलब्ध नहीं है।');
          return;
        }

        handlers.onStart?.();

        partialListener = await SpeechRecognition.addListener(
          'partialResults',
          (data: any) => {
            const text = data.matches?.[0] || '';
            if (text) {
              handlers.onResult(text, false);
            }
          }
        );

        await SpeechRecognition.start({
          language: lang,
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
      } catch (err) {
        console.error('Native speech recognition error:', err);
        handlers.onError('वॉइस इनपुट में त्रुटि हुई');
      }
    },

    stop: async () => {
      if (stopped) return;
      stopped = true;

      try {
        await SpeechRecognition.stop();
      } catch {}

      try {
        if (partialListener) {
          await partialListener.remove();
          partialListener = null;
        }
      } catch {}

      handlers.onEnd?.();
    },
  };
}
export interface AudioRecorderController {
  stop: () => Promise<{ base64: string; mimeType: string }>;
  cancel: () => void;
}

// Universal Audio Recording using MediaRecorder + getUserMedia
export async function startAudioRecording(): Promise<AudioRecorderController> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('ऑडियो रिकॉर्डिंग समर्थित नहीं है');
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err: any) {
    console.warn('Microphone permission or access not granted:', err?.message || err);
    throw new Error(MIC_PERMISSION_DENIED_MESSAGE);
  }

  // Determine optimal supported audio mimeType
  let mimeType = 'audio/webm';
  if (typeof MediaRecorder.isTypeSupported === 'function') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/aac')) {
      mimeType = 'audio/aac';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    }
  }

  const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  mediaRecorder.start(250); // collect every 250ms

  return {
    stop: () => {
      return new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
        mediaRecorder.onstop = async () => {
          try {
            // Stop all audio tracks immediately to turn off the microphone icon
            stream.getTracks().forEach((track) => track.stop());

            const effectiveMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
            const blob = new Blob(chunks, { type: effectiveMime });

            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1] || '';
              resolve({ base64, mimeType: effectiveMime });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } catch (e) {
            reject(e);
          }
        };

        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        } else {
          stream.getTracks().forEach((track) => track.stop());
          resolve({ base64: '', mimeType });
        }
      });
    },
    cancel: () => {
      try {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } catch {}
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

// Transcribe audio using server-side Gemini audio transcription
export async function transcribeAudioWithGemini(
  base64Audio: string,
  mimeType: string,
  language: string = 'hi'
): Promise<string> {
  const response = await fetch('https://nafees-ai-app-2.onrender.com/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: base64Audio,
      mimeType,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error('ट्रांसक्रिप्शन विफल रहा');
  }

  const data = await response.json();
  return (data.text || '').trim();
}
