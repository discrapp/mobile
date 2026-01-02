import React, { useState } from 'react';
import { StyleSheet, Image, View, Pressable, Dimensions, Modal } from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
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

    // Box dimensions for demo mode markers
    const boxSize = Math.min(width, height) * 0.12; // 12% of smallest dimension
    const halfBox = boxSize / 2;
    const cornerLength = boxSize * 0.35; // Length of corner brackets
    const strokeWidth = 2.5;

    // Helper to draw corner brackets (viewfinder style)
    const renderCornerBrackets = (cx: number, cy: number, color: string) => {
      const left = cx - halfBox;
      const right = cx + halfBox;
      const top = cy - halfBox;
      const bottom = cy + halfBox;

      return (
        <>
          {/* Top-left corner */}
          <Path
            d={`M ${left} ${top + cornerLength} L ${left} ${top} L ${left + cornerLength} ${top}`}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="6,3"
          />
          {/* Top-right corner */}
          <Path
            d={`M ${right - cornerLength} ${top} L ${right} ${top} L ${right} ${top + cornerLength}`}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="6,3"
          />
          {/* Bottom-left corner */}
          <Path
            d={`M ${left} ${bottom - cornerLength} L ${left} ${bottom} L ${left + cornerLength} ${bottom}`}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="6,3"
          />
          {/* Bottom-right corner */}
          <Path
            d={`M ${right - cornerLength} ${bottom} L ${right} ${bottom} L ${right} ${bottom - cornerLength}`}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="6,3"
          />
        </>
      );
    };

    return (
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {/* Flight path */}
        {scaledPath && (
          <Path d={scaledPath} stroke={pathColor} strokeWidth={3} fill="none" strokeLinecap="round" />
        )}

        {/* Tee box - green corner brackets with label */}
        <G>
          {renderCornerBrackets(scaledTeeX, scaledTeeY, '#22C55E')}
          <SvgText
            x={scaledTeeX}
            y={scaledTeeY - halfBox - 8}
            fill="#22C55E"
            fontSize={14}
            fontWeight="bold"
            textAnchor="middle"
          >
            TEE
          </SvgText>
          {/* Tee center marker - circle with ring */}
          <Circle cx={scaledTeeX} cy={scaledTeeY} r={8} fill="none" stroke="#22C55E" strokeWidth={2} />
          <Circle cx={scaledTeeX} cy={scaledTeeY} r={3} fill="#22C55E" />
        </G>

        {/* Basket box - red corner brackets with label */}
        <G>
          {renderCornerBrackets(scaledBasketX, scaledBasketY, '#EF4444')}
          <SvgText
            x={scaledBasketX}
            y={scaledBasketY - halfBox - 8}
            fill="#EF4444"
            fontSize={14}
            fontWeight="bold"
            textAnchor="middle"
          >
            BASKET
          </SvgText>
          {/* Basket center marker - target style with crosshairs */}
          <Circle cx={scaledBasketX} cy={scaledBasketY} r={10} fill="none" stroke="#EF4444" strokeWidth={2} />
          <Circle cx={scaledBasketX} cy={scaledBasketY} r={4} fill="#EF4444" />
        </G>
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
