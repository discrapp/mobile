import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function ProposeMeetupScreen() {
  const { id: recoveryEventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [locationName, setLocationName] = useState('');
  const [message, setMessage] = useState('');
  const [proposedDate, setProposedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Keep the time from current proposedDate, just change the date
      const newDate = new Date(proposedDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setProposedDate(newDate);
    }
  };

  const handleTimeChange = (_event: unknown, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Keep the date from current proposedDate, just change the time
      const newDate = new Date(proposedDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setProposedDate(newDate);
    }
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

      Alert.alert('Success!', 'Your meetup proposal has been sent to the disc owner.', [
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <FontAwesome name="calendar" size={48} color={Colors.violet.primary} />
          <Text style={styles.title}>Propose a Meetup</Text>
          <Text style={styles.subtitle}>
            Suggest a time and place to return the disc to its owner.
          </Text>
        </View>

        {/* Location Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Meetup Location <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Parking lot at Maple Hill DGC"
            placeholderTextColor="#999"
            value={locationName}
            onChangeText={setLocationName}
          />
          <Text style={styles.hint}>
            Suggest a public place like a disc golf course, park, or parking lot.
          </Text>
        </View>

        {/* Date Picker */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Date <Text style={styles.required}>*</Text>
          </Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
            <FontAwesome name="calendar" size={18} color="#666" />
            <Text style={styles.pickerButtonText}>{formatDate(proposedDate)}</Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={proposedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Time <Text style={styles.required}>*</Text>
          </Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
            <FontAwesome name="clock-o" size={18} color="#666" />
            <Text style={styles.pickerButtonText}>{formatTime(proposedDate)}</Text>
          </Pressable>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={proposedDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Additional Message (Optional)</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Any other details about the meetup..."
            placeholderTextColor="#999"
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
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
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
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
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
});
