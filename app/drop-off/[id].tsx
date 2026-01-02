import { logger } from '@/lib/logger';
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import CameraWithOverlay, { PhotoCaptureResult } from '@/components/CameraWithOverlay';
import { compressImage } from '@/utils/imageCompression';
import { handleError, showSuccess } from '@/lib/errorHandler';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export default function DropOffScreen() {
  const { id: recoveryEventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [locationNotes, setLocationNotes] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discName, setDiscName] = useState<string>('the disc');

  // Fetch recovery details for disc name
  const fetchRecoveryDetails = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-recovery-details?id=${recoveryEventId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.disc?.name) {
          setDiscName(data.disc.name);
        }
      }
    } catch (error) {
      logger.error('Error fetching recovery details:', error);
    }
  }, [recoveryEventId]);

  useEffect(() => {
    fetchRecoveryDetails();
  }, [fetchRecoveryDetails]);

  // Request location permission and get current location
  const requestLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to record the drop-off location. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      handleError(error, { operation: 'get-location' });
    } finally {
      setLoadingLocation(false);
    }
  };

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const handlePhotoTaken = (result: PhotoCaptureResult) => {
    setPhotoUri(result.uri);
  };

  const openMapsPreview = () => {
    if (location) {
      const url = Platform.select({
        ios: `maps:0,0?q=${location.latitude},${location.longitude}`,
        android: `geo:${location.latitude},${location.longitude}?q=${location.latitude},${location.longitude}`,
        default: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
      });
      Linking.openURL(url as string);
    }
  };

  const validateForm = () => {
    if (!photoUri) {
      Alert.alert('Missing Photo', 'Please take a photo of the drop-off location.');
      return false;
    }

    if (!location) {
      Alert.alert('Missing Location', 'Please enable location services to record the drop-off spot.');
      return false;
    }

    return true;
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      // Compress the image
      const compressed = await compressImage(uri);

      // Create form data for edge function
      const formData = new FormData();
      formData.append('recovery_event_id', recoveryEventId);
      formData.append('file', {
        uri: compressed.uri,
        type: 'image/jpeg',
        name: 'drop-off-photo.jpg',
      } as unknown as Blob);

      // Upload via edge function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/upload-drop-off-photo`,
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
        logger.error('Upload error:', data.error);
        return null;
      }

      return data.photo_url;
    } catch (error) {
      logger.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to create a drop-off.');
        setSubmitting(false);
        return;
      }

      // Upload photo first
      const photoUrl = await uploadPhoto(photoUri!);
      if (!photoUrl) {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
        setSubmitting(false);
        return;
      }

      // Create drop-off via edge function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-drop-off`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recovery_event_id: recoveryEventId,
            photo_url: photoUrl,
            latitude: location!.latitude,
            longitude: location!.longitude,
            location_notes: locationNotes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create drop-off');
      }

      showSuccess(`You've left ${discName} for the owner to pick up`);
      router.replace('/(tabs)/found-disc');
    } catch (error) {
      handleError(error, { operation: 'create-drop-off' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <FontAwesome name="map-marker" size={48} color={Colors.violet.primary} />
          <Text style={styles.title}>Drop Off Location</Text>
          <Text style={styles.subtitle}>
            Leave the disc somewhere safe and record the location for the owner to pick up.
          </Text>
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
            Photo of Location <Text style={styles.required}>*</Text>
          </Text>

          {photoUri ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
              <Pressable
                style={styles.retakeButton}
                onPress={() => setShowCamera(true)}
              >
                <FontAwesome name="camera" size={16} color="#fff" />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[
                styles.photoButton,
                {
                  backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
                  borderColor: isDark ? '#333' : '#ddd',
                },
              ]}
              onPress={() => setShowCamera(true)}
            >
              <FontAwesome name="camera" size={32} color={Colors.violet.primary} />
              <Text style={[styles.photoButtonText, { color: isDark ? '#ccc' : '#666' }]}>
                Take a photo of the drop-off spot
              </Text>
            </Pressable>
          )}
          <Text style={styles.hint}>
            Take a clear photo showing where you left the disc so the owner can find it.
          </Text>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
            GPS Location <Text style={styles.required}>*</Text>
          </Text>

          {loadingLocation ? (
            <View
              style={[
                styles.locationBox,
                {
                  backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
                  borderColor: isDark ? '#333' : '#ddd',
                },
              ]}
            >
              <ActivityIndicator color={Colors.violet.primary} />
              <Text style={[styles.locationText, { color: isDark ? '#ccc' : '#666' }]}>
                Getting your location...
              </Text>
            </View>
          ) : location ? (
            <Pressable
              style={[
                styles.locationBox,
                styles.locationBoxSuccess,
                {
                  backgroundColor: isDark ? '#1a2a1a' : '#f0fff0',
                  borderColor: '#4CAF50',
                },
              ]}
              onPress={openMapsPreview}
            >
              <FontAwesome name="check-circle" size={24} color="#4CAF50" />
              <View style={styles.locationDetails}>
                <Text style={[styles.locationText, { color: isDark ? '#ccc' : '#333' }]}>
                  Location captured
                </Text>
                <Text style={styles.locationCoords}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
              <FontAwesome name="external-link" size={18} color={isDark ? '#999' : '#666'} />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.locationBox,
                {
                  backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
                  borderColor: isDark ? '#333' : '#ddd',
                },
              ]}
              onPress={requestLocation}
            >
              <FontAwesome name="location-arrow" size={24} color={Colors.violet.primary} />
              <Text style={[styles.locationText, { color: isDark ? '#ccc' : '#666' }]}>
                Tap to get current location
              </Text>
            </Pressable>
          )}
          <Text style={styles.hint}>
            Your GPS coordinates will help the owner navigate to the drop-off spot.
          </Text>
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
            Location Notes (Optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              {
                backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
                borderColor: isDark ? '#333' : '#ddd',
                color: isDark ? '#fff' : '#000',
              },
            ]}
            placeholder="e.g., Behind the big oak tree near hole 7, under a rock"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={locationNotes}
            onChangeText={setLocationNotes}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.hint}>
            Add any helpful details to help the owner find the exact spot.
          </Text>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="check" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Confirm Drop-off</Text>
            </>
          )}
        </Pressable>

        {/* Cancel Button */}
        <Pressable style={styles.textButton} onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.textButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>

      {/* Camera Modal */}
      <CameraWithOverlay
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
        showCircleGuide={false}
        helperText="Take a photo of the drop-off location"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: Colors.violet.primary,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  photoButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  photoButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },
  photoPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  locationBoxSuccess: {
    borderWidth: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  notesInput: {
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
  primaryButtonDisabled: {
    opacity: 0.6,
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
