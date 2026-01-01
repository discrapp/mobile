import { STRINGS } from '@/constants/strings';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (!password.trim()) {
    return STRINGS.VALIDATION.PASSWORD_REQUIRED;
  }
  if (password.length < 8) {
    return STRINGS.VALIDATION.PASSWORD_MIN_LENGTH;
  }
  return null;
};

export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): string | null => {
  if (!confirmPassword.trim()) {
    return STRINGS.VALIDATION.CONFIRM_PASSWORD_REQUIRED;
  }
  if (password !== confirmPassword) {
    return STRINGS.VALIDATION.PASSWORDS_NO_MATCH;
  }
  return null;
};

export const validateSignInForm = (
  email: string,
  password: string
): { email?: string; password?: string } => {
  const errors: { email?: string; password?: string } = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = STRINGS.VALIDATION.EMAIL_REQUIRED;
  } else if (!validateEmail(trimmedEmail)) {
    errors.email = STRINGS.VALIDATION.EMAIL_INVALID;
  }

  if (!password.trim()) {
    errors.password = STRINGS.VALIDATION.PASSWORD_REQUIRED;
  }

  return errors;
};

export const validateSignUpForm = (
  email: string,
  password: string,
  confirmPassword: string
): { email?: string; password?: string; confirmPassword?: string } => {
  const errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = STRINGS.VALIDATION.EMAIL_REQUIRED;
  } else if (!validateEmail(trimmedEmail)) {
    errors.email = STRINGS.VALIDATION.EMAIL_INVALID;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const passwordMatchError = validatePasswordMatch(password, confirmPassword);
  if (passwordMatchError) {
    errors.confirmPassword = passwordMatchError;
  }

  return errors;
};

// US State codes
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP', // Territories
];

export interface ShippingAddress {
  name: string;
  street_address: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

/**
 * Validates a US postal code (ZIP code).
 * Accepts 5 digits or ZIP+4 format (12345 or 12345-6789).
 */
export const validatePostalCode = (postalCode: string): string | null => {
  const trimmed = postalCode.trim();
  if (!trimmed) {
    return STRINGS.VALIDATION.ZIP_REQUIRED;
  }

  // Match 5 digits or 5 digits + hyphen + 4 digits
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(trimmed)) {
    return STRINGS.VALIDATION.ZIP_INVALID;
  }

  return null;
};

/**
 * Validates a US state code.
 */
export const validateStateCode = (state: string): string | null => {
  const trimmed = state.trim().toUpperCase();
  if (!trimmed) {
    return STRINGS.VALIDATION.STATE_REQUIRED;
  }

  if (trimmed.length !== 2) {
    return STRINGS.VALIDATION.STATE_INVALID_LENGTH;
  }

  if (!US_STATE_CODES.includes(trimmed)) {
    return STRINGS.VALIDATION.STATE_INVALID;
  }

  return null;
};

/**
 * Validates a complete shipping address.
 * Returns an object with field-specific errors.
 */
export const validateShippingAddress = (
  address: ShippingAddress
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Name validation
  if (!address.name?.trim()) {
    errors.name = STRINGS.VALIDATION.NAME_REQUIRED;
  } else if (address.name.trim().length > 100) {
    errors.name = STRINGS.VALIDATION.NAME_TOO_LONG;
  }

  // Street address validation
  if (!address.street_address?.trim()) {
    errors.street_address = STRINGS.VALIDATION.STREET_REQUIRED;
  } else if (address.street_address.trim().length > 100) {
    errors.street_address = STRINGS.VALIDATION.STREET_TOO_LONG;
  }

  // Street address 2 validation (optional but with length limit)
  if (address.street_address_2 && address.street_address_2.trim().length > 100) {
    errors.street_address_2 = STRINGS.VALIDATION.ADDRESS_LINE_2_TOO_LONG;
  }

  // City validation
  if (!address.city?.trim()) {
    errors.city = STRINGS.VALIDATION.CITY_REQUIRED;
  } else if (address.city.trim().length > 50) {
    errors.city = STRINGS.VALIDATION.CITY_TOO_LONG;
  }

  // State validation
  const stateError = validateStateCode(address.state || '');
  if (stateError) {
    errors.state = stateError;
  }

  // Postal code validation
  const postalError = validatePostalCode(address.postal_code || '');
  if (postalError) {
    errors.postal_code = postalError;
  }

  return errors;
};

/**
 * Checks if a shipping address has any validation errors.
 */
export const isValidShippingAddress = (address: ShippingAddress): boolean => {
  const errors = validateShippingAddress(address);
  return Object.keys(errors).length === 0;
};
