import { GeneratedImageItem } from '../types';

const BASE_IMAGE_HISTORY_KEY = 'nafees_ai_image_history';
const MAX_HISTORY_ITEMS = 40;

function getImageStorageKey(userId?: string): string {
  if (!userId || !userId.trim()) return `${BASE_IMAGE_HISTORY_KEY}_unauthenticated_temp`;
  return `${BASE_IMAGE_HISTORY_KEY}_user_${userId.trim()}`;
}

export function loadImageHistory(userId?: string): GeneratedImageItem[] {
  if (!userId || !userId.trim()) return [];
  try {
    const key = getImageStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Error loading image history:', err);
    return [];
  }
}

export function saveImageToHistory(item: GeneratedImageItem, userId?: string): GeneratedImageItem[] {
  if (!userId || !userId.trim()) return [item];
  const key = getImageStorageKey(userId);
  try {
    const current = loadImageHistory(userId);
    // Prevent duplicate saving of the exact same image ID
    const filtered = current.filter((x) => x.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Error saving image to history:', err);
    // If localStorage quota exceeds due to base64, keep only the latest 10
    try {
      const current = loadImageHistory(userId);
      const updated = [item, ...current.slice(0, 10)];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch {
      return [item];
    }
  }
}

export function deleteImageFromHistory(id: string, userId?: string): GeneratedImageItem[] {
  if (!userId || !userId.trim()) return [];
  const key = getImageStorageKey(userId);
  try {
    const current = loadImageHistory(userId);
    const updated = current.filter((x) => x.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Error deleting image from history:', err);
    return [];
  }
}

export function clearImageHistory(userId?: string): void {
  if (!userId || !userId.trim()) return;
  const key = getImageStorageKey(userId);
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Error clearing image history:', err);
  }
}
