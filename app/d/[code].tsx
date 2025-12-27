import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

/**
 * Deep link handler for QR code scans.
 * URL format: com.discr.app://d/ABC123 or https://discrapp.com/d/ABC123
 *
 * This route handles incoming QR code scans from the native camera.
 * It looks up the disc and redirects appropriately:
 * - If user owns the disc: redirect to disc detail page
 * - If disc is claimable (abandoned): redirect to claim page
 * - If user doesn't own disc: redirect to found-disc tab with the code pre-filled
 */
export default function DeepLinkHandler() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!code) {
      setError('Invalid QR code');
      return;
    }

    handleQRCode(code.toUpperCase());
  }, [code, authLoading, user]);

  const handleQRCode = async (qrCode: string) => {
    try {
      // Call the lookup API
      const { data: session } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/lookup-qr-code?code=${qrCode}`,
        { headers }
      );

      const data = await response.json();

      if (!data.found) {
        setError('No disc found with this QR code');
        return;
      }

      // If user owns this disc, go to detail page
      if (data.is_owner) {
        router.replace(`/disc/${data.disc.id}`);
        return;
      }

      // istanbul ignore next -- Claimable disc flow tested via integration tests
      if (data.is_claimable) {
        router.replace({
          pathname: '/claim-disc',
          params: {
            discId: data.disc.id,
            discName: data.disc.name || '',
            discManufacturer: data.disc.manufacturer || '',
            discMold: data.disc.mold || '',
            discPlastic: data.disc.plastic || '',
            discColor: data.disc.color || '',
            discPhotoUrl: data.disc.photo_url || '',
          },
        });
        return;
      }

      // Otherwise, go to found-disc tab with the result
      router.replace({
        pathname: '/(tabs)/found-disc',
        params: { scannedCode: qrCode },
      });
    } catch {
      setError('Failed to look up QR code');
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text
          style={styles.linkText}
          onPress={() => router.replace('/(tabs)/found-disc')}
        >
          Go to Found Disc
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.violet.primary} />
      <Text style={styles.loadingText}>Looking up disc...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  linkText: {
    fontSize: 16,
    color: Colors.violet.primary,
    textDecorationLine: 'underline',
  },
});
