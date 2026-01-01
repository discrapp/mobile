import { useState, useCallback, ComponentProps } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  RefreshControl,
  View as RNView,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

type FontAwesomeIconName = ComponentProps<typeof FontAwesome>['name'];

interface ShippingAddress {
  name: string;
  street_address: string;
  street_address_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface StickerOrder {
  id: string;
  order_number: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  status: string;
  tracking_number: string | null;
  created_at: string;
  paid_at: string | null;
  printed_at: string | null;
  shipped_at: string | null;
  shipping_address: ShippingAddress | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: FontAwesomeIconName }> = {
  pending_payment: { label: 'Pending Payment', color: '#F39C12', icon: 'clock-o' },
  paid: { label: 'Order Placed', color: '#3498DB', icon: 'check' },
  processing: { label: 'Processing', color: '#9B59B6', icon: 'cog' },
  printed: { label: 'Printed', color: '#1ABC9C', icon: 'print' },
  shipped: { label: 'Shipped', color: '#27AE60', icon: 'truck' },
  delivered: { label: 'Delivered', color: '#27AE60', icon: 'check-circle' },
  cancelled: { label: 'Cancelled', color: '#E74C3C', icon: 'times-circle' },
};

// Order of statuses for timeline
const STATUS_ORDER = ['paid', 'processing', 'printed', 'shipped', 'delivered'];

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTrackingUrl(trackingNumber: string): string {
  const num = trackingNumber.toUpperCase();

  // USPS
  if (/^\d{20,22}$/.test(num) || /^9[1-4]\d{18,20}$/.test(num)) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }

  // UPS
  if (num.startsWith('1Z')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  }

