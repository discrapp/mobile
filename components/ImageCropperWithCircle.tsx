import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal, Dimensions } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

interface ImageCropperWithCircleProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onCropComplete: (uri: string) => void;
}

export default function ImageCropperWithCircle({
  visible,
  imageUri,
  onClose,
  onCropComplete,
}: ImageCropperWithCircleProps) {
  const [processing, setProcessing] = useState(false);

  // Gesture values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      // Limit zoom between 1x and 3x
      scale.value = withSpring(Math.max(1, Math.min(scale.value, 3)));
      savedScale.value = scale.value;
    });

  // Pan gesture for moving
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleCrop = async () => {
    setProcessing(true);
    try {
      // Crop to square (1:1 aspect ratio)
      const manipResult = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1000, height: 1000 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      onCropComplete(manipResult.uri);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.imageContainer}>
          <GestureDetector gesture={composedGesture}>
            <Animated.Image
              source={{ uri: imageUri }}
              style={[styles.image, animatedStyle]}
              resizeMode="cover"
            />
          </GestureDetector>

          {/* Circular guide overlay */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.circleGuide}>
              <View style={styles.circle} />
            </View>
            <Text style={styles.helperText}>Pinch to zoom, drag to position</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={processing}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cropButton, processing && styles.cropButtonDisabled]}
            onPress={handleCrop}
            disabled={processing}>
            {processing ? (
              <Text style={styles.cropButtonText}>Processing...</Text>
            ) : (
              <>
                <FontAwesome name="check" size={20} color="#fff" />
                <Text style={styles.cropButtonText}>Use Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleGuide: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  helperText: {
    marginTop: 24,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: '#000',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.violet.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cropButtonDisabled: {
    opacity: 0.6,
  },
  cropButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
