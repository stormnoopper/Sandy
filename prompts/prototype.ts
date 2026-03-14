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

  return [
    'You are a senior product designer and UX engineer.',
    'Create a clickable product prototype based on the following SRS and selected project data.',
    '',
    `Project name: ${projectName}`,
    projectDescription ? `Project summary: ${projectDescription}` : '',
    `Base SRS draft: ${baseSrsDraftName}`,
    '',
    'Selected project data:',
    projectDataText || 'No project data selected.',
    '',
    'Prototype requirements:',
    '- Define the main information architecture and navigation.',
    '- List the core screens that should exist in the prototype.',
    '- Describe each screen layout, content blocks, and primary actions.',
    '- Explain important user flows and interactions.',
    '- Keep the prototype practical and aligned with the SRS.',
    '',
    'System Requirements Specification (SRS):',
    srsText,
  ]
    .filter(Boolean)
    .join('\n')
}
