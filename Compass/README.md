# Compass — V1 (Sleep Tracker with AI Notes)

A private personal navigation app. **V1 focuses on: calm sleep tracking + gentle AI-written notes + correct timezone handling.**

## Quick Overview

| Aspect | Technology | Why |
|--------|-----------|-----|
| **App Type** | Mobile app (Android) | Installable on your device today; Google Play-ready later |
| **Frontend** | Expo + React Native + TypeScript | Single codebase for iOS/Android; hot reload; already in repo |
| **Authentication** | Google Sign-in (via Supabase Auth) | Free, secure, others can sign up easily |
| **Backend / Database** | Supabase (hosted PostgreSQL) | Free tier, auto-generated REST API, Row-Level Security built-in |
| **AI Generation** | Cloud Edge Function → Free hosted model | Calls Google Gemini / Groq free tier; hidden AI key never reaches phone |
| **Fallback Note** | Rule-based (no AI) | When AI quota is empty, returns simple rule-based note |
| **Cost** | **£0 / month** | All free tiers + your own hardware |

---

## Architecture

### The Split

The app **splits responsibility** into one platform:

```
📱 Android App
  └── ☁️ Supabase (always on)
      ├── Auth (Google login)
      ├── Postgres DB (your sleep data)
      └── Edge Function
          └── Free hosted AI model (Gemini / Groq)
```

**Why?**
- Everything is always on and accessible (one platform to look after).
- No servers to patch, tunnels to renew, or machines to keep switched on at home.
- AI key stays in the cloud—never exposed to the phone.
- If AI quota is empty, app falls back to rule-based note automatically.

---

## Project Structure

```
Compass/
├── README.md                    # This file
├── compass-v1-design.md        # Full design doc (scope, wireframes, UI flow)
├── architecture.html            # Architecture diagram (visual reference)
│
├── mobile/                      # React Native Expo app (TODO: create)
│   ├── app.json                 # Expo configuration
│   ├── package.json             # Dependencies
│   ├── src/
│   │   ├── App.tsx              # Main app shell + navigation
│   │   ├── index.ts             # Expo entry point
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts      # Supabase client init
│   │   │   ├── time.ts          # Timezone + duration helpers
│   │   │   └── ai.ts            # Edge Function client + fallback note
│   │   │
│   │   ├── auth/
│   │   │   ├── AuthGate.tsx     # Route: login OR app
│   │   │   ├── LoginScreen.tsx  # Google sign-in button
│   │   │   └── Onboarding.tsx   # Set home timezone
│   │   │
│   │   ├── screens/
│   │   │   ├── TodayScreen.tsx  # Log tonight's sleep
│   │   │   ├── WeekScreen.tsx   # Chart + AI note
│   │   │   └── HistoryScreen.tsx# Past entries list
│   │   │
│   │   ├── components/
│   │   │   ├── BottomTabs.tsx   # Tab navigation
│   │   │   ├── TimezonePicker.tsx
│   │   │   ├── DurationDisplay.tsx
│   │   │   └── Chart.tsx        # 7-day bar chart
│   │   │
│   │   └── styles/
│   │       └── theme.ts         # Colors, fonts, spacing
│   │
│   └── eas.json                 # EAS build config (Play Store)
│
├── backend/                     # Supabase setup (SQL + config)
│   ├── supabase/
│   │   ├── migrations/
│   │   │   └── 001_init.sql     # Tables: auth, profiles, sleep_entries
│   │   └── functions/
│   │       └── generate_note.ts # Edge Function for AI note generation
│   │
│   └── README.md                # DB schema + RLS policies
│
├── wireframe/                   # UI reference mockups
│   └── index.html               # Wireframe layouts
│
└── future-design/               # V2+ planning (not in V1)
    ├── plan-tab.html
    └── track-tab.html
```

---

## Tech Stack — Detailed

### Frontend Stack
- **React Native + Expo** — Write once, run on iOS + Android
- **TypeScript** — Type safety for robust code
- **React Navigation** — Tab-based UI (Today, Week, History)
- **React Native Date/Time Picker** — For sleep times + timezone shifting
- **@react-native-async-storage** — Offline-first local cache

### Authentication
- **Supabase Auth** — Handles Google OAuth
- **Google Cloud Console** — OAuth app setup
- **Secure Storage (expo-secure-store)** — Saves auth tokens locally

### Backend / Database
- **Supabase** — Managed PostgreSQL + REST API
- **PostgreSQL** — Relational schema (users, sleep entries, timezones)
- **Row-Level Security (RLS)** — Each user only sees their own data
- **Realtime Subscriptions** (optional) — Live chart updates across devices

### AI / Notes
- **Supabase Edge Functions** — Serverless function that generates notes
- **Free Hosted AI** (Gemini / Groq free tier) — Called by Edge Function for LLM
- **Rule-based fallback** — Simple text when AI quota is reached

