import { StyleSheet, Pressable, View as RNView, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface RecoveryAlertProps {
  count: number;
  onPress: () => void;
}

export default function RecoveryAlert({ count, onPress }: RecoveryAlertProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (count === 0) {
    return null;
  }

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? 'rgba(243, 156, 18, 0.15)' : '#FFF8E7',
      borderColor: isDark ? 'rgba(243, 156, 18, 0.3)' : '#FFE4B5',
    },
    iconBg: {
      backgroundColor: isDark ? 'rgba(243, 156, 18, 0.2)' : '#fff',
    },
    title: {
      color: isDark ? '#fbbf24' : '#D68910',
    },
    subtitle: {
      color: isDark ? '#ccc' : '#666',
    },
  };

  const discWord = count === 1 ? 'disc' : 'discs';

  return (
    <Pressable style={[styles.container, dynamicStyles.container]} onPress={onPress}>
      <RNView style={[styles.iconContainer, dynamicStyles.iconBg]}>
        <FontAwesome name="bell" size={18} color={isDark ? '#fbbf24' : '#F39C12'} />
      </RNView>
      <RNView style={styles.textContainer}>
        <Text style={[styles.title, dynamicStyles.title]}>
          {count} {discWord} being recovered
        </Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          Tap to view recovery status
        </Text>
      </RNView>
      <FontAwesome name="chevron-right" size={14} color={isDark ? '#888' : '#999'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
});
