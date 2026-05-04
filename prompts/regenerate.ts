import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export const REGENERATE_PROMPT_SETTINGS = {
  model: 'glm-4.5-air',
  maxOutputTokens: 4000,
  temperature: 0.7,
} as const

interface RegenerateParams {
  existingContent: string
  customInstruction: string
  projectName?: string
  projectDescription?: string
  dataEntries?: PromptDataEntry[]
}

export function buildRegeneratePrompt({
  existingContent,
  customInstruction,
  projectName,
  projectDescription,
  dataEntries,
}: RegenerateParams) {
  const dataContent = dataEntries ? formatPromptDataEntries(dataEntries) : ''
  const projectContext = projectName 
    ? `\nProject Context:\nProject Name: ${projectName}\nProject Description: ${projectDescription || 'N/A'}\n${dataContent}`
    : ''

  return `You are a professional systems analyst and expert technical editor.

Your task is to rewrite or regenerate a specific section of text based on user instructions.

STRICT RULES (must not be violated):
- Output ONLY the modified markdown content. Do NOT include explanations, preambles, or postambles.
- Preserve the existing Markdown formatting (tables, lists, bolding, etc.) unless the user instruction explicitly asks to change it.
- If the content contains Mermaid diagrams (~~~mermaid blocks), preserve them carefully. Do not put raw double-quote characters inside node labels unless handled correctly.
- You MUST NOT output any literal placeholder tokens such as "{{...}}" unless they were in the original text and not meant to be replaced.
- Apply a professional tone suitable for IT documentation (Thai + English terminology where appropriate).
- When finished editing, immediately print [DOCUMENT_COMPLETE] on the next line and STOP.

${projectContext}

Original Content to Modify:
---
${existingContent}
---

User Instruction:
"${customInstruction}"

Please apply the instruction to the Original Content and provide the fully regenerated Markdown output below. Output ONLY the new Markdown. When finished editing, immediately print [DOCUMENT_COMPLETE] on the next line and STOP:
`
}