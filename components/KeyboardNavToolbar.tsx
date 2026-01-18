import React from 'react';
import { Platform, InputAccessoryView, Pressable, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface KeyboardNavToolbarProps {
  /** Unique ID for InputAccessoryView - must match inputAccessoryViewID on TextInputs */
  nativeID: string;
  /** Called when up arrow is pressed */
  onPrevious: () => void;
  /** Called when down arrow or check is pressed */
  onNext: () => void;
  /** Whether the up arrow should be disabled */
  isFirst: boolean;
  /** Whether to show a checkmark instead of down arrow */
  isLast: boolean;
}

/**
 * iOS keyboard toolbar with up/down navigation arrows.
 * Shows above the keyboard when a TextInput with matching inputAccessoryViewID is focused.
 * Only renders on iOS - Android handles keyboard navigation differently.
 */
export function KeyboardNavToolbar({
  nativeID,
  onPrevious,
  onNext,
  isFirst,
  isLast,
}: KeyboardNavToolbarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // istanbul ignore next -- iOS-only component requires device testing
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View
        style={{
          backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#333' : '#ddd',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Pressable
          onPress={onPrevious}
          disabled={isFirst}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: isFirst ? 0.3 : 1,
          }}
        >
          <FontAwesome name="chevron-up" size={20} color={Colors.violet.primary} />
        </Pressable>
        <Pressable
          onPress={onNext}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <FontAwesome
            name={isLast ? 'check' : 'chevron-down'}
            size={20}
            color={Colors.violet.primary}
          />
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
