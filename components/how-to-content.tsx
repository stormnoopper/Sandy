'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  ClipboardList,
  FileText,
  FileCode,
  LayoutTemplate,
  ChevronRight,
  CheckCircle2,
  Upload,
  Sparkles,
  Download,
  Share2,
  Users,
  Info,
  ArrowRight,
  ScanText,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TopNav } from './top-nav'

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */

const steps = [
  {
    id: 'create-project',
    number: '01',
    icon: ClipboardList,
    color: 'text-chart-1',
    bg: 'bg-chart-1/10',
    border: 'border-chart-1/30',
    title: 'สร้าง Project',
    summary: 'เริ่มต้นด้วยการสร้าง Project ใหม่',
    description:
      'คลิกปุ่ม + ที่ส่วน Projects ในแถบด้านซ้าย ตั้งชื่อโครงการและใส่คำอธิบายโดยย่อ จากนั้นกด Create Project',
    tips: [
      'ชื่อโครงการควรสื่อถึงระบบที่จะพัฒนา เช่น "ระบบจัดการคลังสินค้า"',
      'คำอธิบายช่วยให้ AI เข้าใจบริบทโดยรวมของโครงการ',
    ],
    screenshot: null,
  },
  {
    id: 'add-data',
    number: '02',
    icon: Upload,
    color: 'text-chart-2',
    bg: 'bg-chart-2/10',
    border: 'border-chart-2/30',
    title: 'เพิ่ม Project Data',
    summary: 'ใส่ข้อมูลความต้องการและเอกสารอ้างอิง',
    description:
      'ใน Project Dashboard คลิก "Add Entry" เพื่อเพิ่มข้อมูลให้ AI ใช้ในการสร้างเอกสาร รองรับ 2 รูปแบบ',
    subItems: [
      {
        icon: FileText,
        label: 'Text Entry',
        desc: 'พิมพ์ความต้องการ, หมายเหตุ, หรือข้อกำหนดระบบโดยตรง',
      },
      {
        icon: ScanText,
        label: 'File Upload',
        desc: 'อัปโหลดไฟล์ .txt .md .csv .json หรือ PDF — PDF จะถูก OCR อัตโนมัติ',
      },
    ],
    tips: [
      'ยิ่งใส่ข้อมูลละเอียดมาก AI จะสร้างเอกสารที่ตรงกับความต้องการมากขึ้น',
      'สามารถเพิ่ม Data Entry ได้หลายรายการ เช่น แยกตามหัวข้อหรือหน่วยงาน',
      'PDF สแกน (scanned) จะใช้ AI Vision OCR อัตโนมัติ',
    ],
  },
  {
    id: 'generate-sow',
    number: '03',
    icon: FileText,
    color: 'text-chart-4',
    bg: 'bg-chart-4/10',
    border: 'border-chart-4/30',
    title: 'สร้าง SOW ด้วย AI',
    summary: 'ให้ AI สร้าง Statement of Work',
    description:
      'เมื่อมี Data Entry แล้ว คลิก "Create SOW" เพื่อเข้าสู่หน้า SOW Editor จากนั้นคลิก "Generate with AI" — AI จะสร้างเนื้อหาให้ทั้งฉบับ',
    subItems: [
      {
        icon: Sparkles,
        label: 'AI Generation',
        desc: 'AI สร้าง SOW ครอบคลุมขอบเขตงาน, timeline, deliverables ในรูปแบบมาตรฐาน',
      },
      {
        icon: FileCode,
        label: 'Rich Text Editor',
        desc: 'แก้ไข, เพิ่มเติมเนื้อหา หรือ regenerate เฉพาะส่วนที่ต้องการได้',
      },
    ],
    tips: [
      'กด "Regenerate Section" เพื่อ AI สร้างเฉพาะส่วนที่ไม่พอใจใหม่',
      'บันทึก draft หลายเวอร์ชันเพื่อเปรียบเทียบ',
    ],
  },
  {
    id: 'generate-srs',
    number: '04',
    icon: FileCode,
    color: 'text-chart-1',
    bg: 'bg-chart-1/10',
    border: 'border-chart-1/30',
    title: 'สร้าง SRS ด้วย AI',
    summary: 'สร้าง System Requirements Specification',
    description:
      'หลังจาก SOW พร้อมแล้ว คลิก "Create SRS" เพื่อให้ AI สร้าง SRS โดยใช้ SOW เป็น context — เนื้อหาจะสอดคล้องกันทั้งเอกสาร',
    tips: [
      'SRS จะอ้างอิงข้อมูลจาก SOW อัตโนมัติ ทำให้เนื้อหาต่อเนื่องกัน',
      'รองรับการ export เป็นไฟล์ Word (.docx) และ PDF',
    ],
  },
  {
    id: 'prototype',
    number: '05',
    icon: LayoutTemplate,
    color: 'text-chart-5',
    bg: 'bg-chart-5/10',
    border: 'border-chart-5/30',
    title: 'สร้าง Prototype Prompt',
    summary: 'สร้าง prompt สำหรับ Prototype',
    description:
      'ใช้ SRS ที่สร้างไว้เป็นฐานในการสร้าง Prototype Prompt — ระบุ prompt ที่ต้องการและบันทึกไว้ใช้กับเครื่องมือ UI generation ต่อไป',
    tips: [
      'Prototype เชื่อมโยงกับ SRS draft ที่ active อยู่เสมอ',
      'เปลี่ยน active SRS ได้ที่ Draft Selector ในหน้า SRS',
    ],
  },
  {
    id: 'export-share',
    number: '06',
    icon: Download,
    color: 'text-chart-2',
    bg: 'bg-chart-2/10',
    border: 'border-chart-2/30',
    title: 'Export & Share',
    summary: 'ส่งออกและแชร์เอกสาร',
    description: 'เมื่อเอกสารพร้อมแล้ว สามารถ Export หรือแชร์ได้หลายรูปแบบ',
    subItems: [
      {
        icon: Download,
        label: 'Export',
        desc: 'ดาวน์โหลดเป็นไฟล์ Word (.docx) หรือ PDF ได้จากปุ่มใน toolbar',
      },
      {
        icon: Share2,
        label: 'Share Link',
        desc: 'สร้าง shareable link สำหรับผู้ที่ไม่มีบัญชี — view only',
      },
      {
        icon: Users,
        label: 'Team Members',
        desc: 'เชิญสมาชิกเข้าร่วม Project เพื่อแก้ไขร่วมกัน',
      },
    ],
    tips: ['Share link มีอายุกำหนด สามารถตั้งได้ในหน้า Share settings'],
  },
]

