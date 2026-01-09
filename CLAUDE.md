# Discr Mobile - Project Memory

This file contains persistent context for Claude Code sessions on this project.
It will be automatically loaded at the start of every session.

## Project Overview

This is the React Native mobile application for Discr, built with Expo and
powered by Supabase for backend services.

**Key Details:**

- **Framework:** React Native with Expo SDK 52
- **Language:** TypeScript
- **Backend:** Supabase (authentication, database, storage)
- **State Management:** React Context API for auth state
- **Navigation:** Expo Router (file-based routing)
- **Auth:** Supabase Auth with email/password and Google OAuth
- **CI/CD:** GitHub Actions with release workflow
- **Linting:** Pre-commit hooks for code quality

## Repository Structure

```text
mobile/
├── .expo/              # Expo build artifacts
├── .github/workflows/  # CI/CD workflows
├── .maestro/           # Maestro e2e tests
│   ├── config.yaml     # Maestro configuration
│   └── flows/          # Test flows organized by feature
├── __tests__/          # Jest unit/component tests
├── app/                # Expo Router app directory (file-based routing)
│   ├── (auth)/         # Authentication screens (sign-in, sign-up)
│   ├── (tabs)/         # Main app tab navigation
│   ├── _layout.tsx     # Root layout with AuthProvider
│   └── modal.tsx       # Example modal screen
├── assets/             # Images, fonts, and static assets
├── components/         # Reusable React components
├── constants/          # App constants and theme
├── contexts/           # React contexts (AuthContext)
├── lib/                # Libraries and utilities (Supabase client)
├── app.json            # Expo configuration
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (installed via npx)
- iOS Simulator (Mac) or Android Studio

### Environment Variables

Copy `.env.example` to `.env` and fill in Supabase credentials:

- `EXPO_PUBLIC_SUPABASE_URL` - From Supabase dashboard
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - From Supabase dashboard

**Note:** Expo requires the `EXPO_PUBLIC_` prefix for environment variables that
need to be accessible in client-side code.

### Running the App

```bash
npm install          # Install dependencies
npm start            # Start Expo dev server
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run web          # Run in web browser
```

## Git Workflow

**CRITICAL:** All changes MUST go through Pull Requests. Never commit directly
to main.

1. **Create feature branch:** `git checkout -b feature/description`
1. **Make changes** to code or documentation
1. **Write markdown correctly the FIRST time** - Use markdownlint style:
   - Keep lines under 80 characters (break long lines manually)
   - Use `1.` for all ordered list items (auto-numbered)
   - Add blank lines around fenced code blocks
   - Do NOT rely on pre-commit hooks to fix formatting
1. **ALWAYS run pre-commit BEFORE committing:** `pre-commit run --all-files`
   - Fix ALL errors before committing
   - Do NOT commit with `--no-verify` unless absolutely necessary
1. **Commit with conventional format:** `git commit -m "type: description"`
1. **Push and create PR:** `gh pr create --title "feat: description"`
1. **Get PR reviewed and merged** - Never push directly to main

**Commit Format:** Conventional Commits (enforced by pre-commit hook)

- `feat:` - New feature (triggers minor version bump)
- `fix:` - Bug fix (triggers patch version bump)
- `docs:` - Documentation changes (no version bump)
- `chore:` - Maintenance (no version bump)
- `refactor:` - Code refactoring (no version bump)
- `style:` - Code style changes (no version bump)

## Pre-commit Hooks

**Installed hooks:**

- YAML linting (yamllint)
- Markdown linting (markdownlint)
- Conventional commit format
- File hygiene (trailing whitespace, EOF, etc.)

**Setup:**

```bash
pre-commit install              # One-time setup
pre-commit run --all-files      # Run manually
pre-commit autoupdate           # Update hook versions
```

## Important Notes

### Test-Driven Development (TDD) - MANDATORY

**CRITICAL:** All new code MUST be developed using Test-Driven Development:

1. **Write tests FIRST** - Before writing any implementation code, write tests
1. **Red-Green-Refactor cycle:**
   - RED: Write a failing test for the new functionality
   - GREEN: Write minimal code to make the test pass
   - REFACTOR: Clean up while keeping tests green
1. **Test coverage requirements:**
   - All components must have unit tests
   - All hooks must be tested
   - All API interactions must be tested
   - All user flows must have integration tests
   - **Coverage must not decrease** - CI enforces coverage thresholds
1. **Test file locations:**
   - Component tests: `__tests__/<component>.test.tsx`
   - Hook tests: `__tests__/hooks/<hook>.test.ts`
   - Integration tests: `__tests__/integration/`
1. **Running tests:**

   ```bash
   npm test                    # Run all tests
   npm test -- --watch         # Watch mode
   npm test -- --coverage      # With coverage report
   ```

1. **Coverage enforcement:**
   - CI runs `npm run test:coverage` on every PR
   - PRs that decrease coverage will fail CI checks
   - Before pushing, run `npm run test:coverage` locally to verify
   - If adding new code, ensure it has corresponding tests
   - Use `istanbul ignore next` comments sparingly and only for truly
     untestable code (native modules, device-specific features)

**DO NOT write implementation code without tests. This is non-negotiable.**

### E2E Testing with Maestro - REQUIRED FOR NEW FEATURES

**CRITICAL:** All new user-facing features MUST include Maestro e2e tests.

**When to add e2e tests:**

- New screens or flows (e.g., order stickers, my orders)
- New user interactions (e.g., buttons, forms, navigation)
- Bug fixes that affect user-visible behavior

**E2E test location:** `.maestro/flows/`

**Test file structure:**

```text
.maestro/flows/
├── auth/                    # Authentication flows
├── helpers/                 # Reusable test helpers
├── order-stickers/          # Order stickers feature tests
│   ├── package-selection.yaml
│   └── address-validation.yaml
└── my-orders/               # My orders feature tests
    ├── view-orders.yaml
    ├── mark-delivered.yaml
    └── cancel-order.yaml
