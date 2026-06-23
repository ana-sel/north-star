# Backend / Supabase Setup

## Overview

Compass uses **Supabase** (PostgreSQL + REST API) as the backend. No custom API to build — Supabase auto-generates it.

## Database Schema

### V1 (Sleep Tracking)

```sql
-- Users table (managed by Supabase Auth)
-- auth.users → id, email, created_at

-- Profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  home_timezone TEXT NOT NULL DEFAULT 'UTC',
  active_timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sleep entries table
CREATE TABLE sleep_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  sleep_start_utc TIMESTAMPTZ NOT NULL,
  sleep_end_utc TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL, -- IANA timezone name
  duration_minutes INT GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (sleep_end_utc - sleep_start_utc)) / 60
  ) STORED,
  note TEXT, -- AI-generated or rule-based
  energy SMALLINT, -- V2: nullable, 1-10 scale
  mood SMALLINT, -- V2: nullable, 1-10 scale
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_sleep_entries_user_id ON sleep_entries(user_id);
CREATE INDEX idx_sleep_entries_created_at ON sleep_entries(created_at DESC);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

### V2 (Energy & Mood Tracking)
- Add nullable fields `energy` and `mood` to `sleep_entries` (already in schema above)
- Or separate tables `energy_entries` and `mood_entries` if you prefer

### V3 (Planning)
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active, completed, archived
  priority TEXT DEFAULT 'medium', -- high, medium, low
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  goal_id UUID REFERENCES goals(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- todo, in-progress, done
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
```

## Row-Level Security (RLS)

Enable RLS on all tables to ensure each user only sees their own data:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/write their own profile
CREATE POLICY "users_can_read_own_profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sleep entries: users can only read/write their own
CREATE POLICY "users_can_read_own_sleep"
  ON sleep_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_sleep"
  ON sleep_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_sleep"
  ON sleep_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Goals & Tasks: same pattern
-- (Repeat for goals and tasks tables)
```

## Edge Functions (Cloud AI)

### Create the Function

In Supabase dashboard:
1. Go to **Edge Functions** → **Create a New Function**
2. Name it `generate-note`
3. Choose TypeScript

### File: `supabase/functions/generate-note/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nights, user_id } = await req.json();

    if (!nights || nights.length === 0) {
      return new Response(
        JSON.stringify({ note: "No sleep data yet." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call free hosted AI model (Gemini or Groq)
    const aiNote = await callAIModel(nights, user_id);

    return new Response(JSON.stringify({ note: aiNote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);

    // Fallback: return empty note (client will use rule-based fallback)
    return new Response(JSON.stringify({ note: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAIModel(nights: any[], userId: string): Promise<string> {
  // TODO: Implement call to Gemini or Groq free-tier API
  // Remember: only send numbers, never user_id or personal info
  // Example placeholder:
  return `You averaged ${nights.length} nights of sleep.`;
}
```

## Setup Instructions

### 1. Create Supabase Project
- Go to https://supabase.com → Create a new project
- Choose a region close to your users
- Note the **Project URL** and **Anon Key**

### 2. Initialize Database
- In Supabase dashboard, go to SQL Editor
- Create new query
- Copy the schema from `migrations/001_init.sql` (you'll create this)
- Run it

### 3. Enable Google OAuth
- Supabase dashboard → Authentication → Providers → Google
- Get OAuth client ID from Google Cloud Console
- Add it to Supabase

### 4. Environment Variables
In `mobile/.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Test Connection
```bash
cd mobile
npm install
npm start
# Try signing in with Google
```

## Operations

### Backup
- Supabase provides automatic daily backups (free tier: 7 days)
- For production, enable Point-in-Time Recovery (paid)

### Monitoring
- Monitor query performance in Supabase dashboard
- Watch for N+1 queries in real-time

### Scaling
- Free tier: 100K max rows
- Pro tier: unlimited

## Migrations

As features grow, create migration files in `supabase/migrations/`:

Example: `002_add_energy_mood.sql`
```sql
ALTER TABLE sleep_entries ADD COLUMN energy SMALLINT;
ALTER TABLE sleep_entries ADD COLUMN mood SMALLINT;
```

## Privacy & Compliance

- **Row-Level Security**: Enforced at database level ✅
- **Encryption in transit**: HTTPS only ✅
- **User data**: Never leaves Supabase except to call AI (numbers only)

## References

- Supabase docs: https://supabase.com/docs
- Database design: See compass-v1-design.md § 6
- RLS guide: https://supabase.com/docs/guides/auth/row-level-security
