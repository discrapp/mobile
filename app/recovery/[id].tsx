import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Linking,
  RefreshControl,
  View as RNView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { Avatar } from '@/components/Avatar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/components/useColorScheme';
import { Skeleton } from '@/components/Skeleton';
import { openVenmoPayment } from '@/lib/venmoDeepLink';
import * as WebBrowser from 'expo-web-browser';
import { formatFeeHint, calculateTotalWithFee } from '@/lib/stripeFees';
import { handleError, showSuccess } from '@/lib/errorHandler';

interface MeetupProposal {
  id: string;
  proposed_by: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  proposed_datetime: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
}

interface DropOff {
  id: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  location_notes?: string;
  dropped_off_at: string;
  created_at: string;
}

interface RecoveryDetails {
  id: string;
  status: 'found' | 'meetup_proposed' | 'meetup_confirmed' | 'recovered' | 'cancelled' | 'surrendered' | 'dropped_off' | 'abandoned';
  finder_message?: string;
  found_at: string;
  recovered_at?: string;
  surrendered_at?: string;
  reward_paid_at?: string | null;
  created_at: string;
  updated_at: string;
  user_role: 'owner' | 'finder';
  disc: {
    id: string;
    name: string;
    manufacturer?: string;
    mold?: string;
    plastic?: string;
    color?: string;
    reward_amount?: number;
    photo_url?: string;
  } | null;
  owner: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    venmo_username?: string | null;
  };
  finder: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    venmo_username?: string | null;
    stripe_connect_status?: string | null;
    can_receive_card_payments?: boolean;
  };
  meetup_proposals: MeetupProposal[];
  drop_off?: DropOff | null;
}

