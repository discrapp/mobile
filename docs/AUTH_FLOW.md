# Authentication Flow

This document describes the authentication flow in the AceBack mobile app.

## User Auth Flow Diagram

```mermaid
graph TD
    Start[App Start] --> LoadSession[AuthProvider: Load session from AsyncStorage]
    LoadSession --> CheckSession{Session exists?}

    CheckSession -->|No| SignInScreen[Show Sign In Screen]
    CheckSession -->|Yes| ValidateSession{Session valid?}

    ValidateSession -->|Yes| MainApp[Navigate to Main App]
    ValidateSession -->|No| SignInScreen

    SignInScreen --> UserAction{User Action}

    UserAction -->|Click Sign In| EmailSignIn[Enter Email/Password]
    UserAction -->|Click Google| GoogleOAuth[Google OAuth Flow]
    UserAction -->|Click Sign Up Link| SignUpScreen[Show Sign Up Screen]

    EmailSignIn --> ValidateForm{Form Valid?}
    ValidateForm -->|No| ShowErrors[Show Validation Errors]
    ShowErrors --> SignInScreen
    ValidateForm -->|Yes| CallSupabase[Call Supabase signInWithPassword]

    CallSupabase --> AuthSuccess{Auth Success?}
    AuthSuccess -->|No| ShowAuthError[Show Error Alert]
    ShowAuthError --> SignInScreen
    AuthSuccess -->|Yes| SaveSession[Save session to AsyncStorage]

    GoogleOAuth --> OpenBrowser[Open System Browser]
    OpenBrowser --> GoogleLogin[User logs in with Google]
    GoogleLogin --> GoogleCallback{Auth Success?}
    GoogleCallback -->|No| ShowAuthError
    GoogleCallback -->|Yes| SaveSession

    SaveSession --> UpdateContext[AuthContext updates state]
    UpdateContext --> ProtectedRoute[useProtectedRoute hook triggers]
    ProtectedRoute --> MainApp

    SignUpScreen --> SignUpAction{User Action}
    SignUpAction -->|Enter Details| ValidateSignUp{Form Valid?}
    ValidateSignUp -->|No| ShowSignUpErrors[Show Validation Errors]
    ShowSignUpErrors --> SignUpScreen
    ValidateSignUp -->|Yes| CallSignUp[Call Supabase signUp]

    CallSignUp --> SignUpSuccess{Success?}
    SignUpSuccess -->|No| ShowSignUpError[Show Error Alert]
    ShowSignUpError --> SignUpScreen
    SignUpSuccess -->|Yes| ShowSuccess[Show Success Message]
    ShowSuccess --> SignInScreen

    MainApp --> UserSignsOut{User clicks Sign Out?}
    UserSignsOut -->|Yes| ClearSession[Clear session from AsyncStorage]
    ClearSession --> SignInScreen
    UserSignsOut -->|No| MainApp

    style Start fill:#e1f5e1
    style MainApp fill:#e1f5e1
    style SignInScreen fill:#fff3cd
    style SignUpScreen fill:#fff3cd
    style ShowErrors fill:#f8d7da
    style ShowAuthError fill:#f8d7da
    style ShowSignUpErrors fill:#f8d7da
    style ShowSignUpError fill:#f8d7da
```

## Key Components

### AuthContext

Manages global authentication state:

- **session**: Current Supabase session (null if not authenticated)
- **user**: Current user object (null if not authenticated)
- **loading**: Boolean indicating if auth state is being loaded
- **signOut**: Function to sign out the user

### useProtectedRoute Hook

Handles automatic navigation based on auth state:

```typescript
if (!authenticated && not in auth screens) {
  redirect to /(auth)/sign-in
}

if (authenticated && in auth screens) {
  redirect to /(tabs)
}
```

### Form Validation

**Sign In:**

- Email: Required, valid email format
- Password: Required

**Sign Up:**

- Email: Required, valid email format
- Password: Required, minimum 8 characters
- Confirm Password: Required, must match password

## Authentication Methods

### Email/Password

1. User enters email and password
1. Form validation runs
1. Call `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`
1. On success, session is saved to AsyncStorage
1. AuthContext updates, triggering navigation to main app

### Google OAuth

1. User clicks "Sign in with Google"
1. Call `supabase.auth.signInWithOAuth({ provider: 'google' })`
1. Opens system browser for Google login
1. After successful login, redirects back to app
1. Session is saved to AsyncStorage
1. AuthContext updates, triggering navigation to main app

## Session Persistence

Sessions are automatically persisted using AsyncStorage:

- **On sign in/sign up**: Session saved to AsyncStorage
- **On app restart**: AuthContext loads session from AsyncStorage
- **On sign out**: Session cleared from AsyncStorage

This allows users to remain signed in across app restarts.

## Error Handling

All authentication errors are caught and displayed to the user via `Alert.alert()`:

- Invalid email format
- Password too short
- Passwords don't match
- Supabase auth errors (wrong password, user not found, etc.)
- Network errors
