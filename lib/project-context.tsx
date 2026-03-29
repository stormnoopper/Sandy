'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import type { Project, DataEntry, DocumentDraft, PrototypeDocument } from './types'
import { supabase } from './supabaseClient'

interface ProjectContextType {
  projects: Project[]
  isHydrated: boolean
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  createProject: (name: string, description: string) => Project
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addDataEntry: (projectId: string, entry: Omit<DataEntry, 'id' | 'createdAt'>) => void
  removeDataEntry: (projectId: string, entryId: string) => void
  refreshProjects: () => void
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

function storageKey(userId: string) {
  return `project-manager-data-v3-${userId}`
}

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
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const userName = session?.user?.name ?? null
  const userEmail = session?.user?.email ?? null

  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  const refreshProjects = useCallback(() => setRefreshCount((c) => c + 1), [])

  useEffect(() => {
    if (status === 'loading') return
    if (!userId) {
      setIsHydrated(true)
      return
    }

    setIsHydrated(false)
    let cancelled = false

    async function load() {
      try {
        // Get project IDs this user is a member of
        const { data: memberRows, error: memberError } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId)

        if (memberError) throw memberError

        const projectIds = (memberRows ?? []).map((r: any) => r.project_id as string)

        if (projectIds.length === 0) {
          if (!cancelled) {
            setProjects([])
            setIsHydrated(true)
          }
          return
        }

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
              'id, name, description, owner_id, created_at, updated_at, active_sow_draft_id, active_srs_draft_id'
            )
            .in('id', projectIds)
            .order('created_at', { ascending: true }),
          supabase
            .from('data_entries')
            .select('id, project_id, type, content, name, created_at')
            .in('project_id', projectIds),
          supabase
            .from('sow_drafts')
            .select('id, project_id, name, content, created_at, updated_at')
            .in('project_id', projectIds),
          supabase
            .from('srs_drafts')
            .select('id, project_id, name, content, created_at, updated_at')
            .in('project_id', projectIds),
          supabase
            .from('prototype_documents')
            .select('id, srs_draft_id, prompt, created_at, updated_at'),
        ])

        const firstError =
          projectsError || dataEntriesError || sowDraftsError || srsDraftsError || prototypesError

        if (firstError) throw firstError

        if (!cancelled) {
          const mapped: Project[] = (projectRows ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            ownerId: row.owner_id ?? '',
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

      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(storageKey(userId!))
        if (stored) {
          const parsed = JSON.parse(stored)
          const projectsWithDates = parsed.map((p: Project) => ({
            ...p,
            ownerId: p.ownerId ?? '',
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
  }, [userId, status, refreshCount])

  // User-scoped localStorage cache
  useEffect(() => {
    if (isHydrated && userId) {
      localStorage.setItem(storageKey(userId), JSON.stringify(projects))
    }
  }, [projects, isHydrated, userId])

  const createProject = useCallback(
    (name: string, description: string): Project => {
      const now = new Date()
      const id = crypto.randomUUID()
      const newProject: Project = {
        id,
        name,
        description,
        ownerId: userId ?? '',
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

      void (async () => {
        const { error: projectError } = await supabase.from('projects').insert({
          id,
          name,
          description,
          owner_id: userId ?? '',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })

        if (projectError) {
          console.error('Error creating project in Supabase:', {
            message: projectError.message,
            details: (projectError as any).details,
            hint: (projectError as any).hint,
            code: (projectError as any).code,
          })
          return
        }

        const { error: memberError } = await supabase.from('project_members').insert({
          project_id: id,
          user_id: userId ?? '',
          user_name: userName,
          user_email: userEmail,
          role: 'owner',
          joined_at: now.toISOString(),
        })

        if (memberError) {
          console.error('Error creating project owner membership in Supabase:', memberError)
        }
      })()

      return newProject
    },
    [userId, userName, userEmail]
  )

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
      const newEntry: DataEntry = { ...entry, id, createdAt }
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
          ? { ...p, dataEntries: p.dataEntries.filter((e) => e.id !== entryId), updatedAt: new Date() }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? { ...prev, dataEntries: prev.dataEntries.filter((e) => e.id !== entryId), updatedAt: new Date() }
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
    const newDraft: DocumentDraft = { id, name, content: '', createdAt: now, updatedAt: now }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, sowDrafts: [...p.sowDrafts, newDraft], activeSowDraftId: newDraft.id, updatedAt: now }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? { ...prev, sowDrafts: [...prev.sowDrafts, newDraft], activeSowDraftId: newDraft.id, updatedAt: now }
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
      if (updateError) console.error('Error setting active SOW draft in Supabase:', updateError)
    })()

    return newDraft
  }, [])

  const updateSowDraft = useCallback((projectId: string, draftId: string, content: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, sowDrafts: p.sowDrafts.map((d) => (d.id === draftId ? { ...d, content, updatedAt } : d)), updatedAt }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? { ...prev, sowDrafts: prev.sowDrafts.map((d) => (d.id === draftId ? { ...d, content, updatedAt } : d)), updatedAt }
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

  const deleteSowDraft = useCallback(
    (projectId: string, draftId: string) => {
      let nextActiveId: string | null = null
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p
          const newDrafts = p.sowDrafts.filter((d) => d.id !== draftId)
          nextActiveId =
            p.activeSowDraftId === draftId ? (newDrafts[0]?.id ?? null) : p.activeSowDraftId
          return { ...p, sowDrafts: newDrafts, activeSowDraftId: nextActiveId, updatedAt: new Date() }
        })
      )
      setCurrentProject((prev) => {
        if (prev?.id !== projectId) return prev
        const newDrafts = prev.sowDrafts.filter((d) => d.id !== draftId)
        const newActiveId =
          prev.activeSowDraftId === draftId ? (newDrafts[0]?.id ?? null) : prev.activeSowDraftId
        return { ...prev, sowDrafts: newDrafts, activeSowDraftId: newActiveId, updatedAt: new Date() }
      })

