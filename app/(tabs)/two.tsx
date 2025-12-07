import { StyleSheet, TouchableOpacity, Alert, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useState, useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

type DisplayPreference = 'username' | 'full_name';

interface ProfileData {
  username: string | null;
  full_name: string | null;
  display_preference: DisplayPreference;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    username: null,
    full_name: null,
    display_preference: 'username',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingFullName, setEditingFullName] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempFullName, setTempFullName] = useState('');
  const [discsReturned, setDiscsReturned] = useState(0);

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
        .select('username, full_name, display_preference')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          username: data.username,
          full_name: data.full_name,
          display_preference: data.display_preference || 'username',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      if (error instanceof Error && error.message?.includes('unique')) {
        Alert.alert('Error', 'This username is already taken. Please choose another.');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUsername = () => {
    if (tempUsername.trim()) {
      saveProfile({ username: tempUsername.trim() });
    }
    setEditingUsername(false);
  };

  const handleSaveFullName = () => {
    saveProfile({ full_name: tempFullName.trim() || null });
    setEditingFullName(false);
  };

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
  }, [user?.id]);

  const fetchDiscsReturned = async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('recovery_events')
        .select('*', { count: 'exact', head: true })
        .eq('finder_id', user.id)
        .eq('status', 'completed');

      if (!error && count !== null) {
        setDiscsReturned(count);
      }
    } catch (error) {
      console.error('Error fetching discs returned:', error);
    }
  };

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

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          <View style={styles.photoPlaceholder}>
            {gravatarUrl && !imageError ? (
              <Image
                source={{ uri: gravatarUrl }}
                style={styles.gravatarImage}
                onError={() => setImageError(true)}
              />
            ) : user?.email ? (
              <Text style={styles.photoInitials}>{getInitials(user.email)}</Text>
            ) : (
              <FontAwesome name="user" size={48} color="#fff" />
            )}
          </View>
        </View>

        {/* User Info */}
        {user && (
          <View style={styles.infoContainer}>
            <Text style={styles.email}>{user.email}</Text>
            {user.created_at && (
              <Text style={styles.memberSince}>
                Member since {getMemberSinceText(user.created_at)}
              </Text>
            )}
            {discsReturned > 0 && (
              <View style={styles.statsBadge}>
                <FontAwesome name="trophy" size={14} color={Colors.violet.primary} />
                <Text style={styles.statsText}>
                  {discsReturned} disc{discsReturned !== 1 ? 's' : ''} returned
                </Text>
              </View>
            )}
          </View>
        )}

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
                    style={styles.editInput}
                    value={tempUsername}
                    onChangeText={setTempUsername}
                    placeholder="Enter username"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={handleSaveUsername} disabled={saving}>
                    <FontAwesome name="check" size={18} color={Colors.violet.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingUsername(false)} style={styles.cancelButton}>
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
                    style={styles.editInput}
                    value={tempFullName}
                    onChangeText={setTempFullName}
                    placeholder="Enter full name"
                    autoCapitalize="words"
                  />
                  <TouchableOpacity onPress={handleSaveFullName} disabled={saving}>
                    <FontAwesome name="check" size={18} color={Colors.violet.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingFullName(false)} style={styles.cancelButton}>
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
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
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
});
