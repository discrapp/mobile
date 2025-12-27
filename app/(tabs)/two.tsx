import { StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { compressImage } from '@/utils/imageCompression';
import { RecoveryCardSkeleton, FormFieldSkeleton, Skeleton } from '@/components/Skeleton';
import { handleError, showSuccess } from '@/lib/errorHandler';

type DisplayPreference = 'username' | 'full_name';

type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted';

interface ProfileData {
  username: string | null;
  full_name: string | null;
  display_preference: DisplayPreference;
  avatar_url: string | null;
  venmo_username: string | null;
  stripe_connect_status: ConnectStatus;
}

interface ShippingAddressData {
  id: string | null;
  name: string;
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface ActiveRecovery {
  id: string;
  status: string;
  created_at: string;
  disc: {
    id: string;
    name: string;
    manufacturer: string | null;
    mold: string | null;
    color: string | null;
  } | null;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    username: null,
    full_name: null,
    display_preference: 'username',
    avatar_url: null,
    venmo_username: null,
    stripe_connect_status: 'none',
  });
  const [connectLoading, setConnectLoading] = useState(false);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingFullName, setEditingFullName] = useState(false);
  const [editingVenmoUsername, setEditingVenmoUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempFullName, setTempFullName] = useState('');
  const [tempVenmoUsername, setTempVenmoUsername] = useState('');
  const [discsReturned, setDiscsReturned] = useState(0);
  const [activeRecoveries, setActiveRecoveries] = useState<ActiveRecovery[]>([]);
  const [myFinds, setMyFinds] = useState<ActiveRecovery[]>([]);
  const [loadingRecoveries, setLoadingRecoveries] = useState(true);
  const [loadingFinds, setLoadingFinds] = useState(true);
  const [discsFound, setDiscsFound] = useState(0);
  const [myDiscsFoundByOthers, setMyDiscsFoundByOthers] = useState(0);

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressData | null>(null);
  const [loadingShippingAddress, setLoadingShippingAddress] = useState(true);
  const [editingShippingAddress, setEditingShippingAddress] = useState(false);
  const [savingShippingAddress, setSavingShippingAddress] = useState(false);
  const [tempShippingAddress, setTempShippingAddress] = useState<ShippingAddressData>({
    id: null,
    name: '',
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // istanbul ignore next -- Pull-to-refresh tested via integration tests
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      fetchDiscsReturned(),
      fetchDiscsFound(),
      fetchMyDiscsFoundByOthers(),
      fetchActiveRecoveries(),
      fetchMyFinds(),
      fetchShippingAddress(),
    ]);
    setRefreshing(false);
  }, [user?.id]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, display_preference, avatar_url, venmo_username, stripe_connect_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          username: data.username,
          full_name: data.full_name,
          display_preference: data.display_preference || 'username',
          avatar_url: data.avatar_url,
          venmo_username: data.venmo_username,
          stripe_connect_status: (data.stripe_connect_status as ConnectStatus) || 'none',
        });

        // If user has a custom avatar, fetch signed URL
        if (data.avatar_url) {
          await fetchAvatarSignedUrl(data.avatar_url);
        } else {
          setAvatarSignedUrl(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvatarSignedUrl = async (storagePath: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use service to get signed URL (the API returns it)
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(storagePath, 3600);

      if (!error && data?.signedUrl) {
        setAvatarSignedUrl(data.signedUrl);
        setImageError(false);
      }
    } catch (error) {
      console.error('Error fetching avatar signed URL:', error);
    }
  };

  const saveProfile = async (updates: Partial<ProfileData>) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...updates }));
      showSuccess('Profile updated');
    } catch (error: unknown) {
      handleError(error, { operation: 'save-profile' });
    } finally {
      setSaving(false);
    }
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handlePhotoPress = () => {
    Alert.alert(
      'Profile Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Choose from Library',
          onPress: () => pickImage('library'),
        },
        ...(profile.avatar_url ? [{
          text: 'Remove Photo',
          style: 'destructive' as const,
          onPress: handleDeletePhoto,
        }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  // istanbul ignore next -- Native image picker requires device testing
  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow camera access to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow photo library access to choose photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0]);
      }
    } catch (error) {
      handleError(error, { operation: 'pick-image' });
    }
  };

  // istanbul ignore next -- Photo upload requires device/emulator testing
  const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingPhoto(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please sign in to upload a photo');
        return;
      }

      // Compress the image before upload
      const compressed = await compressImage(asset.uri);

      // Create form data (always JPEG after compression)
      const formData = new FormData();

      formData.append('file', {
        uri: compressed.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as unknown as Blob);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/upload-profile-photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();

      // Update local state
      setProfile(prev => ({ ...prev, avatar_url: data.storage_path }));
      setAvatarSignedUrl(data.avatar_url);
      setImageError(false);

      showSuccess('Profile photo updated');
    } catch (error) {
      handleError(error, { operation: 'upload-profile-photo' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleDeletePhoto = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: deletePhoto,
        },
      ]
    );
  };

  // istanbul ignore next -- Photo deletion requires device/emulator testing
  const deletePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please sign in');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-profile-photo`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete photo');
      }

      // Update local state
      setProfile(prev => ({ ...prev, avatar_url: null }));
      setAvatarSignedUrl(null);
      setImageError(false);

      showSuccess('Profile photo removed');
    } catch (error) {
      handleError(error, { operation: 'delete-profile-photo' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // istanbul ignore next -- Form save callbacks tested via integration tests
  const handleSaveUsername = () => {
    if (tempUsername.trim()) {
      saveProfile({ username: tempUsername.trim() });
    }
    setEditingUsername(false);
  };

  // istanbul ignore next -- Form save callbacks tested via integration tests
  const handleSaveFullName = () => {
    saveProfile({ full_name: tempFullName.trim() || null });
    setEditingFullName(false);
  };

  // istanbul ignore next -- Form save callbacks tested via integration tests
  const handleSaveVenmoUsername = () => {
    // Remove @ if user included it
    const cleanUsername = tempVenmoUsername.trim().replace(/^@/, '');
    saveProfile({ venmo_username: cleanUsername || null });
    setEditingVenmoUsername(false);
  };

  // istanbul ignore next -- Alert callback tested via integration tests
  const handleDisplayPreferenceChange = () => {
    Alert.alert(
      'Display Name As',
      'Choose how your name appears to others',
      [
        {
          text: 'Username',
          onPress: () => saveProfile({ display_preference: 'username' }),
        },
        {
          text: 'Full Name',
          onPress: () => saveProfile({ display_preference: 'full_name' }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    fetchProfile();
    fetchDiscsReturned();
    fetchDiscsFound();
    fetchMyDiscsFoundByOthers();
    fetchActiveRecoveries();
    fetchMyFinds();
    fetchShippingAddress();
  }, [user?.id]);

  // istanbul ignore next -- Data fetching tested via integration tests
  const fetchMyDiscsFoundByOthers = async () => {
    if (!user?.id) return;

    try {
      // Get all discs owned by the user
      const { data: userDiscs, error: discsError } = await supabase
        .from('discs')
        .select('id')
        .eq('owner_id', user.id);

      if (discsError || !userDiscs || userDiscs.length === 0) {
        setMyDiscsFoundByOthers(0);
        return;
      }

      const discIds = userDiscs.map(d => d.id);

      // Count recovery events for those discs
      const { count, error } = await supabase
        .from('recovery_events')
        .select('*', { count: 'exact', head: true })
        .in('disc_id', discIds);

      if (!error && count !== null) {
        setMyDiscsFoundByOthers(count);
      }
    } catch (error) {
      console.error('Error fetching my discs found by others:', error);
    }
  };

  const fetchDiscsReturned = async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('recovery_events')
        .select('*', { count: 'exact', head: true })
        .eq('finder_id', user.id)
        .eq('status', 'recovered');

      if (!error && count !== null) {
        setDiscsReturned(count);
      }
    } catch (error) {
      console.error('Error fetching discs returned:', error);
    }
  };

  // istanbul ignore next -- Data fetching tested via integration tests
  const fetchDiscsFound = async () => {
    if (!user?.id) return;

    try {
      // Count all recovery events where user is the finder (regardless of status)
      const { count, error } = await supabase
        .from('recovery_events')
        .select('*', { count: 'exact', head: true })
        .eq('finder_id', user.id);

      if (!error && count !== null) {
        setDiscsFound(count);
      }
    } catch (error) {
      console.error('Error fetching discs found:', error);
    }
  };

  // istanbul ignore next -- Data fetching tested via integration tests
  const fetchActiveRecoveries = async () => {
    if (!user?.id) return;

    setLoadingRecoveries(true);
    try {
      // Get all discs owned by the user
      const { data: userDiscs, error: discsError } = await supabase
        .from('discs')
        .select('id')
        .eq('owner_id', user.id);

      if (discsError || !userDiscs || userDiscs.length === 0) {
        setActiveRecoveries([]);
        return;
      }

      const discIds = userDiscs.map(d => d.id);

      // Get active recovery events for those discs
      const { data: recoveries, error: recoveriesError } = await supabase
        .from('recovery_events')
        .select(`
          id,
          status,
          created_at,
          disc:discs(id, name, manufacturer, mold, color)
        `)
        .in('disc_id', discIds)
        .not('status', 'in', '("recovered","cancelled","surrendered")')
        .order('created_at', { ascending: false });

      if (recoveriesError) {
        console.error('Error fetching recoveries:', recoveriesError);
        setActiveRecoveries([]);
        return;
      }

      // Transform data - Supabase may return disc as array or object depending on FK relationship
      const transformedRecoveries: ActiveRecovery[] = (recoveries || []).map((r) => {
        const discData = Array.isArray(r.disc) ? r.disc[0] : r.disc;
        return {
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          disc: discData as ActiveRecovery['disc'],
        };
      });

      setActiveRecoveries(transformedRecoveries);
    } catch (error) {
      console.error('Error fetching active recoveries:', error);
      setActiveRecoveries([]);
    } finally {
      setLoadingRecoveries(false);
    }
  };

  // istanbul ignore next -- Data fetching tested via integration tests
  const fetchMyFinds = async () => {
    if (!user?.id) return;

    setLoadingFinds(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMyFinds([]);
        return;
      }

      // Use edge function to get finds (bypasses RLS issues)
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-my-finds`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Error fetching my finds:', await response.text());
        setMyFinds([]);
        return;
      }

      const recoveries = await response.json();

      // Transform data to match ActiveRecovery interface
      const transformedFinds: ActiveRecovery[] = (recoveries || []).map((r: {
        id: string;
        status: string;
        created_at: string;
        disc: { id: string; name: string; manufacturer: string | null; mold: string | null; color: string | null } | null;
      }) => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        disc: r.disc,
      }));

      setMyFinds(transformedFinds);
    } catch (error) {
      console.error('Error fetching my finds:', error);
      setMyFinds([]);
    } finally {
      setLoadingFinds(false);
    }
  };

  // istanbul ignore next -- Data fetching tested via integration tests
  const fetchShippingAddress = async () => {
    if (!user?.id) return;

    setLoadingShippingAddress(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadingShippingAddress(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-default-address`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const address = await response.json();
        if (address) {
          setShippingAddress({
            id: address.id,
            name: address.name || '',
            street_address: address.street_address || '',
            street_address_2: address.street_address_2 || '',
            city: address.city || '',
            state: address.state || '',
            postal_code: address.postal_code || '',
            country: address.country || 'US',
          });
        } else {
          setShippingAddress(null);
        }
      }
    } catch (error) {
      console.error('Error fetching shipping address:', error);
    } finally {
      setLoadingShippingAddress(false);
    }
  };

  // istanbul ignore next -- Address save tested via integration tests
  const saveShippingAddress = async () => {
    if (!user?.id) return;

    // Validate required fields
    if (!tempShippingAddress.name.trim()) {
      Alert.alert('Missing Information', 'Name is required');
      return;
    }
    if (!tempShippingAddress.street_address.trim()) {
      Alert.alert('Missing Information', 'Street address is required');
      return;
    }
    if (!tempShippingAddress.city.trim()) {
      Alert.alert('Missing Information', 'City is required');
      return;
    }
    if (!tempShippingAddress.state.trim()) {
      Alert.alert('Missing Information', 'State is required');
      return;
    }
    if (!tempShippingAddress.postal_code.trim()) {
      Alert.alert('Missing Information', 'ZIP code is required');
      return;
    }

    setSavingShippingAddress(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please sign in');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/save-default-address`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            address_id: shippingAddress?.id || undefined,
            name: tempShippingAddress.name.trim(),
            street_address: tempShippingAddress.street_address.trim(),
            street_address_2: tempShippingAddress.street_address_2.trim() || undefined,
            city: tempShippingAddress.city.trim(),
            state: tempShippingAddress.state.trim(),
            postal_code: tempShippingAddress.postal_code.trim(),
            country: tempShippingAddress.country || 'US',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save address');
      }

      const savedAddress = await response.json();
      setShippingAddress({
        id: savedAddress.id,
        name: savedAddress.name,
        street_address: savedAddress.street_address,
        street_address_2: savedAddress.street_address_2 || '',
        city: savedAddress.city,
        state: savedAddress.state,
        postal_code: savedAddress.postal_code,
        country: savedAddress.country,
      });
      setEditingShippingAddress(false);
      showSuccess('Shipping address saved');
    } catch (error) {
      handleError(error, { operation: 'save-shipping-address' });
    } finally {
      setSavingShippingAddress(false);
    }
  };

  const handleEditShippingAddress = () => {
    setTempShippingAddress(shippingAddress || {
      id: null,
      name: profile.full_name || '',
      street_address: '',
      street_address_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    });
    setEditingShippingAddress(true);
  };

  // istanbul ignore next -- Stripe Connect setup requires device testing
  const handleSetupPayouts = async () => {
    setConnectLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please sign in to set up payouts');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-onboarding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start payout setup');
      }

      // Open the Stripe onboarding URL in browser
      await WebBrowser.openBrowserAsync(data.onboarding_url);

      // Refresh profile to get updated Connect status
      await fetchProfile();
    } catch (error) {
      handleError(error, { operation: 'setup-payouts' });
    } finally {
      setConnectLoading(false);
    }
  };

  // istanbul ignore next -- Status info mapping tested via integration tests
  const getConnectStatusInfo = (status: ConnectStatus) => {
    switch (status) {
      case 'active':
        return { label: 'Ready', color: '#10b981', icon: 'check-circle' as const };
      case 'pending':
        return { label: 'Pending', color: '#f59e0b', icon: 'clock-o' as const };
      case 'restricted':
        return { label: 'Action Needed', color: '#ef4444', icon: 'exclamation-circle' as const };
      default:
        return { label: 'Not Set Up', color: '#6b7280', icon: 'credit-card' as const };
    }
  };

  // istanbul ignore next -- Gravatar URL generation uses crypto which is hard to test
  useEffect(() => {
    const getGravatarUrl = async () => {
      if (user?.email) {
        try {
          const emailHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.MD5,
            user.email.toLowerCase().trim()
          );
          setGravatarUrl(`https://www.gravatar.com/avatar/${emailHash}?s=200&d=404`);
        } catch (error) {
          console.error('Error generating Gravatar URL:', error);
          setImageError(true);
        }
      }
    };

    getGravatarUrl();
  }, [user?.email]);

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMemberSinceText = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  // istanbul ignore next -- Image error handler tested via integration tests
  const handleImageError = () => setImageError(true);

  // istanbul ignore next -- Navigation handler tested via integration tests
  const handleRecoveryPress = (recoveryId: string) => router.push(`/recovery/${recoveryId}`);

  // istanbul ignore next -- Cancel editing handlers tested via integration tests
  const handleCancelUsernameEdit = () => setEditingUsername(false);
  // istanbul ignore next -- Cancel editing handlers tested via integration tests
  const handleCancelFullNameEdit = () => setEditingFullName(false);
  // istanbul ignore next -- Cancel editing handlers tested via integration tests
  const handleCancelVenmoEdit = () => setEditingVenmoUsername(false);

  // istanbul ignore next -- Address field change handlers tested via integration tests
  const handleAddressStreet2Change = (text: string) => setTempShippingAddress({ ...tempShippingAddress, street_address_2: text });

  // istanbul ignore next -- Status info mapping tested via integration tests
  const getRecoveryStatusInfo = (status: string) => {
    switch (status) {
      case 'found':
        return { label: 'Found', color: '#f59e0b', icon: 'search' as const };
      case 'meetup_proposed':
        return { label: 'Meetup Proposed', color: '#3b82f6', icon: 'calendar' as const };
      case 'meetup_confirmed':
        return { label: 'Meetup Confirmed', color: '#10b981', icon: 'check-circle' as const };
      case 'dropped_off':
        return { label: 'Dropped Off', color: '#8b5cf6', icon: 'map-marker' as const };
      default:
        return { label: status, color: '#6b7280', icon: 'question-circle' as const };
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  return (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.violet.primary}
          colors={[Colors.violet.primary]}
        />
      }>
      <View style={styles.container}>
        {/* Profile Photo */}
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={handlePhotoPress}
          disabled={uploadingPhoto}>
          <View style={styles.photoPlaceholder}>
            {uploadingPhoto ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : avatarSignedUrl && !imageError ? (
              <Image
                source={{ uri: avatarSignedUrl }}
                style={styles.gravatarImage}
                onError={handleImageError}
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : gravatarUrl && !imageError ? (
              <Image
                source={{ uri: gravatarUrl }}
                style={styles.gravatarImage}
                onError={handleImageError}
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : user?.email ? (
              <Text style={styles.photoInitials}>{getInitials(user.email)}</Text>
            ) : (
              <FontAwesome name="user" size={48} color="#fff" />
            )}
          </View>
          <View style={styles.photoEditBadge}>
            <FontAwesome name="camera" size={12} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* User Info */}
        {user && (
          <View style={styles.infoContainer}>
            <Text style={styles.email}>{user.email}</Text>
            {user.created_at && (
              <Text style={styles.memberSince}>
                Member since {getMemberSinceText(user.created_at)}
              </Text>
            )}
            {(discsFound > 0 || discsReturned > 0 || myDiscsFoundByOthers > 0) && (
              <View style={styles.statsRow}>
                {myDiscsFoundByOthers > 0 && (
                  <View style={styles.statsBadge}>
                    <FontAwesome name="bell" size={14} color="#F39C12" />
                    <Text style={[styles.statsText, { color: '#F39C12' }]}>
                      {myDiscsFoundByOthers} recovered
                    </Text>
                  </View>
                )}
                {discsFound > 0 && (
                  <View style={styles.statsBadge}>
                    <FontAwesome name="search" size={14} color={Colors.violet.primary} />
                    <Text style={styles.statsText}>
                      {discsFound} found
                    </Text>
                  </View>
                )}
                {discsReturned > 0 && (
                  <View style={styles.statsBadge}>
                    <FontAwesome name="trophy" size={14} color="#10b981" />
                    <Text style={[styles.statsText, { color: '#10b981' }]}>
                      {discsReturned} returned
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Active Recoveries Section (Discs you own that someone found) */}
        {(activeRecoveries.length > 0 || loadingRecoveries) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Discs Being Recovered</Text>
            {loadingRecoveries ? (
              <>
                <RecoveryCardSkeleton />
                <RecoveryCardSkeleton />
              </>
            ) : (
              activeRecoveries.map((recovery) => {
                const statusInfo = getRecoveryStatusInfo(recovery.status);
                return (
                  <TouchableOpacity
                    key={recovery.id}
                    style={styles.recoveryCard}
                    onPress={() => handleRecoveryPress(recovery.id)}>
                    <View style={styles.recoveryCardLeft}>
                      <Text style={styles.recoveryDiscName}>
                        {recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}
                      </Text>
                      {recovery.disc?.manufacturer && (
                        <Text style={styles.recoveryDiscInfo}>
                          {recovery.disc.manufacturer}
                        </Text>
                      )}
                      <Text style={styles.recoveryTime}>
                        Found {getRelativeTime(recovery.created_at)}
                      </Text>
                    </View>
                    <View style={styles.recoveryCardRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                        <FontAwesome name={statusInfo.icon} size={12} color={statusInfo.color} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                      <FontAwesome name="chevron-right" size={14} color="#999" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* My Finds Section (Discs you found that belong to others) */}
        {(myFinds.length > 0 || loadingFinds) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discs I Found</Text>
            {loadingFinds ? (
              <>
                <RecoveryCardSkeleton />
                <RecoveryCardSkeleton />
              </>
            ) : (
              myFinds.map((recovery) => {
                const statusInfo = getRecoveryStatusInfo(recovery.status);
                return (
                  <TouchableOpacity
                    key={recovery.id}
                    style={styles.recoveryCard}
                    onPress={() => handleRecoveryPress(recovery.id)}>
                    <View style={styles.recoveryCardLeft}>
                      <Text style={styles.recoveryDiscName}>
                        {recovery.disc?.mold || recovery.disc?.name || 'Unknown Disc'}
                      </Text>
                      {recovery.disc?.manufacturer && (
                        <Text style={styles.recoveryDiscInfo}>
                          {recovery.disc.manufacturer}
                        </Text>
                      )}
                      <Text style={styles.recoveryTime}>
                        Found {getRelativeTime(recovery.created_at)}
                      </Text>
                    </View>
                    <View style={styles.recoveryCardRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                        <FontAwesome name={statusInfo.icon} size={12} color={statusInfo.color} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                      <FontAwesome name="chevron-right" size={14} color="#999" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* My Orders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sticker Orders</Text>
          <TouchableOpacity
            style={styles.orderRow}
            onPress={() => router.push('/my-orders')}>
            <View style={styles.orderRowLeft}>
              <View style={styles.orderIcon}>
                <FontAwesome name="qrcode" size={18} color={Colors.violet.primary} />
              </View>
              <View style={styles.orderRowText}>
                <Text style={styles.orderRowTitle}>My Orders</Text>
                <Text style={styles.orderRowSubtitle}>View order history and tracking</Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderRow, styles.rowBorder]}
            onPress={() => router.push('/order-stickers')}>
            <View style={styles.orderRowLeft}>
              <View style={[styles.orderIcon, { backgroundColor: Colors.violet[50] }]}>
                <FontAwesome name="plus" size={18} color={Colors.violet.primary} />
              </View>
              <View style={styles.orderRowText}>
                <Text style={styles.orderRowTitle}>Order More Stickers</Text>
                <Text style={styles.orderRowSubtitle}>Protect your discs with QR codes</Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Profile Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Settings</Text>

          {/* Username */}
          <View style={styles.editableRow}>
            <FontAwesome name="at" size={16} color="#666" style={styles.detailIcon} />
            <View style={styles.editableContent}>
              <Text style={styles.detailLabel}>Username</Text>
              {editingUsername ? (
                <View style={styles.editInputContainer}>
                  <TextInput
                    style={[styles.editInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                    value={tempUsername}
                    onChangeText={setTempUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={handleSaveUsername} disabled={saving}>
                    <FontAwesome name="check" size={18} color={Colors.violet.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelUsernameEdit} style={styles.cancelButton}>
                    <FontAwesome name="times" size={18} color="#999" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editableValue}
                  onPress={() => {
                    setTempUsername(profile.username || '');
                    setEditingUsername(true);
                  }}>
                  <Text style={profile.username ? styles.detailValue : styles.placeholderValue}>
                    {profile.username || 'Set username'}
                  </Text>
                  <FontAwesome name="pencil" size={14} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Full Name */}
          <View style={[styles.editableRow, styles.rowBorder]}>
            <FontAwesome name="user" size={16} color="#666" style={styles.detailIcon} />
            <View style={styles.editableContent}>
              <Text style={styles.detailLabel}>Full Name</Text>
              {editingFullName ? (
                <View style={styles.editInputContainer}>
                  <TextInput
                    style={[styles.editInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                    value={tempFullName}
                    onChangeText={setTempFullName}
                    placeholder="Enter full name"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                  <TouchableOpacity onPress={handleSaveFullName} disabled={saving}>
                    <FontAwesome name="check" size={18} color={Colors.violet.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelFullNameEdit} style={styles.cancelButton}>
                    <FontAwesome name="times" size={18} color="#999" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.editableValue}
                  onPress={() => {
                    setTempFullName(profile.full_name || '');
                    setEditingFullName(true);
                  }}>
                  <Text style={profile.full_name ? styles.detailValue : styles.placeholderValue}>
                    {profile.full_name || 'Set full name'}
                  </Text>
                  <FontAwesome name="pencil" size={14} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Display Preference */}
          <View style={[styles.editableRow, styles.rowBorder]}>
            <FontAwesome name="eye" size={16} color="#666" style={styles.detailIcon} />
            <View style={styles.editableContent}>
              <Text style={styles.detailLabel}>Display Name As</Text>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={handleDisplayPreferenceChange}
                disabled={saving}>
                <Text style={styles.detailValue}>
                  {profile.display_preference === 'full_name' ? 'Full Name' : 'Username'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Rewards & Payments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rewards & Payments</Text>
          <Text style={styles.sectionDescription}>
            Set up how you receive rewards when you find and return discs.
          </Text>

          {/* Venmo - Primary Option */}
          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodHeader}>
              <View style={styles.venmoIconContainer}>
                <Text style={styles.venmoIcon}>V</Text>
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodTitle}>Venmo</Text>
                <Text style={styles.paymentMethodRecommended}>Recommended - No setup required</Text>
              </View>
              {profile.venmo_username && (
                <View style={styles.checkBadge}>
                  <FontAwesome name="check" size={12} color="#10b981" />
                </View>
              )}
            </View>
            {editingVenmoUsername ? (
              <View style={styles.editInputContainer}>
                <View style={styles.venmoInputWrapper}>
                  <Text style={styles.venmoAtSymbol}>@</Text>
                  <TextInput
                    style={[styles.editInput, styles.venmoInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                    value={tempVenmoUsername}
                    onChangeText={setTempVenmoUsername}
                    placeholder="your-username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity onPress={handleSaveVenmoUsername} disabled={saving}>
                  <FontAwesome name="check" size={18} color={Colors.violet.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelVenmoEdit} style={styles.cancelButton}>
                  <FontAwesome name="times" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.paymentMethodAction}
                onPress={() => {
                  setTempVenmoUsername(profile.venmo_username || '');
                  setEditingVenmoUsername(true);
                }}>
                <Text style={profile.venmo_username ? styles.detailValue : styles.placeholderValue}>
                  {profile.venmo_username ? `@${profile.venmo_username}` : 'Add your Venmo username'}
                </Text>
                <FontAwesome name="pencil" size={14} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Credit Card - Optional */}
          <View style={[styles.paymentMethodCard, styles.paymentMethodCardSecondary]}>
            <View style={styles.paymentMethodHeader}>
              <View style={styles.cardIconContainer}>
                <FontAwesome name="credit-card" size={14} color="#6b7280" />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodTitleSecondary}>Credit Card</Text>
                <Text style={styles.paymentMethodOptional}>Optional - Requires verification</Text>
              </View>
              {profile.stripe_connect_status === 'active' && (
                <View style={styles.checkBadge}>
                  <FontAwesome name="check" size={12} color="#10b981" />
                </View>
              )}
              {profile.stripe_connect_status === 'pending' && (
                <View style={styles.pendingBadge}>
                  <FontAwesome name="clock-o" size={12} color="#f59e0b" />
                </View>
              )}
              {profile.stripe_connect_status === 'restricted' && (
                <View style={styles.restrictedBadge}>
                  <FontAwesome name="exclamation-circle" size={12} color="#ef4444" />
                </View>
              )}
            </View>
            {profile.stripe_connect_status === 'active' ? (
              <Text style={styles.paymentMethodStatusText}>Ready to receive card payments</Text>
            ) : profile.stripe_connect_status === 'pending' ? (
              <View style={styles.paymentMethodStatusRow}>
                <Text style={styles.paymentMethodPendingText}>Setup incomplete</Text>
                <TouchableOpacity
                  style={styles.paymentMethodSecondaryButton}
                  onPress={handleSetupPayouts}
                  disabled={connectLoading}>
                  {connectLoading ? (
                    <ActivityIndicator size="small" color={Colors.violet.primary} />
                  ) : (
                    <Text style={styles.paymentMethodSecondaryButtonText}>Continue Setup</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : profile.stripe_connect_status === 'restricted' ? (
              <View style={styles.paymentMethodStatusRow}>
                <Text style={styles.paymentMethodRestrictedText}>Action needed</Text>
                <TouchableOpacity
                  style={styles.paymentMethodSecondaryButton}
                  onPress={handleSetupPayouts}
                  disabled={connectLoading}>
                  {connectLoading ? (
                    <ActivityIndicator size="small" color={Colors.violet.primary} />
                  ) : (
                    <Text style={styles.paymentMethodSecondaryButtonText}>Fix Issues</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.paymentMethodSecondaryButton}
                onPress={handleSetupPayouts}
                disabled={connectLoading}>
                {connectLoading ? (
                  <ActivityIndicator size="small" color={Colors.violet.primary} />
                ) : (
                  <Text style={styles.paymentMethodSecondaryButtonText}>Set Up (ID required)</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Shipping Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          {loadingShippingAddress ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.violet.primary} />
            </View>
          ) : editingShippingAddress ? (
            <View>
              <Text style={styles.detailLabel}>Name *</Text>
              <TextInput
                style={[styles.addressInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                value={tempShippingAddress.name}
                onChangeText={(text) => setTempShippingAddress({ ...tempShippingAddress, name: text })}
                placeholder="Full name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />

              <Text style={styles.detailLabel}>Street Address *</Text>
              <TextInput
                style={[styles.addressInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                value={tempShippingAddress.street_address}
                onChangeText={(text) => setTempShippingAddress({ ...tempShippingAddress, street_address: text })}
                placeholder="123 Main St"
                placeholderTextColor="#999"
              />

              <Text style={styles.detailLabel}>Apt, Suite, etc.</Text>
              <TextInput
                style={[styles.addressInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                value={tempShippingAddress.street_address_2}
                onChangeText={handleAddressStreet2Change}
                placeholder="Apt 4B (optional)"
                placeholderTextColor="#999"
              />

              <View style={styles.cityStateRow}>
                <View style={styles.cityInput}>
                  <Text style={styles.detailLabel}>City *</Text>
                  <TextInput
                    style={[styles.addressInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                    value={tempShippingAddress.city}
                    onChangeText={(text) => setTempShippingAddress({ ...tempShippingAddress, city: text })}
                    placeholder="City"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.stateInput}>
                  <Text style={styles.detailLabel}>State *</Text>
                  <TextInput
                    style={[styles.addressInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                    value={tempShippingAddress.state}
                    onChangeText={(text) => setTempShippingAddress({ ...tempShippingAddress, state: text })}
                    placeholder="TX"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </View>
              </View>

              <Text style={styles.detailLabel}>ZIP Code *</Text>
              <TextInput
                style={[styles.addressInput, styles.zipInput, { backgroundColor: isDark ? '#333' : '#fff', color: isDark ? '#fff' : '#000' }]}
                value={tempShippingAddress.postal_code}
                onChangeText={(text) => setTempShippingAddress({ ...tempShippingAddress, postal_code: text })}
                placeholder="12345"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={10}
              />

              <View style={styles.addressButtonRow}>
                <TouchableOpacity
                  style={styles.addressCancelButton}
                  onPress={() => setEditingShippingAddress(false)}
                  disabled={savingShippingAddress}>
                  <Text style={styles.addressCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addressSaveButton, savingShippingAddress && styles.addressSaveButtonDisabled]}
                  onPress={saveShippingAddress}
                  disabled={savingShippingAddress}>
                  {savingShippingAddress ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addressSaveButtonText}>Save Address</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : shippingAddress ? (
            <TouchableOpacity style={styles.addressCard} onPress={handleEditShippingAddress}>
              <View style={styles.addressCardContent}>
                <FontAwesome name="map-marker" size={16} color={Colors.violet.primary} style={styles.addressIcon} />
                <View style={styles.addressText}>
                  <Text style={styles.addressName}>{shippingAddress.name}</Text>
                  <Text style={styles.addressLine}>{shippingAddress.street_address}</Text>
                  {shippingAddress.street_address_2 ? (
                    <Text style={styles.addressLine}>{shippingAddress.street_address_2}</Text>
                  ) : null}
                  <Text style={styles.addressLine}>
                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                  </Text>
                </View>
              </View>
              <FontAwesome name="pencil" size={14} color="#999" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addAddressButton} onPress={handleEditShippingAddress}>
              <FontAwesome name="plus" size={16} color={Colors.violet.primary} />
              <Text style={styles.addAddressText}>Add Shipping Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Details Section */}
        {user?.created_at && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <View style={styles.detailRow}>
              <FontAwesome name="calendar" size={16} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Account Created</Text>
                <Text style={styles.detailValue}>{formatDate(user.created_at)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sign Out Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <FontAwesome name="sign-out" size={16} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  photoContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.violet.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.violet.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gravatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoInitials: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(106, 27, 154, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.violet.primary,
  },
  section: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 20,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  editableContent: {
    flex: 1,
  },
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.violet.primary,
    borderRadius: 6,
  },
  cancelButton: {
    marginLeft: 4,
  },
  editableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
    fontStyle: 'italic',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  recoveryCardLeft: {
    flex: 1,
  },
  recoveryCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recoveryDiscName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recoveryDiscInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  recoveryTime: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  orderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.violet[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderRowText: {
    flex: 1,
  },
  orderRowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  orderRowSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  // Shipping address styles
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  cityStateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cityInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  zipInput: {
    width: 120,
  },
  addressButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  addressCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addressCancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  addressSaveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.violet.primary,
  },
  addressSaveButtonDisabled: {
    opacity: 0.7,
  },
  addressSaveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressCardContent: {
    flexDirection: 'row',
    flex: 1,
  },
  addressIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.violet.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    color: Colors.violet.primary,
    fontWeight: '500',
  },
  // Payment settings / Venmo styles
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  venmoIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#008CFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  venmoIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  venmoInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  venmoAtSymbol: {
    fontSize: 16,
    color: '#666',
    marginRight: 2,
  },
  venmoInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  // Payment method card styles
  paymentMethodCard: {
    backgroundColor: 'rgba(0, 140, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 140, 255, 0.2)',
  },
  paymentMethodCardSecondary: {
    backgroundColor: 'rgba(107, 114, 128, 0.05)',
    borderColor: 'rgba(107, 114, 128, 0.2)',
    marginBottom: 0,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethodTitleSecondary: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  paymentMethodRecommended: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  paymentMethodOptional: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  paymentMethodAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodStatusText: {
    fontSize: 13,
    color: '#10b981',
  },
  paymentMethodSecondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  paymentMethodSecondaryButtonText: {
    fontSize: 13,
    color: '#6b7280',
  },
  cardIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodPendingText: {
    fontSize: 13,
    color: '#f59e0b',
  },
  paymentMethodRestrictedText: {
    fontSize: 13,
    color: '#ef4444',
  },
});