### DevOps / Build
- **EAS (Expo Application Services)** — Cloud builds for Android
- **Google Play Console** — For future Play Store publishing

### Privacy & Compliance
- **Row-Level Security (RLS)** — Database enforces user isolation
- **Privacy modes** — Choose between simple (hosted AI) or private (local AI)
- **AI data handling** — Only numbers sent (never name, email, or login)

---

## V1 Scope

### ✅ In V1

- **Google Login** — One-tap sign-in
- **Onboarding** — Set your home timezone once
- **Today Screen**
  - Pick "went to bed" time
  - Pick "woke up" time
  - See duration live (e.g., "7h 35m")
  - Save to database
- **Week Screen**
  - 7-day bar chart (last week's sleep)
  - Average hours per week
  - **AI Note** — Gentle insight (e.g., "You averaged 6h 52m. Your longer nights cluster on weekends.")
- **History Screen** — Scrollable list of past nights
- **Timezone Management** — Switch time zone when travelling
- **Settings** — Change home timezone

### ❌ Not in V1 (V2+)

- Energy log
- Mood log
- Personal qualities tracking
- Planning / goals
- Chat
- Kanban board

---

## Getting Started

### Prerequisites

1. **Node.js + npm** (v18+)
2. **Expo CLI** — `npm install -g expo-cli`
3. **Android emulator** or physical Android device
4. **Supabase account** (free tier) — https://supabase.com
5. **Google OAuth app** (free) — Google Cloud Console

### Setup Steps

#### 1. Clone & Install
```bash
cd mobile
npm install
```

#### 2. Configure Supabase
- Create a free project at supabase.com
- Copy your **Project URL** and **Anon Key** from Settings > API Keys
- Create `.env.local`:
  ```
  SUPABASE_URL=<your-project-url>
  SUPABASE_ANON_KEY=<your-anon-key>
  ```

#### 3. Configure Google OAuth
- Go to https://console.cloud.google.com
- Create a new OAuth 2.0 app for Android
- Add your package name + SHA-1 fingerprint
- Copy Client ID to Supabase Auth > Providers > Google

#### 4. Set Up Database
- In Supabase, run the SQL from `backend/migrations/001_init.sql`
- This creates tables: `profiles`, `sleep_entries`, timezones

#### 5. Run the App
```bash
expo start
# Press 'a' for Android emulator
```

#### 6. (Optional) Privacy Mode
- By default, the Edge Function sends **numbers only** (sleep/energy/mood) to a free hosted AI model.
- Some free plans may use your data to improve their models.
- If you want complete privacy, see [section 03b in architecture.html](./architecture.html) for Mode 2 setup (local private AI).
- You can switch privacy modes anytime in Settings.

---

## File Naming & Conventions

- **Screens** → `*Screen.tsx` (e.g., `TodayScreen.tsx`)
- **Components** → `*.tsx` (e.g., `Chart.tsx`)
- **Utils / Libs** → `.ts` (e.g., `time.ts`, `ai.ts`)
- **Types** → Colocated with usage or in `types/index.ts`
- **Styles** → Inline with `StyleSheet.create()` or theme file

---

## Database Schema (V1)

### Tables

**users** (managed by Supabase Auth)
```sql
id UUID PRIMARY KEY
email TEXT
created_at TIMESTAMP
```

**profiles**
```sql
id UUID PRIMARY KEY (foreign key to auth.users)
home_timezone TEXT (e.g., 'Europe/Vilnius')
current_timezone TEXT (e.g., 'Europe/Vilnius')
created_at TIMESTAMP
updated_at TIMESTAMP
```

**sleep_entries**
```sql
id UUID PRIMARY KEY
user_id UUID (foreign key to profiles.id)
bed_time TIMESTAMP WITH TIME ZONE
wake_time TIMESTAMP WITH TIME ZONE
date_local DATE (the local date of the sleep entry)
duration_minutes INTEGER
note TEXT (AI-generated or rule-based)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Row-Level Security (RLS)

Each user sees **only** their own data:
```sql
-- On sleep_entries table
CREATE POLICY "users can see own entries"
  ON sleep_entries
  USING (user_id = auth.uid());
```

---

## Roadmap

### V1 (Current)
- Sleep logging + chart
- AI note
- Timezone support

### V2 (Next)
- Energy + mood logs (same UI pattern as sleep)
- Weekly review dashboard

### V3 (Future)
- Chat with AI about your patterns
- Goal setting + planning
- Kanban board for tasks

---

## References

- **Full Design Doc** → [compass-v1-design.md](./compass-v1-design.md)
- **Supabase Docs** → https://supabase.com/docs
- **Expo Docs** → https://docs.expo.dev
- **React Native Docs** → https://reactnative.dev

---

## Questions?

Each section above links to the appropriate documentation. Start with the **Tech Stack** section to understand what you're using, then follow **Getting Started** to spin up your first build.

Happy shipping! 🚀
