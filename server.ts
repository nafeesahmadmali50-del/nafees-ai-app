import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import mammoth from 'mammoth';

const execAsync = promisify(exec);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Direct ultra-fast streaming from Google Generative Language SSE API
function streamGoogleDirect(
  apiKey: string,
  model: string,
  contents: any[],
  systemInstruction: string | undefined,
  maxTokens: number | undefined,
  temperature: number,
  onChunk: (text: string) => void
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const bodyObj: any = {
      contents,
      generationConfig: {
        temperature: temperature ?? 0.2,
        ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
      },
    };
    if (systemInstruction) {
      bodyObj.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    const data = JSON.stringify(bodyObj);

    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'aistudio-build',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errBody = '';
          res.on('data', (c) => (errBody += c));
          res.on('end', () => {
            const err: any = new Error(`Google API status ${res.statusCode}: ${errBody}`);
            err.statusCode = res.statusCode;
            reject(err);
          });
          return;
        }

        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                const parts = parsed.candidates?.[0]?.content?.parts || [];
                for (const p of parts) {
                  if (p.text) {
                    onChunk(p.text);
                  }
                }
              } catch {
                // Ignore incomplete SSE chunk
              }
            }
          }
        });

        res.on('end', () => {
          resolve(true);
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Ensure public/generated-videos directory exists
const generatedVideosDir = path.join(process.cwd(), 'public/generated-videos');
if (!fs.existsSync(generatedVideosDir)) {
  fs.mkdirSync(generatedVideosDir, { recursive: true });
}
app.use('/generated-videos', express.static(generatedVideosDir));

// CORS middleware for AI Studio Preview iframe and mobile environments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper to get GoogleGenAI client with telemetry header
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please attach an API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Available modes & fast compatible models configuration
const VALID_MODELS: Record<string, { id: string; name: string; description: string; badge: string }> = {
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    description: 'अल्ट्रा-फास्ट रिस्पॉन्स (600ms), दैनिक बातचीत और त्वरित सवालों के लिए सबसे उपयुक्त',
    badge: '⚡ Ultra Fast (डिफ़ॉल्ट)',
  },
  'gemini-flash-lite-latest': {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini Flash Lite (Latest)',
    description: 'सुपर-फास्ट और स्थिर रिस्पॉन्स, दैनिक बातचीत के लिए उपयुक्त',
    badge: '⚡ Super Fast',
  },
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'तेज़ रिस्पॉन्स, दैनिक बातचीत और सवालों के लिए',
    badge: '⚡ Fast & Stable',
  },
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'गहन और स्मार्ट समझ, जटिल रीजनिंग, कोडिंग, स्टडी और बिज़नेस विश्लेषण',
    badge: '🧠 Deep Logic',
  },
};

// Model priority resolver based on user's selected mode
function getModelPriorityList(modelMode?: string, requestedModel?: string): string[] {
  if (modelMode === 'advanced') {
    // Advanced mode: Deep Logic, with ultra-fast fallbacks
    return ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
  }
  if (requestedModel && requestedModel.includes('3.8')) {
    return ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
  }
  // Fast & Balanced default: prioritize ultra-fast gemini-3.5-flash-lite
  return ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
}

