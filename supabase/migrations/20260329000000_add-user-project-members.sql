-- Add owner_id to projects (Google OAuth sub used as user identity)
alter table projects
  add column if not exists owner_id text not null default '';

-- Create project_members table for per-user access control
create table if not exists project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id    text not null,
  user_name  text,
  user_email text,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Index for fast look-ups by user
create index if not exists project_members_user_id_idx on project_members (user_id);
