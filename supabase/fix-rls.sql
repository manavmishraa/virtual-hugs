-- Fix: Allow users to upsert their own profile
-- Run this in Supabase SQL Editor

-- Drop the restrictive select policy and replace with a broader one
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can read partner profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

-- Users can always read their own row
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

-- Users can read their partner's profile
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

-- Users can insert their own profile
create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Users can update their own profile (needed for upsert and paired_with)
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Also allow users to update their partner's paired_with field
create policy "Users can update partner paired_with"
  on public.users for update
  using (
    id in (
      select case
        when sender_id = auth.uid() then recipient_id
        when recipient_id = auth.uid() then sender_id
      end
      from public.pairings
      where (sender_id = auth.uid() or recipient_id = auth.uid())
    )
  );
