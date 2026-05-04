import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export const PROTOTYPE_BUILD_TARGET_OPTIONS: {
  value: string
  label: string
}[] = [
  { value: 'Cursor', label: 'Cursor' },
  { value: 'Claude', label: 'Claude' },
  { value: 'Gemini', label: 'Gemini' },
  { value: 'ChatGPT', label: 'ChatGPT' },
  { value: 'Lovable', label: 'Lovable' },
  { value: 'v0', label: 'v0' },
  { value: 'Bolt', label: 'Bolt.new' },
  { value: 'base44', label: 'base44' },
]

function targetCopy(targets: string[]) {
  const isBase44Only = targets.length === 1 && targets[0] === 'base44'
  const targetNames = targets.length > 0 ? targets.join(', ') : 'AI builder / agent'

  if (isBase44Only) {
    return {
      roleIntro:
        'You are a senior product designer and UX engineer preparing a detailed application specification to be built on the base44 AI app-builder platform (https://base44.com).',
      taskIntro:
        'Your task is to read the SRS and project data below, then produce a complete, actionable base44 app specification. base44 builds web apps from natural-language specs; every section you write will be used directly as input to generate the real app — so be specific, concrete, and avoid vague descriptions.',
      docTitleLine: '# App Specification for base44',
      designGuidelinesLine:
        'Provide clear design direction so base44 applies a consistent look and feel:',
      buildSectionTitle: '## 8. base44 Build Instructions (คำสั่งสำหรับ base44)',
      buildSectionIntro: 'These instructions are addressed directly to the base44 AI builder:',
    }
  }

  return {
    roleIntro:
      `You are a senior product designer and UX engineer preparing a detailed application specification for an AI coding agent or app-builder tool (Target: ${targetNames}) to implement as a responsive web application.`,
    taskIntro:
      `Your task is to read the SRS and project data below, then produce a complete, actionable app specification. The consumer may be any AI builder or agent (${targetNames}) that turns natural-language specs into working software; every section you write will be used directly as implementation input — so be specific, concrete, and avoid vague descriptions.`,
    docTitleLine: '# App Specification',
    designGuidelinesLine:
      'Provide clear design direction so the implementation applies a consistent look and feel:',
    buildSectionTitle: '## 8. Build & implementation instructions (คำสั่งสำหรับผู้พัฒนา / เอไอ)',
    buildSectionIntro:
      `These instructions are addressed to the AI builder, coding agent, or developer (${targetNames}) implementing this app:`,
  }
}

export function buildPrototypePrompt({
  projectName,
  projectDescription,
  baseSrsDraftName,
  srsText,
  dataEntries,
  buildTargets = [],
}: {
  projectName: string
  projectDescription: string
  baseSrsDraftName: string
  srsText: string
  dataEntries: PromptDataEntry[]
  buildTargets?: string[]
}) {
  const projectDataText = formatPromptDataEntries(dataEntries)
  const copy = targetCopy(buildTargets)

  return `${copy.roleIntro}

${copy.taskIntro}

STRICT RULES:
- Output ONLY the specification document, nothing else.
- Do NOT add any text, commentary, or explanation before or after the document.
- Keep descriptions clear, technical, and concise to save token context. Avoid redundant filler words.
- Assume the AI builder already knows modern UI/UX best practices. Do NOT specify generic details like padding, margins, or standard focus states unless critical to the business logic.
- All screens must be explicitly listed, but focus only on data, actions, and specific logic.
- Use Thai then English in parentheses for domain-specific terms (e.g., "การจัดการโครงการ (Project Management)").
- End the document with [DOCUMENT_COMPLETE] on the last line and STOP immediately.

---

PROJECT INFORMATION:
- Project Name: ${projectName}
${projectDescription ? `- Project Summary: ${projectDescription}` : ''}
- Base SRS Draft: ${baseSrsDraftName}

SELECTED PROJECT DATA:
${projectDataText || 'No additional project data provided.'}

SYSTEM REQUIREMENTS SPECIFICATION (SRS):
${srsText}

---

Based on the SRS and project data above, generate the following specification document:

${copy.docTitleLine}
# ${projectName}

---

## 1. App Overview (ภาพรวมของแอปพลิเคชัน)

Provide a 2–3 sentence description of what this app does, who it is for, and the primary platform (e.g., Responsive Web App).

---

## 2. User Roles & Permissions (บทบาทและสิทธิ์ผู้ใช้งาน)

List the user roles and their high-level permissions.

| Role | Access Level | Description |
| :--- | :--- | :--- |
| (fill from SRS) | | |

---

## 3. Data Models / Schema (โมเดลข้อมูล)

For each main data entity in the app, specify:
- **Entity name** (Thai + English)
- **Key fields** (name, data type, required/optional)
- **Relationships** (e.g., 1:N, M:N)

Format each entity concisely:
### [Entity Name]
- **Fields**: \`id\` (UUID), \`name\` (String, Req), \`status\` (Enum), ...
- **Relationships**: [Describe links to other entities]

---

## 4. Navigation & App Structure (โครงสร้างแอปพลิเคชัน)

Describe the main navigation menu and structure.
- [Module Name] (Roles allowed)
  - [Sub-page 1]
  - [Sub-page 2]

---

## 5. Core Screens & Features (รายละเอียดหน้าจอหลัก)

For EVERY screen in the app, provide the essential details needed for implementation. Focus on functionality over visual styling.

### Screen: [Screen Name] ([Route e.g. /projects])
- **Accessible by:** [Roles]
- **Purpose & Layout:** [e.g., Dashboard / Data Table / Form / Detail View]
- **Data Displayed:** [What entities/fields are shown on this page]
- **Key Components:** [e.g., Search bar, Date filter, Line chart for revenue]
- **Core Actions:** 
  - [Action 1: e.g., Create Record -> Opens Modal]
  - [Action 2: e.g., Export to CSV]
- **Specific Logic/Validation:** [Only if complex, e.g., "End date must be after Start date"]

---

## 6. Key User Flows (Flow การใช้งานหลัก)

Describe 2-3 critical end-to-end user flows as simple numbered steps.
- **Flow:** [Name]
  1. [Step 1]
  2. [Step 2]
  3. [Outcome]

---

## 7. Global Design & Technical Rules (ข้อกำหนดการออกแบบและเทคนิค)

${copy.designGuidelinesLine}
- **Styling:** Use a modern, clean UI library (e.g., Shadcn UI, Tailwind CSS). Apply a consistent color palette matching the brand/industry.
- **Responsive:** Must be fully responsive (Mobile, Tablet, Desktop).
- **State Management:** Include standard loading skeletons, empty states, and error toasts.

---

${copy.buildSectionTitle}

${copy.buildSectionIntro}

1. Build this as a responsive web application based on the structure defined above.
2. Setup the database schema using the entities in Section 3.
3. Implement the screens (Section 5) ensuring all data displays and core actions are functional.
4. Enforce role-based access control (Section 2).
5. Pre-populate the database with 3–5 realistic mock data records so the app is demonstrable immediately.
6. Use Thai as the primary display language for the UI (buttons, labels, messages).
7. Ensure standard features like pagination, search, and filtering are implemented where data lists are present.

[DOCUMENT_COMPLETE]`
}
