import { GeneratedVideoItem } from '../types';

const VIDEO_HISTORY_KEY = 'nafees_ai_video_history';
const MAX_VIDEO_HISTORY_ITEMS = 30;

export function loadVideoHistory(): GeneratedVideoItem[] {
  try {
    const raw = localStorage.getItem(VIDEO_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Error loading video history:', err);
    return [];
  }
}

export function saveVideoToHistory(item: GeneratedVideoItem): GeneratedVideoItem[] {
  try {
    const current = loadVideoHistory();
    const filtered = current.filter((x) => x.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_VIDEO_HISTORY_ITEMS);
    localStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Error saving video to history:', err);
    try {
      const current = loadVideoHistory();
      const updated = [item, ...current.slice(0, 10)];
      localStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [item];
    }
  }
}

export function deleteVideoFromHistory(id: string): GeneratedVideoItem[] {
  try {
    const current = loadVideoHistory();
    const updated = current.filter((x) => x.id !== id);
    localStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Error deleting video from history:', err);
    return [];
  }
}

export function clearVideoHistory(): void {
  try {
    localStorage.removeItem(VIDEO_HISTORY_KEY);
  } catch (err) {
    console.warn('Error clearing video history:', err);
  }
}
