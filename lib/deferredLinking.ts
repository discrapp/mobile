import * as Clipboard from 'expo-clipboard';

// AceBack QR codes are 6-8 alphanumeric characters
const CODE_PATTERN = /^[A-Z0-9]{6,8}$/;

/**
 * Check if a string looks like an AceBack QR code
 */
export function isValidAceBackCode(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim().toUpperCase();
  return CODE_PATTERN.test(normalized);
}

/**
 * Check clipboard for a deferred AceBack code
 * Returns the code if found and valid, null otherwise
 */
export async function checkClipboardForCode(): Promise<string | null> {
  try {
    const hasString = await Clipboard.hasStringAsync();
    if (!hasString) return null;

    const clipboardContent = await Clipboard.getStringAsync();
    if (!clipboardContent) return null;

    const normalized = clipboardContent.trim().toUpperCase();

    // Check if it's a valid code
    if (isValidAceBackCode(normalized)) {
      return normalized;
    }

    // Also check if clipboard contains an AceBack URL
    const urlMatch = clipboardContent.match(/aceback\.app\/d\/([A-Za-z0-9]{6,8})/i);
    if (urlMatch) {
      return urlMatch[1].toUpperCase();
    }

    return null;
  } catch {
    return null;
  }
}
