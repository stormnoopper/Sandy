import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DOCUMENT_COMPLETE_MARKER = '[DOCUMENT_COMPLETE]'

export function stripDocumentMarker(text: string): string {
  return text.replace(DOCUMENT_COMPLETE_MARKER, '').trimEnd()
}

export function hasDocumentMarker(text: string): boolean {
  return text.includes(DOCUMENT_COMPLETE_MARKER)
}
