# Tiklo — Event Ticketing SaaS

## Claude Code Project Brief

-----

## Project Overview

**Tiklo** is a self-serve event ticketing SaaS platform targeting diaspora and multicultural event organizers in Canada. Think Eventbrite but simpler, cheaper, and culturally relevant. Organizers create events, sell tickets, and get paid via Stripe Connect. Buyers purchase tickets and receive QR codes by email. No sales calls. No complex setup.

-----

## Tech Stack

|Layer     |Choice                    |Reason                               |
|----------|--------------------------|-------------------------------------|
|Frontend  |React + Vite (PWA)        |Fast, reusable, mobile-first         |
|Styling   |Tailwind CSS              |Utility-first, rapid UI              |
|Backend/DB|Supabase                  |Auth, Postgres, storage, realtime    |
|Payments  |Stripe + Stripe Connect   |Ticket sales + organizer payouts     |
|Email     |Resend.com                |Ticket delivery, transactional emails|
|QR Codes  |`qrcode` npm package      |Generate QR per ticket               |
|QR Scanner|`html5-qrcode` npm package|Web-based check-in scanner           |
|Hosting   |Vercel                    |Fast deploys, PWA support            |

-----

## Project Structure

```
tiklo/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/
├── src/
│   ├── components/
│   │   ├── ui/                # Shared UI components (Button, Input, Modal, Badge)
│   │   ├── EventCard.jsx      # Public event listing card
│   │   ├── TicketTypeRow.jsx  # Ticket type form row
│   │   └── QRScanner.jsx      # Check-in scanner component
│   ├── pages/
│   │   ├── Home.jsx           # Public event listings
│   │   ├── EventPage.jsx      # Single event + buy tickets
│   │   ├── Checkout.jsx       # Stripe checkout flow
│   │   ├── TicketConfirm.jsx  # Post-purchase confirmation + QR
│   │   ├── Login.jsx          # Organizer auth
│   │   ├── Register.jsx       # Organizer signup
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx       # Organizer home
│   │   │   ├── CreateEvent.jsx     # Create/edit event form
│   │   │   ├── EventDetail.jsx     # Sales + attendee list
│   │   │   └── CheckIn.jsx         # QR scanner for door
│   │   └── admin/
│   │       ├── AdminDashboard.jsx  # Platform overview
│   │       └── AdminOrganizers.jsx # Approve/manage organizers
│   ├── lib/
│   │   ├── supabase.js        # Supabase client
│   │   ├── stripe.js          # Stripe client
│   │   └── resend.js          # Email helper
│   ├── hooks/
│   │   ├── useAuth.js         # Auth state hook
│   │   └── useEvent.js        # Event data hook
│   ├── context/
│   │   └── AuthContext.jsx    # Global auth context
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── migrations/            # SQL migration files
├── api/                       # Vercel serverless functions
│   ├── create-checkout.js     # Stripe checkout session
│   ├── stripe-webhook.js      # Stripe webhook handler
│   └── create-connect.js      # Stripe Connect onboarding
├── .env.local
├── vite.config.js
└── CLAUDE.md                  # This file
```

-----

## Database Schema (Supabase / Postgres)

### `profiles`

```sql
id uuid references auth.users primary key,
email text,
full_name text,
role text default 'organizer',        -- 'organizer' | 'admin'
approved boolean default false,        -- Admin must approve
payment_method text,                   -- 'interac' | 'bank_transfer'
payment_details text,                  -- Interac email or bank info (JSON)
created_at timestamptz default now()
```

### `events`

```sql
id uuid primary key default gen_random_uuid(),
organizer_id uuid references profiles(id),
title text not null,
description text,
location text,
event_date timestamptz not null,
banner_url text,
community_tag text,                    -- 'African' | 'Caribbean' | 'South Asian' | 'Latin' | 'Other'
city text,                             -- 'Ottawa' | 'Toronto' | 'Montreal' | etc.
status text default 'draft',           -- 'draft' | 'published' | 'cancelled'
created_at timestamptz default now()
```

### `ticket_types`

```sql
id uuid primary key default gen_random_uuid(),
event_id uuid references events(id),
name text not null,                    -- 'General' | 'VIP' | 'Early Bird'
price numeric(10,2) not null,          -- 0.00 for free
quantity int not null,
quantity_sold int default 0,
created_at timestamptz default now()
```

### `orders`

