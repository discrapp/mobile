import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFERRED_CODE_KEY = 'aceback_deferred_code';
const DEFERRED_CODE_CHECKED_KEY = 'aceback_deferred_code_checked';

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

/**
 * Check if we've already prompted for a deferred code this session
 */
export async function hasCheckedDeferredCode(): Promise<boolean> {
  try {
    const checked = await AsyncStorage.getItem(DEFERRED_CODE_CHECKED_KEY);
    return checked === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark that we've checked for deferred codes this session
 */
export async function markDeferredCodeChecked(): Promise<void> {
  try {
    await AsyncStorage.setItem(DEFERRED_CODE_CHECKED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Store a deferred code for later processing
 */
export async function storeDeferredCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DEFERRED_CODE_KEY, code.toUpperCase());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get and clear a stored deferred code
 */
export async function getAndClearDeferredCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(DEFERRED_CODE_KEY);
    if (code) {
      await AsyncStorage.removeItem(DEFERRED_CODE_KEY);
    }
    return code;
  } catch {
    return null;
  }
}

/**
 * Clear all deferred linking state (for testing/logout)
 */
export async function clearDeferredLinkingState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([DEFERRED_CODE_KEY, DEFERRED_CODE_CHECKED_KEY]);
  } catch {
    // Ignore storage errors
  }
}
