import * as Dialog from '@radix-ui/react-dialog'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import DemoDialog from './DemoDialog'
import type { NewAppInput } from './demo-data'

export default function NewAppDialog({ names, onCreate }: {
  names: string[]
  onCreate: (input: NewAppInput) => void
}) {
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  function createApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name')).trim().toLowerCase()
    const path = String(fields.get('path')).trim()
    const branch = String(fields.get('branch')).trim()

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || !path || !branch) {
      setError('Use letters, numbers, or hyphens for the name and fill in the path and branch.')
      return
    }
    if (names.includes(name)) {
      setError('An application with that name already exists.')
      return
    }

    setOpen(false)
    onCreate({ name, path, branch })
  }

  return (
    <DemoDialog
      trigger={<button className="button" type="button" onClick={() => setError('')}><Plus size={17} aria-hidden="true" />New app</button>}
      icon={Plus}
      title={<span className="highlight">New app</span>}
      description="Add an application to this demo workspace."
      open={open}
      onOpenChange={setOpen}
      compact
    >
      <form className="dialog-form" onSubmit={createApp}>
        <p className="muted">Add an application to this demo workspace.</p>
        <label>App name<input name="name" placeholder="my-app" required maxLength={48} /></label>
        <label>Compose path<input name="path" placeholder="apps/my-app" required maxLength={140} /></label>
        <label>Branch<input name="branch" defaultValue="main" required maxLength={80} /></label>
        {error && <p className="error-text" role="alert">{error}</p>}
        <footer className="dialog-actions">
          <Dialog.Close className="button button-white">Cancel</Dialog.Close>
          <button type="submit" className="button">Create app</button>
        </footer>
      </form>
    </DemoDialog>
  )
}
