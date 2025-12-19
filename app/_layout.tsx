import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus, Pressable } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { checkClipboardForCode } from '@/lib/deferredLinking';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Start at sign-in by default, auth routing handled by useProtectedRoute
  initialRouteName: '(auth)/sign-in',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore - splash screen may already be hidden during hot reload
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function useProtectedRoute(user: any, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect to app if authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);
}

/**
 * Hook to check for deferred deep link codes from clipboard
 * Prompts user if a valid code is found after app comes to foreground
 */
// Track if we've checked this app session (in-memory, resets on app restart)
let hasCheckedThisSession = false;

function useDeferredLinking(user: any, loading: boolean) {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Only check when user is authenticated and not loading
    if (loading || !user) {
      return;
    }

    const checkForDeferredCode = async () => {
      // Don't check more than once per app session (in-memory flag)
      if (hasCheckedThisSession) {
        return;
      }
      hasCheckedThisSession = true;

      const code = await checkClipboardForCode();
      if (code) {
        Alert.alert(
          'Found a Disc Code!',
          `We found code "${code}" in your clipboard. Would you like to look up this disc?`,
          [
            {
              text: 'No Thanks',
              style: 'cancel',
            },
            {
              text: 'Yes, Look It Up',
              onPress: () => {
                router.push(`/d/${code}`);
              },
            },
          ]
        );
      }
    };

    // Check on initial load
    checkForDeferredCode();

    // Also check when app comes back to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkForDeferredCode();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [user, loading, router]);
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();

  useProtectedRoute(user, loading);
  useDeferredLinking(user, loading);

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ title: 'Forgot Password', headerBackTitle: 'Back' }} />
        <Stack.Screen name="(auth)/reset-password" options={{ title: 'Reset Password', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-disc"
          options={({ navigation }) => ({
            presentation: 'modal',
            title: 'Add Disc',
            headerRight: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
              >
                <FontAwesome name="times" size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
              </Pressable>
            ),
          })}
        />
        <Stack.Screen name="disc/[id]" options={{ title: 'Disc Details', headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="edit-disc/[id]"
          options={({ navigation }) => ({
            presentation: 'modal',
            title: 'Edit Disc',
            headerRight: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
              >
                <FontAwesome name="times" size={18} color={colorScheme === 'dark' ? '#999' : '#666'} />
              </Pressable>
            ),
          })}
        />
        <Stack.Screen name="recovery/[id]" options={{ title: 'Recovery Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="propose-meetup/[id]" options={{ presentation: 'modal', title: 'Propose Meetup' }} />
        <Stack.Screen name="drop-off/[id]" options={{ title: 'Drop Off Location', headerBackTitle: 'Back' }} />
        <Stack.Screen name="d/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="claim-disc" options={{ title: 'Claim Disc', headerShown: false }} />
        <Stack.Screen name="link-sticker" options={{ title: 'Link Sticker', headerBackTitle: 'Back' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
