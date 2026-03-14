'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Project, DataEntry, DocumentDraft, PrototypeDocument } from './types'
import { supabase } from './supabaseClient'

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  createProject: (name: string, description: string) => Project
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addDataEntry: (projectId: string, entry: Omit<DataEntry, 'id' | 'createdAt'>) => void
  removeDataEntry: (projectId: string, entryId: string) => void
  // SOW Draft methods
  createSowDraft: (projectId: string, name: string) => DocumentDraft
  updateSowDraft: (projectId: string, draftId: string, content: string) => void
  deleteSowDraft: (projectId: string, draftId: string) => void
  setActiveSowDraft: (projectId: string, draftId: string) => void
  renameSowDraft: (projectId: string, draftId: string, name: string) => void
  // SRS Draft methods
  createSrsDraft: (projectId: string, name: string) => DocumentDraft
  updateSrsDraft: (projectId: string, draftId: string, content: string) => void
  deleteSrsDraft: (projectId: string, draftId: string) => void
  setActiveSrsDraft: (projectId: string, draftId: string) => void
  renameSrsDraft: (projectId: string, draftId: string, name: string) => void
  upsertPrototype: (projectId: string, srsDraftId: string, prompt: string) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

const STORAGE_KEY = 'project-manager-data-v2'

// Helpers to map Supabase rows into our TypeScript types
function mapDataEntry(row: any): DataEntry {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    name: row.name,
    createdAt: new Date(row.created_at),
  }
}

