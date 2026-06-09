import {
  validatePostalCode,
  validateStateCode,
  validateShippingAddress,
  isValidShippingAddress,
  ShippingAddress,
} from '@/lib/validation';

describe('Address Validation', async () => {
  describe('validatePostalCode', async () => {
    it('returns null for valid 5-digit ZIP code', async () => {
      expect(validatePostalCode('12345')).toBeNull();
      expect(validatePostalCode('90210')).toBeNull();
      expect(validatePostalCode('00000')).toBeNull();
    });

    it('returns null for valid ZIP+4 format', async () => {
      expect(validatePostalCode('12345-6789')).toBeNull();
      expect(validatePostalCode('90210-1234')).toBeNull();
    });

    it('trims whitespace', async () => {
      expect(validatePostalCode('  12345  ')).toBeNull();
      expect(validatePostalCode(' 12345-6789 ')).toBeNull();
    });

    it('returns error for empty string', async () => {
      expect(validatePostalCode('')).toBe('ZIP code is required');
      expect(validatePostalCode('   ')).toBe('ZIP code is required');
    });

    it('returns error for invalid format', async () => {
      expect(validatePostalCode('1234')).toBe(
        'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'
      );
      expect(validatePostalCode('123456')).toBe(
        'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'
      );
      expect(validatePostalCode('12345-678')).toBe(
        'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'
      );
      expect(validatePostalCode('1234-56789')).toBe(
        'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'
      );
      expect(validatePostalCode('ABCDE')).toBe(
        'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)'
      );
    });
  });

  describe('validateStateCode', async () => {
    it('returns null for valid state codes', async () => {
      expect(validateStateCode('CA')).toBeNull();
      expect(validateStateCode('NY')).toBeNull();
      expect(validateStateCode('TX')).toBeNull();
      expect(validateStateCode('FL')).toBeNull();
    });

    it('is case insensitive', async () => {
      expect(validateStateCode('ca')).toBeNull();
      expect(validateStateCode('Ca')).toBeNull();
      expect(validateStateCode('ny')).toBeNull();
    });

    it('trims whitespace', async () => {
      expect(validateStateCode('  CA  ')).toBeNull();
    });

    it('returns null for US territories', async () => {
      expect(validateStateCode('DC')).toBeNull();
      expect(validateStateCode('PR')).toBeNull();
      expect(validateStateCode('VI')).toBeNull();
      expect(validateStateCode('GU')).toBeNull();
    });

    it('returns error for empty string', async () => {
      expect(validateStateCode('')).toBe('State is required');
      expect(validateStateCode('   ')).toBe('State is required');
    });

    it('returns error for wrong length', async () => {
      expect(validateStateCode('C')).toBe('State must be a 2-letter code (e.g., CA)');
      expect(validateStateCode('CAL')).toBe('State must be a 2-letter code (e.g., CA)');
      expect(validateStateCode('California')).toBe('State must be a 2-letter code (e.g., CA)');
    });

    it('returns error for invalid state codes', async () => {
      expect(validateStateCode('XX')).toBe('Please enter a valid US state code');
      expect(validateStateCode('ZZ')).toBe('Please enter a valid US state code');
      expect(validateStateCode('AB')).toBe('Please enter a valid US state code'); // Canadian province
    });
  });

  describe('validateShippingAddress', async () => {
    const validAddress: ShippingAddress = {
      name: 'John Doe',
      street_address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      postal_code: '90210',
    };

    it('returns empty object for valid address', async () => {
      expect(validateShippingAddress(validAddress)).toEqual({});
    });

    it('accepts optional street_address_2', async () => {
      const addressWithLine2 = { ...validAddress, street_address_2: 'Apt 4B' };
      expect(validateShippingAddress(addressWithLine2)).toEqual({});
    });

    it('validates required name', async () => {
      const address = { ...validAddress, name: '' };
      expect(validateShippingAddress(address)).toEqual({
        name: 'Name is required',
      });
    });

    it('validates name length', async () => {
      const address = { ...validAddress, name: 'A'.repeat(101) };
      expect(validateShippingAddress(address)).toEqual({
        name: 'Name is too long (max 100 characters)',
      });
    });

    it('validates required street_address', async () => {
      const address = { ...validAddress, street_address: '' };
      expect(validateShippingAddress(address)).toEqual({
        street_address: 'Street address is required',
      });
    });

    it('validates street_address length', async () => {
      const address = { ...validAddress, street_address: 'A'.repeat(101) };
      expect(validateShippingAddress(address)).toEqual({
        street_address: 'Street address is too long (max 100 characters)',
      });
    });

    it('validates street_address_2 length', async () => {
      const address = { ...validAddress, street_address_2: 'A'.repeat(101) };
      expect(validateShippingAddress(address)).toEqual({
        street_address_2: 'Address line 2 is too long (max 100 characters)',
      });
    });

    it('validates required city', async () => {
      const address = { ...validAddress, city: '' };
      expect(validateShippingAddress(address)).toEqual({
        city: 'City is required',
      });
    });

    it('validates city length', async () => {
      const address = { ...validAddress, city: 'A'.repeat(51) };
      expect(validateShippingAddress(address)).toEqual({
        city: 'City name is too long (max 50 characters)',
      });
    });

    it('validates state code', async () => {
      const address = { ...validAddress, state: 'XX' };
      expect(validateShippingAddress(address)).toEqual({
        state: 'Please enter a valid US state code',
      });
    });

    it('validates postal_code', async () => {
      const address = { ...validAddress, postal_code: '1234' };
      expect(validateShippingAddress(address)).toEqual({
        postal_code: 'ZIP code must be 5 digits (12345) or ZIP+4 format (12345-6789)',
      });
    });

    it('returns multiple errors for multiple invalid fields', async () => {
      const address: ShippingAddress = {
        name: '',
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
      };
      const errors = validateShippingAddress(address);
      expect(Object.keys(errors)).toHaveLength(5);
      expect(errors.name).toBe('Name is required');
      expect(errors.street_address).toBe('Street address is required');
      expect(errors.city).toBe('City is required');
      expect(errors.state).toBe('State is required');
      expect(errors.postal_code).toBe('ZIP code is required');
    });
  });

  describe('isValidShippingAddress', async () => {
    it('returns true for valid address', async () => {
      const address: ShippingAddress = {
        name: 'John Doe',
        street_address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        postal_code: '90210',
      };
      expect(isValidShippingAddress(address)).toBe(true);
    });

    it('returns false for invalid address', async () => {
      const address: ShippingAddress = {
        name: '',
        street_address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        postal_code: '90210',
      };
      expect(isValidShippingAddress(address)).toBe(false);
    });
  });
});
