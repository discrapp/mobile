import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import Svg, { Path, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import {
  calculateFlightPath,
  FlightNumbers,
  ThrowType,
  CanvasConfig,
} from '@/lib/flightCalculator';
import Colors from '@/constants/Colors';

interface FlightPathProps {
  speed: number;
  glide: number;
  turn: number;
  fade: number;
}

type ThrowStyle = 'backhand' | 'forehand';
type ThrowingHand = 'right' | 'left';

const PATH_COLORS = {
  hyzer: '#3498DB', // Blue
  flat: Colors.violet.primary, // Violet
  anhyzer: '#E67E22', // Orange
};

const CANVAS_WIDTH = 240;
const CANVAS_HEIGHT = 300;
const LEFT_MARGIN = 40; // Space for distance labels

// Calculate expected max distance based on disc speed/glide
// Returns a nice round number for the scale
function getMaxDistance(speed: number, glide: number): number {
  // Realistic distance based on speed (in feet)
  const baseDistance = 30 + speed * 28; // Speed 2 = ~86ft, Speed 12 = ~366ft
  const glideBonus = glide * 5;
  const estimated = baseDistance + glideBonus;

  // Round up to nearest 50ft for clean scale
  const rounded = Math.ceil(estimated / 50) * 50;

  // Clamp between 100 and 400
  return Math.max(100, Math.min(400, rounded));
}

export default function FlightPath({
  speed,
  glide,
  turn,
  fade,
}: FlightPathProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [throwStyle, setThrowStyle] = useState<ThrowStyle>('backhand');
  const [throwingHand, setThrowingHand] = useState<ThrowingHand>('right');
  // null = show all, 'hyzer'/'flat'/'anhyzer' = show only that one
  const [selectedPath, setSelectedPath] = useState<'hyzer' | 'flat' | 'anhyzer' | null>(null);

  const togglePath = (path: 'hyzer' | 'flat' | 'anhyzer') => {
    // If already selected, go back to showing all
    // If not selected, show only this one
    setSelectedPath((prev) => (prev === path ? null : path));
  };

  // Determine which paths to show
  const visiblePaths = {
    hyzer: selectedPath === null || selectedPath === 'hyzer',
    flat: selectedPath === null || selectedPath === 'flat',
    anhyzer: selectedPath === null || selectedPath === 'anhyzer',
  };

  // Fetch user's throwing hand preference
  useEffect(() => {
    let isMounted = true;

    async function fetchThrowingHand() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('throwing_hand')
          .eq('id', user.id)
          .single();

        if (!error && data?.throwing_hand && isMounted) {
          setThrowingHand(data.throwing_hand as ThrowingHand);
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

  // Calculate throw type based on hand and style
  const getThrowType = (): ThrowType => {
    if (throwingHand === 'right') {
      return throwStyle === 'backhand' ? 'rhbh' : 'rhfh';
    } else {
      return throwStyle === 'backhand' ? 'lhbh' : 'lhfh';
    }
  };

  const flightNumbers: FlightNumbers = { speed, glide, turn, fade };
  const graphCenterX = LEFT_MARGIN + (CANVAS_WIDTH - LEFT_MARGIN) / 2;
  const teeY = CANVAS_HEIGHT - 20;
  const maxDistance = getMaxDistance(speed, glide);

  // Canvas config for flight path calculation - paths start from tee position
  const canvasConfig: CanvasConfig = {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    startX: graphCenterX,
    startY: teeY,
    maxDistance, // Pass scale to calculator
  };

  const paths = calculateFlightPath(flightNumbers, getThrowType(), canvasConfig);

  // Distance markers - divide into 4 equal parts
  const flightAreaTop = 20;
  const flightAreaHeight = teeY - flightAreaTop;
  const pixelsPerFoot = flightAreaHeight / maxDistance;
  const markerInterval = maxDistance / 4;
  const distanceMarkers = [1, 2, 3, 4].map((i) => ({
    y: teeY - i * markerInterval * pixelsPerFoot,
    distance: Math.round(i * markerInterval),
  }));

  return (
    <RNView style={[styles.container, isDark && styles.containerDark]}>
      <Text style={styles.sectionTitle}>FLIGHT PATH</Text>

      {/* SVG Canvas */}
      <RNView style={styles.canvasContainer}>
        <Svg
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
          {/* Grid lines */}
          <G opacity={0.2}>
            {/* Vertical center line */}
            <Line
              x1={graphCenterX}
              y1={0}
              x2={graphCenterX}
              y2={CANVAS_HEIGHT}
              stroke={isDark ? '#fff' : '#000'}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            {/* Horizontal lines at distance markers (skip 0ft/tee) */}
            {distanceMarkers
              .filter((m) => m.distance > 0)
              .map((marker, i) => (
                <Line
                  key={i}
                  x1={LEFT_MARGIN}
                  y1={marker.y}
                  x2={CANVAS_WIDTH}
                  y2={marker.y}
                  stroke={isDark ? '#fff' : '#000'}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              ))}
          </G>

          {/* Distance labels */}
          {distanceMarkers
            .filter((m) => m.distance > 0)
            .map((marker, i) => (
              <SvgText
                key={i}
                x={LEFT_MARGIN - 4}
                y={marker.y + 4}
                fontSize={10}
                fill={isDark ? '#999' : '#666'}
                textAnchor="end">
                {marker.distance}ft
              </SvgText>
            ))}

          {/* Tee label */}
          <SvgText
            x={LEFT_MARGIN - 4}
            y={teeY + 4}
            fontSize={10}
            fill={isDark ? '#999' : '#666'}
            textAnchor="end">
            Tee
          </SvgText>

          {/* Tee marker */}
          <Circle
            cx={graphCenterX}
            cy={teeY}
            r={6}
            fill={isDark ? '#fff' : '#000'}
          />

          {/* Flight paths - conditionally rendered based on selection */}
          {visiblePaths.hyzer && (
            <Path
              d={paths.hyzer}
              stroke={PATH_COLORS.hyzer}
              strokeWidth={3}
              fill="none"
            />
          )}
          {visiblePaths.flat && (
            <Path
              d={paths.flat}
              stroke={PATH_COLORS.flat}
              strokeWidth={3}
              fill="none"
            />
          )}
          {visiblePaths.anhyzer && (
            <Path
              d={paths.anhyzer}
              stroke={PATH_COLORS.anhyzer}
              strokeWidth={3}
              fill="none"
            />
          )}
        </Svg>
      </RNView>

      {/* Backhand/Forehand Toggle */}
      <RNView style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonLeft,
            throwStyle === 'backhand' && styles.toggleButtonActive,
            isDark && styles.toggleButtonDark,
            throwStyle === 'backhand' && isDark && styles.toggleButtonActiveDark,
          ]}
          onPress={() => setThrowStyle('backhand')}>
          <Text
            style={[
              styles.toggleText,
              throwStyle === 'backhand' && styles.toggleTextActive,
            ]}>
            Backhand
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonRight,
            throwStyle === 'forehand' && styles.toggleButtonActive,
            isDark && styles.toggleButtonDark,
            throwStyle === 'forehand' && isDark && styles.toggleButtonActiveDark,
          ]}
          onPress={() => setThrowStyle('forehand')}>
          <Text
            style={[
              styles.toggleText,
              throwStyle === 'forehand' && styles.toggleTextActive,
            ]}>
            Forehand
          </Text>
        </TouchableOpacity>
      </RNView>

      {/* Legend - tappable to filter paths */}
      <RNView style={styles.legendContainer}>
        <TouchableOpacity
          style={[
            styles.legendItem,
            !visiblePaths.hyzer && styles.legendItemInactive,
          ]}
          onPress={() => togglePath('hyzer')}>
          <RNView
            style={[
              styles.legendLine,
              { backgroundColor: PATH_COLORS.hyzer },
              !visiblePaths.hyzer && styles.legendLineInactive,
            ]}
          />
          <Text
            style={[
              styles.legendText,
              !visiblePaths.hyzer && styles.legendTextInactive,
            ]}>
            Hyzer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.legendItem,
            !visiblePaths.flat && styles.legendItemInactive,
          ]}
          onPress={() => togglePath('flat')}>
          <RNView
            style={[
              styles.legendLine,
              { backgroundColor: PATH_COLORS.flat },
              !visiblePaths.flat && styles.legendLineInactive,
            ]}
          />
          <Text
            style={[
              styles.legendText,
              !visiblePaths.flat && styles.legendTextInactive,
            ]}>
            Flat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.legendItem,
            !visiblePaths.anhyzer && styles.legendItemInactive,
          ]}
          onPress={() => togglePath('anhyzer')}>
          <RNView
            style={[
              styles.legendLine,
              { backgroundColor: PATH_COLORS.anhyzer },
              !visiblePaths.anhyzer && styles.legendLineInactive,
            ]}
          />
          <Text
            style={[
              styles.legendText,
              !visiblePaths.anhyzer && styles.legendTextInactive,
            ]}>
            Anhyzer
          </Text>
        </TouchableOpacity>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  canvasContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleButtonDark: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0,
  },
  toggleButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.violet.primary,
    borderColor: Colors.violet.primary,
  },
  toggleButtonActiveDark: {
    backgroundColor: Colors.violet.primary,
    borderColor: Colors.violet.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  legendItemInactive: {
    opacity: 0.4,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  legendLineInactive: {
    backgroundColor: '#999',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  legendTextInactive: {
    color: '#999',
  },
});
