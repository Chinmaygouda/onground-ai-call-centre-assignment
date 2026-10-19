/**
 * Phone Number Utilities for Click-to-Call (Native Device Dialer)
 *
 * Implements RFC 3966 compliant tel: URI generation:
 * - Safely handles numbers already containing country codes (+91, +1, +44, etc.).
 * - Does NOT blindly prepend +91 to numbers that already have a country code.
 * - Strips formatting characters (spaces, hyphens, brackets, dots) while preserving the leading '+'.
 * - Preserves telephone extensions if provided.
 * - Accurately identifies missing or invalid telephone numbers without guessing ambiguous country codes.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  telUri: string | null;
  displayFormatted: string;
  reason?: string;
}

/**
 * Normalizes a raw phone number string into an RFC 3966 tel: URI and display string.
 */
export function normalizePhoneNumber(rawPhone?: string | null): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return {
      isValid: false,
      normalized: '',
      telUri: null,
      displayFormatted: 'Not provided',
      reason: 'Phone number is missing or empty'
    };
  }

  const trimmed = rawPhone.trim();

  // Check for common placeholders indicating missing contact info
  const lower = trimmed.toLowerCase();
  if (
    lower === 'unknown' ||
    lower === '—' ||
    lower === '-' ||
    lower === 'n/a' ||
    lower === 'null' ||
    lower === 'undefined'
  ) {
    return {
      isValid: false,
      normalized: '',
      telUri: null,
      displayFormatted: 'Not available',
      reason: 'No phone number on record'
    };
  }

  // Handle extension if present (e.g., "+91 9845012345 ext 102", "x102", ",102")
  let mainNumber = trimmed;
  let extension = '';

  const extMatch = trimmed.match(/(?:ext\.?|x|,|;)\s*(\d+)$/i);
  if (extMatch) {
    extension = extMatch[1];
    mainNumber = trimmed.slice(0, extMatch.index).trim();
  }

  // Check if international prefix exists (+ or 00)
  let hasPlus = mainNumber.startsWith('+');
  if (mainNumber.startsWith('00')) {
    hasPlus = true;
    mainNumber = '+' + mainNumber.slice(2);
  }

  // Extract all digit characters
  const digits = mainNumber.replace(/\D/g, '');

  if (digits.length < 7) {
    return {
      isValid: false,
      normalized: mainNumber,
      telUri: null,
      displayFormatted: trimmed,
      reason: 'Phone number has too few digits to be valid'
    };
  }

  if (digits.length > 15) {
    return {
      isValid: false,
      normalized: mainNumber,
      telUri: null,
      displayFormatted: trimmed,
      reason: 'Phone number exceeds maximum international length (15 digits)'
    };
  }

  let normalizedNumber = '';

  if (hasPlus) {
    // Already has country code
    normalizedNumber = `+${digits}`;
  } else {
    // No leading plus. Check if it starts with 91 followed by 10 digits (common in India)
    if (digits.length === 12 && digits.startsWith('91')) {
      normalizedNumber = `+${digits}`;
    } else if (digits.length === 10) {
      // 10 digits in Indian call centre context:
      // Note: do not guess country code if ambiguous; format as standard 10-digit number
      // In Indian telecom, mobile numbers start with 6, 7, 8, or 9
      if (/^[6-9]\d{9}$/.test(digits)) {
        normalizedNumber = `+91${digits}`;
      } else {
        // Local dial string without guessing country code
        normalizedNumber = digits;
      }
    } else {
      // Preserve digits as local number without guessing country code
      normalizedNumber = digits;
    }
  }

  // Append extension if present in RFC 3966 format (;ext=123)
  const telUri = extension
    ? `tel:${normalizedNumber};ext=${extension}`
    : `tel:${normalizedNumber}`;

  const displayFormatted = formatPhoneNumber(normalizedNumber, extension);

  return {
    isValid: true,
    normalized: normalizedNumber,
    telUri,
    displayFormatted,
    reason: undefined
  };
}

/**
 * Returns a valid tel: URI for an anchor link, or null if the number is invalid.
 */
export function getTelUri(rawPhone?: string | null): string | null {
  const result = normalizePhoneNumber(rawPhone);
  return result.telUri;
}

/**
 * Formats a phone number for human-readable display.
 */
export function formatPhoneNumber(normalized: string, extension?: string): string {
  if (!normalized) return '—';

  let formatted = normalized;

  // Indian numbers (+91 XXXXX XXXXX)
  if (normalized.startsWith('+91') && normalized.length === 13) {
    const num = normalized.slice(3);
    formatted = `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
  } else if (normalized.startsWith('+1') && normalized.length === 12) {
    // US/Canada: +1 (XXX) XXX-XXXX
    const num = normalized.slice(2);
    formatted = `+1 (${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;
  } else if (normalized.length === 10 && /^\d+$/.test(normalized)) {
    // 10-digit local: XXXXX XXXXX
    formatted = `${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  }

  if (extension) {
    formatted += ` ext. ${extension}`;
  }

  return formatted;
}

/**
 * Generates an accessible tooltip description for a phone call button.
 */
export function getCallTooltip(customerName?: string, phone?: string | null): string {
  const { isValid, displayFormatted, reason } = normalizePhoneNumber(phone);
  if (!isValid) {
    return reason || 'Phone number not available';
  }
  if (customerName) {
    return `Call ${customerName} at ${displayFormatted} (opens device dialer)`;
  }
  return `Call ${displayFormatted} (opens device dialer)`;
}
