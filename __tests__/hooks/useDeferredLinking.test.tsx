import { renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { checkClipboardForCode } from '@/lib/deferredLinking';

// Mock the dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/deferredLinking', () => ({
  checkClipboardForCode: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

// Track session check state (mirrors the actual implementation)
let hasCheckedThisSession = false;

// Recreate the hook for testing (mirrors _layout.tsx implementation)
function useDeferredLinking(user: any, loading: boolean) {
  const router = useRouter();
  const { useEffect } = require('react');

  useEffect(() => {
    if (loading || !user) return;

    const checkForDeferredCode = async () => {
      if (hasCheckedThisSession) return;
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

    checkForDeferredCode();
  }, [user, loading, router]);
}

describe('useDeferredLinking', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the in-memory session flag before each test
    hasCheckedThisSession = false;
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('does not check clipboard when loading', async () => {
    renderHook(() => useDeferredLinking({ id: '123' }, true));

    await waitFor(() => {
      expect(checkClipboardForCode).not.toHaveBeenCalled();
    });
  });

  it('does not check clipboard when user is null', async () => {
    renderHook(() => useDeferredLinking(null, false));

    await waitFor(() => {
      expect(checkClipboardForCode).not.toHaveBeenCalled();
    });
  });

  it('checks clipboard when user is authenticated and not loading', async () => {
    (checkClipboardForCode as jest.Mock).mockResolvedValue(null);

    renderHook(() => useDeferredLinking({ id: '123' }, false));

    await waitFor(() => {
      expect(checkClipboardForCode).toHaveBeenCalled();
    });
  });

  it('does not check clipboard if already checked this session', async () => {
    (checkClipboardForCode as jest.Mock).mockResolvedValue(null);

    // First render - should check
    renderHook(() => useDeferredLinking({ id: '123' }, false));

    await waitFor(() => {
      expect(checkClipboardForCode).toHaveBeenCalledTimes(1);
    });

    // Second render - should not check again (session flag set)
    renderHook(() => useDeferredLinking({ id: '123' }, false));

    // Still only called once
    expect(checkClipboardForCode).toHaveBeenCalledTimes(1);
  });

  it('shows alert when valid code found in clipboard', async () => {
    (checkClipboardForCode as jest.Mock).mockResolvedValue('ABC123');

    renderHook(() => useDeferredLinking({ id: '123' }, false));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Found a Disc Code!',
        'We found code "ABC123" in your clipboard. Would you like to look up this disc?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'No Thanks' }),
          expect.objectContaining({ text: 'Yes, Look It Up' }),
        ])
      );
    });
  });

  it('does not show alert when no code found', async () => {
    (checkClipboardForCode as jest.Mock).mockResolvedValue(null);

    renderHook(() => useDeferredLinking({ id: '123' }, false));

    await waitFor(() => {
      expect(checkClipboardForCode).toHaveBeenCalled();
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('navigates to deep link when user confirms', async () => {
    (checkClipboardForCode as jest.Mock).mockResolvedValue('XYZ789');

    renderHook(() => useDeferredLinking({ id: '123' }, false));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Get the "Yes, Look It Up" button callback
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const yesButton = buttons.find(
      (b: { text: string }) => b.text === 'Yes, Look It Up'
    );

    // Simulate pressing the button
    yesButton.onPress();

    expect(mockRouter.push).toHaveBeenCalledWith('/d/XYZ789');
  });

  it('does not navigate when user cancels', async () => {
    (checkClipboardForCode as jest.Mock).mockResolvedValue('XYZ789');

    renderHook(() => useDeferredLinking({ id: '123' }, false));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Get the "No Thanks" button - it has no onPress, just style: 'cancel'
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertCall[2];
    const noButton = buttons.find(
      (b: { text: string }) => b.text === 'No Thanks'
    );

    // No Thanks button should just have style: 'cancel'
    expect(noButton.style).toBe('cancel');
    expect(noButton.onPress).toBeUndefined();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
