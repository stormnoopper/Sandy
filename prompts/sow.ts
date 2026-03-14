import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export const SOW_PROMPT_SETTINGS = {
  model: 'gemini-2.5-flash',
  maxOutputTokens: 3000,
  temperature: 0.7,
} as const

export function buildSowPrompt({
  projectName,
  projectDescription,
  dataEntries,
}: {
  projectName: string
  projectDescription: string
  dataEntries: PromptDataEntry[]
}) {
  const dataContent = formatPromptDataEntries(dataEntries)

  return `You are a professional technical writer. Generate a comprehensive Statement of Work (SOW) document based on the following project information:

Project Name: ${projectName}
Project Description: ${projectDescription}

Project Data and Requirements:
${dataContent || 'No specific data entries provided yet.'}

Generate a well-structured SOW that includes:
1. Project Overview and Objectives
2. Scope of Work
3. Deliverables
4. Timeline and Milestones
5. Assumptions and Dependencies
6. Acceptance Criteria
7. Out of Scope Items

Format the document in a clear, professional manner using markdown formatting.`
}