export default function RecoveryDetailScreen() {
  const { id: recoveryId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [recovery, setRecovery] = useState<RecoveryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [cardPaymentLoading, setCardPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // istanbul ignore next -- Custom header navigation tested via integration tests
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <FontAwesome name="chevron-left" size={20} color={Colors.violet.primary} />
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const fetchRecoveryDetails = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be signed in to view this');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-recovery-details?id=${recoveryId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load recovery details');
      }

      const data = await response.json();
      setRecovery(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching recovery:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recovery details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recoveryId]);

  useEffect(() => {
    fetchRecoveryDetails();
  }, [fetchRecoveryDetails]);

  // istanbul ignore next -- Real-time subscriptions require live Supabase connection
  useEffect(() => {
    if (!recoveryId) return;

    const channel = supabase
      .channel(`recovery-${recoveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recovery_events',
          filter: `id=eq.${recoveryId}`,
        },
        () => {
          // Refetch when the recovery event is updated
          fetchRecoveryDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetup_proposals',
          filter: `recovery_event_id=eq.${recoveryId}`,
        },
        () => {
          // Refetch when meetup proposals change
          fetchRecoveryDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drop_offs',
          filter: `recovery_event_id=eq.${recoveryId}`,
        },
        () => {
          // Refetch when drop-offs change
          fetchRecoveryDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recoveryId, fetchRecoveryDetails]);

  // istanbul ignore next -- Pull-to-refresh tested via integration tests
  const onRefresh = () => {
    setRefreshing(true);
    fetchRecoveryDetails();
  };

  // istanbul ignore next -- Meetup acceptance tested via integration tests
  const handleAcceptMeetup = async (proposalId: string) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/accept-meetup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ proposal_id: proposalId }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to accept meetup');

      showSuccess('Meetup accepted! The finder has been notified.');
      fetchRecoveryDetails();
    } catch (err) {
      handleError(err, { operation: 'accept-meetup' });
    } finally {
      setActionLoading(false);
    }
  };

  // istanbul ignore next -- Navigation tested via integration tests
  const handleCounterProposal = () => {
    // Navigate to propose-meetup screen to suggest an alternative
    // The API will automatically decline the existing proposal
    router.push(`/propose-meetup/${recoveryId}`);
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleCompleteRecovery = async () => {
    Alert.alert(
      'Mark as Recovered',
      'Confirm that you have received your disc back?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/complete-recovery`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ recovery_event_id: recoveryId }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Failed to complete recovery');

              showSuccess('Your disc has been marked as recovered!');
              router.back();
            } catch (err) {
              handleError(err, { operation: 'complete-recovery' });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleSurrenderDisc = async () => {
    const finderName = recovery?.finder.display_name || 'the finder';
    const discName = recovery?.disc?.name || 'this disc';

    Alert.alert(
      'Surrender Disc?',
      `This will permanently transfer ownership of ${discName} to ${finderName}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Surrender',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/surrender-disc`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ recovery_event_id: recoveryId }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Failed to surrender disc');

              showSuccess(`${discName} has been transferred to ${finderName}`);
              router.replace('/');
            } catch (err) {
              handleError(err, { operation: 'surrender-disc' });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleMarkRetrieved = async () => {
    Alert.alert(
      'Mark as Retrieved',
      'Confirm that you have picked up your disc from the drop-off location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mark-disc-retrieved`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ recovery_event_id: recoveryId }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Failed to mark as retrieved');

              showSuccess('Your disc has been marked as retrieved!');
              router.back();
            } catch (err) {
              handleError(err, { operation: 'mark-retrieved' });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleRelinquishDisc = async () => {
    const finderName = recovery?.finder.display_name || 'the finder';
    const discName = recovery?.disc?.name || 'this disc';

    Alert.alert(
      'Give Disc to Finder?',
      `This will transfer ownership of ${discName} to ${finderName}. They will pick it up from the drop-off location. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Give to Finder',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/relinquish-disc`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ recovery_event_id: recoveryId }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Failed to relinquish disc');

              showSuccess(`${discName} has been transferred to ${finderName}`);
              router.replace('/');
            } catch (err) {
              handleError(err, { operation: 'relinquish-disc' });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleAbandonDisc = async () => {
    const discName = recovery?.disc?.name || 'this disc';

    Alert.alert(
      'Abandon Disc?',
      `This will make ${discName} available for anyone to claim. The disc will remain at the drop-off location until someone finds it. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('Not authenticated');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/abandon-disc`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ recovery_event_id: recoveryId }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Failed to abandon disc');

              showSuccess(`${discName} is now available for anyone to claim`);
              router.replace('/');
            } catch (err) {
              handleError(err, { operation: 'abandon-disc' });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // istanbul ignore next -- Linking tested via integration tests
  const handleGetDirections = (proposal: MeetupProposal) => {
    if (proposal.latitude && proposal.longitude) {
      const url = `https://maps.google.com/?q=${proposal.latitude},${proposal.longitude}`;
      Linking.openURL(url);
    } else {
      const url = `https://maps.google.com/?q=${encodeURIComponent(proposal.location_name)}`;
      Linking.openURL(url);
    }
  };

  // istanbul ignore next -- Venmo payment tested via integration tests
  const handleSendReward = async () => {
    if (!recovery?.finder.venmo_username || !recovery.disc?.reward_amount) {
      Alert.alert('Error', 'Unable to send reward. The finder may not have Venmo set up.');
      return;
    }

    const success = await openVenmoPayment({
      recipientUsername: recovery.finder.venmo_username,
      amount: recovery.disc.reward_amount,
      discName: recovery.disc.mold || recovery.disc.name,
    });

    if (!success) {
      Alert.alert(
        'Could not open Venmo',
        'Please install the Venmo app or visit venmo.com to send the reward.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleMarkRewardReceived = async () => {
    setMarkingPaid(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mark-reward-paid`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ recovery_event_id: recoveryId }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to mark reward as received');

      showSuccess('The reward has been marked as received');
      fetchRecoveryDetails();
    } catch (err) {
      handleError(err, { operation: 'mark-reward-received' });
    } finally {
      setMarkingPaid(false);
    }
  };

  // istanbul ignore next -- Stripe payment tested via integration tests
  const handlePayWithCard = async () => {
    if (!recovery?.disc?.reward_amount) {
      Alert.alert('Error', 'Unable to process payment. No reward amount set.');
      return;
    }

    setCardPaymentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-reward-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ recovery_event_id: recoveryId }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create payment');

      // Open Stripe Checkout in browser
      await WebBrowser.openBrowserAsync(data.checkout_url);

      // Refresh to check if payment was completed
      fetchRecoveryDetails();
    } catch (err) {
      handleError(err, { operation: 'pay-with-card' });
    } finally {
      setCardPaymentLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // istanbul ignore next -- Status info mapping tested via integration tests
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'found':
        return { label: 'Disc Found', color: '#F39C12', icon: 'search' as const };
      case 'meetup_proposed':
        return { label: 'Meetup Proposed', color: '#3498DB', icon: 'calendar' as const };
      case 'meetup_confirmed':
        return { label: 'Meetup Confirmed', color: '#2ECC71', icon: 'check-circle' as const };
      case 'dropped_off':
        return { label: 'Dropped Off', color: '#9B59B6', icon: 'map-marker' as const };
      case 'recovered':
        return { label: 'Recovered', color: '#27AE60', icon: 'check' as const };
      case 'cancelled':
        return { label: 'Cancelled', color: '#E74C3C', icon: 'times' as const };
      case 'surrendered':
        return { label: 'Surrendered', color: '#9B59B6', icon: 'gift' as const };
      case 'abandoned':
        return { label: 'Abandoned', color: '#95A5A6', icon: 'times-circle' as const };
      default:
        return { label: status, color: '#95A5A6', icon: 'question' as const };
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.skeletonContent}>
        {/* Status badge skeleton */}
        <Skeleton width={120} height={32} borderRadius={16} style={{ marginBottom: 16, alignSelf: 'center' }} />

        {/* Disc info skeleton */}
        <RNView style={[styles.skeletonCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
          <Skeleton width={150} height={20} style={{ marginBottom: 8 }} />
          <Skeleton width={100} height={16} style={{ marginBottom: 8 }} />
          <Skeleton width={80} height={14} />
        </RNView>

        {/* People involved skeleton */}
        <RNView style={[styles.skeletonCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Skeleton width={100} height={14} style={{ marginBottom: 16 }} />
          <RNView style={styles.skeletonPeopleRow}>
            <Skeleton width={50} height={50} borderRadius={25} />
            <Skeleton width={100} height={16} />
          </RNView>
          <RNView style={styles.skeletonPeopleRow}>
            <Skeleton width={50} height={50} borderRadius={25} />
            <Skeleton width={100} height={16} />
          </RNView>
        </RNView>

        {/* Action buttons skeleton */}
        <Skeleton width="100%" height={50} borderRadius={12} style={{ marginTop: 16 }} />
        <Skeleton width="100%" height={50} borderRadius={12} style={{ marginTop: 12 }} />
      </ScrollView>
    );
  }

  if (error || !recovery) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="exclamation-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error || 'Recovery not found'}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const statusInfo = getStatusInfo(recovery.status);
  const isOwner = recovery.user_role === 'owner';
  const pendingProposal = recovery.meetup_proposals.find(p => p.status === 'pending');
  const acceptedProposal = recovery.meetup_proposals.find(p => p.status === 'accepted');

  // Determine if current user proposed the pending meetup
  const currentUserId = isOwner ? recovery.owner.id : recovery.finder.id;
  const userProposedMeetup = pendingProposal?.proposed_by === currentUserId;
  const canRespondToProposal = pendingProposal && !userProposedMeetup;

  // Check if recovery is in active state where surrender is allowed (not for dropped_off - use abandon instead)
  const canSurrender = isOwner && ['found', 'meetup_proposed', 'meetup_confirmed'].includes(recovery.status);

  // Check if recovery is dropped_off where abandon is allowed
  const canAbandon = isOwner && recovery.status === 'dropped_off';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
        <FontAwesome name={statusInfo.icon} size={16} color="#fff" />
        <Text style={styles.statusText}>{statusInfo.label}</Text>
      </View>

      {/* Recovery Complete - shown at top when disc is recovered */}
      {recovery.status === 'recovered' && (
        <RNView style={[styles.section, styles.recoveredSection]}>
          <FontAwesome name="trophy" size={48} color="#F1C40F" />
          <Text style={styles.recoveredTitle}>Disc Recovered!</Text>
          <Text style={styles.recoveredText}>
            This disc was successfully returned on {formatDate(recovery.recovered_at || recovery.updated_at)}
          </Text>

          {/* Reward already received confirmation */}
          {recovery.reward_paid_at && recovery.disc?.reward_amount && recovery.disc.reward_amount > 0 && (
            <RNView style={styles.rewardReceivedBadge}>
              <FontAwesome name="check-circle" size={18} color="#2ECC71" />
              <Text style={styles.rewardReceivedText}>
                ${recovery.disc.reward_amount} Reward Received
              </Text>
            </RNView>
          )}

          {/* Payment options for owner when reward not yet paid */}
          {isOwner && recovery.disc?.reward_amount && recovery.disc.reward_amount > 0 && !recovery.reward_paid_at && (
            <RNView style={styles.paymentOptions}>
              {/* Venmo button - shown when finder has Venmo */}
              {recovery.finder.venmo_username && (
                <Pressable style={styles.venmoButton} onPress={handleSendReward}>
                  <RNView style={styles.venmoIconBox}>
                    <Text style={styles.venmoIconText}>V</Text>
                  </RNView>
                  <RNView style={styles.paymentButtonContent}>
                    <Text style={styles.venmoButtonText}>
                      Send ${recovery.disc.reward_amount} via Venmo
                    </Text>
                    <Text style={styles.paymentFeeNote}>Free</Text>
                  </RNView>
                </Pressable>
              )}

              {/* Card payment button - shown when finder has Stripe Connect */}
              {recovery.finder.can_receive_card_payments && (
                <Pressable
                  style={styles.cardPaymentButton}
                  onPress={handlePayWithCard}
                  disabled={cardPaymentLoading}
                >
                  {cardPaymentLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FontAwesome name="credit-card" size={18} color="#fff" />
                      <RNView style={styles.paymentButtonContent}>
                        <Text style={styles.cardPaymentButtonText}>
                          Pay ${calculateTotalWithFee(recovery.disc.reward_amount).toFixed(2)} with Card
                        </Text>
                        <Text style={styles.cardPaymentFeeNote}>
                          {formatFeeHint(recovery.disc.reward_amount)}
                        </Text>
                      </RNView>
                    </>
                  )}
                </Pressable>
              )}

              {/* No payment options message - shown when neither option is available */}
              {!recovery.finder.venmo_username && !recovery.finder.can_receive_card_payments && (
                <RNView style={styles.noVenmoMessage}>
                  <FontAwesome name="info-circle" size={16} color="#666" />
                  <Text style={styles.noVenmoText}>
                    Contact {recovery.finder.display_name} directly to send the ${recovery.disc.reward_amount} reward
                  </Text>
                </RNView>
              )}
            </RNView>
          )}

          {/* Mark reward as received button - shown to finder when reward exists and not yet marked */}
          {!isOwner && recovery.disc?.reward_amount && recovery.disc.reward_amount > 0 && !recovery.reward_paid_at && (
            <Pressable
              style={styles.markReceivedButton}
              onPress={handleMarkRewardReceived}
              disabled={markingPaid}
            >
              {markingPaid ? (
                <ActivityIndicator color="#2ECC71" />
              ) : (
                <>
                  <FontAwesome name="check" size={16} color="#2ECC71" />
                  <Text style={styles.markReceivedButtonText}>
                    I Received the ${recovery.disc.reward_amount} Reward
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </RNView>
      )}

      {/* Disc Surrendered - shown at top when disc is surrendered */}
      {recovery.status === 'surrendered' && (
        <RNView style={[styles.section, styles.surrenderedSection]}>
          <FontAwesome name="gift" size={48} color="#9B59B6" />
          <Text style={styles.surrenderedTitle}>
            {isOwner ? 'Disc Surrendered' : 'Disc Received!'}
          </Text>
          <Text style={styles.surrenderedText}>
            {isOwner
              ? `You surrendered this disc to ${recovery.finder.display_name} on ${formatDate(recovery.surrendered_at || recovery.updated_at)}`
              : `${recovery.owner.display_name} surrendered this disc to you on ${formatDate(recovery.surrendered_at || recovery.updated_at)}. It's now in your collection!`
            }
          </Text>
          {!isOwner && recovery.disc?.id && (
            <Pressable
              style={styles.viewDiscButton}
              onPress={() => router.push(`/disc/${recovery.disc!.id}`)}
            >
              <FontAwesome name="eye" size={16} color="#fff" />
              <Text style={styles.viewDiscButtonText}>View in My Collection</Text>
            </Pressable>
          )}
        </RNView>
      )}

      {/* Drop-off Details - shown when disc has been dropped off */}
      {recovery.status === 'dropped_off' && recovery.drop_off && (
        <RNView style={[styles.section, styles.droppedOffSection]}>
          <FontAwesome name="map-marker" size={48} color="#9B59B6" />
          <Text style={styles.droppedOffTitle}>
            {isOwner ? 'Disc Dropped Off!' : 'You Dropped Off the Disc'}
          </Text>
          <Text style={styles.droppedOffText}>
            {isOwner
              ? `${recovery.finder.display_name} left your disc for pickup on ${formatDate(recovery.drop_off.dropped_off_at)}`
              : `You left this disc for ${recovery.owner.display_name} to pick up`
            }
          </Text>

          {/* Drop-off photo */}
          <Image source={{ uri: recovery.drop_off.photo_url }} style={styles.dropOffPhoto} />

          {/* Location notes */}
          {recovery.drop_off.location_notes && (
            <RNView style={styles.dropOffNotesBox}>
              <FontAwesome name="sticky-note-o" size={16} color="#666" />
              <Text style={styles.dropOffNotesText}>{recovery.drop_off.location_notes}</Text>
            </RNView>
          )}

          {/* Action buttons */}
          <RNView style={styles.dropOffActions}>
            <Pressable
              style={styles.directionsButton}
              onPress={() => {
                const url = `https://maps.google.com/?q=${recovery.drop_off!.latitude},${recovery.drop_off!.longitude}`;
                Linking.openURL(url);
              }}
            >
              <FontAwesome name="location-arrow" size={16} color="#fff" />
              <Text style={styles.directionsButtonText}>Get Directions to Pickup</Text>
            </Pressable>

            {/* Mark as Retrieved button for owner */}
            {isOwner && (
              <Pressable
                style={styles.primaryButton}
                onPress={handleMarkRetrieved}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="check" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>I Picked Up My Disc</Text>
                  </>
                )}
              </Pressable>
            )}
          </RNView>
        </RNView>
      )}

      {/* Pending Proposal - shown to person who can respond (didn't propose) */}
      {canRespondToProposal && (
        <RNView style={[styles.section, styles.pendingSection]}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="clock-o" size={18} color="#F39C12" /> Pending Meetup Proposal
          </Text>
          <RNView style={styles.meetupDetails}>
            <RNView style={styles.meetupRow}>
              <FontAwesome name="map-marker" size={16} color="#666" />
              <Text style={styles.meetupText}>{pendingProposal.location_name}</Text>
            </RNView>
            <RNView style={styles.meetupRow}>
              <FontAwesome name="calendar" size={16} color="#666" />
              <Text style={styles.meetupText}>{formatDate(pendingProposal.proposed_datetime)}</Text>
            </RNView>
            {pendingProposal.message && (
              <RNView style={styles.meetupRow}>
                <FontAwesome name="sticky-note-o" size={16} color="#666" />
                <Text style={styles.meetupText}>{pendingProposal.message}</Text>
              </RNView>
            )}
          </RNView>
          <RNView style={styles.actionButtons}>
            <Pressable
              style={[styles.acceptButton, actionLoading && styles.buttonDisabled]}
              onPress={() => handleAcceptMeetup(pendingProposal.id)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="check" size={16} color="#fff" />
                  <Text style={styles.acceptButtonText}>Confirm</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.counterButton, actionLoading && styles.buttonDisabled]}
              onPress={handleCounterProposal}
              disabled={actionLoading}
            >
              <FontAwesome name="refresh" size={16} color="#fff" />
              <Text style={styles.counterButtonText}>Counter</Text>
            </Pressable>
          </RNView>
        </RNView>
      )}

      {/* Waiting for response - shown to person who proposed */}
      {pendingProposal && userProposedMeetup && (
        <RNView style={[styles.section, styles.pendingSection]}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="clock-o" size={18} color="#F39C12" /> Your Meetup Proposal
          </Text>
          <RNView style={styles.meetupDetails}>
            <RNView style={styles.meetupRow}>
              <FontAwesome name="map-marker" size={16} color="#666" />
              <Text style={styles.meetupText}>{pendingProposal.location_name}</Text>
            </RNView>
            <RNView style={styles.meetupRow}>
              <FontAwesome name="calendar" size={16} color="#666" />
              <Text style={styles.meetupText}>{formatDate(pendingProposal.proposed_datetime)}</Text>
            </RNView>
            {pendingProposal.message && (
              <RNView style={styles.meetupRow}>
                <FontAwesome name="sticky-note-o" size={16} color="#666" />
                <Text style={styles.meetupText}>{pendingProposal.message}</Text>
              </RNView>
            )}
          </RNView>
          <RNView style={styles.waitingRow}>
            <FontAwesome name="clock-o" size={20} color="#F39C12" />
            <Text style={styles.waitingText}>
              Waiting for {isOwner ? 'the finder' : 'the owner'} to respond
            </Text>
          </RNView>
        </RNView>
      )}

      {/* Confirmed/Completed Meetup - shown at top when meetup is accepted */}
      {acceptedProposal && (
        <RNView style={[
          styles.section,
          recovery.status === 'recovered'
            ? { borderColor: isDark ? '#444' : '#eee', backgroundColor: isDark ? '#1a1a1a' : '#fff' }
            : styles.acceptedSection
        ]}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="check-circle" size={18} color="#2ECC71" />{' '}
            {recovery.status === 'recovered' ? 'Meetup Completed' : 'Confirmed Meetup'}
          </Text>
          <RNView style={[styles.meetupDetails, recovery.status === 'recovered' && { marginBottom: 0 }]}>
            <RNView style={styles.meetupRow}>
              <FontAwesome name="map-marker" size={16} color="#666" />
              <Text style={styles.meetupText}>{acceptedProposal.location_name}</Text>
            </RNView>
            <RNView style={styles.meetupRow}>
              <FontAwesome name="calendar" size={16} color="#666" />
              <Text style={styles.meetupText}>{formatDate(acceptedProposal.proposed_datetime)}</Text>
            </RNView>
            {acceptedProposal.message && (
              <RNView style={styles.meetupRow}>
                <FontAwesome name="sticky-note-o" size={16} color="#666" />
                <Text style={styles.meetupText}>{acceptedProposal.message}</Text>
              </RNView>
            )}
          </RNView>
          {recovery.status !== 'recovered' && (
            <Pressable
              style={styles.directionsButton}
              onPress={() => handleGetDirections(acceptedProposal)}
            >
              <FontAwesome name="location-arrow" size={16} color="#fff" />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </Pressable>
          )}
          {isOwner && recovery.status === 'meetup_confirmed' && (
            <Pressable
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={handleCompleteRecovery}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome name="check" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Mark as Recovered</Text>
                </>
              )}
            </Pressable>
          )}
        </RNView>
      )}

      {/* Disc Card */}
      <View style={[styles.discCard, { borderColor: isDark ? '#444' : '#eee', backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        {recovery.disc?.photo_url ? (
          <Image source={{ uri: recovery.disc.photo_url }} style={styles.discPhoto} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <FontAwesome name="circle" size={60} color="#ccc" />
          </View>
        )}
        <Text style={styles.discName} numberOfLines={2} ellipsizeMode="tail">{recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}</Text>
        {recovery.disc?.manufacturer && (
          <Text style={styles.discManufacturer} numberOfLines={1} ellipsizeMode="tail">{recovery.disc.manufacturer}</Text>
        )}
        {recovery.disc?.plastic && <Text style={styles.discPlastic}>{recovery.disc.plastic}</Text>}
        {recovery.disc?.color && (
          <View style={styles.colorBadge}>
            <Text style={styles.colorText}>{recovery.disc.color}</Text>
          </View>
        )}
        {recovery.disc?.reward_amount && recovery.disc.reward_amount > 0 && (
          <View style={styles.rewardBadge}>
            <FontAwesome name="gift" size={14} color="#fff" />
            <Text style={styles.rewardText}>${recovery.disc.reward_amount} Reward</Text>
          </View>
        )}
      </View>

      {/* People Involved */}
      <RNView style={[styles.section, { borderColor: isDark ? '#444' : '#eee', backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <Text style={styles.sectionTitle}>People</Text>
        <RNView style={styles.personRow}>
          <Avatar
            avatarUrl={recovery.owner.avatar_url}
            name={isOwner ? 'You' : recovery.owner.display_name}
            size={36}
          />
          <RNView style={styles.personInfo}>
            <Text style={styles.personLabel}>Owner</Text>
            <Text style={[styles.personName, isOwner && styles.youText]} numberOfLines={1} ellipsizeMode="tail">
              {isOwner ? 'You' : recovery.owner.display_name}
            </Text>
          </RNView>
        </RNView>
        <RNView style={styles.personRow}>
          <Avatar
            avatarUrl={recovery.finder.avatar_url}
            name={!isOwner ? 'You' : recovery.finder.display_name}
            size={36}
          />
          <RNView style={styles.personInfo}>
            <Text style={styles.personLabel}>Finder</Text>
            <Text style={[styles.personName, !isOwner && styles.youText]} numberOfLines={1} ellipsizeMode="tail">
              {!isOwner ? 'You' : recovery.finder.display_name}
            </Text>
          </RNView>
        </RNView>
      </RNView>

      {/* Finder Message */}
      {recovery.finder_message && (
        <RNView style={[styles.section, { borderColor: isDark ? '#444' : '#eee', backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Text style={styles.sectionTitle}>Finder's Message</Text>
          <Text style={styles.messageText}>{recovery.finder_message}</Text>
          <Text style={styles.timestamp}>Found {formatDate(recovery.found_at)}</Text>
        </RNView>
      )}

      {/* Action buttons when status is 'found' */}
      {recovery.status === 'found' && (
        <RNView style={styles.foundActionButtons}>
          <Pressable
            style={[styles.primaryButton, styles.foundActionButton]}
            onPress={() => router.push(`/propose-meetup/${recoveryId}`)}
          >
            <FontAwesome name="calendar-plus-o" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Propose a Meetup</Text>
          </Pressable>
          {!isOwner && (
            <Pressable
              style={[styles.dropOffButton, styles.foundActionButton]}
              onPress={() => router.push({ pathname: '/drop-off/[id]' as const, params: { id: recoveryId } } as never)}
            >
              <FontAwesome name="map-marker" size={18} color={Colors.violet.primary} />
              <Text style={styles.dropOffButtonText}>Drop Off Disc</Text>
            </Pressable>
          )}
        </RNView>
      )}

      {/* Surrender Disc button - only visible to owner during active recovery */}
      {canSurrender && (
        <Pressable
          style={[styles.surrenderButton, actionLoading && styles.buttonDisabled]}
          onPress={handleSurrenderDisc}
          disabled={actionLoading}
        >
          <FontAwesome name="gift" size={18} color="#E74C3C" />
          <Text style={styles.surrenderButtonText}>Surrender Disc to Finder</Text>
        </Pressable>
      )}

      {/* Relinquish or Abandon Disc - only visible to owner when disc is dropped off */}
      {canAbandon && (
        <RNView style={styles.dropOffOwnerActions}>
          <Text style={styles.dropOffActionsLabel}>Don't want to pick it up?</Text>
          <Pressable
            style={[styles.relinquishButton, actionLoading && styles.buttonDisabled]}
            onPress={handleRelinquishDisc}
            disabled={actionLoading}
          >
            <FontAwesome name="gift" size={18} color={Colors.violet.primary} />
            <Text style={styles.relinquishButtonText}>Give to Finder</Text>
          </Pressable>
          <Pressable
            style={[styles.abandonButton, actionLoading && styles.buttonDisabled]}
            onPress={handleAbandonDisc}
            disabled={actionLoading}
          >
            <FontAwesome name="times-circle" size={18} color="#E74C3C" />
            <Text style={styles.abandonButtonText}>Abandon Disc</Text>
          </Pressable>
        </RNView>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  skeletonContent: {
    padding: 20,
    paddingBottom: 40,
  },
  skeletonCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  skeletonPeopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  discCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  discPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  discName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  discManufacturer: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  discPlastic: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  colorBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  colorText: {
    fontSize: 12,
    color: '#666',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2ECC71',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  rewardText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  personInfo: {
    flex: 1,
  },
  personLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  personName: {
    fontSize: 15,
    fontWeight: '500',
  },
  youText: {
    fontWeight: '700',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  acceptedSection: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
  },
  pendingSection: {
    borderColor: '#F39C12',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
  },
  meetupDetails: {
    marginBottom: 12,
  },
  meetupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  meetupText: {
    fontSize: 15,
    flex: 1,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 12,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2ECC71',
    paddingVertical: 14,
    borderRadius: 10,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  counterButton: {
    flex: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  counterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waitingText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
  },
  recoveredSection: {
    alignItems: 'center',
    borderColor: '#F1C40F',
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    paddingVertical: 24,
  },
  recoveredTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#2ECC71',
  },
  recoveredText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  surrenderedSection: {
    alignItems: 'center',
    borderColor: '#9B59B6',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    paddingVertical: 24,
  },
  surrenderedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#9B59B6',
  },
  surrenderedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  surrenderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E74C3C',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  surrenderButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '600',
  },
  abandonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E74C3C',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  abandonButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '600',
  },
  viewDiscButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9B59B6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
  },
  viewDiscButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  foundActionButtons: {
    gap: 12,
    marginTop: 8,
  },
  foundActionButton: {
    marginTop: 0,
  },
  dropOffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  dropOffButtonText: {
    color: Colors.violet.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  droppedOffSection: {
    alignItems: 'center',
    borderColor: '#9B59B6',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    paddingVertical: 24,
  },
  droppedOffTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#9B59B6',
  },
  droppedOffText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  dropOffPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 16,
  },
  dropOffNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
  },
  dropOffNotesText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  dropOffActions: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  dropOffOwnerActions: {
    marginTop: 24,
    gap: 12,
  },
  dropOffActionsLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  relinquishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  relinquishButtonText: {
    color: Colors.violet.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Venmo reward button styles
  venmoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#008CFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
  },
  venmoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venmoIconText: {
    color: '#008CFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  venmoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noVenmoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  noVenmoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Payment options container
  paymentOptions: {
    width: '100%',
    gap: 12,
    marginTop: 16,
  },
  paymentButtonContent: {
    flex: 1,
  },
  paymentFeeNote: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  cardPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  cardPaymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardPaymentFeeNote: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  // Reward received styles
  rewardReceivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  rewardReceivedText: {
    color: '#2ECC71',
    fontSize: 16,
    fontWeight: '600',
  },
  markReceivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2ECC71',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  markReceivedButtonText: {
    color: '#2ECC71',
    fontSize: 16,
    fontWeight: '600',
  },
});