const faqs = [
  {
    q: 'AI ใช้ภาษาอะไรในการสร้างเอกสาร?',
    a: 'AI สร้างเอกสารเป็นภาษาไทยเป็นหลัก เหมาะสำหรับโครงการราชการและบริษัทไทย',
  },
  {
    q: 'ไฟล์ PDF สแกน (scanned) รองรับไหม?',
    a: 'รองรับครับ — ระบบจะตรวจสอบอัตโนมัติ ถ้า PDF ไม่มีข้อความ (image-based) จะส่งให้ AI Vision อ่านแทน',
  },
  {
    q: 'สามารถสร้าง SOW หลาย draft ได้ไหม?',
    a: 'ได้ครับ กด "New Draft" ในหน้า SOW เพื่อสร้าง draft ใหม่ และสลับ active draft ได้ตลอด',
  },
  {
    q: 'ข้อมูล Project ถูกเก็บที่ไหน?',
    a: 'ข้อมูลทั้งหมดเก็บใน Supabase database ที่ผูกกับบัญชีของคุณ ปลอดภัยและเข้าถึงได้จากทุกที่',
  },
  {
    q: 'สมาชิกใน Project มีสิทธิ์อะไรบ้าง?',
    a: 'Member สามารถดูและแก้ไขเอกสารได้ ส่วน Owner เท่านั้นที่จัดการสมาชิกและลบ Project ได้',
  },
]

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export function HowToContent() {
  const [activeStep, setActiveStep] = useState<string | null>(null)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-auto">
        {/* Hero */}
      <div className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-chart-4/5 px-8 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <Badge variant="secondary" className="text-xs font-medium">
              User Guide
            </Badge>
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
            คู่มือการใช้งาน Sandy
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Sandy ช่วยให้คุณสร้างเอกสารโครงการ IT อย่าง{' '}
            <strong className="text-foreground">SOW, SRS และ Prototype Spec</strong>{' '}
            ได้อย่างรวดเร็วด้วย AI ทำตามขั้นตอนด้านล่างเพื่อเริ่มต้น
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {steps.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <span className="font-mono text-primary/60">{s.number}</span>
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-8 py-10">
        {/* Workflow overview */}
        <div className="mb-12 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            ภาพรวม Workflow
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
                      s.bg,
                      s.border,
                      s.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {s.title}
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = activeStep === step.id
            return (
              <section
                key={step.id}
                id={step.id}
                className={cn(
                  'scroll-mt-6 rounded-xl border bg-card transition-shadow',
                  isActive ? 'border-primary/40 shadow-md shadow-primary/5' : 'border-border'
                )}
                onClick={() => setActiveStep(step.id === activeStep ? null : step.id)}
              >
                {/* Step header */}
                <div className="flex cursor-pointer items-start gap-4 p-6">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
                      step.bg,
                      step.border
                    )}
                  >
                    <Icon className={cn('h-5 w-5', step.color)} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={cn('font-mono text-xs font-bold', step.color)}>
                        STEP {step.number}
                      </span>
                      <h2 className="text-xl font-semibold text-foreground">{step.title}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{step.summary}</p>
                  </div>

                  <ChevronRight
                    className={cn(
                      'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                      isActive && 'rotate-90'
                    )}
                  />
                </div>

                {/* Step detail */}
                {isActive && (
                  <div className="border-t border-border px-6 pb-6 pt-5">
                    <p className="mb-5 leading-relaxed text-muted-foreground">{step.description}</p>

                    {/* Sub-items */}
                    {step.subItems && (
                      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {step.subItems.map((item) => {
                          const ItemIcon = item.icon
                          return (
                            <div
                              key={item.label}
                              className="rounded-lg border border-border bg-muted/30 p-4"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <ItemIcon className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold">{item.label}</span>
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {item.desc}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Tips */}
                    {step.tips && (
                      <div
                        className={cn(
                          'rounded-lg border p-4',
                          step.bg,
                          step.border
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Info className={cn('h-4 w-4', step.color)} />
                          <span className={cn('text-xs font-semibold uppercase tracking-wide', step.color)}>
                            Tips
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {step.tips.map((tip) => (
                            <li key={tip} className="flex items-start gap-2 text-sm text-foreground/80">
                              <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', step.color)} />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">คำถามที่พบบ่อย (FAQ)</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-2 font-semibold text-foreground">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-chart-4/5 p-8 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="mb-2 text-2xl font-bold">พร้อมเริ่มต้นแล้วใช่ไหม?</h2>
          <p className="mb-6 text-muted-foreground">
            กลับไปที่ Dashboard และสร้าง Project แรกของคุณเลย
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              <LayoutTemplate className="h-4 w-4" />
              ไปที่ Dashboard
            </Link>
          </Button>
        </div>
      </div>
      </main>
    </div>
  )
}
