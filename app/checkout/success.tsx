import { useEffect } from 'react';
import { View as RNView, StyleSheet, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';

export default function CheckoutSuccessScreen() {
  const { order_id } = useLocalSearchParams<{ order_id?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // Navigate to order detail or home after 3 seconds
    // istanbul ignore next -- Deep link navigation tested via integration tests
    const timer = setTimeout(() => {
      if (order_id) {
        router.replace(`/orders/${order_id}`);
      } else {
        router.replace('/(tabs)');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [order_id]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#fff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      alignItems: 'center',
      padding: 20,
    },
    emoji: {
      fontSize: 64,
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#27AE60',
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: isDark ? '#ccc' : '#666',
      marginBottom: 8,
      textAlign: 'center',
    },
    orderId: {
      fontSize: 14,
      color: isDark ? '#999' : '#666',
      marginTop: 8,
      textAlign: 'center',
    },
    redirect: {
      fontSize: 14,
      color: isDark ? '#999' : '#666',
      marginTop: 24,
      textAlign: 'center',
    },
  });

  return (
    <RNView style={styles.container}>
      <RNView style={styles.content}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.message}>
          Your order has been placed successfully.
        </Text>
        {order_id && (
          <Text style={styles.orderId}>Order ID: {order_id}</Text>
        )}
        <Text style={styles.redirect}>
          Returning to the app...
        </Text>
      </RNView>
    </RNView>
  );
}
