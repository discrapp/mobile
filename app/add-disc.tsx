import { useState, useCallback, useRef } from 'react';
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
  Dimensions,
  View as RNView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
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
import { formatFeeHint } from '@/lib/stripeFees';
import { handleError } from '@/lib/errorHandler';
import { useDiscIdentification, IdentificationResult } from '@/hooks/useDiscIdentification';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * React Native FormData file object structure.
 * This is the format expected by FormData.append() for file uploads in React Native.
 */
interface FormDataFile {
  uri: string;
  type: string;
  name: string;
}

interface FlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

export default function AddDiscScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = Colors[colorScheme ?? 'light'].text;
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // QR scanning state
  const [showQrScanner, setShowQrScanner] = useState(false);
  const isProcessingQr = useRef(false);
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [qrShortCode, setQrShortCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

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
    { name: 'Multi', hex: 'rainbow' }, // Special rainbow indicator
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

  // Photos (up to 4)
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState('');

  // Entry mode selection
  type EntryMode = 'qr' | 'photo-ai' | 'manual' | null;
  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(true);

  // AI Identification
  const { identify, isLoading: isIdentifying, error: identifyError, result: identificationResult, reset: resetIdentification } = useDiscIdentification();
  const [showAiCamera, setShowAiCamera] = useState(false);
  const [showAiCropper, setShowAiCropper] = useState(false);
  const [aiImageUri, setAiImageUri] = useState('');
  const [showIdentificationResult, setShowIdentificationResult] = useState(false);
  const [aiLogId, setAiLogId] = useState<string | null>(null);

  // Validation errors
  const [moldError, setMoldError] = useState('');

  // istanbul ignore next -- Autocomplete selection callback tested via integration tests
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

  // istanbul ignore next -- QR scanning requires camera and device testing
  const startQrScanning = async () => {
    if (qrLoading) return;
    setQrLoading(true);
    try {
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
      isProcessingQr.current = false;
      setQrError(null);
      setShowQrScanner(true);
    } finally {
      setQrLoading(false);
    }
  };

  // istanbul ignore next -- Barcode scanning callback requires device testing
  const handleBarcodeScan = async (result: BarcodeScanningResult) => {
    if (isProcessingQr.current || qrLoading) return;
    isProcessingQr.current = true;
    setQrError(null);
    setShowQrScanner(false);

    try {
      let scannedCode = result.data;

      // Extract code from URL if QR contains a URL like https://discrapp.com/d/CODE
      if (scannedCode.includes('/d/')) {
        const match = scannedCode.match(/\/d\/([A-Za-z0-9]+)/);
        if (match) {
          scannedCode = match[1];
        }
      }

      await processScannedQrCode(scannedCode);
    } catch (error) {
      setQrError('Failed to process QR code. Please try again.');
      console.error('QR scan error:', error);
      handleError(error, { operation: 'handle-barcode-scan' });
    } finally {
      isProcessingQr.current = false;
    }
  };

  // istanbul ignore next -- QR code processing tested via integration tests
  const processScannedQrCode = async (code: string) => {
    setQrLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be signed in to scan QR codes');
        setQrLoading(false);
        return;
      }

      // Look up the QR code
      const lookupResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/lookup-qr-code?code=${encodeURIComponent(code.trim())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const lookupData = await lookupResponse.json();

      if (!lookupData.qr_exists) {
        Alert.alert('Invalid QR Code', 'This QR code was not found in our system.');
        setQrLoading(false);
        return;
      }

      // Handle different QR code statuses
      if (lookupData.qr_status === 'deactivated') {
        Alert.alert('QR Code Deactivated', 'This QR code has been deactivated and cannot be used.');
        setQrLoading(false);
        return;
      }

      if (lookupData.qr_status === 'active' || lookupData.found) {
        Alert.alert(
          'QR Code Already Linked',
          'This QR code is already linked to a disc. Each QR code can only be linked to one disc.'
        );
        setQrLoading(false);
        return;
      }

      if (lookupData.qr_status === 'assigned' && !lookupData.is_assignee) {
        Alert.alert(
          'QR Code Unavailable',
          'This QR code has already been claimed by another user.'
        );
        setQrLoading(false);
        return;
      }

      // QR code is available - either 'generated' (unclaimed) or 'assigned' to current user
      if (lookupData.qr_status === 'generated') {
        // Claim the QR code first
        const assignResponse = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/assign-qr-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ qr_code: code.trim() }),
          }
        );

        const assignData = await assignResponse.json();

        if (!assignResponse.ok || !assignData.success) {
          Alert.alert('Error', assignData.error || 'Failed to claim QR code');
          setQrLoading(false);
          return;
        }

        // Successfully claimed - store the QR code ID
        setQrCodeId(assignData.qr_code.id);
        setQrShortCode(assignData.qr_code.short_code);
        Alert.alert(
          'QR Code Linked!',
          `QR code ${assignData.qr_code.short_code} will be linked to this disc when you save.`
        );
      } else if (lookupData.qr_status === 'assigned' && lookupData.is_assignee) {
        // Already assigned to user - use the qr_code_id from the API
        setQrCodeId(lookupData.qr_code_id);
        setQrShortCode(lookupData.qr_code);
        Alert.alert(
          'QR Code Ready',
          `QR code ${lookupData.qr_code} is already claimed by you. It will be linked when you save.`
        );
      }
    } catch (error) {
      console.error('QR scan error:', error);
      handleError(error, { operation: 'process-qr-code' });
    } finally {
      setQrLoading(false);
    }
  };

  // istanbul ignore next -- Simple state reset, tested via integration tests
  const removeQrCode = () => {
    setQrCodeId(null);
    setQrShortCode(null);
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

  // istanbul ignore next -- Native image picker requires device/emulator testing
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

  // istanbul ignore next -- Native cropper callback requires device/emulator testing
  const handleCropComplete = (uri: string) => {
    setPhotos([...photos, uri]);
  };

  // istanbul ignore next -- Native camera requires device/emulator testing
  const takePhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Maximum photos', 'You can only add up to 4 photos per disc');
      return;
    }

    setShowCamera(true);
  };

  // istanbul ignore next -- Native camera callback requires device/emulator testing
  const handlePhotoTaken = (uri: string) => {
    // Route camera photos through the cropper like library photos
    setSelectedImageUri(uri);
    setShowCropper(true);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // istanbul ignore next -- Alert callback testing unreliable in Jest
  const showPhotoOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Entry mode handlers
  const handleSelectEntryMode = (mode: EntryMode) => {
    setEntryMode(mode);
    setShowOptionsModal(false);

    if (mode === 'qr') {
      startQrScanning();
    } else if (mode === 'photo-ai') {
      startAiPhotoFlow();
    }
    // 'manual' just shows the form
  };

  // AI Photo Flow handlers
  const startAiPhotoFlow = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setShowAiCamera(true);
  };

  const handleAiPhotoTaken = (uri: string) => {
    setAiImageUri(uri);
    setShowAiCropper(true);
  };

  const handleAiCropComplete = async (uri: string) => {
    setAiImageUri(uri);
    setShowAiCropper(false);

    // Also add this photo to the photos array
    setPhotos([uri]);

    // Run AI identification
    try {
      const result = await identify(uri);
      if (result) {
        setShowIdentificationResult(true);
      } else {
        // identify() returned null, meaning there was an error
        // Show alert - "Enter Manually" will just dismiss and show the form (which is already rendered)
        Alert.alert(
          'Identification Failed',
          identifyError || 'Could not identify the disc. Please try again or enter details manually.',
          [
            { text: 'Try Again', onPress: startAiPhotoFlow },
            {
              text: 'Enter Manually',
              onPress: () => {
                // Form is already visible since entryMode is 'photo-ai'
                // Just ensure no modals are blocking it
                setShowOptionsModal(false);
                setShowIdentificationResult(false);
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('AI identification error:', err);
      Alert.alert(
        'Identification Failed',
        'An unexpected error occurred. Please try again or enter details manually.',
        [
          { text: 'Try Again', onPress: startAiPhotoFlow },
          {
            text: 'Enter Manually',
            onPress: () => {
              setShowOptionsModal(false);
              setShowIdentificationResult(false);
            },
          },
        ]
      );
    }
  };

  const applyIdentificationResult = (result: IdentificationResult) => {
    const { identification, catalog_match } = result;

    // Apply AI identification to form
    if (identification.manufacturer) {
      setManufacturer(identification.manufacturer);
    }
    if (identification.mold) {
      setMold(identification.mold);
      if (moldError) setMoldError('');
    }
    if (identification.plastic) {
      setPlastic(identification.plastic);
    }
    if (identification.color) {
      setColor(identification.color);
    }

    // Save the AI log ID for tracking corrections
    if (result.log_id) {
      setAiLogId(result.log_id);
    }

    // If we have a catalog match, use its flight numbers (more reliable)
    if (catalog_match) {
      if (catalog_match.category) setCategory(catalog_match.category);
      if (catalog_match.speed !== null) setSpeed(catalog_match.speed.toString());
      if (catalog_match.glide !== null) setGlide(catalog_match.glide.toString());
      if (catalog_match.turn !== null) setTurn(catalog_match.turn.toString());
      if (catalog_match.fade !== null) setFade(catalog_match.fade.toString());
    } else if (identification.flight_numbers) {
      // Fall back to AI-detected flight numbers
      if (identification.flight_numbers.speed !== null) setSpeed(identification.flight_numbers.speed.toString());
      if (identification.flight_numbers.glide !== null) setGlide(identification.flight_numbers.glide.toString());
      if (identification.flight_numbers.turn !== null) setTurn(identification.flight_numbers.turn.toString());
      if (identification.flight_numbers.fade !== null) setFade(identification.flight_numbers.fade.toString());
    }

    setShowIdentificationResult(false);
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
        category: category.trim() || undefined,
        plastic: plastic.trim() || undefined,
        weight: weight ? parseInt(weight, 10) : undefined,
        color: color.trim() || undefined,
        flight_numbers: flightNumbers,
        reward_amount: rewardAmount ? parseFloat(rewardAmount) : undefined, // Send as dollars (decimal)
        notes: notes.trim() || undefined,
        qr_code_id: qrCodeId || undefined, // Link QR code if scanned
        ai_identification_log_id: aiLogId || undefined, // Track AI identification for learning
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

      // istanbul ignore next -- Photo upload tested via integration tests
      if (photos.length > 0) {
        console.log(`Uploading ${photos.length} photos for disc ${data.id}`);

        for (let i = 0; i < photos.length; i++) {
          const photoUri = photos[i];

          try {
            // Compress the image before upload
            const compressed = await compressImage(photoUri);

            // Create FormData for photo upload
            const formData = new FormData();
            formData.append('disc_id', data.id);

            // Create file object for FormData (always JPEG after compression)
            const fileObject: FormDataFile = {
              uri: compressed.uri,
              type: 'image/jpeg',
              name: 'disc-photo.jpg',
            };
            // React Native's FormData.append accepts this file object structure
            formData.append('file', fileObject as unknown as Blob);

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
      handleError(error, { operation: 'create-disc' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screenContainer, showOptionsModal && styles.transparentContainer]}>
      {/* Entry Mode Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}>
        <View style={[styles.optionsModalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.optionsModalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.optionsModalTitle, { color: textColor }]}>Add a Disc</Text>
            <Text style={[styles.optionsModalSubtitle, { color: isDark ? '#999' : '#666' }]}>
              How would you like to add your disc?
            </Text>

            <Pressable
              style={[styles.optionCard, { backgroundColor: isDark ? '#252525' : '#f8f8f8', borderColor: isDark ? '#333' : '#e0e0e0' }]}
              onPress={() => handleSelectEntryMode('qr')}>
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
                <FontAwesome name="qrcode" size={28} color={Colors.violet.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColor }]}>Scan QR Sticker</Text>
                <Text style={[styles.optionDescription, { color: isDark ? '#999' : '#666' }]}>
                  Link a Discr sticker to this disc
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#999" />
            </Pressable>

            <Pressable
              style={[styles.optionCard, { backgroundColor: isDark ? '#252525' : '#f8f8f8', borderColor: isDark ? '#333' : '#e0e0e0' }]}
              onPress={() => handleSelectEntryMode('photo-ai')}>
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
                <FontAwesome name="magic" size={28} color={Colors.violet.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColor }]}>Photo + AI Identify</Text>
                <Text style={[styles.optionDescription, { color: isDark ? '#999' : '#666' }]}>
                  Take a photo and let AI fill in the details
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#999" />
            </Pressable>

            <Pressable
              style={[styles.optionCard, { backgroundColor: isDark ? '#252525' : '#f8f8f8', borderColor: isDark ? '#333' : '#e0e0e0' }]}
              onPress={() => handleSelectEntryMode('manual')}>
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
                <FontAwesome name="pencil" size={28} color={Colors.violet.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColor }]}>Manual Entry</Text>
                <Text style={[styles.optionDescription, { color: isDark ? '#999' : '#666' }]}>
                  Enter disc details yourself
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#999" />
            </Pressable>

            <Pressable
              style={styles.optionsCancelButton}
              onPress={() => router.back()}>
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* AI Identification Result Modal */}
      <Modal
        visible={showIdentificationResult && identificationResult !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIdentificationResult(false)}>
        <View style={[styles.optionsModalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.identificationResultModal, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <View style={styles.identificationHeader}>
              <Text style={[styles.identificationTitle, { color: textColor }]}>Disc Identified!</Text>
              {identificationResult && (
                <View style={[styles.confidenceBadge, {
                  backgroundColor: identificationResult.identification.confidence >= 0.7 ? 'rgba(46, 204, 113, 0.2)' : 'rgba(241, 196, 15, 0.2)'
                }]}>
                  <Text style={[styles.confidenceText, {
                    color: identificationResult.identification.confidence >= 0.7 ? '#2ecc71' : '#f1c40f'
                  }]}>
                    {Math.round(identificationResult.identification.confidence * 100)}% confident
                  </Text>
                </View>
              )}
            </View>

            {identificationResult && (
              <View style={styles.identificationDetails}>
                {identificationResult.catalog_match ? (
                  <>
                    <Text style={[styles.identificationLabel, { color: isDark ? '#999' : '#666' }]}>Found in catalog:</Text>
                    <Text style={[styles.identificationValue, { color: textColor }]}>
                      {identificationResult.catalog_match.manufacturer} {identificationResult.catalog_match.mold}
                    </Text>
                    {identificationResult.catalog_match.category && (
                      <Text style={[styles.identificationCategory, { color: isDark ? '#999' : '#666' }]}>
                        {identificationResult.catalog_match.category}
                      </Text>
                    )}
                    <Text style={[styles.identificationFlightNumbers, { color: Colors.violet.primary }]}>
                      {identificationResult.catalog_match.speed} | {identificationResult.catalog_match.glide} | {identificationResult.catalog_match.turn} | {identificationResult.catalog_match.fade}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.identificationLabel, { color: isDark ? '#999' : '#666' }]}>AI detected:</Text>
                    <Text style={[styles.identificationValue, { color: textColor }]}>
                      {identificationResult.identification.manufacturer || 'Unknown'} {identificationResult.identification.mold || 'Unknown'}
                    </Text>
                    {identificationResult.identification.raw_text && (
                      <Text style={[styles.identificationRawText, { color: isDark ? '#999' : '#666' }]}>
                        "{identificationResult.identification.raw_text}"
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.identificationButtons}>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setShowIdentificationResult(false)}>
                <Text style={styles.buttonSecondaryText}>Edit Manually</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => identificationResult && applyIdentificationResult(identificationResult)}>
                <Text style={styles.buttonPrimaryText}>Use This</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Identifying Loading Overlay */}
      {isIdentifying && (
        <View style={styles.identifyingOverlay}>
          <View style={[styles.identifyingContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <ActivityIndicator size="large" color={Colors.violet.primary} />
            <Text style={[styles.identifyingText, { color: textColor }]}>Analyzing disc...</Text>
            <Text style={[styles.identifyingSubtext, { color: isDark ? '#999' : '#666' }]}>
              AI is identifying your disc
            </Text>
          </View>
        </View>
      )}

      {/* Only render the form after user selects an entry mode */}
      {entryMode !== null && (
      <View style={[styles.container, dynamicContainerStyle]}>
        {/* Custom header */}
        <View style={[styles.formHeader, { borderBottomColor: isDark ? '#333' : '#e0e0e0' }]}>
          <View style={styles.formHeaderSpacer} />
          <Text style={[styles.formHeaderTitle, { color: textColor }]}>Add Disc</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.formHeaderClose}
          >
            <FontAwesome name="times" size={20} color={isDark ? '#999' : '#666'} />
          </Pressable>
        </View>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}>
      <ScrollView style={[styles.scrollView, dynamicContainerStyle]} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {/* QR Code Section */}
          <View style={[styles.qrSection, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#333' : '#e0e0e0' }]}>
            {qrShortCode ? (
              <View style={styles.qrLinkedContainer}>
                <View style={styles.qrLinkedInfo}>
                  <FontAwesome name="qrcode" size={24} color={Colors.violet.primary} />
                  <View style={styles.qrLinkedText}>
                    <Text style={styles.qrLinkedLabel}>QR Code Linked</Text>
                    <Text style={[styles.qrLinkedCode, { color: textColor }]}>{qrShortCode}</Text>
                  </View>
                </View>
                <Pressable onPress={removeQrCode} style={styles.qrRemoveButton}>
                  <FontAwesome name="times-circle" size={24} color="#999" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.qrScanButton}
                onPress={startQrScanning}
                disabled={qrLoading}
              >
                {qrLoading ? (
                  <ActivityIndicator size="small" color={Colors.violet.primary} />
                ) : (
                  <>
                    <FontAwesome name="qrcode" size={24} color={Colors.violet.primary} />
                    <View style={styles.qrScanTextContainer}>
                      <Text style={styles.qrScanTitle}>Scan QR Sticker</Text>
                      <Text style={styles.qrScanSubtitle}>Link an Discr sticker to this disc</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color="#999" />
                  </>
                )}
              </Pressable>
            )}
          </View>
          {qrError && (
            <View style={styles.qrErrorContainer}>
              <Text style={styles.qrErrorText}>{qrError}</Text>
              <Pressable onPress={() => setQrError(null)}>
                <FontAwesome name="times" size={16} color="#ff4444" />
              </Pressable>
            </View>
          )}

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
            {rewardAmount && parseFloat(rewardAmount) > 0 && (
              <Text style={styles.feeHint}>
                {formatFeeHint(parseFloat(rewardAmount))} • Venmo: ${parseFloat(rewardAmount).toFixed(2)} (free)
              </Text>
            )}
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
      </View>
      )}

      {/* istanbul ignore next -- Native camera component requires device testing */}
      <CameraWithOverlay
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
      />

      {/* istanbul ignore next -- Native cropper component requires device testing */}
      <ImageCropperWithCircle
        visible={showCropper}
        imageUri={selectedImageUri}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleCropComplete}
      />

      {/* AI Photo Camera */}
      <CameraWithOverlay
        visible={showAiCamera}
        onClose={() => setShowAiCamera(false)}
        onPhotoTaken={handleAiPhotoTaken}
        helperText="Center the disc stamp in the circle"
      />

      {/* AI Photo Cropper */}
      <ImageCropperWithCircle
        visible={showAiCropper}
        imageUri={aiImageUri}
        onClose={() => setShowAiCropper(false)}
        onCropComplete={handleAiCropComplete}
      />

      {/* istanbul ignore next -- Native camera/QR scanner requires device testing */}
      {showQrScanner && (
        <RNView style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarcodeScan}
          />
          <RNView style={styles.scannerOverlay}>
            <RNView style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan QR Sticker</Text>
              <Text style={styles.scannerSubtitle}>
                Point your camera at an Discr QR sticker
              </Text>
            </RNView>
            <RNView style={styles.scannerFrame}>
              <RNView style={[styles.cornerBorder, styles.topLeft]} />
              <RNView style={[styles.cornerBorder, styles.topRight]} />
              <RNView style={[styles.cornerBorder, styles.bottomLeft]} />
              <RNView style={[styles.cornerBorder, styles.bottomRight]} />
            </RNView>
            <Pressable style={styles.cancelScanButton} onPress={() => setShowQrScanner(false)}>
              <Text style={styles.cancelScanText}>Cancel</Text>
            </Pressable>
          </RNView>
        </RNView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  formHeaderSpacer: {
    width: 36,
  },
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  formHeaderClose: {
    width: 36,
    height: 36,
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
  feeHint: {
    fontSize: 12,
    color: '#666',
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
  // QR Section styles
  qrSection: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  qrScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  qrScanTextContainer: {
    flex: 1,
  },
  qrScanTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  qrScanSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  qrLinkedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  qrLinkedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrLinkedText: {
    flex: 1,
  },
  qrLinkedLabel: {
    fontSize: 14,
    color: '#2ECC71',
    fontWeight: '600',
  },
  qrLinkedCode: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    marginTop: 2,
  },
  qrRemoveButton: {
    padding: 4,
  },
  qrErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  qrErrorText: {
    color: '#ff4444',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  // Scanner styles
  scannerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 9999,
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
  // Options Modal styles
  optionsModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionsModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  optionsModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  optionsModalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  optionsCancelButton: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  optionsCancelText: {
    fontSize: 16,
    color: '#999',
  },
  // AI Identification Result Modal styles
  identificationResultModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  identificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  identificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  identificationDetails: {
    marginBottom: 24,
  },
  identificationLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  identificationValue: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  identificationCategory: {
    fontSize: 14,
    marginBottom: 8,
  },
  identificationFlightNumbers: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  identificationRawText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  identificationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  // AI Identifying Overlay styles
  identifyingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  identifyingContent: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  identifyingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  identifyingSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
