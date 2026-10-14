# Sharp Mobile App

React Native mobile app for quiz and vocabulary learning, built with Expo and Redux Toolkit.

## Project Structure

```
apps/mobile/
├── App.tsx                          # App entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── babel.config.js                  # Babel config
└── src/
    ├── navigation/
    │   └── AppNavigator.tsx         # Tab + Stack navigation
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.tsx
    │   │   └── RegisterScreen.tsx
    │   ├── home/
    │   │   ├── HomeScreen.tsx       # Category list
    │   │   ├── CategoryScreen.tsx   # Sub-categories
    │   │   ├── UnitListScreen.tsx   # Unit list
    │   │   ├── QuizScreen.tsx       # Quiz interface
    │   │   └── QuizResultScreen.tsx # Results
    │   └── profile/
    │       ├── ProfileScreen.tsx    # User profile + stats
    │       ├── SettingsScreen.tsx   # Settings
    │       ├── RecordsScreen.tsx    # Study history
    │       └── WrongQuestionsScreen.tsx
    ├── components/
    │   ├── CategoryCard.tsx
    │   ├── UnitItem.tsx
    │   ├── QuizOption.tsx
    │   ├── ProgressBar.tsx
    │   └── StatCard.tsx
    ├── services/
    │   └── api.ts                   # API client + mock data
    ├── stores/
    │   ├── index.ts                 # Redux store
    │   ├── authSlice.ts
    │   ├── studySlice.ts
    │   └── settingsSlice.ts
    └── utils/
        └── storage.ts               # AsyncStorage helpers
```

## Features

- **Authentication**: Login/Register with JWT token storage
- **Category Navigation**: Browse categories and sub-categories
- **Unit-based Learning**: Dynamic units based on user settings
- **Interactive Quiz**: 
  - Single choice questions
  - Real-time feedback (correct/wrong)
  - Progress tracking
  - Timer
  - Auto-advance on correct, manual next on wrong
- **Results & Analytics**: Score, time spent, wrong question review
- **Study Records**: History of all study sessions
- **Wrong Questions**: Review mistakes with explanations
- **Settings**: Customize unit size (20/30/50/100/custom) and theme
- **Offline Mode**: Mock data fallback for demo without backend

## Tech Stack

- **Framework**: React Native with Expo SDK 51
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation (Tabs + Stack)
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Language**: TypeScript (strict mode)
- **Shared Types**: @sharp/shared package

## Getting Started

```bash
# Install dependencies (from monorepo root)
npm install

# Start development server
npm run mobile:dev
# or
cd apps/mobile && npm run dev
```

## API Configuration

The app connects to `http://localhost:3001` by default. Update `API_BASE_URL` in `src/services/api.ts` to change.

When the backend is unavailable, the app automatically falls back to mock data for demonstration purposes.

## Navigation Flow

```
Auth Stack (when not logged in)
├── Login
└── Register

Main Tabs (when logged in)
├── Home Tab
│   ├── HomeScreen (categories)
│   ├── CategoryScreen (sub-categories)
│   ├── UnitListScreen (units)
│   ├── QuizScreen (quiz)
│   └── QuizResultScreen (results)
└── Profile Tab
    ├── ProfileScreen
    ├── SettingsScreen
    ├── RecordsScreen
    └── WrongQuestionsScreen
```

## Color Scheme

- Primary: #3B82F6 (blue-500)
- Background: #F9FAFB (gray-50)
- Success: #059669 (green-600)
- Error: #DC2626 (red-600)
- Warning: #D97706 (amber-600)

## Development Notes

- All components are functional with hooks
- Strict TypeScript typing throughout
- Types imported from @sharp/shared package
- Responsive layout with safe area handling
- Clean, modern UI with card-based design
