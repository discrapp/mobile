import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { STRINGS } from '@/constants/strings';

interface FullScreenErrorProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Full screen error component for critical failures.
 * Displays an error icon, message, and optional retry button.
 * Adapts to light/dark mode automatically.
 */
export function FullScreenError({
  message = STRINGS.ERRORS.GENERIC,
  onRetry,
  retryLabel = STRINGS.ERRORS.TRY_AGAIN,
}: FullScreenErrorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
      accessibilityRole="alert"
      accessibilityLabel={`An error occurred. ${message}`}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2a1a1a' : '#fee2e2' }]}>
          <FontAwesome name="exclamation-triangle" size={48} color="#ef4444" />
        </View>

        <Text style={styles.title}>{STRINGS.ERRORS.OOPS}</Text>
        <Text style={[styles.message, { color: isDark ? '#999' : '#666' }]}>
          {message}
        </Text>

        {onRetry && (
          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={retryLabel}
            accessibilityHint="Attempts to recover from the error"
          >
            <FontAwesome name="refresh" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
