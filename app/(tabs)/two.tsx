import { StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useState, useEffect } from 'react';
import * as Crypto from 'expo-crypto';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

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
          </View>
        )}

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
  section: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
});
