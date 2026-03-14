import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export const SRS_PROMPT_SETTINGS = {
  model: 'gemini-2.5-flash',
  maxOutputTokens: 4000,
  temperature: 0.7,
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
  return `You are a professional systems analyst. Generate a comprehensive System Requirements Specification (SRS) document based on the following project information:

Project Name: ${projectName}
Project Description: ${projectDescription}

Statement of Work:
${sow || 'No SOW available yet.'}

Selected Project Data:
${formatPromptDataEntries(dataEntries) || 'No project data selected.'}

Generate a well-structured SRS that includes:
1. Introduction
   - Purpose
   - Scope
   - Definitions and Acronyms
2. Overall Description
   - Product Perspective
   - Product Functions
   - User Classes and Characteristics
   - Operating Environment
3. System Features and Requirements
   - Functional Requirements
   - Non-Functional Requirements
   - Performance Requirements
4. External Interface Requirements
   - User Interfaces
   - Hardware Interfaces
   - Software Interfaces
5. System Constraints
6. Quality Attributes

Format the document in a clear, professional manner using markdown formatting with proper headings and bullet points.`
}

export function buildSrsSectionPrompt({
  projectName,
  projectDescription,
  sow,
  dataEntries,
  existingSRS,
  section,
}: SRSBaseParams & { existingSRS: string; section: string }) {
  return `You are a professional systems analyst. Based on the following context, generate content for the "${section}" section of a System Requirements Specification (SRS) document:

Project Name: ${projectName}
Project Description: ${projectDescription}

Statement of Work Summary:
${sow || 'No SOW available yet.'}

Selected Project Data:
${formatPromptDataEntries(dataEntries) || 'No project data selected.'}

Existing SRS Content:
${existingSRS || 'No existing content.'}

Generate detailed, technical content specifically for the "${section}" section. Use clear, precise language and include specific requirements where applicable. Format using markdown.`
}
