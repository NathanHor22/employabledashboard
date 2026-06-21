# EmployAble Dashboard

An administrator dashboard for a neurodivergent employment programme, built to give programme staff a clear operational view of candidates, employer partners, and placements.

**Live:** https://employabledashboard.vercel.app

## What it does

EmployAble supports a Malaysian programme that connects neurodivergent jobseekers with inclusive employers. The dashboard is the operational backbone. Staff use it to:

- Manage candidate profiles and track progress through the programme
- Maintain employer partners and open opportunities
- Match candidates to roles based on skills, support needs, and fit
- Surface programme-level metrics for stakeholder reporting

Role-based access means candidates, employer contacts, and programme administrators each see different views of the same underlying data.

## Tech stack

- **Next.js** (App Router) with TypeScript
- **Supabase** for Postgres, authentication, and row-level security
- **PL/pgSQL** migrations and RLS policies in `supabase/`
- **Tailwind CSS** for styling
- Deployed on **Vercel**

## Context

Built in collaboration with [Yayasan Bursa Malaysia](https://yayasanbursa.org.my/) for an active neurodivergent employment initiative. Currently in active development. The live deployment reflects the current working state, not a final release.

## Run locally

```bash
npm install

# Set Supabase URL and anon key in .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
