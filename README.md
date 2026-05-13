<div align="center">
  <h1>iCare HIMS</h1>
  <p><strong>Hospital Information Management System — Enterprise v2.4.1</strong></p>
  <p>A centralized hospital operations platform designed to digitize patient registration, appointments, clinical records, billing, laboratory workflows, pharmacy dispensing, inpatient management, inventory control, and staff administration.</p>
</div>

---

## Features

- **Dashboard** — KPI overview: total patients, today's appointments, pending labs, daily revenue, upcoming consultations, critical alerts
- **Patient Management** — Registration, search, filtering, profile management, patient history
- **Appointment Scheduling** — Book, reschedule, and manage appointments with status tracking
- **EMR / Clinical Workspace** — Comprehensive consultation workflow: chief complaints, diagnosis, vital signs capture, prescription writing, lab test ordering
- **Laboratory Queue** — View pending test requests, collect samples, publish results
- **Pharmacy Queue** — Dispense medications with automatic stock deduction
- **Billing & Invoices** — Invoice creation, payment tracking, outstanding balances, CSV export
- **Inpatient / Bed Management** — Real-time ward occupancy view, admissions and discharges
- **Inventory Management** — Stock tracking, low-stock alerts, supplier management, purchase orders
- **Role-Based Access Control** — 9 user roles (SuperAdmin, HospitalAdmin, Receptionist, Doctor, Nurse, LabTechnician, Pharmacist, BillingOfficer, InventoryOfficer)
- **Audit Logging** — Full activity trail across all operations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build Tool** | Vite 6 |
| **Routing** | React Router DOM v7 |
| **Data Fetching** | TanStack React Query v5 |
| **Forms & Validation** | React Hook Form v7 + Zod v4 |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Backend** | Express.js + Prisma ORM + SQLite |
| **Database** | Supabase (PostgreSQL) or local SQLite via Prisma |
| **Auth** | Supabase Auth + JWT (jose + bcryptjs) |

## Prerequisites

- **Node.js** >= 18

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key   # optional, for AI features
```

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app runs on `http://localhost:5173` by default.

### Seed Data

To populate the database with sample data:

```bash
npx tsx prisma/seed.ts
```

### Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@icare.com` | `password123` | SuperAdmin |
| `alice@icare.com` | `password123` | Doctor |
| `bob@icare.com` | `password123` | Doctor |
| `jane@icare.com` | `password123` | Nurse |
| `sam@icare.com` | `password123` | LabTechnician |
| `phil@icare.com` | `password123` | Pharmacist |

## Project Structure

```
icare-hims/
├── src/
│   ├── App.tsx                   # Router + providers
│   ├── main.tsx                  # Entry point
│   ├── constants.ts              # Roles, audit actions, statuses
│   ├── context/
│   │   └── AuthContext.tsx       # Supabase auth state
│   ├── layouts/
│   │   └── DashboardLayout.tsx   # Sidebar + header shell
│   ├── pages/
│   │   ├── Auth/Login.tsx
│   │   ├── Dashboard/            # Overview, Profile, Settings
│   │   ├── Patients/
│   │   ├── Appointments/
│   │   ├── EMR/                  # ConsultationWorkspace
│   │   ├── Laboratory/
│   │   ├── Pharmacy/
│   │   ├── Billing/
│   │   ├── Inpatient/
│   │   └── Inventory/
│   ├── services/                  # Server-side service layer (Prisma)
│   └── lib/                       # Supabase client, types, utils
├── components/ui/                 # shadcn/ui components
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Sample data
│   └── dev.db                     # Local SQLite database
├── server.ts                      # Express backend
├── supabase-schema.sql            # PostgreSQL schema for Supabase
├── vite.config.ts
├── netlify.toml                   # Netlify deployment
└── vercel.json                    # Vercel deployment
```

## Architecture

The app supports two deployment modes:

1. **Supabase (cloud)** — Frontend connects directly to Supabase PostgreSQL via the Supabase JS SDK. No Express server needed.
2. **Self-hosted (local)** — Express server with Prisma ORM against a local SQLite database. JWT-based authentication.

## Deployment

### Vercel

```bash
npm run build
vercel --prod
```

### Netlify

```bash
npm run build
netlify deploy --prod
```

Both platforms are pre-configured via `vercel.json` and `netlify.toml` with SPA redirect support.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type-checking |
| `npm run clean` | Remove dist directory |

---

<div align="center">
  <sub>Built with React, TypeScript, Tailwind CSS, and shadcn/ui</sub>
</div>
