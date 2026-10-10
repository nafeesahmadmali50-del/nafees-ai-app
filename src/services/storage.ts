import { Conversation, AppSettings, AppMode } from '../types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'nafees_ai_conversations_v2',
  ACTIVE_ID: 'nafees_ai_active_id_v2',
  SETTINGS: 'nafees_ai_settings_v2',
};

function getStorageKey(baseKey: string, userId?: string): string {
  if (!userId || !userId.trim()) return `${baseKey}_unauthenticated_temp`;
  return `${baseKey}_user_${userId.trim()}`;
}

export const DEFAULT_SETTINGS: AppSettings = {
  modelMode: 'fast',
  model: 'gemini-3.5-flash-lite',
  uiLanguage: 'hi',
  speechLang: 'hi-IN',
  voiceRate: 1.0,
  autoSpeak: false,
  theme: 'neon-navy',
};

export const WELCOME_MESSAGE_HINDI = `अस्सलामु अलैकुम! मैं NAFEES AI हूँ।
मैं आपकी पढ़ाई, बिजनेस, काम, आइडिया और रोज़मर्रा के सवालों में मदद कर सकता हूँ।
आज मैं आपकी किस तरह मदद करूँ?`;

export const QUICK_ACTIONS = [
  { id: 'study', labelHi: 'मेरी पढ़ाई में मदद करो', labelEn: 'Help with my studies', prompt: 'मेरी पढ़ाई में मदद करो। कृपया मुझे एक बेहतर स्टडी रूटीन और पढ़ाई के टिप्स बताओ।' },
  { id: 'business', labelHi: 'मेरा बिजनेस प्लान बनाओ', labelEn: 'Create a business plan', prompt: 'मेरा एक नया बिजनेस प्लान बनाओ। मुझे कम लागत में अच्छा मुनाफा देने वाला प्लान समझाओ।' },
  { id: 'idea', labelHi: 'कोई आइडिया दो', labelEn: 'Give me an idea', prompt: 'मुझे आज के समय के अनुसार कोई नया और बेहतरीन आइडिया दो।' },
  { id: 'code', labelHi: 'कोड लिखकर दो', labelEn: 'Write code for me', prompt: 'मुझे एक उपयोगी कोड लिखकर दो और समझाओ कि वह कैसे काम करता है।' },
];

export function createNewConversation(mode: AppMode = 'normal'): Conversation {
  return {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: mode === 'study' ? 'नई पढ़ाई चैट' : mode === 'business' ? 'नया बिजनेस प्लान' : 'नई बातचीत',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode,
    messages: [],
  };
}

export const PAST_BUSY_MESSAGE = 'AI से जवाब नहीं मिला। कृपया फिर कोशिश करें।';
export const CURRENT_BUSY_MESSAGE = 'AI से जवाब नहीं मिला। कृपया फिर कोशिश करें।';

// Helper to detect requested length constraint
export function detectLengthConstraint(text: string): '1-line' | '2-lines' | 'short' | 'detailed' | null {
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

// Client-side sanitizer for final AI text output
export function cleanAiResponseOutput(rawText: string, lastUserMessage?: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();

  // 1. Strictly forbid "नमस्ते"
  cleaned = cleaned
    .replace(/नमस्ते[!।,.]?/g, 'अस्सलामु अलैकुम!')
    .replace(/नमस्कार[!।,.]?/g, 'अस्सलामु अलैकुम!');

  // 2. Enforce strict requested length
  if (lastUserMessage) {
    const len = detectLengthConstraint(lastUserMessage);
    if (len === '1-line') {
      const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        cleaned = lines[0];
      }
    } else if (len === '2-lines') {
      const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 2) {
        cleaned = lines.slice(0, 2).join('\n');
      }
    }
  }

  return cleaned;
}

// Helper to detect if a message text contains raw HTTP codes, stack traces, JSON, or technical errors
export function isTechnicalErrorText(text: string): boolean {
  if (!text) return false;
  const s = text.trim();
  const lower = s.toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('service unavailable') ||
    lower.includes('unavailable') ||
    lower.includes('429') ||
    lower.includes('500') ||
    lower.includes('504') ||
    lower.includes('resource_exhausted') ||
    lower.includes('googlegenai') ||
    lower.includes('fetch failed') ||
    lower.includes('high demand') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('error generating content') ||
    lower.includes('fatal streaming error') ||
    lower.includes('failed to fetch') ||
    lower.includes('typeerror') ||
    lower.includes('syntaxerror') ||
    s.startsWith('{') ||
    s.startsWith('⚠️ {') ||
    s.startsWith('⚠️ 5') ||
    s.includes('"error"') ||
    s.includes('"code"') ||
    s.includes('"status"') ||
    s.includes('"message"') ||
    s.includes('{"error":') ||
    s.includes('at async')
  );
}

// Clean any stored raw errors into the requested past busy message and sanitize greetings
export function sanitizeHistoryConversations(conversations: Conversation[]): {
  conversations: Conversation[];
  hasChanges: boolean;
} {
  let hasChanges = false;
  const cleaned = conversations.map((conv) => {
    let convModified = false;
    const cleanMessages = conv.messages.map((msg) => {
      if (msg.role === 'model') {
        let msgText = msg.text;

        // Check for technical error
        if (msg.isError || isTechnicalErrorText(msgText)) {
          if (isTechnicalErrorText(msgText) || msgText.startsWith('⚠️')) {
            convModified = true;
            return {
              ...msg,
              text: PAST_BUSY_MESSAGE,
              isError: true,
            };
          }
        }

        // Replace any past "नमस्ते" with "अस्सलामु अलैकुम!"
        if (msgText.includes('नमस्ते') || msgText.includes('नमस्कार')) {
          convModified = true;
          msgText = msgText
            .replace(/नमस्ते[!।,.]?/g, 'अस्सलामु अलैकुम!')
            .replace(/नमस्कार[!।,.]?/g, 'अस्सलामु अलैकुम!');
          return {
            ...msg,
            text: msgText,
          };
        }
      }
      return msg;
    });

    if (convModified) {
      hasChanges = true;
      return { ...conv, messages: cleanMessages };
    }
    return conv;
  });

  return { conversations: cleaned, hasChanges };
}

