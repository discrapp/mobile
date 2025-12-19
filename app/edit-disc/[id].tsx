import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
  Image,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import CameraWithOverlay from '@/components/CameraWithOverlay';
import ImageCropperWithCircle from '@/components/ImageCropperWithCircle';
import { DiscAutocomplete } from '@/components/DiscAutocomplete';
import { PlasticPicker } from '@/components/PlasticPicker';
import { CategoryPicker } from '@/components/CategoryPicker';
import { CatalogDisc } from '@/hooks/useDiscCatalogSearch';
import { compressImage } from '@/utils/imageCompression';
import { FormFieldSkeleton, Skeleton } from '@/components/Skeleton';

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
  photos: DiscPhoto[];
}

export default function EditDiscScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = Colors[colorScheme ?? 'light'].text;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dynamic styles for dark/light mode
  const dynamicContainerStyle = {
    backgroundColor: isDark ? '#000' : '#fff',
  };

  const dynamicInputStyle = {
    backgroundColor: isDark ? '#1a1a1a' : '#fff',
    borderColor: isDark ? '#333' : '#ccc',
  };

  // Predefined color options
  const COLOR_OPTIONS = [
    { name: 'Red', hex: '#E74C3C' },
    { name: 'Orange', hex: '#E67E22' },
    { name: 'Yellow', hex: '#F1C40F' },
    { name: 'Green', hex: '#2ECC71' },
    { name: 'Blue', hex: '#3498DB' },
    { name: 'Purple', hex: '#9B59B6' },
    { name: 'Pink', hex: '#E91E63' },
    { name: 'White', hex: '#ECF0F1' },
    { name: 'Black', hex: '#2C3E50' },
    { name: 'Gray', hex: '#95A5A6' },
    { name: 'Multi', hex: 'rainbow' },
  ];

  // Form fields
  const [manufacturer, setManufacturer] = useState('');
  const [mold, setMold] = useState('');
  const [category, setCategory] = useState('');
  const [plastic, setPlastic] = useState('');
  const [weight, setWeight] = useState('');
  const [color, setColor] = useState('');
  const [speed, setSpeed] = useState('');
  const [glide, setGlide] = useState('');
  const [turn, setTurn] = useState('');
  const [fade, setFade] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Photos
  const [existingPhotos, setExistingPhotos] = useState<DiscPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState('');

  // Validation errors
  const [moldError, setMoldError] = useState('');

  // Handler for when a disc is selected from autocomplete
  const handleDiscSelected = useCallback((disc: CatalogDisc) => {
    setMold(disc.mold);
    setManufacturer(disc.manufacturer);

    // Auto-fill category if available
    if (disc.category) setCategory(disc.category);

    // Clear plastic since manufacturer may have changed
    setPlastic('');

    // Auto-fill flight numbers if available
    if (disc.speed !== null) setSpeed(disc.speed.toString());
    if (disc.glide !== null) setGlide(disc.glide.toString());
    if (disc.turn !== null) setTurn(disc.turn.toString());
    if (disc.fade !== null) setFade(disc.fade.toString());

    // Clear any mold error since we selected a valid disc
    if (moldError) setMoldError('');
  }, [moldError]);

  useEffect(() => {
    fetchDiscData();
  }, [id]);

  const fetchDiscData = async () => {
    console.log('fetchDiscData called for disc:', id);
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
      const disc = discs.find((d: Disc) => d.id === id);

      if (!disc) {
        Alert.alert('Error', 'Disc not found');
        router.back();
        return;
      }

      // Populate form fields
      const manufacturerValue = disc.manufacturer || '';
      const moldValue = disc.mold || '';
      const categoryValue = disc.category || '';
      const plasticValue = disc.plastic || '';
      const weightValue = disc.weight ? disc.weight.toString() : '';
      const colorValue = disc.color || '';
      const speedValue = disc.flight_numbers.speed !== null ? disc.flight_numbers.speed.toString() : '';
      const glideValue = disc.flight_numbers.glide !== null ? disc.flight_numbers.glide.toString() : '';
      const turnValue = disc.flight_numbers.turn !== null ? disc.flight_numbers.turn.toString() : '';
      const fadeValue = disc.flight_numbers.fade !== null ? disc.flight_numbers.fade.toString() : '';
      const rewardAmountValue = disc.reward_amount ? disc.reward_amount.toString() : '';
      const notesValue = disc.notes || '';
      // Filter out photos without valid URLs (orphaned database records)
      const photosValue = Array.isArray(disc.photos)
        ? disc.photos.filter((p: DiscPhoto) => p.photo_url && p.photo_url.trim() !== '')
        : [];

      console.log('Setting form values:', {
        manufacturer: manufacturerValue,
        mold: moldValue,
        category: categoryValue,
        plastic: plasticValue,
        weight: weightValue,
        color: colorValue,
        speed: speedValue,
        glide: glideValue,
        turn: turnValue,
        fade: fadeValue,
        rewardAmount: rewardAmountValue,
        notes: notesValue,
        photoCount: photosValue.length,
      });

      setManufacturer(manufacturerValue);
      setMold(moldValue);
      setCategory(categoryValue);
      setPlastic(plasticValue);
      setWeight(weightValue);
      setColor(colorValue);
      setSpeed(speedValue);
      setGlide(glideValue);
      setTurn(turnValue);
      setFade(fadeValue);
      setRewardAmount(rewardAmountValue);
      setNotes(notesValue);
      setExistingPhotos(photosValue);

      console.log('Disc data loaded successfully');
    } catch (error) {
      console.error('Error fetching disc:', error);
      Alert.alert('Error', 'Failed to load disc data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Mold is required
    if (!mold.trim()) {
      setMoldError('Mold name is required');
      isValid = false;
    } else {
      setMoldError('');
    }

    return isValid;
  };

  const getTotalPhotos = () => existingPhotos.length + newPhotos.length;

  const pickImage = async () => {
    if (getTotalPhotos() >= 4) {
      Alert.alert('Maximum photos', 'You can only have up to 4 photos per disc');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need camera roll permissions to add photos');
      return;
    }

    // Launch image picker (no editing, we'll use custom cropper)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1.0,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setShowCropper(true);
    }
  };

  const handleCropComplete = (uri: string) => {
    setNewPhotos([...newPhotos, uri]);
  };

  const takePhoto = async () => {
    if (getTotalPhotos() >= 4) {
      Alert.alert('Maximum photos', 'You can only have up to 4 photos per disc');
      return;
    }

    setShowCamera(true);
  };

  const handlePhotoTaken = (uri: string) => {
    // Route camera photos through the cropper like library photos
    setSelectedImageUri(uri);
    setShowCropper(true);
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoId: string) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Remove from UI immediately
            setExistingPhotos(existingPhotos.filter((p) => p.id !== photoId));

            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert('Error', 'You must be signed in to delete a photo');
                return;
              }

              // Delete from storage and database immediately
              const deleteResponse = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-disc-photo`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ photo_id: photoId }),
                }
              );

              if (!deleteResponse.ok) {
                const deleteError = await deleteResponse.json();
                console.error('Failed to delete photo:', deleteError);
                Alert.alert('Error', 'Failed to delete photo. Please try again.');
                // Restore the photo to the UI if deletion failed
                fetchDiscData();
              } else {
                console.log('Photo deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
              // Restore the photo to the UI if deletion failed
              fetchDiscData();
            }
          },
        },
      ]
    );
  };

  const showPhotoOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to update a disc');
        return;
      }

      // Prepare flight numbers
      const flightNumbers: FlightNumbers = {
        speed: speed ? parseInt(speed, 10) : null,
        glide: glide ? parseInt(glide, 10) : null,
        turn: turn ? parseFloat(turn) : null,
        fade: fade ? parseInt(fade, 10) : null,
      };

      const requestBody = {
        disc_id: id,
        mold: mold.trim(),
        manufacturer: manufacturer.trim() || undefined,
        category: category.trim() || undefined,
        plastic: plastic.trim() || undefined,
        weight: weight ? parseInt(weight, 10) : undefined,
        color: color.trim() || undefined,
        flight_numbers: flightNumbers,
        reward_amount: rewardAmount ? parseFloat(rewardAmount) : undefined,
        notes: notes.trim() || undefined,
      };

      console.log('Updating disc with:', JSON.stringify(requestBody, null, 2));

      // Call update-disc edge function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-disc`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = JSON.stringify(data, null, 2);
        console.error('❌ API Error Response:', errorMessage);
        console.error('❌ Response status:', response.status);
        Alert.alert('API Error', `Status: ${response.status}\n\n${errorMessage}`, [
          { text: 'OK' },
        ]);
        throw new Error(data.error || data.details || 'Failed to update disc');
      }

      // Upload new photos if any
      if (newPhotos.length > 0) {
        console.log(`Uploading ${newPhotos.length} new photos for disc ${id}`);

        for (let i = 0; i < newPhotos.length; i++) {
          const photoUri = newPhotos[i];

          try {
            // Compress the image before upload
            const compressed = await compressImage(photoUri);

            const formData = new FormData();
            formData.append('disc_id', id);

            // Create file object for FormData (always JPEG after compression)
            formData.append('file', {
              uri: compressed.uri,
              type: 'image/jpeg',
              name: 'disc-photo.jpg',
            } as any);

            const photoResponse = await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/upload-disc-photo`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
              }
            );

            if (!photoResponse.ok) {
              const photoError = await photoResponse.json();
              console.error(`Failed to upload photo ${i + 1}:`, photoError);
            } else {
              console.log(`✅ Photo ${i + 1} uploaded successfully`);
            }
          } catch (photoError) {
            console.error(`Error uploading photo ${i + 1}:`, photoError);
          }
        }
      }

      // Clear new photos array after successful save
      setNewPhotos([]);

      Alert.alert('Success', 'Disc updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating disc:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update disc');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScrollView style={[styles.scrollView, dynamicContainerStyle]} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Skeleton width={150} height={28} style={{ marginBottom: 24 }} />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.container, dynamicContainerStyle]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}>
      <ScrollView style={[styles.scrollView, dynamicContainerStyle]} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.title}>Edit Disc</Text>

          {/* Mold - Required with Autocomplete */}
          <View style={[styles.field, styles.autocompleteField]}>
            <Text style={styles.label}>
              Mold <Text style={styles.required}>*</Text>
            </Text>
            <DiscAutocomplete
              value={mold}
              onChangeText={(text) => {
                setMold(text);
                if (moldError) setMoldError('');
              }}
              onSelectDisc={handleDiscSelected}
              placeholder="e.g., Destroyer"
              error={moldError}
              textColor={textColor}
            />
            {moldError ? <Text style={styles.errorText}>{moldError}</Text> : null}
            <Text style={styles.hintText}>
              Start typing to search known discs
            </Text>
          </View>

          {/* Manufacturer */}
          <View style={styles.field}>
            <Text style={styles.label}>Manufacturer</Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }]}
              value={manufacturer}
              onChangeText={(text) => {
                setManufacturer(text);
                // Clear plastic when manufacturer changes
                setPlastic('');
              }}
              placeholder="e.g., Innova"
              placeholderTextColor="#999"
            />
          </View>

          {/* Category/Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Disc Type</Text>
            <CategoryPicker
              value={category}
              onChange={setCategory}
              textColor={textColor}
            />
          </View>

          {/* Plastic */}
          <View style={styles.field}>
            <Text style={styles.label}>Plastic</Text>
            <PlasticPicker
              value={plastic}
              onChange={setPlastic}
              manufacturer={manufacturer}
              textColor={textColor}
            />
          </View>

          {/* Weight */}
          <View style={styles.field}>
            <Text style={styles.label}>Weight (grams)</Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g., 175"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Color */}
          <View style={styles.field}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((colorOption) => (
                <Pressable
                  key={colorOption.name}
                  style={[
                    styles.colorOption,
                    color === colorOption.name && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(colorOption.name)}>
                  {colorOption.hex === 'rainbow' ? (
                    <View style={styles.rainbowCircle}>
                      <View style={[styles.rainbowSlice, { backgroundColor: '#E74C3C' }]} />
                      <View style={[styles.rainbowSlice, { backgroundColor: '#F1C40F' }]} />
                      <View style={[styles.rainbowSlice, { backgroundColor: '#2ECC71' }]} />
                      <View style={[styles.rainbowSlice, { backgroundColor: '#3498DB' }]} />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: colorOption.hex },
                        colorOption.name === 'White' && styles.colorCircleBorder,
                      ]}
                    />
                  )}
                  <Text style={styles.colorLabel}>{colorOption.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Flight Numbers */}
          <Text style={styles.sectionTitle}>Flight Numbers</Text>
          <View style={styles.row}>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Speed</Text>
              <TextInput
                style={[styles.input, dynamicInputStyle, { color: textColor }]}
                value={speed}
                onChangeText={setSpeed}
                placeholder="1-15"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Glide</Text>
              <TextInput
                style={[styles.input, dynamicInputStyle, { color: textColor }]}
                value={glide}
                onChangeText={setGlide}
                placeholder="1-7"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Turn</Text>
              <TextInput
                style={[styles.input, dynamicInputStyle, { color: textColor }]}
                value={turn}
                onChangeText={setTurn}
                placeholder="-5 to 1"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Fade</Text>
              <TextInput
                style={[styles.input, dynamicInputStyle, { color: textColor }]}
                value={fade}
                onChangeText={setFade}
                placeholder="0-5"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Reward Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Reward Amount</Text>
            <View style={[styles.inputWithPrefix, dynamicInputStyle]}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefixText, { color: textColor }]}
                value={rewardAmount}
                onChangeText={(text) => {
                  // Only allow numbers and decimal point
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  // Only allow one decimal point
                  const parts = cleaned.split('.');
                  if (parts.length > 2) return;
                  // Limit to 2 decimal places
                  if (parts[1] && parts[1].length > 2) return;
                  setRewardAmount(cleaned);
                }}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, dynamicInputStyle, { color: textColor }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this disc..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Photos */}
          <View style={styles.field}>
            <Text style={styles.label}>Photos</Text>
            <View style={styles.photoGrid}>
              {/* Existing photos */}
              {existingPhotos
                .filter((photo) => photo.photo_url && photo.photo_url.trim() !== '')
                .map((photo) => (
                  <View key={photo.id} style={styles.photoWrapper}>
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: photo.photo_url }} style={styles.photoImage} />
                    </View>
                    <Pressable
                      style={styles.photoRemoveButton}
                      onPress={() => removeExistingPhoto(photo.id)}>
                      <FontAwesome name="times-circle" size={24} color="#ff4444" />
                    </Pressable>
                  </View>
              ))}
              {/* New photos */}
              {newPhotos.map((photo, index) => (
                <View key={`new-${index}`} style={styles.photoWrapper}>
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: photo }} style={styles.photoImage} />
                  </View>
                  <Pressable
                    style={styles.photoRemoveButton}
                    onPress={() => removeNewPhoto(index)}>
                    <FontAwesome name="times-circle" size={24} color="#ff4444" />
                  </Pressable>
                </View>
              ))}
              {/* Add photo button */}
              {getTotalPhotos() < 4 && (
                <Pressable style={styles.photoAddButton} onPress={showPhotoOptions}>
                  <FontAwesome name="camera" size={32} color="#999" />
                  <Text style={styles.photoAddText}>Add Photo</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.photoHint}>
              {existingPhotos.length} saved, {newPhotos.length} new • {4 - getTotalPhotos()}{' '}
              remaining
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => router.back()}
              disabled={saving}>
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <CameraWithOverlay
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
      />

      <ImageCropperWithCircle
        visible={showCropper}
        imageUri={selectedImageUri}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  autocompleteField: {
    zIndex: 1000, // Ensure dropdown appears above other fields
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  fieldSmall: {
    flex: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#ff4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: 12,
    color: '#666',
  },
  inputWithPrefixText: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 70,
  },
  colorOptionSelected: {
    borderColor: Colors.violet.primary,
    backgroundColor: 'rgba(59, 24, 119, 0.1)',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  colorCircleBorder: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rainbowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 4,
  },
  rainbowSlice: {
    flex: 1,
    height: '100%',
  },
  colorLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  photoImage: {
    width: 100,
    height: 100,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  existingPhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingPhotoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  photoAddButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  photoHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.violet.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.violet.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
