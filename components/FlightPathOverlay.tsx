import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Image,
  View,
  Pressable,
  Dimensions,
  Modal,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Text,
  TouchableOpacity,
} from 'react-native';
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
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  onDragStart: _onDragStart,
  onDragEnd: _onDragEnd,
}: FlightPathOverlayProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Current saved positions (what's displayed on small preview)
  const [savedTee, setSavedTee] = useState(teePosition);
  const [savedBasket, setSavedBasket] = useState(basketPosition);
  const originalTeeRef = useRef(teePosition);
  const originalBasketRef = useRef(basketPosition);

  // Modal editing positions (temporary while editing)
  const [modalTee, setModalTee] = useState(teePosition);
  const [modalBasket, setModalBasket] = useState(basketPosition);
  const [modalImageSize, setModalImageSize] = useState({ width: 0, height: 0 });

  // Update positions when props change (new photo/analysis)
  React.useEffect(() => {
    setSavedTee(teePosition);
    setSavedBasket(basketPosition);
    setModalTee(teePosition);
    setModalBasket(basketPosition);
    originalTeeRef.current = teePosition;
    originalBasketRef.current = basketPosition;
  }, [teePosition.x, teePosition.y, basketPosition.x, basketPosition.y]);

  const handleImageLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setImageSize({ width, height });
  };

  const handleModalImageLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setModalImageSize({ width, height });
  };

  // Open modal and reset modal positions to current saved
  const openModal = useCallback(() => {
    setModalTee(savedTee);
    setModalBasket(savedBasket);
    setIsExpanded(true);
  }, [savedTee, savedBasket]);

  // Save changes and close modal
  const handleSave = useCallback(() => {
    setSavedTee(modalTee);
    setSavedBasket(modalBasket);
    setIsExpanded(false);

    // Notify parent of position change
    if (onPositionChange) {
      onPositionChange({
        teePosition: modalTee,
        basketPosition: modalBasket,
        originalTeePosition: originalTeeRef.current,
        originalBasketPosition: originalBasketRef.current,
      });
    }
  }, [modalTee, modalBasket, onPositionChange]);

  // Cancel and close modal (revert to saved positions)
  const handleCancel = useCallback(() => {
    setModalTee(savedTee);
    setModalBasket(savedBasket);
    setIsExpanded(false);
  }, [savedTee, savedBasket]);

  // Refs for PanResponder (modal editing)
  const modalTeeRef = useRef(modalTee);
  const modalBasketRef = useRef(modalBasket);
  const modalImageSizeRef = useRef(modalImageSize);

  React.useEffect(() => {
    modalTeeRef.current = modalTee;
    modalBasketRef.current = modalBasket;
  }, [modalTee, modalBasket]);

  React.useEffect(() => {
    modalImageSizeRef.current = modalImageSize;
  }, [modalImageSize]);

  // Create drag handler for modal markers
  const createModalDragHandler = (
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
        const currentImageSize = modalImageSizeRef.current;
        if (currentImageSize.width === 0 || currentImageSize.height === 0) return;

        // Convert pixel movement to percentage
        const deltaXPercent = (gestureState.dx / currentImageSize.width) * 100;
        const deltaYPercent = (gestureState.dy / currentImageSize.height) * 100;

        // Clamp to 0-100 range
        const newX = Math.max(0, Math.min(100, startPos.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100, startPos.y + deltaYPercent));

        setPosition({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        // Don't save yet - wait for Save button
      },
      onPanResponderTerminate: () => {
        // Don't save yet - wait for Save button
      },
    });
  };

  const modalTeePanResponder = useRef(createModalDragHandler(setModalTee, modalTeeRef)).current;
  const modalBasketPanResponder = useRef(createModalDragHandler(setModalBasket, modalBasketRef)).current;

  const pathColor = PATH_COLORS[throwType];
  const normalizedFlightNumbers = toFlightNumbers(flightNumbers);

  const screenDimensions = Dimensions.get('window');

  // Calculate modal image dimensions (maintain aspect ratio)
  const modalImageWidth = screenDimensions.width;
  const modalImageHeight = screenDimensions.height * 0.7;

  // Modal drag handle positions
  const modalTeePixelX = (modalTee.x / 100) * modalImageSize.width;
  const modalTeePixelY = (modalTee.y / 100) * modalImageSize.height;
  const modalBasketPixelX = (modalBasket.x / 100) * modalImageSize.width;
  const modalBasketPixelY = (modalBasket.y / 100) * modalImageSize.height;

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
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Pressable style={styles.imageWrapper} onLayout={handleImageLayout} onPress={openModal}>
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

          {/* SVG Overlay with saved positions (read-only on preview) */}
          {imageSize.width > 0 &&
            imageSize.height > 0 &&
            renderOverlay(imageSize.width, imageSize.height, savedTee, savedBasket)}

          {/* Tap to edit hint */}
          <View style={styles.editHint}>
            <Text style={styles.editHintText}>Tap to edit positions</Text>
          </View>
        </Pressable>
      </View>

      {/* Fullscreen Modal for editing */}
      <Modal visible={isExpanded} transparent animationType="fade" onRequestClose={handleCancel}>
        <View style={styles.modalBackdrop}>
          {/* Header with instructions */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Drag markers to correct positions</Text>
          </View>

          {/* Image container with overlay */}
          <View style={styles.modalImageContainer} onLayout={handleModalImageLayout}>
            <Image
              source={{ uri: photoUri }}
              style={{
                width: modalImageWidth,
                height: modalImageHeight,
              }}
              resizeMode="contain"
            />
            {/* SVG Overlay with modal editing positions */}
            {modalImageSize.width > 0 &&
              modalImageSize.height > 0 &&
              renderOverlay(modalImageSize.width, modalImageSize.height, modalTee, modalBasket)}

            {/* Draggable touch targets for markers in modal */}
            {modalImageSize.width > 0 && modalImageSize.height > 0 && (
              <>
                {/* Tee drag handle */}
                <View
                  {...modalTeePanResponder.panHandlers}
                  style={[
                    styles.dragHandle,
                    {
                      left: modalTeePixelX - 25,
                      top: modalTeePixelY - 25,
                      borderColor: '#22C55E',
                    },
                  ]}
                />
                {/* Basket drag handle */}
                <View
                  {...modalBasketPanResponder.panHandlers}
                  style={[
                    styles.dragHandle,
                    {
                      left: modalBasketPixelX - 25,
                      top: modalBasketPixelY - 25,
                      borderColor: '#EF4444',
                    },
                  ]}
                />
              </>
            )}
          </View>

          {/* Save/Cancel buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  editHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  editHintText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.violet.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
