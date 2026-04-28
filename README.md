# Kerviqo Event Rental / Wedding Rental SaaS

Professional multi-tenant SaaS starter for Moroccan event/wedding rental businesses.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase RLS
- Optional Upstash Redis rate limiting
- Vercel deployment

## What is included

- Premium landing page
- Auth pages: login/register/logout foundation
- Protected SaaS dashboard shell
- Dashboard metrics API
- Materials API
- Clients API
- Bookings API with stock overbooking protection
- Payments API
- Upload API with plan storage limit check
- Admin owner page foundation
- SQL schema with RLS policies
- Audit logs and error logs
- Supabase Storage policies
- Environment variable example

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open:

```txt
http://localhost:3000
```

## Supabase setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Create a private Storage bucket named:

```txt
tenant-files
```

5. Add environment variables in `.env.local`.

## Vercel deployment

1. Push project to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.

## Production checklist

- Disable automatic email confirmation only if you really need it.
- Replace test/demo copy with your brand.
- Add payment provider later: Stripe, PayPal, CMI, Payzone, or manual Moroccan bank transfer workflow.
- Add backup strategy.
- Add monitoring.
- Add email provider for invoices/contracts.
- Add real PDF generation or server-side document templates.
