import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export function buildPrototypePrompt({
  projectName,
  projectDescription,
  baseSrsDraftName,
  srsText,
  dataEntries,
}: {
  projectName: string
  projectDescription: string
  baseSrsDraftName: string
  srsText: string
  dataEntries: PromptDataEntry[]
}) {
  const projectDataText = formatPromptDataEntries(dataEntries)

  return `You are a senior product designer and UX engineer preparing a detailed application specification to be built on the base44 AI app-builder platform (https://base44.com).

Your task is to read the SRS and project data below, then produce a complete, actionable base44 app specification. base44 builds web apps from natural-language specs; every section you write will be used directly as input to generate the real app — so be specific, concrete, and avoid vague descriptions.

STRICT RULES:
- Output ONLY the specification document, nothing else.
- Do NOT add any text, commentary, or explanation before or after the document.
- Do NOT leave any placeholder tokens unfilled.
- All screens must be explicitly described — do not skip or summarise any.
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

# App Specification for base44
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

For EVERY screen in the app, provide the following detail. Do not skip any screen.

### Screen: [Screen Name] ([Route e.g. /projects])

**Layout type:** [List Page / Form Page / Detail Page / Dashboard / Modal]
**Accessible by:** [Roles]

**UI Components:**
- [List specific components: DataTable, SearchBar, FilterDropdown, Button, Card, Badge, Modal, FormField, DatePicker, FileUpload, Chart, etc.]

**Data displayed:**
- Source entity: [Entity name]
- Fields shown: [list the columns or fields visible on this screen]

**Actions available:**
| Action | UI Element | Behavior | Who can do it |
| :--- | :--- | :--- | :--- |
| (e.g.) Create new record | Button "เพิ่มใหม่" | Opens create form modal | Admin, Manager |
| (fill for each action) | | | |

**Filters & Search:**
- [List filter options available on this screen]

**Validation rules on this screen:**
- [List any field-level or page-level validation that must be enforced]

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

Provide clear design direction so base44 applies a consistent look and feel:

- **Color palette:** [e.g., Primary blue #1E40AF, neutral grays, white background — or describe the mood: professional, corporate, minimal]
- **Typography:** [e.g., Clean sans-serif, Thai-compatible font]
- **Component style:** [e.g., Rounded cards, subtle shadows, clean tables with alternating row colors]
- **Density:** [e.g., Comfortable spacing for desktop power users / Compact for data-heavy screens]
- **Tone:** [e.g., Professional enterprise / Friendly internal tool]
- **Icons:** [e.g., Use outline icons, Heroicons or Lucide style]

---

## 8. base44 Build Instructions (คำสั่งสำหรับ base44)

These instructions are addressed directly to the base44 AI builder:

1. Build this as a **web application** with a persistent left sidebar navigation.
2. Use the entities defined in Section 3 as the data schema. Create all entities with the exact fields listed.
3. Implement all screens listed in Section 5. Each screen must match the layout type, components, and actions described.
4. Enforce the role-based access control defined in Section 2 — users should only see screens and buttons permitted for their role.
5. Implement all user flows in Section 6 end-to-end, ensuring navigation between screens works correctly.
6. Apply the design guidelines in Section 7 consistently across all screens.
7. Pre-populate each entity with at least 3–5 realistic mock data records so the prototype is demonstrable immediately.
8. All form fields must have the validation rules from Section 5 applied (required fields, format checks, etc.).
9. Use Thai as the display language for labels, buttons, headings, and messages throughout the app.
10. Ensure all tables have pagination, sorting, and the search/filter options listed per screen.

[DOCUMENT_COMPLETE]`
}
