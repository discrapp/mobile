import { useState, useEffect, useCallback } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { Avatar } from '@/components/Avatar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/components/useColorScheme';

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

interface RecoveryDetails {
  id: string;
  status: 'found' | 'meetup_proposed' | 'meetup_confirmed' | 'recovered' | 'cancelled';
  finder_message?: string;
  found_at: string;
  recovered_at?: string;
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
  };
  finder: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  };
  meetup_proposals: MeetupProposal[];
}

export default function RecoveryDetailScreen() {
  const { id: recoveryId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [recovery, setRecovery] = useState<RecoveryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Subscribe to real-time updates for this recovery event
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recoveryId, fetchRecoveryDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecoveryDetails();
  };

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

      Alert.alert('Success', 'Meetup accepted! The finder has been notified.');
      fetchRecoveryDetails();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept meetup');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineMeetup = async (proposalId: string) => {
    Alert.alert(
      'Decline Meetup',
      'Are you sure you want to decline this meetup proposal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement decline-meetup endpoint
            Alert.alert('Info', 'Decline functionality coming soon');
          },
        },
      ]
    );
  };

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

              Alert.alert('Success', 'Your disc has been marked as recovered!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete recovery');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleGetDirections = (proposal: MeetupProposal) => {
    if (proposal.latitude && proposal.longitude) {
      const url = `https://maps.google.com/?q=${proposal.latitude},${proposal.longitude}`;
      Linking.openURL(url);
    } else {
      const url = `https://maps.google.com/?q=${encodeURIComponent(proposal.location_name)}`;
      Linking.openURL(url);
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'found':
        return { label: 'Disc Found', color: '#F39C12', icon: 'search' as const };
      case 'meetup_proposed':
        return { label: 'Meetup Proposed', color: '#3498DB', icon: 'calendar' as const };
      case 'meetup_confirmed':
        return { label: 'Meetup Confirmed', color: '#2ECC71', icon: 'check-circle' as const };
      case 'recovered':
        return { label: 'Recovered', color: '#27AE60', icon: 'check' as const };
      case 'cancelled':
        return { label: 'Cancelled', color: '#E74C3C', icon: 'times' as const };
      default:
        return { label: status, color: '#95A5A6', icon: 'question' as const };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
        <Text style={styles.loadingText}>Loading recovery details...</Text>
      </View>
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
              onPress={() => handleDeclineMeetup(pendingProposal.id)}
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
        <Text style={styles.discName}>{recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}</Text>
        {recovery.disc?.manufacturer && (
          <Text style={styles.discManufacturer}>{recovery.disc.manufacturer}</Text>
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
            <Text style={[styles.personName, isOwner && styles.youText]}>
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
            <Text style={[styles.personName, !isOwner && styles.youText]}>
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

      {/* Propose Meetup button - available to both owner and finder when status is 'found' */}
      {recovery.status === 'found' && (
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push(`/propose-meetup/${recoveryId}`)}
        >
          <FontAwesome name="calendar-plus-o" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Propose a Meetup</Text>
        </Pressable>
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
});