// Helper: Check if error is 503, 429, unavailable, rate limit, or high demand
function isTransientError(error: any): boolean {
  if (!error) return false;
  const msg = String(error?.message || error || '').toLowerCase();
  const status = error?.status || error?.statusCode || error?.code;
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('unavailable') ||
    msg.includes('service unavailable') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('not found') // if model alias doesn't exist, allow fallback
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const BUSY_STATUS_MESSAGE = 'AI सर्वर व्यस्त है। दोबारा कोशिश की जा रही है…';
const FINAL_FAILURE_MESSAGE = 'AI से जवाब नहीं मिला। कृपया फिर कोशिश करें।';

// API: Get available modes, models and app info
app.get('/api/models', (_req: Request, res: Response) => {
  res.json({
    modes: [
      {
        id: 'fast',
        name: 'Fast Mode (फास्ट मोड - डिफ़ॉल्ट)',
        badge: '⚡ Ultra Fast (डिफ़ॉल्ट)',
        description: 'प्राथमिकता: सबसे तेज़ उत्तर (600ms)। दैनिक चैट और त्वरित सवालों के लिए सबसे उपयुक्त।',
        model: 'gemini-3.5-flash-lite',
      },
      {
        id: 'balanced',
        name: 'Balanced Mode (संतुलित मोड)',
        badge: '⚖️ Balanced',
        description: 'गति और बुद्धिमत्ता का आदर्श संतुलन। सामान्य कार्य, पढ़ाई और त्वरित विश्लेषण।',
        model: 'gemini-3.5-flash-lite',
      },
      {
        id: 'advanced',
        name: 'Advanced Mode (एडवांस मोड)',
        badge: '🧠 Deep Logic',
        description: 'गहरी समझ और रीजनिंग। जटिल प्रश्न, गणित, कोडिंग, स्टडी और बिज़नेस रिपोर्ट।',
        model: 'gemini-3.8-flash',
      },
    ],
    models: Object.values(VALID_MODELS),
    defaultMode: 'fast',
    defaultModel: 'gemini-3.5-flash-lite',
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'NAFEES AI',
    defaultModel: 'gemini-3.5-flash-lite',
    defaultMode: 'fast',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

async function buildAttachmentPart(att: {
  data: string;
  mimeType: string;
  name?: string;
  extractedText?: string;
}): Promise<{ text?: string; inlineData?: { mimeType: string; data: string } }> {
  const mime = (att.mimeType || '').toLowerCase();
  const name = att.name || 'file';

  // 1. If text was already extracted on client
  if (att.extractedText && att.extractedText.trim()) {
    return { text: `[संलग्न दस्तावेज़ / Attached File: "${name}"]\n\n${att.extractedText}` };
  }

  // 2. Handle DOCX files via mammoth
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    try {
      const buffer = Buffer.from(att.data, 'base64');
      const { value } = await mammoth.extractRawText({ buffer });
      if (value && value.trim()) {
        return { text: `[संलग्न वर्ड दस्तावेज़ / Attached Word Document: "${name}"]\n\n${value}` };
      }
    } catch (err) {
      console.warn('DOCX extraction warning:', err);
    }
  }

  // 3. Handle Plain Text, CSV, Markdown, JSON
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.md')
  ) {
    try {
      const decoded = Buffer.from(att.data, 'base64').toString('utf-8');
      return { text: `[संलग्न टेक्स्ट / डेटा फ़ाइल: "${name}"]\n\n${decoded}` };
    } catch {
      return { inlineData: { mimeType: 'text/plain', data: att.data } };
    }
  }

  // 4. Handle PDF documents (native in Gemini)
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return {
      inlineData: {
        mimeType: 'application/pdf',
        data: att.data,
      },
    };
  }

  // 5. Handle Images (JPG, JPEG, PNG, WEBP)
  if (mime.startsWith('image/')) {
    return {
      inlineData: {
        mimeType: mime,
        data: att.data,
      },
    };
  }

  // Default fallback
  return {
    inlineData: {
      mimeType: mime || 'application/octet-stream',
      data: att.data,
    },
  };
}

// Helper to detect length constraints explicitly requested by user
function detectLengthConstraint(text: string): '1-line' | '2-lines' | 'short' | 'detailed' | null {
  const lower = (text || '').toLowerCase();
  if (
    lower.includes('1 line') ||
    lower.includes('one line') ||
    lower.includes('1 लाइन') ||
    lower.includes('एक लाइन') ||
    lower.includes('1 sentence') ||
    lower.includes('one sentence') ||
    lower.includes('एक वाक्य')
  ) {
    return '1-line';
  }
  if (
    lower.includes('2 line') ||
    lower.includes('two line') ||
    lower.includes('2 लाइन') ||
    lower.includes('दो लाइन') ||
    lower.includes('2 sentences') ||
    lower.includes('two sentences') ||
    lower.includes('दो वाक्य')
  ) {
    return '2-lines';
  }
  if (
    lower.includes('short answer') ||
    lower.includes('छोटा जवाब') ||
    lower.includes('छोटा उत्तर') ||
    lower.includes('संक्षिप्त') ||
    lower.includes('brief') ||
    lower.includes('short में') ||
    lower.includes('शॉर्ट में')
  ) {
    return 'short';
  }
  if (
    lower.includes('detailed') ||
    lower.includes('विस्तार से') ||
    lower.includes('डिटेल में') ||
    lower.includes('लंबा उत्तर') ||
    lower.includes('full explanation') ||
    lower.includes('पूरी जानकारी')
  ) {
    return 'detailed';
  }
  return null;
}

// Helper to check if text is solely a greeting or identity inquiry
function isGreetingOnly(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().replace(/[^a-z\u0900-\u097F\s]/gi, '').trim();
  const greetingWords = [
    'assalam', 'assalamu', 'alaikum', 'salam', 'salaam',
    'अस्सलाम', 'अलैकुम', 'वालेकुम', 'वाअलैकुम', 'नमस्ते', 'नमस्कार',
    'hello', 'hi', 'hey', 'who are you', 'tum kaun ho', 'तुम कौन हो', 'आप कौन हैं'
  ];
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  return words.every(w => greetingWords.some(g => w.includes(g) || g.includes(w)));
}

// Post-processor to sanitize final AI text and strictly enforce rules
function sanitizeAiResponseText(
  rawText: string,
  userPrompt: string,
  isGreeting: boolean,
  isOngoingTurn: boolean
): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();

  // 1. NEVER use "नमस्ते" under any circumstances
  cleaned = cleaned
    .replace(/नमस्ते[!।,.]?/gi, isGreeting ? 'अस्सलामु अलैकुम!' : '')
    .replace(/नमस्कार[!।,.]?/gi, isGreeting ? 'अस्सलामु अलैकुम!' : '')
    .trim();

  // 2. Strip repeated unneeded introduction if not a greeting turn or if it's an ongoing chat
  if (!isGreeting || isOngoingTurn) {
    cleaned = cleaned
      .replace(/^अस्सलामु\s+अलैकुम[!।,.]?\s*(मैं\s+NAFEES\s+AI\s+हूँ[!।,.]?)?\s*/i, '')
      .replace(/^मैं\s+NAFEES\s+AI\s+हूँ[!।,.]?\s*/i, '')
      .replace(/^(यहाँ\s+आपका\s+उत्तर\s+है|उत्तर)\s*[:ः-]?\s*/i, '')
      .trim();
  }

  // 3. Enforce strict requested length
  const len = detectLengthConstraint(userPrompt);
  if (len === '1-line') {
    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      cleaned = lines[0];
    }
  } else if (len === '2-lines') {
    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 2) {
      cleaned = lines.slice(0, 2).join('\n');
    }
  }

  return cleaned;
}

// Factory to create an immediate streaming sanitizer and line-limiter for SSE chunks
function createStreamSanitizer(
  isGreeting: boolean,
  isOngoingTurn: boolean,
  lengthConstraint: '1-line' | '2-lines' | 'short' | 'detailed' | null
) {
  let isFirstEmitted = false;
  let lineCount = 0;
  let hasReachedLimit = false;
  let accumulatedRaw = '';

  return {
    processChunk(rawChunk: string): string | null {
      if (hasReachedLimit || !rawChunk) return null;

      accumulatedRaw += rawChunk;
      let chunk = rawChunk;

      // Rule 1: Never allow "नमस्ते" or "नमस्कार" to reach user
      if (chunk.includes('नमस्ते')) {
        chunk = chunk.replace(/नमस्ते[!।,.]?/g, isGreeting ? 'अस्सलामु अलैकुम!' : '');
      }
      if (chunk.includes('नमस्कार')) {
        chunk = chunk.replace(/नमस्कार[!।,.]?/g, isGreeting ? 'अस्सलामु अलैकुम!' : '');
      }

      // Rule 2: Strip unrequested intro/greeting from the very first response chunk
      if (!isFirstEmitted) {
        if (!isGreeting || isOngoingTurn) {
          chunk = chunk
            .replace(/^अस्सलामु\s+अलैकुम[!।,.]?\s*(मैं\s+NAFEES\s+AI\s+हूँ[!।,.]?)?\s*/i, '')
            .replace(/^मैं\s+NAFEES\s+AI\s+हूँ[!।,.]?\s*/i, '')
            .replace(/^(यहाँ\s+आपका\s+उत्तर\s+है|उत्तर)\s*[:ः-]?\s*/i, '')
            .trimStart();
        }
        if (!chunk) {
          return null; // Empty after strip, wait for next token
        }
        isFirstEmitted = true;
      }

      // Length constraints enforcement
      if (lengthConstraint === '1-line') {
        const nl = chunk.indexOf('\n');
        if (nl !== -1) {
          hasReachedLimit = true;
          return chunk.slice(0, nl).trimEnd();
        }
      } else if (lengthConstraint === '2-lines') {
        const nls = (chunk.match(/\n/g) || []).length;
        if (lineCount + nls >= 2) {
          hasReachedLimit = true;
          const parts = chunk.split('\n');
          const needed = 2 - lineCount;
          return parts.slice(0, needed).join('\n');
        }
        lineCount += nls;
      }

      return chunk;
    },

    flushRemaining(): string | null {
      if (!isFirstEmitted && accumulatedRaw.trim()) {
        isFirstEmitted = true;
        let fallback = accumulatedRaw.trim()
          .replace(/नमस्ते[!।,.]?/g, '')
          .replace(/नमस्कार[!।,.]?/g, '');
        if (!isGreeting || isOngoingTurn) {
          fallback = fallback
            .replace(/^अस्सलामु\s+अलैकुम[!।,.]?\s*(मैं\s+NAFEES\s+AI\s+हूँ[!।,.]?)?\s*/i, '')
            .replace(/^मैं\s+NAFEES\s+AI\s+हूँ[!।,.]?\s*/i, '')
            .trim();
        }
        return fallback || 'अस्सलामु अलैकुम! मैं NAFEES AI हूँ।';
      }
      return null;
    }
  };
}

