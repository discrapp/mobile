import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  TouchableOpacity,
  Image,
  View as RNView,
  Text as RNText,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import QRCode from 'react-native-qrcode-svg';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/components/useColorScheme';
import { DiscDetailSkeleton } from '@/components/Skeleton';
import { formatFeeHint } from '@/lib/stripeFees';
import { handleError } from '@/lib/errorHandler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface QRCodeInfo {
  id: string;
  short_code: string;
  status: string;
}

interface ActiveRecovery {
  id: string;
  status: string;
  finder_id: string;
  found_at: string;
}

// Recovery status labels and colors
const RECOVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  found: { label: 'Found', color: '#F39C12' },
  meetup_proposed: { label: 'Meetup Proposed', color: '#3498DB' },
  meetup_confirmed: { label: 'Meetup Confirmed', color: '#27AE60' },
};

interface Disc {
  id: string;
  name: string;
  manufacturer?: string;
  mold?: string;
  category?: string;
  plastic?: string;
  weight?: number;
  color?: string;
  flight_numbers: FlightNumbers;
  reward_amount?: string;
  notes?: string;
  created_at: string;
  photos: DiscPhoto[];
  qr_code_id?: string;
  qr_code?: QRCodeInfo;
  active_recovery?: ActiveRecovery | null;
  was_surrendered?: boolean;
  surrendered_at?: string | null;
}

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

