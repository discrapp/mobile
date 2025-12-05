import { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, View } from '@/components/Themed';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';

interface FlightNumbers {
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
}

interface Disc {
  id: string;
  name: string;
  manufacturer?: string;
  mold?: string;
  plastic?: string;
  weight?: number;
  color?: string;
  flight_numbers: FlightNumbers;
  reward_amount?: string;
  notes?: string;
}

export default function EditDiscScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Predefined color options
  const COLOR_OPTIONS = [
    { name: 'Red', hex: '#E74C3C' },
    { name: 'Orange', hex: '#E67E22' },
    { name: 'Yellow', hex: '#F1C40F' },
    { name: 'Green', hex: '#2ECC71' },
    { name: 'Blue', hex: '#3498DB' },
    { name: 'Purple', hex: '#9B59B6' },
    { name: 'Pink', hex: '#E91E63' },
    { name: 'White', hex: '#ECF0F1' },
    { name: 'Black', hex: '#2C3E50' },
    { name: 'Gray', hex: '#95A5A6' },
    { name: 'Multi', hex: 'rainbow' },
  ];

  // Form fields
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
  const [moldError, setMoldError] = useState('');

  useEffect(() => {
    fetchDiscData();
  }, [id]);

  const fetchDiscData = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session found');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-user-discs`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch disc');
      }

      const discs = await response.json();
      const disc = discs.find((d: Disc) => d.id === id);

      if (!disc) {
        Alert.alert('Error', 'Disc not found');
        router.back();
        return;
      }

      // Populate form fields
      setManufacturer(disc.manufacturer || '');
      setMold(disc.mold || '');
      setPlastic(disc.plastic || '');
      setWeight(disc.weight ? disc.weight.toString() : '');
      setColor(disc.color || '');
      setSpeed(
        disc.flight_numbers.speed !== null ? disc.flight_numbers.speed.toString() : ''
      );
      setGlide(
        disc.flight_numbers.glide !== null ? disc.flight_numbers.glide.toString() : ''
      );
      setTurn(disc.flight_numbers.turn !== null ? disc.flight_numbers.turn.toString() : '');
      setFade(disc.flight_numbers.fade !== null ? disc.flight_numbers.fade.toString() : '');
      // reward_amount comes as string like "5.00" from API
      setRewardAmount(disc.reward_amount ? disc.reward_amount.toString() : '');
      setNotes(disc.notes || '');
    } catch (error) {
      console.error('Error fetching disc:', error);
      Alert.alert('Error', 'Failed to load disc data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Mold is required
    if (!mold.trim()) {
      setMoldError('Mold name is required');
      isValid = false;
    } else {
      setMoldError('');
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'You must be signed in to update a disc');
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
        disc_id: id,
        mold: mold.trim(),
        manufacturer: manufacturer.trim() || undefined,
        plastic: plastic.trim() || undefined,
        weight: weight ? parseInt(weight, 10) : undefined,
        color: color.trim() || undefined,
        flight_numbers: flightNumbers,
        reward_amount: rewardAmount ? parseFloat(rewardAmount) : undefined,
        notes: notes.trim() || undefined,
      };

      console.log('Updating disc with:', JSON.stringify(requestBody, null, 2));

      // Call update-disc edge function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-disc`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = JSON.stringify(data, null, 2);
        console.error('❌ API Error Response:', errorMessage);
        console.error('❌ Response status:', response.status);
        Alert.alert('API Error', `Status: ${response.status}\n\n${errorMessage}`, [
          { text: 'OK' },
        ]);
        throw new Error(data.error || data.details || 'Failed to update disc');
      }

      Alert.alert('Success', 'Disc updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating disc:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update disc');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.title}>Edit Disc</Text>

          {/* Mold - Required */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Mold <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, moldError ? styles.inputError : null]}
              value={mold}
              onChangeText={(text) => {
                setMold(text);
                if (moldError) setMoldError('');
              }}
              placeholder="e.g., Destroyer"
              placeholderTextColor="#999"
            />
            {moldError ? <Text style={styles.errorText}>{moldError}</Text> : null}
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
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((colorOption) => (
                <Pressable
                  key={colorOption.name}
                  style={[
                    styles.colorOption,
                    color === colorOption.name && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(colorOption.name)}>
                  {colorOption.hex === 'rainbow' ? (
                    <View style={styles.rainbowCircle}>
                      <View style={[styles.rainbowSlice, { backgroundColor: '#E74C3C' }]} />
                      <View style={[styles.rainbowSlice, { backgroundColor: '#F1C40F' }]} />
                      <View style={[styles.rainbowSlice, { backgroundColor: '#2ECC71' }]} />
                      <View style={[styles.rainbowSlice, { backgroundColor: '#3498DB' }]} />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: colorOption.hex },
                        colorOption.name === 'White' && styles.colorCircleBorder,
                      ]}
                    />
                  )}
                  <Text style={styles.colorLabel}>{colorOption.name}</Text>
                </Pressable>
              ))}
            </View>
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
            <Text style={styles.label}>Reward Amount</Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefixText]}
                value={rewardAmount}
                onChangeText={(text) => {
                  // Only allow numbers and decimal point
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  // Only allow one decimal point
                  const parts = cleaned.split('.');
                  if (parts.length > 2) return;
                  // Limit to 2 decimal places
                  if (parts[1] && parts[1].length > 2) return;
                  setRewardAmount(cleaned);
                }}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
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
              disabled={saving}>
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 70,
  },
  colorOptionSelected: {
    borderColor: Colors.violet.primary,
    backgroundColor: 'rgba(59, 24, 119, 0.1)',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  colorCircleBorder: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rainbowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 4,
  },
  rainbowSlice: {
    flex: 1,
    height: '100%',
  },
  colorLabel: {
    fontSize: 12,
    textAlign: 'center',
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
    backgroundColor: Colors.violet.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.violet.primary,
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
    color: Colors.violet.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