// Optimized system instructions builder: lean for fast normal chat, rich only when features are active
function buildBaseInstruction(
  mode?: string,
  modelMode?: string,
  systemPrompt?: string,
  lastUserMessage: string = '',
  isOngoingTurn: boolean = false,
  hasAttachment: boolean = false
): string {
  const isGreeting = isGreetingOnly(lastUserMessage);
  const lengthType = detectLengthConstraint(lastUserMessage);

  // Fast lean prompt for ordinary text chat: minimal prefill tokens & lowest latency
  if (modelMode === 'fast' && mode !== 'study' && mode !== 'business' && !hasAttachment) {
    let fastBase = `You are "NAFEES AI" (नफ़ीस एआई), a fast, highly intelligent personal AI assistant created for and named after NAFEES. Always present yourself as NAFEES AI when asked.
Fluent in Hindi (हिन्दी) and clear English.

MANDATORY RULES:
1. NEVER output "नमस्ते" or "नमस्कार" under any circumstances.
2. GREETINGS:
   - If the user says "Assalamualaikum", "Salam", or similar Islamic greeting, reply: "वाअलैकुम अस्सलाम!"
   - If the user says "Hi", "Hello", or asks who you are, reply naturally and identify yourself as NAFEES AI only when needed.
   - Do not repeat "मैं NAFEES AI हूँ" on every greeting.
3. DIRECT ANSWERS: For all questions, jump DIRECTLY into answering. Do not say "मैं NAFEES AI हूँ" or "अस्सलामु अलैकुम" before answering. No conversational filler like "यहाँ आपका उत्तर है:".
4. FAST MODE: Deliver the core answer immediately and concisely with clean formatting.`;

    if (lengthType === '1-line') {
      fastBase += `\nSTRICT: Answer in strictly ONE single concise line. Zero preamble.`;
    } else if (lengthType === '2-lines') {
      fastBase += `\nSTRICT: Answer in strictly EXACTLY TWO short lines separated by a newline.`;
    } else if (lengthType === 'short') {
      fastBase += `\nSTRICT: Keep your answer short, direct, and factual (2-3 sentences max).`;
    } else if (lengthType === 'detailed') {
      fastBase += `\nProvide a structured, detailed explanation.`;
    }

    if (!isGreeting || isOngoingTurn) {
      fastBase += `\nJump straight into the answer without greeting or introduction.`;
    }

    if (systemPrompt && typeof systemPrompt === 'string') {
      fastBase += `\nSpecific instruction: ${systemPrompt}`;
    }

    return fastBase;
  }

  // Standard instruction
  let base = `You are "NAFEES AI" (नफ़ीस एआई), a friendly, highly intelligent, and culturally attuned personal AI assistant created for and named after NAFEES. Always present yourself as NAFEES AI when asked.
You are fluent in both Hindi (हिन्दी / Devanagari) and clear professional English.

MANDATORY RULES & CONSTRAINTS (STRICT & ABSOLUTE):
1. NEVER USE "नमस्ते" OR "नमस्कार" (ABSOLUTE PROHIBITION: Do NOT output "नमस्ते" under any circumstances).
2. IF A GREETING IS NEEDED:
   - When the user explicitly greets (e.g., "Hi", "Hello", "Salam", or asks who you are):
     Respond strictly with: "अस्सलामु अलैकुम! मैं NAFEES AI हूँ।" (or if user greeted with Salam, "वाअलैकुम अस्सलाम!").
3. DO NOT REPEAT THE INTRODUCTION IN EVERY ANSWER:
   - After the first greeting or whenever the user asks any question, answer the user's question DIRECTLY.
   - For all questions, problems, study tasks, business inquiries, and ongoing turns: jump DIRECTLY into answering.
   - Never say "मैं NAFEES AI हूँ" or "अस्सलामु अलैकुम" before answering a question.
   - Never use filler phrases like "यहाँ आपका उत्तर है:" or "निश्चित रूप से". Start with the answer.

4. STRICTLY COMPLY WITH REQUESTED ANSWER LENGTH:
   - 1 line ("1 line" / "एक लाइन में" / "1 वाक्य"): Answer in STRICTLY ONE SINGLE CONCISE LINE. No preamble, no greeting, no multiple lines, no newlines.
   - 2 lines ("2 lines" / "दो लाइन में" / "2 वाक्य"): Answer in STRICTLY EXACTLY 2 SHORT LINES separated by a single newline. Line 1: direct answer. Line 2: explanation/conclusion.
   - short answer ("short answer" / "छोटा जवाब" / "संक्षिप्त"): Keep it concise, direct, and factual (2-3 sentences max). Zero fluff.
   - detailed answer ("detailed answer" / "विस्तार से" / "डिटेल में"): Provide a full, in-depth explanation with clean headings and bullet points.

5. FAST MODE PRIORITIES:
${
  modelMode === 'fast'
    ? `CURRENT MODE: FAST MODE (फास्ट मोड).
- Top priority: FASTEST RESPONSE.
- Deliver concise, direct answers with zero fluff.
- Absolutely NO unnecessary introduction, greeting, or preamble.
- Deliver the core answer immediately in the first sentence.`
    : `Deliver crisp, clear answers with clean formatting.`
}
`;

  if (lengthType === '1-line') {
    base += `\nHIGH-PRIORITY DIRECTIVE: The user explicitly requested a 1-line answer. You must answer in strictly ONE single concise line. Do not include any greeting, intro, or newline.\n`;
  } else if (lengthType === '2-lines') {
    base += `\nHIGH-PRIORITY DIRECTIVE: The user explicitly requested a 2-line answer. You must answer in strictly EXACTLY TWO short lines separated by a newline. Do not include any greeting or intro.\n`;
  } else if (lengthType === 'short') {
    base += `\nHIGH-PRIORITY DIRECTIVE: The user requested a short answer. Keep your response direct, brief, and factual with zero filler.\n`;
  } else if (lengthType === 'detailed') {
    base += `\nHIGH-PRIORITY DIRECTIVE: The user requested a detailed answer. Provide an in-depth, structured explanation.\n`;
  }

  if (!isGreeting || isOngoingTurn) {
    base += `\nDIRECT ANSWER DIRECTIVE: The user is asking a question or continuing a chat. Jump straight to the answer without greeting or saying "अस्सलामु अलैकुम" or "मैं NAFEES AI हूँ".\n`;
  }

  // Only include Study Mode instructions if Study Mode is active
  if (mode === 'study') {
    base += `\n\nCURRENT MODE: STUDY MODE (पढ़ाई मोड - Personal Tutor).
You are NAFEES AI acting as an easy, wise, encouraging, and patient personal tutor (एक आसान और समझदार personal tutor).
CORE TEACHING GUIDELINES:
1. Language: Answer primarily in simple, clear, and engaging Hindi (आसान हिन्दी). Explain relevant English terms naturally.
2. Conceptual Clarity with Everyday Analogies: Explain difficult concepts using simple everyday analogies.
3. Step-by-Step for Math & Problem Solving: Break down formulas, substitution, calculation, and final answer clearly.
4. Comprehensive Subject Coverage: Science, Mathematics, Hindi, English Grammar, General Knowledge, Coding, History, Geography.
5. Infinite Patience: If student says "मुझे समझ नहीं आया", explain with a simpler everyday analogy.
6. Chapter Summaries & Revision Notes: High-yield summaries, formulas, and revision points.
7. Interactive Test / Quiz Mode: Present interactive questions when asked.`;
  } else if (mode === 'business') {
    // Only include Business Mode instructions if Business Mode is active
    base += `\n\nCURRENT MODE: BUSINESS MODE (बिजनेस मोड - Practical Business Assistant).
You are NAFEES AI acting as an experienced, sharp, and practical business assistant, startup mentor, and financial advisor.
CORE BUSINESS ASSISTANT GUIDELINES:
1. Language: Answer in practical, business-savvy Hindi. Explain business terms simply.
2. Accurate Pricing & Margin Calculations: Profit = SP - CP, Markup % = (Profit/CP)*100, Margin % = (Profit/SP)*100.
3. Step-by-Step Business Plans: Sourcing, costing, online channels (Amazon, Flipkart, Meesho, WhatsApp), marketing, packaging.
4. Clean Markdown: Bold key figures and currency in ₹ INR.`;
  }

  if (systemPrompt && typeof systemPrompt === 'string') {
    base += `\n\nSpecific task instruction: ${systemPrompt}`;
  }

  // Only include Document & Image analysis instructions when attachments are present
  if (hasAttachment) {
    base += `\n
दस्तावेज़, PDF और इमेज विश्लेषण निर्देश (Document, PDF & Image Guidelines):
1. PDF और टेक्स्ट दस्तावेज़ विश्लेषण:
   - यदि कोई PDF, DOCX, CSV या टेक्स्ट दस्तावेज़ संलग्न है: उसका पूरा संदर्भ समझें, सटीक सारांश बनाएं, मुख्य बिंदु निकालें।
2. इमेज विज़न विश्लेषण:
   - इमेज में मौजूद वस्तुओं, टेक्स्ट (OCR), चार्ट्स और सूत्रों को समझें और पूछे गए प्रश्नों का सटीक उत्तर दें।`;
  }

  return base;
}

