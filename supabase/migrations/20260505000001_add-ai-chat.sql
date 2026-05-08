-- AI Chat Sessions: ผูกกับ project + document type + draft
create table if not exists chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  document_type text not null check (document_type in ('sow', 'srs')),
  draft_id      uuid,
  user_id       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Chat Messages: เก็บทุก message ในแต่ละ session (multi-turn)
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_sessions_project_doc_idx on chat_sessions(project_id, document_type, draft_id);
create index if not exists chat_sessions_user_idx on chat_sessions(user_id);
create index if not exists chat_messages_session_idx on chat_messages(session_id, created_at);
