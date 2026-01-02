import { StyleSheet, Pressable, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DiscRecommendation } from '@/hooks/useDiscRecommendations';

interface DiscRecommendationCardProps {
  recommendation: DiscRecommendation;
  isDark: boolean;
  onBuyPress: () => void;
}

const STABILITY_COLORS: Record<string, { bg: string; text: string }> = {
  Understable: { bg: 'rgba(46, 204, 113, 0.15)', text: '#27AE60' },
  Stable: { bg: 'rgba(52, 152, 219, 0.15)', text: '#3498DB' },
  Overstable: { bg: 'rgba(231, 76, 60, 0.15)', text: '#E74C3C' },
};

const GAP_TYPE_LABELS: Record<string, string> = {
  speed_range: 'Speed Gap',
  stability: 'Stability Gap',
  category: 'Category Gap',
};

export default function DiscRecommendationCard({
  recommendation,
  isDark,
  onBuyPress,
}: DiscRecommendationCardProps) {
  const { disc, reason, gap_type, priority } = recommendation;
  const flightNumbers = disc.flight_numbers;

  const dynamicStyles = {
    card: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    text: {
      color: isDark ? '#fff' : '#000',
    },
    secondaryText: {
      color: isDark ? '#999' : '#666',
    },
    priorityBadge: {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : Colors.violet[100],
    },
  };

  const stabilityStyle = disc.stability ? STABILITY_COLORS[disc.stability] : null;

  return (
    <RNView style={[styles.card, dynamicStyles.card]}>
      {/* Header with priority and gap type */}
      <RNView style={styles.cardHeader}>
        <RNView style={[styles.priorityBadge, dynamicStyles.priorityBadge]}>
          <Text style={[styles.priorityText, { color: Colors.violet.primary }]}>#{priority}</Text>
        </RNView>
        <RNView style={styles.gapBadge}>
          <Text style={styles.gapText}>{GAP_TYPE_LABELS[gap_type] || gap_type}</Text>
        </RNView>
      </RNView>

      {/* Disc Info */}
      <RNView style={styles.discInfo}>
        <Text style={[styles.discMold, dynamicStyles.text]}>{disc.mold}</Text>
        <Text style={[styles.discManufacturer, dynamicStyles.secondaryText]}>
          {disc.manufacturer}
        </Text>
        {disc.category && (
          <Text style={[styles.discCategory, dynamicStyles.secondaryText]}>{disc.category}</Text>
        )}
      </RNView>

      {/* Flight Numbers */}
      {flightNumbers && (
        <RNView style={styles.flightNumbers}>
          <RNView style={styles.flightNumberItem}>
            <Text style={[styles.flightNumberValue, dynamicStyles.text]}>
              {flightNumbers.speed}
            </Text>
            <Text style={[styles.flightNumberLabel, dynamicStyles.secondaryText]}>Speed</Text>
          </RNView>
          <RNView style={styles.flightNumberItem}>
            <Text style={[styles.flightNumberValue, dynamicStyles.text]}>
              {flightNumbers.glide}
            </Text>
            <Text style={[styles.flightNumberLabel, dynamicStyles.secondaryText]}>Glide</Text>
          </RNView>
          <RNView style={styles.flightNumberItem}>
            <Text style={[styles.flightNumberValue, dynamicStyles.text]}>
              {flightNumbers.turn}
            </Text>
            <Text style={[styles.flightNumberLabel, dynamicStyles.secondaryText]}>Turn</Text>
          </RNView>
          <RNView style={styles.flightNumberItem}>
            <Text style={[styles.flightNumberValue, dynamicStyles.text]}>
              {flightNumbers.fade}
            </Text>
            <Text style={[styles.flightNumberLabel, dynamicStyles.secondaryText]}>Fade</Text>
          </RNView>
        </RNView>
      )}

      {/* Stability Badge */}
      {disc.stability && stabilityStyle && (
        <RNView style={[styles.stabilityBadge, { backgroundColor: stabilityStyle.bg }]}>
          <Text style={[styles.stabilityText, { color: stabilityStyle.text }]}>{disc.stability}</Text>
        </RNView>
      )}

      {/* AI Reason */}
      <RNView style={styles.reasonContainer}>
        <FontAwesome
          name="lightbulb-o"
          size={14}
          color={isDark ? '#a78bfa' : Colors.violet.primary}
          style={styles.reasonIcon}
        />
        <Text style={[styles.reasonText, dynamicStyles.secondaryText]}>{reason}</Text>
      </RNView>

      {/* Buy Button */}
      <Pressable style={styles.buyButton} onPress={onBuyPress}>
        <FontAwesome name="shopping-cart" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buyButtonText}>Buy on Infinite Discs</Text>
        <FontAwesome name="external-link" size={12} color="#fff" style={{ marginLeft: 8 }} />
      </Pressable>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gapBadge: {
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gapText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  discInfo: {
    marginBottom: 12,
  },
  discMold: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  discManufacturer: {
    fontSize: 14,
  },
  discCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  flightNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    marginBottom: 12,
  },
  flightNumberItem: {
    alignItems: 'center',
  },
  flightNumberValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  flightNumberLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  stabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  stabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reasonIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.violet.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
