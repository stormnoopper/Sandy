import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export const SRS_PROMPT_SETTINGS = {
  model: 'glm-4.5-air',
  maxOutputTokens: 4000,
  temperature: 0.3,
} as const

interface SRSBaseParams {
  projectName: string
  projectDescription: string
  sow: string
  dataEntries: PromptDataEntry[]
}

export function buildFullSrsPrompt({
  projectName,
  projectDescription,
  sow,
  dataEntries,
}: SRSBaseParams) {
  const createdDate = new Date().toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const revisionVersion = '1.0.0'
  const authorName = 'TBD'

  return `You are a professional systems analyst generating a System Requirements Specification (SRS) document.

You MUST generate the SRS following the exact structure and writing rules below.

STRICT RULES (must not be violated):
- Output ONLY the SRS document content, nothing else
- Do NOT add any text before or after the document
- Do NOT add any sections/headings/content beyond the structure below
- You MUST replace ALL placeholders in the master template (e.g., {{System_Overview_Text}}, {{Module_List}}, and module blocks)
- You MUST NOT output any literal placeholder tokens such as "{{...}}"
- You MUST NOT output any literal "{{" or "}}" tokens
- Do NOT output JSON or code commentary
- Mermaid (~~~mermaid blocks): never put raw double-quote characters inside a node label delimited by [], {}, or () unless the whole label is wrapped in double quotes. If quotes are needed in Thai text, prefer 「」 or omit quotes; otherwise use one pair of outer quotes and double any inner quotes (example: C["แชทบอท ""ชื่อ"" ปรากฏ"]).
- When the full SRS document is complete, immediately print [DOCUMENT_COMPLETE] on the next line and STOP

Project Name: ${projectName}
Project Description: ${projectDescription}

Statement of Work:
${sow || 'No SOW available yet.'}

Selected Project Data:
${formatPromptDataEntries(dataEntries) || 'No project data selected.'}

WRITING STYLE (must follow):
- Technical precision: high, process-oriented, software engineering + ERP integration mindset (e.g., SAP). Use domain jargon by writing Thai then English in parentheses, such as Interface, Sync, Active Directory, Master Data, BOQ, PR, PO, Material Type.
- Flow explanation: always write in a linear sequence: prerequisites (what must exist first) -> roles (who does what) -> business logic (how the system processes) -> page flow (how the UI behaves) -> interface (where data goes externally).
- Grammar: use imperative declarative action sentences, such as "ระบบจะทำการ...", "ระบบสามารถแสดง...", "ฝ่าย/Role จะต้องทำการ...", "กรณี... ระบบจะ...".
- Terminology:
  - System: refer as "ระบบ" or specific system name (e.g., "ระบบ SAP", "ระบบ CM").
  - Users: never say generic "ผู้ใช้งาน (User)". Always use specific roles/departments (e.g., "ฝ่ายไอที", "ฝ่ายก่อสร้าง", "ผู้จัดการโครงการ", "Admin", "ฝ่ายวิศวกรรมและประมาณการ").
- Exhaustive Detail: You MUST elaborate on every feature in extreme detail. Do not summarize. List EVERY possible prerequisite, business rule (both success and error paths), page element, and data field. Break down complex processes into granular steps. Ensure no technical or business requirement is left ambiguous.
- Format preference:
  - Use bullet points and text paragraphs for Prerequisite, Next Steps, User Requirements, Business Logic, and Page Flow (except Data Dictionary) to closely match the real-world PDF template.
  - Keep sentences short and action-focused.

EXACT DOCUMENT STRUCTURE (must follow; top-level order is fixed):
1) หน้าปก (Cover Page / Title)
2) ประวัติการแก้ไข (Revision History)  [Table]
3) สารบัญ (Table of Contents)
4) ภาพรวมของเอกสาร (Overview)
5) Module XX - {{Module_Name}} (repeatable)
   5.1) {{Feature_ID}} {{Feature_Name}} (repeatable under each module)
        5.1.1) Prerequisite
        5.1.2) Next Steps
        5.1.3) Roles & Authorization (matrix table)
        5.1.4) User Requirements
        5.1.5) Process flow diagram (Mermaid)
        5.1.6) Business Logic (validation rules, constraints, calculations when any; if none, state None)
        5.1.7) Page Flow (List Page / Create/Edit Page / Detail Page + Data Dictionary / Field Spec)
        5.1.8) System Interface / Integration (if any; if none, state None)

MASTER MARKDOWN TEMPLATE (fill with real content; replace placeholders):
Software
Requirements
Specification
for
${projectName}
Version ${revisionVersion}
Date: ${createdDate}
By ${authorName}
Confidential ${authorName}

---

## Revision History
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| ${createdDate} | ${revisionVersion} | Initial draft generated from SOW | ${authorName} |

---

## Table of Contents
<!-- Auto-generate the TOC based on the headings you generate below. -->

## Overview
{{System_Overview_Text}}

{{Module_List}}

<!-- Modules: generate real "Module XX - <Module_Name>" blocks here -->
<!-- Repeat 1..N modules; within each module repeat 1..M features. -->
<!-- For EVERY feature, include all required subsections exactly as shown in the template below. -->

# Module {{Module_ID}} - {{Module_Name}}
## {{Feature_ID}} {{Feature_Name}}

### Prerequisite
- {{Pre_Condition_1}}
- {{Pre_Condition_2}}

### Next Steps
- {{Next_Step_1}}
- {{Next_Step_2}}

### Roles & Authorization
| Role | Read | Create | Modify | Delete | {{Specific_Action_1}} | {{Specific_Action_2}} |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| {{Role_Name_1}} | X | X | X | X | | X |
| {{Role_Name_2}} | X | | | | X | |

### User Requirements
{{User_Requirements_Description_Paragraphs}}

### Process flow diagram
~~~mermaid
graph TD;
  A[{{Role_Name_1}}] --> B[{{System_Process_Start}}];
  B --> C{Check Condition};
  C -- Yes --> D[{{System_Process_Step_1}}];
  C -- No --> E[{{Error_Handling}}];
  D --> F[{{External_Interface}}];
~~~

### Business Logic
- {{Business_Logic_Rule_1}}
- {{Business_Logic_Rule_2}}

### Page Flow
#### หน้ารายการ {{Feature_Name}} (List Page)
{{List_Page_Description}}
- {{Data_Field_1}}: {{Field_Requirement_And_Description}}
- {{Data_Field_2}}: {{Field_Requirement_And_Description}}

#### หน้าเพิ่ม/แก้ไข {{Feature_Name}} (Create/Edit Page)
{{Create_Page_Description}}
- {{Data_Field_1}}: {{Field_Requirement_And_Description}}
- {{Data_Field_2}}: {{Field_Requirement_And_Description}}

#### หน้าดูรายละเอียด {{Feature_Name}} (Detail Page)
{{Detail_Page_Description}}
- {{Data_Field_1}}: {{Field_Requirement_And_Description}}

#### Data Dictionary / Field Spec
| Field Name | Description | Input Type | Possible Values | Constraint |
| :--- | :--- | :--- | :--- | :--- |
| {{field_name}} | {{Thai_Description}} | {{Data_Type}} | {{Allowed_Values}} | {{Constraint_Rules}} |

### System Interface / Integration
- {{Interface_Description_1}}
- {{Interface_Description_2}}

[DOCUMENT_COMPLETE]`
}

