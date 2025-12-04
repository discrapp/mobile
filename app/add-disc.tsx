import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';

interface FlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

export default function AddDiscScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [mold, setMold] = useState('');
  const [plastic, setPlastic] = useState('');
  const [weight, setWeight] = useState('');
  const [color, setColor] = useState('');
  const [speed, setSpeed] = useState('');
  const [glide, setGlide] = useState('');
  const [turn, setTurn] = useState('');
  const [fade, setFade] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Validation errors
  const [nameError, setNameError] = useState('');

  const validateForm = (): boolean => {
    let isValid = true;

    // Name is required
    if (!name.trim()) {
      setNameError('Disc name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to add a disc');
        return;
      }

      // Prepare flight numbers
      const flightNumbers: FlightNumbers = {
        speed: speed ? parseInt(speed, 10) : null,
        glide: glide ? parseInt(glide, 10) : null,
        turn: turn ? parseFloat(turn) : null,
        fade: fade ? parseInt(fade, 10) : null,
      };

      const requestBody = {
        name: name.trim(),
        manufacturer: manufacturer.trim() || undefined,
        mold: mold.trim() || undefined,
        plastic: plastic.trim() || undefined,
        weight: weight ? parseInt(weight, 10) : undefined,
        color: color.trim() || undefined,
        flight_numbers: flightNumbers,
        reward_amount: rewardAmount ? parseInt(rewardAmount, 10) : undefined,
        notes: notes.trim() || undefined,
      };

      console.log('Creating disc with:', requestBody);

      // Call create-disc edge function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-disc`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', data);
        console.error('Response status:', response.status);
        throw new Error(data.error || data.details || 'Failed to create disc');
      }

      Alert.alert('Success', 'Disc added to your bag!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating disc:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add disc');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.title}>Add Disc to Your Bag</Text>

          {/* Name - Required */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Disc Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError('');
              }}
              placeholder="e.g., Destroyer"
              placeholderTextColor="#999"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* Manufacturer */}
          <View style={styles.field}>
            <Text style={styles.label}>Manufacturer</Text>
            <TextInput
              style={styles.input}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="e.g., Innova"
              placeholderTextColor="#999"
            />
          </View>

          {/* Mold */}
          <View style={styles.field}>
            <Text style={styles.label}>Mold</Text>
            <TextInput
              style={styles.input}
              value={mold}
              onChangeText={setMold}
              placeholder="e.g., Destroyer"
              placeholderTextColor="#999"
            />
          </View>

          {/* Plastic */}
          <View style={styles.field}>
            <Text style={styles.label}>Plastic</Text>
            <TextInput
              style={styles.input}
              value={plastic}
              onChangeText={setPlastic}
              placeholder="e.g., Star"
              placeholderTextColor="#999"
            />
          </View>

          {/* Weight */}
          <View style={styles.field}>
            <Text style={styles.label}>Weight (grams)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g., 175"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Color */}
          <View style={styles.field}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              value={color}
              onChangeText={setColor}
              placeholder="e.g., Red"
              placeholderTextColor="#999"
            />
          </View>

          {/* Flight Numbers */}
          <Text style={styles.sectionTitle}>Flight Numbers</Text>
          <View style={styles.row}>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Speed</Text>
              <TextInput
                style={styles.input}
                value={speed}
                onChangeText={setSpeed}
                placeholder="1-15"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Glide</Text>
              <TextInput
                style={styles.input}
                value={glide}
                onChangeText={setGlide}
                placeholder="1-7"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Turn</Text>
              <TextInput
                style={styles.input}
                value={turn}
                onChangeText={setTurn}
                placeholder="-5 to 1"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldSmall}>
              <Text style={styles.label}>Fade</Text>
              <TextInput
                style={styles.input}
                value={fade}
                onChangeText={setFade}
                placeholder="0-5"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Reward Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Reward Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={rewardAmount}
              onChangeText={setRewardAmount}
              placeholder="e.g., 10"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this disc..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => router.back()}
              disabled={loading}>
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Save Disc</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  fieldSmall: {
    flex: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 16,
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
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
    backgroundColor: '#9333EA',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#9333EA',
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
    color: '#9333EA',
    fontSize: 16,
    fontWeight: '600',
  },
});
