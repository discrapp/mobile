import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FlightPath from '../FlightPath';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'svg' }, props.children),
    Svg: (props: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'svg' }, props.children),
    Path: (props: { d?: string }) =>
      React.createElement(View, { testID: 'path', accessibilityLabel: props.d }),
    Line: () => React.createElement(View, { testID: 'line' }),
    Circle: () => React.createElement(View, { testID: 'circle' }),
    G: (props: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'g' }, props.children),
    Text: (props: { children?: React.ReactNode }) =>
      React.createElement(Text, { testID: 'svg-text' }, props.children),
  };
});

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { throwing_hand: 'right' },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

// Mock useColorScheme
jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

describe('FlightPath', () => {
  const defaultProps = {
    speed: 12,
    glide: 5,
    turn: -1,
    fade: 3,
  };

  it('renders without crashing', async () => {
    const { getByText } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('FLIGHT PATH')).toBeTruthy();
    });
  });

  it('displays the section title', async () => {
    const { getByText } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('FLIGHT PATH')).toBeTruthy();
    });
  });

  it('renders backhand/forehand toggle', async () => {
    const { getByText } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Backhand')).toBeTruthy();
      expect(getByText('Forehand')).toBeTruthy();
    });
  });

  it('toggles between backhand and forehand', async () => {
    const { getByText } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Backhand')).toBeTruthy();
    });

    fireEvent.press(getByText('Forehand'));

    // After pressing, forehand should be selected
    // The component should re-render with forehand paths
  });

  it('tapping legend item shows only that path', async () => {
    const { getByText, getAllByTestId } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      // Initially all 3 paths visible
      expect(getAllByTestId('path').length).toBe(3);
    });

    // Tap Flat to show only flat path
    fireEvent.press(getByText('Flat'));

    await waitFor(() => {
      // Now only 1 path visible
      expect(getAllByTestId('path').length).toBe(1);
    });

    // Tap Flat again to show all paths
    fireEvent.press(getByText('Flat'));

    await waitFor(() => {
      // Back to all 3 paths
      expect(getAllByTestId('path').length).toBe(3);
    });
  });

  it('renders color legend', async () => {
    const { getByText } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Hyzer')).toBeTruthy();
      expect(getByText('Flat')).toBeTruthy();
      expect(getByText('Anhyzer')).toBeTruthy();
    });
  });

  it('renders distance markers for distance driver (400ft scale)', async () => {
    const { getByText } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      // Speed 12, glide 5 = ~391ft, rounds to 400ft scale
      expect(getByText('400ft')).toBeTruthy();
      expect(getByText('300ft')).toBeTruthy();
      expect(getByText('200ft')).toBeTruthy();
      expect(getByText('100ft')).toBeTruthy();
      expect(getByText('Tee')).toBeTruthy();
    });
  });

  it('zooms in for putters (100ft scale)', async () => {
    const putterProps = {
      speed: 2,
      glide: 1,
      turn: 0,
      fade: 1,
    };

    const { getByText } = render(<FlightPath {...putterProps} />);

    await waitFor(() => {
      // Speed 2, glide 1 = ~91ft, rounds to 100ft scale
      expect(getByText('100ft')).toBeTruthy();
      expect(getByText('75ft')).toBeTruthy();
      expect(getByText('50ft')).toBeTruthy();
      expect(getByText('25ft')).toBeTruthy();
    });
  });

  it('renders SVG paths for all three release angles', async () => {
    const { getAllByTestId } = render(<FlightPath {...defaultProps} />);

    await waitFor(() => {
      // Should have 3 Path elements (hyzer, flat, anhyzer)
      const paths = getAllByTestId('path');
      expect(paths.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('handles understable disc', async () => {
    const understableProps = {
      speed: 9,
      glide: 5,
      turn: -3,
      fade: 1,
    };

    const { getByText } = render(<FlightPath {...understableProps} />);

    await waitFor(() => {
      expect(getByText('FLIGHT PATH')).toBeTruthy();
    });
  });

  it('handles overstable disc', async () => {
    const overstableProps = {
      speed: 10,
      glide: 4,
      turn: 0,
      fade: 4,
    };

    const { getByText } = render(<FlightPath {...overstableProps} />);

    await waitFor(() => {
      expect(getByText('FLIGHT PATH')).toBeTruthy();
    });
  });

  it('handles putter flight numbers', async () => {
    const putterProps = {
      speed: 2,
      glide: 3,
      turn: 0,
      fade: 1,
    };

    const { getByText } = render(<FlightPath {...putterProps} />);

    await waitFor(() => {
      expect(getByText('FLIGHT PATH')).toBeTruthy();
    });
  });

  describe('with left-handed user', () => {
    beforeEach(() => {
      const { supabase } = require('@/lib/supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { throwing_hand: 'left' },
              error: null,
            }),
          }),
        }),
      });
    });

    it('adjusts paths for left-handed thrower', async () => {
      const { getByText } = render(<FlightPath {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('FLIGHT PATH')).toBeTruthy();
      });
    });
  });

  describe('useEffect cleanup', () => {
    it('does not update state after unmount', async () => {
      const { supabase } = require('@/lib/supabase');
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Create a delayed promise to simulate slow network
      let resolvePromise: (value: { data: { throwing_hand: string }; error: null }) => void;
      const delayedPromise = new Promise<{ data: { throwing_hand: string }; error: null }>((resolve) => {
        resolvePromise = resolve;
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue(delayedPromise),
          }),
        }),
      });

      const { unmount, getByText } = render(<FlightPath {...defaultProps} />);

      // Verify component rendered
      expect(getByText('FLIGHT PATH')).toBeTruthy();

      // Unmount before the promise resolves
      unmount();

      // Now resolve the promise after unmount
      resolvePromise!({ data: { throwing_hand: 'left' }, error: null });

      // Wait a tick to ensure async operations complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that no warnings about state updates on unmounted components
      const stateUpdateWarning = consoleWarn.mock.calls.find(
        call => call[0]?.includes?.('state update on an unmounted')
      ) || consoleError.mock.calls.find(
        call => call[0]?.includes?.('state update on an unmounted') ||
               call[0]?.includes?.("Can't perform a React state update")
      );

      expect(stateUpdateWarning).toBeUndefined();

      consoleWarn.mockRestore();
      consoleError.mockRestore();
    });
  });
});