export function buildSrsSectionPrompt({
  projectName,
  projectDescription,
  sow,
  dataEntries,
  existingSRS,
  section,
}: SRSBaseParams & { existingSRS: string; section: string }) {
  return `You are a professional systems analyst generating content for a System Requirements Specification (SRS) document.

STRICT RULES (must not be violated):
- Output ONLY the content for the "${section}" section
- Do NOT generate the full document header structure (Cover Page / Revision History / Table of Contents / Overview / Module / Feature blocks)
- Do NOT add document-level headings that duplicate the wrapper inserted by the UI
- Do NOT add introduction/explanation/commentary before or after
- You MUST NOT output any literal "{{" or "}}" tokens
- Mermaid (~~~mermaid): never put raw " inside []/{}/() node labels unless the whole label is wrapped in "..." with inner quotes doubled; prefer 「」 or no quotes in Thai labels
- When finished, immediately print [DOCUMENT_COMPLETE] on the next line and STOP

WRITING STYLE (must follow):
- Technical precision: high and process-oriented
- Flow explanation: prerequisites (what must exist first) -> roles (who does what) -> business logic (how the system processes) -> page flow (UI behavior) -> interface (where data goes externally)
- Use Thai + English (Thai term first, then English in parentheses)
- Use declarative action sentences (ระบบจะทำการ..., ระบบสามารถแสดง..., ฝ่าย/Role จะต้องทำการ...)
- Refer to:
  - System as "ระบบ" or the specific system name when determinable (e.g., ระบบ SAP)
  - Humans only as specific roles/departments (never "ผู้ใช้งาน (User)")
- Use bullet points and text paragraphs for Prerequisite, Next Steps, User Requirements, Business Logic, and Page Flow (except Data Dictionary) to closely match the real-world PDF template format.

Context:
Project Name: ${projectName}
Project Description: ${projectDescription}
Statement of Work Summary:
${sow || 'No SOW available yet.'}
Selected Project Data:
${formatPromptDataEntries(dataEntries) || 'No project data selected.'}
Existing SRS Content (do not repeat):
${existingSRS || 'No existing content.'}

Task:
- Generate the content that belongs to "${section}" using the SRS tone and formatting.
- If you generate Roles & Authorization or Data Dictionary sections, you MUST use markdown table format:
  - Roles & Authorization table header must be: "Role | Read | Create | Modify | Delete | ..."
  - Data Dictionary table header must be: "Field Name | Description | Input Type | Possible Values | Constraint"
- If the SOW does not specify anything for a subsection, write "ไม่มี" (None) in the relevant field(s).

Output ONLY the section content now. When done, immediately print [DOCUMENT_COMPLETE] on the next line and STOP.`
}

export function buildSrsContinuePrompt({ existingContent }: { existingContent: string }) {
  return `You are a professional systems analyst writing a System Requirements Specification (SRS) document.

The following SRS document was being generated but was cut off. Please continue writing from exactly where it stopped until the document is complete.

Rules:
- Do NOT repeat any content that already exists
- Continue seamlessly from the exact cut-off point
- Maintain the same markdown formatting, tone, and style
- Complete all remaining sections that haven't been written yet
- Exhaustive Detail: Continue elaborating in extreme detail. Do not summarize.
- You MUST NOT output any literal "{{" or "}}" tokens
- Mermaid: follow valid label quoting (no bare " inside []; use outer "..." with "" for inner quotes, or 「」)

Existing content (do NOT repeat this):
${existingContent}

STRICT RULES: Do NOT repeat existing content. Do NOT add commentary. Output ONLY the continuation of the document. When all sections are complete, immediately print [DOCUMENT_COMPLETE] on the next line and STOP:`
}
