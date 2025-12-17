import { StyleSheet, Pressable, ScrollView, View as RNView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const dynamicStyles = {
    scrollView: {
      backgroundColor: isDark ? '#000' : '#fff',
    },
    email: {
      color: isDark ? '#999' : '#666',
    },
    description: {
      color: isDark ? '#999' : '#666',
    },
    stickerCard: {
      backgroundColor: isDark ? '#1a1a1a' : Colors.violet[50],
    },
    stickerIconContainer: {
      backgroundColor: isDark ? '#2a2a2a' : '#fff',
    },
    stickerCardDescription: {
      color: isDark ? '#999' : '#666',
    },
    quickAction: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(150, 150, 150, 0.2)',
    },
  };

  return (
    <ScrollView style={[styles.scrollView, dynamicStyles.scrollView]} contentContainerStyle={styles.scrollContent}>
      <RNView style={styles.container}>
        <Text style={styles.title}>Welcome to AceBack!</Text>
        {user && <Text style={[styles.email, dynamicStyles.email]}>{user.email}</Text>}
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <Text style={[styles.description, dynamicStyles.description]}>
          Never lose your favorite disc again. Track your collection and help others find their lost
          discs.
        </Text>
      </RNView>

      {/* Order Stickers CTA Card */}
      <Pressable style={[styles.stickerCard, dynamicStyles.stickerCard]} onPress={() => router.push('/order-stickers')}>
        <RNView style={styles.stickerCardContent}>
          <RNView style={[styles.stickerIconContainer, dynamicStyles.stickerIconContainer]}>
            <FontAwesome name="qrcode" size={32} color={Colors.violet.primary} />
          </RNView>
          <RNView style={styles.stickerTextContainer}>
            <Text style={styles.stickerCardTitle}>Protect Your Discs</Text>
            <Text style={[styles.stickerCardDescription, dynamicStyles.stickerCardDescription]}>
              Get QR code stickers so finders can contact you instantly
            </Text>
          </RNView>
          <FontAwesome name="chevron-right" size={16} color={Colors.violet.primary} />
        </RNView>
      </Pressable>

      {/* Quick Actions */}
      <RNView style={styles.quickActions}>
        <Pressable style={[styles.quickAction, dynamicStyles.quickAction]} onPress={() => router.push('/add-disc')}>
          <RNView style={[styles.quickActionIcon, { backgroundColor: Colors.violet[100] }]}>
            <FontAwesome name="plus" size={20} color={Colors.violet.primary} />
          </RNView>
          <Text style={styles.quickActionText}>Add Disc</Text>
        </Pressable>

        <Pressable style={[styles.quickAction, dynamicStyles.quickAction]} onPress={() => router.push('/my-orders')}>
          <RNView style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
            <FontAwesome name="shopping-bag" size={20} color="#27AE60" />
          </RNView>
          <Text style={styles.quickActionText}>My Orders</Text>
        </Pressable>

        <Pressable style={[styles.quickAction, dynamicStyles.quickAction]} onPress={() => router.push('/(tabs)/found-disc')}>
          <RNView style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
            <FontAwesome name="search" size={20} color="#F39C12" />
          </RNView>
          <Text style={styles.quickActionText}>Found Disc</Text>
        </Pressable>

        <Pressable style={[styles.quickAction, dynamicStyles.quickAction]} onPress={() => router.push('/link-sticker')}>
          <RNView style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
            <FontAwesome name="link" size={20} color="#27AE60" />
          </RNView>
          <Text style={styles.quickActionText}>Link Sticker</Text>
        </Pressable>
      </RNView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    marginTop: 8,
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: '80%',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  stickerCard: {
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stickerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  stickerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stickerTextContainer: {
    flex: 1,
  },
  stickerCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stickerCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAction: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
