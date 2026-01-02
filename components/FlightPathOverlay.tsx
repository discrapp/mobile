import React, { useState, useRef } from 'react';
import { StyleSheet, Image, View, Pressable, Dimensions, Modal, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import { calculateRealFlightPath, FlightNumbers } from '@/lib/flightCalculator';
import Colors from '@/constants/Colors';

interface NullableFlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

interface PositionChangeData {
  teePosition: { x: number; y: number };
  basketPosition: { x: number; y: number };
  originalTeePosition: { x: number; y: number };
  originalBasketPosition: { x: number; y: number };
}

interface FlightPathOverlayProps {
  photoUri: string;
  teePosition: { x: number; y: number };
  basketPosition: { x: number; y: number };
  flightNumbers: NullableFlightNumbers | null;
  throwType: 'hyzer' | 'flat' | 'anhyzer';
  throwingHand: 'right' | 'left';
  onPositionChange?: (data: PositionChangeData) => void;
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
  onPositionChange,
}: FlightPathOverlayProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Editable positions (start from AI estimates)
  const [editableTee, setEditableTee] = useState(teePosition);
  const [editableBasket, setEditableBasket] = useState(basketPosition);
  const originalTeeRef = useRef(teePosition);
  const originalBasketRef = useRef(basketPosition);

  // Update editable positions when props change (new photo/analysis)
  React.useEffect(() => {
    setEditableTee(teePosition);
    setEditableBasket(basketPosition);
    originalTeeRef.current = teePosition;
    originalBasketRef.current = basketPosition;
  }, [teePosition.x, teePosition.y, basketPosition.x, basketPosition.y]);

  const handleImageLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setImageSize({ width, height });
  };

  // Use refs to track current positions for PanResponder (avoids stale closure)
  const editableTeeRef = useRef(editableTee);
  const editableBasketRef = useRef(editableBasket);

  // Keep refs in sync with state
  React.useEffect(() => {
    editableTeeRef.current = editableTee;
    editableBasketRef.current = editableBasket;
  }, [editableTee, editableBasket]);

  // Create drag handler for markers
  const createDragHandler = (
    setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
    positionRef: React.MutableRefObject<{ x: number; y: number }>
  ) => {
    let startPos = { x: 0, y: 0 };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startPos = { ...positionRef.current };
      },
      onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (imageSize.width === 0 || imageSize.height === 0) return;

        // Convert pixel movement to percentage
        const deltaXPercent = (gestureState.dx / imageSize.width) * 100;
        const deltaYPercent = (gestureState.dy / imageSize.height) * 100;

        // Clamp to 0-100 range
        const newX = Math.max(0, Math.min(100, startPos.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100, startPos.y + deltaYPercent));

        setPosition({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        // Notify parent of position change using refs for current values
        if (onPositionChange) {
          onPositionChange({
            teePosition: editableTeeRef.current,
            basketPosition: editableBasketRef.current,
            originalTeePosition: originalTeeRef.current,
            originalBasketPosition: originalBasketRef.current,
          });
        }
      },
    });
  };

  const teePanResponder = useRef(
    createDragHandler(setEditableTee, editableTeeRef)
  ).current;

  const basketPanResponder = useRef(
    createDragHandler(setEditableBasket, editableBasketRef)
  ).current;

  const pathColor = PATH_COLORS[throwType];
  const normalizedFlightNumbers = toFlightNumbers(flightNumbers);

  // Convert percentage positions to pixels for drag handles
  const teePixelX = (editableTee.x / 100) * imageSize.width;
  const teePixelY = (editableTee.y / 100) * imageSize.height;
  const basketPixelX = (editableBasket.x / 100) * imageSize.width;
  const basketPixelY = (editableBasket.y / 100) * imageSize.height;

  const screenDimensions = Dimensions.get('window');

  const renderOverlay = (
    width: number,
    height: number,
    teePos: { x: number; y: number },
    basketPos: { x: number; y: number }
  ) => {
    const scaledPath =
      width > 0 && height > 0
        ? calculateRealFlightPath(
            normalizedFlightNumbers,
            throwType,
            throwingHand,
            teePos,
            basketPos,
            width,
            height
          )
        : '';

    const scaledTeeX = (teePos.x / 100) * width;
    const scaledTeeY = (teePos.y / 100) * height;
    const scaledBasketX = (basketPos.x / 100) * width;
    const scaledBasketY = (basketPos.y / 100) * height;

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

          {/* SVG Overlay with editable positions */}
          {imageSize.width > 0 && imageSize.height > 0 && renderOverlay(imageSize.width, imageSize.height, editableTee, editableBasket)}

          {/* Draggable touch targets for markers */}
          {imageSize.width > 0 && imageSize.height > 0 && (
            <>
              {/* Tee drag handle */}
              <View
                {...teePanResponder.panHandlers}
                style={[
                  styles.dragHandle,
                  {
                    left: teePixelX - 25,
                    top: teePixelY - 25,
                    borderColor: '#22C55E',
                  },
                ]}
              />
              {/* Basket drag handle */}
              <View
                {...basketPanResponder.panHandlers}
                style={[
                  styles.dragHandle,
                  {
                    left: basketPixelX - 25,
                    top: basketPixelY - 25,
                    borderColor: '#EF4444',
                  },
                ]}
              />
            </>
          )}
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
            {renderOverlay(screenDimensions.width, screenDimensions.height * 0.8, teePosition, basketPosition)}
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
  dragHandle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
