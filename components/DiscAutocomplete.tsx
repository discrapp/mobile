import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/Themed';
import { useDiscCatalogSearch, CatalogDisc } from '@/hooks/useDiscCatalogSearch';

interface DiscAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectDisc: (disc: CatalogDisc) => void;
  placeholder?: string;
  error?: string;
  textColor: string;
}

/**
 * Autocomplete input for disc mold names.
 * Searches the disc catalog API and shows suggestions.
 * When a disc is selected, it passes the full disc data to the parent.
 */
export function DiscAutocomplete({
  value,
  onChangeText,
  onSelectDisc,
  placeholder = 'e.g., Destroyer',
  error,
  textColor,
}: DiscAutocompleteProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { results, loading, search, clearResults } = useDiscCatalogSearch();

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      search(text);
      setShowSuggestions(true);
    },
    [onChangeText, search]
  );

  const handleSelectDisc = useCallback(
    (disc: CatalogDisc) => {
      onChangeText(disc.mold);
      onSelectDisc(disc);
      clearResults();
      setShowSuggestions(false);
    },
    [onChangeText, onSelectDisc, clearResults]
  );

  const handleBlur = useCallback(() => {
    // Delay hiding suggestions to allow tap to register
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  const handleFocus = useCallback(() => {
    if (value.length >= 2 && results.length > 0) {
      setShowSuggestions(true);
    }
  }, [value, results]);

  const dynamicStyles = {
    input: {
      borderColor: error ? '#ff4444' : isDark ? '#333' : '#ccc',
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    dropdown: {
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      borderColor: isDark ? '#333' : '#ccc',
    },
    suggestionItem: {
      borderBottomColor: isDark ? '#333' : '#eee',
    },
    manufacturerText: {
      color: isDark ? '#999' : '#666',
    },
    flightNumbers: {
      color: isDark ? '#888' : '#888',
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, dynamicStyles.input, { color: textColor }]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize="words"
          autoCorrect={false}
        />
        {loading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
      </View>

      {showSuggestions && results.length > 0 && (
        <View style={[styles.dropdown, dynamicStyles.dropdown]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.suggestionList}>
            {results.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.suggestionItem, dynamicStyles.suggestionItem]}
                onPress={() => handleSelectDisc(item)}>
                <View style={styles.suggestionContent}>
                  <Text style={styles.moldName}>{item.mold}</Text>
                  <Text style={[styles.manufacturer, dynamicStyles.manufacturerText]}>
                    {item.manufacturer}
                  </Text>
                </View>
                {item.speed !== null && (
                  <Text style={[styles.flightNumbers, dynamicStyles.flightNumbers]}>
                    {item.speed} | {item.glide} | {item.turn} | {item.fade}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionContent: {
    flex: 1,
  },
  moldName: {
    fontSize: 16,
    fontWeight: '500',
  },
  manufacturer: {
    fontSize: 14,
    marginTop: 2,
  },
  flightNumbers: {
    fontSize: 12,
    marginLeft: 8,
  },
});
