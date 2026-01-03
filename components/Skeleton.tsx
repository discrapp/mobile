import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, useColorScheme } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated skeleton loader component with shimmer effect.
 * Adapts to light/dark mode automatically.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#333' : '#e0e0e0',
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton card for disc list items.
 */
export function DiscCardSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      style={[
        styles.discCard,
        { backgroundColor: isDark ? '#1e1e1e' : '#fff' },
      ]}
    >
      {/* Photo placeholder */}
      <Skeleton width={80} height={80} borderRadius={8} />

      {/* Content */}
      <Animated.View style={styles.discCardContent}>
        {/* Title */}
        <Skeleton width="70%" height={18} style={styles.mb8} />
        {/* Subtitle */}
        <Skeleton width="50%" height={14} style={styles.mb8} />
        {/* Flight numbers */}
        <Skeleton width="40%" height={12} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Skeleton for disc detail screen.
 */
export function DiscDetailSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View style={styles.detailContainer}>
      {/* Photo gallery placeholder */}
      <Skeleton width="100%" height={300} borderRadius={0} style={styles.mb16} />

      {/* Title section */}
      <Animated.View style={styles.detailSection}>
        <Skeleton width="60%" height={28} style={styles.mb8} />
        <Skeleton width="40%" height={16} />
      </Animated.View>

      {/* Flight numbers */}
      <Animated.View
        style={[
          styles.flightNumbersCard,
          { backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5' },
        ]}
      >
        <Animated.View style={styles.flightNumbersRow}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View key={i} style={styles.flightNumberItem}>
              <Skeleton width={40} height={40} borderRadius={20} style={styles.mb4} />
              <Skeleton width={30} height={12} />
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>

      {/* Details section */}
      <Animated.View style={styles.detailSection}>
        <Skeleton width="30%" height={14} style={styles.mb8} />
        <Skeleton width="80%" height={16} style={styles.mb16} />
        <Skeleton width="30%" height={14} style={styles.mb8} />
        <Skeleton width="60%" height={16} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Skeleton for form fields (e.g., address form).
 */
export function FormFieldSkeleton({ label = true }: { label?: boolean }) {
  return (
    <Animated.View style={styles.formField}>
      {label && <Skeleton width={80} height={14} style={styles.mb6} />}
      <Skeleton width="100%" height={48} borderRadius={8} />
    </Animated.View>
  );
}

/**
 * Skeleton for recovery/pending item cards.
 */
export function RecoveryCardSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      style={[
        styles.recoveryCard,
        { backgroundColor: isDark ? '#1e1e1e' : '#fff' },
      ]}
    >
      <Animated.View style={styles.recoveryCardHeader}>
        <Skeleton width={50} height={50} borderRadius={25} />
        <Animated.View style={styles.recoveryCardContent}>
          <Skeleton width="60%" height={16} style={styles.mb6} />
          <Skeleton width="80%" height={14} />
        </Animated.View>
      </Animated.View>
      <Skeleton width="100%" height={36} borderRadius={8} style={styles.mt12} />
    </Animated.View>
  );
}

/**
 * Skeleton for order cards in My Orders screen.
 */
export function OrderCardSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      style={[
        styles.orderCard,
        { backgroundColor: isDark ? '#1e1e1e' : '#fff' },
      ]}
    >
      {/* Header row: order number and status badge */}
      <Animated.View style={styles.orderCardHeader}>
        <Animated.View>
          <Skeleton width={120} height={16} style={styles.mb4} />
          <Skeleton width={80} height={13} />
        </Animated.View>
        <Skeleton width={100} height={24} borderRadius={12} />
      </Animated.View>

      {/* Divider */}
      <Animated.View
        style={[styles.orderDivider, { backgroundColor: isDark ? '#333' : '#eee' }]}
      />

      {/* Order details */}
      <Animated.View style={styles.orderCardDetails}>
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Skeleton for profile header in Profile screen.
 */
export function ProfileHeaderSkeleton() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      style={[
        styles.profileHeader,
        { backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8' },
      ]}
    >
      {/* Avatar */}
      <Skeleton width={100} height={100} borderRadius={50} style={styles.mb16} />
      {/* Name */}
      <Skeleton width={150} height={24} style={styles.mb8} />
      {/* Email */}
      <Skeleton width={200} height={16} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  discCard: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  discCardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  detailContainer: {
    flex: 1,
  },
  detailSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  flightNumbersCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  flightNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  flightNumberItem: {
    alignItems: 'center',
  },
  formField: {
    marginBottom: 16,
  },
  recoveryCard: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recoveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recoveryCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  orderCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderDivider: {
    height: 1,
    marginBottom: 12,
  },
  orderCardDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  mb4: { marginBottom: 4 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb16: { marginBottom: 16 },
  mt12: { marginTop: 12 },
});