export function loadConversations(userId?: string): Conversation[] {
  if (!userId || !userId.trim()) return [];
  try {
    const key = getStorageKey(STORAGE_KEYS.CONVERSATIONS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Automatically clean up any existing stored 503 / raw API error text
    const { conversations: cleaned, hasChanges } = sanitizeHistoryConversations(parsed);
    if (hasChanges) {
      localStorage.setItem(key, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (err) {
    console.error('Error loading conversations from localStorage:', err);
    return [];
  }
}

export function saveConversations(conversations: Conversation[], userId?: string): void {
  if (!userId || !userId.trim()) return;
  try {
    const key = getStorageKey(STORAGE_KEYS.CONVERSATIONS, userId);
    localStorage.setItem(key, JSON.stringify(conversations));
  } catch (err) {
    try {
      // If localStorage quota exceeded due to large attachments in older chats, prune heavy base64 data
      const lightweight = conversations.map((c, cIdx) => ({
        ...c,
        messages: c.messages.map((m, mIdx) => {
          if (m.attachment?.data && m.attachment.data.length > 30000 && (cIdx > 0 || mIdx < c.messages.length - 2)) {
            return {
              ...m,
              attachment: {
                ...m.attachment,
                data: '', // keep metadata, name, category, previewUrl
              },
            };
          }
          return m;
        }),
      }));
      const key = getStorageKey(STORAGE_KEYS.CONVERSATIONS, userId);
      localStorage.setItem(key, JSON.stringify(lightweight));
    } catch (innerErr) {
      console.warn('LocalStorage save quota warning:', innerErr);
    }
  }
}

export function getActiveConversationId(userId?: string): string | null {
  if (!userId || !userId.trim()) return null;
  return localStorage.getItem(getStorageKey(STORAGE_KEYS.ACTIVE_ID, userId));
}

export function setActiveConversationId(id: string, userId?: string): void {
  if (!userId || !userId.trim()) return;
  localStorage.setItem(getStorageKey(STORAGE_KEYS.ACTIVE_ID, userId), id);
}

export function loadSettings(userId?: string): AppSettings {
  if (!userId || !userId.trim()) return { ...DEFAULT_SETTINGS };
  try {
    const key = getStorageKey(STORAGE_KEYS.SETTINGS, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const modelMode = parsed.modelMode || 'fast';
    const model = parsed.model || 'gemini-3.5-flash-lite';
    return { ...DEFAULT_SETTINGS, ...parsed, modelMode, model };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings, userId?: string): void {
  if (!userId || !userId.trim()) return;
  try {
    const key = getStorageKey(STORAGE_KEYS.SETTINGS, userId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

// Export chat history as a JSON download
export function exportChatHistoryAsJson(conversations: Conversation[]): void {
  try {
    const exportData = {
      appName: 'NAFEES AI',
      exportedAt: new Date().toISOString(),
      conversationCount: conversations.length,
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        createdAt: new Date(c.createdAt).toLocaleString(),
        updatedAt: new Date(c.updatedAt).toLocaleString(),
        messageCount: c.messages.length,
        messages: c.messages.map(m => ({
          role: m.role === 'model' ? 'NAFEES AI' : 'User',
          text: m.text,
          timestamp: new Date(m.timestamp).toLocaleString(),
          attachment: m.attachment ? {
            name: m.attachment.name,
            mimeType: m.attachment.mimeType,
            category: m.attachment.category,
          } : undefined,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nafees-ai-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export JSON failed:', err);
  }
}

// Export chat history as readable Text format (.txt)
export function exportChatHistoryAsText(conversations: Conversation[]): void {
  try {
    let output = `========================================\n`;
    output += `NAFEES AI - चैट इतिहास (Exported Chat History)\n`;
    output += `दिनांक: ${new Date().toLocaleString()}\n`;
    output += `कुल बातचीत: ${conversations.length}\n`;
    output += `========================================\n\n`;

    conversations.forEach((conv, index) => {
      output += `----------------------------------------\n`;
      output += `[चैट ${index + 1}] ${conv.title} (${conv.mode.toUpperCase()} MODE)\n`;
      output += `तारीख: ${new Date(conv.createdAt).toLocaleString()}\n`;
      output += `----------------------------------------\n\n`;

      conv.messages.forEach(msg => {
        const sender = msg.role === 'model' ? '🤖 NAFEES AI' : '👤 यूजर (User)';
        output += `${sender} [${new Date(msg.timestamp).toLocaleTimeString()}]:\n`;
        if (msg.attachment?.name) {
          output += `[संलग्न फाइल: ${msg.attachment.name}]\n`;
        }
        output += `${msg.text}\n\n`;
      });

      output += `\n`;
    });

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nafees-ai-history-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export text failed:', err);
  }
}

// Generate smart title from first user message
export function generateChatTitle(firstMessage: string): string {
  const clean = firstMessage.trim().replace(/[\r\n]+/g, ' ');
  if (clean.length <= 30) return clean;
  return clean.substring(0, 30) + '...';
}
