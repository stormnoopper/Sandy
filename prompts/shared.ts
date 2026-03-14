export interface PromptDataEntry {
  type: string
  name: string
  content: string
}

export function formatPromptDataEntries(dataEntries: PromptDataEntry[]) {
  return dataEntries
    .map(
      (entry) =>
        `- ${entry.type === 'text' ? 'Text Entry' : 'File'}: ${entry.name}\n  Content: ${entry.content}`
    )
    .join('\n')
}
