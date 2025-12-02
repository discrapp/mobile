# Discr Mobile - Project Memory

This file contains persistent context for Claude Code sessions on this project.
It will be automatically loaded at the start of every session.

## Project Overview

This is the React Native mobile application for Discr, built with Expo and
powered by Supabase for backend services.

**Key Details:**

- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript
- **Backend:** Supabase (authentication, database, storage)
- **State Management:** TBD
- **Navigation:** TBD
- **CI/CD:** GitHub Actions with release workflow
- **Linting:** Pre-commit hooks for code quality

## Repository Structure

```text
mobile/
├── .expo/              # Expo build artifacts
├── .github/workflows/  # CI/CD workflows
├── assets/             # Images, fonts, and static assets
├── App.tsx             # Main application entry point
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

- `SUPABASE_URL` - From Supabase dashboard
- `SUPABASE_ANON_KEY` - From Supabase dashboard

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

## References

- @README.md - Repository overview
- Expo Documentation: <https://docs.expo.dev/>
- React Native Documentation: <https://reactnative.dev/>
- Supabase Documentation: <https://supabase.com/docs>

---

**Last Updated:** 2025-11-30

This file should be updated whenever:

- Project patterns change
- Important context is discovered
- Tooling is added or modified