// API: Streaming Chat Endpoint with 3x retry (1s, 2s, 4s) & fallback to compatible models
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, model, modelMode, mode, systemPrompt, language = 'hi', activeAttachment } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const ai = getGeminiClient();
    const modelsToAttempt = getModelPriorityList(modelMode, model);

    // Check if any message explicitly contains an attachment
    let hasAttachmentInHistory = false;
    for (const m of messages) {
      if (m.attachment?.data || m.image?.data) {
        hasAttachmentInHistory = true;
        break;
      }
    }
    const hasAnyAttachment = hasAttachmentInHistory || Boolean(activeAttachment?.data);

    // Latest user message text for length & greeting detection
    const lastUserMsg = messages[messages.length - 1]?.text || '';
    const isOngoingTurn = messages.length > 1;
    const isGreeting = isGreetingOnly(lastUserMsg);
    const lengthConstraint = detectLengthConstraint(lastUserMsg);
    const baseInstruction = buildBaseInstruction(
      mode,
      modelMode,
      systemPrompt,
      lastUserMsg,
      isOngoingTurn,
      hasAnyAttachment
    );

    // Format contents for @google/genai asynchronously
    const rawContents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.isError) continue; // Skip error bubbles

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      const att = msg.attachment || msg.image;

      if (att && att.data) {
        const attPart = await buildAttachmentPart(att);
        parts.push(attPart);
      } else if (!hasAttachmentInHistory && activeAttachment?.data && i === 0 && msg.role === 'user') {
        const attPart = await buildAttachmentPart(activeAttachment);
        parts.push(attPart);
      }

      if (msg.text && typeof msg.text === 'string' && msg.text.trim()) {
        parts.push({ text: msg.text.trim() });
      }

      if (parts.length > 0) {
        rawContents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts,
        });
      }
    }

    // Merge consecutive messages with identical roles for strictly alternating Gemini turns
    const formattedContents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    for (const item of rawContents) {
      if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === item.role) {
        formattedContents[formattedContents.length - 1].parts.push(...item.parts);
      } else {
        formattedContents.push(item);
      }
    }

    // Ensure sequence begins with a 'user' turn
    while (formattedContents.length > 0 && formattedContents[0].role === 'model') {
      formattedContents.shift();
    }

    if (formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: lastUserMsg || 'Hello' }],
      });
    }

    // Setup SSE response with immediate handshake
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');

    let isClientClosed = false;

