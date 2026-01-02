import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal, Dimensions } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import {
  CameraCaptureMeta,
  calculateInitialCropperTransforms,
  InitialTransforms,
} from '@/lib/cameraAlignment';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);
const IMAGE_CONTAINER_SIZE = SCREEN_WIDTH;

interface ImageCropperWithCircleProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onCropComplete: (uri: string) => void;
  /** Optional metadata from camera capture for initial alignment */
  captureMeta?: CameraCaptureMeta;
}

export default function ImageCropperWithCircle({
  visible,
  imageUri,
  onClose,
  onCropComplete,
  captureMeta,
}: ImageCropperWithCircleProps) {
  const [processing, setProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Gesture values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Get image dimensions when URI changes and apply initial transforms
  useEffect(() => {
    if (imageUri) {
      Image.getSize(imageUri, (width, height) => {
        setImageDimensions({ width, height });

        // Calculate initial transforms if we have camera capture metadata
        if (captureMeta) {
          const cropperConfig = {
            containerSize: IMAGE_CONTAINER_SIZE,
            circleSize: CIRCLE_SIZE,
          };
          const initialTransforms = calculateInitialCropperTransforms(captureMeta, cropperConfig);

          // Apply initial transforms with animation for smooth appearance
          scale.value = withSpring(initialTransforms.scale, { damping: 15 });
          savedScale.value = initialTransforms.scale;
          translateX.value = withSpring(initialTransforms.translateX, { damping: 15 });
          translateY.value = withSpring(initialTransforms.translateY, { damping: 15 });
          savedTranslateX.value = initialTransforms.translateX;
          savedTranslateY.value = initialTransforms.translateY;
        } else {
          // Reset transforms when no metadata (e.g., from photo library)
          scale.value = 1;
          savedScale.value = 1;
          translateX.value = 0;
          translateY.value = 0;
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        }
      });
    }
  }, [imageUri, captureMeta]);

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

  // Note: transform order matters! Scale first (around center), then translate
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
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

      // User's current transforms (scale first, then translate)
      // Use the current animated values, not saved values, to match what user sees
      const userScale = scale.value;
      const userTranslateX = translateX.value;
      const userTranslateY = translateY.value;

      console.log('Crop debug:', {
        userScale,
        userTranslateX,
        userTranslateY,
        imgWidth,
        imgHeight,
        IMAGE_CONTAINER_SIZE,
        CIRCLE_SIZE,
      });

      // Calculate how the image is displayed with resizeMode="cover"
      // Cover mode: image scales to fill the container, larger dimension overflows
      const imageAspect = imgWidth / imgHeight;
      const containerAspect = 1; // Square container
      let displayWidth: number, displayHeight: number;

      if (imageAspect > containerAspect) {
        // Image is wider - scale to fit height, width overflows
        displayHeight = IMAGE_CONTAINER_SIZE;
        displayWidth = IMAGE_CONTAINER_SIZE * imageAspect;
      } else {
        // Image is taller - scale to fit width, height overflows
        displayWidth = IMAGE_CONTAINER_SIZE;
        displayHeight = IMAGE_CONTAINER_SIZE / imageAspect;
      }

      // Ratio to convert from display coordinates to original image coordinates
      const displayToOriginalRatio = imgWidth / displayWidth;

      // Circle center in screen coordinates (center of the container)
      const circleCenterScreenX = IMAGE_CONTAINER_SIZE / 2;
      const circleCenterScreenY = IMAGE_CONTAINER_SIZE / 2;

      // Image center in screen coordinates (before any transforms)
      const imageCenterScreenX = IMAGE_CONTAINER_SIZE / 2;
      const imageCenterScreenY = IMAGE_CONTAINER_SIZE / 2;

      // Transform order is: scale (around center), then translate
      // To find what original image point is at the circle center:
      // 1. Remove translation: point relative to scaled image center
      // 2. Remove scale: point relative to unscaled image center
      // 3. Add back unscaled image center offset

      // Point on scaled image that's at circle center (accounting for translation)
      const pointOnScaledImageX = circleCenterScreenX - userTranslateX - imageCenterScreenX;
      const pointOnScaledImageY = circleCenterScreenY - userTranslateY - imageCenterScreenY;

      // Point on unscaled displayed image (relative to image center)
      const pointOnDisplayedImageX = pointOnScaledImageX / userScale;
      const pointOnDisplayedImageY = pointOnScaledImageY / userScale;

      // Point in displayed image coordinates (relative to top-left of displayed image)
      const displayedImageCropCenterX = displayWidth / 2 + pointOnDisplayedImageX;
      const displayedImageCropCenterY = displayHeight / 2 + pointOnDisplayedImageY;

      // Circle radius in displayed image coordinates
      const circleRadiusDisplayed = (CIRCLE_SIZE / 2) / userScale;

      // Convert to original image coordinates
      const cropCenterX = displayedImageCropCenterX * displayToOriginalRatio;
      const cropCenterY = displayedImageCropCenterY * displayToOriginalRatio;
      const cropRadius = circleRadiusDisplayed * displayToOriginalRatio;

      // Calculate crop box (square containing the circle)
      let cropX = cropCenterX - cropRadius;
      let cropY = cropCenterY - cropRadius;
      let cropSize = cropRadius * 2;

      // Clamp to image bounds
      cropX = Math.max(0, Math.min(cropX, imgWidth - 1));
      cropY = Math.max(0, Math.min(cropY, imgHeight - 1));
      cropSize = Math.min(cropSize, imgWidth - cropX, imgHeight - cropY);

      // Ensure we have a valid crop size
      if (cropSize < 10) {
        console.error('Crop size too small');
        return;
      }

      // Crop and resize
      const manipResult = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(cropX),
              originY: Math.round(cropY),
              width: Math.round(cropSize),
              height: Math.round(cropSize),
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

          {/* Circular guide overlay - circle centered independently from helper text */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.circleContainer}>
              <View style={styles.circleGuide}>
                <View style={styles.circle} />
              </View>
            </View>
            <View style={styles.helperTextContainer}>
              <Text style={styles.helperText}>Pinch to zoom, drag to position</Text>
            </View>
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
  },
  circleContainer: {
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
  helperTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '25%',
    alignItems: 'center',
  },
  helperText: {
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