```

**Example test flow:**

```yaml
# .maestro/flows/my-orders/mark-delivered.yaml
appId: com.discr.app
---
- launchApp
- tapOn: "My Orders"
- waitForAnimationToEnd
- assertVisible: "Shipped"
- tapOn: "Mark as Delivered"
- assertVisible: "Did you receive order"
- tapOn: "Yes, Received"
- assertVisible: "Order Delivered"
```

**Running e2e tests:**

```bash
npm run e2e                  # Run all tests
npm run e2e:flow <path>      # Run specific flow
npm run e2e:studio           # Interactive test builder
```

**Key commands in Maestro:**

- `tapOn: "Text"` or `tapOn: { id: "element-id" }` - Tap element
- `inputText: "value"` - Type text
- `assertVisible: "Text"` - Assert element is visible
- `assertNotVisible: "Text"` - Assert element is not visible
- `waitForAnimationToEnd` - Wait for animations
- `scrollUntilVisible` - Scroll to find element
- `runFlow: { when: { visible: "X" }, commands: [...] }` - Conditional

**DO NOT ship new features without corresponding e2e tests.**

### Code Quality Standards

**CRITICAL:** All code must adhere to linter rules from the start.

### React Native Best Practices

- Use TypeScript for all new code
- Follow React hooks best practices
- Optimize images and assets for mobile
- Test on both iOS and Android platforms
- Handle offline scenarios gracefully

### Themed Components - IMPORTANT

**ALWAYS prefer `View` from `react-native` over the themed `View`.**

The project has themed components in `@/components/Themed` that apply automatic
background colors based on the color scheme. This causes unwanted white/dark
backgrounds in nested views.

```typescript
// BAD - causes white background issues
import { View, Text } from '@/components/Themed';

// GOOD - use RN View directly, only use Themed Text when needed
import { View as RNView } from 'react-native';
import { Text } from '@/components/Themed';