      void (async () => {
        const project = projects.find((p) => p.id === projectId)
        if (project?.activeSowDraftId === draftId) {
          const newDrafts = project.sowDrafts.filter((d) => d.id !== draftId)
          await supabase
            .from('projects')
            .update({
              active_sow_draft_id: newDrafts[0]?.id ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)
        }
        const { error } = await supabase.from('sow_drafts').delete().eq('id', draftId)
        if (error) console.error('Error deleting SOW draft in Supabase:', error)
      })()
    },
    [projects]
  )

  const setActiveSowDraft = useCallback((projectId: string, draftId: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, activeSowDraftId: draftId, updatedAt } : p))
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
          ? { ...p, sowDrafts: p.sowDrafts.map((d) => (d.id === draftId ? { ...d, name, updatedAt } : d)), updatedAt }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? { ...prev, sowDrafts: prev.sowDrafts.map((d) => (d.id === draftId ? { ...d, name, updatedAt } : d)), updatedAt }
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
    const newDraft: DocumentDraft = { id, name, content: '', createdAt: now, updatedAt: now }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, srsDrafts: [...p.srsDrafts, newDraft], activeSrsDraftId: newDraft.id, updatedAt: now }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? { ...prev, srsDrafts: [...prev.srsDrafts, newDraft], activeSrsDraftId: newDraft.id, updatedAt: now }
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
      if (updateError) console.error('Error setting active SRS draft in Supabase:', updateError)
    })()

    return newDraft
  }, [])

  const updateSrsDraft = useCallback((projectId: string, draftId: string, content: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, srsDrafts: p.srsDrafts.map((d) => (d.id === draftId ? { ...d, content, updatedAt } : d)), updatedAt }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? { ...prev, srsDrafts: prev.srsDrafts.map((d) => (d.id === draftId ? { ...d, content, updatedAt } : d)), updatedAt }
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

  const deleteSrsDraft = useCallback(
    (projectId: string, draftId: string) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p
          const newDrafts = p.srsDrafts.filter((d) => d.id !== draftId)
          return {
            ...p,
            srsDrafts: newDrafts,
            prototypes: p.prototypes.filter((prototype) => prototype.srsDraftId !== draftId),
            activeSrsDraftId:
              p.activeSrsDraftId === draftId ? (newDrafts[0]?.id ?? null) : p.activeSrsDraftId,
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
            prev.activeSrsDraftId === draftId ? (newDrafts[0]?.id ?? null) : prev.activeSrsDraftId,
          updatedAt: new Date(),
        }
      })

      void (async () => {
        const project = projects.find((p) => p.id === projectId)
        if (project?.activeSrsDraftId === draftId) {
          const newDrafts = project.srsDrafts.filter((d) => d.id !== draftId)
          await supabase
            .from('projects')
            .update({
              active_srs_draft_id: newDrafts[0]?.id ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)
        }
        const { error } = await supabase.from('srs_drafts').delete().eq('id', draftId)
        if (error) console.error('Error deleting SRS draft in Supabase:', error)
      })()
    },
    [projects]
  )

  const setActiveSrsDraft = useCallback((projectId: string, draftId: string) => {
    const updatedAt = new Date()
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, activeSrsDraftId: draftId, updatedAt } : p))
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
          ? { ...p, srsDrafts: p.srsDrafts.map((d) => (d.id === draftId ? { ...d, name, updatedAt } : d)), updatedAt }
          : p
      )
    )
    setCurrentProject((prev) =>
      prev?.id === projectId
        ? { ...prev, srsDrafts: prev.srsDrafts.map((d) => (d.id === draftId ? { ...d, name, updatedAt } : d)), updatedAt }
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
        const existing = project.prototypes.find((p) => p.srsDraftId === srsDraftId)
        const nextPrototype: PrototypeDocument = existing
          ? { ...existing, prompt, updatedAt }
          : { id: crypto.randomUUID(), srsDraftId, prompt, createdAt: updatedAt, updatedAt }
        return {
          ...project,
          prototypes: existing
            ? project.prototypes.map((p) => (p.srsDraftId === srsDraftId ? nextPrototype : p))
            : [...project.prototypes, nextPrototype],
          updatedAt,
        }
      })
    )

    setCurrentProject((prev) => {
      if (prev?.id !== projectId) return prev
      const existing = prev.prototypes.find((p) => p.srsDraftId === srsDraftId)
      const nextPrototype: PrototypeDocument = existing
        ? { ...existing, prompt, updatedAt }
        : { id: crypto.randomUUID(), srsDraftId, prompt, createdAt: updatedAt, updatedAt }
      return {
        ...prev,
        prototypes: existing
          ? prev.prototypes.map((p) => (p.srsDraftId === srsDraftId ? nextPrototype : p))
          : [...prev.prototypes, nextPrototype],
        updatedAt,
      }
    })

    void supabase
      .from('prototype_documents')
      .upsert({ srs_draft_id: srsDraftId, prompt, updated_at: updatedAt.toISOString() }, { onConflict: 'srs_draft_id' })
      .then(({ error }) => {
        if (error) console.error('Error saving prototype in Supabase:', error)
      })
  }, [])

  return (
    <ProjectContext.Provider
      value={{
        projects,
        isHydrated,
        currentProject,
        setCurrentProject,
        createProject,
        updateProject,
        deleteProject,
        addDataEntry,
        removeDataEntry,
        refreshProjects,
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
