<div align="center">
  <img src="./logo.png" alt="iCare HIMS" width="120" />
  <h1>iCare HIMS</h1>
  <p><strong>Multi-Tenant Hospital Information Management System</strong></p>
  <p>A comprehensive hospital operations platform built with React 19, TypeScript, Supabase, and Express.</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript 5.8" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" alt="Vite 6" />
    <img src="https://img.shields.io/badge/Supabase-FF4438?logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/License-TBD-lightgrey" alt="License" />
  </p>
</div>

---

## Features

### 🏢 Super Admin Platform
- **SaaS Multi-Tenant** — Manage hospital tenants with URL-slug routing (`/:hospital_slug/*`)
- **Subscription Tiers** — Standard, Premium, Enterprise with configurable seat/bed limits and module access
- **Tenant Provisioning** — CRUD for hospital accounts, module overrides, status management
- **Platform Monitoring** — Health dashboard, aggregate metrics (MRR, active subscriptions, tenant usage)

### 🏥 Hospital Operations

| Module | Capabilities |
|--------|-------------|
| **Dashboard** | KPI overview: patient counts, today's appointments, pending labs, daily revenue, upcoming consultations, critical alerts |
| **Patient Management** | Registration, search, filtering, pagination. Supports Individual, Family, Corporate, and HMO categories with insurance/company tracking |
| **Appointment Scheduling** | Grid and list views, 15-min time slots (8AM–8PM), drag-and-drop status transitions, conflict detection, 8 appointment statuses |
| **EMR / Clinical Workspace** | Comprehensive consultation flow: chief complaints, symptoms, diagnosis, vital signs (BMI, SpO2, BP, etc.), prescriptions, lab/radiology ordering, follow-up scheduling |
| **Laboratory** | Test order queue, sample collection workflow, result entry with reference ranges, 6 statuses (Requested → Sample Collected → In Progress → Awaiting Validation → Completed → Cancelled) |
| **Radiology** | Exam ordering, batch processing, diagnostic findings and conclusion entry, category management |
| **Pharmacy** | Prescription terminal with search/filter, dispensing with automatic stock deduction, medication catalog, inventory matrix with CSV upload, revenue analytics |
| **Billing & Invoices** | Invoice creation from 6 source types (consultation, lab, pharmacy, radiology, admission, other), partial payments, refunds, CSV export, outstanding balance tracking |
| **Inpatient Management** | Real-time ward occupancy board, admission wizard, patient workspace with vitals journal, Medication Administration Record (MAR), fluid balance tracking, discharge processing with invoice generation |
| **Inventory Control** | Stock tracking with low-stock alerts, supplier management, purchase orders (5 statuses), expiry date tracking |
| **Staff Administration** | Staff directory with TanStack Table (sort/pagination/filter), CSV bulk upload, profile management with pictures, clinician/non-clinician distinction |
| **Accounting** | Income & expense registries, general ledger, bank account management with reconciliation tool, transaction verification workflow, financial reports |
| **Reports Hub** | Analytics command center with date-range filtering, drill-down modals, Recharts visualizations for clinical and staff metrics |

### 🔧 System Features
- **Role-Based Access Control** — 9 roles: SuperAdmin, HospitalAdmin, Receptionist, Doctor, Nurse, LabTechnician, Pharmacist, BillingOfficer, InventoryOfficer
- **Subscription Module Gating** — Tier-based feature locking with per-tenant module overrides
- **Audit Logging** — Full activity trail across all operations with user/action/entity tracking
- **Notification System** — In-app alerts for critical events
- **Customizable Settings** — General, Financial (currency, VAT, payment terms), Security (RBAC matrix, route overrides), Notifications, Regional (timezone, date format), Database (backup/restore)

---

## Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="" alt="Dashboard Overview" width="400" /><br/><em>Dashboard Overview</em></td>
      <td align="center"><img src="" alt="Appointment Scheduling" width="400" /><br/><em>Appointment Scheduling</em></td>
    </tr>
    <tr>
      <td align="center"><img src="" alt="Consultation Workspace" width="400" /><br/><em>Consultation Workspace (EMR)</em></td>
      <td align="center"><img src="" alt="Inpatient Ward Board" width="400" /><br/><em>Inpatient Ward Board</em></td>
    </tr>
    <tr>
      <td align="center"><img src="" alt="Super Admin Portal" width="400" /><br/><em>Super Admin Portal</em></td>
      <td align="center"><img src="" alt="Pharmacy Terminal" width="400" /><br/><em>Pharmacy Prescription Terminal</em></td>
    </tr>
  </table>
