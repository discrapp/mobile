import { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import CameraWithOverlay from '@/components/CameraWithOverlay';
import ImageCropperWithCircle from '@/components/ImageCropperWithCircle';

interface FlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

export default function AddDiscScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const textColor = Colors[colorScheme ?? 'light'].text;
  const [loading, setLoading] = useState(false);

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
    { name: 'Multi', hex: 'rainbow' }, // Special rainbow indicator
  ];

  // Form fields
  const [manufacturer, setManufacturer] = useState('');
  const [mold, setMold] = useState('');
  const [plastic, setPlastic] = useState('');
  const [weight, setWeight] = useState('');
  const [color, setColor] = useState('');
  const [speed, setSpeed] = useState('');
  const [glide, setGlide] = useState('');
  const [turn, setTurn] = useState('');
  const [fade, setFade] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Photos (up to 4)
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState('');

  // Validation errors
  const [moldError, setMoldError] = useState('');

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

  const pickImage = async () => {
    if (photos.length >= 4) {
      Alert.alert('Maximum photos', 'You can only add up to 4 photos per disc');
      return;
    }

    // Request permissions
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
    setPhotos([...photos, uri]);
  };

  const takePhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Maximum photos', 'You can only add up to 4 photos per disc');
      return;
    }

    setShowCamera(true);
  };

  const handlePhotoTaken = (uri: string) => {
    setPhotos([...photos, uri]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
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

    setLoading(true);

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to add a disc');
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
        mold: mold.trim(),
        manufacturer: manufacturer.trim() || undefined,
        plastic: plastic.trim() || undefined,
        weight: weight ? parseInt(weight, 10) : undefined,
        color: color.trim() || undefined,
        flight_numbers: flightNumbers,
        reward_amount: rewardAmount ? parseFloat(rewardAmount) : undefined, // Send as dollars (decimal)
        notes: notes.trim() || undefined,
      };

      console.log('Creating disc with:', JSON.stringify(requestBody, null, 2));

      // Call create-disc edge function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-disc`,
        {
          method: 'POST',
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
        Alert.alert(
          'API Error',
          `Status: ${response.status}\n\n${errorMessage}`,
          [{ text: 'OK' }]
        );
        throw new Error(data.error || data.details || 'Failed to create disc');
      }

      // Upload photos if any
      if (photos.length > 0) {
        console.log(`Uploading ${photos.length} photos for disc ${data.id}`);

        for (let i = 0; i < photos.length; i++) {
          const photoUri = photos[i];

          try {
            // Create FormData for photo upload
            const formData = new FormData();
            formData.append('disc_id', data.id);

            // Get file extension from URI
            const uriParts = photoUri.split('.');
            const fileType = uriParts[uriParts.length - 1];

            // Create file object for FormData
            formData.append('file', {
              uri: photoUri,
              type: `image/${fileType}`,
              name: `disc-photo.${fileType}`,
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
              // Continue with other photos even if one fails
            } else {
              console.log(`✅ Photo ${i + 1} uploaded successfully`);
            }
          } catch (photoError) {
            console.error(`Error uploading photo ${i + 1}:`, photoError);
            // Continue with other photos even if one fails
          }
        }
      }

      Alert.alert('Success', 'Disc added to your bag!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating disc:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add disc');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.title}>Add Disc to Your Bag</Text>

          {/* Mold - Required */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Mold <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, moldError ? styles.inputError : null]}
              value={mold}
              onChangeText={(text) => {
                setMold(text);
                if (moldError) setMoldError('');
              }}
              placeholder="e.g., Destroyer"
              placeholderTextColor="#999"
              color={textColor}
            />
            {moldError ? <Text style={styles.errorText}>{moldError}</Text> : null}
          </View>

          {/* Manufacturer */}
          <View style={styles.field}>
            <Text style={styles.label}>Manufacturer</Text>
            <TextInput
              style={styles.input}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="e.g., Innova"
              placeholderTextColor="#999"
              color={textColor}
            />
          </View>

          {/* Plastic */}
          <View style={styles.field}>
            <Text style={styles.label}>Plastic</Text>
            <TextInput
              style={styles.input}
              value={plastic}
              onChangeText={setPlastic}
              placeholder="e.g., Star"
              placeholderTextColor="#999"
              color={textColor}
            />
          </View>

          {/* Weight */}
          <View style={styles.field}>
            <Text style={styles.label}>Weight (grams)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g., 175"
              placeholderTextColor="#999"
              keyboardType="numeric"
              color={textColor}
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
                style={styles.input}
                value={speed}
                onChangeText={setSpeed}
                placeholder="1-15"
                placeholderTextColor="#999"
                keyboardType="numeric"
                color={textColor}
              />
            </View>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Glide</Text>
              <TextInput
                style={styles.input}
                value={glide}
                onChangeText={setGlide}
                placeholder="1-7"
                placeholderTextColor="#999"
                keyboardType="numeric"
                color={textColor}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Turn</Text>
              <TextInput
                style={styles.input}
                value={turn}
                onChangeText={setTurn}
                placeholder="-5 to 1"
                placeholderTextColor="#999"
                keyboardType="numeric"
                color={textColor}
              />
            </View>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Fade</Text>
              <TextInput
                style={styles.input}
                value={fade}
                onChangeText={setFade}
                placeholder="0-5"
                placeholderTextColor="#999"
                keyboardType="numeric"
                color={textColor}
              />
            </View>
          </View>

          {/* Reward Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Reward Amount</Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefixText]}
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
                color={textColor}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this disc..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              color={textColor}
            />
          </View>

          {/* Photos */}
          <View style={styles.field}>
            <Text style={styles.label}>Photos (Optional)</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <Pressable
                    style={styles.photoRemoveButton}
                    onPress={() => removePhoto(index)}>
                    <FontAwesome name="times-circle" size={24} color="#ff4444" />
                  </Pressable>
                </View>
              ))}
              {photos.length < 4 && (
                <Pressable style={styles.photoAddButton} onPress={showPhotoOptions}>
                  <FontAwesome name="camera" size={32} color="#999" />
                  <Text style={styles.photoAddText}>Add Photo</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.photoHint}>You can add up to 4 photos per disc</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => router.back()}
              disabled={loading}>
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Save Disc</Text>
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
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.violet.primary,
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
    color: Colors.violet.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