// Or import both and alias
import { View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
// Then use RNView for containers, View only when you need themed background
```

**Rule of thumb:**

- Use `RNView` (from react-native) for layout containers
- Use themed `Text` for text that should respect dark/light mode
- Only use themed `View` when you explicitly want a themed background

### Dark Mode Support - MANDATORY

**CRITICAL:** All new screens and components MUST support both light and dark
modes from the start. Never hardcode colors that don't adapt to the theme.

**Required Pattern:**

```typescript
import { useColorScheme, StyleSheet } from 'react-native';

export default function MyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Create dynamic styles based on theme (unified across all Discr repos)
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? '#121212' : '#fff',  // Main background
    },
    text: {
      color: isDark ? '#ccc' : '#333',
    },
    card: {
      backgroundColor: isDark ? '#1e1e1e' : '#f8f8f8',  // Card/surface
      borderColor: isDark ? '#2e2e2e' : '#eee',         // Border
    },
    input: {
      backgroundColor: isDark ? '#252525' : '#fff',  // Elevated/input
      borderColor: isDark ? '#2e2e2e' : '#ddd',      // Border
      color: isDark ? '#fff' : '#000',
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.text, dynamicStyles.text]}>Hello</Text>
    </View>
  );
}

// Static styles without color values
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 16,
  },
});
```

**Unified Color System (consistent across mobile, web, admin):**

- **Dark Mode Surfaces (Material Design elevation):**
  - `#121212` - Main background
  - `#1e1e1e` - Cards, modals, surfaces
  - `#252525` - Elevated surfaces, inputs, hover states
  - `#2e2e2e` - Borders, dividers
- **Light Mode Surfaces:**
  - `#fff` - Main background
  - `#f8f8f8` - Cards, surfaces
  - `#eee`, `#ddd` - Borders
- **Text:**
  - Light mode: `#333` (primary), `#666` (secondary)
  - Dark mode: `#fff` (primary), `#ccc` (secondary), `#999` (muted)
- **Use Colors.ts:**
  - Import from `@/constants/Colors` for violet brand colors
  - Use `Colors.darkSurface` for consistent dark mode surfaces

**Testing:**

- Test EVERY new screen in both light and dark modes
- Use iOS device Settings > Display & Brightness to toggle
- Verify all text is readable with sufficient contrast
- Check that cards and inputs have appropriate backgrounds

**DO NOT hardcode colors. Always use the dynamic styles pattern above.**

### Sentry Error Tracking - MANDATORY

**CRITICAL:** All new code MUST use Sentry for error tracking.

**Sentry is already initialized in `app/_layout.tsx` via `lib/sentry.ts`.**

**Required pattern for catch blocks:**

```typescript
import { Sentry } from '@/lib/sentry';

try {
  // API call or risky operation
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  // ...
} catch (error) {
  Sentry.captureException(error, {
    extra: { operation: 'operation-name', id: someId },
  });
  Alert.alert('Error', 'Something went wrong');
}
```

**User context - set after authentication:**

```typescript
import { Sentry } from '@/lib/sentry';

// After successful sign-in:
Sentry.setUser({ id: user.id, email: user.email });

// On sign-out:
Sentry.setUser(null);
```

**Key points:**

- Error boundary is exported from `@sentry/react-native` in `_layout.tsx`
- Use `captureException()` in catch blocks with relevant context
- Include operation name and IDs for debugging
- Tests mock Sentry - no real errors sent during tests

**Environment variable:**

- `EXPO_PUBLIC_SENTRY_DSN` - Sentry DSN (set in `.env`)

### Supabase Integration

- Never commit actual credentials to git
- Use environment variables for all config
- Handle authentication state properly
- Implement proper error handling for API calls

### Authentication Architecture

The app uses Supabase Auth with a React Context-based state management system:

**Key Files:**

- `lib/supabase.ts` - Supabase client configured with AsyncStorage for
  persistence
