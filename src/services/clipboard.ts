/**
 * Robust copy-to-clipboard utility for web, mobile, and iframe preview environments
 * like Google AI Studio Preview.
 */

// Helper to strip non-visible formatting or leading/trailing error markers
export function sanitizeTextForCopy(text: string): string {
  if (!text) return '';
  return text.trim();
}

/**
 * Copies the given text to clipboard.
 * 1. Attempts modern `navigator.clipboard.writeText(text)`
 * 2. If rejected, unsupported, or inside an iframe where clipboard permissions are blocked,
 *    falls back to creating a hidden, selectable textarea and executing `document.execCommand('copy')`.
 * Returns a Promise that resolves to `true` if copy succeeded, `false` otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const content = sanitizeTextForCopy(text);
  if (!content) return false;

  // Attempt 1: Modern navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch {
      // Modern clipboard failed or was denied by permissions policy inside iframe
      // Fall through to fallback
    }
  }

  // Attempt 2: Document execCommand fallback (mobile & iframe compatible)
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('aria-hidden', 'true');
      
      // Prevent zooming or jumping in mobile browsers
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0.01';
      textarea.style.fontSize = '16px'; // Prevent auto-zoom in iOS Safari
      textarea.style.pointerEvents = 'none';
      textarea.style.zIndex = '-9999';

      document.body.appendChild(textarea);

      // Select all text in the textarea
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      let success = false;
      try {
        success = document.execCommand('copy');
      } catch {
        success = false;
      }

      document.body.removeChild(textarea);

      if (success) {
        return true;
      }
    } catch {
      // Fallback failed
    }
  }

  return false;
}
