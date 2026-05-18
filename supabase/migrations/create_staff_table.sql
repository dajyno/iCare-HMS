-- Run this in Supabase Dashboard → SQL Editor

create table public.staff (
  id uuid default gen_random_uuid() primary key,
  staff_id text unique not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  position text not null,
  department text default '',
  availability_status text default 'Active',
  is_clinician boolean default false,
  gender text default '',
  address text default '',
  can_login boolean default false,
  password text default '',
  profile_picture text default '',
  permissions jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS (we'll bypass with service_role key)
alter table public.staff enable row level security;
