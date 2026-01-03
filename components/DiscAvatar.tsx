import { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';

// Two-tone color shades for disc placeholder (lighter, darker)
export const COLOR_SHADES: Record<string, { light: string; dark: string }> = {
  Red: { light: '#fadbd8', dark: '#c0392b' },
  Orange: { light: '#fdebd0', dark: '#d35400' },
  Yellow: { light: '#fcf3cf', dark: '#d4ac0d' },
  Green: { light: '#d5f5e3', dark: '#1e8449' },
  Blue: { light: '#d4e6f1', dark: '#2471a3' },
  Purple: { light: '#e8daef', dark: '#7d3c98' },
  Pink: { light: '#fadbe8', dark: '#c2185b' },
  White: { light: '#ffffff', dark: '#ecf0f1' },
  Black: { light: '#5d6d7e', dark: '#1c2833' },
  Gray: { light: '#d5d8dc', dark: '#717d7e' },
  Multi: { light: '#fadbd8', dark: '#d4e6f1' },
  'Light Blue': { light: '#d6eaf8', dark: '#2e86ab' },
};

interface DiscAvatarProps {
  photoUrl?: string | null;
  color?: string | null;
  size?: number;
}

export default function DiscAvatar({ photoUrl, color, size = 60 }: DiscAvatarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const containerStyle = useMemo(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
  }), [size]);

  const innerSize = useMemo(() => size * 0.65, [size]);

  const innerStyle = useMemo(() => color && COLOR_SHADES[color] ? ({
    backgroundColor: COLOR_SHADES[color].dark,
    width: innerSize,
    height: innerSize,
    borderRadius: innerSize / 2,
  }) : null, [color, innerSize]);

  const placeholderBgColor = useMemo(() => isDark ? '#1e1e1e' : '#e0e0e0', [isDark]);
  const placeholderIconColor = useMemo(() => isDark ? '#555' : '#999', [isDark]);

  if (photoUrl) {
    return (
      <View style={[styles.container, containerStyle]}>
        <Image source={{ uri: photoUrl }} style={styles.photo} />
      </View>
    );
  }

  if (color && COLOR_SHADES[color] && innerStyle) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={[styles.twoToneCircle, { backgroundColor: COLOR_SHADES[color].light }]}>
          <View
            style={[
              styles.twoToneInner,
              innerStyle,
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.placeholder, { backgroundColor: placeholderBgColor }]}>
        <FontAwesome name="circle-o" size={innerSize} color={placeholderIconColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  twoToneCircle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoToneInner: {},
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