function mapDraft(row: any): DocumentDraft {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapPrototype(row: any): PrototypeDocument {
  return {
    id: row.id,
    srsDraftId: row.srs_draft_id,
    prompt: row.prompt,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Initial load: try Supabase, fall back to localStorage only on failure
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [
          { data: projectRows, error: projectsError },
          { data: dataEntryRows, error: dataEntriesError },
          { data: sowDraftRows, error: sowDraftsError },
          { data: srsDraftRows, error: srsDraftsError },
          { data: prototypeRows, error: prototypesError },
        ] = await Promise.all([
          supabase
            .from('projects')
            .select(
              'id, name, description, created_at, updated_at, active_sow_draft_id, active_srs_draft_id'
            )
            .order('created_at', { ascending: true }),
          supabase.from('data_entries').select('id, project_id, type, content, name, created_at'),
          supabase
            .from('sow_drafts')
            .select('id, project_id, name, content, created_at, updated_at'),
          supabase
            .from('srs_drafts')
            .select('id, project_id, name, content, created_at, updated_at'),
          supabase
            .from('prototype_documents')
            .select('id, srs_draft_id, prompt, created_at, updated_at'),
        ])

        const firstError =
          projectsError || dataEntriesError || sowDraftsError || srsDraftsError || prototypesError

        if (firstError) {
          throw firstError
        }

        if (!cancelled) {
          const mapped: Project[] = (projectRows ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            dataEntries: (dataEntryRows ?? [])
              .filter((entry: any) => entry.project_id === row.id)
              .map(mapDataEntry),
            sowDrafts: (sowDraftRows ?? [])
              .filter((draft: any) => draft.project_id === row.id)
              .map(mapDraft),
            srsDrafts: (srsDraftRows ?? [])
              .filter((draft: any) => draft.project_id === row.id)
              .map(mapDraft),
            prototypes: (prototypeRows ?? [])
              .filter((prototype: any) =>
                (srsDraftRows ?? []).some(
                  (draft: any) => draft.project_id === row.id && draft.id === prototype.srs_draft_id
                )
              )
              .map(mapPrototype),
            activeSowDraftId: row.active_sow_draft_id ?? null,
            activeSrsDraftId: row.active_srs_draft_id ?? null,
          }))

          setProjects(mapped)
          setIsHydrated(true)
          return
        }
      } catch (err) {
        console.warn('Unexpected error loading projects from Supabase (non-fatal):', err)
      }

      // Fallback to existing localStorage data (old behavior)
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          const projectsWithDates = parsed.map((p: Project) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            dataEntries: p.dataEntries.map((e: DataEntry) => ({
              ...e,
              createdAt: new Date(e.createdAt),
            })),
            sowDrafts: (p.sowDrafts || []).map((d: DocumentDraft) => ({
              ...d,
              createdAt: new Date(d.createdAt),
              updatedAt: new Date(d.updatedAt),
            })),
            srsDrafts: (p.srsDrafts || []).map((d: DocumentDraft) => ({
              ...d,
              createdAt: new Date(d.createdAt),
              updatedAt: new Date(d.updatedAt),
            })),
            prototypes: (p.prototypes || []).map((prototype: PrototypeDocument) => ({
              ...prototype,
              createdAt: new Date(prototype.createdAt),
              updatedAt: new Date(prototype.updatedAt),
            })),
            activeSowDraftId: p.activeSowDraftId || null,
            activeSrsDraftId: p.activeSrsDraftId || null,
          }))
          if (!cancelled) {
            setProjects(projectsWithDates)
          }
        }
      } catch {
        console.error('Failed to parse stored projects from localStorage')
      } finally {
        if (!cancelled) {
          setIsHydrated(true)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  // Keep a local cache for fast reloads
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    }
  }, [projects, isHydrated])

  const createProject = useCallback((name: string, description: string): Project => {
    const now = new Date()
    const id = crypto.randomUUID()
    const newProject: Project = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      dataEntries: [],
      sowDrafts: [],
      srsDrafts: [],
      prototypes: [],
      activeSowDraftId: null,
      activeSrsDraftId: null,
    }
    setProjects((prev) => [...prev, newProject])

    void supabase
      .from('projects')
      .insert({
        id,
        name,
        description,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error creating project in Supabase:', {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
          })
        }
      })

    return newProject
  }, [])

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt } : p))
    )
    setCurrentProject((prev) =>
      prev?.id === id ? { ...prev, ...updates, updatedAt } : prev
    )

    void supabase
      .from('projects')
      .update({
        name: updates.name,
        description: updates.description,
        active_sow_draft_id: updates.activeSowDraftId,
        active_srs_draft_id: updates.activeSrsDraftId,
        updated_at: updatedAt.toISOString(),
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Error updating project in Supabase:', error)
      })
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setCurrentProject((prev) => (prev?.id === id ? null : prev))

    void supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Error deleting project in Supabase:', error)
      })
  }, [])

  const addDataEntry = useCallback(
    (projectId: string, entry: Omit<DataEntry, 'id' | 'createdAt'>) => {
      const createdAt = new Date()
      const id = crypto.randomUUID()
      const newEntry: DataEntry = {
        ...entry,
        id,
        createdAt,
      }
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, dataEntries: [...p.dataEntries, newEntry], updatedAt: new Date() }
            : p
        )
      )
      setCurrentProject((prev) =>
        prev?.id === projectId
          ? { ...prev, dataEntries: [...prev.dataEntries, newEntry], updatedAt: new Date() }
          : prev
      )

      void supabase
        .from('data_entries')
        .insert({
          id,
          project_id: projectId,
          type: entry.type,
          content: entry.content,
          name: entry.name,
          created_at: createdAt.toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error('Error adding data entry in Supabase:', error)
        })
    },
    []
  )

  const removeDataEntry = useCallback((projectId: string, entryId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              dataEntries: p.dataEntries.filter((e) => e.id !== entryId),
              updatedAt: new Date(),
            }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? {
            ...prev,
            dataEntries: prev.dataEntries.filter((e) => e.id !== entryId),
            updatedAt: new Date(),
          }
        : prev
    )

    void supabase
      .from('data_entries')
      .delete()
      .eq('id', entryId)
      .then(({ error }) => {
        if (error) console.error('Error removing data entry in Supabase:', error)
      })
  }, [])

  // SOW Draft methods
  const createSowDraft = useCallback((projectId: string, name: string): DocumentDraft => {
    const now = new Date()
    const id = crypto.randomUUID()
    const newDraft: DocumentDraft = {
      id,
      name,
      content: '',
      createdAt: now,
      updatedAt: now,
    }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sowDrafts: [...p.sowDrafts, newDraft],
              activeSowDraftId: newDraft.id,
              updatedAt: now,
            }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? {
            ...prev,
            sowDrafts: [...prev.sowDrafts, newDraft],
            activeSowDraftId: newDraft.id,
            updatedAt: now,
          }
        : prev
    )

    void (async () => {
      const { error: insertError } = await supabase.from('sow_drafts').insert({
        id,
        project_id: projectId,
        name,
        content: '',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })

      if (insertError) {
        console.error('Error creating SOW draft in Supabase:', insertError)
        return
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({ active_sow_draft_id: id, updated_at: now.toISOString() })
        .eq('id', projectId)

      if (updateError) {
        console.error('Error setting active SOW draft in Supabase:', updateError)
      }
    })()

    return newDraft
  }, [])

  const updateSowDraft = useCallback((projectId: string, draftId: string, content: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sowDrafts: p.sowDrafts.map((d) =>
                d.id === draftId ? { ...d, content, updatedAt } : d
              ),
              updatedAt,
            }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? {
            ...prev,
            sowDrafts: prev.sowDrafts.map((d) =>
              d.id === draftId ? { ...d, content, updatedAt } : d
            ),
            updatedAt,
          }
        : prev
    )

    void supabase
      .from('sow_drafts')
      .update({ content, updated_at: updatedAt.toISOString() })
      .eq('id', draftId)
      .then(({ error }) => {
        if (error) console.error('Error updating SOW draft in Supabase:', error)
      })
  }, [])

  const deleteSowDraft = useCallback((projectId: string, draftId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        const newDrafts = p.sowDrafts.filter((d) => d.id !== draftId)
        return {
          ...p,
          sowDrafts: newDrafts,
          activeSowDraftId:
            p.activeSowDraftId === draftId ? newDrafts[0]?.id || null : p.activeSowDraftId,
          updatedAt: new Date(),
        }
      })
    )
    setCurrentProject((prev) => {
      if (prev?.id !== projectId) return prev
      const newDrafts = prev.sowDrafts.filter((d) => d.id !== draftId)
      return {
        ...prev,
        sowDrafts: newDrafts,
        activeSowDraftId:
          prev.activeSowDraftId === draftId ? newDrafts[0]?.id || null : prev.activeSowDraftId,
        updatedAt: new Date(),
      }
    })

    void supabase
      .from('sow_drafts')
      .delete()
      .eq('id', draftId)
      .then(({ error }) => {
        if (error) console.error('Error deleting SOW draft in Supabase:', error)
      })
  }, [])

  const setActiveSowDraft = useCallback((projectId: string, draftId: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, activeSowDraftId: draftId, updatedAt } : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId ? { ...prev, activeSowDraftId: draftId, updatedAt } : prev
    )

    void supabase
      .from('projects')
      .update({ active_sow_draft_id: draftId, updated_at: updatedAt.toISOString() })
      .eq('id', projectId)
      .then(({ error }) => {
        if (error) console.error('Error setting active SOW draft in Supabase:', error)
      })
  }, [])

  const renameSowDraft = useCallback((projectId: string, draftId: string, name: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sowDrafts: p.sowDrafts.map((d) =>
                d.id === draftId ? { ...d, name, updatedAt } : d
              ),
              updatedAt,
            }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? {
            ...prev,
            sowDrafts: prev.sowDrafts.map((d) =>
              d.id === draftId ? { ...d, name, updatedAt } : d
            ),
            updatedAt,
          }
        : prev
    )

    void supabase
      .from('sow_drafts')
      .update({ name, updated_at: updatedAt.toISOString() })
      .eq('id', draftId)
      .then(({ error }) => {
        if (error) console.error('Error renaming SOW draft in Supabase:', error)
      })
  }, [])

  // SRS Draft methods
  const createSrsDraft = useCallback((projectId: string, name: string): DocumentDraft => {
    const now = new Date()
    const id = crypto.randomUUID()
    const newDraft: DocumentDraft = {
      id,
      name,
      content: '',
      createdAt: now,
      updatedAt: now,
    }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              srsDrafts: [...p.srsDrafts, newDraft],
              activeSrsDraftId: newDraft.id,
              updatedAt: now,
            }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? {
            ...prev,
            srsDrafts: [...prev.srsDrafts, newDraft],
            activeSrsDraftId: newDraft.id,
            updatedAt: now,
          }
        : prev
    )

    void (async () => {
      const { error: insertError } = await supabase.from('srs_drafts').insert({
        id,
        project_id: projectId,
        name,
        content: '',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })

      if (insertError) {
        console.error('Error creating SRS draft in Supabase:', insertError)
        return
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({ active_srs_draft_id: id, updated_at: now.toISOString() })
        .eq('id', projectId)

      if (updateError) {
        console.error('Error setting active SRS draft in Supabase:', updateError)
      }
    })()

    return newDraft
  }, [])

  const updateSrsDraft = useCallback((projectId: string, draftId: string, content: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              srsDrafts: p.srsDrafts.map((d) =>
                d.id === draftId ? { ...d, content, updatedAt } : d
              ),
              updatedAt,
            }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? {
            ...prev,
            srsDrafts: prev.srsDrafts.map((d) =>
              d.id === draftId ? { ...d, content, updatedAt } : d
            ),
            updatedAt,
          }
        : prev
    )

    void supabase
      .from('srs_drafts')
      .update({ content, updated_at: updatedAt.toISOString() })
      .eq('id', draftId)
      .then(({ error }) => {
        if (error) console.error('Error updating SRS draft in Supabase:', error)
      })
  }, [])

  const deleteSrsDraft = useCallback((projectId: string, draftId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        const newDrafts = p.srsDrafts.filter((d) => d.id !== draftId)
        return {
          ...p,
          srsDrafts: newDrafts,
          prototypes: p.prototypes.filter((prototype) => prototype.srsDraftId !== draftId),
          activeSrsDraftId:
            p.activeSrsDraftId === draftId ? newDrafts[0]?.id || null : p.activeSrsDraftId,
          updatedAt: new Date(),
        }
      })
    )
    setCurrentProject((prev) => {
      if (prev?.id !== projectId) return prev
      const newDrafts = prev.srsDrafts.filter((d) => d.id !== draftId)
      return {
        ...prev,
        srsDrafts: newDrafts,
        prototypes: prev.prototypes.filter((prototype) => prototype.srsDraftId !== draftId),
        activeSrsDraftId:
          prev.activeSrsDraftId === draftId ? newDrafts[0]?.id || null : prev.activeSrsDraftId,
        updatedAt: new Date(),
      }
    })

    void supabase
      .from('srs_drafts')
      .delete()
      .eq('id', draftId)
      .then(({ error }) => {
        if (error) console.error('Error deleting SRS draft in Supabase:', error)
      })
  }, [])

  const setActiveSrsDraft = useCallback((projectId: string, draftId: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, activeSrsDraftId: draftId, updatedAt } : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId ? { ...prev, activeSrsDraftId: draftId, updatedAt } : prev
    )

    void supabase
      .from('projects')
      .update({ active_srs_draft_id: draftId, updated_at: updatedAt.toISOString() })
      .eq('id', projectId)
      .then(({ error }) => {
        if (error) console.error('Error setting active SRS draft in Supabase:', error)
      })
  }, [])

  const renameSrsDraft = useCallback((projectId: string, draftId: string, name: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              srsDrafts: p.srsDrafts.map((d) =>
                d.id === draftId ? { ...d, name, updatedAt } : d
              ),
              updatedAt,
            }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? {
            ...prev,
            srsDrafts: prev.srsDrafts.map((d) =>
              d.id === draftId ? { ...d, name, updatedAt } : d
            ),
            updatedAt,
          }
        : prev
    )

    void supabase
      .from('srs_drafts')
      .update({ name, updated_at: updatedAt.toISOString() })
      .eq('id', draftId)
      .then(({ error }) => {
        if (error) console.error('Error renaming SRS draft in Supabase:', error)
      })
  }, [])

  const upsertPrototype = useCallback((projectId: string, srsDraftId: string, prompt: string) => {
    const updatedAt = new Date()

    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project

        const existing = project.prototypes.find((prototype) => prototype.srsDraftId === srsDraftId)
        const nextPrototype: PrototypeDocument = existing
          ? { ...existing, prompt, updatedAt }
          : {
              id: crypto.randomUUID(),
              srsDraftId,
              prompt,
              createdAt: updatedAt,
              updatedAt,
            }

        return {
          ...project,
          prototypes: existing
            ? project.prototypes.map((prototype) =>
                prototype.srsDraftId === srsDraftId ? nextPrototype : prototype
              )
            : [...project.prototypes, nextPrototype],
          updatedAt,
        }
      })
    )

    setCurrentProject((prev) => {
      if (prev?.id !== projectId) return prev

      const existing = prev.prototypes.find((prototype) => prototype.srsDraftId === srsDraftId)
      const nextPrototype: PrototypeDocument = existing
        ? { ...existing, prompt, updatedAt }
        : {
            id: crypto.randomUUID(),
            srsDraftId,
            prompt,
            createdAt: updatedAt,
            updatedAt,
          }

      return {
        ...prev,
        prototypes: existing
          ? prev.prototypes.map((prototype) =>
              prototype.srsDraftId === srsDraftId ? nextPrototype : prototype
            )
          : [...prev.prototypes, nextPrototype],
        updatedAt,
      }
    })

    void supabase
      .from('prototype_documents')
      .upsert(
        {
          srs_draft_id: srsDraftId,
          prompt,
          updated_at: updatedAt.toISOString(),
        },
        { onConflict: 'srs_draft_id' }
      )
      .then(({ error }) => {
        if (error) console.error('Error saving prototype in Supabase:', error)
      })
  }, [])

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        setCurrentProject,
        createProject,
        updateProject,
        deleteProject,
        addDataEntry,
        removeDataEntry,
        createSowDraft,
        updateSowDraft,
        deleteSowDraft,
        setActiveSowDraft,
        renameSowDraft,
        createSrsDraft,
        updateSrsDraft,
        deleteSrsDraft,
        setActiveSrsDraft,
        renameSrsDraft,
        upsertPrototype,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjects() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider')
  }
  return context
}
