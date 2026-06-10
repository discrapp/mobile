import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View, useThemeColor } from '../Themed';
import { useColorScheme } from '../useColorScheme';
import Colors from '@/constants/Colors';

// Mock useColorScheme
jest.mock('../useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

const mockUseColorScheme = useColorScheme as jest.Mock;

describe('Themed Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text', () => {
    it('should render with light theme text color', async () => {
      mockUseColorScheme.mockReturnValue('light');
      const { getByText } = await render(<Text>Hello World</Text>);

      const textElement = getByText('Hello World');
      expect(textElement).toBeTruthy();
    });

    it('should render with dark theme text color', async () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { getByText } = await render(<Text>Hello World</Text>);

      const textElement = getByText('Hello World');
      expect(textElement).toBeTruthy();
    });

    it('should use custom lightColor when provided', async () => {
      mockUseColorScheme.mockReturnValue('light');
      const { getByText } = await render(
        <Text lightColor="#ff0000">Custom Light</Text>
      );

      const textElement = getByText('Custom Light');
      expect(textElement.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#ff0000' })])
      );
    });

    it('should use custom darkColor when in dark mode', async () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { getByText } = await render(
        <Text darkColor="#00ff00">Custom Dark</Text>
      );

      const textElement = getByText('Custom Dark');
      expect(textElement.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ color: '#00ff00' })])
      );
    });
  });

  describe('View', () => {
    it('should render with light theme background color', async () => {
      mockUseColorScheme.mockReturnValue('light');
      const { getByTestId } = await render(<View testID="themed-view" />);

      const viewElement = getByTestId('themed-view');
      expect(viewElement).toBeTruthy();
    });

    it('should render with dark theme background color', async () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { getByTestId } = await render(<View testID="themed-view" />);

      const viewElement = getByTestId('themed-view');
      expect(viewElement).toBeTruthy();
    });

    it('should use custom lightColor when provided', async () => {
      mockUseColorScheme.mockReturnValue('light');
      const { getByTestId } = await render(
        <View testID="themed-view" lightColor="#ff0000" />
      );

      const viewElement = getByTestId('themed-view');
      expect(viewElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#ff0000' }),
        ])
      );
    });

    it('should use custom darkColor when in dark mode', async () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { getByTestId } = await render(
        <View testID="themed-view" darkColor="#00ff00" />
      );

      const viewElement = getByTestId('themed-view');
      expect(viewElement.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#00ff00' }),
        ])
      );
    });
  });

  describe('useThemeColor', () => {
    it('should return color from props when available in light mode', async () => {
      mockUseColorScheme.mockReturnValue('light');

      // We need to create a component that uses the hook to test it
      let result: string;
      function TestComponent() {
        result = useThemeColor({ light: '#custom' }, 'text');
        return null;
      }

      render(<TestComponent />);
      expect(result!).toBe('#custom');
    });

    it('should return default theme color when props not provided', async () => {
      mockUseColorScheme.mockReturnValue('light');

      let result: string;
      function TestComponent() {
        result = useThemeColor({}, 'text');
        return null;
      }

      render(<TestComponent />);
      expect(result!).toBe(Colors.light.text);
    });

    it('should default to light theme when colorScheme is null', async () => {
      mockUseColorScheme.mockReturnValue(null);

      let result: string;
      function TestComponent() {
        result = useThemeColor({}, 'text');
        return null;
      }

      render(<TestComponent />);
      expect(result!).toBe(Colors.light.text);
    });
  });
});
