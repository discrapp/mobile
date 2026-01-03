import { StyleSheet, View as RNView, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';

interface StabilityChartProps {
  understable: number;
  stable: number;
  overstable: number;
}

const COLORS = {
  understable: '#27AE60', // Green
  stable: '#3498DB', // Blue
  overstable: '#E74C3C', // Red
};

export default function StabilityChart({
  understable,
  stable,
  overstable,
}: StabilityChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const total = understable + stable + overstable;

  if (total === 0) {
    return (
      <RNView style={[styles.container, { backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8' }]}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          Stability Breakdown
        </Text>
        <Text style={styles.emptyText}>Add discs with flight numbers to see stability breakdown</Text>
      </RNView>
    );
  }

  const getPercentage = (count: number) => Math.round((count / total) * 100);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    barBackground: {
      backgroundColor: isDark ? '#333' : '#e0e0e0',
    },
    title: {
      color: isDark ? '#fff' : '#000',
    },
    label: {
      color: isDark ? '#ccc' : '#333',
    },
    count: {
      color: isDark ? '#999' : '#666',
    },
  };

  return (
    <RNView style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>Stability Breakdown</Text>

      {/* Understable */}
      <RNView style={styles.row}>
        <RNView style={styles.labelContainer}>
          <RNView style={[styles.dot, { backgroundColor: COLORS.understable }]} />
          <Text style={[styles.label, dynamicStyles.label]}>Understable</Text>
        </RNView>
        <RNView style={styles.barContainer}>
          <RNView style={[styles.barBackground, dynamicStyles.barBackground]}>
            <RNView
              style={[
                styles.barFill,
                {
                  backgroundColor: COLORS.understable,
                  width: `${getPercentage(understable)}%`,
                },
              ]}
            />
          </RNView>
        </RNView>
        <Text style={[styles.count, dynamicStyles.count]}>
          {understable} ({getPercentage(understable)}%)
        </Text>
      </RNView>

      {/* Stable */}
      <RNView style={styles.row}>
        <RNView style={styles.labelContainer}>
          <RNView style={[styles.dot, { backgroundColor: COLORS.stable }]} />
          <Text style={[styles.label, dynamicStyles.label]}>Stable</Text>
        </RNView>
        <RNView style={styles.barContainer}>
          <RNView style={[styles.barBackground, dynamicStyles.barBackground]}>
            <RNView
              style={[
                styles.barFill,
                {
                  backgroundColor: COLORS.stable,
                  width: `${getPercentage(stable)}%`,
                },
              ]}
            />
          </RNView>
        </RNView>
        <Text style={[styles.count, dynamicStyles.count]}>
          {stable} ({getPercentage(stable)}%)
        </Text>
      </RNView>

      {/* Overstable */}
      <RNView style={styles.row}>
        <RNView style={styles.labelContainer}>
          <RNView style={[styles.dot, { backgroundColor: COLORS.overstable }]} />
          <Text style={[styles.label, dynamicStyles.label]}>Overstable</Text>
        </RNView>
        <RNView style={styles.barContainer}>
          <RNView style={[styles.barBackground, dynamicStyles.barBackground]}>
            <RNView
              style={[
                styles.barFill,
                {
                  backgroundColor: COLORS.overstable,
                  width: `${getPercentage(overstable)}%`,
                },
              ]}
            />
          </RNView>
        </RNView>
        <Text style={[styles.count, dynamicStyles.count]}>
          {overstable} ({getPercentage(overstable)}%)
        </Text>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  count: {
    fontSize: 11,
    width: 60,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
