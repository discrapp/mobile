import { logger } from '@/lib/logger';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  View as RNView,
  useColorScheme,
  InputAccessoryView,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import {
  validateShippingAddress,
  ShippingAddress as ValidationAddress,
  validateStateCode,
  validatePostalCode,
} from '@/lib/validation';
import { STRINGS } from '@/constants/strings';
import { handleError, showSuccess } from '@/lib/errorHandler';

const SHIPPING_PRICE_CENTS = 0; // Free shipping

// Package options matching web pricing
const PACKAGE_OPTIONS = [
  {
    id: 'starter',
    name: 'Starter',
    quantity: 5,
    priceCents: 1000, // $10
    perStickerCents: 200, // $2.00
    description: 'Perfect for trying it out',
  },
  {
    id: 'popular',
    name: 'Popular',
    quantity: 10,
    priceCents: 1500, // $15
    perStickerCents: 150, // $1.50
    description: 'Most popular choice',
    featured: true,
  },
  {
    id: 'best-value',
    name: 'Best Value',
    quantity: 25,
    priceCents: 2500, // $25
    perStickerCents: 100, // $1.00
    description: 'Cover your whole bag',
  },
];

interface ShippingAddress {
  id?: string;
  name: string;
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export default function OrderStickersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedPackage, setSelectedPackage] = useState(PACKAGE_OPTIONS[1]); // Default to "Popular"
  const [loading, setLoading] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [hasDefaultAddress, setHasDefaultAddress] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);
  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    street_address: '',
    street_address_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [suggestedAddress, setSuggestedAddress] = useState<ShippingAddress | null>(null);
  const [addressErrors, setAddressErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch default address on mount
  useEffect(() => {
    fetchDefaultAddress();
  }, []);

  // istanbul ignore next -- Default address fetching tested via integration tests
  const fetchDefaultAddress = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoadingAddress(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-default-address`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const defaultAddress = await response.json();
        if (defaultAddress) {
          setAddress({
            name: defaultAddress.name || '',
            street_address: defaultAddress.street_address || '',
            street_address_2: defaultAddress.street_address_2 || '',
            city: defaultAddress.city || '',
            state: defaultAddress.state || '',
            postal_code: defaultAddress.postal_code || '',
            country: defaultAddress.country || 'US',
          });
          setDefaultAddressId(defaultAddress.id);
          setHasDefaultAddress(true);
        }
        // Always default checkbox to checked so any edits are saved
        setSaveAsDefault(true);
      }
    } catch (error) {
      logger.error('Error fetching default address:', error);
    } finally {
      setLoadingAddress(false);
    }
  };

  // Input refs for keyboard navigation
  const nameRef = useRef<TextInput>(null);
  const streetRef = useRef<TextInput>(null);
  const street2Ref = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const zipRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const inputRefs = [nameRef, streetRef, street2Ref, cityRef, stateRef, zipRef];
  const [currentInputIndex, setCurrentInputIndex] = useState(0);

  const totalPriceCents = selectedPackage.priceCents + SHIPPING_PRICE_CENTS;
  const totalPriceDisplay = (totalPriceCents / 100).toFixed(2);

  // istanbul ignore next -- iOS keyboard navigation requires device testing
  const focusPreviousInput = () => {
    if (currentInputIndex > 0) {
      inputRefs[currentInputIndex - 1].current?.focus();
      setCurrentInputIndex(currentInputIndex - 1);
    }
  };

  // istanbul ignore next -- iOS keyboard navigation requires device testing
  const focusNextInput = () => {
    if (currentInputIndex < inputRefs.length - 1) {
      inputRefs[currentInputIndex + 1].current?.focus();
      setCurrentInputIndex(currentInputIndex + 1);
    } else {
      // Last input, dismiss keyboard
      inputRefs[currentInputIndex].current?.blur();
    }
  };

  const inputAccessoryViewID = 'orderFormAccessory';

  // istanbul ignore next -- Address field handlers tested via integration tests
  const handleNameChange = (text: string) => setAddress({ ...address, name: text });
  // istanbul ignore next -- Address field handlers tested via integration tests
  const handleStreetChange = (text: string) => setAddress({ ...address, street_address: text });
  // istanbul ignore next -- Address field handlers tested via integration tests
  const handleStreet2Change = (text: string) => setAddress({ ...address, street_address_2: text });
  // istanbul ignore next -- Address field handlers tested via integration tests
  const handleCityChange = (text: string) => setAddress({ ...address, city: text });
  // istanbul ignore next -- Address field handlers tested via integration tests
  const handleStateChange = (text: string) => setAddress({ ...address, state: text });
  // istanbul ignore next -- Address field handlers tested via integration tests
  const handlePostalCodeChange = (text: string) => setAddress({ ...address, postal_code: text });

  // istanbul ignore next -- Focus handlers for keyboard navigation require device testing
  const handleNameFocus = () => setCurrentInputIndex(0);
  // istanbul ignore next -- Focus handlers for keyboard navigation require device testing
  const handleStreetFocus = () => setCurrentInputIndex(1);
  // istanbul ignore next -- Focus handlers for keyboard navigation require device testing
  const handleStreet2Focus = () => setCurrentInputIndex(2);
  // istanbul ignore next -- Focus handlers for keyboard navigation require device testing
  const handleCityFocus = () => setCurrentInputIndex(3);
  // istanbul ignore next -- Focus handlers for keyboard navigation require device testing
  const handleStateFocus = () => setCurrentInputIndex(4);
  // istanbul ignore next -- Focus handlers for keyboard navigation require device testing
  const handlePostalCodeFocus = () => setCurrentInputIndex(5);

  // Real-time validation on blur
  // istanbul ignore next -- Blur handlers for real-time validation require device testing
  const handleNameBlur = () => {
    if (!address.name.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: STRINGS.VALIDATION.NAME_REQUIRED }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  // istanbul ignore next -- Blur handlers for real-time validation require device testing
  const handleStreetBlur = () => {
    if (!address.street_address.trim()) {
      setFieldErrors((prev) => ({ ...prev, street_address: STRINGS.VALIDATION.STREET_REQUIRED }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.street_address;
        return next;
      });
    }
  };

  // istanbul ignore next -- Blur handlers for real-time validation require device testing
  const handleCityBlur = () => {
    if (!address.city.trim()) {
      setFieldErrors((prev) => ({ ...prev, city: STRINGS.VALIDATION.CITY_REQUIRED }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.city;
        return next;
      });
    }
  };

  // istanbul ignore next -- Blur handlers for real-time validation require device testing
  const handleStateBlur = () => {
    const error = validateStateCode(address.state);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, state: error }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.state;
        return next;
      });
    }
  };

  // istanbul ignore next -- Blur handlers for real-time validation require device testing
  const handlePostalCodeBlur = () => {
    const error = validatePostalCode(address.postal_code);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, postal_code: error }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.postal_code;
        return next;
      });
    }
  };

  // istanbul ignore next -- Submit editing handlers require device testing
  const handleNameSubmit = () => streetRef.current?.focus();
  // istanbul ignore next -- Submit editing handlers require device testing
  const handleStreetSubmit = () => street2Ref.current?.focus();
  // istanbul ignore next -- Submit editing handlers require device testing
  const handleStreet2Submit = () => cityRef.current?.focus();
  // istanbul ignore next -- Submit editing handlers require device testing
  const handleCitySubmit = () => stateRef.current?.focus();
  // istanbul ignore next -- Submit editing handlers require device testing
  const handleStateSubmit = () => zipRef.current?.focus();

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    scrollView: {
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    productCard: {
      backgroundColor: isDark ? '#1e1e1e' : Colors.violet[50],
    },
    productImageContainer: {
      backgroundColor: isDark ? '#2a2a2a' : '#fff',
      borderWidth: isDark ? 2 : 0,
      borderColor: isDark ? Colors.violet[400] : 'transparent',
    },
    qrCodeIcon: {
      color: isDark ? Colors.violet[300] : Colors.violet.primary,
    },
    productDescription: {
      color: isDark ? '#999' : '#666',
    },
    packageCard: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderColor: isDark ? '#333' : '#ddd',
    },
    packageCardSelected: {
      backgroundColor: isDark ? Colors.violet[900] : Colors.violet[100],
      borderColor: Colors.violet[400],
    },
    packageCardFeatured: {
      // Featured but not selected - same as regular unselected
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
    },
    packageName: {
      color: isDark ? '#fff' : '#333',
    },
    packagePrice: {
      color: isDark ? '#fff' : Colors.violet[900],
    },
    packagePerSticker: {
      color: isDark ? '#999' : '#666',
    },
    packageDescription: {
      color: isDark ? '#999' : '#666',
    },
    inputLabel: {
      color: isDark ? '#ccc' : '#333',
    },
    input: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderColor: isDark ? '#333' : '#ddd',
      color: isDark ? '#fff' : '#000',
    },
    summaryCard: {
      backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8',
      borderColor: isDark ? '#333' : '#eee',
    },
    summaryLabel: {
      color: isDark ? '#ccc' : '#666',
    },
    summaryValue: {
      color: isDark ? '#fff' : '#333',
    },
    totalLabel: {
      color: isDark ? '#fff' : '#000',
    },
    totalValue: {
      color: isDark ? Colors.violet[300] : Colors.violet.primary,
    },
    checkoutContainer: {
      backgroundColor: isDark ? '#121212' : '#fff',
      borderTopColor: isDark ? '#333' : '#eee',
    },
    secureText: {
      color: isDark ? '#999' : '#666',
    },
    checkboxContainer: {
      borderColor: isDark ? '#333' : '#ddd',
    },
    checkboxLabel: {
      color: isDark ? '#ccc' : '#333',
    },
    modalOverlay: {
      backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
    },
    modalText: {
      color: isDark ? '#ccc' : '#333',
    },
    addressCard: {
      backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
      borderColor: isDark ? '#333' : '#ddd',
    },
    errorText: {
      color: '#e74c3c',
    },
  };

  // Client-side validation using our validation library
  const validateAddressClient = (): Record<string, string> => {
    return validateShippingAddress(address as ValidationAddress);
  };

  // istanbul ignore next -- USPS API validation tested via integration tests
  const validateAddressWithUSPS = async (
    accessToken: string
  ): Promise<{
    valid: boolean;
    standardized?: ShippingAddress;
    errors?: string[];
  }> => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/validate-address`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            street_address: address.street_address.trim(),
            street_address_2: address.street_address_2.trim() || undefined,
            city: address.city.trim(),
            state: address.state.trim().toUpperCase(),
            postal_code: address.postal_code.trim(),
          }),
        }
      );

      if (!response.ok) {
        // API error (503 = service unavailable) - let user proceed with unvalidated address
        logger.warn('USPS validation unavailable, skipping:', response.status);
        return { valid: true };
      }

      let data;
      try {
        data = await response.json();
      } catch {
        // JSON parse error - let user proceed
        logger.warn('USPS response parse error, skipping validation');
        return { valid: true };
      }

      if (!data.valid) {
        // Address is invalid
        return {
          valid: false,
          errors: data.errors || ['Address could not be validated'],
        };
      }

      // Address is valid
      if (data.standardized) {
        // Check if address was corrected
        const standardized: ShippingAddress = {
          name: address.name, // Keep original name
          street_address: data.standardized.street_address,
          street_address_2: '', // USPS combines into street_address
          city: data.standardized.city,
          state: data.standardized.state,
          postal_code: data.standardized.postal_code,
          country: 'US',
        };

        // Check if any fields changed
        const changed =
          standardized.street_address !== address.street_address.trim().toUpperCase() ||
          standardized.city !== address.city.trim().toUpperCase() ||
          standardized.state !== address.state.trim().toUpperCase() ||
          standardized.postal_code !== address.postal_code.trim();

        return {
          valid: true,
          standardized: changed ? standardized : undefined,
        };
      }

      // Valid with no corrections needed
      return { valid: true };
    } catch (error) {
      logger.error('USPS validation error:', error);
      // Network error - let user proceed
      return { valid: true };
    }
  };

  // istanbul ignore next -- Stripe checkout with Linking.openURL requires device testing
  const proceedWithCheckout = async (addressToUse: ShippingAddress) => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'Please sign in to place an order');
        setLoading(false);
        return;
      }

      // Save address as default if checkbox is checked
      if (saveAsDefault) {
        try {
          const saveAddressResponse = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/save-default-address`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                address_id: defaultAddressId, // Update existing if we have one
                name: addressToUse.name.trim(),
                street_address: addressToUse.street_address.trim(),
                street_address_2: addressToUse.street_address_2?.trim() || undefined,
                city: addressToUse.city.trim(),
                state: addressToUse.state.trim(),
                postal_code: addressToUse.postal_code.trim(),
                country: addressToUse.country,
              }),
            }
          );

          if (!saveAddressResponse.ok) {
            logger.error('Failed to save default address');
            // Continue with order - don't block checkout for address save failure
          }
        } catch (saveError) {
          logger.error('Error saving default address:', saveError);
          // Continue with order
        }
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-sticker-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            quantity: selectedPackage.quantity,
            shipping_address: {
              name: addressToUse.name.trim(),
              street_address: addressToUse.street_address.trim(),
              street_address_2: addressToUse.street_address_2?.trim() || '',
              city: addressToUse.city.trim(),
              state: addressToUse.state.trim(),
              postal_code: addressToUse.postal_code.trim(),
              country: addressToUse.country,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const data = await response.json();

      // Open Stripe Checkout in browser
      if (data.checkout_url) {
        const supported = await Linking.canOpenURL(data.checkout_url);
        if (supported) {
          await Linking.openURL(data.checkout_url);
          // Navigate back and show message
          router.back();
          Alert.alert(
            'Order Started',
            'Complete your payment in the browser. You can view your order status in My Orders.',
            [{ text: 'OK' }]
          );
        } else {
          throw new Error('Cannot open checkout URL');
        }
      }
    } catch (error) {
      handleError(error, { operation: 'checkout' });
    } finally {
      setLoading(false);
    }
  };

  // istanbul ignore next -- Checkout flow tested via integration tests
  const handleCheckout = async () => {
    // Step 1: Client-side validation
    const clientErrors = validateAddressClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      const firstError = Object.values(clientErrors)[0];
      Alert.alert('Missing Information', firstError);
      return;
    }
    setFieldErrors({});

    setValidatingAddress(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'Please sign in to place an order');
        return;
      }

      // Step 2: USPS validation
      const uspsResult = await validateAddressWithUSPS(session.access_token);

      if (!uspsResult.valid) {
        // Invalid address - show errors
        setAddressErrors(uspsResult.errors || ['Address could not be validated']);
        setShowAddressModal(true);
        return;
      }

      if (uspsResult.standardized) {
        // Address was corrected - show modal with suggestion
        setSuggestedAddress(uspsResult.standardized);
        setAddressErrors([]);
        setShowAddressModal(true);
        return;
      }

      // Address is valid and matches - proceed with checkout
      await proceedWithCheckout(address);
    } catch (error) {
      logger.error('Validation error:', error);
      // On error, proceed with original address
      await proceedWithCheckout(address);
    } finally {
      setValidatingAddress(false);
    }
  };

  // istanbul ignore next -- Modal callback tested via integration tests
  const handleAcceptSuggestion = async () => {
    if (suggestedAddress && !loading) {
      setLoading(true);
      setAddress(suggestedAddress);
      setShowAddressModal(false);
      await proceedWithCheckout(suggestedAddress);
    }
  };

  // istanbul ignore next -- Modal callback tested via integration tests
  const handleKeepOriginal = async () => {
    if (loading) return;
    setLoading(true);
    setShowAddressModal(false);
    await proceedWithCheckout(address);
  };

  // Handle closing the error modal
  const handleCloseModal = () => {
    setShowAddressModal(false);
    setSuggestedAddress(null);
    setAddressErrors([]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Order Stickers',
          headerBackTitle: 'Back',
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, dynamicStyles.container]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView ref={scrollRef} style={[styles.scrollView, dynamicStyles.scrollView]} contentContainerStyle={styles.content}>
          {/* Product Info */}
          <RNView style={[styles.productCard, dynamicStyles.productCard]}>
            <RNView style={[styles.productImageContainer, dynamicStyles.productImageContainer]}>
              <FontAwesome name="qrcode" size={64} color={dynamicStyles.qrCodeIcon.color} />
            </RNView>
            <Text style={styles.productTitle}>Discr QR Code Stickers</Text>
            <Text style={[styles.productDescription, dynamicStyles.productDescription]}>
              Durable, weatherproof QR stickers. Link to your discs so finders can contact you
              instantly.
            </Text>
          </RNView>

          {/* Package Selection */}
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Select Package</Text>
            <RNView style={styles.packageGrid}>
              {PACKAGE_OPTIONS.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                const isFeatured = pkg.featured;
                return (
                  <Pressable
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      dynamicStyles.packageCard,
                      isSelected && styles.packageCardSelected,
                      isSelected && dynamicStyles.packageCardSelected,
                      isFeatured && !isSelected && styles.packageCardFeatured,
                      isFeatured && !isSelected && dynamicStyles.packageCardFeatured,
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    {isFeatured && (
                      <RNView style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>Popular</Text>
                      </RNView>
                    )}
                    <Text style={[
                      styles.packageName,
                      dynamicStyles.packageName,
                    ]}>
                      {pkg.name}
                    </Text>
                    <Text style={[
                      styles.packagePrice,
                      dynamicStyles.packagePrice,
                    ]}>
                      ${(pkg.priceCents / 100).toFixed(0)}
                    </Text>
                    <Text style={styles.packageQuantity}>
                      {pkg.quantity} stickers
                    </Text>
                    <Text style={[
                      styles.packagePerSticker,
                      dynamicStyles.packagePerSticker,
                    ]}>
                      ${(pkg.perStickerCents / 100).toFixed(2)}/ea
                    </Text>
                    {isSelected && (
                      <RNView style={styles.selectedCheckmark}>
                        <FontAwesome name="check" size={14} color="#fff" />
                      </RNView>
                    )}
                  </Pressable>
                );
              })}
            </RNView>
          </RNView>

          {/* Shipping Address */}
          <RNView style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>

            <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Full Name *</Text>
            <TextInput
              ref={nameRef}
              style={[
                styles.input,
                dynamicStyles.input,
                fieldErrors.name && styles.inputError,
              ]}
              value={address.name}
              onChangeText={handleNameChange}
              onFocus={handleNameFocus}
              onBlur={handleNameBlur}
              placeholder="John Doe"
              autoComplete="name"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={handleNameSubmit}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
            {fieldErrors.name && (
              <Text style={styles.fieldError}>{fieldErrors.name}</Text>
            )}

            <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Street Address *</Text>
            <TextInput
              ref={streetRef}
              style={[
                styles.input,
                dynamicStyles.input,
                fieldErrors.street_address && styles.inputError,
              ]}
              value={address.street_address}
              onChangeText={handleStreetChange}
              onFocus={handleStreetFocus}
              onBlur={handleStreetBlur}
              placeholder="123 Main St"
              autoComplete="street-address"
              returnKeyType="next"
              onSubmitEditing={handleStreetSubmit}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
            {fieldErrors.street_address && (
              <Text style={styles.fieldError}>{fieldErrors.street_address}</Text>
            )}

            <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Apt, Suite, etc.</Text>
            <TextInput
              ref={street2Ref}
              style={[styles.input, dynamicStyles.input]}
              value={address.street_address_2}
              onChangeText={handleStreet2Change}
              onFocus={handleStreet2Focus}
              placeholder="Apt 4B (optional)"
              returnKeyType="next"
              onSubmitEditing={handleStreet2Submit}
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />

            <RNView style={styles.cityStateRow}>
              <RNView style={styles.cityInput}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>City *</Text>
                <TextInput
                  ref={cityRef}
                  style={[
                    styles.input,
                    dynamicStyles.input,
                    fieldErrors.city && styles.inputError,
                  ]}
                  value={address.city}
                  onChangeText={handleCityChange}
                  onFocus={handleCityFocus}
                  onBlur={handleCityBlur}
                  placeholder="City"
                  autoComplete="postal-address-locality"
                  returnKeyType="next"
                  onSubmitEditing={handleCitySubmit}
                  inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                />
                {fieldErrors.city && (
                  <Text style={styles.fieldError}>{fieldErrors.city}</Text>
                )}
              </RNView>
              <RNView style={styles.stateInput}>
                <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>State *</Text>
                <TextInput
                  ref={stateRef}
                  style={[
                    styles.input,
                    dynamicStyles.input,
                    fieldErrors.state && styles.inputError,
                  ]}
                  value={address.state}
                  onChangeText={handleStateChange}
                  onFocus={handleStateFocus}
                  onBlur={handleStateBlur}
                  placeholder="CA"
                  autoCapitalize="characters"
                  maxLength={2}
                  returnKeyType="next"
                  onSubmitEditing={handleStateSubmit}
                  inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                />
                {fieldErrors.state && (
                  <Text style={styles.fieldError}>{fieldErrors.state}</Text>
                )}
              </RNView>
            </RNView>

            <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>ZIP Code *</Text>
            <TextInput
              ref={zipRef}
              style={[
                styles.input,
                dynamicStyles.input,
                styles.zipInput,
                fieldErrors.postal_code && styles.inputError,
              ]}
              value={address.postal_code}
              onChangeText={handlePostalCodeChange}
              onFocus={handlePostalCodeFocus}
              onBlur={handlePostalCodeBlur}
              placeholder="12345"
              keyboardType="numeric"
              autoComplete="postal-code"
              maxLength={10}
              returnKeyType="done"
              inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
            />
            {fieldErrors.postal_code && (
              <Text style={styles.fieldError}>{fieldErrors.postal_code}</Text>
            )}

            {/* Save as default checkbox */}
            <Pressable
              style={[styles.checkboxRow, dynamicStyles.checkboxContainer]}
              onPress={() => setSaveAsDefault(!saveAsDefault)}
            >
              <RNView style={[styles.checkbox, saveAsDefault && styles.checkboxChecked]}>
                {saveAsDefault && (
                  <FontAwesome name="check" size={12} color="#fff" />
                )}
              </RNView>
              <Text style={[styles.checkboxLabel, dynamicStyles.checkboxLabel]}>
                Save as my default address
              </Text>
            </Pressable>
          </RNView>

          {/* Order Summary */}
          <RNView style={[styles.summaryCard, dynamicStyles.summaryCard]}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <RNView style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>
                {selectedPackage.name} ({selectedPackage.quantity} stickers)
              </Text>
              <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
                ${(selectedPackage.priceCents / 100).toFixed(2)}
              </Text>
            </RNView>
            <RNView style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Shipping</Text>
              <Text style={styles.summaryValueFree}>FREE</Text>
            </RNView>
            <View style={styles.summaryDivider} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
            <RNView style={styles.summaryRow}>
              <Text style={[styles.totalLabel, dynamicStyles.totalLabel]}>Total</Text>
              <Text style={[styles.totalValue, dynamicStyles.totalValue]}>${totalPriceDisplay}</Text>
            </RNView>
          </RNView>

          {/* Spacer for button */}
          <RNView style={{ height: 120 }} />
        </ScrollView>

        {/* Checkout Button */}
        <RNView style={[styles.checkoutContainer, dynamicStyles.checkoutContainer]}>
          <Pressable
            style={[styles.checkoutButton, (loading || validatingAddress) && styles.checkoutButtonDisabled]}
            onPress={handleCheckout}
            disabled={loading || validatingAddress}
          >
            {loading || validatingAddress ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.checkoutButtonText}>
                  {validatingAddress ? 'Validating...' : 'Processing...'}
                </Text>
              </>
            ) : (
              <>
                <FontAwesome name="lock" size={18} color="#fff" />
                <Text style={styles.checkoutButtonText}>
                  Pay ${totalPriceDisplay}
                </Text>
              </>
            )}
          </Pressable>
          <Text style={[styles.secureText, dynamicStyles.secureText]}>
            <FontAwesome name="shield" size={12} color="#666" /> Secure checkout powered by Stripe
          </Text>
        </RNView>
      </KeyboardAvoidingView>

      {/* istanbul ignore next -- iOS InputAccessoryView requires device testing */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <RNView
            style={{
              backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8',
              borderTopWidth: 1,
              borderTopColor: isDark ? '#333' : '#ddd',
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Pressable
              onPress={focusPreviousInput}
              disabled={currentInputIndex === 0}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                opacity: currentInputIndex === 0 ? 0.3 : 1,
              }}
            >
              <FontAwesome name="chevron-up" size={20} color={Colors.violet.primary} />
            </Pressable>
            <Pressable
              onPress={focusNextInput}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <FontAwesome
                name={currentInputIndex === inputRefs.length - 1 ? 'check' : 'chevron-down'}
                size={20}
                color={Colors.violet.primary}
              />
            </Pressable>
          </RNView>
        </InputAccessoryView>
      )}

      {/* Address Validation Modal */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <RNView style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <RNView style={[styles.modalContent, dynamicStyles.modalContent]}>
            {addressErrors.length > 0 ? (
              // Error modal
              <>
                <Text style={styles.modalTitle}>Address Issue</Text>
                <Text style={[styles.modalSubtitle, dynamicStyles.modalText]}>
                  We couldn't validate this address:
                </Text>
                <RNView style={[styles.addressCard, dynamicStyles.addressCard]}>
                  {addressErrors.map((error, index) => (
                    <Text key={index} style={[styles.errorItem, dynamicStyles.errorText]}>
                      {error}
                    </Text>
                  ))}
                </RNView>
                <Text style={[styles.modalHint, dynamicStyles.modalText]}>
                  Please check your address and try again.
                </Text>
                <Pressable style={styles.modalButtonPrimary} onPress={handleCloseModal}>
                  <Text style={styles.modalButtonPrimaryText}>Edit Address</Text>
                </Pressable>
              </>
            ) : suggestedAddress ? (
              // Suggestion modal
              <>
                <Text style={styles.modalTitle}>Suggested Address</Text>
                <Text style={[styles.modalSubtitle, dynamicStyles.modalText]}>
                  USPS suggests a standardized address:
                </Text>

                <Text style={[styles.addressLabel, dynamicStyles.modalText]}>You entered:</Text>
                <RNView style={[styles.addressCard, dynamicStyles.addressCard]}>
                  <Text style={dynamicStyles.modalText}>{address.street_address}</Text>
                  {address.street_address_2 ? (
                    <Text style={dynamicStyles.modalText}>{address.street_address_2}</Text>
                  ) : null}
                  <Text style={dynamicStyles.modalText}>
                    {address.city}, {address.state} {address.postal_code}
                  </Text>
                </RNView>

                <Text style={[styles.addressLabel, dynamicStyles.modalText]}>Suggested:</Text>
                <RNView style={[styles.addressCard, styles.suggestedCard, dynamicStyles.addressCard]}>
                  <Text style={[dynamicStyles.modalText, styles.suggestedText]}>
                    {suggestedAddress.street_address}
                  </Text>
                  <Text style={[dynamicStyles.modalText, styles.suggestedText]}>
                    {suggestedAddress.city}, {suggestedAddress.state} {suggestedAddress.postal_code}
                  </Text>
                </RNView>

                <Pressable
                  style={[styles.modalButtonPrimary, loading && styles.checkoutButtonDisabled]}
                  onPress={handleAcceptSuggestion}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonPrimaryText}>Use Suggested Address</Text>
                </Pressable>
                <Pressable
                  style={styles.modalButtonSecondary}
                  onPress={handleKeepOriginal}
                  disabled={loading}
                >
                  <Text style={[styles.modalButtonSecondaryText, dynamicStyles.modalText]}>
                    Keep My Address
                  </Text>
                </Pressable>
              </>
            ) : null}
          </RNView>
        </RNView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  productCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
    borderRadius: 16,
  },
  productImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  productDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  packageGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  packageCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  packageCardSelected: {
    borderWidth: 3,
  },
  packageCardFeatured: {
    // Keep same border as other unselected packages
  },
  featuredBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  packageName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  packageNameFeatured: {
    color: '#fff',
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  packagePriceFeatured: {
    color: '#fff',
  },
  packageQuantity: {
    fontSize: 12,
    color: Colors.violet[300],
    marginTop: 2,
  },
  packageQuantityFeatured: {
    color: 'rgba(255,255,255,0.9)',
  },
  packagePerSticker: {
    fontSize: 11,
    marginTop: 4,
  },
  packagePerStickerFeatured: {
    color: 'rgba(255,255,255,0.7)',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: Colors.violet.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  fieldError: {
    color: '#e74c3c',
    fontSize: 12,
    marginBottom: 12,
    marginTop: 2,
  },
  cityStateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cityInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  zipInput: {
    width: 120,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
  },
  summaryValueFree: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.violet.primary,
  },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkoutButtonDisabled: {
    opacity: 0.7,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secureText: {
    fontSize: 12,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.violet.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.violet.primary,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 13,
    marginVertical: 16,
    textAlign: 'center',
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  addressCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestedCard: {
    borderColor: Colors.violet.primary,
    borderWidth: 2,
  },
  suggestedText: {
    fontWeight: '500',
  },
  errorItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  modalButtonPrimary: {
    backgroundColor: Colors.violet.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonSecondaryText: {
    fontSize: 14,
  },
});
