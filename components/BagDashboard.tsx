import { StyleSheet, View as RNView, useColorScheme, Pressable } from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { DISC_COLORS } from '@/constants/discColors';
import StatCard from './StatCard';
import StabilityChart from './StabilityChart';
import CategoryChart from './CategoryChart';
import SpeedChart from './SpeedChart';
import StabilityByCategoryChart from './StabilityByCategoryChart';
import RecoveryAlert from './RecoveryAlert';
import { BagStats } from '@/utils/bagStats';
import { Skeleton } from './Skeleton';

interface BagDashboardProps {
  stats: BagStats | null;
  activeRecoveryCount: number;
  loading: boolean;
  onRecoveryPress: () => void;
  onAnalyzePress: () => void;
}

export default function BagDashboard({
  stats,
  activeRecoveryCount,
  loading,
  onRecoveryPress,
  onAnalyzePress,
}: BagDashboardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (loading) {
    return <DashboardSkeleton isDark={isDark} />;
  }

  if (!stats || stats.totalDiscs === 0) {
    return <EmptyState isDark={isDark} />;
  }

  const dynamicStyles = {
    section: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    sectionTitle: {
      color: isDark ? '#fff' : '#000',
    },
    secondaryText: {
      color: isDark ? '#999' : '#666',
    },
    analyzeButton: {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : Colors.violet[50],
      borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : Colors.violet[100],
    },
  };

  return (
    <RNView style={styles.container}>
      {/* Recovery Alert */}
      <RecoveryAlert count={activeRecoveryCount} onPress={onRecoveryPress} />

      {/* Section Title */}
      <Text style={[styles.sectionHeader, dynamicStyles.sectionTitle]}>
        Bag Insights
      </Text>

      {/* Quick Stats Grid */}
      <RNView style={styles.statsGrid}>
        <StatCard
          icon="circle-o"
          value={stats.totalDiscs}
          label="Total Discs"
        />
        <StatCard
          icon="tachometer"
          value={stats.speedRange ? `${stats.speedRange.min}-${stats.speedRange.max}` : '--'}
          label="Speed Range"
        />
      </RNView>

      {/* Top Brand - with "Most Popular" label */}
      {stats.topBrand && (
        <RNView style={[styles.topBrandCard, dynamicStyles.section]}>
          <RNView style={styles.topBrandHeader}>
            <FontAwesome
              name="trophy"
              size={16}
              color={isDark ? '#fbbf24' : '#F39C12'}
            />
            <Text style={[styles.topBrandLabel, dynamicStyles.secondaryText]}>
              Most Popular Brand
            </Text>
          </RNView>
          <Text style={[styles.topBrandName, dynamicStyles.sectionTitle]}>
            {stats.topBrand.name}
          </Text>
          <Text style={[styles.topBrandCount, dynamicStyles.secondaryText]}>
            {stats.topBrand.count} disc{stats.topBrand.count !== 1 ? 's' : ''}
          </Text>
        </RNView>
      )}

      {/* Disc Types Chart */}
      <RNView style={styles.chartSection}>
        <CategoryChart distribution={stats.categoryDistribution} />
      </RNView>

      {/* Speed Distribution Chart */}
      <RNView style={styles.chartSection}>
        <SpeedChart distribution={stats.speedDistribution} />
      </RNView>

      {/* Overall Stability Breakdown */}
      <RNView style={styles.chartSection}>
        <StabilityChart
          understable={stats.stability.understable}
          stable={stats.stability.stable}
          overstable={stats.stability.overstable}
        />
      </RNView>

      {/* Stability by Category */}
      {stats.stabilityByCategory.length > 0 && (
        <RNView style={styles.chartSection}>
          <StabilityByCategoryChart data={stats.stabilityByCategory} />
        </RNView>
      )}

      {/* Plastics & Colors Section */}
      {(stats.topPlastics.length > 0 || stats.colorDistribution.length > 0) && (
        <RNView style={[styles.preferencesSection, dynamicStyles.section]}>
          <RNView style={styles.preferencesGrid}>
            {/* Top Plastics */}
            {stats.topPlastics.length > 0 && (
              <RNView style={styles.preferenceColumn}>
                <Text style={[styles.preferenceTitle, dynamicStyles.sectionTitle]}>
                  Top Plastics
                </Text>
                {stats.topPlastics.slice(0, 3).map((plastic, index) => (
                  <RNView key={plastic.name} style={styles.preferenceRow}>
                    <Text style={[styles.preferenceRank, dynamicStyles.secondaryText]}>
                      {index + 1}.
                    </Text>
                    <Text style={[styles.preferenceName, dynamicStyles.sectionTitle]} numberOfLines={1}>
                      {plastic.name}
                    </Text>
                    <Text style={[styles.preferenceCount, dynamicStyles.secondaryText]}>
                      {plastic.count}
                    </Text>
                  </RNView>
                ))}
              </RNView>
            )}

            {/* Color Distribution */}
            {stats.colorDistribution.length > 0 && (
              <RNView style={styles.preferenceColumn}>
                <Text style={[styles.preferenceTitle, dynamicStyles.sectionTitle]}>
                  Colors
                </Text>
                <RNView style={styles.colorGrid}>
                  {stats.colorDistribution.slice(0, 6).map((colorItem) => (
                    <RNView key={colorItem.color} style={styles.colorItem}>
                      <ColorDot color={colorItem.color} />
                      <Text style={[styles.colorCount, dynamicStyles.secondaryText]}>
                        {colorItem.count}
                      </Text>
                    </RNView>
                  ))}
                </RNView>
              </RNView>
            )}
          </RNView>
        </RNView>
      )}

      {/* Full Analysis CTA */}
      <Pressable style={[styles.analyzeButton, dynamicStyles.analyzeButton]} onPress={onAnalyzePress}>
        <FontAwesome name="lightbulb-o" size={16} color={isDark ? '#fbbf24' : '#F39C12'} />
        <Text style={styles.analyzeButtonText}>Get AI Recommendations</Text>
        <FontAwesome name="chevron-right" size={12} color={isDark ? '#888' : '#999'} />
      </Pressable>
    </RNView>
  );
}

