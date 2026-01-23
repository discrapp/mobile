import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  View,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useDiscRecommendations } from '@/hooks/useDiscRecommendations';
import DiscRecommendationCard from '@/components/DiscRecommendationCard';
import BagAnalysisCard from '@/components/BagAnalysisCard';
import TradeInCandidateCard from '@/components/TradeInCandidateCard';

type RecommendationCount = 1 | 3 | 5;

const LOADING_STEPS = [
  { icon: 'search', text: 'Scanning your disc bag...' },
  { icon: 'bar-chart', text: 'Analyzing flight numbers...' },
  { icon: 'pie-chart', text: 'Identifying coverage gaps...' },
  { icon: 'database', text: 'Searching disc catalog...' },
  { icon: 'lightbulb-o', text: 'Building recommendations...' },
];

const DISC_FACTS = [
  'The world record for longest disc golf throw is over 1,100 feet!',
  'Most pros carry 15-25 discs in their tournament bag.',
  'Understable discs are great for beginners and turnover shots.',
  'Speed isn\'t everything - a well-thrown putter can beat a poorly-thrown driver.',
  'The "Buzz" by Discraft is one of the most popular midranges ever made.',
];

export default function DiscRecommendationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = Colors[colorScheme ?? 'light'].text;

  // Count selection state
  const [selectedCount, setSelectedCount] = useState<RecommendationCount>(3);

  // Loading animation state
  const [loadingStep, setLoadingStep] = useState(0);
  const [discFact, setDiscFact] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Disc recommendations hook
  const { getRecommendations, isLoading, error, result, reset } = useDiscRecommendations();

  // Animate loading steps
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }

    // Set random disc fact when loading starts
    setDiscFact(DISC_FACTS[Math.floor(Math.random() * DISC_FACTS.length)]);

    // Cycle through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2000);

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      clearInterval(stepInterval);
      pulse.stop();
    };
  }, [isLoading, pulseAnim]);

  // Dynamic styles for dark/light mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    card: {
      backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8',
      borderColor: isDark ? '#333' : '#e0e0e0',
    },
    text: {
      color: textColor,
    },
    secondaryText: {
      color: isDark ? '#999' : '#666',
    },
  };

  const handleAnalyzeBag = async () => {
    await getRecommendations(selectedCount);
  };

  const handleTryAgain = () => {
    reset();
  };

  const handleOpenLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const renderCountSelector = () => (
    <View style={styles.countSelector}>
      {([1, 3, 5] as RecommendationCount[]).map((count) => (
        <Pressable
          key={count}
          style={[
            styles.countButton,
            dynamicStyles.card,
            selectedCount === count && styles.countButtonSelected,
          ]}
          onPress={() => setSelectedCount(count)}
        >
          <Text
            style={[
              styles.countButtonText,
              dynamicStyles.text,
              selectedCount === count && styles.countButtonTextSelected,
            ]}
          >
            {count}
          </Text>
          <Text
            style={[
              styles.countButtonLabel,
              dynamicStyles.secondaryText,
              selectedCount === count && styles.countButtonLabelSelected,
            ]}
          >
            {count === 1 ? 'disc' : 'discs'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderInitialState = () => (
    <View style={styles.centeredContent}>
      <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(127, 34, 206, 0.3)' : 'rgba(127, 34, 206, 0.1)' }]}>
        <FontAwesome name="lightbulb-o" size={48} color={isDark ? '#a78bfa' : Colors.violet.primary} />
      </View>
      <Text style={[styles.promptTitle, dynamicStyles.text]}>Fill Your Bag</Text>
      <Text style={[styles.promptSubtitle, dynamicStyles.secondaryText]}>
        AI will analyze your disc collection, identify gaps in your bag, and recommend discs to
        complete your arsenal.
      </Text>

      <Text style={[styles.countLabel, dynamicStyles.text]}>How many recommendations?</Text>
      {renderCountSelector()}

      <Pressable
        style={[styles.actionButton, { backgroundColor: Colors.violet.primary }]}
        onPress={handleAnalyzeBag}
      >
        <FontAwesome name="magic" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.actionButtonText}>Analyze My Bag</Text>
      </Pressable>
    </View>
  );

  const renderLoadingState = () => {
    const currentStep = LOADING_STEPS[loadingStep];
    return (
      <View style={styles.centeredContent}>
        {/* Animated icon */}
        <Animated.View
          style={[
            styles.loadingIconContainer,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: isDark ? 'rgba(127, 34, 206, 0.3)' : 'rgba(127, 34, 206, 0.1)',
            },
          ]}
        >
          <FontAwesome
            name={currentStep.icon as keyof typeof FontAwesome.glyphMap}
            size={48}
            color={isDark ? '#a78bfa' : Colors.violet.primary}
          />
        </Animated.View>

        {/* Current step */}
        <Text style={[styles.loadingTitle, dynamicStyles.text]}>{currentStep.text}</Text>

        {/* Progress dots */}
        <View style={styles.loadingDots}>
          {LOADING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.loadingDot,
                index === loadingStep && styles.loadingDotActive,
                { backgroundColor: index === loadingStep ? (isDark ? '#a78bfa' : Colors.violet.primary) : isDark ? '#444' : '#ddd' },
              ]}
            />
          ))}
        </View>

        {/* Disc fact */}
        <View style={[styles.factContainer, dynamicStyles.card]}>
          <FontAwesome
            name="star"
            size={14}
            color={isDark ? '#F39C12' : '#F39C12'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.factText, dynamicStyles.secondaryText]}>{discFact}</Text>
        </View>
      </View>
    );
  };

  const renderErrorState = () => (
    <View style={styles.centeredContent}>
      <View style={[styles.iconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
        <FontAwesome name="exclamation-triangle" size={48} color="#e74c3c" />
      </View>
      <Text style={[styles.errorTitle, dynamicStyles.text]}>Something went wrong</Text>
      <Text style={[styles.errorMessage, dynamicStyles.secondaryText]}>{error}</Text>
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

    const { recommendations, trade_in_candidates, bag_analysis, confidence, processing_time_ms } = result;

    return (
      <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
        {/* Bag Analysis Summary */}
        <BagAnalysisCard
          bagAnalysis={bag_analysis}
          confidence={confidence}
          processingTimeMs={processing_time_ms}
          isDark={isDark}
        />

        {/* Recommendations */}
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>Recommended Discs</Text>
        {recommendations.map((rec, index) => (
          <DiscRecommendationCard
            key={rec.disc.id || index}
            recommendation={rec}
            isDark={isDark}
            onBuyPress={() => handleOpenLink(rec.purchase_url)}
          />
        ))}

        {/* Trade-in Candidates */}
        {trade_in_candidates && trade_in_candidates.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Consider Trading</Text>
            <Text style={[styles.sectionSubtitle, dynamicStyles.secondaryText]}>
              These discs may be redundant in your bag
            </Text>
            {trade_in_candidates.map((candidate, index) => (
              <TradeInCandidateCard
                key={candidate.disc.id || index}
                candidate={candidate}
                isDark={isDark}
              />
            ))}
          </>
        )}

        {/* Try Another Analysis Button */}
        <Pressable
          style={[styles.actionButton, styles.tryAnotherButton, { backgroundColor: Colors.violet.primary }]}
          onPress={handleTryAgain}
        >
          <FontAwesome name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>New Analysis</Text>
        </Pressable>

        {/* Back Button */}
        <Pressable
          style={[styles.backButtonBottom, dynamicStyles.card]}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={16} color={textColor} style={{ marginRight: 8 }} />
          <Text style={[styles.backButtonBottomText, dynamicStyles.text]}>Back to My Bag</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#e0e0e0' }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <FontAwesome name="chevron-left" size={18} color={textColor} />
          <Text style={[styles.backText, dynamicStyles.text]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Fill My Bag</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading && renderLoadingState()}
        {!isLoading && error && renderErrorState()}
        {!isLoading && !error && result && renderResult()}
        {!isLoading && !error && !result && renderInitialState()}
      </View>
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
  countLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  countSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  countButton: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButtonSelected: {
    borderColor: Colors.violet.primary,
    backgroundColor: 'rgba(127, 34, 206, 0.6)',
  },
  countButtonText: {
    fontSize: 24,
    fontWeight: '700',
  },
  countButtonTextSelected: {
    color: '#fff',
  },
  countButtonLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  countButtonLabelSelected: {
    color: '#fff',
  },
  loadingIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(127, 34, 206, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingDotActive: {
    width: 24,
  },
  factContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 300,
  },
  factText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
  },
  tryAnotherButton: {
    marginTop: 8,
  },
  backButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  backButtonBottomText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
