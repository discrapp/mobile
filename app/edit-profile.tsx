import { logger } from '@/lib/logger';
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
  Switch,
  View,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import { FormFieldSkeleton, Skeleton } from '@/components/Skeleton';
import { handleError, showSuccess } from '@/lib/errorHandler';
import { compressImage } from '@/utils/imageCompression';

type DisplayPreference = 'username' | 'full_name';
type ThrowingHand = 'right' | 'left';
type PreferredThrowStyle = 'backhand' | 'forehand' | 'both';
type ConnectStatus = 'active' | 'pending' | 'restricted' | null;

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

export default function EditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = Colors[colorScheme === 'dark' ? 'dark' : 'light'].text;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<ConnectStatus>(null);

  // Dynamic styles for dark/light mode
  const dynamicContainerStyle = {
    backgroundColor: isDark ? '#121212' : '#fff',
  };

  const dynamicInputStyle = {
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderColor: isDark ? '#333' : '#ccc',
  };

  // Profile photo state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>('username');
  const [throwingHand, setThrowingHand] = useState<ThrowingHand>('right');
  const [preferredThrowStyle, setPreferredThrowStyle] = useState<PreferredThrowStyle>('backhand');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [phoneDiscoverable, setPhoneDiscoverable] = useState(false);

  // Shipping address
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressData>({
    id: null,
    name: '',
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });

  // Validation errors
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    initializeForm();
  }, [user?.id]);

  const initializeForm = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch current profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, display_preference, throwing_hand, preferred_throw_style, phone_number, venmo_username, phone_discoverable, avatar_url, stripe_connect_status')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setUsername(profileData.username || '');
        setFullName(profileData.full_name || '');
        setDisplayPreference(profileData.display_preference || 'username');
        setThrowingHand((profileData.throwing_hand as ThrowingHand) || 'right');
        setPreferredThrowStyle((profileData.preferred_throw_style as PreferredThrowStyle) || 'backhand');
        setPhoneNumber(profileData.phone_number || '');
        setVenmoUsername(profileData.venmo_username || '');
        setPhoneDiscoverable(profileData.phone_discoverable || false);
        setAvatarUrl(profileData.avatar_url);
        setStripeConnectStatus(profileData.stripe_connect_status as ConnectStatus || null);

        // Get signed URL for avatar
        if (profileData.avatar_url) {
          const { data: signedData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(profileData.avatar_url, 3600);
          if (signedData?.signedUrl) {
            setAvatarSignedUrl(signedData.signedUrl);
          }
        }

        // Generate gravatar URL
        if (user.email) {
          const hash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.MD5,
            user.email.toLowerCase().trim()
          );
          setGravatarUrl(`https://www.gravatar.com/avatar/${hash}?d=mp&s=200`);
        }
      }

      // Fetch shipping address
      const { data: addressData } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (addressData) {
        setShippingAddress({
          id: addressData.id,
          name: addressData.name || '',
          street_address: addressData.street_address || '',
          street_address_2: addressData.street_address_2 || '',
          city: addressData.city || '',
          state: addressData.state || '',
          postal_code: addressData.postal_code || '',
          country: addressData.country || 'US',
        });
      }
    } catch (error) {
      handleError(error, { operation: 'fetch-profile-for-edit' });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (email: string): string => {
    return email.charAt(0).toUpperCase();
  };

  const handlePhotoPress = async () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: pickImage,
        },
        ...(avatarUrl
          ? [
              {
                text: 'Remove Photo',
                style: 'destructive' as const,
                onPress: removePhoto,
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!user?.id) return;

    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(uri, { maxDimension: 400, quality: 0.8 });
      const response = await fetch(compressed.uri);
      const blob = await response.blob();

      const fileExt = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(fileName);
      const { data: signedData } = await supabase.storage
        .from('avatars')
        .createSignedUrl(fileName, 3600);
      if (signedData?.signedUrl) {
        setAvatarSignedUrl(signedData.signedUrl);
      }
      setImageError(false);
      showSuccess('Profile photo updated');
    } catch (error) {
      handleError(error, { operation: 'upload-profile-photo' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async () => {
    if (!user?.id || !avatarUrl) return;

    setUploadingPhoto(true);
    try {
      await supabase.storage.from('avatars').remove([avatarUrl]);
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);

      setAvatarUrl(null);
      setAvatarSignedUrl(null);
      showSuccess('Profile photo removed');
    } catch (error) {
      handleError(error, { operation: 'remove-profile-photo' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const refreshStripeStatus = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('stripe_connect_status')
        .eq('id', user.id)
        .single();
      if (data) {
        setStripeConnectStatus(data.stripe_connect_status as ConnectStatus || null);
      }
    } catch (error) {
      logger.error('Error refreshing Stripe status:', error);
    }
  };

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
      await refreshStripeStatus();
    } catch (error) {
      handleError(error, { operation: 'setup-payouts' });
    } finally {
      setConnectLoading(false);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    } else {
      setUsernameError('');
    }

    return isValid;
  };

  const normalizePhoneNumber = (phone: string): string | null => {
    if (!phone.trim()) return null;

    let cleaned = phone.trim().replace(/[\s\-\.\(\)]/g, '');

    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      }
    }

    return cleaned;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to update your profile');
        return;
      }

      // Prepare cleaned values
      const cleanedVenmo = venmoUsername.trim().replace(/^@/, '') || null;
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const shouldClearPhoneDiscoverable = !normalizedPhone && phoneDiscoverable;

      const profileUpdates = {
        username: username.trim(),
        full_name: fullName.trim() || null,
        display_preference: displayPreference,
        throwing_hand: throwingHand,
        preferred_throw_style: preferredThrowStyle,
        phone_number: normalizedPhone,
        venmo_username: cleanedVenmo,
        phone_discoverable: shouldClearPhoneDiscoverable ? false : phoneDiscoverable,
      };

      logger.debug('Updating profile with:', JSON.stringify(profileUpdates, null, 2));

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Save shipping address if any field is filled
      if (shippingAddress.name || shippingAddress.street_address) {
        if (shippingAddress.id) {
          // Update existing
          const { error: addressError } = await supabase
            .from('shipping_addresses')
            .update({
              name: shippingAddress.name,
              street_address: shippingAddress.street_address,
              street_address_2: shippingAddress.street_address_2 || null,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country,
            })
            .eq('id', shippingAddress.id);

          if (addressError) throw addressError;
        } else {
          // Create new
          const { error: addressError } = await supabase
            .from('shipping_addresses')
            .insert({
              user_id: user?.id,
              name: shippingAddress.name,
              street_address: shippingAddress.street_address,
              street_address_2: shippingAddress.street_address_2 || null,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country,
              is_default: true,
            });

          if (addressError) throw addressError;
        }
      }

      showSuccess('Profile updated');
      router.back();
    } catch (error) {
      handleError(error, { operation: 'update-profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisplayPreferencePress = useCallback(() => {
    Alert.alert(
      'Display Name As',
      'Choose how your name appears to others',
      [
        { text: 'Username', onPress: () => setDisplayPreference('username') },
        { text: 'Full Name', onPress: () => setDisplayPreference('full_name') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handleThrowingHandPress = useCallback(() => {
    Alert.alert(
      'Throwing Hand',
      'Select your primary throwing hand for flight path visualization',
      [
        { text: 'Right Hand', onPress: () => setThrowingHand('right') },
        { text: 'Left Hand', onPress: () => setThrowingHand('left') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handlePreferredThrowStylePress = useCallback(() => {
    Alert.alert(
      'Preferred Throw Style',
      'Select your preferred throwing style',
      [
        { text: 'Backhand', onPress: () => setPreferredThrowStyle('backhand') },
        { text: 'Forehand', onPress: () => setPreferredThrowStyle('forehand') },
        { text: 'Both', onPress: () => setPreferredThrowStyle('both') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handlePhoneDiscoverableChange = (value: boolean) => {
    if (value && !phoneNumber.trim()) {
      Alert.alert(
        'Phone Number Required',
        'Please add your phone number first before enabling phone lookup.',
        [{ text: 'OK' }]
      );
      return;
    }
    setPhoneDiscoverable(value);
  };

  const getDisplayPreferenceLabel = (pref: DisplayPreference): string => {
    return pref === 'full_name' ? 'Full Name' : 'Username';
  };

  const getThrowingHandLabel = (hand: ThrowingHand): string => {
    return hand === 'right' ? 'Right Hand' : 'Left Hand';
  };

  const getThrowStyleLabel = (style: PreferredThrowStyle): string => {
    switch (style) {
      case 'backhand': return 'Backhand';
      case 'forehand': return 'Forehand';
      case 'both': return 'Both';
      default: return 'Backhand';
    }
  };

  if (loading) {
    return (
      <ScrollView style={[styles.scrollView, dynamicContainerStyle]} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.photoContainerCenter}>
            <Skeleton width={100} height={100} style={{ borderRadius: 50 }} />
          </View>
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicContainerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}>
      <ScrollView style={[styles.scrollView, dynamicContainerStyle]} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          {/* Profile Photo */}
          <TouchableOpacity style={styles.photoContainerCenter} onPress={handlePhotoPress} disabled={uploadingPhoto}>
            <View style={styles.photoPlaceholder}>
              {uploadingPhoto ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : avatarSignedUrl && !imageError ? (
                <Image
                  source={{ uri: avatarSignedUrl }}
                  style={styles.photoImage}
                  onError={() => setImageError(true)}
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : gravatarUrl && !imageError ? (
                <Image
                  source={{ uri: gravatarUrl }}
                  style={styles.photoImage}
                  onError={() => setImageError(true)}
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
          <Text style={styles.photoHint}>Tap to change photo</Text>

          {/* Profile Settings Section */}
          <Text style={styles.sectionTitle}>Profile Settings</Text>

          {/* Username - Required */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>
              Username <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }, usernameError && styles.inputError]}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (usernameError) setUsernameError('');
              }}
              placeholder="Enter username"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
          </View>

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Full Name</Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter full name"
              placeholderTextColor="#999"
              autoCapitalize="words"
            />
          </View>

          {/* Display Preference */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Display Name As</Text>
            <Pressable style={[styles.dropdownButton, dynamicInputStyle]} onPress={handleDisplayPreferencePress}>
              <Text style={[styles.dropdownText, { color: textColor }]}>{getDisplayPreferenceLabel(displayPreference)}</Text>
              <FontAwesome name="chevron-down" size={12} color="#999" />
            </Pressable>
            <Text style={styles.hintText}>How your name appears to others</Text>
          </View>

          {/* Disc Preferences Section */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Disc Preferences</Text>

          {/* Throwing Hand */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Throwing Hand</Text>
            <Pressable style={[styles.dropdownButton, dynamicInputStyle]} onPress={handleThrowingHandPress}>
              <Text style={[styles.dropdownText, { color: textColor }]}>{getThrowingHandLabel(throwingHand)}</Text>
              <FontAwesome name="chevron-down" size={12} color="#999" />
            </Pressable>
          </View>

          {/* Preferred Throw Style */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Preferred Throw Style</Text>
            <Pressable style={[styles.dropdownButton, dynamicInputStyle]} onPress={handlePreferredThrowStylePress}>
              <Text style={[styles.dropdownText, { color: textColor }]}>{getThrowStyleLabel(preferredThrowStyle)}</Text>
              <FontAwesome name="chevron-down" size={12} color="#999" />
            </Pressable>
          </View>

          {/* Contact Section */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Phone Recovery</Text>
          <Text style={styles.sectionDescription}>
            Add your phone number so finders can return discs even without a QR code sticker.
          </Text>

          {/* Phone Number */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="(555) 123-4567"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          {/* Phone Discoverable Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.label, { color: textColor, marginBottom: 0 }]}>Allow Phone Lookup</Text>
              <Text style={styles.hintText}>
                Let finders search for you by the phone number on your disc
              </Text>
            </View>
            <Switch
              value={phoneDiscoverable}
              onValueChange={handlePhoneDiscoverableChange}
              trackColor={{ false: isDark ? '#39393d' : '#e0e0e0', true: Colors.violet[400] }}
              thumbColor="#fff"
              ios_backgroundColor={isDark ? '#39393d' : '#e0e0e0'}
            />
          </View>

          {/* Rewards Section */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Rewards</Text>
          <Text style={styles.sectionDescription}>
            Set up how you receive rewards when you find and return discs.
          </Text>

          {/* Venmo Username */}
          <View style={styles.field}>
            <View style={styles.venmoHeader}>
              <View style={styles.venmoIconContainer}>
                <Text style={styles.venmoIcon}>V</Text>
              </View>
              <Text style={[styles.label, { color: textColor, marginBottom: 0 }]}>Venmo Username</Text>
            </View>
            <View style={[styles.inputWithPrefix, dynamicInputStyle]}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefixText, { color: textColor }]}
                value={venmoUsername}
                onChangeText={setVenmoUsername}
                placeholder="your-username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.hintText}>Recommended - no setup required. Receive rewards for returning discs.</Text>
          </View>

          {/* Stripe Connect - Credit Card Payouts */}
          <View style={styles.field}>
            <View style={styles.stripeHeader}>
              <View style={[styles.stripeIconContainer, dynamicInputStyle]}>
                <FontAwesome name="credit-card" size={14} color="#6b7280" />
              </View>
              <View style={styles.stripeTitleContainer}>
                <Text style={[styles.label, { color: textColor, marginBottom: 0 }]}>Credit Card Payouts</Text>
                {stripeConnectStatus === 'active' && (
                  <View style={styles.stripeStatusBadge}>
                    <FontAwesome name="check" size={10} color="#10b981" />
                    <Text style={styles.stripeStatusActive}>Ready</Text>
                  </View>
                )}
                {stripeConnectStatus === 'pending' && (
                  <View style={styles.stripeStatusBadge}>
                    <FontAwesome name="clock-o" size={10} color="#f59e0b" />
                    <Text style={styles.stripeStatusPending}>Pending</Text>
                  </View>
                )}
                {stripeConnectStatus === 'restricted' && (
                  <View style={styles.stripeStatusBadge}>
                    <FontAwesome name="exclamation-circle" size={10} color="#ef4444" />
                    <Text style={styles.stripeStatusRestricted}>Action Needed</Text>
                  </View>
                )}
              </View>
            </View>
            {stripeConnectStatus === 'active' ? (
              <Text style={styles.stripeReadyText}>Ready to receive credit card payments</Text>
            ) : stripeConnectStatus === 'pending' ? (
              <View style={styles.stripeActionRow}>
                <Text style={styles.stripePendingText}>Setup incomplete</Text>
                <TouchableOpacity
                  style={[styles.stripeButton, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : Colors.violet[50] }]}
                  onPress={handleSetupPayouts}
                  disabled={connectLoading}>
                  {connectLoading ? (
                    <ActivityIndicator size="small" color={isDark ? '#a78bfa' : Colors.violet.primary} />
                  ) : (
                    <Text style={[styles.stripeButtonText, { color: isDark ? '#a78bfa' : Colors.violet.primary }]}>Continue Setup</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : stripeConnectStatus === 'restricted' ? (
              <View style={styles.stripeActionRow}>
                <Text style={styles.stripeRestrictedText}>Action needed</Text>
                <TouchableOpacity
                  style={[styles.stripeButton, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : Colors.violet[50] }]}
                  onPress={handleSetupPayouts}
                  disabled={connectLoading}>
                  {connectLoading ? (
                    <ActivityIndicator size="small" color={isDark ? '#a78bfa' : Colors.violet.primary} />
                  ) : (
                    <Text style={[styles.stripeButtonText, { color: isDark ? '#a78bfa' : Colors.violet.primary }]}>Fix Issues</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={[styles.stripeButton, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : Colors.violet[50] }]}
                  onPress={handleSetupPayouts}
                  disabled={connectLoading}>
                  {connectLoading ? (
                    <ActivityIndicator size="small" color={isDark ? '#a78bfa' : Colors.violet.primary} />
                  ) : (
                    <Text style={[styles.stripeButtonText, { color: isDark ? '#a78bfa' : Colors.violet.primary }]}>Set Up (ID required)</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.hintText}>Optional - Requires identity verification</Text>
              </View>
            )}
          </View>

          {/* Shipping Address Section */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Shipping Address</Text>
          <Text style={styles.sectionDescription}>
            For receiving QR code stickers.
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Name</Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }]}
              value={shippingAddress.name}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, name: text })}
              placeholder="Full name"
              placeholderTextColor="#999"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Street Address</Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }]}
              value={shippingAddress.street_address}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, street_address: text })}
              placeholder="123 Main St"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>Apt, Suite, etc.</Text>
            <TextInput
              style={[styles.input, dynamicInputStyle, { color: textColor }]}
              value={shippingAddress.street_address_2}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, street_address_2: text })}
              placeholder="Apt 4B (optional)"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.rowFields}>
            <View style={styles.cityField}>
              <Text style={[styles.label, { color: textColor }]}>City</Text>
              <TextInput
                style={[styles.input, dynamicInputStyle, { color: textColor }]}
                value={shippingAddress.city}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
                placeholder="City"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.stateField}>
              <Text style={[styles.label, { color: textColor }]}>State</Text>
              <TextInput
                style={[styles.input, dynamicInputStyle, { color: textColor }]}
                value={shippingAddress.state}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, state: text })}
                placeholder="TX"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: textColor }]}>ZIP Code</Text>
            <TextInput
              style={[styles.input, styles.zipInput, dynamicInputStyle, { color: textColor }]}
              value={shippingAddress.postal_code}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, postal_code: text })}
              placeholder="12345"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.buttonSecondary, { borderColor: isDark ? '#444' : '#ccc' }]}
              onPress={() => router.back()}
              disabled={saving}>
              <Text style={[styles.buttonSecondaryText, { color: isDark ? '#ccc' : '#666' }]}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    flex: 1,
  },
  photoContainerCenter: {
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
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
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoInitials: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
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
  photoHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    marginTop: -8,
    lineHeight: 18,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#ff4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: 12,
    color: '#666',
  },
  inputWithPrefixText: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  venmoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  venmoIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#008CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venmoIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stripeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  stripeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stripeTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stripeStatusActive: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  stripeStatusPending: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  stripeStatusRestricted: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  stripeReadyText: {
    fontSize: 13,
    color: '#10b981',
  },
  stripeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripePendingText: {
    fontSize: 13,
    color: '#f59e0b',
  },
  stripeRestrictedText: {
    fontSize: 13,
    color: '#ef4444',
  },
  stripeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  stripeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  cityField: {
    flex: 2,
    marginBottom: 16,
  },
  stateField: {
    flex: 1,
    marginBottom: 16,
  },
  zipInput: {
    width: 120,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.violet.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