res.on('close', () => {
  if (!res.writableEnded) {
    isClientClosed = true;
  }
});

    const safeWrite = (data: string) => {
      if (!isClientClosed && !res.writableEnded && res.writable) {
        try {
          res.write(data);
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        } catch {
          isClientClosed = true;
        }
      }
    };

    const safeEnd = () => {
      if (!isClientClosed && !res.writableEnded) {
        try {
          res.end();
        } catch {
          // ignore
        }
      }
    };

    // Helper to attempt streaming with fast fallback (max 1 quick retry for transient errors)
    const retryDelays = [300];

    async function attemptStream(currentModel: string): Promise<boolean> {
      const apiKey = process.env.GEMINI_API_KEY || '';
      for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        if (isClientClosed) return false;

        try {
          const optimumTemp = modelMode === 'fast' ? 0.2 : mode === 'business' ? 0.6 : 0.5;
          const maxTokens =
            lengthConstraint === '1-line'
              ? 180
              : lengthConstraint === '2-lines'
              ? 320
              : lengthConstraint === 'short'
              ? 600
              : undefined;

          const sanitizer = createStreamSanitizer(isGreeting, isOngoingTurn, lengthConstraint);
          let receivedAnyTokens = false;

          // Attempt 1: Direct ultra-fast HTTP SSE stream (lowest latency, zero SDK overhead)
          if (apiKey) {
            try {
              await streamGoogleDirect(
                apiKey,
                currentModel,
                formattedContents,
                baseInstruction,
                maxTokens,
                optimumTemp,
                (textChunk: string) => {
                  if (isClientClosed) return;
                  const cleanChunk = sanitizer.processChunk(textChunk);
                  if (cleanChunk && !isClientClosed) {
                    receivedAnyTokens = true;
                    safeWrite(`data: ${JSON.stringify({ text: cleanChunk })}\n\n`);
                  }
                }
              );

              const remaining = sanitizer.flushRemaining();
              if (remaining && !isClientClosed) {
                receivedAnyTokens = true;
                safeWrite(`data: ${JSON.stringify({ text: remaining })}\n\n`);
              }

              if (receivedAnyTokens) {
                return true;
              }
            } catch (directErr: any) {
              console.warn(`[NAFEES AI] Direct stream for ${currentModel} error:`, directErr?.message || directErr);
              // If direct stream threw transient error, let retry/fallback handle it
              if (isTransientError(directErr)) {
                throw directErr;
              }
            }
          }

          // Fallback: Use official @google/genai SDK
          if (!receivedAnyTokens) {
            const streamPromise = ai.models.generateContentStream({
              model: currentModel,
              contents: formattedContents,
              config: {
                systemInstruction: baseInstruction,
                temperature: optimumTemp,
                ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
              },
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT_GENERATION')), 25000)
            );

            const responseStream = await Promise.race([streamPromise, timeoutPromise]);

            for await (const chunk of responseStream) {
              if (isClientClosed) return false;
              const text = chunk.text;
              if (text) {
                const cleanChunk = sanitizer.processChunk(text);
                if (cleanChunk && !isClientClosed) {
                  receivedAnyTokens = true;
                  safeWrite(`data: ${JSON.stringify({ text: cleanChunk })}\n\n`);
                }
              }
            }

            const remaining = sanitizer.flushRemaining();
            if (remaining && !isClientClosed) {
              receivedAnyTokens = true;
              safeWrite(`data: ${JSON.stringify({ text: remaining })}\n\n`);
            }

            if (receivedAnyTokens) {
              return true;
            }
          }
        } catch (err: any) {
          if (isClientClosed) return false;
          console.warn(`[NAFEES AI] Attempt ${attempt + 1} with model ${currentModel} failed:`, err?.message || err);

          if (attempt < retryDelays.length && isTransientError(err)) {
            safeWrite(`data: ${JSON.stringify({ retryNotice: BUSY_STATUS_MESSAGE })}\n\n`);
            await sleep(retryDelays[attempt]);
          } else {
            break;
          }
        }
      }
      return false;
    }

    // Try prioritized models in order with automatic fallback
    let success = false;
    for (let mIdx = 0; mIdx < modelsToAttempt.length; mIdx++) {
      if (isClientClosed) break;
      const currentModel = modelsToAttempt[mIdx];
      success = await attemptStream(currentModel);
      if (success) {
        break;
      }
      if (mIdx < modelsToAttempt.length - 1 && !isClientClosed) {
        console.warn(`[NAFEES AI] Model ${currentModel} unavailable/failed. Falling back to ${modelsToAttempt[mIdx + 1]}...`);
        safeWrite(`data: ${JSON.stringify({ retryNotice: BUSY_STATUS_MESSAGE })}\n\n`);
      }
    }

    if (success) {
      safeWrite('data: [DONE]\n\n');
      safeEnd();
    } else if (!isClientClosed) {
      // All models failed: return clean Hindi message without exposing raw JSON/API error
      safeWrite(`data: ${JSON.stringify({ error: FINAL_FAILURE_MESSAGE })}\n\n`);
      safeEnd();
    }
  } catch (error: any) {
    console.warn('Streaming route warning:', error?.message || error);
    if (!res.headersSent) {
      res.status(503).json({ error: FINAL_FAILURE_MESSAGE });
    } else {
      try {
        res.write(`data: ${JSON.stringify({ error: FINAL_FAILURE_MESSAGE })}\n\n`);
        res.end();
      } catch {
        // ignore
      }
    }
  }
});

// Non-streaming fallback endpoint with retries and fallback
app.post('/api/chat-sync', async (req: Request, res: Response) => {
  try {
    const { messages, model, modelMode, mode, systemPrompt, activeAttachment } = req.body;
    const ai = getGeminiClient();
    const modelsToAttempt = getModelPriorityList(modelMode, model);

    let hasAttachmentInHistory = false;
    for (const m of messages) {
      if (m.attachment?.data || m.image?.data) {
        hasAttachmentInHistory = true;
        break;
      }
    }

    const formattedContents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    }> = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      const att = msg.attachment || msg.image;

      if (att && att.data) {
        const attPart = await buildAttachmentPart(att);
        parts.push(attPart);
      } else if (!hasAttachmentInHistory && activeAttachment?.data && i === 0 && msg.role === 'user') {
        const attPart = await buildAttachmentPart(activeAttachment);
        parts.push(attPart);
      }

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      formattedContents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts,
      });
    }

    const lastUserMsg = messages[messages.length - 1]?.text || '';
    const isOngoingTurn = messages.length > 1;
    const isGreeting = isGreetingOnly(lastUserMsg);
    const lengthConstraint = detectLengthConstraint(lastUserMsg);
    const instruction = buildBaseInstruction(mode, modelMode, systemPrompt, lastUserMsg, isOngoingTurn);

    const retryDelays = [1000, 2000, 4000];

    async function attemptSync(currentModel: string): Promise<string | null> {
      for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        try {
          const optimumTemp = modelMode === 'fast' ? 0.2 : mode === 'business' ? 0.6 : 0.5;
          const maxTokens =
            lengthConstraint === '1-line'
              ? 180
              : lengthConstraint === '2-lines'
              ? 320
              : lengthConstraint === 'short'
              ? 600
              : undefined;

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: formattedContents,
            config: {
              systemInstruction: instruction,
              temperature: optimumTemp,
              ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
            },
          });
          if (response.text) {
            return sanitizeAiResponseText(response.text, lastUserMsg, isGreeting, isOngoingTurn);
          }
          return null;
        } catch (err: any) {
          console.warn(`[NAFEES AI Sync] Attempt ${attempt + 1} with ${currentModel} failed:`, err?.message || err);
          if (attempt < retryDelays.length && isTransientError(err)) {
            await sleep(retryDelays[attempt]);
          } else {
            break;
          }
        }
      }
      return null;
    }

    // Try models in priority order with automatic fallback
    let resultText: string | null = null;
    for (let mIdx = 0; mIdx < modelsToAttempt.length; mIdx++) {
      const currentModel = modelsToAttempt[mIdx];
      resultText = await attemptSync(currentModel);
      if (resultText) {
        break;
      }
      if (mIdx < modelsToAttempt.length - 1) {
        console.warn(`[NAFEES AI Sync] Model ${currentModel} failed. Falling back to ${modelsToAttempt[mIdx + 1]}...`);
      }
    }

    if (resultText) {
      res.json({ text: resultText });
    } else {
      res.status(503).json({ error: FINAL_FAILURE_MESSAGE });
    }
  } catch (error: any) {
    console.error('Fatal sync error:', error);
    res.status(503).json({ error: FINAL_FAILURE_MESSAGE });
  }
});