export default function DiscDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const [disc, setDisc] = useState<Disc | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useLayoutEffect(() => {
    // istanbul ignore next -- Header navigation requires device testing
    navigation.setOptions({
      title: disc ? (disc.mold || disc.name) : 'Disc Details',
      headerTintColor: Colors.violet.primary,
      headerBackTitle: 'Back',
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
          <FontAwesome name="chevron-left" size={16} color={Colors.violet.primary} style={{ marginRight: 5 }} />
          <RNText style={{ color: Colors.violet.primary, fontSize: 17 }}>Back</RNText>
        </Pressable>
      ),
      headerRight: disc ? () => (
        <Pressable
          onPress={() => router.push(`/edit-disc/${disc.id}`)}
          hitSlop={8}
          style={{ marginRight: 4, padding: 8 }}>
          <FontAwesome name="edit" size={18} color={Colors.violet.primary} />
        </Pressable>
      ) : undefined,
    });
  }, [disc, navigation, router]);

  useFocusEffect(
    useCallback(() => {
      fetchDiscDetail();
    }, [id])
  );

  const fetchDiscDetail = async () => {
    try {
      setLoading(true);

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
        throw new Error(error.error || 'Failed to fetch disc');
      }

      const discs = await response.json();
      const foundDisc = discs.find((d: Disc) => d.id === id);

      if (!foundDisc) {
        Alert.alert('Error', 'Disc not found');
        router.back();
        return;
      }

      setDisc(foundDisc);
    } catch (error) {
      handleError(error, { operation: 'fetch-disc-detail' });
    } finally {
      setLoading(false);
    }
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleDelete = () => {
    Alert.alert(
      'Delete Disc',
      `Are you sure you want to delete ${disc?.mold || disc?.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  // istanbul ignore next -- Deletion tested via integration tests
  const confirmDelete = async () => {
    if (!disc) return;

    try {
      setDeleting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to delete a disc');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-disc`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ disc_id: disc.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete disc');
      }

      Alert.alert('Success', 'Disc deleted successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      handleError(error, { operation: 'delete-disc' });
    } finally {
      setDeleting(false);
    }
  };

  // istanbul ignore next -- Native camera permission requires device testing
  const startScanning = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to scan QR codes.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setHasScanned(false);
    setScanning(true);
  };

  // istanbul ignore next -- Native barcode scanning requires device testing
  const handleBarcodeScan = (result: BarcodeScanningResult) => {
    if (hasScanned) return;
    setHasScanned(true);
    let scannedCode = result.data;

    // Extract code from URL if QR contains a URL like https://discrapp.com/d/CODE
    if (scannedCode.includes('/d/')) {
      const match = scannedCode.match(/\/d\/([A-Za-z0-9]+)/);
      if (match) {
        scannedCode = match[1];
      }
    }

    setScanning(false);
    linkQrCode(scannedCode);
  };

  // istanbul ignore next -- QR linking tested via integration tests
  const linkQrCode = async (qrCode: string) => {
    if (!disc) return;

    setLinking(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to link a QR code');
        setLinking(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/link-qr-to-disc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ qr_code: qrCode, disc_id: disc.id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'QR code is not assigned to you') {
          Alert.alert(
            'Claim First',
            'You need to claim this QR code first. Go to the Found Disc screen to claim it.',
            [{ text: 'OK' }]
          );
        } else if (data.error === 'QR code must be assigned before linking to a disc') {
          Alert.alert(
            'Claim First',
            'This QR code is unclaimed. Go to the Found Disc screen to claim it first.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', data.error || 'Failed to link QR code');
        }
        return;
      }

      Alert.alert('Success', 'QR code linked to this disc!', [{ text: 'OK' }]);
      // Refresh disc data
      fetchDiscDetail();
    } catch (error) {
      handleError(error, { operation: 'link-qr-code' });
    } finally {
      setLinking(false);
    }
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleUnlinkQrCode = () => {
    Alert.alert(
      'Unlink QR Code',
      'Are you sure you want to remove the QR code from this disc? The QR code will be deleted and cannot be recovered.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: unlinkQrCode,
        },
      ]
    );
  };

  // istanbul ignore next -- QR unlinking tested via integration tests
  const unlinkQrCode = async () => {
    if (!disc) return;

    setUnlinking(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to unlink a QR code');
        setUnlinking(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/unlink-qr-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ disc_id: disc.id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to unlink QR code');
        return;
      }

      Alert.alert('Success', 'QR code removed from this disc', [{ text: 'OK' }]);
      // Refresh disc data
      fetchDiscDetail();
    } catch (error) {
      handleError(error, { operation: 'unlink-qr-code' });
    } finally {
      setUnlinking(false);
    }
  };

  // istanbul ignore next -- Native camera scanning requires device testing
  if (scanning) {
    // Camera permission check
    if (!permission?.granted) {
      return (
        <View style={styles.centerContainer}>
          <FontAwesome name="camera" size={48} color="#ccc" />
          <Text style={styles.errorText}>Camera Permission Required</Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.textButton} onPress={() => setScanning(false)}>
            <Text style={styles.textButtonText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <RNView style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          active={true}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScan}
        />
        <RNView style={styles.scannerOverlay}>
          <RNView style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <Text style={styles.scannerSubtitle}>
              Scan a QR code sticker to link it to this disc
            </Text>
          </RNView>
          <RNView style={styles.scannerFrame}>
            <RNView style={[styles.cornerBorder, styles.topLeft]} />
            <RNView style={[styles.cornerBorder, styles.topRight]} />
            <RNView style={[styles.cornerBorder, styles.bottomLeft]} />
            <RNView style={[styles.cornerBorder, styles.bottomRight]} />
          </RNView>
          <Pressable style={styles.cancelScanButton} onPress={() => setScanning(false)}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </Pressable>
        </RNView>
      </RNView>
    );
  }

  if (linking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>Linking QR code...</Text>
      </View>
    );
  }

  if (unlinking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>Removing QR code...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <DiscDetailSkeleton />
      </ScrollView>
    );
  }

  if (!disc) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Disc not found</Text>
      </View>
    );
  }

  // Filter out photos without valid URLs
  const validPhotos = disc.photos.filter((photo) => photo.photo_url && photo.photo_url.trim() !== '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Surrendered Banner */}
      {disc.was_surrendered && (
        <RNView style={styles.surrenderedBanner}>
          <FontAwesome name="gift" size={18} color="#fff" />
          <Text style={styles.surrenderedBannerText}>This disc was surrendered to you</Text>
        </RNView>
      )}

      {/* Photo Gallery - Circular Display */}
      {validPhotos.length > 0 ? (
        <View style={styles.photoGalleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoGallery}>
            {validPhotos.map((photo) => (
              <View key={photo.id} style={styles.photoWrapper}>
                <Image source={{ uri: photo.photo_url }} style={styles.photo} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <FontAwesome name="circle-o" size={64} color="#ccc" />
          <Text style={styles.photoPlaceholderText}>No photos</Text>
        </View>
      )}

      {/* Photo indicator */}
      {validPhotos.length > 1 && (
        <View style={styles.photoIndicator}>
          <FontAwesome name="camera" size={12} color="#666" />
          <Text style={styles.photoIndicatorText}>
            Swipe to see photos
          </Text>
        </View>
      )}

      {/* Disc Info */}
      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">{disc.mold || disc.name}</Text>

        {/* Recovery Status Banner */}
        {disc.active_recovery && RECOVERY_STATUS_MAP[disc.active_recovery.status] && (
          <Pressable
            style={[styles.recoveryBanner, { backgroundColor: RECOVERY_STATUS_MAP[disc.active_recovery.status].color }]}
            onPress={() => router.push(`/recovery/${disc.active_recovery!.id}`)}
          >
            <FontAwesome name="refresh" size={16} color="#fff" />
            <Text style={styles.recoveryBannerText}>
              {RECOVERY_STATUS_MAP[disc.active_recovery.status].label} - Tap for details
            </Text>
            <FontAwesome name="chevron-right" size={14} color="#fff" />
          </Pressable>
        )}

        {/* Manufacturer */}
        {disc.manufacturer && <Text style={styles.manufacturer} numberOfLines={1} ellipsizeMode="tail">{disc.manufacturer}</Text>}

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          {disc.category && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{disc.category}</Text>
            </View>
          )}

          {disc.plastic && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Plastic</Text>
              <Text style={styles.detailValue}>{disc.plastic}</Text>
            </View>
          )}

          {disc.weight && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{disc.weight}g</Text>
            </View>
          )}

          {disc.color && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Color</Text>
              <View style={styles.colorValue}>
                {COLOR_MAP[disc.color] === 'rainbow' ? (
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
                        backgroundColor: COLOR_MAP[disc.color] || '#666',
                        borderColor: disc.color === 'White' ? '#ccc' : 'rgba(0, 0, 0, 0.1)',
                      },
                    ]}
                  />
                )}
                <Text style={styles.detailValue}>{disc.color}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Flight Numbers */}
        {(disc.flight_numbers.speed ||
          disc.flight_numbers.glide ||
          disc.flight_numbers.turn !== null ||
          disc.flight_numbers.fade !== null) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flight Numbers</Text>
            <View style={styles.flightNumbers}>
              {disc.flight_numbers.speed !== null && (
                <View style={styles.flightNumber}>
                  <Text style={styles.flightNumberLabel}>Speed</Text>
                  <Text style={styles.flightNumberValue}>{disc.flight_numbers.speed}</Text>
                </View>
              )}
              {disc.flight_numbers.glide !== null && (
                <View style={styles.flightNumber}>
                  <Text style={styles.flightNumberLabel}>Glide</Text>
                  <Text style={styles.flightNumberValue}>{disc.flight_numbers.glide}</Text>
                </View>
              )}
              {disc.flight_numbers.turn !== null && (
                <View style={styles.flightNumber}>
                  <Text style={styles.flightNumberLabel}>Turn</Text>
                  <Text style={styles.flightNumberValue}>{disc.flight_numbers.turn}</Text>
                </View>
              )}
              {disc.flight_numbers.fade !== null && (
                <View style={styles.flightNumber}>
                  <Text style={styles.flightNumberLabel}>Fade</Text>
                  <Text style={styles.flightNumberValue}>{disc.flight_numbers.fade}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Reward Amount */}
        {disc.reward_amount && parseFloat(disc.reward_amount) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward Amount</Text>
            <Text style={styles.rewardAmount}>${disc.reward_amount}</Text>
            <Text style={styles.feeHint}>
              {formatFeeHint(parseFloat(disc.reward_amount))} • Venmo: ${parseFloat(disc.reward_amount).toFixed(2)} (free)
            </Text>
          </View>
        )}

        {/* QR Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QR Code</Text>
          {disc.qr_code?.short_code ? (
            <RNView style={styles.qrCodeContainer}>
              <RNView style={styles.qrCodeInner}>
                <QRCode
                  value={`https://discrapp.com/d/${disc.qr_code.short_code}`}
                  size={180}
                  color={Colors.violet.primary}
                  backgroundColor="#fff"
                />
              </RNView>
              <Text style={[styles.qrCodeLabel, { color: isDark ? '#fff' : Colors.violet.primary }]}>{disc.qr_code.short_code}</Text>
              <Text style={styles.qrCodeHint}>Scan with phone camera to find this disc</Text>
              <Pressable style={styles.unlinkButton} onPress={handleUnlinkQrCode}>
                <FontAwesome name="unlink" size={14} color="#E74C3C" />
                <Text style={styles.unlinkButtonText}>Remove QR Code</Text>
              </Pressable>
            </RNView>
          ) : (
            <Pressable
              style={[styles.linkQrButton, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', borderColor: isDark ? '#333' : '#eee' }]}
              onPress={startScanning}>
              <FontAwesome name="qrcode" size={20} color={isDark ? '#a78bfa' : Colors.violet.primary} />
              <RNView style={styles.linkQrTextContainer}>
                <Text style={[styles.linkQrButtonText, { color: isDark ? '#a78bfa' : Colors.violet.primary }]}>Link QR Code</Text>
                <Text style={[styles.linkQrHint, { color: isDark ? '#666' : '#999' }]}>Scan a QR sticker to attach to this disc</Text>
              </RNView>
              <FontAwesome name="camera" size={16} color={isDark ? '#a78bfa' : Colors.violet.primary} />
            </Pressable>
          )}
        </View>

        {/* Notes */}
        {disc.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{disc.notes}</Text>
          </View>
        )}

        {/* Delete Button */}
        <Pressable
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="trash" size={16} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Disc</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  photoGalleryContainer: {
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  photoGallery: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  photoWrapper: {
    width: 280,
    height: 280,
    marginHorizontal: 10,
    borderRadius: 140,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: 280,
    height: 280,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    height: 300,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  photoIndicatorText: {
    fontSize: 12,
    color: '#666',
  },
  infoSection: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  recoveryBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  manufacturer: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    minWidth: 100,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  colorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  rainbowDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  rainbowSlice: {
    flex: 1,
    height: '100%',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flightNumbers: {
    flexDirection: 'row',
    gap: 20,
  },
  flightNumber: {
    alignItems: 'center',
  },
  flightNumberLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  flightNumberValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.violet.primary,
  },
  rewardAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.violet.primary,
  },
  feeHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  qrCodeContainer: {
    alignItems: 'center',
    padding: 16,
  },
  qrCodeInner: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  qrCodeLabel: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.violet.primary,
    letterSpacing: 2,
  },
  qrCodeHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unlinkButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '500',
  },
  linkQrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  linkQrTextContainer: {
    flex: 1,
  },
  linkQrButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkQrHint: {
    fontSize: 12,
    marginTop: 2,
  },
  notes: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  surrenderedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#9B59B6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  surrenderedBannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Scanner styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scannerHeader: {
    alignItems: 'center',
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scannerSubtitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scannerFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    position: 'relative',
  },
  cornerBorder: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.violet.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  cancelScanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  cancelScanText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  textButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
