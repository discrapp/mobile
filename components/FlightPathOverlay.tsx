import React, { useState } from 'react';
import { StyleSheet, Image, View, Pressable, Dimensions, Modal } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import { calculateRealFlightPath, FlightNumbers } from '@/lib/flightCalculator';
import Colors from '@/constants/Colors';

interface NullableFlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

interface FlightPathOverlayProps {
  photoUri: string;
  teePosition: { x: number; y: number };
  basketPosition: { x: number; y: number };
  flightNumbers: NullableFlightNumbers | null;
  throwType: 'hyzer' | 'flat' | 'anhyzer';
  throwingHand: 'right' | 'left';
}

function toFlightNumbers(fn: NullableFlightNumbers | null): FlightNumbers | null {
  if (!fn) return null;
  return {
    speed: fn.speed ?? 9,
    glide: fn.glide ?? 5,
    turn: fn.turn ?? 0,
    fade: fn.fade ?? 2,
  };
}

const PATH_COLORS = {
  hyzer: '#3498DB', // Blue
  flat: Colors.violet.primary, // Violet
  anhyzer: '#E67E22', // Orange
};

export default function FlightPathOverlay({
  photoUri,
  teePosition,
  basketPosition,
  flightNumbers,
  throwType,
  throwingHand,
}: FlightPathOverlayProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  const handleImageLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setImageSize({ width, height });
  };

  const pathColor = PATH_COLORS[throwType];
  const normalizedFlightNumbers = toFlightNumbers(flightNumbers);

  // Calculate the SVG path
  const pathD =
    imageSize.width > 0 && imageSize.height > 0
      ? calculateRealFlightPath(
          normalizedFlightNumbers,
          throwType,
          throwingHand,
          teePosition,
          basketPosition,
          imageSize.width,
          imageSize.height
        )
      : '';

  // Convert percentage positions to pixels
  const teeX = (teePosition.x / 100) * imageSize.width;
  const teeY = (teePosition.y / 100) * imageSize.height;
  const basketX = (basketPosition.x / 100) * imageSize.width;
  const basketY = (basketPosition.y / 100) * imageSize.height;

  const screenDimensions = Dimensions.get('window');

  const renderOverlay = (width: number, height: number) => {
    const scaledPath =
      width > 0 && height > 0
        ? calculateRealFlightPath(
            normalizedFlightNumbers,
            throwType,
            throwingHand,
            teePosition,
            basketPosition,
            width,
            height
          )
        : '';

    const scaledTeeX = (teePosition.x / 100) * width;
    const scaledTeeY = (teePosition.y / 100) * height;
    const scaledBasketX = (basketPosition.x / 100) * width;
    const scaledBasketY = (basketPosition.y / 100) * height;

    return (
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {/* Flight path */}
        {scaledPath && (
          <Path d={scaledPath} stroke={pathColor} strokeWidth={3} fill="none" strokeLinecap="round" />
        )}

        {/* Tee marker */}
        <Circle cx={scaledTeeX} cy={scaledTeeY} r={8} fill={pathColor} stroke="#fff" strokeWidth={2} />

        {/* Basket marker */}
        <Circle
          cx={scaledBasketX}
          cy={scaledBasketY}
          r={8}
          fill="none"
          stroke={pathColor}
          strokeWidth={3}
        />
        <Circle cx={scaledBasketX} cy={scaledBasketY} r={3} fill={pathColor} />
      </Svg>
    );
  };

  return (
    <>
      <Pressable style={[styles.container, isDark && styles.containerDark]} onPress={() => setIsExpanded(true)}>
        <View style={styles.imageWrapper} onLayout={handleImageLayout}>
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

          {/* SVG Overlay */}
          {imageSize.width > 0 && imageSize.height > 0 && renderOverlay(imageSize.width, imageSize.height)}
        </View>
      </Pressable>

      {/* Fullscreen Modal */}
      <Modal visible={isExpanded} transparent animationType="fade" onRequestClose={() => setIsExpanded(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsExpanded(false)}>
          <View style={styles.modalContent}>
            <Image
              source={{ uri: photoUri }}
              style={{
                width: screenDimensions.width,
                height: screenDimensions.height * 0.8,
              }}
              resizeMode="contain"
            />
            {renderOverlay(screenDimensions.width, screenDimensions.height * 0.8)}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    backgroundColor: '#000',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    position: 'relative',
  },
});
