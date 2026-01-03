const violetPrimary = '#3b1877';
const violetLight = '#5c2d91';
const violetDark = '#2d1159';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: violetPrimary,
    tabIconDefault: '#ccc',
    tabIconSelected: violetPrimary,
  },
  dark: {
    text: '#fff',
    background: '#121212',
    tint: violetLight,
    tabIconDefault: '#ccc',
    tabIconSelected: violetLight,
  },
  // Dark mode surface colors (for cards, inputs, etc.)
  darkSurface: {
    background: '#121212',    // Main background
    card: '#1e1e1e',          // Cards, modals
    elevated: '#252525',      // Elevated surfaces, inputs
    border: '#2e2e2e',        // Borders, dividers
  },
  violet: {
    primary: violetPrimary,
    light: violetLight,
    dark: violetDark,
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
};
