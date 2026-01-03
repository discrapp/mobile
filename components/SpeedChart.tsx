import { StyleSheet, View as RNView, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';

interface SpeedChartProps {
  distribution: Array<{ speed: number; count: number }>;
}

export default function SpeedChart({ distribution }: SpeedChartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  if (total === 0) {
    return (
      <RNView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8' },
        ]}
      >
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          Speed Distribution
        </Text>
        <Text style={styles.emptyText}>
          Add discs with flight numbers to see speed distribution
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
    speedLabel: {
      color: isDark ? '#999' : '#666',
    },
  };

  // Get color based on speed (gradient from blue to red)
  const getSpeedColor = (speed: number): string => {
    // Speed 1-4: Putters/Approach (teal)
    // Speed 5-6: Midrange (blue)
    // Speed 7-9: Fairway (green)
    // Speed 10-11: Control (orange)
    // Speed 12-14: Distance (red)
    if (speed <= 4) return '#1ABC9C';
    if (speed <= 6) return '#3498DB';
    if (speed <= 9) return '#2ECC71';
    if (speed <= 11) return '#E67E22';
    return '#E74C3C';
  };

  return (
    <RNView style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>Speed Distribution</Text>

      <RNView style={styles.chartContainer}>
        {distribution.map((item) => {
          const barHeight = (item.count / maxCount) * 60; // Max height 60
          const color = getSpeedColor(item.speed);

          return (
            <RNView key={item.speed} style={styles.barColumn}>
              <Text style={styles.countLabel}>{item.count}</Text>
              <RNView style={styles.barWrapper}>
                <RNView
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      backgroundColor: color,
                    },
                  ]}
                />
              </RNView>
              <Text style={[styles.speedLabel, dynamicStyles.speedLabel]}>
                {item.speed}
              </Text>
            </RNView>
          );
        })}
      </RNView>

      {/* Legend */}
      <RNView style={styles.legend}>
        <LegendItem color="#1ABC9C" label="Putter" isDark={isDark} />
        <LegendItem color="#3498DB" label="Mid" isDark={isDark} />
        <LegendItem color="#2ECC71" label="Fairway" isDark={isDark} />
        <LegendItem color="#E67E22" label="Control" isDark={isDark} />
        <LegendItem color="#E74C3C" label="Distance" isDark={isDark} />
      </RNView>
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
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
    marginBottom: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 30,
  },
  countLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 2,
  },
  bar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 4,
  },
  speedLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
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
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
