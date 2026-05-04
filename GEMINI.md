# Sandy Workspace Instructions & Architecture

This file serves as the single source of truth for both AI workspace instructions and the project's architectural design. 

## AI Instructions
- **Project Context:** This file contains the complete architectural breakdown of the 'Sandy' project. Rely on it for understanding the technology stack, data flow, and key design patterns.
- **AI Prompts:** All core AI prompt logic and templates are maintained in the `prompts/` directory.
- **Prompt Resources:** Any external data, context files, or reference materials used exclusively for feeding into prompts are stored in the `resources/` directory.

---

# Sandy: AI-Driven Project Documentation Platform

Sandy is a sophisticated platform designed to streamline the creation of professional IT project documentation, specifically Statement of Work (SOW), Software Requirements Specification (SRS), and Prototype specifications. It leverages advanced AI models to transform project requirements into structured, high-quality documents.

## Core Purpose

The primary goal of Sandy is to automate the tedious parts of technical documentation while ensuring professional standards (especially for Thai business contexts). It follows a logical progression:
1. **Data Entry**: Collecting core project details and requirements.
2. **SOW Generation**: Creating a formal Statement of Work.
3. **SRS Generation**: Expanding the SOW into a detailed Software Requirements Specification.
4. **Prototype Specification**: Generating a technical specification suitable for input into AI app builders.

---

## Technology Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, React 19)
- **Styling**: Tailwind CSS, SCSS, Radix UI (via [Shadcn UI](https://ui.shadcn.com/))
- **Editor**: [Tiptap](https://tiptap.dev/) (Headless Rich Text Editor)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/), Anthropic Claude models
- **Auth**: [NextAuth.js](https://next-auth.js.org/)
- **Diagrams**: [Mermaid.js](https://mermaid.js.org/)
- **Export**: `docx` for Word documents, `html-to-pdf` (via custom logic)

---

## Architecture & Directory Structure

```text
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── api/              # Backend endpoints (AI generation, project management)
│   ├── auth/             # Authentication pages
│   ├── project/          # Project dashboard and editor interface
│   └── share/            # Public document sharing views
├── components/           # React components
│   ├── tiptap-extension/ # Custom Tiptap plugins (Mermaid, background, etc.)
│   ├── tiptap-ui/        # Reusable editor UI primitives
│   └── ui/               # Base UI components (Shadcn)
├── hooks/                # Custom React hooks (Editor state, project data)
├── lib/                  # Shared utilities and logic
│   ├── project-context.tsx # Central State Management
│   ├── export-utils.ts   # Document export logic (PDF/DOCX)
│   └── types.ts          # TypeScript definitions
├── prisma/               # Database schema (if used for migrations)
├── prompts/              # Complex AI prompt templates (engineered in Thai)
└── supabase/             # Supabase configuration and migrations
```

---

## Key Design Patterns & Logic

### 1. Sequential AI Workflow
The system enforces a "chain of thought" for documentation. An SRS is generated based on the context of an existing SOW, ensuring consistency throughout the project lifecycle.

### 2. Centralized State Management (`ProjectProvider`)
Located in `lib/project-context.tsx`, this context manages:
- The active project and its metadata.
- "Data Entries" (the raw requirements input by users).
- Document "Drafts" and their version history.

### 3. Highly Customized Rich Text Editor
The editor (`components/rich-text-editor.tsx`) is not just a textarea. It's a custom Tiptap implementation featuring:
- **Mermaid Integration**: Render and edit diagrams directly in the document.
- **Smart Formatting**: Handles complex document structures required for professional reports.
- **Background Processes**: Auto-saving and versioning of content.

### 4. Professional Thai Prompt Engineering
The core "intelligence" lives in `prompts/`. These files contain heavily engineered prompts in Thai that instruct the AI on:
- Formal terminology and tone.
- Specific structural requirements for Thai government or enterprise SOWs/SRSs.
- Inclusion of relevant diagrams and technical specifications.

### 5. Multi-Format Export System
The platform bridges the gap between web editing and physical delivery via `lib/export-utils.ts`. It parses the internal editor state (HTML/JSON) and transforms it into:
- Properly formatted **Microsoft Word (.docx)** files using the `docx` library.
- **PDFs** that maintain layout and diagram rendering.

---

## Data Flow

1. **Input**: User fills out project details in `DataEntryList`.
2. **Persistence**: Data is saved to Supabase via `ProjectProvider`.
3. **Generation**:
   - User clicks "Generate SOW".
   - Frontend calls `/api/generate-sow`.
   - API route pulls templates from `prompts/sow.ts`, calls Anthropic, and streams the result.
4. **Drafting**: The AI output is saved as a `DocumentDraft` in Supabase.
5. **Editing**: User refines the document in the `RichTextEditor`.
6. **Delivery**: User exports the final document to `.docx` for the client.

---

## Security & Sharing
- **Auth**: Secured via NextAuth with Supabase as the adapter.
- **Sharing**: Documents can be shared via unique, non-guessable tokens (`app/share/[token]`), allowing read-only access to external stakeholders.
