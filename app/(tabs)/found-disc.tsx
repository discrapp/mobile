import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  View as RNView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/components/useColorScheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

type ScreenState = 'input' | 'scanning' | 'loading' | 'found' | 'reporting' | 'success' | 'error' | 'qr_claim' | 'qr_link' | 'claiming' | 'claim_success';

interface DiscInfo {
  id: string;
  name: string;
  manufacturer?: string;
  mold?: string;
  plastic?: string;
  color?: string;
  reward_amount?: number;
  owner_display_name: string;
  photo_url?: string;
}

interface RecoveryEvent {
  id: string;
  disc_id: string;
  disc_name: string;
  status: string;
}

interface PendingRecovery {
  id: string;
  status: string;
  finder_message?: string;
  meetup_location?: string;
  meetup_time?: string;
  created_at: string;
  disc: {
    id: string;
    name: string;
    manufacturer?: string;
    mold?: string;
    plastic?: string;
    color?: string;
    reward_amount?: number;
    owner_display_name: string;
    photo_url?: string;
  } | null;
}

export default function FoundDiscScreen() {
  const router = useRouter();
  const { scannedCode: routeScannedCode } = useLocalSearchParams<{ scannedCode?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [permission, requestPermission] = useCameraPermissions();
  const [qrCode, setQrCode] = useState('');
  const [message, setMessage] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [discInfo, setDiscInfo] = useState<DiscInfo | null>(null);
  const [recoveryEvent, setRecoveryEvent] = useState<RecoveryEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasActiveRecovery, setHasActiveRecovery] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [pendingRecoveries, setPendingRecoveries] = useState<PendingRecovery[]>([]);
  const [myDiscsBeingRecovered, setMyDiscsBeingRecovered] = useState<PendingRecovery[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingMyDiscs, setLoadingMyDiscs] = useState(true);
  const [unclaimedQrCode, setUnclaimedQrCode] = useState<string | null>(null);

  // Fetch pending recoveries when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPendingRecoveries();
      fetchMyDiscsBeingRecovered();
    }, [])
  );

  // Handle scannedCode param from deep link navigation
  useEffect(() => {
    if (routeScannedCode && screenState === 'input') {
      setQrCode(routeScannedCode);
      lookupQrCodeWithValue(routeScannedCode);
    }
  }, [routeScannedCode]);

  const fetchPendingRecoveries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadingPending(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-my-finds`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingRecoveries(data);
      }
    } catch (error) {
      console.error('Error fetching pending recoveries:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchMyDiscsBeingRecovered = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadingMyDiscs(false);
        return;
      }

      // Get all discs owned by the user
      const { data: userDiscs, error: discsError } = await supabase
        .from('discs')
        .select('id')
        .eq('owner_id', session.user.id);

      if (discsError || !userDiscs || userDiscs.length === 0) {
        setMyDiscsBeingRecovered([]);
        setLoadingMyDiscs(false);
        return;
      }

      const discIds = userDiscs.map(d => d.id);

      // Get active recovery events for those discs
      const { data: recoveries, error: recoveriesError } = await supabase
        .from('recovery_events')
        .select(`
          id,
          status,
          finder_message,
          created_at,
          disc:discs(id, name, manufacturer, mold, plastic, color)
        `)
        .in('disc_id', discIds)
        .not('status', 'in', '("recovered","cancelled","surrendered")')
        .order('created_at', { ascending: false });

      if (recoveriesError) {
        console.error('Error fetching my discs being recovered:', recoveriesError);
        setMyDiscsBeingRecovered([]);
        return;
      }

      // Transform data
      const transformedRecoveries: PendingRecovery[] = (recoveries || []).map((r) => {
        const discData = Array.isArray(r.disc) ? r.disc[0] : r.disc;
        return {
          id: r.id,
          status: r.status,
          finder_message: r.finder_message,
          created_at: r.created_at,
          disc: discData ? {
            ...discData,
            owner_display_name: 'You',
          } : null,
        };
      });

      setMyDiscsBeingRecovered(transformedRecoveries);
    } catch (error) {
      console.error('Error fetching my discs being recovered:', error);
      setMyDiscsBeingRecovered([]);
    } finally {
      setLoadingMyDiscs(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'found':
        return { backgroundColor: '#F39C12' };
      case 'meetup_proposed':
        return { backgroundColor: '#3498DB' };
      case 'meetup_confirmed':
        return { backgroundColor: '#2ECC71' };
      case 'dropped_off':
        return { backgroundColor: '#8b5cf6' };
      case 'abandoned':
        return { backgroundColor: '#27AE60' };
      default:
        return { backgroundColor: '#95A5A6' };
    }
  };

  const formatStatus = (status: string, isOwner: boolean = false) => {
    switch (status) {
      case 'found':
        return isOwner ? 'Action needed' : 'Waiting for owner';
      case 'meetup_proposed':
        return isOwner ? 'Review meetup' : 'Meetup proposed';
      case 'meetup_confirmed':
        return 'Meetup confirmed';
      case 'dropped_off':
        return isOwner ? 'Ready for pickup' : 'Dropped off';
      case 'abandoned':
        return 'Owner gave up - Yours to claim!';
      default:
        return status;
    }
  };

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
    setScreenState('scanning');
  };

  const handleBarcodeScan = (result: BarcodeScanningResult) => {
    if (hasScanned) return;
    setHasScanned(true);
    let scannedCode = result.data;

    // Extract code from URL if QR contains a URL like https://aceback.app/d/CODE
    if (scannedCode.includes('/d/')) {
      const match = scannedCode.match(/\/d\/([A-Za-z0-9]+)/);
      if (match) {
        scannedCode = match[1];
      }
    }

    setQrCode(scannedCode);
    setScreenState('input');
    // Auto-lookup after scanning
    lookupQrCodeWithValue(scannedCode);
  };

  const lookupQrCodeWithValue = async (code: string) => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter a QR code');
      return;
    }

    setScreenState('loading');
    setErrorMessage('');

    try {
      // Get auth token to check if this is user's own disc
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/lookup-qr-code?code=${encodeURIComponent(code.trim())}`,
        {
          method: 'GET',
          headers,
        }
      );

      const data = await response.json();

      if (!data.found) {
        // Check if QR code exists but isn't linked to a disc
        if (data.qr_exists) {
          if (data.qr_status === 'generated') {
            // Unclaimed QR code - user can claim it
            setUnclaimedQrCode(data.qr_code);
            setScreenState('qr_claim');
            return;
          }
          if (data.qr_status === 'assigned') {
            if (data.is_assignee) {
              // User owns this QR code but hasn't linked it to a disc
              setUnclaimedQrCode(data.qr_code);
              setScreenState('qr_link');
              return;
            }
            // Someone else owns this QR code
            setErrorMessage('This QR code is already claimed by another user.');
            setScreenState('error');
            return;
          }
          if (data.qr_status === 'deactivated') {
            setErrorMessage('This QR code has been deactivated and can no longer be used.');
            setScreenState('error');
            return;
          }
        }
        setErrorMessage('No disc found with this QR code. Please check and try again.');
        setScreenState('error');
        return;
      }

      // If this is the user's own disc, redirect to disc detail page
      if (data.is_owner) {
        resetScreen();
        router.push(`/disc/${data.disc.id}`);
        return;
      }

      setDiscInfo(data.disc);
      setHasActiveRecovery(data.has_active_recovery);

      if (data.has_active_recovery) {
        setErrorMessage('This disc already has an active recovery in progress.');
        setScreenState('error');
        return;
      }

      setScreenState('found');
    } catch (error) {
      console.error('Lookup error:', error);
      setErrorMessage('Failed to look up disc. Please try again.');
      setScreenState('error');
    }
  };

  const lookupQrCode = () => {
    lookupQrCodeWithValue(qrCode);
  };

  const claimQrCode = async () => {
    if (!unclaimedQrCode) return;

    setScreenState('claiming');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to claim a QR code');
        setScreenState('qr_claim');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/assign-qr-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ qr_code: unclaimedQrCode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to claim QR code');
        setScreenState('error');
        return;
      }

      setScreenState('claim_success');
    } catch (error) {
      console.error('Claim error:', error);
      setErrorMessage('Failed to claim QR code. Please try again.');
      setScreenState('error');
    }
  };

  const reportFoundDisc = async () => {
    setScreenState('reporting');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to report a found disc');
        setScreenState('found');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/report-found-disc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            qr_code: qrCode.trim(),
            message: message.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'You cannot report your own disc as found') {
          setErrorMessage("This is your own disc! You can't report it as found.");
        } else if (data.error?.includes('active recovery')) {
          setErrorMessage('This disc already has an active recovery in progress.');
        } else {
          setErrorMessage(data.error || 'Failed to report found disc');
        }
        setScreenState('error');
        return;
      }

      setRecoveryEvent(data.recovery_event);
      setScreenState('success');
      // Refresh pending list
      fetchPendingRecoveries();
    } catch (error) {
      console.error('Report error:', error);
      setErrorMessage('Failed to report found disc. Please try again.');
      setScreenState('error');
    }
  };

  const resetScreen = () => {
    setQrCode('');
    setMessage('');
    setScreenState('input');
    setDiscInfo(null);
    setRecoveryEvent(null);
    setErrorMessage('');
    setHasActiveRecovery(false);
    setUnclaimedQrCode(null);
  };

  const navigateToProposeMeetup = () => {
    if (recoveryEvent) {
      router.push(`/propose-meetup/${recoveryEvent.id}`);
    }
  };

  // Input State
  if (screenState === 'input') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* My Discs Being Recovered Section - Show first if owner has active recoveries */}
          {myDiscsBeingRecovered.length > 0 && (
            <RNView style={[styles.ownerRecoverySection, { borderColor: isDark ? '#444' : '#F39C12' }]}>
              <RNView style={styles.ownerRecoverySectionHeader}>
                <FontAwesome name="bell" size={20} color="#F39C12" />
                <Text style={styles.ownerRecoverySectionTitle}>Your Discs Were Found!</Text>
              </RNView>
              <Text style={styles.ownerRecoverySectionSubtitle}>
                Someone found your disc and is trying to return it
              </Text>
              {myDiscsBeingRecovered.map((recovery) => (
                <Pressable
                  key={recovery.id}
                  style={[styles.ownerRecoveryCard, { borderColor: isDark ? '#444' : 'rgba(243, 156, 18, 0.4)' }]}
                  onPress={() => router.push(`/recovery/${recovery.id}`)}>
                  <RNView style={styles.ownerRecoveryInfo}>
                    <Text style={styles.ownerRecoveryDiscName}>
                      {recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}
                    </Text>
                    {recovery.disc?.manufacturer && (
                      <Text style={styles.ownerRecoveryManufacturer}>{recovery.disc.manufacturer}</Text>
                    )}
                    <RNView style={[styles.statusBadge, getStatusStyle(recovery.status)]}>
                      <Text style={styles.statusText}>{formatStatus(recovery.status, true)}</Text>
                    </RNView>
                  </RNView>
                  <FontAwesome name="chevron-right" size={16} color="#F39C12" />
                </Pressable>
              ))}
            </RNView>
          )}

          <View style={styles.header}>
            <FontAwesome name="qrcode" size={48} color={Colors.violet.primary} />
            <Text style={styles.title}>Found a Disc?</Text>
            <Text style={styles.subtitle}>
              Scan the QR code or enter it manually to help reunite the disc with its owner.
            </Text>
          </View>

          {/* Scan QR Code Button */}
          <Pressable style={styles.primaryButton} onPress={startScanning}>
            <FontAwesome name="camera" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Scan QR Code</Text>
          </Pressable>

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>or enter manually</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>QR Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#555' : '#ddd' }]}
              placeholder="Enter code (e.g., TEST001)"
              placeholderTextColor="#999"
              value={qrCode}
              onChangeText={setQrCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <Pressable style={styles.secondaryButton} onPress={lookupQrCode}>
            <FontAwesome name="search" size={18} color="#fff" />
            <Text style={styles.secondaryButtonText}>Look Up Disc</Text>
          </Pressable>

          {/* Pending Returns Section */}
          {pendingRecoveries.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingSectionTitle}>Your Pending Returns</Text>
              <Text style={styles.pendingSectionSubtitle}>
                Discs you found that are waiting to be returned
              </Text>
              {pendingRecoveries.map((recovery) => (
                <Pressable
                  key={recovery.id}
                  style={[styles.pendingCard, { borderColor: isDark ? '#444' : '#eee' }]}
                  onPress={() => router.push(`/recovery/${recovery.id}`)}>
                  {recovery.disc?.photo_url ? (
                    <Image source={{ uri: recovery.disc.photo_url }} style={styles.pendingPhoto} />
                  ) : (
                    <View style={styles.pendingPhotoPlaceholder}>
                      <FontAwesome name="circle" size={24} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingDiscName}>
                      {recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}
                    </Text>
                    {recovery.disc?.manufacturer && (
                      <Text style={styles.pendingManufacturer}>{recovery.disc.manufacturer}</Text>
                    )}
                    {recovery.disc?.color && (
                      <Text style={styles.pendingColor}>{recovery.disc.color}</Text>
                    )}
                    <View style={styles.pendingStatusRow}>
                      <View style={[styles.statusBadge, getStatusStyle(recovery.status)]}>
                        <Text style={styles.statusText}>{formatStatus(recovery.status)}</Text>
                      </View>
                      {recovery.status !== 'abandoned' && recovery.disc?.owner_display_name && (
                        <Text style={styles.pendingOwner}>→ {recovery.disc.owner_display_name}</Text>
                      )}
                    </View>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color="#999" />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Scanning State
  if (screenState === 'scanning') {
    // Double-check permission before rendering camera
    if (!permission?.granted) {
      return (
        <View style={[styles.centerContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
          <FontAwesome name="camera" size={48} color="#ccc" />
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorMessage}>
            Please grant camera permission to scan QR codes.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.textButton} onPress={() => setScreenState('input')}>
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
              Point your camera at the QR code on the disc
            </Text>
          </RNView>
          <RNView style={styles.scannerFrame}>
            <RNView style={[styles.cornerBorder, styles.topLeft]} />
            <RNView style={[styles.cornerBorder, styles.topRight]} />
            <RNView style={[styles.cornerBorder, styles.bottomLeft]} />
            <RNView style={[styles.cornerBorder, styles.bottomRight]} />
          </RNView>
          <Pressable style={styles.cancelScanButton} onPress={() => setScreenState('input')}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </Pressable>
        </RNView>
      </RNView>
    );
  }

  // Loading State
  if (screenState === 'loading' || screenState === 'reporting' || screenState === 'claiming') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>
          {screenState === 'loading' ? 'Looking up disc...' : screenState === 'claiming' ? 'Claiming QR code...' : 'Reporting found disc...'}
        </Text>
      </View>
    );
  }

  // QR Claim State - Unclaimed QR code that can be claimed
  if (screenState === 'qr_claim' && unclaimedQrCode) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <FontAwesome name="qrcode" size={64} color={Colors.violet.primary} />
        <Text style={styles.successTitle}>New QR Code!</Text>
        <Text style={styles.qrCodeDisplay}>{unclaimedQrCode}</Text>
        <Text style={styles.successMessage}>
          This QR code hasn't been claimed yet. Claim it to link it to one of your discs.
        </Text>
        <Pressable style={styles.primaryButton} onPress={claimQrCode}>
          <FontAwesome name="check" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Claim This QR Code</Text>
        </Pressable>
        <Pressable style={styles.textButton} onPress={resetScreen}>
          <Text style={styles.textButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // QR Link State - Already claimed by user, needs to be linked
  if (screenState === 'qr_link' && unclaimedQrCode) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <FontAwesome name="link" size={64} color={Colors.violet.primary} />
        <Text style={styles.successTitle}>Your QR Code</Text>
        <Text style={styles.qrCodeDisplay}>{unclaimedQrCode}</Text>
        <Text style={styles.successMessage}>
          You've already claimed this QR code. Link it to one of your discs in your bag.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => { resetScreen(); router.push('/(tabs)/my-bag'); }}>
          <FontAwesome name="briefcase" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Go to My Bag</Text>
        </Pressable>
        <Pressable style={styles.textButton} onPress={resetScreen}>
          <Text style={styles.textButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // Claim Success State
  if (screenState === 'claim_success') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <FontAwesome name="check-circle" size={80} color="#2ECC71" />
        <Text style={styles.successTitle}>QR Code Claimed!</Text>
        <Text style={styles.successMessage}>
          The QR code is now yours. Link it to one of your discs so finders can return it to you.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => { resetScreen(); router.push('/(tabs)/my-bag'); }}>
          <FontAwesome name="briefcase" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Go to My Bag</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/add-disc')}>
          <FontAwesome name="plus" size={18} color="#fff" />
          <Text style={styles.secondaryButtonText}>Create New Disc</Text>
        </Pressable>
        <Pressable style={styles.textButton} onPress={resetScreen}>
          <Text style={styles.textButtonText}>Scan Another QR Code</Text>
        </Pressable>
      </View>
    );
  }

  // Error State
  if (screenState === 'error') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <FontAwesome name="exclamation-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <Pressable style={styles.secondaryButton} onPress={resetScreen}>
          <FontAwesome name="refresh" size={18} color="#fff" />
          <Text style={styles.secondaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Found State - Show disc info and report button
  if (screenState === 'found' && discInfo) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <FontAwesome name="check-circle" size={48} color="#2ECC71" />
            <Text style={styles.title}>Disc Found!</Text>
          </View>

          {/* Disc Card */}
          <View style={styles.discCard}>
            {discInfo.photo_url ? (
              <Image source={{ uri: discInfo.photo_url }} style={styles.discPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <FontAwesome name="circle" size={60} color="#ccc" />
              </View>
            )}
            <Text style={styles.discName}>{discInfo.mold || discInfo.name}</Text>
            {discInfo.manufacturer && (
              <Text style={styles.discManufacturer}>{discInfo.manufacturer}</Text>
            )}
            {discInfo.plastic && <Text style={styles.discPlastic}>{discInfo.plastic}</Text>}
            {discInfo.color && (
              <View style={styles.colorBadge}>
                {COLOR_MAP[discInfo.color] === 'rainbow' ? (
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
                        backgroundColor: COLOR_MAP[discInfo.color] || '#666',
                        borderColor: discInfo.color === 'White' ? '#ccc' : 'rgba(0, 0, 0, 0.1)',
                      },
                    ]}
                  />
                )}
                <Text style={styles.colorText}>{discInfo.color}</Text>
              </View>
            )}
            <View style={styles.ownerInfo}>
              <FontAwesome name="user" size={14} color="#666" />
              <Text style={styles.ownerName}>{discInfo.owner_display_name}</Text>
            </View>
            {discInfo.reward_amount && discInfo.reward_amount > 0 && (
              <View style={styles.rewardBadge}>
                <FontAwesome name="gift" size={14} color="#fff" />
                <Text style={styles.rewardText}>${discInfo.reward_amount} Reward</Text>
              </View>
            )}
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Message for Owner (Optional)</Text>
            <TextInput
              style={[styles.input, styles.messageInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#555' : '#ddd' }]}
              placeholder="Where did you find it? Any details..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={reportFoundDisc}>
            <FontAwesome name="flag" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Report Found</Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={resetScreen}>
            <Text style={styles.textButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Success State
  if (screenState === 'success' && recoveryEvent) {
    const navigateToDropOff = () => {
      router.push(`/drop-off/${recoveryEvent.id}`);
    };

    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <FontAwesome name="check-circle" size={80} color="#2ECC71" />
        <Text style={styles.successTitle}>Thank You!</Text>
        <Text style={styles.successMessage}>
          You've reported finding "{recoveryEvent.disc_name}". The owner has been notified.
        </Text>

        <Text style={styles.nextStepsTitle}>What would you like to do next?</Text>

        <Pressable style={styles.primaryButton} onPress={navigateToProposeMeetup}>
          <FontAwesome name="calendar" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Propose a Meetup</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={navigateToDropOff}>
          <FontAwesome name="map-marker" size={18} color="#fff" />
          <Text style={styles.secondaryButtonText}>Drop Off Disc</Text>
        </Pressable>

        <Pressable style={styles.textButton} onPress={resetScreen}>
          <Text style={styles.textButtonText}>Report Another Disc</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  discCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 24,
  },
  discPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  discName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  discManufacturer: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  discPlastic: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  colorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
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
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rainbowSlice: {
    flex: 1,
    height: '100%',
  },
  colorText: {
    fontSize: 12,
    color: '#666',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2ECC71',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  rewardText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  qrCodeDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 12,
    letterSpacing: 2,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  nextStepsTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  orText: {
    color: '#999',
    fontSize: 14,
    paddingHorizontal: 16,
  },
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
  ownerRecoverySection: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  ownerRecoverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  ownerRecoverySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F39C12',
  },
  ownerRecoverySectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  ownerRecoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.4)',
    marginBottom: 8,
  },
  ownerRecoveryInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  ownerRecoveryDiscName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ownerRecoveryManufacturer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  pendingSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pendingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingSectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pendingPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  pendingPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingDiscName: {
    fontSize: 16,
    fontWeight: '600',
  },
  pendingManufacturer: {
    fontSize: 14,
    color: '#666',
  },
  pendingColor: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  pendingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pendingOwner: {
    fontSize: 12,
    color: '#999',
  },
});
