# Google OAuth Setup for Expo

This guide explains how to configure Google OAuth for the AceBack mobile app.

## Overview

Google OAuth in Expo works differently than web apps:

- **Development:** Uses Expo's auth proxy or custom URL scheme
- **Production:** Uses native Google Sign-In with custom scheme

## Setup Steps

### 1. Get Your Expo App Slug

The app slug is defined in `app.json`:

```json
{
  "expo": {
    "slug": "discr-mobile-temp"
  }
}
```

**TODO:** Change this to `discr` before production.

### 2. Add Redirect URLs to Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Select your project (`aceback-mvp`)
1. Go to "Credentials"
1. Click on your OAuth 2.0 Client ID (`AceBack Web Client`)
1. Under "Authorized redirect URIs", add:

   **For Expo Go (Development):**

   ```text
   https://auth.expo.io/@benniemosher-aceback/aceback
   ```

   **For Production (React Native/Expo):**

   ```text
   https://xhaogdigrsiwxdjmjzgx.supabase.co/auth/v1/callback
   ```

   This is your Supabase OAuth callback URL. After Google authenticates, it redirects to Supabase, which then redirects back to your app using the custom scheme `com.aceback.app://`.

1. Click "Save"

### 3. Find Your Expo Username

Run this command to find your Expo username:

```bash
npx expo whoami
```

Or check at: <https://expo.dev/accounts/[username]>

### 4. Test Google OAuth

In the app:

1. Tap "Sign in with Google" or "Sign up with Google"
1. Should open in-app browser
1. Login with Google account
1. Should redirect back to app
1. Should be logged in

### 5. Troubleshooting

**"redirect_uri_mismatch" Error:**

- The redirect URI in Google Cloud Console doesn't match
- Make sure you added the correct Expo auth URL
- Format: `https://auth.expo.io/@[username]/[slug]`

**OAuth Screen Shows "App Not Verified":**

- This is normal for apps in testing mode
- Users can click "Advanced" → "Go to [App Name]"
- For production, submit app for Google verification

**Google Login Opens But Doesn't Return:**

- Check that redirect URI matches exactly
- Check Expo username is correct
- Try closing and reopening the app

### 6. Production Considerations

For standalone builds (not Expo Go):

1. **Update app.json with custom scheme:**

   ```json
   {
     "expo": {
       "scheme": "com.aceback.app"
     }
   }
   ```

1. **Update Google Cloud Console redirect URI:**

   ```
   com.aceback.app:/oauthredirect
   ```

1. **Configure iOS URL scheme:**

   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.aceback.app",
         "usesAppleSignIn": true
       }
     }
   }
   ```

1. **Configure Android intent filter:**

   ```json
   {
     "expo": {
       "android": {
         "package": "com.aceback.app"
       }
     }
   }
   ```

### 7. Alternative: Use Expo AuthSession

For more control, you can use Expo's AuthSession instead of
`signInWithOAuth`:

```typescript
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  scheme: "com.aceback.app",
});

// Then use this redirectUri in your OAuth flow
```

## Current Status

**What's Configured:**

- ✅ Google OAuth enabled in Supabase
- ✅ Client ID and Secret in Supabase dashboard
- ✅ Web redirect URL configured

**What's Missing:**

- ⚠️ Expo-specific redirect URL in Google Cloud Console
- ⚠️ Expo username needs to be determined

**Next Steps:**

1. Run `npx expo whoami` to get your username
1. Add `https://auth.expo.io/@[username]/discr-mobile-temp` to Google Cloud
1. Test Google OAuth in simulator
1. Update app slug from `discr-mobile-temp` to `discr`

## References

- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [Supabase OAuth with Expo](https://supabase.com/docs/guides/auth/social-login/auth-google#expo-react-native)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
