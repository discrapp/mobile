import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { setUserContext, clearUserContext, captureError } from '@/lib/sentry';
import { logger } from '@/lib/logger';
import { clearUserCache } from '@/utils/clearUserCache';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  registerPushToken: () => Promise<void>;
};

// istanbul ignore next -- Default context values are fallbacks, not executed in normal flow
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
  registerPushToken: async () => {},
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b1877',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.debug('Failed to get push token - permission not granted');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      token = tokenData.data;
    } catch (error) {
      captureError(error, { operation: 'getExpoPushToken' });
      logger.error('Error getting push token', error);
    }
  } else {
    logger.debug('Push notifications require a physical device');
  }

  return token;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const registerPushToken = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        logger.debug('Registering push token', { tokenPreview: token.substring(0, 30) + '...' });

        const response = await supabase.functions.invoke('register-push-token', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { push_token: token },
        });

        if (response.error) {
          captureError(response.error, { operation: 'registerPushToken' });
          logger.error('Failed to register push token', response.error);
        } else {
          logger.debug('Push token registered successfully');
        }
      }
    } catch (error) {
      captureError(error, { operation: 'registerPushToken' });
      logger.error('Error registering push token', error);
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        captureError(error, { operation: 'getSession' });
        logger.error('Failed to get session', error);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Update Sentry user context
      if (session?.user) {
        setUserContext(session.user.id, session.user.email);
      } else {
        clearUserContext();
      }
    });

    // Handle deep link OAuth callbacks
    const handleDeepLink = async (event: { url: string }) => {
      logger.debug('Deep link received', { url: event.url });

      if (event.url && (event.url.includes('#access_token') || event.url.includes('?access_token'))) {
        try {
          // Parse the URL to extract tokens
          const urlObj = new URL(event.url.replace('#', '?'));
          const params = new URLSearchParams(urlObj.search);

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          logger.debug('OAuth tokens parsed', {
            hasAccess: !!accessToken,
            hasRefresh: !!refreshToken,
          });

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              captureError(error, {
                operation: 'oauthCallback',
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
              });
              logger.error('OAuth error', error);
            } else {
              logger.debug('Session set successfully');
            }
          }
        } catch (err) {
          captureError(err as Error, {
            operation: 'deepLinkParsing',
            url: event.url,
          });
          logger.error('Error parsing deep link', err);
        }
      }
    };

    // Listen for URL events (OAuth callbacks)
    const urlSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, []);

  // Register push token when session is available
  useEffect(() => {
    if (session?.access_token) {
      registerPushToken();
    }
  }, [session?.access_token, registerPushToken]);

  // Set up notification listeners
  useEffect(() => {
    // Handle notification received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      logger.debug('Notification received', { title: notification.request.content.title });
    });

    // Handle notification response (user tapped on notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      logger.debug('Notification response', { actionIdentifier: response.actionIdentifier });
      // Navigation to specific screen can be handled here based on notification data
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      captureError(error, { operation: 'signIn', email });
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      captureError(error, { operation: 'signUp', email });
    }
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'com.discr.app://',
      },
    });
    if (error) {
      captureError(error, { operation: 'signInWithGoogle', provider: 'google' });
    }
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      captureError(error as Error, { operation: 'signOut' });
      logger.error('Sign out error', error);
    }
    // Force clear state even if signOut fails
    setSession(null);
    setUser(null);
    clearUserContext();
    // Clear cached user data to prevent next user from seeing previous user's data
    await clearUserCache();
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signIn, signUp, signInWithGoogle, signOut, registerPushToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
