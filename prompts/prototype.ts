import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export type PrototypeBuildTarget = 'base44' | 'generic'

export const PROTOTYPE_BUILD_TARGET_OPTIONS: {
  value: PrototypeBuildTarget
  label: string
  description: string
}[] = [
  {
    value: 'base44',
    label: 'base44',
    description: 'Optimized for base44 (https://base44.com)',
  },
  {
    value: 'generic',
    label: 'Other AI builder / agent',
    description: 'Vendor-neutral spec for Lovable, Bolt, v0, Claude, etc.',
  },
]

function targetCopy(target: PrototypeBuildTarget) {
  if (target === 'base44') {
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
      'You are a senior product designer and UX engineer preparing a detailed application specification for an AI coding agent or app-builder tool to implement as a responsive web application.',
    taskIntro:
      'Your task is to read the SRS and project data below, then produce a complete, actionable app specification. The consumer may be any AI builder or agent that turns natural-language specs into working software; every section you write will be used directly as implementation input — so be specific, concrete, and avoid vague descriptions.',
    docTitleLine: '# App Specification',
    designGuidelinesLine:
      'Provide clear design direction so the implementation applies a consistent look and feel:',
    buildSectionTitle: '## 8. Build & implementation instructions (คำสั่งสำหรับผู้พัฒนา / เอไอ)',
    buildSectionIntro:
      'These instructions are addressed to the AI builder, coding agent, or developer implementing this app:',
  }
}