// API: Audio Speech-to-Text Transcription using Gemini
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audio, mimeType = 'audio/webm', language = 'hi' } = req.body;

    if (!audio || typeof audio !== 'string') {
      res.status(400).json({ error: 'Audio base64 data is required' });
      return;
    }

    const ai = getGeminiClient();
    const cleanMimeType = mimeType.split(';')[0] || 'audio/webm';

    const systemInstruction = `You are a highly accurate, verbatim speech-to-text transcriber for the NAFEES AI app.
Your task is to transcribe the user's spoken voice into written text.
Key Guidelines:
1. Support Hindi (हिन्दी / Devanagari script), Hinglish (Hindi written in Latin script), and English.
2. If the user speaks Hindi, write it in clean Devanagari Hindi or Hinglish matching their dialect.
3. Transcribe the exact words spoken. Do NOT answer their questions, do NOT chat, do NOT translate unless asked, and do NOT add commentary.
4. Output ONLY the raw transcribed text. Do NOT wrap in quotes or add prefixes like "Transcript:".
5. If the audio has no speech or is only silence or background noise, return an empty string.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: audio,
            },
          },
          {
            text: 'Transcribe what was spoken verbatim into text. Support Hindi, Hinglish, and English. Output ONLY the exact transcribed text, nothing else.',
          },
        ],
      },
    ];

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let transcribedText: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.1,
          },
        });
        if (response && typeof response.text === 'string') {
          transcribedText = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`[Transcription] Model ${modelName} failed:`, err?.message || err);
      }
    }

    if (transcribedText !== null) {
      const clean = transcribedText.replace(/^["'`]|["'`]$/g, '').trim();
      res.json({ text: clean });
    } else {
      res.status(503).json({ error: FINAL_FAILURE_MESSAGE });
    }
  } catch (error: any) {
    console.error('Transcription endpoint fatal error:', error);
    res.status(503).json({ error: FINAL_FAILURE_MESSAGE });
  }
});

// API: Image Generation Endpoint
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'Realistic' } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'कृपया इमेज के लिए कोई विवरण (prompt) लिखें।' });
      return;
    }

    const ai = getGeminiClient();

    const styleKeywords: Record<string, string> = {
      'Realistic': 'photorealistic, realistic textures, true-to-life lighting, 8k photographic detail',
      '3D Cartoon': 'charming 3D cartoon animation render, Pixar and Disney 3D style, smooth volumetric lighting, vibrant colors, expressive design',
      'Cinematic': 'epic cinematic movie still, dramatic lighting, anamorphic lens flare, shallow depth of field, film color grading',
      'Product Photo': 'professional commercial studio product photography, clean minimalist background, softbox lighting, sharp catalog details',
      'Illustration': 'detailed digital art illustration, artistic brush strokes, expressive concept art, rich visual storytelling',
      'Anime': 'high quality Japanese anime aesthetic, vibrant colors, clean lineart, luminous sky and lighting, Makoto Shinkai style',
    };
    const activeStyleDetail = styleKeywords[style] || styleKeywords['Realistic'];

    // 1. Translate or enrich prompt into high-quality visual English description with style
    let enrichedPrompt = `${prompt.trim()}, in ${style} style, ${activeStyleDetail}`;
    try {
      const enrichRes = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: `You are an expert AI image prompt engineer.
Convert or refine this user prompt into a high-detail English visual description suitable for AI image generation in "${style}" style.
User prompt (may be Hindi, Hinglish, or English): "${prompt}"
Required visual style: ${style} (${activeStyleDetail}).
Preserve the user's intended subject, colors, mood, and elements while seamlessly incorporating the ${style} visual aesthetic.
Output ONLY the final English prompt, nothing else.`,
      });
      if (enrichRes?.text && enrichRes.text.trim()) {
        enrichedPrompt = enrichRes.text.trim();
      }
    } catch {
      // Fallback to appended prompt
    }

    // 2. Try Gemini Image Generation models if supported/configured
    let imageUrl: string | null = null;
    const cleanRatio = (['1:1', '9:16', '16:9'].includes(aspectRatio) ? aspectRatio : '1:1') as any;

    const candidateImageModels = [
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
    ];

    for (const modelName of candidateImageModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts: [{ text: enrichedPrompt }] },
          config: {
            imageConfig: {
              aspectRatio: cleanRatio,
            },
          },
        });
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (imageUrl) break;
      } catch {
        // Silently continue to fallback engine when model requires paid billing
      }
    }
// 3. High-quality visual generation fallback
if (!imageUrl) {
  let width = 1024;
  let height = 1024;

  if (cleanRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (cleanRatio === '16:9') {
    width = 1280;
    height = 720;
  }

  const encoded = encodeURIComponent(enrichedPrompt);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;

  try {
    const imgRes = await fetch(pollinationsUrl);
    if (imgRes.ok) {
      const arrayBuf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(arrayBuf).toString('base64');
      imageUrl = `data:image/jpeg;base64,${b64}`;
    } else {
      imageUrl = pollinationsUrl;
    }
  } catch {
    imageUrl = pollinationsUrl;
  }
}
    if (!imageUrl) {
      res.status(503).json({ error: 'इमेज अभी नहीं बन पाई। कृपया फिर कोशिश करें।' });
      return;
    }
    
   res.json({
  imageUrl,
  prompt,
  style,
  enrichedPrompt,
  aspectRatio: cleanRatio,
});
  } catch (error: any) {
    res.status(503).json({ error: 'इमेज अभी नहीं बन पाई। कृपया फिर कोशिश करें।' });
  }
});

