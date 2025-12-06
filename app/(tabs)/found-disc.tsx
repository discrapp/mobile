import { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

type ScreenState = 'input' | 'loading' | 'found' | 'reporting' | 'success' | 'error';

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

export default function FoundDiscScreen() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [message, setMessage] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('input');
  const [discInfo, setDiscInfo] = useState<DiscInfo | null>(null);
  const [recoveryEvent, setRecoveryEvent] = useState<RecoveryEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasActiveRecovery, setHasActiveRecovery] = useState(false);

  const lookupQrCode = async () => {
    if (!qrCode.trim()) {
      Alert.alert('Error', 'Please enter a QR code');
      return;
    }

    setScreenState('loading');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/lookup-qr-code?code=${encodeURIComponent(qrCode.trim())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!data.found) {
        setErrorMessage('No disc found with this QR code. Please check and try again.');
        setScreenState('error');
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
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <FontAwesome name="search" size={48} color={Colors.violet.primary} />
            <Text style={styles.title}>Found a Disc?</Text>
            <Text style={styles.subtitle}>
              Enter the QR code from the disc to help reunite it with its owner.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>QR Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter code (e.g., ABC123)"
              placeholderTextColor="#999"
              value={qrCode}
              onChangeText={setQrCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={lookupQrCode}>
            <FontAwesome name="search" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Look Up Disc</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Loading State
  if (screenState === 'loading' || screenState === 'reporting') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>
          {screenState === 'loading' ? 'Looking up disc...' : 'Reporting found disc...'}
        </Text>
      </View>
    );
  }

  // Error State
  if (screenState === 'error') {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="exclamation-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <Pressable style={styles.secondaryButton} onPress={resetScreen}>
          <FontAwesome name="refresh" size={18} color={Colors.violet.primary} />
          <Text style={styles.secondaryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Found State - Show disc info and report button
  if (screenState === 'found' && discInfo) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
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
              style={[styles.input, styles.messageInput]}
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
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="check-circle" size={80} color="#2ECC71" />
        <Text style={styles.successTitle}>Thank You!</Text>
        <Text style={styles.successMessage}>
          You've reported finding "{recoveryEvent.disc_name}". The owner has been notified.
        </Text>

        <Pressable style={styles.primaryButton} onPress={navigateToProposeMeetup}>
          <FontAwesome name="calendar" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Propose a Meetup</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={resetScreen}>
          <Text style={styles.secondaryButtonText}>Report Another Disc</Text>
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
    backgroundColor: '#fff',
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
    borderWidth: 2,
    borderColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: Colors.violet.primary,
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
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
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
    marginBottom: 32,
    paddingHorizontal: 20,
  },
});