export function buildPrototypePrompt({
  projectName,
  projectDescription,
  baseSrsDraftName,
  srsText,
  dataEntries,
  buildTarget = 'base44',
}: {
  projectName: string
  projectDescription: string
  baseSrsDraftName: string
  srsText: string
  dataEntries: PromptDataEntry[]
  buildTarget?: PrototypeBuildTarget
}) {
  const projectDataText = formatPromptDataEntries(dataEntries)
  const copy = targetCopy(buildTarget)

  return `${copy.roleIntro}

${copy.taskIntro}

STRICT RULES:
- Output ONLY the specification document, nothing else.
- Do NOT add any text, commentary, or explanation before or after the document.
- Do NOT leave any placeholder tokens unfilled.
- All screens must be explicitly described — do not skip or summarise any.
- Every screen in Section 5 must include the full UI detail checklist below (layout regions, hierarchy, components, states, responsive behavior). Generic one-line UI descriptions are NOT acceptable.
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

Provide a 3–5 sentence description of what this app does, who it is for, and what problems it solves. Write in a way that a non-technical stakeholder can understand.

- **Platform:** Web application (responsive)
- **Primary Language:** Thai with English labels where applicable
- **App Type:** [e.g., Internal enterprise tool / Customer portal / Operations dashboard]

---

## 2. User Roles & Permissions (บทบาทและสิทธิ์ผู้ใช้งาน)

List every user role in the system. For each role, describe:
- What they are responsible for in the real business process
- Which modules/screens they can access
- Whether they have read-only, write, or admin-level permissions

| Role | Description | Access Level |
| :--- | :--- | :--- |
| (fill from SRS) | | |

---

## 3. Data Models / Entities (โมเดลข้อมูล)

For each main data entity in the app, specify:
- **Entity name** (Thai + English)
- **Key fields** with data type and whether required/optional
- **Relationships** to other entities (one-to-many, many-to-many, etc.)

Format each entity as:

### Entity: [Name]
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| id | UUID | Auto | Primary key |
| (fill from SRS) | | | |

**Relationships:** [describe links to other entities]

---

## 4. Navigation Map (แผนผังการนำทาง)

Describe the full navigation structure of the app:
- Top-level sidebar/menu items
- Nested sub-pages under each section
- Which roles can see each navigation item

Format:
- [Module Name] → visible to: [Roles]
  - [Sub-page 1]
  - [Sub-page 2]

---

## 5. Screens Specification (รายละเอียดแต่ละหน้าจอ)

For EVERY screen in the app, provide the following detail. Do not skip any screen. Write as if handing the spec to a UI engineer: spacing, hierarchy, and states must be concrete, not vague.

### Screen: [Screen Name] ([Route e.g. /projects])

**Layout type:** [List Page / Form Page / Detail Page / Dashboard / Wizard / Settings / Modal / Drawer overlay]
**Accessible by:** [Roles]

**Page shell (โครงหน้ารวม):**
- **Top app bar / page header:** [Title text, optional subtitle, breadcrumb path if any, alignment left/center]
- **Toolbar row (ถ้ามี):** [Primary actions docked right or left; icon+label or label-only; which actions are primary vs secondary/outline/ghost]
- **Main content width:** [max-width e.g. 1200px centered / full-bleed dashboard; padding/margins desktop vs mobile]
- **Sidebar / secondary panel:** [Collapsed behavior on tablet; whether filters live in left rail vs top chips]

**Visual hierarchy (ลำดับความสำคัญบนหน้า):**
- **Above the fold:** What the user sees first (hero metric, table, form section order)
- **Section order:** Numbered blocks from top to bottom (e.g. 1) Summary cards 2) Chart 3) Data table)
- **Emphasis:** Which elements use larger type, bold, color accent, or badges to draw attention

**Layout grid (responsive):**
- **Desktop (≥1024px):** [e.g. 12-column grid, how many columns for filters vs content]
- **Tablet (768–1023px):** [stack order, hide/move columns]
- **Mobile (≤767px):** [single column, bottom sticky bar, horizontal scroll for table vs card list fallback]

**UI components (รายการคอมโพเนนต์ที่ใช้จริง):**
- List each component with **purpose** and **placement** (e.g. "DataTable — center, below toolbar — row actions on right")
- Include: tables (column layout), forms (field grouping into sections/cards), tabs/steppers, search + chips, date range, selects (single/multi), toggles, file upload dropzone, charts (type: line/bar/donut + what each axis shows), empty-state illustration/text, skeleton loaders, pagination controls, bulk-action bar

**Data displayed:**
- **Source entity:** [Entity name]
- **Fields / columns:** [For tables: column header (Thai), field key, format (date, currency ฿, status pill), default sort, optional hide on mobile]
- **Badges / tags:** Rules for color by status (e.g. อนุมัติ = green outline, รอดำเนินการ = amber)

**States & feedback (สถานะที่ต้องมี):**
- **Loading:** Skeleton vs spinner; per-table vs whole page
- **Empty:** Title, short description, primary CTA if applicable
- **Error:** Inline field errors, toast for server errors, retry affordance
- **Success:** Toast/snackbar copy (Thai) after save/delete
- **Permission denied:** Hide vs disable with tooltip message

**Actions available:**
| Action | UI Element (label ภาษาไทย) | Placement | Behavior (navigation, modal size, confirmation) | Who can do it |
| :--- | :--- | :--- | :--- | :--- |
| (e.g.) Create new record | ปุ่มหลัก "เพิ่มรายการ" + ไอคอน | มุมขวาบนแถบเครื่องมือ | เปิด Modal กว้าง md; ปุ่มบันทึกที่ footer ขวา | Admin, Manager |
| (fill for each action) | | | | |

**Modals, drawers & overlays:**
- For each overlay: **trigger**, **size** (sm/md/full-screen mobile), **title**, **footer buttons** (ลำดับ ยกเลิก / ยืนยัน), **close behavior** (คลิกพื้นหลัง / ปุ่ม X), **destructive actions** require confirm dialog with exact copy

**Filters & Search:**
- [List each filter: control type, default, multi vs single, clears chips, URL sync if any]
- **Search scope:** which fields are searched; debounced or button-triggered

**Keyboard & a11y (เข้าถึง):**
- Focus order for main flow; shortcut keys if any; ARIA roles for tables/dialogs; sufficient contrast for text vs background

**Validation rules on this screen:**
- [Required fields, min/max length, regex, cross-field rules, disabled submit until valid]

**Microcopy (ข้อความสั้นใน UI):**
- Button labels, helper text under fields, inline hints, empty-state lines — write the **actual Thai strings** where they matter (not "placeholder text")

---

## 6. Key User Flows (흐름 ผู้ใช้งานหลัก)

Describe the most critical end-to-end user flows as numbered steps. Each flow should cover a complete business task from login to outcome.

### Flow [N]: [Flow Name]
**Actor:** [Role]
**Trigger:** [What causes this flow to start]

1. [Step 1 — screen name + action]
2. [Step 2 — system response]
3. [Step 3 — next screen or result]
...
**Outcome:** [What the user has achieved at the end]

---

## 7. Design Guidelines (แนวทางการออกแบบ)

${copy.designGuidelinesLine}

Define **tokens-level** detail so the UI does not look default or generic:

- **Color palette:** Primary / secondary / accent; semantic colors (success, warning, error, info) with hex; **surface** (page bg, card bg, elevated modal); **border** default and muted; **text** primary, secondary, muted, on-primary
- **Typography:** Font stack (Thai + Latin); **scale** for H1 page title, H2 section, body, small/caption, table header; font weights; **line-height** for dense tables vs marketing blocks
- **Spacing & radius:** Base unit (e.g. 4px); card padding; gap between sections; **border-radius** for cards, buttons, inputs, modals
- **Elevation & borders:** Card shadow level; modal backdrop opacity; hairline vs 1px borders; focus ring color/style for keyboard users
- **Component style:** Button variants (filled / outline / ghost / danger); input height; table header sticky or not; zebra rows; hover row highlight; selected row state
- **Density:** Default row height in tables; form field spacing; compact vs comfortable mode if applicable
- **Motion:** Duration for modals/drawers (e.g. 150–200ms); hover transitions; respect prefers-reduced-motion
- **Tone:** Voice for system messages (formal internal / casual) — give one example sentence
- **Icons:** Library style (outline 24px vs solid 20px); icons beside primary actions; when NOT to use icons
- **Data visualization:** Chart color order; grid lines; tooltip content pattern; legend placement

---

${copy.buildSectionTitle}

${copy.buildSectionIntro}

1. Build this as a **web application** with a persistent left sidebar navigation.
2. Use the entities defined in Section 3 as the data schema. Create all entities with the exact fields listed.
3. Implement all screens listed in Section 5. Each screen must match the layout type, **page shell**, responsive behavior, **states** (loading/empty/error/success), and **microcopy** described — not only the raw list of fields.
4. Enforce the role-based access control defined in Section 2 — users should only see screens and buttons permitted for their role.
5. Implement all user flows in Section 6 end-to-end, ensuring navigation between screens works correctly.
6. Apply the design guidelines in Section 7 consistently: same colors, typography scale, spacing, component variants, and chart styling on every screen.
7. Pre-populate each entity with at least 3–5 realistic mock data records so the prototype is demonstrable immediately.
8. All form fields must have the validation rules from Section 5 applied (required fields, format checks, etc.).
9. Use Thai as the display language for labels, buttons, headings, and messages throughout the app.
10. Ensure all tables have pagination, sorting, and the search/filter options listed per screen.
11. Implement **toolbar/header layout**, **modals/drawers** (sizes, footers, confirm flows), and **toasts** as specified per screen; do not leave actions as console-only or unstyled defaults.
12. Match **breakpoints** and mobile adaptations from Section 5 (stacking order, sticky actions, table vs card fallback where described).

[DOCUMENT_COMPLETE]`
}