- `contexts/AuthContext.tsx` - Auth state management (session, user, loading)
- `app/(auth)/sign-in.tsx` - Sign in screen (email/password + Google OAuth)
- `app/(auth)/sign-up.tsx` - Sign up screen (email/password + Google OAuth)
- `app/_layout.tsx` - Root layout with AuthProvider and protected route logic

**How It Works:**

1. **AuthProvider** wraps the entire app and manages auth state
1. **useProtectedRoute** hook redirects users based on auth status:
   - Not authenticated → redirect to sign-in
   - Authenticated → redirect to main app
1. **AsyncStorage** persists sessions across app restarts
1. **Form validation** checks email format and password requirements
1. **Google OAuth** opens system browser for authentication

**Auth Flow:**

```text
App Start
  ↓
AuthProvider loads session from AsyncStorage
  ↓
useProtectedRoute checks user state
  ↓
┌─ Not authenticated → /(auth)/sign-in
└─ Authenticated → /(tabs)
```

## Cross-Repository Updates

When adding new user-facing features, consider updating the web landing page:

- **Web App** (`web/`): Announce new features on the landing page
  - Update feature highlights section for major new capabilities
  - Add screenshots or descriptions of new functionality
  - Ensure marketing copy reflects current app capabilities

---

## Implementation Patterns (For Claude)

### Screen Pattern (Auth Screen)

```typescript
// app/(auth)/sign-in.tsx
import React, { useState, useRef } from 'react';
import {
  View as RNView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { useAuth } from '@/contexts/AuthContext';
import { validateSignInForm } from '@/lib/validation';
import { handleError } from '@/lib/errorHandler';
import Colors from '@/constants/Colors';

export default function SignIn() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const isSubmitting = useRef(false);

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#121212' : '#fff' },
    text: { color: isDark ? '#fff' : '#000' },
    input: {
      backgroundColor: isDark ? '#252525' : '#fff',
      borderColor: isDark ? '#2e2e2e' : '#ddd',
      color: isDark ? '#fff' : '#000',
    },
  };

  const handleSignIn = async () => {
    if (isSubmitting.current) return;
    const newErrors = validateSignInForm(email, password);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    isSubmitting.current = true;
    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        handleError(error, { operation: 'sign-in' });
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      handleError(error, { operation: 'sign-in' });
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, dynamicStyles.container]}
    >
      {/* Form content */}
    </KeyboardAvoidingView>
  );
}
```

### Tab Screen Pattern

```typescript
// app/(tabs)/index.tsx
import { StyleSheet, Pressable, ScrollView, View as RNView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#121212' : '#fff' },
    card: {
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderColor: isDark ? '#2e2e2e' : 'rgba(150,150,150,0.2)',
    },
  };

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]}>
      <RNView style={styles.content}>
        <Text style={styles.title}>Welcome to Discr!</Text>
        <Pressable
          style={[styles.card, dynamicStyles.card]}
          onPress={() => router.push('/add-disc')}
        >
          <FontAwesome name="plus" size={20} color={Colors.violet.primary} />
          <Text>Add Disc</Text>
        </Pressable>
      </RNView>
    </ScrollView>
  );
}
```

### Custom Hook Pattern

```typescript
// hooks/useDiscIdentification.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/errorHandler';

export function useDiscIdentification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const identify = useCallback(async (imageUri: string) => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isMountedRef.current) setError('Must be signed in');
        return null;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/identify-disc`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
          signal: abortController.signal,
        }
      );

      const data = await response.json();
      if (isMountedRef.current) setResult(data);
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return null;
      handleError(err, { operation: 'identify-disc' });
      if (isMountedRef.current) setError('Failed to identify');
      return null;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setIsLoading(false);
      setError(null);
      setResult(null);
    }
  }, []);

  return { identify, isLoading, error, result, reset };
}
```

### Service Layer Pattern

```typescript
// services/discs.ts
import { apiRequestValidated } from '@/services/baseService';
import { z } from 'zod';

const discSchema = z.object({
  id: z.string(),
  name: z.string(),
  mold: z.string().nullable(),
  manufacturer: z.string().nullable(),
});