</div>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build Tool** | Vite 6 |
| **Routing** | React Router DOM v7 (nested layouts, URL params) |
| **Data Fetching** | TanStack React Query v5 |
| **Tables** | TanStack React Table v8 |
| **Forms & Validation** | React Hook Form v7 + Zod v4 |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Radix UI primitives) |
| **Icons** | Lucide React |
| **Charts & Animation** | Recharts, Motion (Framer) |
| **Date Handling** | date-fns v4 |
| **Backend** | Express.js + Prisma ORM + SQLite |
| **Database (Cloud)** | Supabase (PostgreSQL) via Supabase JS SDK |
| **Authentication** | Supabase Auth + Custom JWT (jose + bcryptjs) |

---

## Architecture

The application supports **two deployment modes** and a **multi-tenant architecture**:

```
┌──────────────────────────────────────────────────────┐
│                    iCare HIMS                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ Super Admin      │  │ Tenant Hospitals          │  │
│  │ /admin/*         │  │ /:hospital_slug/*         │  │
│  │ (dark theme)     │  │ (blue/white theme)        │  │
│  └────────┬─────────┘  └──────────┬────────────────┘  │
│           │                       │                    │
│  ┌────────┴───────────────────────┴────────────────┐  │
│  │           TenantRouteGuard                      │  │
│  │  • Resolves tenant by URL slug                  │  │
│  │  • Checks authentication                        │  │
│  │  • Enforces RBAC (route-level)                  │  │
│  │  • Enforces subscription module gating          │  │
│  └──────────────────────┬──────────────────────────┘  │
│                         │                              │
│  ┌──────────────────────┴──────────────────────────┐  │
│  │   TanStack React Query (caching + refetching)    │  │
│  └──────────────────────┬──────────────────────────┘  │
│                         │                              │
│  ┌──────────┬───────────┴──────────┬────────────────┐  │
│  │Supabase  │ Express +            │ localStorage   │  │
│  │JS SDK    │ Prisma + SQLite      │ (cache/fallback)│  │
│  │(cloud)   │ (self-hosted)        │                │  │
│  │PostgreSQL│ JWT auth             │ Browser Store  │  │
│  └──────────┴──────────────────────┴────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Deployment Modes

1. **Supabase (Cloud)** — Frontend connects directly to Supabase PostgreSQL via the Supabase JS SDK. No Express server needed. Recommended for production.

2. **Self-Hosted (Local/On-Premise)** — Express server with Prisma ORM against a local SQLite database. JWT-based authentication. Ideal for development or air-gapped environments.

---

## Project Structure

```
icare-hims/
├── src/
│   ├── App.tsx                          # Router + providers
│   ├── main.tsx                         # Entry point
│   ├── constants.ts                     # Roles, audit actions, statuses
│   ├── index.css                        # Global styles + Tailwind
│   ├── context/
│   │   ├── AuthContext.tsx              # Supabase auth state (tenant users)
│   │   ├── AdminAuthContext.tsx         # Supabase auth state (platform admins)
│   │   ├── TenantContext.tsx            # Tenant resolution by URL slug
│   │   ├── GlobalSettingsContext.tsx    # RBAC matrix, financial config
│   │   └── StaffContext.tsx             # Staff CRUD context
│   ├── hooks/                           # Custom React hooks (per-module)
│   ├── layouts/
│   │   ├── DashboardLayout.tsx          # Hospital sidebar + header shell
│   │   └── AdminLayout.tsx              # Super Admin dark-theme shell
│   ├── pages/
│   │   ├── Admin/                       # Super Admin portal
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── PlatformOverview.tsx     # SaaS metrics dashboard
│   │   │   ├── TenantsDirectory.tsx     # Tenant CRUD
│   │   │   ├── TenantDetail.tsx         # Tenant configuration deep-dive
│   │   │   ├── LicensingManager.tsx     # Subscription tier management
│   │   │   └── HealthMonitor.tsx        # Infrastructure health
│   │   ├── Auth/                        # Tenant login
│   │   ├── Dashboard/                   # KPI overview
│   │   ├── Patients/                    # Patient registry + profiles
│   │   ├── Appointments/                # Scheduling grid/list
│   │   ├── Consultations/               # EMR clinical workspace
│   │   ├── Laboratory/                  # Lab queue + results
│   │   ├── Radiology/                   # Radiology exam management
│   │   ├── Pharmacy/                    # Prescriptions + inventory + analytics
│   │   ├── Billing/                     # Invoices + payments
│   │   ├── Inpatient/                   # Ward board + admissions + MAR + fluids
│   │   ├── Inventory/                   # Hospital supplies
│   │   ├── Accounting/                  # Ledger + registries + reconciliation
│   │   ├── Reports/                     # Analytics hub
│   │   ├── Staff/                       # Staff directory + profiles
│   │   └── Settings/                    # Multi-tab system settings
│   ├── services/                        # Server-side service layer (Prisma)
│   ├── lib/                             # Supabase client, types, utils
│   ├── types/                           # Shared TypeScript type definitions
│   └── components/                      # Shared UI components
├── components/ui/                       # shadcn/ui components (Radix primitives)
├── prisma/
│   ├── schema.prisma                    # Database schema (30+ models)
│   ├── seed.ts                          # Sample data
│   └── dev.db                           # Local SQLite database
├── supabase/
│   └── migrations/                      # Supabase migration files
├── supabase-schema.sql                  # PostgreSQL schema for Supabase
├── server.ts                            # Express backend (self-hosted mode)
├── vite.config.ts                       # Vite configuration
├── tsconfig.json                        # TypeScript configuration
├── vercel.json                          # Vercel deployment config
├── netlify.toml                         # Netlify deployment config
├── .env.example                         # Environment variable template
└── metadata.json                        # Project metadata
```

---

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **Supabase project** — [create one free](https://supabase.com)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/your-org/icare-hims.git
cd icare-hims
npm install

# 2. Configure environment
cp .env.example .env
```

