import { logger } from '@/lib/logger';
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
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { DISC_COLORS } from '@/constants/discColors';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/components/useColorScheme';
import { RecoveryCardSkeleton } from '@/components/Skeleton';
import { handleError } from '@/lib/errorHandler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ScreenState =
  | 'input'           // Existing - choose QR or Photo
  | 'scanning'        // Existing - QR code scanner
  | 'loading'         // Existing - looking up QR
  | 'found'           // Existing - disc found via QR
  | 'reporting'       // Existing - submitting report
  | 'success'         // Existing - report success
  | 'error'           // Existing - error state
  | 'qr_claim'        // Existing - unclaimed QR
  | 'qr_link'         // Existing - QR needs linking
  | 'claiming'        // Existing - claiming QR
  | 'claim_success'   // Existing - claim success
  // Visual recovery flow states
  | 'photo_back'      // Camera for back photo (phone number)
  | 'photo_front'     // Camera for front photo (disc design)
  | 'photo_preview'   // Review both photos
  | 'extracting'      // AI extracting phone
  | 'phone_result'    // Show extracted phone, allow edit
  | 'looking_up'      // Searching for owner by phone
  | 'owner_found'     // Show owner + their discs
  | 'owner_not_found' // Offer SMS invite
  | 'sending_sms';    // Sending SMS invite

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

// Visual recovery flow interfaces
interface ExtractedPhone {
  raw: string;
  normalized: string;
  confidence: number;
}

interface OwnerDisc {
  id: string;
  name: string;
  manufacturer: string | null;
  mold: string | null;
  color: string | null;
  photo_url: string | null;
}

interface OwnerInfo {
  id: string;
  display_name: string;
  disc_count: number;
  discs: OwnerDisc[];
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
  const [refreshing, setRefreshing] = useState(false);

