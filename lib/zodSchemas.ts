import { z } from 'zod';

// US State codes for validation
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP', // Territories
] as const;

/**
 * Email validation schema - reusable across forms
 */
const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email');

/**
 * Sign In form validation schema
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .refine((val) => val.trim().length > 0, 'Password is required'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

/**
 * Sign Up form validation schema
 */
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

/**
 * Forgot Password form validation schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset Password form validation schema
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Disc form validation schema
 */
export const discFormSchema = z.object({
  mold: z
    .string()
    .min(1, 'Mold name is required')
    .refine((val) => val.trim().length > 0, 'Mold name is required'),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  plastic: z.string().optional(),
  weight: z
    .number()
    .min(100, 'Weight must be at least 100g')
    .max(200, 'Weight cannot exceed 200g')
    .optional(),
  color: z.string().optional(),
  speed: z
    .number()
    .min(1, 'Speed must be between 1 and 15')
    .max(15, 'Speed must be between 1 and 15')
    .optional(),
  glide: z
    .number()
    .min(1, 'Glide must be between 1 and 7')
    .max(7, 'Glide must be between 1 and 7')
    .optional(),
  turn: z
    .number()
    .min(-5, 'Turn must be between -5 and 1')
    .max(1, 'Turn must be between -5 and 1')
    .optional(),
  fade: z
    .number()
    .min(0, 'Fade must be between 0 and 5')
    .max(5, 'Fade must be between 0 and 5')
    .optional(),
  rewardAmount: z
    .number()
    .min(0, 'Reward amount cannot be negative')
    .optional(),
  notes: z.string().optional(),
});

export type DiscFormData = z.infer<typeof discFormSchema>;

/**
 * Shipping Address validation schema
 */
export const shippingAddressSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name is too long (max 100 characters)'),
  street_address: z
    .string()
    .trim()
    .min(1, 'Street address is required')
    .max(100, 'Street address is too long (max 100 characters)'),
  street_address_2: z
    .string()
    .trim()
    .max(100, 'Address line 2 is too long (max 100 characters)')
    .optional(),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(50, 'City name is too long (max 50 characters)'),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'State is required')
    .length(2, 'State must be a 2-letter code (e.g., CA)')
    .refine(
      (val) => US_STATE_CODES.includes(val as typeof US_STATE_CODES[number]),
      'Please enter a valid US state code'
    ),
  postal_code: z
    .string()
    .trim()
    .min(1, 'ZIP code is required')
    .regex(
      /^\d{5}(-\d{4})?$/,
      'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'
    ),
  country: z.string().optional(),
});

export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;

/**
 * Helper function to extract error messages from Zod validation result
 * Returns an object with field names as keys and error messages as values
 */
export function extractZodErrors<T>(
  result: z.ZodSafeParseResult<T>
): Record<string, string> {
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0];
    if (typeof path === 'string' && !errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

/**
 * Validate sign-in form data and return errors object
 * Compatible with existing form error state pattern
 */
export function validateSignInWithZod(
  email: string,
  password: string
): { email?: string; password?: string } {
  const result = signInSchema.safeParse({ email, password });
  return extractZodErrors(result);
}

/**
 * Validate sign-up form data and return errors object
 * Compatible with existing form error state pattern
 */
export function validateSignUpWithZod(
  email: string,
  password: string,
  confirmPassword: string
): { email?: string; password?: string; confirmPassword?: string } {
  const result = signUpSchema.safeParse({ email, password, confirmPassword });
  return extractZodErrors(result);
}

/**
 * Validate forgot password form data and return errors object
 */
export function validateForgotPasswordWithZod(
  email: string
): { email?: string } {
  const result = forgotPasswordSchema.safeParse({ email });
  return extractZodErrors(result);
}

/**
 * Validate reset password form data and return errors object
 */
export function validateResetPasswordWithZod(
  password: string,
  confirmPassword: string
): { password?: string; confirmPassword?: string } {
  const result = resetPasswordSchema.safeParse({ password, confirmPassword });
  return extractZodErrors(result);
}

/**
 * Validate disc form data and return errors object
 */
export function validateDiscFormWithZod(
  data: Partial<DiscFormData>
): Record<string, string> {
  const result = discFormSchema.safeParse(data);
  return extractZodErrors(result);
}

/**
 * Validate shipping address and return errors object
 */
export function validateShippingAddressWithZod(
  data: Partial<ShippingAddressFormData>
): Record<string, string> {
  const result = shippingAddressSchema.safeParse(data);
  return extractZodErrors(result);
}
