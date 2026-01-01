/**
 * Centralized string constants for the Discr mobile app.
 *
 * This file contains all UI strings used throughout the app.
 * Benefits:
 * - Consistent messaging across the app
 * - Easy to update text in one place
 * - Prepares for future i18n support
 * - Single source of truth for all user-facing text
 *
 * Usage:
 * ```typescript
 * import { STRINGS } from '@/constants/strings';
 *
 * <Text>{STRINGS.DISCS.EMPTY_TITLE}</Text>
 * ```
 */

const _STRINGS = {
  // Authentication related strings
  AUTH: {
    APP_NAME: 'Discr',
    WELCOME_BACK: 'Welcome Back',
    SIGN_IN_SUBTITLE: 'Sign in to continue',
    EMAIL_LABEL: 'Email',
    EMAIL_PLACEHOLDER: 'Enter your email',
    PASSWORD_LABEL: 'Password',
    PASSWORD_PLACEHOLDER: 'Enter your password',
    FORGOT_PASSWORD: 'Forgot password?',
    SIGN_IN_BUTTON: 'Sign In',
    NO_ACCOUNT: "Don't have an account? ",
    SIGN_UP_LINK: 'Sign Up',
    CREATE_ACCOUNT: 'Create Account',
    SIGN_UP_SUBTITLE: 'Sign up to get started',
    CONFIRM_PASSWORD_LABEL: 'Confirm Password',
    CONFIRM_PASSWORD_PLACEHOLDER: 'Confirm your password',
    SIGN_UP_BUTTON: 'Sign Up',
    HAVE_ACCOUNT: 'Already have an account? ',
    SIGN_IN_LINK: 'Sign In',
  },

  // Error messages
  ERRORS: {
    GENERIC: 'Something went wrong. Please try again.',
    NETWORK: 'Please check your connection',
    TITLE: 'Error',
    OOPS: 'Oops!',
    TRY_AGAIN: 'Try Again',
  },

  // Validation messages
  VALIDATION: {
    // Email validation
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Please enter a valid email',
    // Password validation
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters',
    CONFIRM_PASSWORD_REQUIRED: 'Please confirm your password',
    PASSWORDS_NO_MATCH: 'Passwords do not match',
    // Address validation
    NAME_REQUIRED: 'Name is required',
    NAME_TOO_LONG: 'Name is too long (max 100 characters)',
    STREET_REQUIRED: 'Street address is required',
    STREET_TOO_LONG: 'Street address is too long (max 100 characters)',
    ADDRESS_LINE_2_TOO_LONG: 'Address line 2 is too long (max 100 characters)',
    CITY_REQUIRED: 'City is required',
    CITY_TOO_LONG: 'City name is too long (max 50 characters)',
    STATE_REQUIRED: 'State is required',
    STATE_INVALID_LENGTH: 'State must be a 2-letter code (e.g., CA)',
    STATE_INVALID: 'Please enter a valid US state code',
    ZIP_REQUIRED: 'ZIP code is required',
    ZIP_INVALID:
      'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)',
  },

  // Disc collection related strings
  DISCS: {
    // Empty state
    EMPTY_TITLE: 'No Discs in Your Bag',
    EMPTY_DESCRIPTION:
      'Start building your disc collection by adding your first disc!',
    ADD_FIRST_DISC: 'Add Your First Disc',
    // Badge labels
    BADGE_SURRENDERED: 'Surrendered',
    BADGE_AI_IDENTIFIED: 'AI Identified',
    // Protect banner
    PROTECT_TITLE: 'Protect Your Collection',
    PROTECT_SUBTITLE: 'Add QR stickers to help finders contact you',
    // Recovery status labels
    RECOVERY_STATUS_FOUND: 'Found',
    RECOVERY_STATUS_MEETUP_PROPOSED: 'Meetup Proposed',
    RECOVERY_STATUS_MEETUP_CONFIRMED: 'Meetup Confirmed',
  },

  // Add disc screen strings
  ADD_DISC: {
    TITLE: 'Add Disc',
    MOLD_REQUIRED: 'Mold name is required',
    // Entry mode selection
    HOW_TO_ADD: 'How would you like to add your disc?',
    SCAN_QR_TITLE: 'Scan QR Sticker',
    SCAN_QR_DESC: 'Link a Discr sticker to this disc',
    PHOTO_AI_TITLE: 'Photo + AI Identify',
    PHOTO_AI_DESC: 'Take a photo and let AI fill in the details',
    MANUAL_TITLE: 'Manual Entry',
    MANUAL_DESC: 'Enter disc details yourself',
    // Photo section
    PHOTOS_OPTIONAL: 'Photos (Optional)',
    ADD_PHOTO: 'Add Photo',
    PHOTO_LIMIT_HINT: 'You can add up to 4 photos per disc',
    MAX_PHOTOS_TITLE: 'Maximum photos',
    MAX_PHOTOS_MESSAGE: 'You can only add up to 4 photos per disc',
    // QR code section
    QR_LINKED: 'QR Code Linked',
    QR_SCAN_SUBTITLE: 'Link an Discr sticker to this disc',
    // Buttons
    SAVE: 'Save Disc',
    CANCEL: 'Cancel',
    // Success
    SUCCESS_TITLE: 'Success',
    SUCCESS_MESSAGE: 'Disc added to your bag!',
    // AI identification
    AI_ANALYZING: 'Analyzing disc...',
    AI_IDENTIFYING: 'AI is identifying your disc',
    AI_DISC_IDENTIFIED: 'Disc Identified!',
    AI_FOUND_IN_CATALOG: 'Found in catalog:',
    AI_DETECTED: 'AI detected:',
    AI_EDIT_MANUALLY: 'Edit Manually',
    AI_USE_THIS: 'Use This',
  },

  // Found disc screen strings
  FOUND_DISC: {
    // Header
    TITLE: 'Found a Disc?',
    SUBTITLE:
      'Scan the QR code or enter it manually to help reunite the disc with its owner.',
    // Input section
    SCAN_BUTTON: 'Scan QR Code',
    OR_MANUAL: 'or enter manually',
    QR_LABEL: 'QR Code',
    QR_PLACEHOLDER: 'Enter code (e.g., TEST001)',
    LOOKUP_BUTTON: 'Look Up Disc',
    // Pending returns section
    PENDING_RETURNS_TITLE: 'Your Pending Returns',
    PENDING_RETURNS_SUBTITLE: 'Discs you found that are waiting to be returned',
    LOADING_PENDING: 'Loading your found discs...',
    // Owner recovery section
    YOUR_DISCS_FOUND: 'Your Discs Were Found!',
    SOMEONE_FOUND_DISC:
      'Someone found your disc and is trying to return it',
    CHECKING_RECOVERIES: 'Checking for active recoveries...',
    // Scanner
    SCAN_QR_TITLE: 'Scan QR Code',
    SCAN_QR_SUBTITLE: 'Point your camera at the QR code on the disc',
    // Loading states
    LOOKING_UP: 'Looking up disc...',
    CLAIMING_QR: 'Claiming QR code...',
    REPORTING_FOUND: 'Reporting found disc...',
    // QR claim states
    NEW_QR_CODE: 'New QR Code!',
    QR_NOT_CLAIMED:
      "This QR code hasn't been claimed yet. Claim it to link it to one of your discs.",
    CLAIM_QR_BUTTON: 'Claim This QR Code',
    YOUR_QR_CODE: 'Your QR Code',
    QR_ALREADY_CLAIMED:
      "You've already claimed this QR code. Link it to one of your discs in your bag.",
    GO_TO_BAG: 'Go to My Bag',
    // Success states
    QR_CLAIMED_TITLE: 'QR Code Claimed!',
    QR_CLAIMED_MESSAGE:
      'The QR code is now yours. Link it to one of your discs so finders can return it to you.',
    CREATE_NEW_DISC: 'Create New Disc',
    SCAN_ANOTHER: 'Scan Another QR Code',
    // Disc found state
    DISC_FOUND: 'Disc Found!',
    MESSAGE_OPTIONAL: 'Message for Owner (Optional)',
    MESSAGE_PLACEHOLDER: 'Where did you find it? Any details...',
    REPORT_FOUND_BUTTON: 'Report Found',
    // Thank you state
    THANK_YOU: 'Thank You!',
    WHAT_NEXT: 'What would you like to do next?',
    PROPOSE_MEETUP: 'Propose a Meetup',
    DROP_OFF_DISC: 'Drop Off Disc',
    REPORT_ANOTHER: 'Report Another Disc',
    // Errors
    ERROR_NO_DISC:
      'No disc found with this QR code. Please check and try again.',
    ERROR_ALREADY_CLAIMED: 'This QR code is already claimed by another user.',
    ERROR_DEACTIVATED:
      'This QR code has been deactivated and can no longer be used.',
    ERROR_ACTIVE_RECOVERY:
      'This disc already has an active recovery in progress.',
    ERROR_LOOKUP_FAILED: 'Failed to look up disc. Please try again.',
    ERROR_PLEASE_ENTER_QR: 'Please enter a QR code',
    // Recovery status (finder view vs owner view)
    STATUS_WAITING_FOR_OWNER: 'Waiting for owner',
    STATUS_ACTION_NEEDED: 'Action needed',
    STATUS_REVIEW_MEETUP: 'Review meetup',
    STATUS_MEETUP_PROPOSED: 'Meetup proposed',
    STATUS_MEETUP_CONFIRMED: 'Meetup confirmed',
    STATUS_DROPPED_OFF: 'Dropped off',
    STATUS_READY_FOR_PICKUP: 'Ready for pickup',
    STATUS_ABANDONED: 'Owner gave up - Yours to claim!',
  },

  // Camera related strings
  CAMERA: {
    PERMISSION_REQUIRED: 'Camera Permission Required',
    PERMISSION_MESSAGE: 'Please grant camera permission to scan QR codes.',
    GRANT_PERMISSION: 'Grant Permission',
    CANCEL: 'Cancel',
  },

  // Common/shared strings
  COMMON: {
    OK: 'OK',
    CANCEL: 'Cancel',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
    DONE: 'Done',
    LOADING: 'Loading...',
    UNKNOWN_DISC: 'Unknown Disc',
    REWARD_LABEL: 'Reward',
  },

  // Alert dialogs
  ALERTS: {
    ERROR_TITLE: 'Error',
    SUCCESS_TITLE: 'Success',
    PERMISSION_DENIED_TITLE: 'Permission denied',
    MUST_BE_SIGNED_IN: 'You must be signed in to add a disc',
    PHOTO_PERMISSION_NEEDED: 'We need camera roll permissions to add photos',
    ADD_PHOTO_TITLE: 'Add Photo',
    TAKE_PHOTO: 'Take Photo',
    CHOOSE_FROM_LIBRARY: 'Choose from Library',
  },
} as const;

// Freeze the object deeply to ensure immutability
const deepFreeze = <T extends object>(obj: T): Readonly<T> => {
  Object.keys(obj).forEach((key) => {
    const value = (obj as Record<string, unknown>)[key];
    if (value && typeof value === 'object') {
      deepFreeze(value as object);
    }
  });
  return Object.freeze(obj);
};

export const STRINGS = deepFreeze(_STRINGS);