// API: Stream Video Endpoint with HTTP Byte-Range support
app.get('/api/videos/:filename', (req: Request, res: Response) => {
  const filePath = path.join(generatedVideosDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// API: REAL Google Veo Video Generation Endpoint
app.post('/api/generate-video', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      duration = 8,
      aspectRatio = '9:16',
      style = 'Realistic',
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'कृपया वीडियो के लिए कोई विवरण (prompt) लिखें।' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(429).json({ error: 'Veo वीडियो जनरेशन के लिए API access या billing की आवश्यकता है।' });
      return;
    }

    const ai = getGeminiClient();

    // Duration options: 4 sec, 6 sec, 8 sec (Default: 8 sec)
    const validDurations = [4, 6, 8];
    const cleanDuration = validDurations.includes(Number(duration)) ? Number(duration) : 8;

    // Aspect ratio: only 9:16 and 16:9 supported
    const cleanRatio = aspectRatio === '16:9' ? '16:9' : '9:16';

    const validStyles = ['Realistic', '3D Cartoon', 'Cinematic', 'Product Ad', 'Islamic', 'Animation'];
    const cleanStyle = validStyles.includes(style) ? style : 'Realistic';

    const styleDirectives: Record<string, string> = {
      'Realistic': 'photorealistic, natural physics, real-world lighting, lifelike organic motion and reflections',
      '3D Cartoon': '3D Pixar Disney style animation, vibrant colorful textures, fluid animated character motion',
      'Cinematic': 'cinematic Hollywood film, dramatic lighting, volumetric atmospheric haze, fluid camera tracking',
      'Product Ad': 'commercial product ad, high-end studio lighting, elegant reflections, smooth slow-motion showcase',
      'Islamic': 'serene spiritual Islamic scene, crescent moon, glowing lanterns swaying gently, majestic atmosphere',
      'Animation': 'high quality Japanese anime aesthetic, vibrant visual effects, fluid animated movement',
    };
    const activeStyleDetail = styleDirectives[cleanStyle] || styleDirectives['Realistic'];

    // 1. Enrich prompt into high-motion English description for Veo
    let enrichedVeoPrompt = `${prompt.trim()}, ${cleanStyle} style, ${activeStyleDetail}, high quality motion video, genuine character movement, moving environment and fluid physics`;
    try {
      const enrichRes = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: `You are an expert AI video director creating prompts for Google Veo 3.1 video generation model.
Convert this user prompt (Hindi/Hinglish/English) into an English prompt detailing genuine physical motion, character walking/movement, environment dynamics (rain, wind, reflections, water), camera tracking, and lighting in "${cleanStyle}" style.
User prompt: "${prompt}"
Required duration: ${cleanDuration} seconds.
Required aspect ratio: ${cleanRatio}.
Ensure genuine fluid physical movement is emphasized.
Output ONLY the final English video prompt, nothing else.`,
      });
      if (enrichRes?.text && enrichRes.text.trim()) {
        enrichedVeoPrompt = enrichRes.text.trim();
      }
    } catch {
      // Continue with enrichedVeoPrompt
    }

    // 2. Real Veo Video Generation: Prefer veo-3.1-fast-generate-preview, fallback to veo-3.1-generate-preview
    const veoCandidateModels = [
      'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview',
      'veo-3.1-lite-generate-preview',
    ];

    let operation: any = null;
    let selectedModel = 'veo-3.1-fast-generate-preview';
    let lastError: any = null;

    for (const modelName of veoCandidateModels) {
      try {
        operation = await ai.models.generateVideos({
          model: modelName,
          source: {
            prompt: enrichedVeoPrompt,
          },
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: cleanRatio,
            durationSeconds: cleanDuration,
          },
        });
        if (operation && operation.name) {
          selectedModel = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = (err?.message || JSON.stringify(err) || '').toLowerCase();
        // If quota or billing error, break immediately to report accurate billing notice
        if (err?.status === 429 || errStr.includes('quota') || errStr.includes('resource_exhausted') || errStr.includes('billing')) {
          res.status(429).json({ error: 'Veo वीडियो जनरेशन के लिए API access या billing की आवश्यकता है।' });
          return;
        }
      }
    }

    if (!operation || !operation.name) {
      const errStr = (lastError?.message || JSON.stringify(lastError) || '').toLowerCase();
      if (lastError?.status === 429 || errStr.includes('quota') || errStr.includes('resource_exhausted') || errStr.includes('billing')) {
        res.status(429).json({ error: 'Veo वीडियो जनरेशन के लिए API access या billing की आवश्यकता है।' });
        return;
      }
      res.status(503).json({ error: 'असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।' });
      return;
    }

    // 3. Poll Veo long-running operation until complete (max 4 minutes)
    const startTime = Date.now();
    const maxPollTime = 4 * 60 * 1000; // 4 minutes

    while (!operation.done) {
      if (Date.now() - startTime > maxPollTime) {
        res.status(504).json({ error: 'असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।' });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        operation = await ai.operations.getVideosOperation({ operation });
      } catch (pollErr: any) {
        const errStr = (pollErr?.message || '').toLowerCase();
        if (errStr.includes('quota') || errStr.includes('billing') || pollErr?.status === 429) {
          res.status(429).json({ error: 'Veo वीडियो जनरेशन के लिए API access या billing की आवश्यकता है।' });
          return;
        }
      }
    }

    // 4. Retrieve generated video URI
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      res.status(503).json({ error: 'असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।' });
      return;
    }

    // 5. Download genuine MP4 video bytes from Veo using API Key
    const videoFetchRes = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!videoFetchRes.ok) {
      res.status(503).json({ error: 'असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।' });
      return;
    }

    const arrayBuf = await videoFetchRes.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuf);

    const id = `veo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const outputFileName = `${id}.mp4`;
    const outputFilePath = path.join(generatedVideosDir, outputFileName);

    fs.writeFileSync(outputFilePath, videoBuffer);

    const videoUrl = `/generated-videos/${outputFileName}`;

    res.json({
      videoUrl,
      prompt,
      style: cleanStyle,
      aspectRatio: cleanRatio,
      duration: cleanDuration,
      isVeoVideo: true,
      modelUsed: selectedModel,
      enrichedPrompt: enrichedVeoPrompt,
    });
  } catch (fatalError: any) {
    const errStr = (fatalError?.message || JSON.stringify(fatalError) || '').toLowerCase();
    if (fatalError?.status === 429 || errStr.includes('quota') || errStr.includes('resource_exhausted') || errStr.includes('billing')) {
      res.status(429).json({ error: 'Veo वीडियो जनरेशन के लिए API access या billing की आवश्यकता है।' });
      return;
    }
    res.status(503).json({ error: 'असली AI वीडियो अभी नहीं बन पाया। कृपया फिर कोशिश करें।' });
  }
});

async function processVoiceTurn(
  ai: GoogleGenAI,
  audioBase64: string,
  mimeType: string,
  mode: string,
  lang: string
): Promise<{ userText: string; aiText: string; audioWav: string | null }> {
  // Clean MIME type and base64 data
  let cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!cleanMimeType.startsWith('audio/')) {
    cleanMimeType = 'audio/webm';
  }

  let cleanData = audioBase64;
  if (cleanData.includes(',')) {
    cleanData = cleanData.split(',')[1];
  }
  cleanData = cleanData.trim().replace(/\s+/g, '');

  // Step 1: Transcribe user's complete turn audio with high accuracy
  const transcribePrompt = `Listen to this spoken audio carefully.
