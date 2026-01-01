/**
 * Centralized disc color constants for the Discr mobile app.
 *
 * This file contains the color mapping for disc colors used throughout the app.
 * Benefits:
 * - Single source of truth for disc color hex values
 * - Type-safe color name access
 * - Consistent color display across all screens
 *
 * Usage:
 * ```typescript
 * import { DISC_COLORS, DiscColorName } from '@/constants/discColors';
 *
 * // Use with a known color
 * const redHex = DISC_COLORS.Red; // '#E74C3C'
 *
 * // Use with a dynamic color name
 * const color: DiscColorName = 'Blue';
 * const hex = DISC_COLORS[color]; // '#3498DB'
 *
 * // Check for rainbow/multi color
 * if (DISC_COLORS[color] === 'rainbow') {
 *   // Render gradient
 * }
 * ```
 */

/**
 * Valid disc color names
 */
export type DiscColorName =
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'Green'
  | 'Blue'
  | 'Purple'
  | 'Pink'
  | 'White'
  | 'Black'
  | 'Gray'
  | 'Multi';

/**
 * Mapping of disc color names to their hex values.
 * 'Multi' maps to 'rainbow' which indicates a gradient should be used.
 */
const _DISC_COLORS: Record<DiscColorName, string> = {
  Red: '#E74C3C',
  Orange: '#E67E22',
  Yellow: '#F1C40F',
  Green: '#2ECC71',
  Blue: '#3498DB',
  Purple: '#9B59B6',
  Pink: '#E91E63',
  White: '#ECF0F1',
  Black: '#2C3E50',
  Gray: '#95A5A6',
  Multi: 'rainbow',
};

/**
 * Frozen disc color mapping for immutability.
 * Use this constant to get hex values for disc colors.
 */
export const DISC_COLORS: Readonly<Record<DiscColorName, string>> =
  Object.freeze(_DISC_COLORS);
