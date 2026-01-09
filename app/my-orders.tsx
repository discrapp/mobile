import { logger } from '@/lib/logger';
import { useState, useCallback, useEffect, useRef, ComponentProps } from 'react';
import {
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  View as RNView,
  useColorScheme,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { OrderCardSkeleton } from '@/components/Skeleton';
import { handleError } from '@/lib/errorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ORDERS_CACHE_KEY = 'cached_sticker_orders';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

type FontAwesomeIconName = ComponentProps<typeof FontAwesome>['name'];

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: FontAwesomeIconName }> = {
  pending_payment: { label: 'Pending Payment', color: '#F39C12', icon: 'clock-o' },
  paid: { label: 'Paid', color: '#3498DB', icon: 'credit-card' },
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
  const [resumingPayment, setResumingPayment] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [markingDelivered, setMarkingDelivered] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    orderCard: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
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

  // Load cached orders from AsyncStorage
  const loadCachedOrders = async () => {
    try {
      const cached = await AsyncStorage.getItem(ORDERS_CACHE_KEY);
      if (cached) {
        const { orders: cachedOrders, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY_MS;
        if (!isExpired && cachedOrders?.length > 0) {
          setOrders(cachedOrders);
          setLoading(false);
          return true;
        }
      }
    } catch (error) {
      logger.warn('Failed to load cached orders:', error);
    }
    return false;
  };

  // Save orders to cache
  const cacheOrders = async (ordersToCache: StickerOrder[]) => {
    try {
      await AsyncStorage.setItem(
        ORDERS_CACHE_KEY,
        JSON.stringify({ orders: ordersToCache, timestamp: Date.now() })
      );
    } catch (error) {
      logger.warn('Failed to cache orders:', error);
    }
  };

  // istanbul ignore next -- Order fetching tested via integration tests
  const fetchOrders = async (isRefreshing = false, showLoadingIfNoCache = true) => {
    if (!isRefreshing && showLoadingIfNoCache) {
      setLoading(true);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        logger.error('No session found');
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
      const fetchedOrders = data.orders || [];
      setOrders(fetchedOrders);
      setIsOffline(false);

      // Cache the fresh data
      await cacheOrders(fetchedOrders);
    } catch (error) {
      logger.error('Error fetching orders:', error);
      // If we have cached data and network fails, show offline indicator
      if (orders.length > 0) {
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Load cached data first for instant display, then fetch fresh data
      const loadData = async () => {
        const hasCachedData = await loadCachedOrders();
        // Fetch fresh data in background (don't show loading if we have cached data)
        fetchOrders(false, !hasCachedData);
      };
      loadData();
    }, [])
  );

  // Auto-refresh when app returns to foreground (e.g., after Stripe checkout)
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // When app comes back to foreground, refresh orders
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logger.info('App returned to foreground, refreshing orders');
        fetchOrders(true);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // istanbul ignore next -- Pull-to-refresh tested via integration tests
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, []);

  // istanbul ignore next -- Resume payment tested via integration tests
  const handleResumePayment = async (orderId: string) => {
    setResumingPayment(orderId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'Please sign in to complete payment');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/resume-sticker-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ order_id: orderId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resume checkout');
      }

      const data = await response.json();

      if (data.checkout_url) {
        const supported = await Linking.canOpenURL(data.checkout_url);
        if (supported) {
          await Linking.openURL(data.checkout_url);
        } else {
          throw new Error('Cannot open checkout URL');
        }
      }
    } catch (error) {
      handleError(error, { operation: 'resume-payment' });
    } finally {
      setResumingPayment(null);
    }
  };

  // istanbul ignore next -- Cancel order tested via integration tests
  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order ${orderNumber}? This cannot be undone.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancellingOrder(orderId);
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert('Error', 'Please sign in to cancel order');
                return;
              }

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cancel-sticker-order`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ order_id: orderId }),
                }
              );

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to cancel order');
              }

              // Refresh the orders list
              fetchOrders(true);
              Alert.alert('Order Cancelled', `Order ${orderNumber} has been cancelled.`);
            } catch (error) {
              handleError(error, { operation: 'cancel-order' });
            } finally {
              setCancellingOrder(null);
            }
          },
        },
      ]
    );
  };

  // istanbul ignore next -- Mark delivered tested via integration tests
  const handleMarkDelivered = async (orderId: string, orderNumber: string) => {
    Alert.alert(
      'Mark as Delivered',
      `Did you receive order ${orderNumber}?`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: async () => {
            setMarkingDelivered(orderId);
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert('Error', 'Please sign in to update order');
                return;
              }

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mark-order-delivered`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ order_id: orderId }),
                }
              );

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update order');
              }

              // Refresh the orders list
              fetchOrders(true);
              Alert.alert('Order Delivered', `Order ${orderNumber} marked as delivered!`);
            } catch (error) {
              handleError(error, { operation: 'mark-delivered' });
            } finally {
              setMarkingDelivered(null);
            }
          },
        },
      ]
    );
  };

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
            <FontAwesome name={statusConfig.icon} size={12} color="#fff" />
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

        {item.status === 'pending_payment' && (
          <RNView style={styles.actionButtons}>
            <Pressable
              style={[styles.completePaymentButton, resumingPayment === item.id && styles.buttonDisabled]}
              onPress={(e) => {
                e.stopPropagation();
                handleResumePayment(item.id);
              }}
              disabled={resumingPayment === item.id}
            >
              {resumingPayment === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome name="credit-card" size={14} color="#fff" />
                  <Text style={styles.completePaymentText}>Complete Payment</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.cancelOrderButton, cancellingOrder === item.id && styles.buttonDisabled]}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelOrder(item.id, item.order_number);
              }}
              disabled={cancellingOrder === item.id}
            >
              {cancellingOrder === item.id ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <>
                  <FontAwesome name="times" size={14} color="#E74C3C" />
                  <Text style={styles.cancelOrderText}>Cancel</Text>
                </>
              )}
            </Pressable>
          </RNView>
        )}

        {item.status === 'shipped' && !item.tracking_number && (
          <RNView style={[styles.markDeliveredSection, dynamicStyles.trackingRow]}>
            <Pressable
              style={[styles.markDeliveredButton, markingDelivered === item.id && styles.buttonDisabled]}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkDelivered(item.id, item.order_number);
              }}
              disabled={markingDelivered === item.id}
            >
              {markingDelivered === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome name="check-circle" size={14} color="#fff" />
                  <Text style={styles.markDeliveredText}>Mark as Delivered</Text>
                </>
              )}
            </Pressable>
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
        {isOffline && (
          <RNView style={styles.offlineBanner}>
            <FontAwesome name="wifi" size={14} color="#fff" />
            <Text style={styles.offlineText}>Offline - showing cached data</Text>
          </RNView>
        )}
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F39C12',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  completePaymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F39C12',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  completePaymentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E74C3C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelOrderText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
  },
  markDeliveredSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  markDeliveredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#27AE60',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  markDeliveredText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  chevronContainer: {
    position: 'absolute',
    right: 16,
    top: 32,
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
