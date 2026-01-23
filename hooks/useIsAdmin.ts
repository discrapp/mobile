import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if the current user has the admin role.
 * Admin role is stored in the user's app_metadata.role field.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();

  if (!user) return false;

  const role = user.app_metadata?.role;
  return role === 'admin';
}
