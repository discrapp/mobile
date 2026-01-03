import React, { Component, ReactNode } from 'react';
import { StyleSheet, View, Pressable, ColorSchemeName } from 'react-native';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { captureError } from '@/lib/sentry';

/**
 * Props for custom fallback components
 */
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component to render when an error occurs */
  fallback?: React.ComponentType<ErrorFallbackProps>;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Callback when the error boundary resets */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Wrapper component to get color scheme from hooks
 * Error boundaries must be class components, so we use this wrapper
 * to pass the color scheme as a prop
 */
function ErrorBoundaryWithColorScheme(props: ErrorBoundaryProps) {
  // Import useColorScheme inside the function to avoid issues with class component
  const { useColorScheme } = require('@/components/useColorScheme');
  const colorScheme = useColorScheme();

  return <ErrorBoundaryClass {...props} colorScheme={colorScheme} />;
}

interface ErrorBoundaryClassProps extends ErrorBoundaryProps {
  colorScheme: ColorSchemeName;
}

/**
 * Error boundary component that catches JavaScript errors in child components.
 * Logs errors to Sentry and displays a user-friendly fallback UI.
 * Supports dark mode and provides recovery via "Try Again" button.
 */
class ErrorBoundaryClass extends Component<ErrorBoundaryClassProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryClassProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to Sentry with component stack
    captureError(error, {
      componentStack: errorInfo.componentStack || '',
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback: FallbackComponent, colorScheme } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided
      if (FallbackComponent) {
        return <FallbackComponent error={error} resetError={this.resetError} />;
      }

      // Render default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          resetError={this.resetError}
          colorScheme={colorScheme}
        />
      );
    }

    return children;
  }
}

/**
 * Default fallback UI component
 * Adapts to light/dark mode automatically
 */
interface DefaultErrorFallbackProps extends ErrorFallbackProps {
  colorScheme: ColorSchemeName;
}

function DefaultErrorFallback({
  resetError,
  colorScheme,
}: DefaultErrorFallbackProps) {
  const isDark = colorScheme === 'dark';
  const errorMessage = 'Something went wrong. Please try again.';

  return (
    <View
      testID="error-boundary-container"
      style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}
      accessibilityRole="alert"
      accessibilityLabel={`An error occurred. ${errorMessage}`}
    >
      <View style={styles.content}>
        <View
          testID="error-boundary-icon-container"
          style={[
            styles.iconContainer,
            { backgroundColor: isDark ? '#2a1a1a' : '#fee2e2' },
          ]}
        >
          <FontAwesome name="exclamation-triangle" size={48} color="#ef4444" />
        </View>

        <Text style={styles.title}>Oops!</Text>
        <Text style={[styles.message, { color: isDark ? '#999' : '#666' }]}>
          {errorMessage}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={resetError}
          accessibilityRole="button"
          accessibilityLabel="Try Again"
          accessibilityHint="Attempts to recover from the error"
        >
          <FontAwesome name="refresh" size={16} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.violet.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Export the wrapper component that handles color scheme
export { ErrorBoundaryWithColorScheme as ErrorBoundary };

// Also export the class for testing purposes
export { ErrorBoundaryClass };