Edit `.env` with your Supabase project credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

**Option A — Supabase (Cloud):**
1. Open your Supabase project's **SQL Editor**
2. Paste and run [`supabase-schema.sql`](./supabase-schema.sql) — creates all tables, RLS policies, and seed data
3. Go to **Authentication → Settings** and **disable "Confirm email"** (required for auto-provisioning)

**Option B — SQLite (Local):**
```bash
npx prisma db push
npx prisma db seed
```

### Run

```bash
npm run dev
```

The app runs on `http://localhost:5173` by default.

---

## Default Login Credentials

Accounts are auto-provisioned on first login. Use any of the following:

| Email | Password | Role |
|-------|----------|------|
| `admin@icare.com` | `password123` | SuperAdmin |
| `alice@icare.com` | `password123` | Doctor |
| `bob@icare.com` | `password123` | Doctor |
| `jane@icare.com` | `password123` | Nurse |
| `sam@icare.com` | `password123` | LabTechnician |
| `phil@icare.com` | `password123` | Pharmacist |

---

## API Endpoints (Self-Hosted Mode)

When running with the Express backend (`server.ts` on port 3000):

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | System health check |
| `POST` | `/api/auth/login` | JWT-based login |
| `GET` | `/api/auth/me` | Current authenticated user |
| `GET` | `/api/patients` | List patients |
| `POST` | `/api/patients` | Create patient |
| `GET` | `/api/patients/:id` | Patient with full history |
| `GET` | `/api/appointments` | List appointments (with filters) |
| `POST` | `/api/appointments` | Create appointment |
| `GET` | `/api/reports/dashboard` | Dashboard KPI statistics |
| `POST` | `/api/consultations` | Create consultation (transactional) |
| `GET` | `/api/lab/tests` | List active lab tests |
| `GET` | `/api/lab/requests` | List lab requests |
| `POST` | `/api/lab/results` | Submit lab result |
| `GET` | `/api/pharmacy/prescriptions` | List prescriptions |
| `POST` | `/api/pharmacy/prescriptions` | Create prescription |
| `POST` | `/api/pharmacy/dispense` | Dispense medication |
| `GET` | `/api/inpatient/beds` | List beds with ward info |
| `GET` | `/api/inventory/items` | List inventory items |
| `GET` | `/api/invoices` | List invoices |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_SUPABASE_SERVICE_KEY` | No | Service role key (admin operations) |
| `GEMINI_API_KEY` | No | Google Gemini API key (AI features) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type-checking |
| `npm run clean` | Remove dist directory |

---

## Deployment

### Vercel

```bash
npm run build
vercel --prod
```

Pre-configured via [`vercel.json`](./vercel.json) with SPA redirect support.

### Netlify

```bash
npm run build
netlify deploy --prod
```

Pre-configured via [`netlify.toml`](./netlify.toml) with SPA redirect support.

---

## Contributing

Contributions are welcome. Please open an issue or pull request on GitHub.

---

## License

TBD — All rights reserved unless otherwise specified.

---

<div align="center">
  <sub>Built with React 19, TypeScript, Tailwind CSS, shadcn/ui, and Supabase</sub>
</div>
