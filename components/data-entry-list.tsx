'use client'

import { useState, useRef } from 'react'
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
import { Plus, FileText, Type, Trash2, ListChecks, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface DataEntryListProps {
  projectId: string
  entries: DataEntry[]
}

type OcrStatus = 'idle' | 'uploading' | 'success' | 'error'

export function DataEntryList({ projectId, entries }: DataEntryListProps) {
  const { addDataEntry, updateDataEntry, removeDataEntry } = useProjects()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [entryType, setEntryType] = useState<'text' | 'file'>('text')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editType, setEditType] = useState<'text' | 'file'>('text')
  const [editName, setEditName] = useState('')
  const [editContent, setEditContent] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // File / OCR state
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrPages, setOcrPages] = useState<number | null>(null)
  const [ocrMethod, setOcrMethod] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetDialog = () => {
    setName('')
    setContent('')
    setOcrStatus('idle')
    setOcrError(null)
    setOcrPages(null)
    setOcrMethod(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (val: boolean) => {
    setOpen(val)
    if (!val) {
      resetDialog()
      setEntryType('text')
    }
  }

  const handleAdd = () => {
    if (name.trim() && content.trim()) {
      addDataEntry(projectId, {
        type: entryType,
        name: name.trim(),
        content: content.trim(),
      })
      resetDialog()
      setOpen(false)
    }
  }

  // Single handler for all file types — auto-detects PDF vs plain text
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    if (isPdf) {
      // PDF → send to OCR API
      setOcrStatus('uploading')
      setOcrError(null)
      setOcrPages(null)
      setOcrMethod(null)
      setName(file.name.replace(/\.pdf$/i, ''))
      setContent('')

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/ocr-pdf', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)

        setContent(data.text ?? '')
        setOcrPages(data.pages)
        setOcrMethod(data.method)
        setOcrStatus('success')
      } catch (err: any) {
        setOcrError(err.message ?? 'OCR failed')
        setOcrStatus('error')
      }
    } else {
      // Plain text file → read directly
      setOcrStatus('idle')
      setOcrError(null)
      setName(file.name)
      const reader = new FileReader()
      reader.onload = (event) => setContent(event.target?.result as string)
      reader.readAsText(file)
    }
  }

  const handleEditOpen = (entry: DataEntry) => {
    setEditId(entry.id)
    setEditType(entry.type)
    setEditName(entry.name)
    setEditContent(entry.content)
    setEditOpen(true)
  }

  const handleEditSave = () => {
    if (!editId || !editName.trim() || !editContent.trim()) return
    updateDataEntry(projectId, editId, {
      type: editType,
      name: editName.trim(),
      content: editContent.trim(),
    })
    setEditOpen(false)
    setEditId(null)
    setEditName('')
    setEditContent('')
    setEditType('text')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="h-5 w-5" />
          Project Data
        </CardTitle>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Data Entry</DialogTitle>
              <DialogDescription>
                Add requirements, notes, or file content to your project.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-1">
              <Tabs value={entryType} onValueChange={(v) => { setEntryType(v as 'text' | 'file'); resetDialog() }}>
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

                {/* Text tab */}
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

                {/* File tab — handles text files and PDFs (auto OCR) */}
                <TabsContent value="file" className="mt-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Upload File</FieldLabel>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.csv,.json,application/pdf,.pdf"
                        onChange={handleFileChange}
                        disabled={ocrStatus === 'uploading'}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        รองรับ .txt .md .csv .json และ PDF — PDF จะถูก OCR อัตโนมัติ
                      </p>
                    </Field>

                    {/* OCR loading */}
                    {ocrStatus === 'uploading' && (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>กำลัง extract ข้อความจาก PDF…</span>
                      </div>
                    )}

                    {/* OCR error */}
                    {ocrStatus === 'error' && (
                      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{ocrError}</span>
                      </div>
                    )}

                    {/* File loaded (text or PDF success) */}
                    {name && ocrStatus !== 'uploading' && ocrStatus !== 'error' && (
                      <>
                        {ocrStatus === 'success' && (
                          <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>
                              PDF extract สำเร็จ
                              {ocrPages != null && ` · ${ocrPages} หน้า`}
                              {ocrMethod === 'claude-vision' && ' · ใช้ AI Vision'}
                            </span>
                          </div>
                        )}
                        <Field>
                          <FieldLabel>ชื่อ Entry</FieldLabel>
                          <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </Field>
                        <Field>
                          <FieldLabel>เนื้อหา {ocrStatus === 'success' ? '(แก้ไขได้)' : '(Preview)'}</FieldLabel>
                          <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={ocrStatus === 'success' ? 8 : 6}
                            className="font-mono text-xs"
                          />
                        </Field>
                      </>
                    )}
                  </FieldGroup>
                </TabsContent>
              </Tabs>
            </div>
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
                  className="group flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  onClick={() => handleEditOpen(entry)}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteId(entry.id)
                    }}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data Entry</DialogTitle>
            <DialogDescription>Update your project data details and save changes.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <FieldGroup>
              <Field>
                <FieldLabel>Entry Type</FieldLabel>
                <Tabs value={editType} onValueChange={(v) => setEditType(v as 'text' | 'file')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text" className="gap-2">
                      <Type className="h-4 w-4" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="file" className="gap-2">
                      <FileText className="h-4 w-4" />
                      File
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
              <Field>
                <FieldLabel>Entry Name</FieldLabel>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Content</FieldLabel>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={14}
                  className="min-h-[280px]"
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={!editName.trim() || !editContent.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
