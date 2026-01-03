import { logger } from '@/lib/logger';
import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View as RNView,
  useColorScheme,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { DISC_COLORS } from '@/constants/discColors';
import { supabase } from '@/lib/supabase';
import { getCachedDiscs, setCachedDiscs, isCacheStale } from '@/utils/discCache';
import { DiscCardSkeleton } from '@/components/Skeleton';
import { handleError } from '@/lib/errorHandler';
import DiscAvatar from '@/components/DiscAvatar';

interface FlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

interface DiscPhoto {
  id: string;
  storage_path: string;
  photo_uuid: string;
  photo_url?: string;
  created_at: string;
}

interface ActiveRecovery {
  id: string;
  status: string;
  finder_id: string;
  found_at: string;
}

interface Disc {
  id: string;
  name: string;
  manufacturer?: string;
  mold?: string;
  plastic?: string;
  weight?: number;
  color?: string;
  category?: string;
  flight_numbers: FlightNumbers;
  reward_amount?: string;
  notes?: string;
  created_at: string;
  photos: DiscPhoto[];
  active_recovery?: ActiveRecovery | null;
  was_surrendered?: boolean;
  surrendered_at?: string | null;
  ai_identification_log_id?: string | null;
}

// Recovery status labels and colors
const RECOVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  found: { label: 'Found', color: '#F39C12' },
  meetup_proposed: { label: 'Meetup Proposed', color: '#3498DB' },
  meetup_confirmed: { label: 'Meetup Confirmed', color: '#27AE60' },
};

