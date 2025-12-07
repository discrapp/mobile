# AceBack Mobile - Project Memory

This file contains persistent context for Claude Code sessions on this project.
It will be automatically loaded at the start of every session.

## Project Overview

This is the React Native mobile application for AceBack, built with Expo and
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

1. **Create feature branch:** `git checkout -b feature/description`
1. **Make changes** to code or documentation
1. **ALWAYS run pre-commit BEFORE committing:** `pre-commit run --all-files`
   - Fix ALL errors (especially markdown and YAML formatting)
   - Do NOT commit with `--no-verify` unless absolutely necessary
1. **Commit with conventional format:** `git commit -m "type: description"`
1. **Push and create PR:** `gh pr create --title "feat: description"`
1. **Merge to main:** Automatic release created based on commits

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

### Code Quality Standards

**CRITICAL:** All code must adhere to linter rules from the start.

### React Native Best Practices

- Use TypeScript for all new code
- Follow React hooks best practices
- Optimize images and assets for mobile
- Test on both iOS and Android platforms
- Handle offline scenarios gracefully

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

## References

- @README.md - Repository overview
- Expo Documentation: <https://docs.expo.dev/>
- React Native Documentation: <https://reactnative.dev/>
- Supabase Documentation: <https://supabase.com/docs>

---

**Last Updated:** 2025-12-03

This file should be updated whenever:

- Project patterns change
- Important context is discovered
- Tooling is added or modified
