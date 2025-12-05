import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal, Dimensions } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);
const IMAGE_CONTAINER_SIZE = SCREEN_WIDTH;

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
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Get image dimensions when URI changes
  useEffect(() => {
    if (imageUri) {
      Image.getSize(imageUri, (width, height) => {
        setImageDimensions({ width, height });
        // Reset transforms when new image loads
        scale.value = 1;
        savedScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      });
    }
  }, [imageUri]);

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
      const { width: imgWidth, height: imgHeight } = imageDimensions;
      if (!imgWidth || !imgHeight) {
        console.error('Image dimensions not available');
        return;
      }

      // User's current transforms
      const userScale = savedScale.value;
      const userTranslateX = savedTranslateX.value;
      const userTranslateY = savedTranslateY.value;

      // Calculate how the image is displayed with resizeMode="cover"
      // Cover mode: image scales to cover the container, larger dimension overflows
      const imageAspect = imgWidth / imgHeight;
      const containerAspect = 1; // Square container
      let displayWidth, displayHeight, offsetX, offsetY, scaleFactor;

      if (imageAspect > containerAspect) {
        // Image is wider - scale to fit height, width overflows
        displayHeight = IMAGE_CONTAINER_SIZE;
        displayWidth = IMAGE_CONTAINER_SIZE * imageAspect;
        offsetX = (IMAGE_CONTAINER_SIZE - displayWidth) / 2; // Negative, centers the overflow
        offsetY = 0;
        scaleFactor = imgHeight / displayHeight; // Use height scale for landscape
      } else {
        // Image is taller - scale to fit width, height overflows
        displayWidth = IMAGE_CONTAINER_SIZE;
        displayHeight = IMAGE_CONTAINER_SIZE / imageAspect;
        offsetX = 0;
        offsetY = (IMAGE_CONTAINER_SIZE - displayHeight) / 2; // Negative, centers the overflow
        scaleFactor = imgWidth / displayWidth; // Use width scale for portrait
      }

      // Circle center in screen coordinates
      const circleCenterX = IMAGE_CONTAINER_SIZE / 2;
      const circleCenterY = IMAGE_CONTAINER_SIZE / 2;

      // Calculate what part of the image is under the circle
      // Account for: initial offset, user pan, user scale
      const imageX = (circleCenterX - offsetX - userTranslateX) / userScale;
      const imageY = (circleCenterY - offsetY - userTranslateY) / userScale;
      const circleRadius = CIRCLE_SIZE / 2 / userScale;

      // Convert to original image coordinates
      const cropCenterX = imageX * scaleFactor;
      const cropCenterY = imageY * scaleFactor;
      const cropRadius = circleRadius * scaleFactor;

      // Calculate crop box (square containing the circle)
      const cropX = Math.max(0, cropCenterX - cropRadius);
      const cropY = Math.max(0, cropCenterY - cropRadius);
      const cropSize = cropRadius * 2;

      // Ensure crop region is within bounds
      const finalCropX = Math.max(0, Math.min(cropX, imgWidth - cropSize));
      const finalCropY = Math.max(0, Math.min(cropY, imgHeight - cropSize));
      const finalCropSize = Math.min(
        cropSize,
        imgWidth - finalCropX,
        imgHeight - finalCropY
      );

      // Crop and resize
      const manipResult = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(finalCropX),
              originY: Math.round(finalCropY),
              width: Math.round(finalCropSize),
              height: Math.round(finalCropSize),
            },
          },
          { resize: { width: 800, height: 800 } },
        ],
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
    width: IMAGE_CONTAINER_SIZE,
    height: IMAGE_CONTAINER_SIZE,
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
