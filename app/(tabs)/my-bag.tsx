import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  View as RNView,
  useColorScheme,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { getCachedDiscs, setCachedDiscs, isCacheStale } from '@/utils/discCache';
import { DiscCardSkeleton } from '@/components/Skeleton';

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
  flight_numbers: FlightNumbers;
  reward_amount?: string;
  notes?: string;
  created_at: string;
  photos: DiscPhoto[];
  active_recovery?: ActiveRecovery | null;
  was_surrendered?: boolean;
  surrendered_at?: string | null;
}

// Recovery status labels and colors
const RECOVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  found: { label: 'Found', color: '#F39C12' },
  meetup_proposed: { label: 'Meetup Proposed', color: '#3498DB' },
  meetup_confirmed: { label: 'Meetup Confirmed', color: '#27AE60' },
};

// Color mapping with hex values
const COLOR_MAP: Record<string, string> = {
  Red: '#E74C3C',
  Orange: '#E67E22',
  Yellow: '#F1C40F',
  Green: '#2ECC71',
  Blue: '#3498DB',
  Purple: '#9B59B6',
  Pink: '#E91E63',
  White: '#ECF0F1',
  Black: '#2C3E50',
  Gray: '#95A5A6',
  Multi: 'rainbow',
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
        console.error('No session found');
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
      console.error('Error fetching discs:', error);
      // Only show error if we don't have cached data to display
      if (discs.length === 0) {
        Alert.alert('Error', 'Failed to load your discs. Please try again.');
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
        <View style={styles.photoContainer}>
          {firstPhoto?.photo_url ? (
            <Image source={{ uri: firstPhoto.photo_url }} style={styles.discPhoto} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <FontAwesome name="circle" size={40} color="#ccc" />
            </View>
          )}
        </View>

        {/* Disc Info */}
        <View style={styles.discInfo}>
          <View style={styles.discNameRow}>
            <Text style={styles.discName}>{item.mold || item.name}</Text>
            {item.was_surrendered && (
              <View style={[styles.recoveryBadge, styles.surrenderedBadge]}>
                <FontAwesome name="gift" size={10} color="#fff" />
                <Text style={styles.recoveryBadgeText}>Surrendered</Text>
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
          {item.manufacturer && <Text style={styles.discDetails}>{item.manufacturer}</Text>}
          {item.plastic && <Text style={styles.discMeta}>{item.plastic}</Text>}
          <View style={styles.discFooter}>
            {item.color && (
              <View style={styles.colorBadge}>
                {COLOR_MAP[item.color] === 'rainbow' ? (
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
                        backgroundColor: COLOR_MAP[item.color] || '#666',
                        borderColor:
                          item.color === 'White' ? '#ccc' : 'rgba(0, 0, 0, 0.1)',
                      },
                    ]}
                  />
                )}
                <Text style={styles.colorText}>{item.color}</Text>
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
            <FontAwesome name="shield" size={18} color={Colors.violet.primary} />
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

  return (
    <View style={styles.container}>
      <FlatList
        data={discs}
        renderItem={renderDiscCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, discs.length === 0 && styles.emptyList]}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={renderProtectDiscsBanner}
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
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 12,
  },
  discPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
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
