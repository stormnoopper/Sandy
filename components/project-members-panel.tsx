'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Users, Trash2, Loader2, Crown, UserRound } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'

interface Member {
  userId: string
  userName: string | null
  userEmail: string | null
  role: 'owner' | 'member'
  joinedAt: string
}

interface ProjectMembersPanelProps {
  projectId: string
}

export function ProjectMembersPanel({ projectId }: ProjectMembersPanelProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`)
      if (!res.ok) return
      const data = await res.json()
      const mapped: Member[] = (data.members ?? []).map((m: any) => ({
        userId: m.user_id,
        userName: m.user_name,
        userEmail: m.user_email,
        role: m.role,
        joinedAt: m.joined_at,
      }))
      setMembers(mapped)
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchMembers()
  }, [fetchMembers])

  async function handleRemoveMember() {
    if (!removeTarget) return
    setIsRemoving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: removeTarget.userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to remove member.')
        return
      }
      toast.success(`${removeTarget.userName ?? 'Member'} has been removed.`)
      setRemoveTarget(null)
      void fetchMembers()
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Project Members
          </CardTitle>
          <CardDescription>
            Manage who has access to this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {member.role === 'owner' ? (
                      <Crown className="h-4 w-4 shrink-0 text-chart-4" />
                    ) : (
                      <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.userName ?? member.userEmail ?? member.userId}
                      </p>
                      {member.userName && member.userEmail && (
                        <p className="truncate text-xs text-muted-foreground">{member.userEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={member.role === 'owner' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {member.role}
                    </Badge>
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setRemoveTarget(member)}
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && members.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {members.length} {members.length === 1 ? 'member' : 'members'} •{' '}
              {members[0]?.joinedAt
                ? `Project created ${format(new Date(members[0].joinedAt), 'MMM d, yyyy')}`
                : ''}
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{removeTarget?.userName ?? removeTarget?.userEmail ?? 'this member'}</strong>{' '}
              from the project? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