function ColorDot({ color }: { color: string }) {
  const hexColor = DISC_COLORS[color as keyof typeof DISC_COLORS] || '#666';

  if (hexColor === 'rainbow') {
    return (
      <RNView style={styles.rainbowDot}>
        <RNView style={[styles.rainbowSlice, { backgroundColor: '#E74C3C' }]} />
        <RNView style={[styles.rainbowSlice, { backgroundColor: '#F1C40F' }]} />
        <RNView style={[styles.rainbowSlice, { backgroundColor: '#2ECC71' }]} />
        <RNView style={[styles.rainbowSlice, { backgroundColor: '#3498DB' }]} />
      </RNView>
    );
  }

  return (
    <RNView
      style={[
        styles.colorDot,
        {
          backgroundColor: hexColor,
          borderColor: color === 'White' ? '#ccc' : 'transparent',
        },
      ]}
    />
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <RNView style={[styles.emptyState, { backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8' }]}>
      <FontAwesome name="pie-chart" size={32} color={isDark ? '#666' : '#ccc'} />
      <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#000' }]}>
        No Bag Insights Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: isDark ? '#999' : '#666' }]}>
        Add discs to your bag to see stats and insights
      </Text>
    </RNView>
  );
}

function DashboardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <RNView style={styles.container}>
      {/* Stats Grid Skeleton */}
      <RNView style={styles.statsGrid}>
        <RNView style={[styles.skeletonCard, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={40} height={20} style={{ marginTop: 8 }} />
          <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
        </RNView>
        <RNView style={[styles.skeletonCard, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={40} height={20} style={{ marginTop: 8 }} />
          <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
        </RNView>
      </RNView>

      {/* Chart Skeleton */}
      <RNView style={[styles.skeletonStability, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
        <Skeleton width={120} height={16} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={8} style={{ marginBottom: 10 }} />
        <Skeleton width="100%" height={8} style={{ marginBottom: 10 }} />
        <Skeleton width="100%" height={8} />
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  topBrandCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  topBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  topBrandLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  topBrandName: {
    fontSize: 24,
    fontWeight: '700',
  },
  topBrandCount: {
    fontSize: 14,
    marginTop: 4,
  },
  chartSection: {
    marginBottom: 12,
  },
  preferencesSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  preferencesGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  preferenceColumn: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  preferenceRank: {
    fontSize: 12,
    width: 16,
  },
  preferenceName: {
    fontSize: 13,
    flex: 1,
  },
  preferenceCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  rainbowDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  rainbowSlice: {
    flex: 1,
    height: '100%',
  },
  colorCount: {
    fontSize: 12,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  skeletonCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  skeletonStability: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
});