```sql
id uuid primary key default gen_random_uuid(),
event_id uuid references events(id),
ticket_type_id uuid references ticket_types(id),
buyer_email text not null,
buyer_name text not null,
quantity int not null,
subtotal numeric(10,2),
platform_fee numeric(10,2),
stripe_payment_intent text,
status text default 'pending',         -- 'pending' | 'paid' | 'refunded'
created_at timestamptz default now()
```

### `tickets`

```sql
id uuid primary key default gen_random_uuid(),
order_id uuid references orders(id),
event_id uuid references events(id),
ticket_type_id uuid references ticket_types(id),
buyer_name text,
buyer_email text,
qr_code text unique,                   -- UUID used as QR payload
checked_in boolean default false,
checked_in_at timestamptz,
created_at timestamptz default now()
```

-----

## Core User Flows

### 1. Organizer Registration & Onboarding

1. Organizer signs up with email/password (Supabase Auth)
1. Admin receives notification → approves account in admin panel
1. Organizer connects Stripe account via Stripe Connect OAuth
1. Organizer can now create and publish events

### 2. Create Event

1. Organizer fills event form: title, date, location, city, community tag, description, banner image
1. Adds ticket types: name, price, quantity
1. Saves as draft → previews → publishes
1. Gets shareable public URL: `tiklo.ca/events/[slug]`

### 3. Buyer Purchases Ticket

1. Buyer lands on public event page
1. Selects ticket type + quantity
1. Enters name + email
1. Pays via Stripe (card)
1. Stripe webhook fires → order marked paid → tickets generated with unique QR codes
1. Resend sends email with PDF/QR ticket(s)

### 4. Check-In at Door

1. Organizer opens `tiklo.ca/checkin/[event-id]` on their phone
1. Camera activates — scans attendee QR code
1. System validates ticket → marks as checked in
1. Shows green (valid) or red (invalid/already used)

### 5. Organizer Payout

- All ticket revenue is collected into **Tiklo’s own Stripe account**
- Tiklo deducts the platform fee (2.5% + $0.99/ticket) and pays the net to the organizer
- Organizers receive payment via **Interac e-Transfer or bank transfer** from Tiklo’s bank account — manually initiated by Tiklo admin after each event
- Organizers store their payout preference (Interac email or bank details) in their profile — Tiklo uses this to send the transfer
- There is **no Stripe Connect, no organizer Stripe account, no application_fee_amount** in this flow

-----

## Fee Structure

```
Free events:         $0 platform fee
Paid events:         2.5% + $0.99 per ticket
Organizer Pro:       $19.99/month → 1.5% + $0.49 per ticket
```

**Implementation:** Fee is calculated at checkout and stored in `orders.platform_fee`. Tiklo collects the full amount via its own Stripe account, then manually transfers the net (subtotal − fee) to the organizer via Interac or bank transfer after the event. No Stripe Connect.

-----

## Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://eeltgjgfmdvmtghtssyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHRnamdmbWR2bXRnaHRzc3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTQ4ODEsImV4cCI6MjA5NzI5MDg4MX0.59Il1N2wO3AEynZ_Ngx7Dx_B27bZ6LXIcW19MQav96U
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHRnamdmbWR2bXRnaHRzc3l6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcxNDg4MSwiZXhwIjoyMDk3MjkwODgxfQ.qTcXa7Jk2BdGjI8DkCAd51P2qQClBX_zJrkpHe4Y9dY

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CLIENT_ID=                      # For Connect OAuth

# Resend
RESEND_API_KEY=