export default function MyBagScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [discs, setDiscs] = useState<Disc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Load cached data immediately on mount - this runs once
  useEffect(() => {
    const loadCachedData = async () => {
      const cached = await getCachedDiscs();
      if (cached && cached.length > 0) {
        setDiscs(cached as Disc[]);
        setLoading(false); // Don't show spinner if we have cached data
      }
      setCacheLoaded(true);
    };
    loadCachedData();
  }, []);

  const fetchDiscs = async (isRefreshing = false) => {
    try {
      // Only show loading spinner if:
      // 1. We're not refreshing (pull-to-refresh has its own indicator)
      // 2. We haven't fetched before
      // 3. We have no discs to display (no cache)
      if (!isRefreshing && !hasFetchedOnce && discs.length === 0) {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        logger.error('No session found');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-user-discs`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch discs');
      }

      const data = await response.json();
      setDiscs(data);

      // Save to cache
      await setCachedDiscs(data);
    } catch (error) {
      // Only show error if we don't have cached data to display
      if (discs.length === 0) {
        handleError(error, { operation: 'fetch-discs' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasFetchedOnce(true);
    }
  };

  // Only fetch on focus if cache is stale
  useFocusEffect(
    useCallback(() => {
      const checkAndFetch = async () => {
        if (cacheLoaded) {
          const stale = await isCacheStale();
          if (stale) {
            fetchDiscs();
          }
        }
      };
      checkAndFetch();
    }, [cacheLoaded])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDiscs(true);
  }, []);

  const renderDiscCard = ({ item }: { item: Disc }) => {
    // Get the first photo
    const firstPhoto = item.photos[0];

    return (
      <Pressable
        style={styles.discCard}
        onPress={() => {
          router.push(`/disc/${item.id}`);
        }}>
        {/* Photo */}
        <RNView style={styles.photoContainer}>
          <DiscAvatar photoUrl={firstPhoto?.photo_url} color={item.color} size={60} />
        </RNView>

        {/* Disc Info */}
        <View style={styles.discInfo}>
          <View style={styles.discNameRow}>
            <Text style={styles.discName} numberOfLines={1} ellipsizeMode="tail">{item.mold || item.name}</Text>
            {item.was_surrendered && (
              <View style={[styles.recoveryBadge, styles.surrenderedBadge]}>
                <FontAwesome name="gift" size={10} color="#fff" />
                <Text style={styles.recoveryBadgeText}>Surrendered</Text>
              </View>
            )}
            {item.ai_identification_log_id && (
              <View style={[styles.recoveryBadge, styles.aiBadge]}>
                <FontAwesome name="magic" size={10} color="#fff" />
                <Text style={styles.recoveryBadgeText}>AI Identified</Text>
              </View>
            )}
            {item.active_recovery && RECOVERY_STATUS_MAP[item.active_recovery.status] && (
              <View style={[styles.recoveryBadge, { backgroundColor: RECOVERY_STATUS_MAP[item.active_recovery.status].color }]}>
                <Text style={styles.recoveryBadgeText}>
                  {RECOVERY_STATUS_MAP[item.active_recovery.status].label}
                </Text>
              </View>
            )}
          </View>
          {item.manufacturer && <Text style={styles.discDetails} numberOfLines={1} ellipsizeMode="tail">{item.manufacturer}</Text>}
          {item.plastic && <Text style={styles.discMeta}>{item.plastic}</Text>}
          <View style={styles.discFooter}>
            {item.color && (
              <View style={styles.colorBadge}>
                {DISC_COLORS[item.color as keyof typeof DISC_COLORS] === 'rainbow' ? (
                  <View style={styles.rainbowDot}>
                    <View style={[styles.rainbowSlice, { backgroundColor: '#E74C3C' }]} />
                    <View style={[styles.rainbowSlice, { backgroundColor: '#F1C40F' }]} />
                    <View style={[styles.rainbowSlice, { backgroundColor: '#2ECC71' }]} />
                    <View style={[styles.rainbowSlice, { backgroundColor: '#3498DB' }]} />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: DISC_COLORS[item.color as keyof typeof DISC_COLORS] || '#666',
                        borderColor:
                          item.color === 'White' ? '#ccc' : 'rgba(0, 0, 0, 0.1)',
                      },
                    ]}
                  />
                )}
                <Text style={styles.colorText} numberOfLines={1}>{item.color}</Text>
              </View>
            )}
            {item.photos.length > 0 && (
              <View style={styles.photoCount}>
                <FontAwesome name="camera" size={12} color="#666" />
                <Text style={styles.photoCountText}>{item.photos.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <FontAwesome name="chevron-right" size={16} color="#ccc" style={styles.chevron} />
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome name="circle-o" size={64} color="#ccc" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Discs in Your Bag</Text>
      <Text style={styles.emptyDescription}>
        Start building your disc collection by adding your first disc!
      </Text>
      <Pressable style={styles.emptyButton} onPress={() => router.push('/add-disc')}>
        <FontAwesome name="plus" size={16} color="#fff" />
        <Text style={styles.emptyButtonText}>Add Your First Disc</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          <DiscCardSkeleton />
          <DiscCardSkeleton />
          <DiscCardSkeleton />
          <DiscCardSkeleton />
          <DiscCardSkeleton />
        </View>
      </View>
    );
  }

  const renderProtectDiscsBanner = () => {
    if (discs.length === 0) return null;

    const bannerStyles = {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : Colors.violet[50],
      borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : Colors.violet[100],
    };

    const iconBgColor = isDark ? 'rgba(139, 92, 246, 0.2)' : '#fff';
    const subtitleColor = isDark ? '#aaa' : '#666';

    return (
      <Pressable style={[styles.protectBanner, bannerStyles]} onPress={() => router.push('/order-stickers')}>
        <RNView style={styles.protectBannerContent}>
          <RNView style={[styles.protectBannerIcon, { backgroundColor: iconBgColor }]}>
            <FontAwesome name="shield" size={18} color={isDark ? '#fff' : Colors.violet.primary} />
          </RNView>
          <RNView style={styles.protectBannerText}>
            <Text style={styles.protectBannerTitle}>Protect Your Collection</Text>
            <Text style={[styles.protectBannerSubtitle, { color: subtitleColor }]}>
              Add QR stickers to help finders contact you
            </Text>
          </RNView>
          <FontAwesome name="chevron-right" size={14} color={isDark ? '#888' : '#999'} />
        </RNView>
      </Pressable>
    );
  };

  const renderFillBagBanner = () => {
    if (discs.length < 3) return null; // Need at least 3 discs for meaningful analysis

    const bannerStyles = {
      backgroundColor: isDark ? 'rgba(243, 156, 18, 0.15)' : '#FFF8E7',
      borderColor: isDark ? 'rgba(243, 156, 18, 0.3)' : '#FFE4B5',
    };

    const iconBgColor = isDark ? 'rgba(243, 156, 18, 0.2)' : '#fff';
    const subtitleColor = isDark ? '#aaa' : '#666';

    return (
      <Pressable style={[styles.protectBanner, bannerStyles]} onPress={() => router.push('/disc-recommendations')}>
        <RNView style={styles.protectBannerContent}>
          <RNView style={[styles.protectBannerIcon, { backgroundColor: iconBgColor }]}>
            <FontAwesome name="lightbulb-o" size={18} color={isDark ? '#fbbf24' : '#F39C12'} />
          </RNView>
          <RNView style={styles.protectBannerText}>
            <Text style={styles.protectBannerTitle}>Fill Your Bag</Text>
            <Text style={[styles.protectBannerSubtitle, { color: subtitleColor }]}>
              Get AI-powered disc recommendations
            </Text>
          </RNView>
          <FontAwesome name="chevron-right" size={14} color={isDark ? '#888' : '#999'} />
        </RNView>
      </Pressable>
    );
  };

  const renderListHeader = () => (
    <>
      {renderProtectDiscsBanner()}
      {renderFillBagBanner()}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={discs}
        renderItem={renderDiscCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, discs.length === 0 && styles.emptyList]}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Floating Add Button - Always show when not in empty state */}
      {discs.length > 0 && (
        <Pressable style={styles.fab} onPress={() => router.push('/add-disc')}>
          <FontAwesome name="plus" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  discCard: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: 12,
  },
  discInfo: {
    flex: 1,
  },
  discNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  discName: {
    fontSize: 18,
    fontWeight: '600',
  },
  recoveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recoveryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  surrenderedBadge: {
    backgroundColor: '#9B59B6',
  },
  aiBadge: {
    backgroundColor: '#3498DB',
  },
  discDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  discMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  discFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  rainbowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  rainbowSlice: {
    flex: 1,
    height: '100%',
  },
  colorText: {
    fontSize: 12,
    color: '#666',
  },
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoCountText: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.violet.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.violet.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  protectBanner: {
    backgroundColor: Colors.violet[50],
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.violet[100],
  },
  protectBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  protectBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  protectBannerText: {
    flex: 1,
  },
  protectBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  protectBannerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
});
