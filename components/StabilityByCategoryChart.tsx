import { StyleSheet, View as RNView, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';

interface StabilityByCategoryChartProps {
  data: Array<{
    category: string;
    understable: number;
    stable: number;
    overstable: number;
  }>;
}

const STABILITY_COLORS = {
  understable: '#27AE60', // Green
  stable: '#3498DB', // Blue
  overstable: '#E74C3C', // Red
};

export default function StabilityByCategoryChart({
  data,
}: StabilityByCategoryChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (data.length === 0) {
    return (
      <RNView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8' },
        ]}
      >
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          Stability by Type
        </Text>
        <Text style={styles.emptyText}>
          Add discs with categories and flight numbers
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
    categoryLabel: {
      color: isDark ? '#ccc' : '#333',
    },
  };

  return (
    <RNView style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>Stability by Type</Text>

      {/* Legend */}
      <RNView style={styles.legend}>
        <LegendItem color={STABILITY_COLORS.understable} label="US" isDark={isDark} />
        <LegendItem color={STABILITY_COLORS.stable} label="S" isDark={isDark} />
        <LegendItem color={STABILITY_COLORS.overstable} label="OS" isDark={isDark} />
      </RNView>

      {data.map((item) => {
        const total = item.understable + item.stable + item.overstable;
        if (total === 0) return null;

        return (
          <RNView key={item.category} style={styles.row}>
            <Text
              style={[styles.categoryLabel, dynamicStyles.categoryLabel]}
              numberOfLines={1}
            >
              {shortenCategory(item.category)}
            </Text>
            <RNView style={styles.barContainer}>
              <RNView style={styles.stackedBar}>
                {item.understable > 0 && (
                  <RNView
                    style={[
                      styles.barSegment,
                      {
                        flex: item.understable,
                        backgroundColor: STABILITY_COLORS.understable,
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 4,
                      },
                    ]}
                  />
                )}
                {item.stable > 0 && (
                  <RNView
                    style={[
                      styles.barSegment,
                      {
                        flex: item.stable,
                        backgroundColor: STABILITY_COLORS.stable,
                        borderTopLeftRadius: item.understable === 0 ? 4 : 0,
                        borderBottomLeftRadius: item.understable === 0 ? 4 : 0,
                        borderTopRightRadius: item.overstable === 0 ? 4 : 0,
                        borderBottomRightRadius: item.overstable === 0 ? 4 : 0,
                      },
                    ]}
                  />
                )}
                {item.overstable > 0 && (
                  <RNView
                    style={[
                      styles.barSegment,
                      {
                        flex: item.overstable,
                        backgroundColor: STABILITY_COLORS.overstable,
                        borderTopRightRadius: 4,
                        borderBottomRightRadius: 4,
                      },
                    ]}
                  />
                )}
              </RNView>
            </RNView>
            <RNView style={styles.countsContainer}>
              <Text style={[styles.count, { color: STABILITY_COLORS.understable }]}>
                {item.understable}
              </Text>
              <Text style={[styles.count, { color: STABILITY_COLORS.stable }]}>
                {item.stable}
              </Text>
              <Text style={[styles.count, { color: STABILITY_COLORS.overstable }]}>
                {item.overstable}
              </Text>
            </RNView>
          </RNView>
        );
      })}
    </RNView>
  );
}

function LegendItem({
  color,
  label,
  isDark,
}: {
  color: string;
  label: string;
  isDark: boolean;
}) {
  return (
    <RNView style={styles.legendItem}>
      <RNView style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: isDark ? '#999' : '#666' }]}>
        {label}
      </Text>
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
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    width: 60,
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  countsContainer: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'space-between',
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
    width: 18,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
