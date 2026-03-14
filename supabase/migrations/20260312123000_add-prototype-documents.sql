create table if not exists prototype_documents (
  id uuid primary key default gen_random_uuid(),
  srs_draft_id uuid not null unique references srs_drafts(id) on delete cascade,
  prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
