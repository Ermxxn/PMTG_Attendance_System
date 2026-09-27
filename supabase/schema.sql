-- PMTG Hari Sukan Negara 2026 — Attendance System schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- One row per attendance session/event. You can reuse the same event_id
-- for the whole day, or create a new one per session if you want separate
-- QR secrets/geofences per session.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  secret text not null,                     -- random string, used to sign the rotating QR token. Keep private.
  event_date date not null default current_date,
  venue_lat double precision,               -- set both venue_lat/lng to enable geofencing
  venue_lng double precision,
  geofence_radius_m integer default 200,    -- allowed distance from venue, in meters
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  full_name text not null,
  class text not null,
  matric_no text not null,
  gps_lat double precision,
  gps_lng double precision,
  method text not null default 'qr_scan',   -- 'qr_scan' or 'admin_manual'
  checked_in_at timestamptz not null default now(),
  unique (event_id, matric_no)              -- prevents duplicate check-ins per event
);

alter table events enable row level security;
alter table attendance enable row level security;

-- Edge Functions use the service role key, which bypasses RLS entirely,
-- so no public insert/select policies are needed for the check-in flow.
-- Add a policy here later only if you want the admin dashboard to query
-- Supabase directly from the browser instead of through an Edge Function.

-- Example: create your first event (edit the secret string, keep the coordinates)
-- Coordinates below are Politeknik METrO Tasek Gelugor (PMTG), Jalan Komersial 2, 13300 Tasek Gelugor, Penang.
insert into events (name, secret, venue_lat, venue_lng, geofence_radius_m)
values ('Hari Sukan Negara PMTG 2026', 'CHANGE_THIS_TO_A_LONG_RANDOM_STRING', 5.4850991, 100.4902697, 200);
