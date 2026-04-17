'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { Share2, Copy, Trash2, CheckCheck, ExternalLink, Loader2, Eye, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import type { ShareLink } from '@/lib/types'

interface ShareDocumentDialogProps {
  projectId: string
  projectName: string
  documentType: 'sow' | 'srs'
  draftId: string
  draftName: string
}

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Never expires' },
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
]

export function ShareDocumentDialog({
  projectId,
  projectName,
  documentType,
  draftId,
  draftName,
}: ShareDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [expiry, setExpiry] = useState('never')

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/share`)
      if (res.ok) {
        const json = await res.json()
        const mapped = json.links
          .map((l: any) => ({
            ...l,
            expiresAt: l.expiresAt ? new Date(l.expiresAt) : undefined,
            createdAt: new Date(l.createdAt),
          }))
          .filter((l: ShareLink) => l.draftId === draftId)
        setLinks(mapped)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, draftId])

  useEffect(() => {
    if (open) fetchLinks()
  }, [open, fetchLinks])

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`

  const handleCopy = useCallback(async (token: string) => {
    await navigator.clipboard.writeText(shareUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const handleCreate = useCallback(async () => {
    setCreating(true)
    try {
      const expiresAt =
        expiry !== 'never' ? addDays(new Date(), parseInt(expiry)).toISOString() : undefined

      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          draftId,
          draftName,
          projectName,
          expiresAt,
        }),
      })
      if (res.ok) {
        await fetchLinks()
        toast({ title: 'Share link created', description: 'Copy it and send to anyone.' })
      } else {
        toast({ title: 'Failed to create link', variant: 'destructive' })
      }
    } finally {
      setCreating(false)
    }
  }, [projectId, documentType, draftId, draftName, projectName, expiry, fetchLinks])

  const handleRevoke = useCallback(
    async (linkId: string) => {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId }),
      })
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId))
        toast({ title: 'Link revoked' })
      } else {
        toast({ title: 'Failed to revoke link', variant: 'destructive' })
      }
    },
    [projectId]
  )

  const isExpired = (link: ShareLink) =>
    link.expiresAt ? new Date(link.expiresAt) < new Date() : false

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Create a read-only link that anyone can use to view this{' '}
            {documentType.toUpperCase()} — no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Create new link */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-medium">Create a new link</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Link expiry</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link className="h-3.5 w-3.5" />
                )}
                Create Link
              </Button>
            </div>
          </div>

          {/* Existing links */}
          <div>
            <p className="mb-2 text-sm font-medium">
              Active links
              {links.length > 0 && (
                <span className="ml-1 text-muted-foreground">({links.length})</span>
              )}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : links.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No share links yet.
              </p>
            ) : (
              <div className="space-y-2">
                {links.map((link) => {
                  const expired = isExpired(link)
                  return (
                    <div
                      key={link.id}
                      className={`rounded-lg border p-3 ${expired ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {expired ? (
                              <Badge variant="outline" className="border-red-400 text-red-500 text-xs">
                                Expired
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                Active
                              </Badge>
                            )}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {link.viewCount} views
                            </span>
                          </div>
                          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                            /share/{link.token.substring(0, 16)}…
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {format(link.createdAt, 'dd MMM yyyy')}
                            {link.expiresAt && (
                              <>
                                {' '}
                                · Expires {format(link.expiresAt, 'dd MMM yyyy')}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Open in new tab"
                            asChild
                          >
                            <a
                              href={shareUrl(link.token)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Copy link"
                            onClick={() => handleCopy(link.token)}
                          >
                            {copied === link.token ? (
                              <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Revoke link"
                            onClick={() => handleRevoke(link.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
