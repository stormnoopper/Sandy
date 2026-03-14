'use client'

import Link from 'next/link'
import type { Project } from '@/lib/types'
import { hasRichTextContent } from '@/lib/rich-text'
import { cn } from '@/lib/utils'
import { ListChecks, FileText, FileCode, ArrowRight, Check, LayoutTemplate } from 'lucide-react'

interface WorkflowDiagramProps {
  project: Project
}

export function WorkflowDiagram({ project }: WorkflowDiagramProps) {
  const hasData = project.dataEntries.length > 0
  const hasSOW = project.sowDrafts.some((draft) => hasRichTextContent(draft.content))
  const hasSRS = project.srsDrafts.some((draft) => hasRichTextContent(draft.content))
  const hasPrototype = project.prototypes.some((prototype) => prototype.prompt.trim())

  const steps = [
    {
      id: 'data',
      label: 'Project Data',
      description: 'Requirements & Files',
      icon: ListChecks,
      completed: hasData,
      available: true,
      href: `/project/${project.id}`,
    },
    {
      id: 'sow',
      label: 'SOW',
      description: 'Statement of Work',
      icon: FileText,
      completed: hasSOW,
      available: hasData,
      href: `/project/${project.id}/sow`,
    },
    {
      id: 'srs',
      label: 'SRS',
      description: 'System Requirements',
      icon: FileCode,
      completed: hasSRS,
      available: hasSOW,
      href: `/project/${project.id}/srs`,
    },
    {
      id: 'prototype',
      label: 'Prototype',
      description: 'UI/UX & Interactions',
      icon: LayoutTemplate,
      completed: hasPrototype,
      available: hasSRS,
      href: `/project/${project.id}/prototype`,
    },
  ]

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {step.available ? (
            <Link
              href={step.href}
              className={cn(
                'group relative flex flex-col items-center rounded-xl border-2 p-4 transition-all hover:shadow-md',
                step.completed
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/50'
              )}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  step.completed
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step.completed ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <step.icon className="h-6 w-6" />
                )}
              </div>
              <span className="mt-2 font-semibold text-foreground">{step.label}</span>
              <span className="text-xs text-muted-foreground">{step.description}</span>
              {step.completed && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-chart-2 text-xs text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </Link>
          ) : (
            <div
              aria-disabled="true"
              className="relative flex cursor-not-allowed flex-col items-center rounded-xl border-2 border-border bg-muted/40 p-4 opacity-60 grayscale"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <step.icon className="h-6 w-6" />
              </div>
              <span className="mt-2 font-semibold text-foreground">{step.label}</span>
              <span className="text-xs text-muted-foreground">{step.description}</span>
            </div>
          )}
          {index < steps.length - 1 && (
            <ArrowRight className="mx-2 h-5 w-5 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}
