import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { validateFullSignUpForm, SignUpFormErrors } from '@/lib/validation';
import { handleError } from '@/lib/errorHandler';
import Colors from '@/constants/Colors';

const logo = require('@/assets/images/logo.png');

type ThrowingHand = 'right' | 'left';
type ThrowStyle = 'backhand' | 'forehand' | 'both';

export default function SignUp() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { signUp } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [throwingHand, setThrowingHand] = useState<ThrowingHand>('right');
  const [preferredThrowStyle, setPreferredThrowStyle] = useState<ThrowStyle>('backhand');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<SignUpFormErrors>({});

  // Auto-populate username from email
  useEffect(() => {
    if (!usernameManuallyEdited && email.includes('@')) {
      const emailPrefix = email.split('@')[0];
      // Clean up the prefix to be a valid username
      const cleanUsername = emailPrefix
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .substring(0, 30);
      setUsername(cleanUsername);
    }
  }, [email, usernameManuallyEdited]);

  const validateForm = () => {
    const newErrors = validateFullSignUpForm({
      email,
      password,
      confirmPassword,
      username,
      fullName,
      phoneNumber,
      throwingHand,
      preferredThrowStyle,
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        username: username.trim(),
        full_name: fullName.trim() || undefined,
        phone_number: phoneNumber.trim().replace(/[\s\-\(\)]/g, ''),
        throwing_hand: throwingHand,
        preferred_throw_style: preferredThrowStyle,
      };
      const { error } = await signUp(email.trim(), password, metadata);

      if (error) {
        handleError(error, { operation: 'sign-up' });
      } else {
        Alert.alert(
          'Success',
          'Account created! You can now sign in.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/sign-in'),
            },
          ]
        );
      }
    } catch (error) {
      handleError(error, { operation: 'sign-up' });
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#121212' : '#fff',
    },
    text: {
      color: isDark ? '#fff' : '#000',
    },
    subtitle: {
      color: isDark ? '#999' : '#666',
    },
    input: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderColor: isDark ? '#333' : '#ddd',
      color: isDark ? '#fff' : '#000',
    },
    label: {
      color: isDark ? '#fff' : '#000',
    },
    footerText: {
      color: isDark ? '#ccc' : '#666',
    },
    link: {
      color: isDark ? Colors.violet[400] : Colors.violet.primary,
    },
    toggleButton: {
      backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
      borderColor: isDark ? '#333' : '#ddd',
    },
    toggleButtonActive: {
      backgroundColor: Colors.violet.primary,
      borderColor: Colors.violet.primary,
    },
    toggleText: {
      color: isDark ? '#999' : '#666',
    },
    toggleTextActive: {
      color: '#fff',
    },
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, dynamicStyles.container]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={logo}
              style={styles.logo}
              resizeMode="contain"
              testID="app-logo"
            />
          </View>

          <Text style={[styles.title, dynamicStyles.text]}>Create Account</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Sign up to get started</Text>

          <View style={styles.form}>
            {/* Email - First so username can auto-populate */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Email</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                placeholderTextColor={isDark ? '#888' : '#999'}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                editable={!loading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Username - Auto-populated from email */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Username</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input, errors.username && styles.inputError]}
                placeholder="Choose a username"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setUsernameManuallyEdited(true);
                  if (errors.username) {
                    setErrors({ ...errors, username: undefined });
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username"
                editable={!loading}
              />
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
            </View>

            {/* Full Name - Optional */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>
                Full Name <Text style={styles.optionalLabel}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="Enter your full name"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
                editable={!loading}
              />
            </View>

            {/* Phone Number - Required */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Phone Number</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input, errors.phoneNumber && styles.inputError]}
                placeholder="Enter your phone number"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (errors.phoneNumber) {
                    setErrors({ ...errors, phoneNumber: undefined });
                  }
                }}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                editable={!loading}
              />
              {errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              )}
              <Text style={styles.helperText}>Used for disc recovery notifications</Text>
            </View>

            {/* Throwing Hand */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Throwing Hand</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonLeft,
                    dynamicStyles.toggleButton,
                    throwingHand === 'right' && dynamicStyles.toggleButtonActive,
                  ]}
                  onPress={() => setThrowingHand('right')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.toggleText,
                    dynamicStyles.toggleText,
                    throwingHand === 'right' && dynamicStyles.toggleTextActive,
                  ]}>
                    Right
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonRight,
                    dynamicStyles.toggleButton,
                    throwingHand === 'left' && dynamicStyles.toggleButtonActive,
                  ]}
                  onPress={() => setThrowingHand('left')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.toggleText,
                    dynamicStyles.toggleText,
                    throwingHand === 'left' && dynamicStyles.toggleTextActive,
                  ]}>
                    Left
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Preferred Throw Style */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Preferred Throw Style</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonLeft,
                    dynamicStyles.toggleButton,
                    preferredThrowStyle === 'backhand' && dynamicStyles.toggleButtonActive,
                  ]}
                  onPress={() => setPreferredThrowStyle('backhand')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.toggleText,
                    dynamicStyles.toggleText,
                    preferredThrowStyle === 'backhand' && dynamicStyles.toggleTextActive,
                  ]}>
                    Backhand
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    dynamicStyles.toggleButton,
                    preferredThrowStyle === 'forehand' && dynamicStyles.toggleButtonActive,
                  ]}
                  onPress={() => setPreferredThrowStyle('forehand')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.toggleText,
                    dynamicStyles.toggleText,
                    preferredThrowStyle === 'forehand' && dynamicStyles.toggleTextActive,
                  ]}>
                    Forehand
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonRight,
                    dynamicStyles.toggleButton,
                    preferredThrowStyle === 'both' && dynamicStyles.toggleButtonActive,
                  ]}
                  onPress={() => setPreferredThrowStyle('both')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.toggleText,
                    dynamicStyles.toggleText,
                    preferredThrowStyle === 'both' && dynamicStyles.toggleTextActive,
                  ]}>
                    Both
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Password</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input, errors.password && styles.inputError]}
                placeholder="Create a password (min 8 characters)"
                placeholderTextColor={isDark ? '#888' : '#999'}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                secureTextEntry
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="password-new"
                editable={!loading}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>Confirm Password</Text>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Confirm your password"
                placeholderTextColor={isDark ? '#888' : '#999'}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                secureTextEntry
                autoCorrect={false}
                textContentType="newPassword"
                editable={!loading}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, dynamicStyles.footerText]}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity disabled={loading} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={[styles.link, dynamicStyles.link]}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logo: {
    width: 180,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionalLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  helperText: {
    color: '#999',
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0,
  },
  toggleButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 0,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: Colors.violet.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
