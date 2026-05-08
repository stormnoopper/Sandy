# Sandy — Gemini CLI Project Context

## Project Overview
Sandy is a Next.js platform for generating professional IT project documentation (SOW, SRS, Prototype specs) using AI. It targets Thai business/government contexts.

## Tech Stack
- **Framework**: Next.js 15+ (App Router, React 19), TypeScript
- **Styling**: Tailwind CSS + SCSS, Shadcn UI (Radix UI)
- **Editor**: Tiptap (headless rich text, custom Mermaid extension)
- **Database/Auth**: Supabase (PostgreSQL, Storage) + NextAuth.js
- **AI**: Vercel AI SDK + Anthropic Claude (streaming)
- **Export**: `docx` library (Word), custom HTML-to-PDF
- **Package Manager**: pnpm

## Directory Structure
```
app/
  api/          # API routes (AI generation, project CRUD)
  auth/         # Auth pages
  project/      # Project dashboard & editor
  share/        # Public read-only share views
components/
  tiptap-extension/  # Custom Tiptap nodes (Mermaid, etc.)
  tiptap-ui/         # Editor toolbar primitives
  ui/                # Shadcn base components
hooks/          # Custom React hooks
lib/
  project-context.tsx  # Central state (ProjectProvider)
  export-utils.ts      # PDF/DOCX export
  types.ts             # Shared TypeScript types
prompts/        # AI prompt templates (Thai-language, engineered)
resources/      # External reference files for prompts
supabase/       # DB migrations & config
```

## AI Workflow (Critical)
Documents follow a strict sequential chain — do not skip steps:
1. User fills **Data Entry** → saved to Supabase via `ProjectProvider`
2. **SOW** generated via `/api/generate-sow` (uses `prompts/sow.ts`)
3. **SRS** generated using SOW as context via `/api/generate-srs`
4. **Prototype Spec** generated last

In addition to the sequential generation, the system features an interactive AI assistant:
- **AI Chatbot**: A context-aware chat panel (`DocumentChatPanel`) available on SOW/SRS pages for real-time feedback. It uses `/api/projects/[id]/chat` and stores history in `chat_sessions` and `chat_messages` tables.
- **AI Document Editing**: Users can seamlessly apply AI chat suggestions directly to the rich text editor using backend streaming endpoints for document rewriting.

All AI routes stream responses using Vercel AI SDK. Prompts live in `prompts/` and are written in Thai.

## Coding Conventions
- **TypeScript**: Strict mode. Define types in `lib/types.ts`.
- **Components**: Functional components, server components by default — add `"use client"` only when needed.
- **State**: Use `ProjectProvider` context (`lib/project-context.tsx`) for project data. Avoid prop-drilling.
- **API Routes**: All routes in `app/api/`. Protect with NextAuth session checks. Support `SKIP_AUTH=true` env var for dev bypass.
- **Styling**: Tailwind utility classes preferred. Use SCSS only for complex editor-specific styles.
- **Imports**: Use `@/` path alias for all internal imports.
- **Exports**: Use named exports for components and utilities.

## Key Constraints
- **Never** hardcode API keys. All secrets go in `.env.local`.
- **Prompts** in `prompts/` are Thai-language — preserve tone and structure when editing.
- **Tiptap editor** state is JSON internally; export logic in `lib/export-utils.ts` parses HTML output.
- When modifying AI generation routes, always test streaming behavior — non-streaming responses will break the UI.
- Supabase RLS policies are active for core project tables — always query through the authenticated client. Note: RLS is disabled for `chat_sessions` and `chat_messages` as they are managed via internal API routes.

## Development
```bash
pnpm dev        # Start dev server
pnpm build      # Production build
```
Dev auth bypass: set `SKIP_AUTH=true` in `.env.local` to skip NextAuth session checks in API routes.
