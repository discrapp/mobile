import { StyleSheet, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BagAnalysis } from '@/hooks/useDiscRecommendations';

interface BagAnalysisCardProps {
  bagAnalysis: BagAnalysis;
  confidence: number;
  processingTimeMs: number;
  isDark: boolean;
}

export default function BagAnalysisCard({
  bagAnalysis,
  confidence,
  processingTimeMs,
  isDark,
}: BagAnalysisCardProps) {
  const {
    total_discs,
    brand_preferences,
    speed_coverage,
    stability_by_category,
    identified_gaps,
  } = bagAnalysis;

  const dynamicStyles = {
    card: {
      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    text: {
      color: isDark ? '#fff' : '#000',
    },
    secondaryText: {
      color: isDark ? '#999' : '#666',
    },
    sectionBorder: {
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    gapItem: {
      backgroundColor: isDark ? 'rgba(243, 156, 18, 0.15)' : 'rgba(243, 156, 18, 0.1)',
    },
  };

  return (
    <RNView style={[styles.card, dynamicStyles.card]}>
      {/* Header */}
      <RNView style={styles.header}>
        <FontAwesome
          name="pie-chart"
          size={20}
          color={isDark ? '#a78bfa' : Colors.violet.primary}
        />
        <Text style={[styles.cardTitle, dynamicStyles.text]}>Bag Analysis</Text>
      </RNView>

      {/* Summary Stats */}
      <RNView style={styles.statsRow}>
        <RNView style={styles.statItem}>
          <Text style={[styles.statValue, dynamicStyles.text]}>{total_discs}</Text>
          <Text style={[styles.statLabel, dynamicStyles.secondaryText]}>Total Discs</Text>
        </RNView>
        <RNView style={styles.statItem}>
          <Text style={[styles.statValue, dynamicStyles.text]}>{Math.round(confidence * 100)}%</Text>
          <Text style={[styles.statLabel, dynamicStyles.secondaryText]}>Confidence</Text>
        </RNView>
        <RNView style={styles.statItem}>
          <Text style={[styles.statValue, dynamicStyles.text]}>
            {(processingTimeMs / 1000).toFixed(1)}s
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.secondaryText]}>Analysis Time</Text>
        </RNView>
      </RNView>

      {/* Speed Coverage */}
      <RNView style={[styles.section, dynamicStyles.sectionBorder]}>
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Speed Coverage</Text>
        <Text style={[styles.speedRange, dynamicStyles.secondaryText]}>
          Speed {speed_coverage.min} - {speed_coverage.max}
        </Text>
        {speed_coverage.gaps.length > 0 && (
          <RNView style={styles.speedGaps}>
            {speed_coverage.gaps.map((gap, index) => (
              <RNView key={index} style={styles.speedGapBadge}>
                <Text style={styles.speedGapText}>Gap: {gap.from}-{gap.to}</Text>
              </RNView>
            ))}
          </RNView>
        )}
      </RNView>

      {/* Brand Preferences */}
      {brand_preferences.length > 0 && (
        <RNView style={[styles.section, dynamicStyles.sectionBorder]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Top Brands</Text>
          <RNView style={styles.brandList}>
            {brand_preferences.slice(0, 3).map((brand, index) => (
              <RNView key={index} style={styles.brandItem}>
                <Text style={[styles.brandName, dynamicStyles.text]}>{brand.manufacturer}</Text>
                <Text style={[styles.brandCount, dynamicStyles.secondaryText]}>
                  {brand.count} disc{brand.count !== 1 ? 's' : ''}
                </Text>
              </RNView>
            ))}
          </RNView>
        </RNView>
      )}

      {/* Stability Matrix */}
      {stability_by_category.length > 0 && (
        <RNView style={[styles.section, dynamicStyles.sectionBorder]}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Stability by Category</Text>
          {stability_by_category.map((category, index) => (
            <RNView key={index} style={styles.stabilityRow}>
              <Text style={[styles.categoryName, dynamicStyles.text]}>{category.category}</Text>
              <RNView style={styles.stabilityBadges}>
                <RNView style={[styles.stabilityBadge, styles.understableBadge]}>
                  <Text style={styles.stabilityBadgeText}>US: {category.understable}</Text>
                </RNView>
                <RNView style={[styles.stabilityBadge, styles.stableBadge]}>
                  <Text style={styles.stabilityBadgeText}>S: {category.stable}</Text>
                </RNView>
                <RNView style={[styles.stabilityBadge, styles.overstableBadge]}>
                  <Text style={styles.stabilityBadgeText}>OS: {category.overstable}</Text>
                </RNView>
              </RNView>
            </RNView>
          ))}
        </RNView>
      )}

      {/* Identified Gaps */}
      {identified_gaps.length > 0 && (
        <RNView style={styles.gapsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>Identified Gaps</Text>
          {identified_gaps.map((gap, index) => (
            <RNView key={index} style={[styles.gapItem, dynamicStyles.gapItem]}>
              <FontAwesome name="exclamation-circle" size={14} color="#F39C12" />
              <Text style={[styles.gapText, dynamicStyles.text]}>{gap}</Text>
            </RNView>
          ))}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  speedRange: {
    fontSize: 14,
  },
  speedGaps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  speedGapBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedGapText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '500',
  },
  brandList: {
    gap: 8,
  },
  brandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 14,
  },
  brandCount: {
    fontSize: 12,
  },
  stabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 13,
    flex: 1,
  },
  stabilityBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  stabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  stabilityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  understableBadge: {
    backgroundColor: '#27AE60',
  },
  stableBadge: {
    backgroundColor: '#3498DB',
  },
  overstableBadge: {
    backgroundColor: '#E74C3C',
  },
  gapsSection: {
    paddingTop: 12,
  },
  gapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  gapText: {
    flex: 1,
    fontSize: 13,
  },
});
