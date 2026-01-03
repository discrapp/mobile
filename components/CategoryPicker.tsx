import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Modal,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DISC_CATEGORIES } from '@/constants/plasticTypes';

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  textColor: string;
}

/**
 * Disc category/type picker.
 * Shows predefined disc categories like Distance Driver, Midrange, Putter, etc.
 */
export function CategoryPicker({
  value,
  onChange,
  textColor,
}: CategoryPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = useCallback(
    (category: string) => {
      onChange(category);
      setModalVisible(false);
    },
    [onChange]
  );

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
  };

  return (
    <>
      <Pressable
        style={[styles.picker, dynamicStyles.picker]}
        onPress={() => setModalVisible(true)}>
        <Text style={[styles.pickerText, { color: value ? textColor : '#999' }]}>
          {value || 'Select disc type'}
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
              <Text style={styles.modalTitle}>Select Disc Type</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={20} color={textColor} />
              </Pressable>
            </View>

            <ScrollView style={styles.optionsList}>
              {DISC_CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.optionItem,
                    dynamicStyles.optionItem,
                    value === category && dynamicStyles.selectedOption,
                  ]}
                  onPress={() => handleSelect(category)}>
                  <Text style={[styles.optionText, { color: textColor }]}>{category}</Text>
                  {value === category && (
                    <FontAwesome name="check" size={16} color={isDark ? '#fff' : '#3B1877'} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
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
    maxHeight: 400,
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
});