Transcribe exactly what the person said in the spoken language.
- If spoken in Hindi, transcribe in clean Devanagari Hindi.
- If spoken in Hinglish or English, transcribe faithfully in English/Hinglish.
- Do NOT guess, do NOT hallucinate, do NOT add extra words.
- If the audio contains only silence, background noise, or unintelligible murmuring, output: "[UNCLEAR]"
Output ONLY the transcription text.`;

  let userText = '';
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  for (const modelName of candidateModels) {
    try {
      const trRes = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: cleanData,
                },
              },
              {
                text: transcribePrompt,
              },
            ],
          },
        ],
      });
      if (trRes && typeof trRes.text === 'string' && trRes.text.trim()) {
        userText = trRes.text.trim();
        break;
      }
    } catch (err: any) {
      console.warn(`[Transcription Notice in Live Turn with ${modelName}]:`, err?.message || err);
    }
  }

  // Clean quotes from transcription
  userText = userText.replace(/^["'`]|["'`]$/g, '').trim();

  // Step 2: Handle Unclear Speech
  if (!userText || userText === '[UNCLEAR]' || userText.length < 2) {
    const unclearMessage = 'मुझे आपकी बात पूरी तरह समझ नहीं आई। कृपया एक बार फिर बोलें।';
    return {
      userText: '',
      aiText: unclearMessage,
      audioWav: null,
    };
  }

  // Step 3: Handle Greeting Only
  if (isGreetingOnly(userText)) {
    const greetingReply = lang === 'en-IN'
      ? 'Wa Alaikum Assalam! Tell me, how can I help you today?'
      : 'अस्सलामु अलैकुम! मैं NAFEES AI हूँ। बताइए, मैं आपकी क्या मदद कर सकता हूँ?';

    return {
      userText,
      aiText: greetingReply,
      audioWav: null,
    };
  }

  // Step 4: Mode-specific prompt - answer ONLY the question asked
  let systemInstruction = `You are NAFEES AI.
GREETING & LENGTH RULES:
- NEVER say "नमस्ते".
- If a greeting is needed, use "अस्सलामु अलैकुम! मैं NAFEES AI हूँ।"
- Do not repeat an introduction. Jump directly into answering the question.
- Strictly adhere to any length requested (e.g. 1 line, 2 lines, short answer).
`;

  if (mode === 'study') {
    systemInstruction += `CURRENT MODE: STUDY MODE (पढ़ाई मोड - Personal Tutor).
Listen carefully to the student's spoken question and answer directly:
- Answer primarily in simple, clear Hindi. If helpful, explain English terms simply.
- Explain scientific and study concepts using small, easy real-world examples.
- If asked a concept like "पानी 100 डिग्री पर क्यों उबलता है?", explain the core reason clearly in simple terms.
- If the student says "मुझे यह समझ नहीं आया", explain in even simpler, everyday terms.
- If the student asks for a test or quiz ("मेरा test लो"), ask 3 clear, interactive questions directly.
- Keep voice answers spoken, concise (usually 3 to 5 sentences), clear, and natural to listen to.
- Do NOT use markdown asterisks (*, **) or bullet symbols in your output, as this will be read aloud by text-to-speech.`;
  } else if (mode === 'business') {
    systemInstruction += `CURRENT MODE: BUSINESS MODE (बिजनेस मोड - Practical Business Assistant).
Listen carefully to the user's spoken question and answer directly:
- Answer primarily in simple, practical Hindi. If helpful, explain English business terms simply.
- If asked a calculation like cost ₹100 and selling price ₹150, calculate the exact profit (₹50) and profit percentage (50% markup, 33.3% margin) clearly and directly.
- If asked for a business plan, outline the key actionable steps clearly.
- Provide practical guidance on online selling (Amazon, Flipkart, Meesho, WhatsApp), pricing, and marketing.
- Keep voice answers spoken, concise (usually 3 to 5 sentences), clear, and natural to listen to.
- Do NOT use markdown asterisks (*, **) or bullet symbols in your output, as this will be read aloud by text-to-speech.`;
  } else {
    systemInstruction += `CURRENT MODE: NORMAL MODE (सामान्य मोड).
Listen carefully to the user's latest spoken question and answer that exact question directly in natural Hindi or English.
Do NOT introduce yourself unless asked. Answer directly without filler.
Keep voice answers short and direct: usually 2 to 4 sentences.
Do NOT use markdown asterisks (*, **) or bullet symbols in your output, as this will be read aloud by text-to-speech.`;
  }

  const chatCandidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let aiText = '';

  for (const modelName of chatCandidateModels) {
    try {
      const chatRes = await ai.models.generateContent({
        model: modelName,
        contents: userText,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });
      if (chatRes && typeof chatRes.text === 'string' && chatRes.text.trim()) {
        aiText = sanitizeAiResponseText(chatRes.text.trim(), userText, isGreetingOnly(userText), false);
        break;
      }
    } catch (err: any) {
      console.warn(`[Chat Model ${modelName} in voice turn failed]:`, err?.message || err);
    }
  }

  if (!aiText) {
    aiText = 'मुझे समझ नहीं आया, कृपया दोबारा कहें।';
  }

  return {
    userText,
    aiText,
    audioWav: null,
  };
}

// REST fallback endpoint for complete voice turn
app.post('/api/voice-turn', async (req: Request, res: Response) => {
  try {
    const { audio, mimeType, mode = 'normal', lang = 'hi-IN' } = req.body;
    if (!audio) {
      res.status(400).json({ error: 'Audio payload required' });
      return;
    }
    const ai = getGeminiClient();
    const result = await processVoiceTurn(ai, audio, mimeType, mode, lang);
    res.json(result);
  } catch (error: any) {
    console.warn('[Voice Turn REST Error]:', error?.message || error);
    res.status(503).json({ error: 'वॉइस सेवा अभी उपलब्ध नहीं है। कृपया फिर कोशिश करें।' });
  }
});

// Create HTTP server
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade for Gemini Live
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url?.split('?')[0];
  if (pathname === '/api/live-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket, request: http.IncomingMessage) => {
  const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  let currentMode = urlObj.searchParams.get('mode') || 'normal';
  let currentLang = urlObj.searchParams.get('lang') || 'hi-IN';

  let isClosed = false;
  let activeTurnPromise: Promise<any> | null = null;
  let cancelledTurnId: string | null = null;

  const safeSend = (payload: any) => {
    if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(JSON.stringify(payload));
      } catch (e) {
        console.warn('[WS Send Error]:', e);
      }
    }
  };

  // Notify client that connection is established and ready
  safeSend({ type: 'ready' });

  clientWs.on('message', async (rawData) => {
    if (isClosed) return;
    try {
      const data = JSON.parse(rawData.toString());

      if (data.type === 'cancel_turn') {
        cancelledTurnId = data.turnId || 'latest';
        return;
      }

      if (data.type === 'process_turn') {
        const turnId = data.turnId || String(Date.now());
        const mode = data.mode || currentMode;
        const lang = data.lang || currentLang;
        const audio = data.audio;
        const mimeType = data.mimeType || 'audio/webm';

        if (!audio) {
          safeSend({
            type: 'error',
            turnId,
            message: 'वॉइस सेवा अभी उपलब्ध नहीं है। कृपया फिर कोशिश करें।',
          });
          return;
        }

        safeSend({ type: 'thinking', turnId });

        try {
          const ai = getGeminiClient();
          activeTurnPromise = processVoiceTurn(ai, audio, mimeType, mode, lang);
          const result = await activeTurnPromise;

          // If turn was cancelled during processing (e.g. user interrupted)
          if (cancelledTurnId === turnId) {
            cancelledTurnId = null;
            return;
          }

          safeSend({
            type: 'turn_result',
            turnId,
            userText: result.userText,
            aiText: result.aiText,
            audioWav: result.audioWav,
          });
        } catch (err: any) {
          console.warn('[Process Turn Error]:', err?.message || err);
          safeSend({
            type: 'error',
            turnId,
            message: 'वॉइस सेवा अभी उपलब्ध नहीं है। कृपया फिर कोशिश करें।',
          });
        }
      }
    } catch (err) {
      console.warn('[Live WS Message Parse Error]:', err);
    }
  });

  clientWs.on('close', () => {
    isClosed = true;
  });

  clientWs.on('error', (e) => {
    console.warn('[Client WS Error]:', e);
  });
});

// Setup Vite middleware in dev or serve static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`NAFEES AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
