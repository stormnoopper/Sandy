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

export const PROTOTYPE_PROMPT_SETTINGS = {
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxOutputTokens: 8192,
}

export function buildPrototypePrompt({
  projectName,
  projectDescription,
  baseSrsDraftName,
  srsText,
  buildTargets = [],
}: {
  projectName: string
  projectDescription: string
  baseSrsDraftName: string
  srsText: string
  buildTarget?: string
}) {
  const targetNames = buildTarget || 'AI builder / agent'
  
  const isCursor = buildTarget === 'Cursor'
  const isClaude = buildTarget === 'Claude'
  const isGemini = buildTarget === 'Gemini'
  const isChatGPT = buildTarget === 'ChatGPT'
  const isLovable = buildTarget === 'Lovable'
  const isV0 = buildTarget === 'v0'
  const isBolt = buildTarget === 'Bolt'
  const isBase44 = buildTarget === 'base44'
  const isGeneric = !buildTarget

  let strategies = ''
  if (isCursor) strategies += '- **Cursor**: Focus on short, actionable prompts designed for context-aware vibe coding in the IDE. Instruct the developer to use `@` to fetch specific files as context (e.g., "@app/page.tsx change to Grid layout"). Focus on extending or refactoring existing code.\n'
  if (isClaude) strategies += '- **Claude**: Provide detailed Architecture and Tech Stack explanations. Define state management logic, complex business rules, and complete component structure clearly, as Claude handles complex logic and long files well.\n'
  if (isGemini) strategies += '- **Gemini**: Frame instructions around multimodal capabilities. Mention where UI Wireframes should be attached ("Translate this wireframe..."). Advise using Gemini to search the latest library documentation for project setup.\n'
  if (isChatGPT) strategies += '- **ChatGPT**: Focus on step-by-step instructions and systematic planning. Include tasks for writing Database Schema structures and generating mock data scripts for sequential testing.\n'
  if (isLovable) strategies += '- **Lovable**: Describe Product Requirements and desired Vibe (user perspective). Emphasize features, user interactions (e.g., drag & drop), and design aesthetics (e.g., minimalist, dark mode) rather than deep backend architecture.\n'
  if (isV0) strategies += '- **v0**: Describe Layouts and structures explicitly. Specify exact UI positioning (e.g., "Sidebar on left, Navbar on top, Data Table in middle with 3 Filter buttons"). Focus strictly on UI component generation.\n'
  if (isBolt) strategies += '- **Bolt.new**: Specify both Frontend and Backend Ecosystems in a single unified command. Define the full Tech Stack to allow full-stack browser scaffolding.\n'
  if (isBase44) strategies += '- **base44**: Focus tightly on Entity and Model structures. Provide concise specifications of core system data to generate CRUD boilerplates efficiently.\n'

  const sections: string[] = []
  let sIdx = 1

  sections.push(`## ${sIdx++}. App Overview (ภาพรวมของแอปพลิเคชัน)\nProvide a concise description of what this app does and who it is for.`)

  if (isClaude || isBolt || isBase44 || isChatGPT || isGeneric) {
    sections.push(`## ${sIdx++}. Architecture & Tech Stack (สถาปัตยกรรมและเทคโนโลยี)\nDefine the primary Frontend and Backend ecosystem.` +
      (isClaude ? ' Explain state management logic and component structure in detail.' : '') +
      (isBolt ? ' Formulate a single comprehensive command specifying the full stack (e.g., React + Tailwind + Supabase) for instant scaffolding.' : '')
    )
  }

  if (isV0 || isLovable || isGemini || isGeneric) {
    sections.push(`## ${sIdx++}. UI Layout & Vibe (โครงสร้างหน้าจอและดีไซน์)\nDescribe the visual structure of the application.` +
      (isV0 ? ' Specify exact positions of UI elements (e.g., "Left sidebar, Top navbar, Data table in the center with 3 filters").' : '') +
      (isLovable ? ' Detail the product vibe, aesthetics (e.g., minimalist, dark mode), and specific user interactions like drag & drop.' : '') +
      (isGemini ? ' Indicate where image wireframes should be attached to be translated into basic HTML/CSS/JS.' : '')
    )
  }

  if (isBase44 || isChatGPT || isClaude || isBolt || isGeneric) {
    sections.push(`## ${sIdx++}. Data Models & Schema (โมเดลข้อมูล)\nFor each main entity, specify key fields and relationships.` +
      (isBase44 ? ' Focus on core system data required for rapid CRUD boilerplate generation.' : '') +
      (isChatGPT ? ' Include instructions for creating mock data scripts for step-by-step testing.' : '')
    )
  }

  if (isCursor || isChatGPT || isGeneric) {
    sections.push(`## ${sIdx++}. Implementation Tasks (แผนการทำงาน)\nProvide a list of actionable development tasks.` +
      (isCursor ? ' Break tasks down into short prompts. Specify exactly which existing files to reference using `@filename` syntax.' : '') +
      (isChatGPT ? ' Formulate a systematic, step-by-step plan.' : '')
    )
  }

  // Ensure there's always a Core Features section
  sections.push(`## ${sIdx++}. Core Features & Logic (ฟีเจอร์หลักและลอจิก)\nList the essential screens, features, and complex business logic.` +
    (isClaude ? ' Provide deep detail on complex logic requirements.' : '')
  )

  const sectionOutput = sections.join('\n\n---\n\n')

  return `You are a senior product designer and UX engineer preparing a detailed application specification for an AI coding agent or app-builder tool (Target: ${targetNames}) to implement as a responsive web application.

Your task is to read the SRS below, then produce a complete, actionable app specification. The consumer is an AI builder or agent (${targetNames}) that turns natural-language specs into working software; every section you write will be used directly as implementation input — so be specific, concrete, and avoid vague descriptions.

STRICT RULES:
- Output ONLY the specification document, nothing else.
- Do NOT add any text, commentary, or explanation before or after the document.
- Keep descriptions clear, technical, and concise to save token context.
- Use Thai then English in parentheses for domain-specific terms (e.g., "การจัดการโครงการ (Project Management)").
- End the document with [DOCUMENT_COMPLETE] on the last line and STOP immediately.

TARGET-SPECIFIC STRATEGY:
Please tailor the content of your specification according to the selected target tool(s):
${strategies || '- Follow general best practices for AI code generation.\n'}

---

PROJECT INFORMATION:
- Project Name: ${projectName}
${projectDescription ? `- Project Summary: ${projectDescription}` : ''}
- Base SRS Draft: ${baseSrsDraftName}

SYSTEM REQUIREMENTS SPECIFICATION (SRS):
${srsText}

---

Based on the SRS and the target-specific strategy above, generate the following specification document exactly matching this structure:

# App Specification for ${targetNames}
# ${projectName}

---

${sectionOutput}

[DOCUMENT_COMPLETE]`
}
