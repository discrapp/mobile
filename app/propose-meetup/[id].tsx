import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function ProposeMeetupScreen() {
  const { id: recoveryEventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [locationName, setLocationName] = useState('');
  const [message, setMessage] = useState('');
  // Default to 1 hour from now for convenience
  const getDefaultTime = () => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date;
  };
  const [proposedDate, setProposedDate] = useState(getDefaultTime);
  const [tempDate, setTempDate] = useState(getDefaultTime); // Temp date for iOS picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'finder' | null>(null);

  // Fetch user role from recovery details
  const fetchUserRole = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-recovery-details?id=${recoveryEventId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserRole(data.user_role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  }, [recoveryEventId]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        const newDate = new Date(proposedDate);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setProposedDate(newDate);
      }
    } else if (selectedDate) {
      // iOS: update temp date, user will confirm with Done button
      setTempDate(selectedDate);
    }
  };

  const handleTimeChange = (_event: unknown, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedTime) {
        const newDate = new Date(proposedDate);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        setProposedDate(newDate);
      }
    } else if (selectedTime) {
      // iOS: update temp date, user will confirm with Done button
      setTempDate(selectedTime);
    }
  };

  const handleDatePickerDone = () => {
    // Apply the temp date to proposedDate (keeping time)
    const newDate = new Date(proposedDate);
    newDate.setFullYear(tempDate.getFullYear());
    newDate.setMonth(tempDate.getMonth());
    newDate.setDate(tempDate.getDate());
    setProposedDate(newDate);
    setShowDatePicker(false);
  };

  const handleTimePickerDone = () => {
    // Apply the temp time to proposedDate (keeping date)
    const newDate = new Date(proposedDate);
    newDate.setHours(tempDate.getHours());
    newDate.setMinutes(tempDate.getMinutes());
    setProposedDate(newDate);
    setShowTimePicker(false);
  };

  const openDatePicker = () => {
    setTempDate(proposedDate);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setTempDate(proposedDate);
    setShowTimePicker(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const validateForm = () => {
    if (!locationName.trim()) {
      Alert.alert('Missing Information', 'Please enter a meetup location.');
      return false;
    }

    // Check if proposed date is in the future
    if (proposedDate <= new Date()) {
      Alert.alert('Invalid Date', 'Please select a date and time in the future.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to propose a meetup.');
        setSubmitting(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/propose-meetup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recovery_event_id: recoveryEventId,
            location_name: locationName.trim(),
            proposed_datetime: proposedDate.toISOString(),
            message: message.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to propose meetup');
      }

      const successMessage = userRole === 'owner'
        ? 'Your meetup proposal has been sent to the finder.'
        : 'Your meetup proposal has been sent to the disc owner.';

      Alert.alert('Success!', successMessage, [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/found-disc'),
        },
      ]);
    } catch (error) {
      console.error('Error proposing meetup:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to propose meetup');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <FontAwesome name="calendar" size={48} color={Colors.violet.primary} />
          <Text style={styles.title}>Propose a Meetup</Text>
          <Text style={styles.subtitle}>
            {userRole === 'owner'
              ? 'Suggest a time and place to retrieve your disc from the finder.'
              : 'Suggest a time and place to return the disc to its owner.'}
          </Text>
        </View>

        {/* Location Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
            Meetup Location <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
              borderColor: isDark ? '#333' : '#ddd',
              color: isDark ? '#fff' : '#000',
            }]}
            placeholder="e.g., Parking lot at Maple Hill DGC"
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={locationName}
            onChangeText={setLocationName}
          />
          <Text style={styles.hint}>
            Suggest a public place like a disc golf course, park, or parking lot.
          </Text>
        </View>

        {/* Date Picker */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
            Date <Text style={styles.required}>*</Text>
          </Text>
          <Pressable
            style={[styles.pickerButton, {
              backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
              borderColor: isDark ? '#333' : '#ddd',
            }]}
            onPress={openDatePicker}
          >
            <FontAwesome name="calendar" size={18} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.pickerButtonText, { color: isDark ? '#fff' : '#333' }]}>
              {formatDate(proposedDate)}
            </Text>
          </Pressable>
        </View>

        {/* iOS Date Picker Modal */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                <View style={styles.modalHeader}>
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleDatePickerDone}>
                    <Text style={styles.modalDone}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Date Picker */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={proposedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
            Time <Text style={styles.required}>*</Text>
          </Text>
          <Pressable
            style={[styles.pickerButton, {
              backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
              borderColor: isDark ? '#333' : '#ddd',
            }]}
            onPress={openTimePicker}
          >
            <FontAwesome name="clock-o" size={18} color={isDark ? '#999' : '#666'} />
            <Text style={[styles.pickerButtonText, { color: isDark ? '#fff' : '#333' }]}>
              {formatTime(proposedDate)}
            </Text>
          </Pressable>
        </View>

        {/* iOS Time Picker Modal */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showTimePicker}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                <View style={styles.modalHeader}>
                  <Pressable onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleTimePickerDone}>
                    <Text style={styles.modalDone}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Time Picker */}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={proposedDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
            Additional Message (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.messageInput, {
              backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
              borderColor: isDark ? '#333' : '#ddd',
              color: isDark ? '#fff' : '#000',
            }]}
            placeholder="Any other details about the meetup..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="paper-plane" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Send Proposal</Text>
            </>
          )}
        </Pressable>

        {/* Cancel Button */}
        <Pressable style={styles.textButton} onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.textButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: Colors.violet.primary,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  pickerButtonText: {
    fontSize: 16,
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
    marginTop: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  textButtonText: {
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.violet.primary,
  },
});
