-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Data entries (linked to projects)
create table if not exists data_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null check (type in ('text', 'file')),
  content text not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- SOW drafts
create table if not exists sow_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SRS drafts + prototype prompt column
create table if not exists srs_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  prototype_prompt text
);

-- Active draft pointers on projects
alter table projects
  add column if not exists active_sow_draft_id uuid references sow_drafts(id),
  add column if not exists active_srs_draft_id uuid references srs_drafts(id);