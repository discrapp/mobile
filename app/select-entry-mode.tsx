import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function SelectEntryModeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = Colors[colorScheme ?? 'light'].text;

  const handleSelectMode = (mode: 'qr' | 'photo-ai' | 'manual') => {
    // Dismiss the modal first, then push to add-disc
    // This ensures the back button works correctly
    router.dismiss();
    router.push({ pathname: '/add-disc', params: { mode } });
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      <View style={[styles.content, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
        <Text style={[styles.title, { color: textColor }]}>Add a Disc</Text>
        <Text style={[styles.subtitle, { color: isDark ? '#999' : '#666' }]}>
          How would you like to add your disc?
        </Text>

        <Pressable
          style={[styles.optionCard, { backgroundColor: isDark ? '#252525' : '#f8f8f8', borderColor: isDark ? '#333' : '#e0e0e0' }]}
          onPress={() => handleSelectMode('qr')}>
          <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
            <FontAwesome name="qrcode" size={28} color={Colors.violet.primary} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: textColor }]}>Scan QR Sticker</Text>
            <Text style={[styles.optionDescription, { color: isDark ? '#999' : '#666' }]}>
              Link a Discr sticker to this disc
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#999" />
        </Pressable>

        <Pressable
          style={[styles.optionCard, { backgroundColor: isDark ? '#252525' : '#f8f8f8', borderColor: isDark ? '#333' : '#e0e0e0' }]}
          onPress={() => handleSelectMode('photo-ai')}>
          <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
            <FontAwesome name="magic" size={28} color={Colors.violet.primary} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: textColor }]}>Photo + AI Identify</Text>
            <Text style={[styles.optionDescription, { color: isDark ? '#999' : '#666' }]}>
              Take a photo and let AI fill in the details
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#999" />
        </Pressable>

        <Pressable
          style={[styles.optionCard, { backgroundColor: isDark ? '#252525' : '#f8f8f8', borderColor: isDark ? '#333' : '#e0e0e0' }]}
          onPress={() => handleSelectMode('manual')}>
          <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(127, 34, 206, 0.1)' }]}>
            <FontAwesome name="pencil" size={28} color={Colors.violet.primary} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: textColor }]}>Manual Entry</Text>
            <Text style={[styles.optionDescription, { color: isDark ? '#999' : '#666' }]}>
              Enter disc details yourself
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#999" />
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#999',
  },
});
