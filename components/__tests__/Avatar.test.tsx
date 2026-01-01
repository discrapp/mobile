import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  describe('with avatar URL', () => {
    it('should render an image when avatarUrl is provided', () => {
      const { getByTestId, queryByText } = render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" name="John Doe" />
      );

      // The Image component should be rendered
      // We check that initials are NOT shown when image is present
      expect(queryByText('JD')).toBeNull();
    });

    it('should fall back to initials when image fails to load', () => {
      const { getByText, UNSAFE_getByType } = render(
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
    it('should show initials from full name', () => {
      const { getByText } = render(<Avatar name="John Doe" />);
      expect(getByText('JD')).toBeTruthy();
    });

    it('should show initials from single name', () => {
      const { getByText } = render(<Avatar name="John" />);
      expect(getByText('J')).toBeTruthy();
    });

    it('should show initials from @username format', () => {
      const { getByText } = render(<Avatar name="@johndoe" />);
      expect(getByText('J')).toBeTruthy();
    });

    it('should show ? when no name is provided', () => {
      const { getByText } = render(<Avatar />);
      expect(getByText('?')).toBeTruthy();
    });

    it('should show initials from multi-word name', () => {
      const { getByText } = render(<Avatar name="John Michael Doe" />);
      expect(getByText('JD')).toBeTruthy();
    });
  });

  describe('sizing', () => {
    it('should use default size of 40', () => {
      const { UNSAFE_getByType } = render(<Avatar name="John" />);
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

    it('should use custom size when provided', () => {
      const { UNSAFE_getByType } = render(<Avatar name="John" size={60} />);
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
    it('should have accessibilityRole of image when showing avatar URL', () => {
      const { UNSAFE_getByType } = render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" name="John Doe" />
      );
      const { Image } = require('expo-image');
      const image = UNSAFE_getByType(Image);
      expect(image.props.accessibilityRole).toBe('image');
    });

    it('should have accessibilityLabel with user name when showing avatar URL', () => {
      const { UNSAFE_getByType } = render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" name="John Doe" />
      );
      const { Image } = require('expo-image');
      const image = UNSAFE_getByType(Image);
      expect(image.props.accessibilityLabel).toBe("John Doe's avatar");
    });

    it('should have accessibilityLabel fallback when no name provided for avatar URL', () => {
      const { UNSAFE_getByType } = render(
        <Avatar avatarUrl="https://example.com/avatar.jpg" />
      );
      const { Image } = require('expo-image');
      const image = UNSAFE_getByType(Image);
      expect(image.props.accessibilityLabel).toBe('User avatar');
    });

    it('should have accessibilityRole of image when showing initials', () => {
      const { UNSAFE_getByType } = render(<Avatar name="John Doe" />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityRole).toBe('image');
    });

    it('should have accessibilityLabel with user name when showing initials', () => {
      const { UNSAFE_getByType } = render(<Avatar name="John Doe" />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityLabel).toBe("John Doe's avatar");
    });

    it('should have accessibilityLabel fallback when showing initials without name', () => {
      const { UNSAFE_getByType } = render(<Avatar />);
      const View = require('react-native').View;
      const container = UNSAFE_getByType(View);
      expect(container.props.accessibilityLabel).toBe('User avatar');
    });
  });
});
