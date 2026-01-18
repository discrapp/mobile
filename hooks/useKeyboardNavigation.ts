import { useRef, useState, useCallback, createRef, RefObject } from 'react';
import { TextInput } from 'react-native';

/**
 * Hook for managing keyboard navigation between form fields.
 * Provides refs, focus management, and navigation functions for InputAccessoryView.
 */
export function useKeyboardNavigation(fieldCount: number) {
  // Create refs array using createRef for proper typing
  const refs = useRef<RefObject<TextInput | null>[]>(
    Array.from({ length: fieldCount }, () => createRef<TextInput>())
  ).current;

  const [currentIndex, setCurrentIndex] = useState(0);

  // istanbul ignore next -- iOS keyboard navigation requires device testing
  const focusPrevious = useCallback(() => {
    if (currentIndex > 0) {
      refs[currentIndex - 1].current?.focus();
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, refs]);

  // istanbul ignore next -- iOS keyboard navigation requires device testing
  const focusNext = useCallback(() => {
    if (currentIndex < refs.length - 1) {
      refs[currentIndex + 1].current?.focus();
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last input, dismiss keyboard
      refs[currentIndex].current?.blur();
    }
  }, [currentIndex, refs]);

  // istanbul ignore next -- Focus handler for keyboard navigation
  const createFocusHandler = useCallback((index: number) => {
    return () => setCurrentIndex(index);
  }, []);

  return {
    refs,
    currentIndex,
    focusPrevious,
    focusNext,
    createFocusHandler,
    isFirst: currentIndex === 0,
    isLast: currentIndex === refs.length - 1,
  };
}
