import { Message, AppMode, ChatAttachment, ModelMode } from '../types';
import { isTechnicalErrorText, CURRENT_BUSY_MESSAGE } from './storage';

export interface StreamChatOptions {
  messages: Message[];
  model: string;
  modelMode?: ModelMode;
  mode: AppMode;
  systemPrompt?: string;
  language?: 'hi' | 'en';
  activeAttachment?: ChatAttachment;
  onChunk: (textChunk: string) => void;
  onRetryNotice?: (notice: string) => void;
  onError: (errorMsg: string) => void;
  onComplete: () => void;
  signal?: AbortSignal;
}

function sanitizeErrorMessage(rawError: string | any): string {
  if (!rawError) return CURRENT_BUSY_MESSAGE;
  const str = String(rawError).trim();
  if (str.includes('फाइल अभी प्रोसेस') || str.includes('फाइल का आकार')) {
    return str;
  }
  if (isTechnicalErrorText(str)) {
    return CURRENT_BUSY_MESSAGE;
  }
  // If it's already a clean Hindi message, allow it
  return str || CURRENT_BUSY_MESSAGE;
}

export const CHAT_TIMEOUT_MS = 35000;
export const TIMEOUT_ERROR_MESSAGE = 'AI से जवाब नहीं मिला। कृपया फिर कोशिश करें।';

export async function streamChatCompletion({
  messages,
  model,
  modelMode,
  mode,
  systemPrompt,
  language = 'hi',
  activeAttachment,
  onChunk,
  onRetryNotice,
  onError,
  onComplete,
  signal,
}: StreamChatOptions): Promise<void> {
  const formatted = messages
    .filter(m => !m.isError)
    .map(m => ({
      role: m.role,
      text: m.text,
      attachment: m.attachment ? {
        data: m.attachment.data,
        mimeType: m.attachment.mimeType,
        name: m.attachment.name,
        extractedText: m.attachment.extractedText,
      } : undefined,
    }));

  const payload = JSON.stringify({
    messages: formatted,
    model,
    modelMode,
    mode,
    systemPrompt,
    language,
    activeAttachment: activeAttachment ? {
      data: activeAttachment.data,
      mimeType: activeAttachment.mimeType,
      name: activeAttachment.name,
      extractedText: activeAttachment.extractedText,
    } : undefined,
  });

  const executeFetch = async (isRetry = false): Promise<boolean> => {
    let timeoutTimer: any = null;
    let hasReceivedChunk = false;
    let didTimeout = false;

    const internalAbort = new AbortController();
    const handleParentAbort = () => {
      internalAbort.abort();
    };

    if (signal) {
      if (signal.aborted) {
        onComplete();
        return true;
      }
      signal.addEventListener('abort', handleParentAbort, { once: true });
    }

    timeoutTimer = setTimeout(() => {
      if (!hasReceivedChunk && !signal?.aborted) {
        didTimeout = true;
        internalAbort.abort();
        onError(TIMEOUT_ERROR_MESSAGE);
      }
    }, CHAT_TIMEOUT_MS);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        signal: internalAbort.signal,
      });

      if (!response.ok) {
        clearTimeout(timeoutTimer);
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || CURRENT_BUSY_MESSAGE);
      }

      if (!response.body) {
        clearTimeout(timeoutTimer);
        throw new Error(CURRENT_BUSY_MESSAGE);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (signal?.aborted || internalAbort.signal.aborted) {
          clearTimeout(timeoutTimer);
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          if (!didTimeout) {
            onComplete();
          }
          return true;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') {
            clearTimeout(timeoutTimer);
            onComplete();
            return true;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.retryNotice && onRetryNotice) {
              onRetryNotice(parsed.retryNotice);
            }
            if (parsed.error) {
              clearTimeout(timeoutTimer);
              onError(sanitizeErrorMessage(parsed.error));
              return true;
            }
            if (parsed.text) {
              hasReceivedChunk = true;
              clearTimeout(timeoutTimer);
              onChunk(parsed.text);
            }
          } catch {
            // If JSON parse fails, ignore partial line
          }
        }
      }

      clearTimeout(timeoutTimer);
      onComplete();
      return true;
    } catch (err: any) {
      clearTimeout(timeoutTimer);

      if (didTimeout) {
        return false;
      }

      if (signal?.aborted || err?.name === 'AbortError' || String(err).includes('aborted')) {
        onComplete();
        return true;
      }

      // If it's a transient network or connection drop and we haven't retried yet, retry once
      const isNetworkErr = err?.name === 'TypeError' || String(err).includes('NetworkError') || String(err).includes('fetch');
      if (!isRetry && isNetworkErr && !signal?.aborted) {
        if (onRetryNotice) {
          onRetryNotice('कनेक्शन दोबारा जोड़ा जा रहा है...');
        }
        await new Promise((r) => setTimeout(r, 350));
        if (signal?.aborted) {
          onComplete();
          return true;
        }
        return await executeFetch(true);
      }

      console.warn('[NAFEES AI Stream Notice]:', err?.message || err);
      onError(sanitizeErrorMessage(err?.message));
      return false;
    } finally {
      clearTimeout(timeoutTimer);
      if (signal) {
        signal.removeEventListener('abort', handleParentAbort);
      }
    }
  };

  await executeFetch(false);
}
