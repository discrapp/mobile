# AceBack Mobile App

![GitHub branch status](https://img.shields.io/github/checks-status/acebackapp/mobile/main)
![GitHub Issues](https://img.shields.io/github/issues/acebackapp/mobile)
![GitHub last commit](https://img.shields.io/github/last-commit/acebackapp/mobile)
![GitHub repo size](https://img.shields.io/github/repo-size/acebackapp/mobile)
![GitHub License](https://img.shields.io/github/license/acebackapp/mobile)

## Introduction

AceBack is a mobile-first application built with React Native and Expo,
powered by Supabase for backend services.

### Key Features

- Built with Expo SDK 54 and React Native
- TypeScript for type safety
- Supabase integration for authentication and data storage
- Modern React 19 features

## Prerequisites

- Node.js 18+ and npm
- Expo CLI
- iOS Simulator (Mac) or Android Studio (for Android development)

## Setup

### Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required environment variables:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

Get these values from your Supabase project dashboard at:
<https://app.supabase.com/project/discr-mvp/settings/api>

### Installation

```bash
npm install
```

## Development

Start the Expo development server:

```bash
npm start
```

Run on specific platforms:

```bash
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser
```

## Project Structure

```text
mobile/
├── assets/          # Images, fonts, and static assets
├── App.tsx          # Main application entry point
├── app.json         # Expo configuration
├── package.json     # Dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

## Contributing

This project uses conventional commits for version management.
Please ensure your commits follow the format:

```text
type(scope): description

feat: add new feature
fix: resolve bug
docs: update documentation
chore: maintenance tasks
```

## License

See LICENSE file for details.
