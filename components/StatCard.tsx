import { StyleSheet, View as RNView, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

interface StatCardProps {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  value: string | number;
  label: string;
  iconColor?: string;
}

export default function StatCard({ icon, value, label, iconColor }: StatCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const dynamicStyles = {
    card: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    iconBg: {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : Colors.violet[50],
    },
  };

  const finalIconColor = iconColor || (isDark ? '#a78bfa' : Colors.violet.primary);

  return (
    <RNView style={[styles.card, dynamicStyles.card]}>
      <RNView style={[styles.iconContainer, dynamicStyles.iconBg]}>
        <FontAwesome name={icon} size={16} color={finalIconColor} />
      </RNView>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
});
