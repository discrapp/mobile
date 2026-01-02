import { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import CameraWithOverlay, { PhotoCaptureResult } from '@/components/CameraWithOverlay';
import { useShotRecommendation } from '@/hooks/useShotRecommendation';
import DiscAvatar from '@/components/DiscAvatar';
import FlightPathOverlay from '@/components/FlightPathOverlay';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errorHandler';

export default function ShotRecommendationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = Colors[colorScheme ?? 'light'].text;
  const [permission, requestPermission] = useCameraPermissions();

  // Camera state
  const [showCamera, setShowCamera] = useState(false);

  // User's throwing hand preference
  const [throwingHand, setThrowingHand] = useState<'right' | 'left'>('right');

  // Fetch throwing hand preference
  useEffect(() => {
    let isMounted = true;

    async function fetchThrowingHand() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('throwing_hand')
          .eq('id', user.id)
          .single();

        if (!profileError && data?.throwing_hand && isMounted) {
          setThrowingHand(data.throwing_hand as 'right' | 'left');
        }
      } catch {
        // Use default (right) if fetch fails
      }
    }

    fetchThrowingHand();

    return () => {
      isMounted = false;
    };
  }, []);

  // Shot recommendation hook
  const { getRecommendation, isLoading, error, result, reset } = useShotRecommendation();

  // Track if correction has been saved to prevent duplicate saves
  const correctionSavedRef = useRef(false);

  // Reset correction saved flag when result changes
  useEffect(() => {
    correctionSavedRef.current = false;
  }, [result?.log_id]);

  // Save position correction to API
  const savePositionCorrection = useCallback(async (
    logId: string,
    correctedTeePosition: { x: number; y: number },
    correctedBasketPosition: { x: number; y: number }
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/save-position-correction`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            log_id: logId,
            corrected_tee_position: correctedTeePosition,
            corrected_basket_position: correctedBasketPosition,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save position correction:', errorData);
      }
    } catch (err) {
      handleError(err, { operation: 'save-position-correction' });
    }
  }, []);

  // Handle position change from FlightPathOverlay
  const handlePositionChange = useCallback((data: {
    teePosition: { x: number; y: number };
    basketPosition: { x: number; y: number };
    originalTeePosition: { x: number; y: number };
    originalBasketPosition: { x: number; y: number };
  }) => {
    if (!result?.log_id || correctionSavedRef.current) return;

    // Check if positions actually changed from original
    const teeChanged =
      Math.abs(data.teePosition.x - data.originalTeePosition.x) > 1 ||
      Math.abs(data.teePosition.y - data.originalTeePosition.y) > 1;
    const basketChanged =
      Math.abs(data.basketPosition.x - data.originalBasketPosition.x) > 1 ||
      Math.abs(data.basketPosition.y - data.originalBasketPosition.y) > 1;

    if (teeChanged || basketChanged) {
      correctionSavedRef.current = true;
      savePositionCorrection(result.log_id, data.teePosition, data.basketPosition);
    }
  }, [result?.log_id, savePositionCorrection]);

  // Control scroll during marker drag
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const handleDragStart = useCallback(() => setScrollEnabled(false), []);
  const handleDragEnd = useCallback(() => setScrollEnabled(true), []);

  // Dynamic styles for dark/light mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#000' : '#fff',
    },
    card: {
      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    text: {
      color: textColor,
    },
    secondaryText: {
      color: isDark ? '#999' : '#666',
    },
  };

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const permResult = await requestPermission();
      if (!permResult.granted) {
        return;
      }
    }
    setShowCamera(true);
  };

  const handlePhotoTaken = useCallback(async (result: PhotoCaptureResult) => {
    setShowCamera(false);
    await getRecommendation(result.uri);
  }, [getRecommendation]);

  const handleTryAgain = () => {
    reset();
  };

  const handleTryAnotherShot = () => {
    reset();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      await getRecommendation(result.assets[0].uri);
    }
  };

  const handleChoosePhoto = () => {
    Alert.alert(
      'Choose Photo',
      'How would you like to capture the hole?',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderInitialState = () => (
    <View style={styles.centeredContent}>
      <View style={[styles.iconContainer, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
        <FontAwesome name="camera" size={48} color={Colors.violet.primary} />
      </View>
      <Text style={[styles.promptTitle, dynamicStyles.text]}>
        Take a photo of the hole
      </Text>
      <Text style={[styles.promptSubtitle, dynamicStyles.secondaryText]}>
        Point your camera at the fairway from the tee pad. AI will analyze the
        terrain and recommend the best disc from your bag.
      </Text>
      <Pressable
        style={[styles.actionButton, { backgroundColor: Colors.violet.primary }]}
        onPress={handleChoosePhoto}
      >
        <FontAwesome name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.actionButtonText}>Choose Photo</Text>
      </Pressable>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={Colors.violet.primary} />
      <Text style={[styles.loadingTitle, dynamicStyles.text]}>
        Analyzing hole...
      </Text>
      <Text style={[styles.loadingSubtitle, dynamicStyles.secondaryText]}>
        AI is estimating distance and selecting the best disc
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centeredContent}>
      <View style={[styles.iconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
        <FontAwesome name="exclamation-triangle" size={48} color="#e74c3c" />
      </View>
      <Text style={[styles.errorTitle, dynamicStyles.text]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorMessage, dynamicStyles.secondaryText]}>
        {error}
      </Text>
      <Pressable
        style={[styles.actionButton, { backgroundColor: Colors.violet.primary }]}
        onPress={handleTryAgain}
      >
        <Text style={styles.actionButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const renderResult = () => {
    if (!result) return null;

    const { recommendation, terrain_analysis, alternatives, confidence, flight_path, photoUri } = result;
    const disc = recommendation.disc;

    return (
      <ScrollView
        style={styles.resultScroll}
        contentContainerStyle={styles.resultContent}
        scrollEnabled={scrollEnabled}
      >
        {/* Flight Path Overlay - shown if we have coordinates */}
        {flight_path && photoUri && (
          <FlightPathOverlay
            photoUri={photoUri}
            teePosition={flight_path.tee_position}
            basketPosition={flight_path.basket_position}
            flightNumbers={disc?.flight_numbers || null}
            throwType={recommendation.throw_type}
            throwingHand={throwingHand}
            onPositionChange={handlePositionChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        )}

        {/* Terrain Analysis Card */}
        <View style={[styles.card, dynamicStyles.card]}>
          <Text style={[styles.cardTitle, dynamicStyles.text]}>Terrain Analysis</Text>
          <View style={styles.terrainGrid}>
            <View style={styles.terrainItem}>
              <Text style={[styles.terrainLabel, dynamicStyles.secondaryText]}>Distance</Text>
              <Text style={[styles.terrainValue, dynamicStyles.text]}>
                ~{terrain_analysis.estimated_distance_ft} ft
              </Text>
            </View>
            <View style={styles.terrainItem}>
              <Text style={[styles.terrainLabel, dynamicStyles.secondaryText]}>Elevation</Text>
              <Text style={[styles.terrainValue, dynamicStyles.text]}>
                {terrain_analysis.elevation_change}
              </Text>
            </View>
            <View style={styles.terrainItem}>
              <Text style={[styles.terrainLabel, dynamicStyles.secondaryText]}>Confidence</Text>
              <Text style={[styles.terrainValue, dynamicStyles.text]}>
                {Math.round(confidence * 100)}%
              </Text>
            </View>
          </View>
          {terrain_analysis.obstacles && terrain_analysis.obstacles !== 'None' && (
            <View style={styles.obstaclesSection}>
              <Text style={[styles.obstaclesLabel, dynamicStyles.secondaryText]}>Obstacles</Text>
              <Text style={[styles.obstaclesValue, dynamicStyles.text]}>
                {terrain_analysis.obstacles}
              </Text>
            </View>
          )}
        </View>

        {/* Recommended Shot Card */}
        <View style={[styles.card, styles.recommendationCard, dynamicStyles.card]}>
          <Text style={[styles.cardTitle, dynamicStyles.text]}>Recommended Shot</Text>

          {/* Disc Info */}
          <View style={styles.discSection}>
            <View style={styles.discAvatarWrapper}>
              <DiscAvatar photoUrl={disc?.photo_url} color={disc?.color} size={80} />
            </View>
            <View style={styles.discInfo}>
              <Text style={[styles.discName, dynamicStyles.text]}>
                {disc?.name || 'Unknown Disc'}
              </Text>
              {disc?.manufacturer && (
                <Text style={[styles.discManufacturer, dynamicStyles.secondaryText]}>
                  {disc.manufacturer}
                </Text>
              )}
              {disc?.flight_numbers && (
                <Text style={[styles.flightNumbers, { color: Colors.violet.primary }]}>
                  {disc.flight_numbers.speed} | {disc.flight_numbers.glide} | {disc.flight_numbers.turn} | {disc.flight_numbers.fade}
                </Text>
              )}
            </View>
          </View>

          {/* Throw Details */}
          <View style={styles.throwDetails}>
            <View style={styles.throwItem}>
              <Text style={[styles.throwLabel, dynamicStyles.secondaryText]}>Throw</Text>
              <View style={[styles.throwTypeBadge, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
                <Text style={[styles.throwTypeText, { color: Colors.violet.primary }]}>
                  {recommendation.throw_type.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.throwItem}>
              <Text style={[styles.throwLabel, dynamicStyles.secondaryText]}>Power</Text>
              <Text style={[styles.powerValue, dynamicStyles.text]}>
                {recommendation.power_percentage}%
              </Text>
            </View>
          </View>

          {/* Line Description */}
          <View style={styles.lineSection}>
            <Text style={[styles.lineLabel, dynamicStyles.secondaryText]}>Line</Text>
            <Text style={[styles.lineDescription, dynamicStyles.text]}>
              {recommendation.line_description}
            </Text>
          </View>
        </View>

        {/* Alternatives Card */}
        {alternatives && alternatives.length > 0 && (
          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={[styles.cardTitle, dynamicStyles.text]}>Alternatives</Text>
            {alternatives.map((alt, index) => (
              <View key={index} style={styles.alternativeItem}>
                <View style={styles.alternativeHeader}>
                  <Text style={[styles.alternativeName, dynamicStyles.text]}>
                    {alt.disc.name || 'Unknown'}
                  </Text>
                  <Text style={[styles.alternativeThrow, dynamicStyles.secondaryText]}>
                    {alt.throw_type}
                  </Text>
                </View>
                <Text style={[styles.alternativeReason, dynamicStyles.secondaryText]}>
                  {alt.reason}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Try Another Shot Button */}
        <Pressable
          style={[styles.actionButton, styles.tryAnotherButton, { backgroundColor: Colors.violet.primary }]}
          onPress={() => {
            reset();
            handleChoosePhoto();
          }}
        >
          <FontAwesome name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Try Another Shot</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#e0e0e0' }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <FontAwesome name="chevron-left" size={18} color={textColor} />
          <Text style={[styles.backText, dynamicStyles.text]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Shot Advisor</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading && renderLoadingState()}
        {!isLoading && error && renderErrorState()}
        {!isLoading && !error && result && renderResult()}
        {!isLoading && !error && !result && renderInitialState()}
      </View>

      {/* Camera Modal */}
      <CameraWithOverlay
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoTaken={handlePhotoTaken}
        showCircleGuide={false}
        helperText="Capture the fairway from the tee pad"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  backText: {
    fontSize: 16,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    minWidth: 80,
  },
  content: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  promptTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  promptSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
  },
  loadingSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 200,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  recommendationCard: {
    borderColor: Colors.violet.primary,
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  terrainGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  terrainItem: {
    alignItems: 'center',
    flex: 1,
  },
  terrainLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  terrainValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  obstaclesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  obstaclesLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  obstaclesValue: {
    fontSize: 14,
  },
  discSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  discAvatarWrapper: {
    marginRight: 16,
  },
  discInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  discName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  discManufacturer: {
    fontSize: 14,
    marginTop: 2,
  },
  flightNumbers: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  throwDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  throwItem: {
    alignItems: 'center',
  },
  throwLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  throwTypeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  throwTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  powerValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  lineSection: {
    marginTop: 4,
  },
  lineLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  lineDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  alternativeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  alternativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alternativeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  alternativeThrow: {
    fontSize: 14,
  },
  alternativeReason: {
    fontSize: 14,
  },
  tryAnotherButton: {
    marginTop: 8,
  },
});
