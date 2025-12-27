import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View as RNView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/components/useColorScheme';
import { handleError, showSuccess } from '@/lib/errorHandler';

interface Disc {
  id: string;
  name: string;
  manufacturer?: string;
  mold?: string;
  color?: string;
}

export default function LinkStickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [shortCode, setShortCode] = useState(params.code || '');
  const [loading, setLoading] = useState(false);

  // Dynamic styles for dark/light mode
  const dynamicContainerStyle = {
    backgroundColor: isDark ? '#000' : '#fff',
  };
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [discs, setDiscs] = useState<Disc[]>([]);
  const [loadingDiscs, setLoadingDiscs] = useState(false);
  const [selectedDiscId, setSelectedDiscId] = useState<string | null>(null);

  // Fetch user's discs
  useEffect(() => {
    fetchUserDiscs();
  }, []);

  // istanbul ignore next -- Auto-verify tested via integration tests
  // Auto-verify if code is passed as param
  useEffect(() => {
    if (params.code) {
      verifyCode(params.code);
    }
  }, [params.code]);

  // istanbul ignore next -- Disc fetching tested via integration tests
  const fetchUserDiscs = async () => {
    setLoadingDiscs(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-user-discs`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter out discs that already have a QR code linked
        const availableDiscs = data.filter((d: Disc & { qr_code?: unknown }) => !d.qr_code);
        setDiscs(availableDiscs);
      }
    } catch (error) {
      console.error('Error fetching discs:', error);
    } finally {
      setLoadingDiscs(false);
    }
  };

  // istanbul ignore next -- Code verification tested via integration tests
  const verifyCode = async (code: string) => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter a sticker code');
      return;
    }

    setVerifying(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'Please sign in to link stickers');
        return;
      }

      // Verify the QR code belongs to the user and is in 'assigned' status
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-qr-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ short_code: code.trim().toUpperCase() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Invalid sticker code');
        return;
      }

      if (data.status === 'active') {
        Alert.alert('Already Linked', 'This sticker is already linked to a disc.');
        return;
      }

      if (data.status !== 'assigned') {
        Alert.alert('Error', 'This sticker cannot be linked. Please contact support.');
        return;
      }

      setVerified(true);
      setShortCode(code.trim().toUpperCase());
    } catch (error) {
      handleError(error, { operation: 'verify-sticker-code' });
    } finally {
      setVerifying(false);
    }
  };

  // istanbul ignore next -- Linking tested via integration tests
  const handleLink = async () => {
    if (!selectedDiscId) {
      Alert.alert('Error', 'Please select a disc to link');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'Please sign in to link stickers');
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
          body: JSON.stringify({
            short_code: shortCode,
            disc_id: selectedDiscId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to link sticker');
        return;
      }

      Alert.alert(
        'Success!',
        'Your sticker has been linked to your disc. Anyone who scans it can now contact you.',
        [
          {
            text: 'View Disc',
            onPress: () => router.replace(`/disc/${selectedDiscId}`),
          },
          {
            text: 'Link Another',
            onPress: () => {
              setShortCode('');
              setVerified(false);
              setSelectedDiscId(null);
            },
          },
        ]
      );
    } catch (error) {
      handleError(error, { operation: 'link-sticker' });
    } finally {
      setLoading(false);
    }
  };

  const renderDiscOption = (disc: Disc) => {
    const isSelected = selectedDiscId === disc.id;

    return (
      <Pressable
        key={disc.id}
        style={[
          styles.discOption,
          isSelected && styles.discOptionSelected,
          { backgroundColor: isDark ? '#2a2a2a' : '#fff' },
        ]}
        onPress={() => setSelectedDiscId(disc.id)}>
        <RNView style={styles.discOptionContent}>
          <RNView style={styles.discOptionInfo}>
            <Text style={styles.discOptionName}>{disc.mold || disc.name}</Text>
            {disc.manufacturer && (
              <Text style={styles.discOptionManufacturer}>{disc.manufacturer}</Text>
            )}
            {disc.color && <Text style={styles.discOptionColor}>{disc.color}</Text>}
          </RNView>
          <RNView
            style={[
              styles.radioOuter,
              isSelected && styles.radioOuterSelected,
            ]}>
            {isSelected && <RNView style={styles.radioInner} />}
          </RNView>
        </RNView>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicContainerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.scrollView, dynamicContainerStyle]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
          {!verified ? (
            // Step 1: Enter/Verify Code
            <RNView style={styles.section}>
              <RNView style={styles.iconContainer}>
                <FontAwesome name="qrcode" size={48} color={Colors.violet.primary} />
              </RNView>
              <Text style={styles.title}>Enter Sticker Code</Text>
              <Text style={styles.description}>
                Find the code printed on your sticker and enter it below
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#2a2a2a' : '#fff',
                    color: isDark ? '#fff' : '#000',
                  },
                ]}
                value={shortCode}
                onChangeText={(text) => setShortCode(text.toUpperCase())}
                placeholder="e.g., ABC123XY"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
              />

              <Pressable
                style={[styles.button, verifying && styles.buttonDisabled]}
                onPress={() => verifyCode(shortCode)}
                disabled={verifying || !shortCode.trim()}>
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="check" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Verify Code</Text>
                  </>
                )}
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={() => router.back()}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </RNView>
          ) : (
            // Step 2: Select Disc
            <RNView style={styles.section}>
              <RNView style={styles.verifiedBadge}>
                <FontAwesome name="check-circle" size={20} color="#27AE60" />
                <Text style={styles.verifiedText}>Code Verified: {shortCode}</Text>
                <Pressable onPress={() => setVerified(false)}>
                  <Text style={styles.changeCode}>Change</Text>
                </Pressable>
              </RNView>

              <Text style={styles.title}>Select a Disc</Text>
              <Text style={styles.description}>
                Choose which disc to link this sticker to
              </Text>

              {loadingDiscs ? (
                <ActivityIndicator
                  size="large"
                  color={Colors.violet.primary}
                  style={styles.loadingDiscs}
                />
              ) : discs.length === 0 ? (
                <RNView style={styles.emptyState}>
                  <FontAwesome name="circle-o" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No discs available</Text>
                  <Text style={styles.emptySubtext}>
                    Add a disc first or unlink an existing sticker
                  </Text>
                  <Pressable
                    style={styles.addDiscButton}
                    onPress={() => router.push('/add-disc')}>
                    <FontAwesome name="plus" size={14} color="#fff" />
                    <Text style={styles.addDiscButtonText}>Add Disc</Text>
                  </Pressable>
                </RNView>
              ) : (
                <>
                  <RNView style={styles.discList}>
                    {discs.map(renderDiscOption)}
                  </RNView>

                  <Pressable
                    style={[
                      styles.button,
                      (!selectedDiscId || loading) && styles.buttonDisabled,
                    ]}
                    onPress={handleLink}
                    disabled={!selectedDiscId || loading}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <FontAwesome name="link" size={16} color="#fff" />
                        <Text style={styles.buttonText}>Link Sticker to Disc</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </RNView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.violet[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.violet.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  verifiedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
  },
  changeCode: {
    fontSize: 14,
    color: Colors.violet.primary,
    fontWeight: '500',
  },
  loadingDiscs: {
    marginTop: 32,
  },
  discList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  discOption: {
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  discOptionSelected: {
    borderColor: Colors.violet.primary,
    borderWidth: 2,
  },
  discOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discOptionInfo: {
    flex: 1,
  },
  discOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  discOptionManufacturer: {
    fontSize: 14,
    color: '#666',
  },
  discOptionColor: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.violet.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.violet.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  addDiscButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.violet.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addDiscButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
