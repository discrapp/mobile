import { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  View as RNView,
  useColorScheme,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { OrderCardSkeleton } from '@/components/Skeleton';

interface StickerOrder {
  id: string;
  order_number: string;
  quantity: number;
  total_price_cents: number;
  status: string;
  tracking_number: string | null;
  created_at: string;
  shipped_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending_payment: { label: 'Pending Payment', color: '#F39C12', icon: 'clock-o' },
  paid: { label: 'Order Placed', color: '#3498DB', icon: 'check' },
  processing: { label: 'Processing', color: '#9B59B6', icon: 'cog' },
  printed: { label: 'Printed', color: '#1ABC9C', icon: 'print' },
  shipped: { label: 'Shipped', color: '#27AE60', icon: 'truck' },
  delivered: { label: 'Delivered', color: '#27AE60', icon: 'check-circle' },
  cancelled: { label: 'Cancelled', color: '#E74C3C', icon: 'times-circle' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MyOrdersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [orders, setOrders] = useState<StickerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#000' : '#fff',
    },
    orderCard: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderColor: isDark ? '#333' : 'rgba(150, 150, 150, 0.2)',
    },
    orderDate: {
      color: isDark ? '#999' : '#666',
    },
    orderDetailText: {
      color: isDark ? '#999' : '#666',
    },
    trackingRow: {
      borderTopColor: isDark ? '#333' : '#f0f0f0',
    },
    emptyDescription: {
      color: isDark ? '#999' : '#666',
    },
  };

  // istanbul ignore next -- Order fetching tested via integration tests
  const fetchOrders = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session found');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-sticker-orders`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  // istanbul ignore next -- Pull-to-refresh tested via integration tests
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, []);

  const renderOrderCard = ({ item }: { item: StickerOrder }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.paid;

    return (
      <Pressable
        style={[styles.orderCard, dynamicStyles.orderCard]}
        onPress={() => router.push(`/orders/${item.id}`)}
      >
        <RNView style={styles.orderHeader}>
          <RNView>
            <Text style={styles.orderNumber}>{item.order_number}</Text>
            <Text style={[styles.orderDate, dynamicStyles.orderDate]}>{formatDate(item.created_at)}</Text>
          </RNView>
          <RNView style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <FontAwesome name={statusConfig.icon as any} size={12} color="#fff" />
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </RNView>
        </RNView>

        <View style={styles.orderDivider} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

        <RNView style={styles.orderDetails}>
          <RNView style={styles.orderDetailItem}>
            <FontAwesome name="qrcode" size={16} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.orderDetailText, dynamicStyles.orderDetailText]}>
              {item.quantity} sticker{item.quantity !== 1 ? 's' : ''}
            </Text>
          </RNView>
          <RNView style={styles.orderDetailItem}>
            <FontAwesome name="dollar" size={16} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.orderDetailText, dynamicStyles.orderDetailText]}>
              ${(item.total_price_cents / 100).toFixed(2)}
            </Text>
          </RNView>
        </RNView>

        {item.tracking_number && (
          <RNView style={[styles.trackingRow, dynamicStyles.trackingRow]}>
            <FontAwesome name="truck" size={14} color={Colors.violet.primary} />
            <Text style={styles.trackingText}>Tracking: {item.tracking_number}</Text>
          </RNView>
        )}

        <RNView style={styles.chevronContainer}>
          <FontAwesome name="chevron-right" size={14} color="#ccc" />
        </RNView>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <RNView style={styles.emptyState}>
      <FontAwesome name="shopping-bag" size={64} color="#ccc" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={[styles.emptyDescription, dynamicStyles.emptyDescription]}>
        Order QR code stickers to protect your discs and help finders contact you.
      </Text>
      <Pressable style={styles.orderButton} onPress={() => router.push('/order-stickers')}>
        <FontAwesome name="plus" size={16} color="#fff" />
        <Text style={styles.orderButtonText}>Order Stickers</Text>
      </Pressable>
    </RNView>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Orders' }} />
        <View style={[styles.container, dynamicStyles.container]}>
          <View style={styles.listContent}>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'My Orders', headerBackTitle: 'Back' }} />
      <View style={[styles.container, dynamicStyles.container]}>
        <FlatList
          data={orders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, orders.length === 0 && styles.emptyList]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />

        {orders.length > 0 && (
          <Pressable style={styles.fab} onPress={() => router.push('/order-stickers')}>
            <FontAwesome name="plus" size={24} color="#fff" />
          </Pressable>
        )}
      </View>
    </>
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
  orderCard: {
    padding: 16,
    paddingRight: 48,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDivider: {
    height: 1,
    marginBottom: 12,
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderDetailText: {
    fontSize: 14,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  trackingText: {
    fontSize: 13,
    color: Colors.violet.primary,
    fontWeight: '500',
  },
  chevronContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -7,
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
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.violet.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  orderButtonText: {
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
});
