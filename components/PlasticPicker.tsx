import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Modal,
  useColorScheme,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePlasticTypes } from '@/hooks/usePlasticTypes';
import Colors from '@/constants/Colors';

interface PlasticPickerProps {
  value: string;
  onChange: (value: string) => void;
  manufacturer: string;
  textColor: string;
  /** Optional array of user's custom plastics from their discs */
  userPlastics?: string[];
}

/**
 * Plastic type picker that shows manufacturer-specific options from the API.
 * Falls back to text input if no plastics are available for the manufacturer.
 * Custom plastics can be submitted for admin approval.
 */
export function PlasticPicker({
  value,
  onChange,
  manufacturer,
  textColor,
  userPlastics = [],
}: PlasticPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [modalVisible, setModalVisible] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get plastic types from API
  const { plastics: plasticOptions, loading, error, submitPlastic } = usePlasticTypes(
    manufacturer,
    userPlastics
  );

  const handleSelect = useCallback(
    (plastic: string) => {
      onChange(plastic);
      setModalVisible(false);
    },
    [onChange]
  );

  const handleCustomSubmit = useCallback(async () => {
    const trimmed = customValue.trim();
    if (!trimmed || !manufacturer) return;

    setSubmitting(true);
    try {
      // Submit to API for approval (will be pending until admin approves)
      await submitPlastic(manufacturer, trimmed);
      // Use the custom value immediately
      onChange(trimmed);
      setCustomValue('');
      setModalVisible(false);
    } finally {
      setSubmitting(false);
    }
  }, [customValue, manufacturer, onChange, submitPlastic]);

  const dynamicStyles = {
    picker: {
      borderColor: isDark ? '#333' : '#ccc',
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
    },
    modalOverlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
    },
    optionItem: {
      borderBottomColor: isDark ? '#333' : '#eee',
    },
    selectedOption: {
      backgroundColor: isDark ? 'rgba(59, 24, 119, 0.3)' : 'rgba(59, 24, 119, 0.1)',
    },
    customInput: {
      borderColor: isDark ? '#333' : '#ccc',
      backgroundColor: isDark ? '#0d0d0d' : '#f5f5f5',
      color: textColor,
    },
  };

  // If no manufacturer selected, show text input
  if (!manufacturer) {
    return (
      <TextInput
        style={[styles.textInput, dynamicStyles.picker, { color: textColor }]}
        value={value}
        onChangeText={onChange}
        placeholder="e.g., Star"
        placeholderTextColor="#999"
      />
    );
  }

  // If loading and no cached plastics, show loading placeholder
  if (loading && plasticOptions.length === 0) {
    return (
      <View style={[styles.picker, dynamicStyles.picker]}>
        <ActivityIndicator size="small" color={Colors.violet.primary} />
        <Text style={[styles.pickerText, { color: '#999', marginLeft: 8 }]}>
          Loading plastics...
        </Text>
      </View>
    );
  }

  // If error and no plastics, fall back to text input
  if (error && plasticOptions.length === 0) {
    return (
      <TextInput
        style={[styles.textInput, dynamicStyles.picker, { color: textColor }]}
        value={value}
        onChangeText={onChange}
        placeholder="e.g., Star"
        placeholderTextColor="#999"
      />
    );
  }

  // If no plastics available for this manufacturer (even after loading), fall back to text input
  if (plasticOptions.length === 0) {
    return (
      <TextInput
        style={[styles.textInput, dynamicStyles.picker, { color: textColor }]}
        value={value}
        onChangeText={onChange}
        placeholder="e.g., Star"
        placeholderTextColor="#999"
      />
    );
  }

  return (
    <>
      <Pressable
        style={[styles.picker, dynamicStyles.picker]}
        onPress={() => setModalVisible(true)}>
        <Text style={[styles.pickerText, { color: value ? textColor : '#999' }]}>
          {value || 'Select plastic type'}
        </Text>
        <FontAwesome name="chevron-down" size={14} color="#999" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={[styles.modalOverlay, dynamicStyles.modalOverlay]}
          onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Plastic</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={20} color={textColor} />
              </Pressable>
            </View>

            <ScrollView style={styles.optionsList}>
              {plasticOptions.map((plastic) => (
                <Pressable
                  key={plastic}
                  style={[
                    styles.optionItem,
                    dynamicStyles.optionItem,
                    value === plastic && dynamicStyles.selectedOption,
                  ]}
                  onPress={() => handleSelect(plastic)}>
                  <Text style={[styles.optionText, { color: textColor }]}>{plastic}</Text>
                  {value === plastic && (
                    <FontAwesome name="check" size={16} color={isDark ? '#fff' : '#3B1877'} />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Custom entry section */}
            <View style={styles.customSection}>
              <Text style={[styles.customLabel, { color: isDark ? '#999' : '#666' }]}>
                Or enter custom:
              </Text>
              <View style={styles.customInputRow}>
                <TextInput
                  style={[styles.customInput, dynamicStyles.customInput]}
                  value={customValue}
                  onChangeText={setCustomValue}
                  placeholder="Custom plastic"
                  placeholderTextColor="#999"
                  onSubmitEditing={handleCustomSubmit}
                  editable={!submitting}
                />
                <Pressable
                  style={[
                    styles.customButton,
                    (!customValue.trim() || submitting) && styles.customButtonDisabled,
                  ]}
                  onPress={handleCustomSubmit}
                  disabled={!customValue.trim() || submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.customButtonText}>Add</Text>
                  )}
                </Pressable>
              </View>
              <Text style={[styles.customHint, { color: isDark ? '#666' : '#999' }]}>
                Custom plastics will be submitted for approval
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  customSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  customLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  customButton: {
    backgroundColor: '#3B1877',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  customButtonDisabled: {
    opacity: 0.5,
  },
  customButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  customHint: {
    fontSize: 12,
    marginTop: 8,
  },
});
