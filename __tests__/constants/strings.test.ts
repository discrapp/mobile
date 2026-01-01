/**
 * Tests for string constants
 *
 * These tests ensure all UI strings are centralized and have expected values.
 * Following TDD principles - these tests are written BEFORE implementation.
 */

import { STRINGS } from '@/constants/strings';

describe('STRINGS constants', () => {
  describe('structure', () => {
    it('should export STRINGS object', () => {
      expect(STRINGS).toBeDefined();
      expect(typeof STRINGS).toBe('object');
    });

    it('should be immutable (as const)', () => {
      // TypeScript enforces this at compile time, but we can verify the structure exists
      expect(Object.isFrozen(STRINGS)).toBe(true);
    });
  });

  describe('AUTH section', () => {
    it('should have AUTH section', () => {
      expect(STRINGS.AUTH).toBeDefined();
    });

    it('should have sign in strings', () => {
      expect(STRINGS.AUTH.APP_NAME).toBe('Discr');
      expect(STRINGS.AUTH.WELCOME_BACK).toBe('Welcome Back');
      expect(STRINGS.AUTH.SIGN_IN_SUBTITLE).toBe('Sign in to continue');
      expect(STRINGS.AUTH.EMAIL_LABEL).toBe('Email');
      expect(STRINGS.AUTH.EMAIL_PLACEHOLDER).toBe('Enter your email');
      expect(STRINGS.AUTH.PASSWORD_LABEL).toBe('Password');
      expect(STRINGS.AUTH.PASSWORD_PLACEHOLDER).toBe('Enter your password');
      expect(STRINGS.AUTH.FORGOT_PASSWORD).toBe('Forgot password?');
      expect(STRINGS.AUTH.SIGN_IN_BUTTON).toBe('Sign In');
      expect(STRINGS.AUTH.NO_ACCOUNT).toBe("Don't have an account? ");
      expect(STRINGS.AUTH.SIGN_UP_LINK).toBe('Sign Up');
    });

    it('should have sign up strings', () => {
      expect(STRINGS.AUTH.CREATE_ACCOUNT).toBe('Create Account');
      expect(STRINGS.AUTH.SIGN_UP_SUBTITLE).toBe('Sign up to get started');
      expect(STRINGS.AUTH.CONFIRM_PASSWORD_LABEL).toBe('Confirm Password');
      expect(STRINGS.AUTH.CONFIRM_PASSWORD_PLACEHOLDER).toBe('Confirm your password');
      expect(STRINGS.AUTH.SIGN_UP_BUTTON).toBe('Sign Up');
      expect(STRINGS.AUTH.HAVE_ACCOUNT).toBe('Already have an account? ');
      expect(STRINGS.AUTH.SIGN_IN_LINK).toBe('Sign In');
    });
  });

  describe('ERRORS section', () => {
    it('should have ERRORS section', () => {
      expect(STRINGS.ERRORS).toBeDefined();
    });

    it('should have generic error messages', () => {
      expect(STRINGS.ERRORS.GENERIC).toBe('Something went wrong. Please try again.');
      expect(STRINGS.ERRORS.NETWORK).toBe('Please check your connection');
      expect(STRINGS.ERRORS.TITLE).toBe('Error');
      expect(STRINGS.ERRORS.OOPS).toBe('Oops!');
    });

    it('should have retry messages', () => {
      expect(STRINGS.ERRORS.TRY_AGAIN).toBe('Try Again');
    });
  });

  describe('VALIDATION section', () => {
    it('should have VALIDATION section', () => {
      expect(STRINGS.VALIDATION).toBeDefined();
    });

    it('should have email validation messages', () => {
      expect(STRINGS.VALIDATION.EMAIL_REQUIRED).toBe('Email is required');
      expect(STRINGS.VALIDATION.EMAIL_INVALID).toBe('Please enter a valid email');
    });

    it('should have password validation messages', () => {
      expect(STRINGS.VALIDATION.PASSWORD_REQUIRED).toBe('Password is required');
      expect(STRINGS.VALIDATION.PASSWORD_MIN_LENGTH).toBe('Password must be at least 8 characters');
      expect(STRINGS.VALIDATION.CONFIRM_PASSWORD_REQUIRED).toBe('Please confirm your password');
      expect(STRINGS.VALIDATION.PASSWORDS_NO_MATCH).toBe('Passwords do not match');
    });

    it('should have address validation messages', () => {
      expect(STRINGS.VALIDATION.NAME_REQUIRED).toBe('Name is required');
      expect(STRINGS.VALIDATION.NAME_TOO_LONG).toBe('Name is too long (max 100 characters)');
      expect(STRINGS.VALIDATION.STREET_REQUIRED).toBe('Street address is required');
      expect(STRINGS.VALIDATION.STREET_TOO_LONG).toBe('Street address is too long (max 100 characters)');
      expect(STRINGS.VALIDATION.ADDRESS_LINE_2_TOO_LONG).toBe('Address line 2 is too long (max 100 characters)');
      expect(STRINGS.VALIDATION.CITY_REQUIRED).toBe('City is required');
      expect(STRINGS.VALIDATION.CITY_TOO_LONG).toBe('City name is too long (max 50 characters)');
      expect(STRINGS.VALIDATION.STATE_REQUIRED).toBe('State is required');
      expect(STRINGS.VALIDATION.STATE_INVALID_LENGTH).toBe('State must be a 2-letter code (e.g., CA)');
      expect(STRINGS.VALIDATION.STATE_INVALID).toBe('Please enter a valid US state code');
      expect(STRINGS.VALIDATION.ZIP_REQUIRED).toBe('ZIP code is required');
      expect(STRINGS.VALIDATION.ZIP_INVALID).toBe('ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)');
    });
  });

  describe('DISCS section', () => {
    it('should have DISCS section', () => {
      expect(STRINGS.DISCS).toBeDefined();
    });

    it('should have empty state strings', () => {
      expect(STRINGS.DISCS.EMPTY_TITLE).toBe('No Discs in Your Bag');
      expect(STRINGS.DISCS.EMPTY_DESCRIPTION).toBe('Start building your disc collection by adding your first disc!');
      expect(STRINGS.DISCS.ADD_FIRST_DISC).toBe('Add Your First Disc');
    });

    it('should have disc badge labels', () => {
      expect(STRINGS.DISCS.BADGE_SURRENDERED).toBe('Surrendered');
      expect(STRINGS.DISCS.BADGE_AI_IDENTIFIED).toBe('AI Identified');
    });

    it('should have protect banner strings', () => {
      expect(STRINGS.DISCS.PROTECT_TITLE).toBe('Protect Your Collection');
      expect(STRINGS.DISCS.PROTECT_SUBTITLE).toBe('Add QR stickers to help finders contact you');
    });

    it('should have recovery status labels', () => {
      expect(STRINGS.DISCS.RECOVERY_STATUS_FOUND).toBe('Found');
      expect(STRINGS.DISCS.RECOVERY_STATUS_MEETUP_PROPOSED).toBe('Meetup Proposed');
      expect(STRINGS.DISCS.RECOVERY_STATUS_MEETUP_CONFIRMED).toBe('Meetup Confirmed');
    });
  });

  describe('ADD_DISC section', () => {
    it('should have ADD_DISC section', () => {
      expect(STRINGS.ADD_DISC).toBeDefined();
    });

    it('should have form title and field labels', () => {
      expect(STRINGS.ADD_DISC.TITLE).toBe('Add Disc');
      expect(STRINGS.ADD_DISC.MOLD_REQUIRED).toBe('Mold name is required');
    });

    it('should have entry mode strings', () => {
      expect(STRINGS.ADD_DISC.HOW_TO_ADD).toBe('How would you like to add your disc?');
      expect(STRINGS.ADD_DISC.SCAN_QR_TITLE).toBe('Scan QR Sticker');
      expect(STRINGS.ADD_DISC.SCAN_QR_DESC).toBe('Link a Discr sticker to this disc');
      expect(STRINGS.ADD_DISC.PHOTO_AI_TITLE).toBe('Photo + AI Identify');
      expect(STRINGS.ADD_DISC.PHOTO_AI_DESC).toBe('Take a photo and let AI fill in the details');
      expect(STRINGS.ADD_DISC.MANUAL_TITLE).toBe('Manual Entry');
      expect(STRINGS.ADD_DISC.MANUAL_DESC).toBe('Enter disc details yourself');
    });

    it('should have photo section strings', () => {
      expect(STRINGS.ADD_DISC.PHOTOS_OPTIONAL).toBe('Photos (Optional)');
      expect(STRINGS.ADD_DISC.ADD_PHOTO).toBe('Add Photo');
      expect(STRINGS.ADD_DISC.PHOTO_LIMIT_HINT).toBe('You can add up to 4 photos per disc');
      expect(STRINGS.ADD_DISC.MAX_PHOTOS_TITLE).toBe('Maximum photos');
      expect(STRINGS.ADD_DISC.MAX_PHOTOS_MESSAGE).toBe('You can only add up to 4 photos per disc');
    });

    it('should have QR code strings', () => {
      expect(STRINGS.ADD_DISC.QR_LINKED).toBe('QR Code Linked');
      expect(STRINGS.ADD_DISC.QR_SCAN_SUBTITLE).toBe('Link an Discr sticker to this disc');
    });

    it('should have button labels', () => {
      expect(STRINGS.ADD_DISC.SAVE).toBe('Save Disc');
      expect(STRINGS.ADD_DISC.CANCEL).toBe('Cancel');
    });

    it('should have success messages', () => {
      expect(STRINGS.ADD_DISC.SUCCESS_TITLE).toBe('Success');
      expect(STRINGS.ADD_DISC.SUCCESS_MESSAGE).toBe('Disc added to your bag!');
    });

    it('should have AI identification strings', () => {
      expect(STRINGS.ADD_DISC.AI_ANALYZING).toBe('Analyzing disc...');
      expect(STRINGS.ADD_DISC.AI_IDENTIFYING).toBe('AI is identifying your disc');
      expect(STRINGS.ADD_DISC.AI_DISC_IDENTIFIED).toBe('Disc Identified!');
      expect(STRINGS.ADD_DISC.AI_FOUND_IN_CATALOG).toBe('Found in catalog:');
      expect(STRINGS.ADD_DISC.AI_DETECTED).toBe('AI detected:');
      expect(STRINGS.ADD_DISC.AI_EDIT_MANUALLY).toBe('Edit Manually');
      expect(STRINGS.ADD_DISC.AI_USE_THIS).toBe('Use This');
    });
  });

  describe('FOUND_DISC section', () => {
    it('should have FOUND_DISC section', () => {
      expect(STRINGS.FOUND_DISC).toBeDefined();
    });

    it('should have header strings', () => {
      expect(STRINGS.FOUND_DISC.TITLE).toBe('Found a Disc?');
      expect(STRINGS.FOUND_DISC.SUBTITLE).toBe('Scan the QR code or enter it manually to help reunite the disc with its owner.');
    });

    it('should have input strings', () => {
      expect(STRINGS.FOUND_DISC.SCAN_BUTTON).toBe('Scan QR Code');
      expect(STRINGS.FOUND_DISC.OR_MANUAL).toBe('or enter manually');
      expect(STRINGS.FOUND_DISC.QR_LABEL).toBe('QR Code');
      expect(STRINGS.FOUND_DISC.QR_PLACEHOLDER).toBe('Enter code (e.g., TEST001)');
      expect(STRINGS.FOUND_DISC.LOOKUP_BUTTON).toBe('Look Up Disc');
    });

    it('should have pending returns strings', () => {
      expect(STRINGS.FOUND_DISC.PENDING_RETURNS_TITLE).toBe('Your Pending Returns');
      expect(STRINGS.FOUND_DISC.PENDING_RETURNS_SUBTITLE).toBe('Discs you found that are waiting to be returned');
      expect(STRINGS.FOUND_DISC.LOADING_PENDING).toBe('Loading your found discs...');
    });

    it('should have owner recovery strings', () => {
      expect(STRINGS.FOUND_DISC.YOUR_DISCS_FOUND).toBe('Your Discs Were Found!');
      expect(STRINGS.FOUND_DISC.SOMEONE_FOUND_DISC).toBe('Someone found your disc and is trying to return it');
      expect(STRINGS.FOUND_DISC.CHECKING_RECOVERIES).toBe('Checking for active recoveries...');
    });

    it('should have scanner strings', () => {
      expect(STRINGS.FOUND_DISC.SCAN_QR_TITLE).toBe('Scan QR Code');
      expect(STRINGS.FOUND_DISC.SCAN_QR_SUBTITLE).toBe('Point your camera at the QR code on the disc');
    });

    it('should have loading state strings', () => {
      expect(STRINGS.FOUND_DISC.LOOKING_UP).toBe('Looking up disc...');
      expect(STRINGS.FOUND_DISC.CLAIMING_QR).toBe('Claiming QR code...');
      expect(STRINGS.FOUND_DISC.REPORTING_FOUND).toBe('Reporting found disc...');
    });

    it('should have QR claim strings', () => {
      expect(STRINGS.FOUND_DISC.NEW_QR_CODE).toBe('New QR Code!');
      expect(STRINGS.FOUND_DISC.QR_NOT_CLAIMED).toBe("This QR code hasn't been claimed yet. Claim it to link it to one of your discs.");
      expect(STRINGS.FOUND_DISC.CLAIM_QR_BUTTON).toBe('Claim This QR Code');
      expect(STRINGS.FOUND_DISC.YOUR_QR_CODE).toBe('Your QR Code');
      expect(STRINGS.FOUND_DISC.QR_ALREADY_CLAIMED).toBe("You've already claimed this QR code. Link it to one of your discs in your bag.");
      expect(STRINGS.FOUND_DISC.GO_TO_BAG).toBe('Go to My Bag');
    });

    it('should have success strings', () => {
      expect(STRINGS.FOUND_DISC.QR_CLAIMED_TITLE).toBe('QR Code Claimed!');
      expect(STRINGS.FOUND_DISC.QR_CLAIMED_MESSAGE).toBe('The QR code is now yours. Link it to one of your discs so finders can return it to you.');
      expect(STRINGS.FOUND_DISC.CREATE_NEW_DISC).toBe('Create New Disc');
      expect(STRINGS.FOUND_DISC.SCAN_ANOTHER).toBe('Scan Another QR Code');
    });

    it('should have disc found strings', () => {
      expect(STRINGS.FOUND_DISC.DISC_FOUND).toBe('Disc Found!');
      expect(STRINGS.FOUND_DISC.MESSAGE_OPTIONAL).toBe('Message for Owner (Optional)');
      expect(STRINGS.FOUND_DISC.MESSAGE_PLACEHOLDER).toBe('Where did you find it? Any details...');
      expect(STRINGS.FOUND_DISC.REPORT_FOUND_BUTTON).toBe('Report Found');
    });

    it('should have thank you strings', () => {
      expect(STRINGS.FOUND_DISC.THANK_YOU).toBe('Thank You!');
      expect(STRINGS.FOUND_DISC.WHAT_NEXT).toBe('What would you like to do next?');
      expect(STRINGS.FOUND_DISC.PROPOSE_MEETUP).toBe('Propose a Meetup');
      expect(STRINGS.FOUND_DISC.DROP_OFF_DISC).toBe('Drop Off Disc');
      expect(STRINGS.FOUND_DISC.REPORT_ANOTHER).toBe('Report Another Disc');
    });

    it('should have error strings', () => {
      expect(STRINGS.FOUND_DISC.ERROR_NO_DISC).toBe('No disc found with this QR code. Please check and try again.');
      expect(STRINGS.FOUND_DISC.ERROR_ALREADY_CLAIMED).toBe('This QR code is already claimed by another user.');
      expect(STRINGS.FOUND_DISC.ERROR_DEACTIVATED).toBe('This QR code has been deactivated and can no longer be used.');
      expect(STRINGS.FOUND_DISC.ERROR_ACTIVE_RECOVERY).toBe('This disc already has an active recovery in progress.');
      expect(STRINGS.FOUND_DISC.ERROR_LOOKUP_FAILED).toBe('Failed to look up disc. Please try again.');
      expect(STRINGS.FOUND_DISC.ERROR_PLEASE_ENTER_QR).toBe('Please enter a QR code');
    });

    it('should have recovery status strings', () => {
      expect(STRINGS.FOUND_DISC.STATUS_WAITING_FOR_OWNER).toBe('Waiting for owner');
      expect(STRINGS.FOUND_DISC.STATUS_ACTION_NEEDED).toBe('Action needed');
      expect(STRINGS.FOUND_DISC.STATUS_REVIEW_MEETUP).toBe('Review meetup');
      expect(STRINGS.FOUND_DISC.STATUS_MEETUP_PROPOSED).toBe('Meetup proposed');
      expect(STRINGS.FOUND_DISC.STATUS_MEETUP_CONFIRMED).toBe('Meetup confirmed');
      expect(STRINGS.FOUND_DISC.STATUS_DROPPED_OFF).toBe('Dropped off');
      expect(STRINGS.FOUND_DISC.STATUS_READY_FOR_PICKUP).toBe('Ready for pickup');
      expect(STRINGS.FOUND_DISC.STATUS_ABANDONED).toBe('Owner gave up - Yours to claim!');
    });
  });

  describe('CAMERA section', () => {
    it('should have CAMERA section', () => {
      expect(STRINGS.CAMERA).toBeDefined();
    });

    it('should have permission strings', () => {
      expect(STRINGS.CAMERA.PERMISSION_REQUIRED).toBe('Camera Permission Required');
      expect(STRINGS.CAMERA.PERMISSION_MESSAGE).toBe('Please grant camera permission to scan QR codes.');
      expect(STRINGS.CAMERA.GRANT_PERMISSION).toBe('Grant Permission');
    });

    it('should have button labels', () => {
      expect(STRINGS.CAMERA.CANCEL).toBe('Cancel');
    });
  });

  describe('COMMON section', () => {
    it('should have COMMON section', () => {
      expect(STRINGS.COMMON).toBeDefined();
    });

    it('should have common button labels', () => {
      expect(STRINGS.COMMON.OK).toBe('OK');
      expect(STRINGS.COMMON.CANCEL).toBe('Cancel');
      expect(STRINGS.COMMON.SAVE).toBe('Save');
      expect(STRINGS.COMMON.DELETE).toBe('Delete');
      expect(STRINGS.COMMON.EDIT).toBe('Edit');
      expect(STRINGS.COMMON.DONE).toBe('Done');
      expect(STRINGS.COMMON.LOADING).toBe('Loading...');
    });

    it('should have common labels', () => {
      expect(STRINGS.COMMON.UNKNOWN_DISC).toBe('Unknown Disc');
      expect(STRINGS.COMMON.REWARD_LABEL).toBe('Reward');
    });
  });

  describe('ALERTS section', () => {
    it('should have ALERTS section', () => {
      expect(STRINGS.ALERTS).toBeDefined();
    });

    it('should have alert titles', () => {
      expect(STRINGS.ALERTS.ERROR_TITLE).toBe('Error');
      expect(STRINGS.ALERTS.SUCCESS_TITLE).toBe('Success');
      expect(STRINGS.ALERTS.PERMISSION_DENIED_TITLE).toBe('Permission denied');
    });

    it('should have alert messages', () => {
      expect(STRINGS.ALERTS.MUST_BE_SIGNED_IN).toBe('You must be signed in to add a disc');
      expect(STRINGS.ALERTS.PHOTO_PERMISSION_NEEDED).toBe('We need camera roll permissions to add photos');
    });

    it('should have photo alert strings', () => {
      expect(STRINGS.ALERTS.ADD_PHOTO_TITLE).toBe('Add Photo');
      expect(STRINGS.ALERTS.TAKE_PHOTO).toBe('Take Photo');
      expect(STRINGS.ALERTS.CHOOSE_FROM_LIBRARY).toBe('Choose from Library');
    });
  });
});
