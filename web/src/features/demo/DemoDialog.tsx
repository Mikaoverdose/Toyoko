import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'

export default function DemoDialog({ trigger, icon: Icon, title, description, children, compact = false, open, onOpenChange }: {
  trigger: ReactElement
  icon: LucideIcon
  title: ReactNode
  description: string
  children: ReactNode
  compact?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className={`sticker dialog-content ${compact ? 'dialog-compact' : ''}`}>
        <header className="dialog-heading">
          <span className="badge-icon"><Icon size={21} aria-hidden="true" /></span>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close aria-label="Close dialog" className="round-button"><X size={18} aria-hidden="true" /></Dialog.Close>
        </header>
        <Dialog.Description className="sr-only">{description}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Root>
  )
}
