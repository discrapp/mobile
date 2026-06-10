import React from 'react';
import { render, fireEvent } from '../../__tests__/test-utils';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  describe('with avatar URL', () => {
    it('should render an image when avatarUrl is provided', async () => {
      const { getByTestId, queryByText } = await render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" name="John Doe" />
      );

      // The Image component should be rendered
      // We check that initials are NOT shown when image is present
      expect(queryByText('JD')).toBeNull();
    });

    it('should fall back to initials when image fails to load', async () => {
      const { getByText, UNSAFE_getByType } = await render(
        <Avatar avatarUrl="https://example.com/bad-url.jpg" name="John Doe" />
      );

      // Find the expo-image Image component and trigger error
      const { Image } = require('expo-image');
      const image = UNSAFE_getByType(Image);
      fireEvent(image, 'error');

      // Now initials should be shown
      expect(getByText('JD')).toBeTruthy();
    });
  });

  describe('without avatar URL', () => {
    it('should show initials from full name', async () => {
      const { getByText } = await render(<Avatar name="John Doe" />);
      expect(getByText('JD')).toBeTruthy();
    });

    it('should show initials from single name', async () => {
      const { getByText } = await render(<Avatar name="John" />);
      expect(getByText('J')).toBeTruthy();
    });

    it('should show initials from @username format', async () => {
      const { getByText } = await render(<Avatar name="@johndoe" />);
      expect(getByText('J')).toBeTruthy();
    });

    it('should show ? when no name is provided', async () => {
      const { getByText } = await render(<Avatar />);
      expect(getByText('?')).toBeTruthy();
    });

    it('should show initials from multi-word name', async () => {
      const { getByText } = await render(<Avatar name="John Michael Doe" />);
      expect(getByText('JD')).toBeTruthy();
    });
  });

  describe('sizing', () => {
    it('should use default size of 40', async () => {
      const { UNSAFE_getByType } = await render(<Avatar name="John" />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);

      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 40,
            height: 40,
            borderRadius: 20,
          }),
        ])
      );
    });

    it('should use custom size when provided', async () => {
      const { UNSAFE_getByType } = await render(<Avatar name="John" size={60} />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);

      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 60,
            height: 60,
            borderRadius: 30,
          }),
        ])
      );
    });
  });

  describe('accessibility', () => {
    it('should have accessibilityRole of image when showing avatar URL', async () => {
      const { UNSAFE_getByType } = await render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" name="John Doe" />
      );
      const { Image } = require('expo-image');
      const image = UNSAFE_getByType(Image);
      expect(image.props.accessibilityRole).toBe('image');
    });

    it('should have accessibilityLabel with user name when showing avatar URL', async () => {
      const { UNSAFE_getByType } = await render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" name="John Doe" />
      );
      const { Image } = require('expo-image');
      const image = UNSAFE_getByType(Image);
      expect(image.props.accessibilityLabel).toBe("John Doe's avatar");
    });

    it('should have accessibilityLabel fallback when no name provided for avatar URL', async () => {
      const { UNSAFE_getByType } = await render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" />
      );
      const { Image } = require('expo-image');
      const image = UNSAFE_getByType(Image);
      expect(image.props.accessibilityLabel).toBe('User avatar');
    });

    it('should have accessibilityRole of image when showing initials', async () => {
      const { UNSAFE_getByType } = await render(<Avatar name="John Doe" />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityRole).toBe('image');
    });

    it('should have accessibilityLabel with user name when showing initials', async () => {
      const { UNSAFE_getByType } = await render(<Avatar name="John Doe" />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityLabel).toBe("John Doe's avatar");
    });

    it('should have accessibilityLabel fallback when showing initials without name', async () => {
      const { UNSAFE_getByType } = await render(<Avatar />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityLabel).toBe('User avatar');
    });
  });
});
