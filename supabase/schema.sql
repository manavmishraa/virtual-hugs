-- Virtual Hugs Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  paired_with uuid references public.users(id),
  created_at timestamptz default now()
);

-- Pairings table
create table public.pairings (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'dissolved')),
  invited_email text not null,
  created_at timestamptz default now()
);

-- Hugs table
create table public.hugs (
  id uuid primary key default uuid_generate_v4(),
  pairing_id uuid not null references public.pairings(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  hug_type text not null check (hug_type in ('warm', 'tight', 'nudge')),
  status text not null default 'sent' check (status in ('sent', 'received', 'expired')),
  sent_at timestamptz default now(),
  received_at timestamptz
);

-- Indexes
create index idx_pairings_sender on public.pairings(sender_id);
create index idx_pairings_recipient on public.pairings(recipient_id);
create index idx_pairings_invited_email on public.pairings(invited_email);
create index idx_hugs_pairing on public.hugs(pairing_id);
create index idx_hugs_sender on public.hugs(sender_id);
create index idx_hugs_status on public.hugs(status);

-- Row Level Security
alter table public.users enable row level security;
alter table public.pairings enable row level security;
alter table public.hugs enable row level security;

-- Users: can read their own profile and their partner's
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can read partner profile"
  on public.users for select
  using (
    id in (
      select case
        when sender_id = auth.uid() then recipient_id
        when recipient_id = auth.uid() then sender_id
      end
      from public.pairings
      where status = 'active'
        and (sender_id = auth.uid() or recipient_id = auth.uid())
    )
  );

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Pairings: participants can read/manage their pairings
create policy "Users can read own pairings"
  on public.pairings for select
  using (sender_id = auth.uid() or recipient_id = auth.uid() or invited_email = (select email from auth.users where id = auth.uid()));

create policy "Users can create pairings"
  on public.pairings for insert
  with check (sender_id = auth.uid());

create policy "Users can update own pairings"
  on public.pairings for update
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Hugs: participants of the pairing can read/send hugs
create policy "Users can read hugs in their pairing"
  on public.hugs for select
  using (
    pairing_id in (
      select id from public.pairings
      where (sender_id = auth.uid() or recipient_id = auth.uid())
        and status = 'active'
    )
  );

create policy "Users can send hugs in their pairing"
  on public.hugs for insert
  with check (
    sender_id = auth.uid()
    and pairing_id in (
      select id from public.pairings
      where (sender_id = auth.uid() or recipient_id = auth.uid())
        and status = 'active'
    )
  );

create policy "Users can update hugs sent to them"
  on public.hugs for update
  using (
    sender_id != auth.uid()
    and pairing_id in (
      select id from public.pairings
      where (sender_id = auth.uid() or recipient_id = auth.uid())
        and status = 'active'
    )
  );

-- Enable Realtime for hugs table
alter publication supabase_realtime add table public.hugs;
