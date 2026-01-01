import React from 'react';
import { render } from '@testing-library/react-native';
import { FullScreenError } from '../FullScreenError';

describe('FullScreenError', () => {
  describe('rendering', () => {
    it('should render default message when no message provided', () => {
      const { getByText } = render(<FullScreenError />);
      expect(getByText('Oops!')).toBeTruthy();
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });

    it('should render custom message when provided', () => {
      const { getByText } = render(
        <FullScreenError message="Custom error message" />
      );
      expect(getByText('Custom error message')).toBeTruthy();
    });

    it('should render retry button when onRetry is provided', () => {
      const { getByText } = render(
        <FullScreenError onRetry={jest.fn()} />
      );
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should render custom retry label', () => {
      const { getByText } = render(
        <FullScreenError onRetry={jest.fn()} retryLabel="Retry Now" />
      );
      expect(getByText('Retry Now')).toBeTruthy();
    });

    it('should not render retry button when onRetry is not provided', () => {
      const { queryByText } = render(<FullScreenError />);
      expect(queryByText('Try Again')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have accessibilityRole of alert for the container', () => {
      const { UNSAFE_getByType } = render(<FullScreenError />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('should have accessibilityLabel describing the error state', () => {
      const { getByLabelText } = render(<FullScreenError />);
      const container = getByLabelText(
        'An error occurred. Something went wrong. Please try again.'
      );
      expect(container).toBeTruthy();
    });

    it('should have accessibilityLabel with custom message', () => {
      const { getByLabelText } = render(
        <FullScreenError message="Network connection failed" />
      );
      const container = getByLabelText(
        'An error occurred. Network connection failed'
      );
      expect(container).toBeTruthy();
    });

    it('should have accessibilityRole of button for retry button', () => {
      const { getByRole } = render(
        <FullScreenError onRetry={jest.fn()} />
      );
      const buttons = getByRole('button');
      expect(buttons).toBeTruthy();
    });

    it('should have accessibilityLabel for retry button', () => {
      const { getByLabelText } = render(
        <FullScreenError onRetry={jest.fn()} retryLabel="Retry Now" />
      );
      const retryButton = getByLabelText('Retry Now');
      expect(retryButton).toBeTruthy();
    });

    it('should have accessibilityHint for retry button', () => {
      const { getByHintText } = render(
        <FullScreenError onRetry={jest.fn()} />
      );
      const retryButton = getByHintText('Attempts to recover from the error');
      expect(retryButton).toBeTruthy();
    });
  });
});
