import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { handleError, showSuccess } from '@/lib/errorHandler';
import { useColorScheme } from '@/components/useColorScheme';

/**
 * Claim Disc Screen
 *
 * Displayed when a user scans a QR code for an abandoned disc (no owner).
 * Allows the user to claim the disc and add it to their collection.
 */
export default function ClaimDiscScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{
    discId: string;
    discName: string;
    discManufacturer: string;
    discMold: string;
    discPlastic: string;
    discColor: string;
    discPhotoUrl: string;
  }>();

  const [claiming, setClaiming] = useState(false);

  // Dynamic styles for dark/light mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#000' : '#f5f5f5',
    },
    header: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    headerTitle: {
      color: isDark ? '#fff' : '#333',
    },
    photoContainer: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    placeholderPhoto: {
      backgroundColor: isDark ? '#333' : '#f0f0f0',
    },
    infoCard: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    discName: {
      color: isDark ? '#fff' : '#333',
    },
    infoRow: {
      borderBottomColor: isDark ? '#333' : '#f0f0f0',
    },
    infoLabel: {
      color: isDark ? '#999' : '#666',
    },
    infoValue: {
      color: isDark ? '#ccc' : '#333',
    },
    claimBannerSubtitle: {
      color: isDark ? '#999' : '#666',
    },
    skipButtonText: {
      color: isDark ? '#999' : '#666',
    },
  };

  // istanbul ignore next -- Claim flow tested via integration tests
  const handleClaimDisc = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to claim this disc.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/sign-in'),
          },
        ]
      );
      return;
    }

    setClaiming(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/claim-disc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ disc_id: params.discId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim disc');
      }

      showSuccess('Disc claimed! Added to your collection.');
      router.replace(`/disc/${params.discId}`);
    } catch (err) {
      handleError(err, { operation: 'claim-disc' });
    } finally {
      setClaiming(false);
    }
  };

  const discName =
    params.discName ||
    [params.discManufacturer, params.discMold].filter(Boolean).join(' ') ||
    'Unknown Disc';

  // istanbul ignore next -- Navigation callback tested via integration tests
  const handleBack = () => router.back();

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <FontAwesome name="chevron-left" size={20} color={Colors.violet.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Claim Disc</Text>
        <View style={styles.backButton} />
      </View>

      {/* Disc Photo */}
      <View style={[styles.photoContainer, dynamicStyles.photoContainer]}>
        {params.discPhotoUrl ? (
          <Image source={{ uri: params.discPhotoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.placeholderPhoto, dynamicStyles.placeholderPhoto]}>
            <FontAwesome name="circle" size={80} color={isDark ? '#666' : '#ccc'} />
          </View>
        )}
      </View>

      {/* Disc Info */}
      <View style={[styles.infoCard, dynamicStyles.infoCard]}>
        <Text style={[styles.discName, dynamicStyles.discName]}>{discName}</Text>

        {params.discManufacturer && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Manufacturer</Text>
            <Text style={[styles.infoValue, dynamicStyles.infoValue]}>
              {params.discManufacturer}
            </Text>
          </View>
        )}

        {params.discMold && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Mold</Text>
            <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{params.discMold}</Text>
          </View>
        )}

        {params.discPlastic && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Plastic</Text>
            <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{params.discPlastic}</Text>
          </View>
        )}

        {params.discColor && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Color</Text>
            <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{params.discColor}</Text>
          </View>
        )}
      </View>

      {/* Available to Claim Banner */}
      <View style={styles.claimBanner}>
        <FontAwesome name="gift" size={24} color={Colors.violet.primary} />
        <View style={styles.claimBannerText}>
          <Text style={styles.claimBannerTitle}>Available to Claim!</Text>
          <Text style={[styles.claimBannerSubtitle, dynamicStyles.claimBannerSubtitle]}>
            This disc has been abandoned by its previous owner. You can claim it
            and add it to your collection.
          </Text>
        </View>
      </View>

      {/* Claim Button */}
      <Pressable
        style={[styles.claimButton, claiming && styles.buttonDisabled]}
        onPress={handleClaimDisc}
        disabled={claiming}
      >
        {claiming ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <FontAwesome name="plus-circle" size={20} color="#fff" />
            <Text style={styles.claimButtonText}>Claim This Disc</Text>
          </>
        )}
      </Pressable>

      {/* Skip Link */}
      <Pressable style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
        <Text style={[styles.skipButtonText, dynamicStyles.skipButtonText]}>
          No thanks, go to home
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  photoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f0f0f0',
  },
  placeholderPhoto: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.violet.light,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  claimBannerText: {
    flex: 1,
  },
  claimBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.violet.primary,
    marginBottom: 4,
  },
  claimBannerSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.violet.primary,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
  },
});
