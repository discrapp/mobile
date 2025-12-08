import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View as RNView,
  Animated,
  PanResponder,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';

interface Notification {
  id: string;
  type: 'disc_found' | 'meetup_proposed' | 'meetup_accepted' | 'meetup_declined' | 'disc_recovered';
  title: string;
  body: string;
  data: {
    recovery_event_id?: string;
    disc_id?: string;
    proposal_id?: string;
  };
  read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  disc_found: 'map-marker',
  meetup_proposed: 'calendar',
  meetup_accepted: 'check-circle',
  meetup_declined: 'times-circle',
  disc_recovered: 'trophy',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  disc_found: '#F39C12',
  meetup_proposed: '#3498DB',
  meetup_accepted: '#27AE60',
  meetup_declined: '#E74C3C',
  disc_recovered: '#10b981',
};

export default function NotificationsScreen() {
  const { user, session } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-notifications`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch notifications:', response.status);
        return;
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!session?.access_token) return;

    try {
      await supabase.functions.invoke('mark-notification-read', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { notification_id: notificationId },
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.access_token || unreadCount === 0) return;

    try {
      await supabase.functions.invoke('mark-notification-read', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { mark_all: true },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string, wasUnread: boolean) => {
    // Optimistically remove from UI
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Mark as read in backend (so it doesn't come back)
    if (!session?.access_token) return;

    try {
      await supabase.functions.invoke('mark-notification-read', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { notification_id: notificationId },
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
      // Refetch to restore state if failed
      fetchNotifications();
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant screen based on notification type
    if (notification.data.recovery_event_id) {
      router.push(`/recovery/${notification.data.recovery_event_id}`);
    } else if (notification.data.disc_id) {
      router.push(`/disc/${notification.data.disc_id}`);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const SwipeableNotification = ({ item }: { item: Notification }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = -80;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal swipes
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow swiping left
          if (gestureState.dx < 0) {
            translateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < SWIPE_THRESHOLD) {
            // Swipe to dismiss
            Animated.timing(translateX, {
              toValue: -400,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              dismissNotification(item.id, !item.read);
            });
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    const iconName = NOTIFICATION_ICONS[item.type] || 'bell';
    const iconColor = NOTIFICATION_COLORS[item.type] || Colors.violet.primary;

    return (
      <RNView style={styles.swipeContainer}>
        {/* Delete background - tappable to dismiss */}
        <TouchableOpacity
          style={styles.deleteBackground}
          onPress={() => dismissNotification(item.id, !item.read)}
          activeOpacity={0.8}
        >
          <FontAwesome name="trash" size={20} color="#fff" />
          <Text style={styles.deleteText}>Dismiss</Text>
        </TouchableOpacity>

        {/* Notification content */}
        <Animated.View
          style={[
            styles.notificationSlider,
            isDark ? styles.notificationSliderDark : styles.notificationSliderLight,
            { transform: [{ translateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={[
              styles.notificationItem,
              !item.read && styles.unreadNotification,
            ]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
          >
            <RNView
              style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}
            >
              <FontAwesome name={iconName} size={20} color={iconColor} />
            </RNView>
            <RNView style={styles.notificationContent}>
              <Text style={[styles.notificationTitle, isDark && styles.textDark]}>
                {item.title}
              </Text>
              <Text
                style={[styles.notificationBody, isDark && styles.textMutedDark]}
                numberOfLines={2}
              >
                {item.body}
              </Text>
              <Text style={[styles.notificationTime, isDark && styles.textMutedDark]}>
                {formatTimeAgo(item.created_at)}
              </Text>
            </RNView>
            {!item.read && <RNView style={styles.unreadDot} />}
          </TouchableOpacity>
        </Animated.View>
      </RNView>
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    return <SwipeableNotification item={item} />;
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome
        name="bell-o"
        size={64}
        color={isDark ? '#666' : '#ccc'}
      />
      <Text style={[styles.emptyText, isDark && styles.textMutedDark]}>
        No notifications yet
      </Text>
      <Text style={[styles.emptySubtext, isDark && styles.textMutedDark]}>
        You'll be notified when someone finds your disc or proposes a meetup
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.violet.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <RNView style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.unreadText, isDark && styles.textDark]}>
            {unreadCount} unread
          </Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </RNView>
      )}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.violet.primary}
          />
        }
        ItemSeparatorComponent={() => (
          <RNView style={[styles.separator, isDark && styles.separatorDark]} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#f9fafb',
  },
  headerDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },
  unreadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  markAllText: {
    fontSize: 14,
    color: Colors.violet.primary,
    fontWeight: '500',
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationSlider: {
    // This wrapper ensures full coverage over the delete background
  },
  notificationSliderLight: {
    backgroundColor: '#fff',
  },
  notificationSliderDark: {
    backgroundColor: '#000',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  unreadNotification: {
    backgroundColor: `${Colors.violet.primary}08`,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9ca3af',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.violet.primary,
    marginLeft: 8,
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginLeft: 72,
  },
  separatorDark: {
    backgroundColor: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyList: {
    flex: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
