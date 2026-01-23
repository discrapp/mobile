import { StyleSheet, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TradeInCandidate } from '@/hooks/useDiscRecommendations';

interface TradeInCandidateCardProps {
  candidate: TradeInCandidate;
  isDark: boolean;
}

export default function TradeInCandidateCard({
  candidate,
  isDark,
}: TradeInCandidateCardProps) {
  const { disc, reason } = candidate;
  const flightNumbers = disc.flight_numbers;

  const dynamicStyles = {
    card: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    text: {
      color: isDark ? '#fff' : '#000',
    },
    secondaryText: {
      color: isDark ? '#999' : '#666',
    },
  };

  const discName = disc.name || `${disc.manufacturer || ''} ${disc.mold || ''}`.trim() || 'Unknown Disc';

  return (
    <RNView style={[styles.card, dynamicStyles.card]}>
      {/* Trade-in icon and badge */}
      <RNView style={styles.cardHeader}>
        <RNView style={styles.tradeInBadge}>
          <FontAwesome name="exchange" size={12} color="#E67E22" style={{ marginRight: 6 }} />
          <Text style={styles.tradeInText}>Consider Trading</Text>
        </RNView>
      </RNView>

      {/* Disc Info */}
      <RNView style={styles.discInfo}>
        <Text style={[styles.discName, dynamicStyles.text]}>{discName}</Text>
        {disc.plastic && (
          <Text style={[styles.discPlastic, dynamicStyles.secondaryText]}>{disc.plastic}</Text>
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

      {/* AI Reason */}
      <RNView style={styles.reasonContainer}>
        <FontAwesome
          name="info-circle"
          size={14}
          color={isDark ? '#E67E22' : '#D35400'}
          style={styles.reasonIcon}
        />
        <Text style={[styles.reasonText, dynamicStyles.secondaryText]}>{reason}</Text>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 126, 34, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tradeInText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E67E22',
  },
  discInfo: {
    marginBottom: 12,
  },
  discName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  discPlastic: {
    fontSize: 13,
  },
  flightNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    marginBottom: 12,
  },
  flightNumberItem: {
    alignItems: 'center',
  },
  flightNumberValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  flightNumberLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reasonIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
