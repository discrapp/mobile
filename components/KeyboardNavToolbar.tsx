import React from 'react';
import { Platform, InputAccessoryView, Pressable, View, Text, Keyboard } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface KeyboardNavToolbarProps {
  /** Unique ID for InputAccessoryView - must match inputAccessoryViewID on TextInputs */
  nativeID: string;
  /** Called when up arrow is pressed */
  onPrevious: () => void;
  /** Called when down arrow is pressed */
  onNext: () => void;
  /** Whether the up arrow should be disabled */
  isFirst: boolean;
  /** Whether this is the last field */
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

  // istanbul ignore next -- Keyboard dismiss handler
  const handleDone = () => {
    Keyboard.dismiss();
  };

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View
        style={{
          backgroundColor: isDark ? '#2c2c2e' : '#d1d5db',
          borderTopWidth: 0.5,
          borderTopColor: isDark ? '#3a3a3c' : '#b5b5b5',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 8,
          height: 44,
        }}
      >
        {/* Navigation arrows grouped on the left */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={onPrevious}
            disabled={isFirst}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              opacity: isFirst ? 0.3 : 1,
            }}
          >
            <FontAwesome name="chevron-up" size={18} color={Colors.violet.primary} />
          </Pressable>
          <Pressable
            onPress={onNext}
            disabled={isLast}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              opacity: isLast ? 0.3 : 1,
            }}
          >
            <FontAwesome name="chevron-down" size={18} color={Colors.violet.primary} />
          </Pressable>
        </View>

        {/* Done button on the right */}
        <Pressable
          onPress={handleDone}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: Colors.violet.primary,
              fontSize: 17,
              fontWeight: '600',
            }}
          >
            Done
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