type Disc = z.infer<typeof discSchema>;

export const discService = {
  async getAll(): Promise<Disc[]> {
    return apiRequestValidated('/functions/v1/discs', { method: 'GET' }, z.array(discSchema));
  },

  async getById(id: string): Promise<Disc | null> {
    try {
      return await apiRequestValidated(`/functions/v1/discs/${id}`, { method: 'GET' }, discSchema);
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') return null;
      throw error;
    }
  },

  async create(data: CreateDiscData): Promise<Disc> {
    return apiRequestValidated('/functions/v1/discs', { method: 'POST', body: data }, discSchema);
  },
};
```

### Zod Validation Pattern

```typescript
// lib/zodSchemas.ts
import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(8, 'Password must be 8+ characters'),
});

export type SignInData = z.infer<typeof signInSchema>;

export function validateSignInWithZod(data: Partial<SignInData>): Record<string, string> {
  const result = signInSchema.safeParse(data);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const field = issue.path[0] as string;
    errors[field] = issue.message;
  });
  return errors;
}
```

### Component Pattern

```typescript
// components/Avatar.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';

interface AvatarProps {
  avatarUrl?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ avatarUrl, name, size = 40 }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = useCallback((displayName?: string): string => {
    if (!displayName) return '?';
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return displayName.charAt(0).toUpperCase();
  }, []);

  const containerStyle = useMemo(() => ({
    width: size, height: size, borderRadius: size / 2,
  }), [size]);

  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, containerStyle]}
        onError={() => setImageError(true)}
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View style={[styles.placeholder, containerStyle]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
```

### File Map - Where to Edit

| Task | Files to Edit |
|------|---------------|
| Add auth screen | `app/(auth)/[name].tsx` |
| Add tab screen | `app/(tabs)/[name].tsx`, update `app/(tabs)/_layout.tsx` |
| Add modal | `app/[name].tsx`, configure in `app/_layout.tsx` |
| Add component | `components/[Name].tsx` |
| Add custom hook | `hooks/use[Name].ts` |
| Add API service | `services/[name].ts` |
| Add validation | `lib/zodSchemas.ts`, `lib/validation.ts` |
| Update colors | `constants/Colors.ts` |
| Add e2e test | `.maestro/flows/[feature]/[test].yaml` |
| Add unit test | `__tests__/[feature]/[name].test.tsx` |

### Adding a New Screen

1. Create screen file:

```typescript
// app/new-screen.tsx
import { StyleSheet, ScrollView, View as RNView, useColorScheme } from 'react-native';
import { Text } from '@/components/Themed';
import { handleError } from '@/lib/errorHandler';
import Colors from '@/constants/Colors';

export default function NewScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const dynamicStyles = {
    container: { backgroundColor: isDark ? '#121212' : '#fff' },
  };

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]}>
      <Text>Content</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});
```

2. Register in `app/_layout.tsx` if needed:

```typescript
<Stack.Screen
  name="new-screen"
  options={{ title: 'New Screen', headerTintColor: Colors.violet.primary }}
/>
```

### Navigation Patterns

```typescript
import { router } from 'expo-router';

// Basic navigation
router.push('/add-disc');
router.replace('/(tabs)');
router.back();

// With params
router.push(`/disc/${discId}`);
router.push({ pathname: '/edit-disc/[id]', params: { id: discId } });
```

### Error Handling Pattern

```typescript
import { handleError } from '@/lib/errorHandler';

try {
  const data = await apiCall();
} catch (error) {
  handleError(error, {
    operation: 'operation-name',
    context: { key: 'value' },
  });
}
```

## References

- @README.md - Repository overview
- Expo Documentation: <https://docs.expo.dev/>
- React Native Documentation: <https://reactnative.dev/>
- Supabase Documentation: <https://supabase.com/docs>

---

**Last Updated:** 2026-01-09

This file should be updated whenever:

- Project patterns change
- Important context is discovered
- Tooling is added or modified
