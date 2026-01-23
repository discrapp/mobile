import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateSignInForm,
  validateSignUpForm,
  validateUsername,
  validatePhoneNumber,
  validateFullSignUpForm,
} from './validation';

describe('validateEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    expect(validateEmail('test+tag@example.com')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('test@example')).toBe(false);
    expect(validateEmail('test example@test.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('should return null for valid passwords', () => {
    expect(validatePassword('password123')).toBeNull();
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('a'.repeat(8))).toBeNull();
  });

  it('should return error for empty password', () => {
    expect(validatePassword('')).toBe('Password is required');
    expect(validatePassword('   ')).toBe('Password is required');
  });

  it('should return error for password shorter than 8 characters', () => {
    expect(validatePassword('1234567')).toBe(
      'Password must be at least 8 characters'
    );
    expect(validatePassword('abc')).toBe(
      'Password must be at least 8 characters'
    );
  });
});

describe('validatePasswordMatch', () => {
  it('should return null when passwords match', () => {
    expect(validatePasswordMatch('password123', 'password123')).toBeNull();
    expect(validatePasswordMatch('12345678', '12345678')).toBeNull();
  });

  it('should return error for empty confirm password', () => {
    expect(validatePasswordMatch('password123', '')).toBe(
      'Please confirm your password'
    );
    expect(validatePasswordMatch('password123', '   ')).toBe(
      'Please confirm your password'
    );
  });

  it('should return error when passwords do not match', () => {
    expect(validatePasswordMatch('password123', 'password456')).toBe(
      'Passwords do not match'
    );
    expect(validatePasswordMatch('test', 'testing')).toBe(
      'Passwords do not match'
    );
  });
});

