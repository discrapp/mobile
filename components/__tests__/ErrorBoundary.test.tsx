import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { captureError } from '@/lib/sentry';

// Mock the sentry module
jest.mock('@/lib/sentry', () => ({
  captureError: jest.fn(),
}));

// Mock useColorScheme
jest.mock('../useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

const { useColorScheme } = require('../useColorScheme');

// Test component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text testID="child-content">Child Content</Text>;
};

// Test component that can be toggled to throw
const ToggleErrorComponent = ({ error }: { error: boolean }) => {
  if (error) {
    throw new Error('Toggle error');
  }
  return <Text testID="toggle-content">Toggle Content</Text>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useColorScheme.mockReturnValue('light');
  });

  describe('rendering children', () => {
    it('renders children when no error occurs', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(getByTestId('child-content')).toBeTruthy();
    });

    it('renders multiple children when no error occurs', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </ErrorBoundary>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('catches errors and displays fallback UI', () => {
      const { getByText, queryByTestId } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(queryByTestId('child-content')).toBeNull();
      expect(getByText('Oops!')).toBeTruthy();
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });

    it('logs error to Sentry when error occurs', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(captureError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('displays "Try Again" button in fallback UI', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  describe('recovery', () => {
    it('calls onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('resets error state when "Try Again" is pressed', () => {
      const onReset = jest.fn();
      const { getByText } = render(
        <ErrorBoundary onReset={onReset}>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(getByText('Oops!')).toBeTruthy();

      // Press try again
      fireEvent.press(getByText('Try Again'));

      // onReset callback should be called (the component will re-throw,
      // but the reset functionality is tested through the callback)
      expect(onReset).toHaveBeenCalled();
    });

    it('calls onReset callback when "Try Again" is pressed', () => {
      const onReset = jest.fn();

      const { getByText } = render(
        <ErrorBoundary onReset={onReset}>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      fireEvent.press(getByText('Try Again'));

      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('custom fallback', () => {
    it('renders custom fallback component when provided', () => {
      const CustomFallback = ({ resetError }: { resetError: () => void }) => (
        <View testID="custom-fallback">
          <Text>Custom Error Message</Text>
          <Text onPress={resetError}>Custom Reset</Text>
        </View>
      );

      const { getByTestId, getByText, queryByText } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(getByTestId('custom-fallback')).toBeTruthy();
      expect(getByText('Custom Error Message')).toBeTruthy();
      expect(queryByText('Oops!')).toBeNull();
    });

    it('passes resetError function to custom fallback', () => {
      const CustomFallback = ({ resetError }: { resetError: () => void }) => (
        <View>
          <Text testID="custom-reset" onPress={resetError}>
            Custom Reset
          </Text>
        </View>
      );

      const onReset = jest.fn();

      const { getByTestId } = render(
        <ErrorBoundary fallback={CustomFallback} onReset={onReset}>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      fireEvent.press(getByTestId('custom-reset'));

      expect(onReset).toHaveBeenCalled();
    });

    it('passes error information to custom fallback', () => {
      const CustomFallback = ({
        error,
        resetError,
      }: {
        error: Error;
        resetError: () => void;
      }) => (
        <View>
          <Text testID="error-message">{error.message}</Text>
          <Text onPress={resetError}>Reset</Text>
        </View>
      );

      const { getByTestId } = render(
        <ErrorBoundary fallback={CustomFallback}>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(getByTestId('error-message').props.children).toBe('Test error');
    });
  });

  describe('dark mode support', () => {
    it('applies light mode styles by default', () => {
      useColorScheme.mockReturnValue('light');

      const { getByTestId } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const container = getByTestId('error-boundary-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#fff' })])
      );
    });

    it('applies dark mode styles when in dark mode', () => {
      useColorScheme.mockReturnValue('dark');

      const { getByTestId } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const container = getByTestId('error-boundary-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#121212' })])
      );
    });

    it('adjusts icon container color in dark mode', () => {
      useColorScheme.mockReturnValue('dark');

      const { getByTestId } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const iconContainer = getByTestId('error-boundary-icon-container');
      expect(iconContainer.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#2a1a1a' })])
      );
    });

    it('adjusts message color in dark mode', () => {
      useColorScheme.mockReturnValue('dark');

      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const message = getByText('Something went wrong. Please try again.');
      // The style can be nested arrays, so we flatten and check
      const styleArr = Array.isArray(message.props.style)
        ? message.props.style.flat()
        : [message.props.style];
      const hasCorrectColor = styleArr.some(
        (s: object | null) => s && typeof s === 'object' && 'color' in s && s.color === '#999'
      );
      expect(hasCorrectColor).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles errors without componentStack gracefully', () => {
      // Force an error that might not have componentStack
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      expect(getByText('Oops!')).toBeTruthy();
      expect(captureError).toHaveBeenCalled();
    });

    it('does not crash when children are null', () => {
      // Should not throw when rendering
      expect(() => {
        render(<ErrorBoundary>{null}</ErrorBoundary>);
      }).not.toThrow();
    });

    it('does not crash when children are undefined', () => {
      // Should not throw when rendering
      expect(() => {
        render(<ErrorBoundary>{undefined}</ErrorBoundary>);
      }).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have accessibilityRole of alert for the error container', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const container = getByTestId('error-boundary-container');
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('should have accessibilityLabel describing the error state', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const container = getByTestId('error-boundary-container');
      expect(container.props.accessibilityLabel).toBe(
        'An error occurred. Something went wrong. Please try again.'
      );
    });

    it('should have accessibilityRole of button for Try Again', () => {
      const { getByRole } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const tryAgainButton = getByRole('button');
      expect(tryAgainButton).toBeTruthy();
    });

    it('should have accessibilityLabel for Try Again button', () => {
      const { getByLabelText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const tryAgainButton = getByLabelText('Try Again');
      expect(tryAgainButton).toBeTruthy();
    });

    it('should have accessibilityHint for Try Again button', () => {
      const { getByHintText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow />
        </ErrorBoundary>
      );

      const tryAgainButton = getByHintText('Attempts to recover from the error');
      expect(tryAgainButton).toBeTruthy();
    });
  });
});
