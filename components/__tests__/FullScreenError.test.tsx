import React from 'react';
import { render } from '../../__tests__/test-utils';
import { FullScreenError } from '../FullScreenError';

describe('FullScreenError', () => {
  describe('rendering', () => {
    it('should render default message when no message provided', async () => {
      const { getByText } = await render(<FullScreenError />);
      expect(getByText('Oops!')).toBeTruthy();
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });

    it('should render custom message when provided', async () => {
      const { getByText } = await render(
        <FullScreenError message="Custom error message" />
      );
      expect(getByText('Custom error message')).toBeTruthy();
    });

    it('should render retry button when onRetry is provided', async () => {
      const { getByText } = await render(<FullScreenError onRetry={jest.fn()} />);
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should render custom retry label', async () => {
      const { getByText } = await render(
        <FullScreenError onRetry={jest.fn()} retryLabel="Retry Now" />
      );
      expect(getByText('Retry Now')).toBeTruthy();
    });

    it('should not render retry button when onRetry is not provided', async () => {
      const { queryByText } = await render(<FullScreenError />);
      expect(queryByText('Try Again')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have accessibilityRole of alert for the container', async () => {
      const { UNSAFE_getByType } = await render(<FullScreenError />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('should have accessibilityLabel describing the error state', async () => {
      const { getByLabelText } = await render(<FullScreenError />);
      const container = getByLabelText(
        'An error occurred. Something went wrong. Please try again.'
      );
      expect(container).toBeTruthy();
    });

    it('should have accessibilityLabel with custom message', async () => {
      const { getByLabelText } = await render(
        <FullScreenError message="Network connection failed" />
      );
      const container = getByLabelText(
        'An error occurred. Network connection failed'
      );
      expect(container).toBeTruthy();
    });

    it('should have accessibilityRole of button for retry button', async () => {
      const { getByRole } = await render(<FullScreenError onRetry={jest.fn()} />);
      const buttons = getByRole('button');
      expect(buttons).toBeTruthy();
    });

    it('should have accessibilityLabel for retry button', async () => {
      const { getByLabelText } = await render(
        <FullScreenError onRetry={jest.fn()} retryLabel="Retry Now" />
      );
      const retryButton = getByLabelText('Retry Now');
      expect(retryButton).toBeTruthy();
    });

    it('should have accessibilityHint for retry button', async () => {
      const { getByHintText } = await render(<FullScreenError onRetry={jest.fn()} />);
      const retryButton = getByHintText('Attempts to recover from the error');
      expect(retryButton).toBeTruthy();
    });
  });
});
