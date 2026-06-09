import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  discFormSchema,
  shippingAddressSchema,
  SignInFormData,
  SignUpFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  DiscFormData,
  ShippingAddressFormData,
  extractZodErrors,
  validateSignInWithZod,
  validateSignUpWithZod,
  validateForgotPasswordWithZod,
  validateResetPasswordWithZod,
  validateDiscFormWithZod,
  validateShippingAddressWithZod,
} from '@/lib/zodSchemas';

describe('Zod Validation Schemas', async () => {
  describe('signInSchema', async () => {
    it('validates a correct sign-in form', async () => {
      const validData: SignInFormData = {
        email: 'test@example.com',
        password: 'password123',
      };
      const result = signInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('trims email whitespace', async () => {
      const data = {
        email: '  test@example.com  ',
        password: 'password123',
      };
      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('rejects empty email', async () => {
      const data = {
        email: '',
        password: 'password123',
      };
      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('rejects invalid email format', async () => {
      const data = {
        email: 'notanemail',
        password: 'password123',
      };
      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email');
      }
    });

    it('rejects empty password', async () => {
      const data = {
        email: 'test@example.com',
        password: '',
      };
      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('rejects whitespace-only password', async () => {
      const data = {
        email: 'test@example.com',
        password: '   ',
      };
      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });
  });

  describe('signUpSchema', async () => {
    it('validates a correct sign-up form', async () => {
      const validData: SignUpFormData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };
      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects password shorter than 8 characters', async () => {
      const data = {
        email: 'test@example.com',
        password: 'short',
        confirmPassword: 'short',
      };
      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find(
          (issue) => issue.path[0] === 'password'
        );
        expect(passwordError?.message).toBe('Password must be at least 8 characters');
      }
    });

    it('rejects mismatched passwords', async () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different123',
      };
      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(
          (issue) => issue.path[0] === 'confirmPassword'
        );
        expect(confirmError?.message).toBe('Passwords do not match');
      }
    });

    it('rejects empty confirm password', async () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: '',
      };
      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(
          (issue) => issue.path[0] === 'confirmPassword'
        );
        expect(confirmError?.message).toBe('Please confirm your password');
      }
    });

    it('validates email format', async () => {
      const data = {
        email: 'invalidemail',
        password: 'password123',
        confirmPassword: 'password123',
      };
      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find(
          (issue) => issue.path[0] === 'email'
        );
        expect(emailError?.message).toBe('Please enter a valid email');
      }
    });
  });

  describe('forgotPasswordSchema', async () => {
    it('validates a correct email', async () => {
      const validData: ForgotPasswordFormData = {
        email: 'test@example.com',
      };
      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('trims email whitespace', async () => {
      const data = {
        email: '  test@example.com  ',
      };
      const result = forgotPasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('rejects empty email', async () => {
      const data = {
        email: '',
      };
      const result = forgotPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('rejects invalid email format', async () => {
      const data = {
        email: 'notanemail',
      };
      const result = forgotPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });
  });

  describe('resetPasswordSchema', async () => {
    it('validates a correct reset password form', async () => {
      const validData: ResetPasswordFormData = {
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      };
      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects password shorter than 6 characters', async () => {
      const data = {
        password: '12345',
        confirmPassword: '12345',
      };
      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find(
          (issue) => issue.path[0] === 'password'
        );
        expect(passwordError?.message).toBe('Password must be at least 6 characters');
      }
    });

    it('rejects empty password', async () => {
      const data = {
        password: '',
        confirmPassword: '',
      };
      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find(
          (issue) => issue.path[0] === 'password'
        );
        expect(passwordError?.message).toBe('Password is required');
      }
    });

    it('rejects mismatched passwords', async () => {
      const data = {
        password: 'newpassword123',
        confirmPassword: 'different123',
      };
      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(
          (issue) => issue.path[0] === 'confirmPassword'
        );
        expect(confirmError?.message).toBe('Passwords do not match');
      }
    });
  });

  describe('discFormSchema', async () => {
    it('validates a minimal disc form with just mold', async () => {
      const validData = {
        mold: 'Destroyer',
      };
      const result = discFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates a complete disc form', async () => {
      const validData: DiscFormData = {
        mold: 'Destroyer',
        manufacturer: 'Innova',
        category: 'Distance Driver',
        plastic: 'Star',
        weight: 175,
        color: 'Red',
        speed: 12,
        glide: 5,
        turn: -1,
        fade: 3,
        rewardAmount: 10.0,
        notes: 'Great disc for forehand throws',
      };
      const result = discFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty mold', async () => {
      const data = {
        mold: '',
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mold name is required');
      }
    });

    it('rejects whitespace-only mold', async () => {
      const data = {
        mold: '   ',
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mold name is required');
      }
    });

    it('validates weight within range', async () => {
      const validData = {
        mold: 'Destroyer',
        weight: 175,
      };
      const result = discFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects weight below minimum', async () => {
      const data = {
        mold: 'Destroyer',
        weight: 50,
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const weightError = result.error.issues.find(
          (issue) => issue.path[0] === 'weight'
        );
        expect(weightError?.message).toBe('Weight must be at least 100g');
      }
    });

    it('rejects weight above maximum', async () => {
      const data = {
        mold: 'Destroyer',
        weight: 250,
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const weightError = result.error.issues.find(
          (issue) => issue.path[0] === 'weight'
        );
        expect(weightError?.message).toBe('Weight cannot exceed 200g');
      }
    });

    it('validates speed within range', async () => {
      const validData = {
        mold: 'Destroyer',
        speed: 12,
      };
      const result = discFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects speed out of range', async () => {
      const data = {
        mold: 'Destroyer',
        speed: 20,
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const speedError = result.error.issues.find(
          (issue) => issue.path[0] === 'speed'
        );
        expect(speedError?.message).toBe('Speed must be between 1 and 15');
      }
    });

    it('validates negative turn values', async () => {
      const validData = {
        mold: 'Destroyer',
        turn: -3,
      };
      const result = discFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects turn out of range', async () => {
      const data = {
        mold: 'Destroyer',
        turn: -6,
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const turnError = result.error.issues.find(
          (issue) => issue.path[0] === 'turn'
        );
        expect(turnError?.message).toBe('Turn must be between -5 and 1');
      }
    });

    it('validates positive reward amount', async () => {
      const validData = {
        mold: 'Destroyer',
        rewardAmount: 25.5,
      };
      const result = discFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects negative reward amount', async () => {
      const data = {
        mold: 'Destroyer',
        rewardAmount: -5,
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const rewardError = result.error.issues.find(
          (issue) => issue.path[0] === 'rewardAmount'
        );
        expect(rewardError?.message).toBe('Reward amount cannot be negative');
      }
    });

    it('allows undefined optional fields', async () => {
      const data = {
        mold: 'Destroyer',
        manufacturer: undefined,
        weight: undefined,
      };
      const result = discFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('shippingAddressSchema', async () => {
    const validAddress: ShippingAddressFormData = {
      name: 'John Doe',
      street_address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postal_code: '90210',
    };

    it('validates a correct shipping address', async () => {
      const result = shippingAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('validates address with optional street_address_2', async () => {
      const data = {
        ...validAddress,
        street_address_2: 'Apt 4B',
      };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', async () => {
      const data = { ...validAddress, name: '' };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find(
          (issue) => issue.path[0] === 'name'
        );
        expect(nameError?.message).toBe('Name is required');
      }
    });

    it('rejects name exceeding max length', async () => {
      const data = { ...validAddress, name: 'A'.repeat(101) };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.issues.find(
          (issue) => issue.path[0] === 'name'
        );
        expect(nameError?.message).toBe('Name is too long (max 100 characters)');
      }
    });

    it('rejects empty street address', async () => {
      const data = { ...validAddress, street_address: '' };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const streetError = result.error.issues.find(
          (issue) => issue.path[0] === 'street_address'
        );
        expect(streetError?.message).toBe('Street address is required');
      }
    });

    it('rejects empty city', async () => {
      const data = { ...validAddress, city: '' };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const cityError = result.error.issues.find(
          (issue) => issue.path[0] === 'city'
        );
        expect(cityError?.message).toBe('City is required');
      }
    });

    it('validates 2-letter state codes', async () => {
      const result = shippingAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('rejects invalid state code length', async () => {
      const data = { ...validAddress, state: 'CAL' };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const stateError = result.error.issues.find(
          (issue) => issue.path[0] === 'state'
        );
        expect(stateError?.message).toBe('State must be a 2-letter code (e.g., CA)');
      }
    });

    it('validates 5-digit ZIP code', async () => {
      const result = shippingAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('validates ZIP+4 format', async () => {
      const data = { ...validAddress, postal_code: '90210-1234' };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid ZIP code format', async () => {
      const data = { ...validAddress, postal_code: '1234' };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const postalError = result.error.issues.find(
          (issue) => issue.path[0] === 'postal_code'
        );
        expect(postalError?.message).toBe(
          'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'
        );
      }
    });

    it('uppercases state code', async () => {
      const data = { ...validAddress, state: 'ca' };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.state).toBe('CA');
      }
    });

    it('trims whitespace from all fields', async () => {
      const data = {
        name: '  John Doe  ',
        street_address: '  123 Main St  ',
        city: '  Los Angeles  ',
        state: '  CA  ',
        postal_code: '  90210  ',
      };
      const result = shippingAddressSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.street_address).toBe('123 Main St');
        expect(result.data.city).toBe('Los Angeles');
        expect(result.data.state).toBe('CA');
        expect(result.data.postal_code).toBe('90210');
      }
    });
  });

  describe('Helper Functions', async () => {
    describe('extractZodErrors', async () => {
      it('returns empty object for successful validation', async () => {
        const result = signInSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(extractZodErrors(result)).toEqual({});
      });

      it('returns first error for each field', async () => {
        const result = signInSchema.safeParse({
          email: '',
          password: '',
        });
        const errors = extractZodErrors(result);
        expect(errors.email).toBe('Email is required');
        expect(errors.password).toBe('Password is required');
      });
    });

    describe('validateSignInWithZod', async () => {
      it('returns empty object for valid data', async () => {
        const errors = validateSignInWithZod('test@example.com', 'password123');
        expect(errors).toEqual({});
      });

      it('returns errors for invalid data', async () => {
        const errors = validateSignInWithZod('', '');
        expect(errors.email).toBe('Email is required');
        expect(errors.password).toBe('Password is required');
      });
    });

    describe('validateSignUpWithZod', async () => {
      it('returns empty object for valid data', async () => {
        const errors = validateSignUpWithZod(
          'test@example.com',
          'password123',
          'password123'
        );
        expect(errors).toEqual({});
      });

      it('returns errors for mismatched passwords', async () => {
        const errors = validateSignUpWithZod(
          'test@example.com',
          'password123',
          'different'
        );
        expect(errors.confirmPassword).toBe('Passwords do not match');
      });
    });

    describe('validateForgotPasswordWithZod', async () => {
      it('returns empty object for valid email', async () => {
        const errors = validateForgotPasswordWithZod('test@example.com');
        expect(errors).toEqual({});
      });

      it('returns error for invalid email', async () => {
        const errors = validateForgotPasswordWithZod('notanemail');
        expect(errors.email).toBe('Please enter a valid email address');
      });
    });

    describe('validateResetPasswordWithZod', async () => {
      it('returns empty object for valid passwords', async () => {
        const errors = validateResetPasswordWithZod('newpassword', 'newpassword');
        expect(errors).toEqual({});
      });

      it('returns error for short password', async () => {
        const errors = validateResetPasswordWithZod('12345', '12345');
        expect(errors.password).toBe('Password must be at least 6 characters');
      });
    });

    describe('validateDiscFormWithZod', async () => {
      it('returns empty object for valid disc data', async () => {
        const errors = validateDiscFormWithZod({ mold: 'Destroyer' });
        expect(errors).toEqual({});
      });

      it('returns error for missing mold', async () => {
        const errors = validateDiscFormWithZod({ mold: '' });
        expect(errors.mold).toBe('Mold name is required');
      });
    });

    describe('validateShippingAddressWithZod', async () => {
      it('returns empty object for valid address', async () => {
        const errors = validateShippingAddressWithZod({
          name: 'John Doe',
          street_address: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90210',
        });
        expect(errors).toEqual({});
      });

      it('returns errors for invalid address', async () => {
        const errors = validateShippingAddressWithZod({
          name: '',
          street_address: '',
          city: '',
          state: '',
          postal_code: '',
        });
        expect(Object.keys(errors)).toHaveLength(5);
      });
    });
  });
});
