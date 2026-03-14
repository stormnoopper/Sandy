'use client'

import { useEffect, useState } from 'react'
import type { DataEntry } from '@/lib/types'

export function useProjectDataSelection(entries: DataEntry[] | undefined) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!entries) return

    setSelectedIds((previousIds) => {
      const validSelectedIds = previousIds.filter((entryId) =>
        entries.some((entry) => entry.id === entryId)
      )

      const nextIds = validSelectedIds.length > 0 ? validSelectedIds : entries.map((entry) => entry.id)
      const isSameSelection =
        previousIds.length === nextIds.length &&
        previousIds.every((entryId, index) => entryId === nextIds[index])

      return isSameSelection ? previousIds : nextIds
    })
  }, [entries])

  return { selectedIds, setSelectedIds }
}
