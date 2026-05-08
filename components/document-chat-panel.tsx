'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import type { ChatMessage } from '@/lib/types'
import { htmlToText } from '@/lib/rich-text'
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  ChevronRight,
  Quote,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentChatPanelProps {
  projectId: string
  projectName: string
  projectDescription?: string
  documentType: 'sow' | 'srs'
  draftId?: string
  /** HTML content of the current document */
  documentContent?: string
  /** HTML content of the SOW (only needed on SRS page) */
  sowContent?: string
  /** Callback when user clicks "Apply to Document" */
  onApplyEdit?: (sessionId: string) => void
  /** Is the document currently generating/updating? */
  isGenerating?: boolean
}

export function DocumentChatPanel({
  projectId,
  projectName,
  projectDescription,
  documentType,
  draftId,
  documentContent,
  sowContent,
  onApplyEdit,
  isGenerating,
}: DocumentChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [hasSelection, setHasSelection] = useState(false)

  // ตรวจจับการเลือกข้อความ
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      setHasSelection(!!selection && selection.toString().trim().length > 0)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  // โหลด history เมื่อ panel เปิด หรือ draft เปลี่ยน
  useEffect(() => {
    if (!isOpen || !draftId) return

    setIsLoadingHistory(true)
    fetch(
      `/api/projects/${projectId}/chat?documentType=${documentType}&draftId=${draftId}`
    )
      .then((r) => r.json())
      .then((data) => {
        setSessionId(data.sessionId ?? null)
        setMessages(
          (data.messages ?? []).map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }))
        )
      })
      .catch(console.error)
      .finally(() => setIsLoadingHistory(false))
  }, [isOpen, projectId, documentType, draftId])

  // Reset เมื่อ draft เปลี่ยน
  useEffect(() => {
    setMessages([])
    setSessionId(null)
    setStreamingContent('')
  }, [draftId])

  // Auto-scroll ลงล่างเสมอ
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingContent])

  // ปรับ layout หลักไม่ให้แผงแชททับเนื้อหา editor (เฉพาะบนจอใหญ่)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    
    // ตั้งค่า transition ให้ body เพื่อให้การขยับมีความสมูท
    document.body.style.transition = 'padding-right 0.3s ease-in-out'

    const handleResize = () => {
      if (isOpen && mediaQuery.matches) {
        document.body.style.paddingRight = '380px'
      } else {
        document.body.style.paddingRight = '0px'
      }
    }

    handleResize()
    mediaQuery.addEventListener('change', handleResize)
    
    return () => {
      mediaQuery.removeEventListener('change', handleResize)
      document.body.style.paddingRight = '0px'
      // ล้าง transition ออกเมื่อ component ถูก unmount
      setTimeout(() => {
        document.body.style.transition = ''
      }, 300)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    // เพิ่ม user message ทันที
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])

    abortRef.current = new AbortController()

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          sessionId,
          documentType,
          draftId,
          userMessage: text,
          documentContent: documentContent ? htmlToText(documentContent) : '',
          projectName,
          projectDescription,
          sowContent: sowContent ? htmlToText(sowContent) : undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(err || 'Failed to send message')
      }

      // รับ session ID จาก header ถ้ายังไม่มี
      const newSessionId = response.headers.get('X-Chat-Session-Id')
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId)
      }

      // Stream response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setStreamingContent(fullText)
      }

      // เพิ่ม assistant message เมื่อ stream จบ
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullText,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setStreamingContent('')
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error)
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ เกิดข้อผิดพลาด: ${error.message ?? 'ไม่สามารถติดต่อ AI ได้'}`,
          createdAt: new Date(),
        }
        setMessages((prev) => [...prev, errMsg])
      }
    } finally {
      setIsLoading(false)
      setStreamingContent('')
    }
  }, [input, isLoading, sessionId, projectId, documentType, draftId, documentContent, projectName, projectDescription, sowContent])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    if (isLoading) {
      abortRef.current?.abort()
    }
    setMessages([])
    setSessionId(null)
    setStreamingContent('')
    setInput('')
  }

  const docLabel = documentType === 'sow' ? 'SOW' : 'SRS'

  const suggestions =
    documentType === 'sow'
      ? [
          'ส่วนไหนของ SOW ที่ควรเพิ่มรายละเอียด?',
          'ช่วยตรวจสอบความครบถ้วนของ SOW',
          'Scope ของโครงการครอบคลุมหรือยัง?',
        ]
      : [
          'ช่วยวิเคราะห์ Functional Requirements',
          'ส่วนไหนที่ขาดหายไปใน SRS?',
          'Non-functional requirements ครบไหม?',
        ]

  return (
    <>
      {/* Toggle Button */}
      <Button
        id="chat-panel-toggle"
        variant={isOpen ? 'default' : 'outline'}
        size="sm"
        onClick={() => setIsOpen((o) => !o)}
        className={cn('gap-2 transition-all', isOpen && 'shadow-md')}
        title={`AI ช่วยแนะนำ ${docLabel}`}
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">AI ช่วยแนะนำ</span>
        {messages.length > 0 && (
          <Badge variant="secondary" className="h-5 min-w-5 px-1 text-xs">
            {messages.length}
          </Badge>
        )}
      </Button>

      {/* Floating Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full flex-col border-l bg-background shadow-2xl transition-all duration-300 ease-in-out',
          isOpen ? 'w-[380px] translate-x-0' : 'w-[380px] translate-x-full'
        )}
        aria-hidden={!isOpen}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI ช่วยแนะนำ {docLabel}</p>
              <p className="text-xs text-muted-foreground">
                {sessionId ? 'สนทนาต่อเนื่อง' : 'เริ่มบทสนทนาใหม่'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNewChat}
                title="เริ่มบทสนทนาใหม่"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-3 p-4">
            {isLoadingHistory && (
              <div className="flex items-center justify-center py-8">
                <Spinner className="size-5" />
              </div>
            )}

            {!isLoadingHistory && messages.length === 0 && !streamingContent && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">ถามอะไรก็ได้เกี่ยวกับ {docLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    AI จะแนะนำว่าควรแก้ไขส่วนไหน อย่างไร โดยอ้างอิงจากเนื้อหาเอกสารของคุณ
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start gap-1.5 whitespace-normal py-2 text-left text-xs"
                      onClick={() => {
                        setInput(suggestion)
                        textareaRef.current?.focus()
                      }}
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            {streamingContent && (
              <ChatBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  createdAt: new Date(),
                }}
                isStreaming
              />
            )}

            {isLoading && !streamingContent && (
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-px w-full" />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background p-3">
          {!draftId && (
            <p className="mb-2 text-center text-xs text-muted-foreground">
              สร้าง draft ก่อนเพื่อเริ่มสนทนา
            </p>
          )}

          {hasSelection && draftId && (
            <div className="mb-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] px-2.5 text-muted-foreground hover:text-foreground shadow-sm bg-muted/50"
                onMouseDown={(e) => {
                  e.preventDefault() // ป้องกันไม่ให้ selection หายเวลาคลิก
                }}
                onClick={() => {
                  const text = window.getSelection()?.toString()
                  if (text) {
                    setInput((prev) => (prev ? prev + '\n\n' + `> ${text}\n` : `> ${text}\n`))
                    textareaRef.current?.focus()
                  }
                }}
                title="คัดลอกข้อความที่ไฮไลต์มาใส่ในช่องแชท"
              >
                <Quote className="h-3 w-3 mr-1.5" />
                ดึงข้อความที่เลือก
              </Button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`ถามเกี่ยวกับ ${docLabel}… (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)`}
              className="min-h-[60px] max-h-[160px] resize-none text-sm"
              disabled={isLoading || !draftId}
              rows={2}
            />
            <Button
              id="chat-send-btn"
              size="icon"
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !draftId}
              className="h-10 w-10 shrink-0"
            >
              {isLoading ? <Spinner className="size-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              AI อ่านเนื้อหาเอกสารปัจจุบันก่อนตอบ
            </p>
            {onApplyEdit && draftId && sessionId && messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2.5 gap-1.5 shadow-sm border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                onClick={() => onApplyEdit(sessionId)}
                disabled={isLoading || isGenerating}
                title="สั่งให้ AI นำเนื้อหาจากการคุยในแชท ไปปรับแก้ในเอกสารหลักอัตโนมัติ"
              >
                {isGenerating ? <Spinner className="size-3" /> : <Wand2 className="h-3 w-3" />}
                นำไปแก้ไขเอกสาร
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

interface ChatBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-start gap-2', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
        )}
      >
        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-primary" />}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
          isUser
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-muted text-foreground'
        )}
      >
        <MessageContent content={message.content} />
        {isStreaming && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current opacity-70" />
        )}
      </div>
    </div>
  )
}

/** แสดง markdown-like formatting ง่ายๆ (bold, newlines) */
function MessageContent({ content }: { content: string }) {
  // แปลง **bold** และ newlines
  const parts = content.split(/(\*\*[^*]+\*\*|\n)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part === '\n') {
          return <br key={i} />
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