# App
VITE_APP_URL=http://localhost:5173
```

-----

## API Endpoints (Vercel Serverless)

### `POST /api/create-checkout`

- Creates Stripe PaymentIntent with application fee
- Input: `{ event_id, ticket_type_id, quantity, buyer_name, buyer_email }`
- Returns: `{ client_secret }`

### `POST /api/stripe-webhook`

- Handles `payment_intent.succeeded`
- Creates order record, generates tickets with UUIDs as QR payloads
- Triggers Resend email with QR codes

### `POST /api/notify-admin-event`

- Called when an organizer submits an event for approval
- Sends notification email to Tiklo admin with event details, preview link, and organizer reply-to

### `POST /api/refund`

- Organizer-initiated: marks order as `refund_requested`, emails Tiklo admin to process manually

### `GET /api/event-orders`

- Returns paginated orders for an event (bypasses RLS, verifies organizer ownership via JWT)

-----

## Pages & Routes

|Route                  |Page                           |Access   |
|-----------------------|-------------------------------|---------|
|`/`                    |Public event listings          |Public   |
|`/events/:slug`        |Single event page + buy tickets|Public   |
|`/checkout/:orderId`   |Stripe Elements checkout       |Public   |
|`/ticket/:ticketId`    |Ticket confirmation + QR       |Public   |
|`/login`               |Organizer login                |Public   |
|`/register`            |Organizer signup               |Public   |
|`/dashboard`           |Organizer home                 |Organizer|
|`/dashboard/events/new`|Create event                   |Organizer|
|`/dashboard/events/:id`|Event stats + attendees        |Organizer|
|`/dashboard/profile`   |Profile, payout info, settings |Organizer|
|`/checkin/:eventId`    |QR scanner                     |Organizer|
|`/admin`               |Admin dashboard                |Admin    |
|`/admin/organizers`    |Approve organizers             |Admin    |

-----

## Build Order (Phase by Phase)

### Phase 1 — Foundation (Week 1–2)

- [ ] Vite + React + Tailwind setup
- [ ] Supabase project + all migrations
- [ ] Supabase Auth (email/password)
- [ ] AuthContext + useAuth hook
- [ ] Basic routing (React Router v6)
- [ ] PWA manifest + service worker

### Phase 2 — Organizer Core (Week 3–4)

- [ ] Register / Login pages
- [ ] Organizer dashboard shell
- [ ] Create event form with ticket types
- [ ] Image upload to Supabase Storage
- [ ] Event publish/draft toggle
- [ ] Public event listing page (Home)
- [ ] Single event page (EventPage)

### Phase 3 — Payments (Week 5)

- [ ] Stripe Connect onboarding flow
- [ ] `/api/create-checkout` serverless function
- [ ] Stripe Elements checkout page
- [ ] `/api/stripe-webhook` handler
- [ ] Order + ticket generation on payment success
- [ ] Resend ticket email with QR code

### Phase 4 — Check-In & Dashboard (Week 6)

- [ ] QR scanner (CheckIn page)
- [ ] Ticket validation endpoint
- [ ] Organizer event detail: sales chart, attendee list, CSV export
- [ ] Admin panel: organizer approval, platform revenue overview

### Phase 5 — Polish & Launch (Week 7–8)

- [ ] Mobile responsive pass
- [ ] Loading states + error handling
- [ ] Empty states for all pages
- [ ] SEO meta tags per event page
- [ ] Deploy to Vercel
- [ ] Connect custom domain
- [ ] End-to-end test: create event → buy ticket → check in

-----

## Key Packages

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "@stripe/stripe-js": "^3",
    "@stripe/react-stripe-js": "^2",
    "react-router-dom": "^6",
    "qrcode": "^1.5",
    "html5-qrcode": "^2.3",
    "react-hook-form": "^7",
    "date-fns": "^3",
    "recharts": "^2"
  },
  "devDependencies": {
    "vite": "^5",
    "tailwindcss": "^3",
    "@vitejs/plugin-react": "^4"
  }
}
```

-----

## Design Tokens

```css
/* Colors */
--color-primary: #7C3AED;      /* Purple — main CTA */
--color-accent: #F59E0B;       /* Amber — highlights */
--color-bg: #0F0F0F;           /* Near black */
--color-surface: #1A1A2E;      /* Card backgrounds */
--color-text: #F8FAFC;         /* Primary text */
--color-muted: #94A3B8;        /* Secondary text */

/* Typography */
--font-heading: 'Syne', sans-serif;
--font-body: 'Inter', sans-serif;
```

-----

## Constraints & Rules for Claude Code

1. **Never build payment logic client-side** — all Stripe secret key usage goes in `/api` serverless functions only
1. **Use Supabase RLS** — every table must have Row Level Security policies; organizers can only read/write their own data
1. **QR payload is a UUID** — never expose order ID or personal data in the QR code string
1. **Mobile-first** — all pages must be fully usable on a 375px screen
1. **No native app** — PWA only; check-in scanner must work in mobile Chrome/Safari
1. **Keep it simple** — if a feature isn’t in this doc, don’t build it yet

-----

## First Command for Claude Code

```
Read this CLAUDE.md fully. Then start with Phase 1:
1. Scaffold the Vite + React + Tailwind project
2. Create the Supabase migration files for all 5 tables
3. Set up AuthContext with login, logout, and session persistence
4. Create the basic React Router routes shell with placeholder pages
Do not proceed to Phase 2 until Phase 1 is complete and confirmed.
```