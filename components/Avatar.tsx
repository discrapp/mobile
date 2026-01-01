import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';

interface AvatarProps {
  /** Gravatar URL or any image URL */
  avatarUrl?: string | null;
  /** Display name for generating initials fallback */
  name?: string;
  /** Size of the avatar in pixels (default: 40) */
  size?: number;
  /** Custom style to apply to the container */
  style?: ViewStyle | ImageStyle;
}

/**
 * Avatar component that displays a user's profile picture.
 * Uses expo-image for memory and disk caching.
 * Falls back to initials if the image fails to load or is not provided.
 */
export function Avatar({ avatarUrl, name, size = 40, style }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (displayName?: string): string => {
    if (!displayName) return '?';

    // Handle @username format
    if (displayName.startsWith('@')) {
      return displayName.charAt(1).toUpperCase();
    }

    // Handle full names (take first letter of first and last name)
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    return displayName.charAt(0).toUpperCase();
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textSize = size * 0.4;

  // Accessibility label based on name
  const accessibilityLabel = name ? `${name}'s avatar` : 'User avatar';

  // Show image if URL exists and hasn't errored
  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, containerStyle, style as ImageStyle]}
        onError={() => setImageError(true)}
        cachePolicy="memory-disk"
        transition={200}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  // Fallback to initials
  return (
    <View
      style={[styles.placeholder, containerStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.initials, { fontSize: textSize }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e0e0e0',
  },
  placeholder: {
    backgroundColor: Colors.violet.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
});
