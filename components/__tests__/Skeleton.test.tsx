import React from 'react';
import { render } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import {
  Skeleton,
  DiscCardSkeleton,
  DiscDetailSkeleton,
  FormFieldSkeleton,
  RecoveryCardSkeleton,
  OrderCardSkeleton,
  ProfileHeaderSkeleton,
} from '../Skeleton';

// Spy on useColorScheme instead of mocking entire react-native module
let mockColorScheme: ReactNative.ColorSchemeName = 'light';
jest.spyOn(ReactNative, 'useColorScheme').mockImplementation(() => mockColorScheme);

describe('Skeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'light';
  });

  describe('base Skeleton component', () => {
    it('should render with default props', () => {
      const { UNSAFE_getByType } = render(<Skeleton />);
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      expect(skeleton).toBeTruthy();
      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '100%',
            height: 20,
            borderRadius: 4,
          }),
        ])
      );
    });

    it('should render with custom width and height', () => {
      const { UNSAFE_getByType } = render(
        <Skeleton width={200} height={40} />
      );
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 200,
            height: 40,
          }),
        ])
      );
    });

    it('should render with string width (percentage)', () => {
      const { UNSAFE_getByType } = render(<Skeleton width="50%" />);
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '50%',
          }),
        ])
      );
    });

    it('should render with custom borderRadius', () => {
      const { UNSAFE_getByType } = render(<Skeleton borderRadius={12} />);
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderRadius: 12,
          }),
        ])
      );
    });

    it('should apply custom style prop', () => {
      const customStyle = { marginTop: 10 };
      const { UNSAFE_getByType } = render(<Skeleton style={customStyle} />);
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customStyle)])
      );
    });

    it('should use light mode colors when colorScheme is light', () => {
      mockColorScheme = 'light';
      const { UNSAFE_getByType } = render(<Skeleton />);
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#e0e0e0',
          }),
        ])
      );
    });

    it('should use dark mode colors when colorScheme is dark', () => {
      mockColorScheme = 'dark';
      const { UNSAFE_getByType } = render(<Skeleton />);
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#333',
          }),
        ])
      );
    });
  });

  describe('DiscCardSkeleton', () => {
    it('should render in light mode', () => {
      mockColorScheme = 'light';
      const { UNSAFE_getAllByType } = render(<DiscCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Should have the card container with white background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#fff' })])
      );
    });

    it('should render in dark mode', () => {
      mockColorScheme = 'dark';
      const { UNSAFE_getAllByType } = render(<DiscCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Should have the card container with dark background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#1e1e1e' })])
      );
    });

    it('should render multiple skeleton elements for card structure', () => {
      const { UNSAFE_getAllByType } = render(<DiscCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Should have: card container, photo placeholder, content container,
      // title, subtitle, flight numbers
      expect(views.length).toBeGreaterThan(3);
    });
  });

  describe('DiscDetailSkeleton', () => {
    it('should render in light mode', () => {
      mockColorScheme = 'light';
      const { UNSAFE_getAllByType } = render(<DiscDetailSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Flight numbers card should have light background
      const flightCard = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) => s?.backgroundColor === '#f5f5f5')
      );
      expect(flightCard).toBeTruthy();
    });

    it('should render in dark mode', () => {
      mockColorScheme = 'dark';
      const { UNSAFE_getAllByType } = render(<DiscDetailSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Flight numbers card should have dark background
      const flightCard = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) => s?.backgroundColor === '#1e1e1e')
      );
      expect(flightCard).toBeTruthy();
    });

    it('should render 4 flight number placeholders', () => {
      const { UNSAFE_getAllByType } = render(<DiscDetailSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Find views that are flight number items (have alignItems: 'center')
      const flightNumberItems = views.filter((v) =>
        v.props.style?.alignItems === 'center'
      );
      expect(flightNumberItems.length).toBe(4);
    });
  });

  describe('FormFieldSkeleton', () => {
    it('should render with label by default', () => {
      const { UNSAFE_getAllByType } = render(<FormFieldSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Should have container, label skeleton, and input skeleton
      expect(views.length).toBeGreaterThanOrEqual(3);
    });

    it('should render without label when label prop is false', () => {
      const { UNSAFE_getAllByType } = render(<FormFieldSkeleton label={false} />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Should have fewer elements without label
      // Container + input skeleton only
      expect(views.length).toBe(2);
    });

    it('should render input skeleton with correct dimensions', () => {
      const { UNSAFE_getAllByType } = render(<FormFieldSkeleton label={false} />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // The input skeleton should have height 48 and borderRadius 8
      const inputSkeleton = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) => s?.height === 48 && s?.borderRadius === 8)
      );
      expect(inputSkeleton).toBeTruthy();
    });
  });

  describe('RecoveryCardSkeleton', () => {
    it('should render in light mode', () => {
      mockColorScheme = 'light';
      const { UNSAFE_getAllByType } = render(<RecoveryCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Card should have white background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#fff' })])
      );
    });

    it('should render in dark mode', () => {
      mockColorScheme = 'dark';
      const { UNSAFE_getAllByType } = render(<RecoveryCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Card should have dark background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#1e1e1e' })])
      );
    });

    it('should render circular avatar placeholder', () => {
      const { UNSAFE_getAllByType } = render(<RecoveryCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Find the circular avatar skeleton (50x50, borderRadius 25)
      const avatarSkeleton = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) =>
          s?.width === 50 && s?.height === 50 && s?.borderRadius === 25
        )
      );
      expect(avatarSkeleton).toBeTruthy();
    });
  });

  describe('OrderCardSkeleton', () => {
    it('should render in light mode', () => {
      mockColorScheme = 'light';
      const { UNSAFE_getAllByType } = render(<OrderCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Card should have white background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#fff' })])
      );
    });

    it('should render in dark mode', () => {
      mockColorScheme = 'dark';
      const { UNSAFE_getAllByType } = render(<OrderCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Card should have dark background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#1e1e1e' })])
      );
    });

    it('should render divider with appropriate color', () => {
      mockColorScheme = 'light';
      const { UNSAFE_getAllByType } = render(<OrderCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Find the divider (height: 1)
      const divider = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) => s?.height === 1)
      );
      expect(divider).toBeTruthy();
      expect(divider.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#eee' })])
      );
    });

    it('should render divider with dark color in dark mode', () => {
      mockColorScheme = 'dark';
      const { UNSAFE_getAllByType } = render(<OrderCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Find the divider (height: 1)
      const divider = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) => s?.height === 1)
      );
      expect(divider).toBeTruthy();
      expect(divider.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#333' })])
      );
    });

    it('should render status badge skeleton with rounded corners', () => {
      const { UNSAFE_getAllByType } = render(<OrderCardSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Find the status badge skeleton (width 100, height 24, borderRadius 12)
      const badgeSkeleton = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) =>
          s?.width === 100 && s?.height === 24 && s?.borderRadius === 12
        )
      );
      expect(badgeSkeleton).toBeTruthy();
    });
  });

  describe('ProfileHeaderSkeleton', () => {
    it('should render in light mode', () => {
      mockColorScheme = 'light';
      const { UNSAFE_getAllByType } = render(<ProfileHeaderSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Header should have light gray background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#f8f8f8' })])
      );
    });

    it('should render in dark mode', () => {
      mockColorScheme = 'dark';
      const { UNSAFE_getAllByType } = render(<ProfileHeaderSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Header should have dark background
      expect(views[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#1e1e1e' })])
      );
    });

    it('should render large circular avatar placeholder', () => {
      const { UNSAFE_getAllByType } = render(<ProfileHeaderSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Find the avatar skeleton (100x100, borderRadius 50)
      const avatarSkeleton = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) =>
          s?.width === 100 && s?.height === 100 && s?.borderRadius === 50
        )
      );
      expect(avatarSkeleton).toBeTruthy();
    });

    it('should render name and email placeholders', () => {
      const { UNSAFE_getAllByType } = render(<ProfileHeaderSkeleton />);
      const { Animated } = require('react-native');
      const views = UNSAFE_getAllByType(Animated.View);

      // Find the name skeleton (width 150, height 24)
      const nameSkeleton = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) => s?.width === 150 && s?.height === 24)
      );
      expect(nameSkeleton).toBeTruthy();

      // Find the email skeleton (width 200, height 16)
      const emailSkeleton = views.find((v) =>
        v.props.style?.some?.((s: Record<string, unknown>) => s?.width === 200 && s?.height === 16)
      );
      expect(emailSkeleton).toBeTruthy();
    });
  });

  describe('animation behavior', () => {
    it('should start animation on mount', () => {
      const mockLoop = jest.fn().mockReturnValue({
        start: jest.fn(),
        stop: jest.fn(),
      });

      const { Animated } = require('react-native');
      const originalLoop = Animated.loop;
      Animated.loop = mockLoop;

      render(<Skeleton />);

      // Animation loop should be created
      expect(mockLoop).toHaveBeenCalled();

      Animated.loop = originalLoop;
    });

    it('should clean up animation on unmount', () => {
      const mockStop = jest.fn();
      const mockLoop = jest.fn().mockReturnValue({
        start: jest.fn(),
        stop: mockStop,
      });

      const { Animated } = require('react-native');
      const originalLoop = Animated.loop;
      Animated.loop = mockLoop;

      const { unmount } = render(<Skeleton />);
      unmount();

      // Animation should be stopped on unmount
      expect(mockStop).toHaveBeenCalled();

      Animated.loop = originalLoop;
    });
  });

  describe('null colorScheme handling', () => {
    it('should default to light mode when colorScheme is null', () => {
      mockColorScheme = null;
      const { UNSAFE_getByType } = render(<Skeleton />);
      const { Animated } = require('react-native');
      const skeleton = UNSAFE_getByType(Animated.View);

      // Should use light mode color (not dark)
      expect(skeleton.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#e0e0e0',
          }),
        ])
      );
    });
  });
});