  // FedEx
  if (/^\d{12,15}$/.test(num) || /^\d{20,22}$/.test(num)) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  }

  // Default to USPS
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [order, setOrder] = useState<StickerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#000' : '#fff',
    },
    errorText: {
      color: isDark ? '#999' : '#666',
    },
    timelineDot: {
      backgroundColor: isDark ? '#444' : '#ddd',
    },
    timelineDotCurrentBorder: {
      borderColor: isDark ? '#1a1a1a' : '#fff',
    },
    timelineLine: {
      backgroundColor: isDark ? '#444' : '#ddd',
    },
    timelineLabel: {
      color: isDark ? '#666' : '#999',
    },
    timelineLabelActive: {
      color: isDark ? '#fff' : '#333',
    },
    timelineDate: {
      color: isDark ? '#999' : '#666',
    },
    detailCard: {
      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
    },
    detailLabel: {
      color: isDark ? '#999' : '#666',
    },
    trackingCard: {
      backgroundColor: isDark ? '#1a1a1a' : Colors.violet[50],
    },
    trackingIconContainer: {
      backgroundColor: isDark ? '#2a2a2a' : '#fff',
    },
    trackingHint: {
      color: isDark ? '#999' : '#666',
    },
    addressCard: {
      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
    },
    addressLine: {
      color: isDark ? '#999' : '#666',
    },
    helpText: {
      color: isDark ? '#999' : '#666',
    },
  };

  const fetchOrder = async (isRefreshing = false) => {
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
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-sticker-order?order_id=${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrder();
    }, [id])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder(true);
  }, []);

  const handleTrackPackage = async () => {
    if (!order?.tracking_number) return;
    const url = getTrackingUrl(order.tracking_number);
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.violet.primary} />
        </View>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View style={styles.centerContainer}>
          <FontAwesome name="exclamation-circle" size={48} color="#ccc" />
          <Text style={[styles.errorText, dynamicStyles.errorText]}>Order not found</Text>
        </View>
      </>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.paid;
  const currentStatusIndex = STATUS_ORDER.indexOf(order.status);

  return (
    <>
      <Stack.Screen
        options={{
          title: order.order_number,
          headerBackTitle: 'Orders',
        }}
      />
      <ScrollView
        style={[styles.container, dynamicStyles.container]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Header */}
        <RNView style={[styles.statusHeader, { backgroundColor: statusConfig.color }]}>
          <FontAwesome name={statusConfig.icon} size={32} color="#fff" />
          <Text style={styles.statusHeaderText}>{statusConfig.label}</Text>
          {order.status === 'shipped' && order.tracking_number && (
            <Pressable style={styles.trackButton} onPress={handleTrackPackage}>
              <FontAwesome name="external-link" size={14} color={statusConfig.color} />
              <Text style={[styles.trackButtonText, { color: statusConfig.color }]}>
                Track Package
              </Text>
            </Pressable>
          )}
        </RNView>

        {/* Status Timeline */}
        <RNView style={styles.section}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <RNView style={styles.timeline}>
            {STATUS_ORDER.map((status, index) => {
              const config = STATUS_CONFIG[status];
              const isPast = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <RNView key={status} style={styles.timelineItem}>
                  <RNView style={styles.timelineLeft}>
                    <RNView
                      style={[
                        styles.timelineDot,
                        dynamicStyles.timelineDot,
                        isPast && { backgroundColor: config.color },
                        isCurrent && styles.timelineDotCurrent,
                        isCurrent && dynamicStyles.timelineDotCurrentBorder,
                      ]}
                    >
                      {isPast && <FontAwesome name="check" size={10} color="#fff" />}
                    </RNView>
                    {index < STATUS_ORDER.length - 1 && (
                      <RNView
                        style={[
                          styles.timelineLine,
                          dynamicStyles.timelineLine,
                          isPast && index < currentStatusIndex && { backgroundColor: config.color },
                        ]}
                      />
                    )}
                  </RNView>
                  <RNView style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, dynamicStyles.timelineLabel, isPast && styles.timelineLabelActive, isPast && dynamicStyles.timelineLabelActive]}>
                      {config.label}
                    </Text>
                    {status === 'paid' && order.paid_at && (
                      <Text style={[styles.timelineDate, dynamicStyles.timelineDate]}>{formatDateTime(order.paid_at)}</Text>
                    )}
                    {status === 'printed' && order.printed_at && (
                      <Text style={[styles.timelineDate, dynamicStyles.timelineDate]}>{formatDateTime(order.printed_at)}</Text>
                    )}
                    {status === 'shipped' && order.shipped_at && (
                      <Text style={[styles.timelineDate, dynamicStyles.timelineDate]}>{formatDateTime(order.shipped_at)}</Text>
                    )}
                  </RNView>
                </RNView>
              );
            })}
          </RNView>
        </RNView>

        {/* Order Details */}
        <RNView style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <RNView style={[styles.detailCard, dynamicStyles.detailCard]}>
            <RNView style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Order Number</Text>
              <Text style={styles.detailValue}>{order.order_number}</Text>
            </RNView>
            <RNView style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Order Date</Text>
              <Text style={styles.detailValue}>{formatDate(order.created_at)}</Text>
            </RNView>
            <RNView style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Quantity</Text>
              <Text style={styles.detailValue}>
                {order.quantity} sticker{order.quantity !== 1 ? 's' : ''}
              </Text>
            </RNView>
            <View style={styles.detailDivider} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
            <RNView style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Subtotal</Text>
              <Text style={styles.detailValue}>
                ${((order.quantity * order.unit_price_cents) / 100).toFixed(2)}
              </Text>
            </RNView>
            <RNView style={styles.detailRow}>
              <Text style={[styles.detailLabel, dynamicStyles.detailLabel]}>Shipping</Text>
              <Text style={[styles.detailValue, styles.freeText]}>FREE</Text>
            </RNView>
            <View style={styles.detailDivider} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
            <RNView style={styles.detailRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${(order.total_price_cents / 100).toFixed(2)}
              </Text>
            </RNView>
          </RNView>
        </RNView>

        {/* Tracking Info */}
        {order.tracking_number && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Tracking Information</Text>
            <Pressable style={[styles.trackingCard, dynamicStyles.trackingCard]} onPress={handleTrackPackage}>
              <RNView style={[styles.trackingIconContainer, dynamicStyles.trackingIconContainer]}>
                <FontAwesome name="truck" size={24} color={Colors.violet.primary} />
              </RNView>
              <RNView style={styles.trackingInfo}>
                <Text style={styles.trackingNumber}>{order.tracking_number}</Text>
                <Text style={[styles.trackingHint, dynamicStyles.trackingHint]}>Tap to track your package</Text>
              </RNView>
              <FontAwesome name="chevron-right" size={16} color="#ccc" />
            </Pressable>
          </RNView>
        )}

        {/* Shipping Address */}
        {order.shipping_address && (
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <RNView style={[styles.addressCard, dynamicStyles.addressCard]}>
              <FontAwesome name="map-marker" size={20} color={Colors.violet.primary} />
              <RNView style={styles.addressText}>
                <Text style={styles.addressName}>{order.shipping_address.name}</Text>
                <Text style={[styles.addressLine, dynamicStyles.addressLine]}>{order.shipping_address.street_address}</Text>
                {order.shipping_address.street_address_2 && (
                  <Text style={[styles.addressLine, dynamicStyles.addressLine]}>{order.shipping_address.street_address_2}</Text>
                )}
                <Text style={[styles.addressLine, dynamicStyles.addressLine]}>
                  {order.shipping_address.city}, {order.shipping_address.state}{' '}
                  {order.shipping_address.postal_code}
                </Text>
                <Text style={[styles.addressLine, dynamicStyles.addressLine]}>{order.shipping_address.country}</Text>
              </RNView>
            </RNView>
          </RNView>
        )}

        {/* Help Section */}
        <RNView style={styles.section}>
          <Text style={[styles.helpText, dynamicStyles.helpText]}>
            Need help with your order? Contact us at{' '}
            <Text
              style={styles.helpLink}
              onPress={() => Linking.openURL('mailto:support@discrapp.com')}
            >
              support@discrapp.com
            </Text>
          </Text>
        </RNView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
  },
  statusHeader: {
    alignItems: 'center',
    padding: 32,
  },
  statusHeaderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  timeline: {
    marginLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 50,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCurrent: {
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineContent: {
    marginLeft: 12,
    paddingBottom: 16,
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
  },
  timelineLabelActive: {
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: 12,
    marginTop: 2,
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailDivider: {
    height: 1,
    marginVertical: 8,
  },
  freeText: {
    color: '#27AE60',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.violet.primary,
  },
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  trackingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingInfo: {
    flex: 1,
    marginLeft: 16,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.violet.primary,
  },
  trackingHint: {
    fontSize: 12,
    marginTop: 2,
  },
  addressCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  addressText: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    lineHeight: 20,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  helpLink: {
    color: Colors.violet.primary,
    fontWeight: '500',
  },
});
