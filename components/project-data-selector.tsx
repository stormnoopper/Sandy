'use client'

import { useMemo } from 'react'
import type { DataEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface ProjectDataSelectorProps {
  entries: DataEntry[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  title?: string
  description?: string
}

export function ProjectDataSelector({
  entries,
  selectedIds,
  onChange,
  title = 'Project Data',
  description = 'Select the project data to include in AI generation.',
}: ProjectDataSelectorProps) {
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allSelected = entries.length > 0 && selectedIds.length === entries.length

  const toggleEntry = (entryId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, entryId])
      return
    }

    onChange(selectedIds.filter((id) => id !== entryId))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <Badge variant="outline">
            {selectedIds.length}/{entries.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data entries. Add some from the project page.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onChange(entries.map((entry) => entry.id))}
                disabled={allSelected}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onChange([])}
                disabled={selectedIds.length === 0}
              >
                Clear
              </Button>
            </div>

            <ScrollArea className="h-72 pr-3">
              <div className="space-y-2">
                {entries.map((entry) => {
                  const isChecked = selectedIdSet.has(entry.id)

                  return (
                    <label
                      key={entry.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => toggleEntry(entry.id, checked === true)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate text-xs font-medium">{entry.name}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {entry.type}
                          </Badge>
                        </div>
                        <p className="line-clamp-3 text-xs text-muted-foreground">{entry.content}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}