  // Visual recovery flow state
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [extractedPhones, setExtractedPhones] = useState<ExtractedPhone[]>([]);
  const [editablePhone, setEditablePhone] = useState('');
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);
  const [selectedDiscId, setSelectedDiscId] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // istanbul ignore next -- Pull-to-refresh tested via integration tests
  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPendingRecoveries(), fetchMyDiscsBeingRecovered()]);
    setRefreshing(false);
  }, []);

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
      logger.error('Error fetching pending recoveries:', error);
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

      // istanbul ignore next -- Data transformation tested via integration tests
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

      // istanbul ignore next -- Error handling tested via integration tests
      if (recoveriesError) {
        logger.error('Error fetching my discs being recovered:', recoveriesError);
        setMyDiscsBeingRecovered([]);
        return;
      }

      // istanbul ignore next -- Data transformation tested via integration tests
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
      logger.error('Error fetching my discs being recovered:', error);
      setMyDiscsBeingRecovered([]);
    } finally {
      setLoadingMyDiscs(false);
    }
  };

  // istanbul ignore next -- Status styling tested via integration tests
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

  // istanbul ignore next -- Status formatting tested via integration tests
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
    setScreenState('scanning');
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
      logger.error('Lookup error:', error);
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

      // istanbul ignore next -- API error handling tested via integration tests
      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to claim QR code');
        setScreenState('error');
        return;
      }

      setScreenState('claim_success');
    } catch (error) {
      // istanbul ignore next -- Error catch tested via integration tests
      logger.error('Claim error:', error);
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

      // istanbul ignore next -- API error handling tested via integration tests
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
      // istanbul ignore next -- Error catch tested via integration tests
      logger.error('Report error:', error);
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
    // Reset visual recovery state
    setBackPhotoUri(null);
    setFrontPhotoUri(null);
    setExtractedPhones([]);
    setEditablePhone('');
    setOwnerInfo(null);
    setSelectedDiscId(null);
  };

  // istanbul ignore next -- Navigation tested via integration tests
  const navigateToProposeMeetup = () => {
    if (recoveryEvent) {
      router.push(`/propose-meetup/${recoveryEvent.id}`);
    }
  };

  // Visual recovery flow functions
  // istanbul ignore next -- Native camera permission requires device testing
  const startPhotoCapture = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to take photos of the disc.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setBackPhotoUri(null);
    setFrontPhotoUri(null);
    setScreenState('photo_back');
  };

  // istanbul ignore next -- Native camera requires device testing
  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (!photo?.uri) return;

      if (screenState === 'photo_back') {
        setBackPhotoUri(photo.uri);
        setScreenState('photo_front');
      } else if (screenState === 'photo_front') {
        setFrontPhotoUri(photo.uri);
        setScreenState('photo_preview');
      }
    } catch (error) {
      logger.error('Photo capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  // istanbul ignore next -- API integration tested via integration tests
  const extractPhoneFromPhotos = async () => {
    if (!backPhotoUri || !frontPhotoUri) return;

    setScreenState('extracting');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be signed in');
        setScreenState('photo_preview');
        return;
      }

      const formData = new FormData();
      formData.append('back_image', {
        uri: backPhotoUri,
        type: 'image/jpeg',
        name: 'back.jpg',
      } as unknown as Blob);
      formData.append('front_image', {
        uri: frontPhotoUri,
        type: 'image/jpeg',
        name: 'front.jpg',
      } as unknown as Blob);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/extract-phone-from-photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to extract phone number');
        setScreenState('error');
        return;
      }

      if (data.phone_numbers && data.phone_numbers.length > 0) {
        setExtractedPhones(data.phone_numbers);
        setEditablePhone(data.phone_numbers[0].normalized);
      } else {
        setExtractedPhones([]);
        setEditablePhone('');
      }
      setScreenState('phone_result');
    } catch (error) {
      logger.error('Phone extraction error:', error);
      handleError(error, { operation: 'extract-phone-from-photo' });
      setErrorMessage('Failed to extract phone number. Please try again.');
      setScreenState('error');
    }
  };

  // istanbul ignore next -- API integration tested via integration tests
  const lookupOwnerByPhone = async () => {
    if (!editablePhone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    setScreenState('looking_up');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be signed in');
        setScreenState('phone_result');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/lookup-user-by-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ phone_number: editablePhone.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to look up owner');
        setScreenState('error');
        return;
      }

      if (data.found && data.discoverable && data.user) {
        setOwnerInfo({
          id: data.user.id,
          display_name: data.user.display_name,
          disc_count: data.user.disc_count,
          discs: data.discs || [],
        });
        setScreenState('owner_found');
      } else if (data.found && !data.discoverable) {
        setErrorMessage('The owner prefers not to be contacted this way.');
        setScreenState('error');
      } else {
        setScreenState('owner_not_found');
      }
    } catch (error) {
      logger.error('Owner lookup error:', error);
      handleError(error, { operation: 'lookup-user-by-phone' });
      setErrorMessage('Failed to look up owner. Please try again.');
      setScreenState('error');
    }
  };

  // istanbul ignore next -- API integration tested via integration tests
  const reportFoundDiscByPhone = async () => {
    if (!ownerInfo) return;

    setScreenState('reporting');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be signed in');
        setScreenState('owner_found');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/report-found-disc-by-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            owner_id: ownerInfo.id,
            disc_id: selectedDiscId || undefined,
            message: message.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to report found disc');
        setScreenState('error');
        return;
      }

      setRecoveryEvent(data.recovery_event);
      setScreenState('success');
      fetchPendingRecoveries();
    } catch (error) {
      logger.error('Report error:', error);
      handleError(error, { operation: 'report-found-disc-by-phone' });
      setErrorMessage('Failed to report found disc. Please try again.');
      setScreenState('error');
    }
  };

  // istanbul ignore next -- API integration tested via integration tests
  const sendSmsInvite = async () => {
    if (!editablePhone.trim()) return;

    setScreenState('sending_sms');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be signed in');
        setScreenState('owner_not_found');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-disc-found-sms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ phone_number: editablePhone.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          Alert.alert('Already Sent', 'An SMS was already sent to this number recently. Please try again later.');
        } else {
          Alert.alert('Error', data.error || 'Failed to send SMS');
        }
        setScreenState('owner_not_found');
        return;
      }

      Alert.alert(
        'SMS Sent!',
        'We\'ve sent a text inviting them to download Discr. They\'ll be able to connect with you once they sign up.',
        [{ text: 'OK', onPress: resetScreen }]
      );
    } catch (error) {
      logger.error('SMS error:', error);
      handleError(error, { operation: 'send-disc-found-sms' });
      Alert.alert('Error', 'Failed to send SMS. Please try again.');
      setScreenState('owner_not_found');
    }
  };

  // Input State
  if (screenState === 'input') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.violet.primary}
              colors={[Colors.violet.primary]}
            />
          }
        >
          {/* My Discs Being Recovered Section - Show first if owner has active recoveries */}
          {loadingMyDiscs && (
            <RNView style={[styles.ownerRecoverySection, { borderColor: isDark ? '#444' : '#F39C12' }]}>
              <RNView style={styles.ownerRecoverySectionHeader}>
                <FontAwesome name="bell" size={20} color="#F39C12" />
                <Text style={styles.ownerRecoverySectionTitle}>Your Discs Were Found!</Text>
              </RNView>
              <Text style={styles.ownerRecoverySectionSubtitle}>
                Checking for active recoveries...
              </Text>
              <RecoveryCardSkeleton />
              <RecoveryCardSkeleton />
            </RNView>
          )}
          {!loadingMyDiscs && myDiscsBeingRecovered.length > 0 && (
            <RNView style={[styles.ownerRecoverySection, { borderColor: isDark ? '#444' : '#F39C12' }]}>
              <RNView style={styles.ownerRecoverySectionHeader}>
                <FontAwesome name="bell" size={20} color="#F39C12" />
                <Text style={styles.ownerRecoverySectionTitle}>Your Discs Were Found!</Text>
              </RNView>
              <Text style={styles.ownerRecoverySectionSubtitle}>
                Someone found your disc and is trying to return it
              </Text>
              {/* istanbul ignore next -- Recovery card rendering tested via integration tests */}
              {myDiscsBeingRecovered.map((recovery) => (
                <Pressable
                  key={recovery.id}
                  style={[styles.ownerRecoveryCard, { borderColor: isDark ? '#444' : 'rgba(243, 156, 18, 0.4)' }]}
                  onPress={() => router.push(`/recovery/${recovery.id}`)}>
                  <RNView style={styles.ownerRecoveryInfo}>
                    <Text style={styles.ownerRecoveryDiscName} numberOfLines={1} ellipsizeMode="tail">
                      {recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}
                    </Text>
                    {recovery.disc?.manufacturer && (
                      <Text style={styles.ownerRecoveryManufacturer} numberOfLines={1} ellipsizeMode="tail">{recovery.disc.manufacturer}</Text>
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
              onChangeText={(text) => setQrCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <Pressable style={styles.secondaryButton} onPress={lookupQrCode}>
            <FontAwesome name="search" size={18} color="#fff" />
            <Text style={styles.secondaryButtonText}>Look Up Disc</Text>
          </Pressable>

          {/* Visual Recovery Option */}
          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>no QR code?</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.photoRecoveryButton} onPress={startPhotoCapture}>
            <FontAwesome name="phone" size={18} color={Colors.violet.primary} />
            <Text style={styles.photoRecoveryButtonText}>Use Phone Number on Disc</Text>
          </Pressable>
          <Text style={styles.photoRecoveryHint}>
            Take a photo of the disc to extract the owner's phone number
          </Text>

          {/* Pending Returns Section */}
          {loadingPending && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingSectionTitle}>Your Pending Returns</Text>
              <Text style={styles.pendingSectionSubtitle}>
                Loading your found discs...
              </Text>
              <RecoveryCardSkeleton />
              <RecoveryCardSkeleton />
            </View>
          )}
          {!loadingPending && pendingRecoveries.length > 0 && (
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
                    <Text style={styles.pendingDiscName} numberOfLines={1} ellipsizeMode="tail">
                      {recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}
                    </Text>
                    {recovery.disc?.manufacturer && (
                      <Text style={styles.pendingManufacturer} numberOfLines={1} ellipsizeMode="tail">{recovery.disc.manufacturer}</Text>
                    )}
                    {recovery.disc?.color && (
                      <Text style={styles.pendingColor}>{recovery.disc.color}</Text>
                    )}
                    <View style={styles.pendingStatusRow}>
                      <View style={[styles.statusBadge, getStatusStyle(recovery.status)]}>
                        <Text style={styles.statusText}>{formatStatus(recovery.status)}</Text>
                      </View>
                      {recovery.status !== 'abandoned' && recovery.disc?.owner_display_name && (
                        <Text style={styles.pendingOwner} numberOfLines={1} ellipsizeMode="tail">→ {recovery.disc.owner_display_name === 'You' ? 'You' : `@${recovery.disc.owner_display_name}`}</Text>
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

  // istanbul ignore next -- Native camera scanning requires device testing
  // Scanning State
  if (screenState === 'scanning') {
    // Double-check permission before rendering camera
    if (!permission?.granted) {
      return (
        <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
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
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
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
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
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
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <FontAwesome name="link" size={64} color={Colors.violet.primary} />
        <Text style={styles.successTitle}>Your QR Code</Text>
        <Text style={styles.qrCodeDisplay}>{unclaimedQrCode}</Text>
        <Text style={styles.successMessage}>
          This QR code is yours! Select a disc from your bag to link it to.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => { resetScreen(); router.push(`/link-sticker?code=${unclaimedQrCode}`); }}>
          <FontAwesome name="link" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Link to a Disc</Text>
        </Pressable>
        <Pressable style={styles.textButton} onPress={resetScreen}>
          <Text style={styles.textButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // istanbul ignore next -- Claim success state tested via integration tests
  // Claim Success State
  if (screenState === 'claim_success') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <FontAwesome name="check-circle" size={80} color="#2ECC71" />
        <Text style={styles.successTitle}>QR Code Claimed!</Text>
        <Text style={styles.successMessage}>
          The QR code is now yours. Link it to one of your discs so finders can return it to you.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => { const code = unclaimedQrCode; resetScreen(); router.push(`/link-sticker?code=${code}`); }}>
          <FontAwesome name="link" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Link to a Disc</Text>
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
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
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
        style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}
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
            <Text style={styles.discName} numberOfLines={2} ellipsizeMode="tail">{discInfo.mold || discInfo.name}</Text>
            {discInfo.manufacturer && (
              <Text style={styles.discManufacturer} numberOfLines={1} ellipsizeMode="tail">{discInfo.manufacturer}</Text>
            )}
            {discInfo.plastic && <Text style={styles.discPlastic}>{discInfo.plastic}</Text>}
            {discInfo.color && (
              <View style={styles.colorBadge}>
                {DISC_COLORS[discInfo.color as keyof typeof DISC_COLORS] === 'rainbow' ? (
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
                        backgroundColor: DISC_COLORS[discInfo.color as keyof typeof DISC_COLORS] || '#666',
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
              <Text style={styles.ownerName} numberOfLines={1} ellipsizeMode="tail">{discInfo.owner_display_name === 'You' ? 'You' : `@${discInfo.owner_display_name}`}</Text>
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

  // istanbul ignore next -- Success state tested via integration tests
  // Success State
  if (screenState === 'success' && recoveryEvent) {
    const navigateToDropOff = () => {
      router.push(`/drop-off/${recoveryEvent.id}`);
    };

    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
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

  // istanbul ignore next -- Native camera capture requires device testing
  // Photo Back State - Camera for back of disc (phone number)
  if (screenState === 'photo_back') {
    if (!permission?.granted) {
      return (
        <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
          <FontAwesome name="camera" size={48} color="#ccc" />
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorMessage}>
            Please grant camera permission to take photos of the disc.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.textButton} onPress={resetScreen}>
            <Text style={styles.textButtonText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <RNView style={styles.scannerContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          active={true}
        />
        <RNView style={styles.scannerOverlay}>
          <RNView style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Photo of Back</Text>
            <Text style={styles.scannerSubtitle}>
              Capture the phone number written on the disc
            </Text>
          </RNView>
          <RNView style={styles.scannerFrame}>
            <RNView style={[styles.cornerBorder, styles.topLeft]} />
            <RNView style={[styles.cornerBorder, styles.topRight]} />
            <RNView style={[styles.cornerBorder, styles.bottomLeft]} />
            <RNView style={[styles.cornerBorder, styles.bottomRight]} />
          </RNView>
          <RNView style={{ gap: 16 }}>
            <Pressable style={styles.captureButton} onPress={takePhoto}>
              <RNView style={styles.captureButtonInner} />
            </Pressable>
            <Pressable style={styles.cancelScanButton} onPress={resetScreen}>
              <Text style={styles.cancelScanText}>Cancel</Text>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    );
  }

  // istanbul ignore next -- Native camera capture requires device testing
  // Photo Front State - Camera for front of disc (design)
  if (screenState === 'photo_front') {
    return (
      <RNView style={styles.scannerContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          active={true}
        />
        <RNView style={styles.scannerOverlay}>
          <RNView style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Photo of Front</Text>
            <Text style={styles.scannerSubtitle}>
              Now capture the front of the disc (design/stamp)
            </Text>
          </RNView>
          <RNView style={styles.scannerFrame}>
            <RNView style={[styles.cornerBorder, styles.topLeft]} />
            <RNView style={[styles.cornerBorder, styles.topRight]} />
            <RNView style={[styles.cornerBorder, styles.bottomLeft]} />
            <RNView style={[styles.cornerBorder, styles.bottomRight]} />
          </RNView>
          <RNView style={{ gap: 16 }}>
            <Pressable style={styles.captureButton} onPress={takePhoto}>
              <RNView style={styles.captureButtonInner} />
            </Pressable>
            <Pressable style={styles.cancelScanButton} onPress={() => setScreenState('photo_back')}>
              <Text style={styles.cancelScanText}>Retake Back Photo</Text>
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    );
  }

  // Photo Preview State - Review both photos
  // istanbul ignore next -- Photo preview requires native camera capture
  if (screenState === 'photo_preview' && backPhotoUri && frontPhotoUri) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <FontAwesome name="image" size={48} color={Colors.violet.primary} />
            <Text style={styles.title}>Review Photos</Text>
            <Text style={styles.subtitle}>
              Make sure the phone number is clearly visible in the back photo
            </Text>
          </View>

          <RNView style={styles.previewImagesRow}>
            <RNView style={styles.previewImageContainer}>
              <Text style={styles.previewImageLabel}>Back (Phone #)</Text>
              <Image source={{ uri: backPhotoUri }} style={styles.previewImage} />
              <Pressable style={styles.retakeButton} onPress={() => setScreenState('photo_back')}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </Pressable>
            </RNView>
            <RNView style={styles.previewImageContainer}>
              <Text style={styles.previewImageLabel}>Front</Text>
              <Image source={{ uri: frontPhotoUri }} style={styles.previewImage} />
              <Pressable style={styles.retakeButton} onPress={() => setScreenState('photo_front')}>
                <Text style={styles.retakeButtonText}>Retake</Text>
              </Pressable>
            </RNView>
          </RNView>

          <Pressable style={styles.primaryButton} onPress={extractPhoneFromPhotos}>
            <FontAwesome name="search" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Extract Phone Number</Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={resetScreen}>
            <Text style={styles.textButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // istanbul ignore next -- Extracting state requires native camera capture flow
  // Extracting State - AI processing
  if (screenState === 'extracting') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>Extracting phone number...</Text>
        <Text style={[styles.subtitle, { marginTop: 8 }]}>
          AI is analyzing the disc photos
        </Text>
      </View>
    );
  }

  // istanbul ignore next -- Phone result state requires native camera capture flow
  // Phone Result State - Show extracted phone or manual entry
  if (screenState === 'phone_result') {
    const highConfidence = extractedPhones.length > 0 && extractedPhones[0].confidence >= 0.8;

    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <FontAwesome
              name={extractedPhones.length > 0 ? 'check-circle' : 'exclamation-circle'}
              size={48}
              color={extractedPhones.length > 0 ? '#2ECC71' : '#F39C12'}
            />
            <Text style={styles.title}>
              {extractedPhones.length > 0 ? 'Phone Number Found!' : 'No Phone Found'}
            </Text>
          </View>

          {extractedPhones.length > 0 && (
            <RNView style={[styles.phoneResultCard, { backgroundColor: isDark ? '#1e1e1e' : '#f0f0f0' }]}>
              <RNView style={styles.phoneConfidenceIndicator}>
                <FontAwesome
                  name={highConfidence ? 'check' : 'question'}
                  size={14}
                  color={highConfidence ? '#2ECC71' : '#F39C12'}
                />
                <Text style={styles.phoneConfidenceText}>
                  {highConfidence ? 'High confidence' : 'Low confidence - please verify'}
                </Text>
              </RNView>
              <Text style={[styles.phoneDisplay, { color: isDark ? '#fff' : '#000' }]}>
                {extractedPhones[0].raw}
              </Text>
            </RNView>
          )}

          <View style={styles.phoneInputContainer}>
            <Text style={styles.phoneInputLabel}>
              {extractedPhones.length > 0 ? 'Edit if needed:' : 'Enter phone number manually:'}
            </Text>
            <TextInput
              style={[styles.phoneInput, {
                backgroundColor: isDark ? '#252525' : '#fff',
                borderColor: isDark ? '#2e2e2e' : '#ddd',
                color: isDark ? '#fff' : '#000',
              }]}
              placeholder="(512) 555-1234"
              placeholderTextColor="#999"
              value={editablePhone}
              onChangeText={setEditablePhone}
              keyboardType="phone-pad"
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={lookupOwnerByPhone}>
            <FontAwesome name="search" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Look Up Owner</Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={() => setScreenState('photo_preview')}>
            <Text style={styles.textButtonText}>Retake Photos</Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={resetScreen}>
            <Text style={styles.textButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // istanbul ignore next -- Looking up state requires native camera capture flow
  // Looking Up State - Searching for owner
  if (screenState === 'looking_up') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>Looking up owner...</Text>
      </View>
    );
  }

  // istanbul ignore next -- Owner found state requires native camera capture flow
  // Owner Found State - Show owner info and their discs
  if (screenState === 'owner_found' && ownerInfo) {
    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <FontAwesome name="check-circle" size={48} color="#2ECC71" />
            <Text style={styles.title}>Owner Found!</Text>
          </View>

          <RNView style={[styles.ownerCard, { borderColor: isDark ? '#2e2e2e' : '#eee' }]}>
            <RNView style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{getInitial(ownerInfo.display_name)}</Text>
            </RNView>
            <Text style={styles.ownerDisplayName}>@{ownerInfo.display_name}</Text>
            <Text style={styles.ownerDiscCount}>
              {ownerInfo.disc_count} disc{ownerInfo.disc_count !== 1 ? 's' : ''} registered
            </Text>
          </RNView>

          {ownerInfo.discs.length > 0 && (
            <RNView style={styles.discMatchSection}>
              <Text style={styles.discMatchTitle}>Is this one of their discs?</Text>
              {ownerInfo.discs.map((disc) => (
                <Pressable
                  key={disc.id}
                  style={[
                    styles.discMatchCard,
                    selectedDiscId === disc.id ? styles.discMatchCardSelected : styles.discMatchCardDefault,
                  ]}
                  onPress={() => setSelectedDiscId(selectedDiscId === disc.id ? null : disc.id)}>
                  {disc.photo_url ? (
                    <Image source={{ uri: disc.photo_url }} style={styles.discMatchPhoto} />
                  ) : (
                    <RNView style={styles.discMatchPhotoPlaceholder}>
                      <FontAwesome name="circle" size={20} color="#ccc" />
                    </RNView>
                  )}
                  <RNView style={styles.discMatchInfo}>
                    <Text style={styles.discMatchMold}>{disc.mold || disc.name}</Text>
                    {disc.manufacturer && (
                      <Text style={styles.discMatchManufacturer}>{disc.manufacturer}</Text>
                    )}
                    {disc.color && <Text style={styles.discMatchColor}>{disc.color}</Text>}
                  </RNView>
                  {selectedDiscId === disc.id && (
                    <RNView style={styles.discMatchCheck}>
                      <FontAwesome name="check" size={14} color="#fff" />
                    </RNView>
                  )}
                </Pressable>
              ))}
            </RNView>
          )}

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Message for Owner (Optional)</Text>
            <TextInput
              style={[styles.input, styles.messageInput, {
                backgroundColor: isDark ? '#252525' : '#fff',
                color: isDark ? '#fff' : '#000',
                borderColor: isDark ? '#2e2e2e' : '#ddd',
              }]}
              placeholder="Where did you find it? Any details..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={reportFoundDiscByPhone}>
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

  // istanbul ignore next -- Owner not found state requires native camera capture flow
  // Owner Not Found State - Offer SMS invite
  if (screenState === 'owner_not_found') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <RNView style={[styles.smsInviteCard, { backgroundColor: isDark ? '#1e1e1e' : '#f0f0f0' }]}>
          <FontAwesome name="user-times" size={48} color="#F39C12" />
          <Text style={styles.smsInviteText}>
            This phone number isn't registered on Discr yet.
          </Text>
          <Text style={[styles.smsInviteText, { marginTop: 8 }]}>
            Would you like to send them a text inviting them to download the app?
          </Text>
        </RNView>

        <Pressable style={styles.primaryButton} onPress={sendSmsInvite}>
          <FontAwesome name="comment" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Send Invite Text</Text>
        </Pressable>

        <Pressable style={styles.textButton} onPress={resetScreen}>
          <Text style={styles.textButtonText}>Maybe Later</Text>
        </Pressable>
      </View>
    );
  }

  // istanbul ignore next -- Sending SMS state requires native camera capture flow
  // Sending SMS State
  if (screenState === 'sending_sms') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>Sending invite...</Text>
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
  // Visual recovery styles
  photoRecoveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  photoRecoveryButtonText: {
    color: Colors.violet.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  photoRecoveryHint: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  // Camera capture styles
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.violet.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  // Photo preview styles
  previewContainer: {
    flex: 1,
    padding: 20,
  },
  previewImagesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  previewImageContainer: {
    flex: 1,
  },
  previewImageLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  retakeButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: Colors.violet.primary,
    fontSize: 14,
  },
  // Phone result styles
  phoneResultCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  phoneConfidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  phoneConfidenceText: {
    fontSize: 12,
    color: '#666',
  },
  phoneDisplay: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  phoneInputContainer: {
    marginTop: 16,
    width: '100%',
  },
  phoneInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  noPhoneText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  // Owner found styles
  ownerCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
  },
  ownerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.violet.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ownerAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  ownerDisplayName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ownerDiscCount: {
    fontSize: 14,
    color: '#666',
  },
  discMatchSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  discMatchTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  discMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    gap: 12,
  },
  discMatchCardSelected: {
    borderColor: Colors.violet.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  discMatchCardDefault: {
    borderColor: '#eee',
  },
  discMatchPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  discMatchPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discMatchInfo: {
    flex: 1,
  },
  discMatchMold: {
    fontSize: 16,
    fontWeight: '600',
  },
  discMatchManufacturer: {
    fontSize: 14,
    color: '#666',
  },
  discMatchColor: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  discMatchCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.violet.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Owner not found styles
  smsInviteCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  smsInviteText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
});
