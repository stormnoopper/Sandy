export interface DataEntry {
  id: string
  type: 'text' | 'file'
  content: string
  name: string
  createdAt: Date
}

export interface DocumentDraft {
  id: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface PrototypeDocument {
  id: string
  srsDraftId: string
  prompt: string
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  dataEntries: DataEntry[]
  sowDrafts: DocumentDraft[]
  srsDrafts: DocumentDraft[]
  prototypes: PrototypeDocument[]
  activeSowDraftId: string | null
  activeSrsDraftId: string | null
}

export type ProjectStatus = 'draft' | 'in-progress' | 'completed'