describe('validateSignInForm', () => {
  it('should return no errors for valid sign in form', () => {
    const errors = validateSignInForm('test@example.com', 'password123');
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('should return error for empty email', () => {
    const errors = validateSignInForm('', 'password123');
    expect(errors.email).toBe('Email is required');
  });

  it('should return error for invalid email format', () => {
    const errors = validateSignInForm('notanemail', 'password123');
    expect(errors.email).toBe('Please enter a valid email');
  });

  it('should return error for empty password', () => {
    const errors = validateSignInForm('test@example.com', '');
    expect(errors.password).toBe('Password is required');
  });

  it('should return multiple errors when both fields are invalid', () => {
    const errors = validateSignInForm('', '');
    expect(errors.email).toBe('Email is required');
    expect(errors.password).toBe('Password is required');
  });
});

describe('validateSignUpForm', () => {
  it('should return no errors for valid sign up form', () => {
    const errors = validateSignUpForm(
      'test@example.com',
      'password123',
      'password123'
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('should return error for empty email', () => {
    const errors = validateSignUpForm('', 'password123', 'password123');
    expect(errors.email).toBe('Email is required');
  });

  it('should return error for invalid email format', () => {
    const errors = validateSignUpForm('notanemail', 'password123', 'password123');
    expect(errors.email).toBe('Please enter a valid email');
  });

  it('should return error for empty password', () => {
    const errors = validateSignUpForm('test@example.com', '', '');
    expect(errors.password).toBe('Password is required');
  });

  it('should return error for short password', () => {
    const errors = validateSignUpForm('test@example.com', '1234', '1234');
    expect(errors.password).toBe('Password must be at least 8 characters');
  });

  it('should return error when passwords do not match', () => {
    const errors = validateSignUpForm(
      'test@example.com',
      'password123',
      'password456'
    );
    expect(errors.confirmPassword).toBe('Passwords do not match');
  });

  it('should return error for empty confirm password', () => {
    const errors = validateSignUpForm('test@example.com', 'password123', '');
    expect(errors.confirmPassword).toBe('Please confirm your password');
  });

  it('should return multiple errors when all fields are invalid', () => {
    const errors = validateSignUpForm('', '123', '456');
    expect(errors.email).toBe('Email is required');
    expect(errors.password).toBe('Password must be at least 8 characters');
    expect(errors.confirmPassword).toBe('Passwords do not match');
  });

  it('should validate username when provided', () => {
    const errors = validateSignUpForm('test@example.com', 'password123', 'password123', 'ab');
    expect(errors.username).toBe('Username must be at least 3 characters');
  });

  it('should accept valid username', () => {
    const errors = validateSignUpForm('test@example.com', 'password123', 'password123', 'validuser');
    expect(errors.username).toBeUndefined();
  });
});

describe('validateUsername', () => {
  it('should return null for valid usernames', () => {
    expect(validateUsername('john_doe')).toBeNull();
    expect(validateUsername('user123')).toBeNull();
    expect(validateUsername('test-user')).toBeNull();
  });

  it('should return null for empty username when not required', () => {
    expect(validateUsername('')).toBeNull();
    expect(validateUsername('   ')).toBeNull();
  });

  it('should return error for empty username when required', () => {
    expect(validateUsername('', true)).toBe('Username is required');
    expect(validateUsername('   ', true)).toBe('Username is required');
  });

  it('should return error for username shorter than 3 characters', () => {
    expect(validateUsername('ab')).toBe('Username must be at least 3 characters');
    expect(validateUsername('a')).toBe('Username must be at least 3 characters');
  });

  it('should return error for username longer than 30 characters', () => {
    expect(validateUsername('a'.repeat(31))).toBe('Username must be less than 30 characters');
  });

  it('should return error for username with invalid characters', () => {
    expect(validateUsername('user@name')).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    expect(validateUsername('user name')).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    expect(validateUsername('user.name')).toBe('Username can only contain letters, numbers, underscores, and hyphens');
  });
});

describe('validatePhoneNumber', () => {
  it('should return null for valid phone numbers', () => {
    expect(validatePhoneNumber('1234567890')).toBeNull();
    expect(validatePhoneNumber('+11234567890')).toBeNull();
    expect(validatePhoneNumber('(123) 456-7890')).toBeNull();
    expect(validatePhoneNumber('123-456-7890')).toBeNull();
  });

  it('should return null for empty phone when not required', () => {
    expect(validatePhoneNumber('')).toBeNull();
    expect(validatePhoneNumber('   ')).toBeNull();
  });

  it('should return error for empty phone when required', () => {
    expect(validatePhoneNumber('', true)).toBe('Phone number is required');
    expect(validatePhoneNumber('   ', true)).toBe('Phone number is required');
  });

  it('should return error for invalid phone number format', () => {
    expect(validatePhoneNumber('123')).toBe('Please enter a valid phone number');
    expect(validatePhoneNumber('abcdefghij')).toBe('Please enter a valid phone number');
    expect(validatePhoneNumber('12345')).toBe('Please enter a valid phone number');
  });
});

describe('validateFullSignUpForm', () => {
  const validData = {
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    username: 'testuser',
    phoneNumber: '1234567890',
    throwingHand: 'right',
    preferredThrowStyle: 'backhand',
  };

  it('should return no errors for valid data', () => {
    const errors = validateFullSignUpForm(validData);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('should return error for invalid email', () => {
    const errors = validateFullSignUpForm({ ...validData, email: '' });
    expect(errors.email).toBe('Email is required');
  });

  it('should return error for invalid password', () => {
    const errors = validateFullSignUpForm({ ...validData, password: '123', confirmPassword: '123' });
    expect(errors.password).toBe('Password must be at least 8 characters');
  });

  it('should return error for mismatched passwords', () => {
    const errors = validateFullSignUpForm({ ...validData, confirmPassword: 'different' });
    expect(errors.confirmPassword).toBe('Passwords do not match');
  });

  it('should return error for invalid username', () => {
    const errors = validateFullSignUpForm({ ...validData, username: 'ab' });
    expect(errors.username).toBe('Username must be at least 3 characters');
  });

  it('should return error for missing required username', () => {
    const errors = validateFullSignUpForm({ ...validData, username: '' });
    expect(errors.username).toBe('Username is required');
  });

  it('should return error for invalid phone number', () => {
    const errors = validateFullSignUpForm({ ...validData, phoneNumber: '123' });
    expect(errors.phoneNumber).toBe('Please enter a valid phone number');
  });

  it('should return error for missing required phone', () => {
    const errors = validateFullSignUpForm({ ...validData, phoneNumber: '' });
    expect(errors.phoneNumber).toBe('Phone number is required');
  });
});
