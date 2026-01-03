import { StyleSheet, View as RNView, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';

interface CategoryChartProps {
  distribution: Array<{ category: string; count: number }>;
}

// Colors for different disc categories
const CATEGORY_COLORS: Record<string, string> = {
  'Distance Driver': '#E74C3C', // Red
  'Control Driver': '#E67E22', // Orange
  'Hybrid Driver': '#F1C40F', // Yellow
  'Fairway Driver': '#2ECC71', // Green
  Midrange: '#3498DB', // Blue
  Approach: '#9B59B6', // Purple
  Putter: '#1ABC9C', // Teal
};

export default function CategoryChart({ distribution }: CategoryChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const total = distribution.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <RNView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8' },
        ]}
      >
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          Disc Types
        </Text>
        <Text style={styles.emptyText}>
          Add discs to see your type distribution
        </Text>
      </RNView>
    );
  }

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderColor: isDark ? '#333' : '#e0e0e0',
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
    barBackground: {
      backgroundColor: isDark ? '#333' : '#e0e0e0',
    },
  };

  const getPercentage = (count: number) => Math.round((count / total) * 100);

  return (
    <RNView style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>Disc Types</Text>

      {distribution.map((item) => {
        const color = CATEGORY_COLORS[item.category] || '#666';
        const percentage = getPercentage(item.count);

        return (
          <RNView key={item.category} style={styles.row}>
            <RNView style={styles.labelContainer}>
              <RNView style={[styles.dot, { backgroundColor: color }]} />
              <Text
                style={[styles.label, dynamicStyles.label]}
                numberOfLines={1}
              >
                {shortenCategory(item.category)}
              </Text>
            </RNView>
            <RNView style={styles.barContainer}>
              <RNView style={[styles.barBackground, dynamicStyles.barBackground]}>
                <RNView
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: color,
                      width: `${percentage}%`,
                    },
                  ]}
                />
              </RNView>
            </RNView>
            <Text style={[styles.count, dynamicStyles.count]}>
              {item.count} ({percentage}%)
            </Text>
          </RNView>
        );
      })}
    </RNView>
  );
}

// Shorten long category names for display
function shortenCategory(category: string): string {
  const map: Record<string, string> = {
    'Distance Driver': 'Distance',
    'Control Driver': 'Control',
    'Hybrid Driver': 'Hybrid',
    'Fairway Driver': 'Fairway',
  };
  return map[category] || category;
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
    width: 80,
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
    flex: 1,
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
