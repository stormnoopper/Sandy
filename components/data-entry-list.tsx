'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { DataEntry } from '@/lib/types'
import { useProjects } from '@/lib/project-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, FileText, Type, Trash2, ListChecks } from 'lucide-react'

interface DataEntryListProps {
  projectId: string
  entries: DataEntry[]
}

export function DataEntryList({ projectId, entries }: DataEntryListProps) {
  const { addDataEntry, removeDataEntry } = useProjects()
  const [open, setOpen] = useState(false)
  const [entryType, setEntryType] = useState<'text' | 'file'>('text')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleAdd = () => {
    if (name.trim() && content.trim()) {
      addDataEntry(projectId, {
        type: entryType,
        name: name.trim(),
        content: content.trim(),
      })
      setName('')
      setContent('')
      setOpen(false)
    }
  }

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setName(file.name)
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setContent(text)
      }
      reader.readAsText(file)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="h-5 w-5" />
          Project Data
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Data Entry</DialogTitle>
              <DialogDescription>
                Add requirements, notes, or file content to your project.
              </DialogDescription>
            </DialogHeader>
            <Tabs value={entryType} onValueChange={(v) => setEntryType(v as 'text' | 'file')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="gap-2">
                  <Type className="h-4 w-4" />
                  Text Entry
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-2">
                  <FileText className="h-4 w-4" />
                  File Upload
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Entry Name</FieldLabel>
                    <Input
                      placeholder="e.g., User Requirements"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Content</FieldLabel>
                    <Textarea
                      placeholder="Enter your requirements, notes, or specifications..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                    />
                  </Field>
                </FieldGroup>
              </TabsContent>
              <TabsContent value="file" className="mt-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Upload Text File</FieldLabel>
                    <Input
                      type="file"
                      accept=".txt,.md,.csv,.json"
                      onChange={handleFileRead}
                    />
                  </Field>
                  {name && (
                    <>
                      <Field>
                        <FieldLabel>File Name</FieldLabel>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                      </Field>
                      <Field>
                        <FieldLabel>Preview</FieldLabel>
                        <Textarea value={content} readOnly rows={6} className="font-mono text-sm" />
                      </Field>
                    </>
                  )}
                </FieldGroup>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!name.trim() || !content.trim()}>
                Add Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty
            icon={ListChecks}
            title="No data entries"
            description="Add requirements, notes, or files to generate SOW and SRS documents."
            className="py-8"
          />
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {entry.type === 'text' ? (
                        <Type className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{entry.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.type}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {entry.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {format(entry.createdAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setDeleteId(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete entry</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this data entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  removeDataEntry(projectId, deleteId)
                  setDeleteId(null)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
