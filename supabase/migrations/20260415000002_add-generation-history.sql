create table if not exists generation_history (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  document_type      text not null check (document_type in ('sow', 'srs', 'prototype')),
  draft_id           uuid,
  model              text not null default '',
  data_entry_count   integer not null default 0,
  prompt_length      integer not null default 0,
  output_length      integer not null default 0,
  duration_ms        integer not null default 0,
  continuation_count integer not null default 0,
  status             text not null default 'completed'
                     check (status in ('completed', 'failed', 'cancelled')),
  created_by         text,
  created_at         timestamptz not null default now()
);

create index if not exists generation_history_project_id_idx on generation_history(project_id);
create index if not exists generation_history_created_at_idx on generation_history(created_at);
