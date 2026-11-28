import * as Dialog from '@radix-ui/react-dialog'
import { ArrowUpCircle, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import DemoDialog from './DemoDialog'
import Doodle from './Doodle'
import { plural } from './demo-data'
import type { DemoApp } from './demo-data'

export default function SyncDialog({ app, onSync }: {
  app: DemoApp
  onSync: (options: { dryRun: boolean; pull: boolean; prune: boolean }) => void
}) {
  const [open, setOpen] = useState(false)
  const [dryRun, setDryRun] = useState(false)
  const plan = app.plan

  if (!plan) return <button className="button" type="button" disabled><CircleCheck size={17} aria-hidden="true" />Sync</button>

  function submitSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const options = new FormData(event.currentTarget)
    setOpen(false)
    onSync({ dryRun: options.has('dry-run'), pull: options.has('pull'), prune: options.has('prune') })
  }

  return (
    <DemoDialog
      trigger={<button className="button" type="button" onClick={() => setDryRun(false)}><ArrowUpCircle size={17} aria-hidden="true" />Sync</button>}
      icon={ArrowUpCircle}
      title={<>Sync <span className="highlight">{app.name}</span></>}
      description="Review changes and select options for a simulated deployment."
      open={open}
      onOpenChange={setOpen}
    >
      <Doodle motif="sparkle" className="dialog-sparkle" />
      <div className="chips">
        <span className="chip">live <code>{app.revision}</code></span>
        <span aria-hidden="true">→</span>
        <span className="chip status-outofsync">target <code>{app.target}</code></span>
        <span className="muted">“{plan.message}”</span>
      </div>
      <section className="dialog-section">
        <h3>What changes</h3>
        <ul className="change-list">
          {plan.changes.map(({ service, detail, kind }) => (
            <li key={service}>
              <strong>{service}</strong>
              <code>{detail}</code>
              <span className={`chip ${kind === 'new' ? 'status-healthy' : ''}`}>{kind}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="code-box diff">
        <p className="muted">{plan.file}</p>
        <pre>{plan.diff.map((line) => (
          <span key={line} className={line.startsWith('+') ? 'status-healthy' : 'status-degraded'}>{line}{'\n'}</span>
        ))}</pre>
      </div>
      <section className="dialog-section">
        <h3>Order</h3>
        <ol className="sync-order">
          {plan.order.map((service, index) => <li key={service}><span aria-hidden="true">{index + 1}</span>{service}</li>)}
        </ol>
      </section>
      <form className="dialog-form" onSubmit={submitSync}>
        <label className="check-option"><input type="checkbox" name="pull" defaultChecked />Pull new images first</label>
        <label className="check-option"><input type="checkbox" name="prune" />Remove containers no longer in the file</label>
        <label className="check-option"><input type="checkbox" name="dry-run" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />Dry run only</label>
        <footer className="dialog-actions">
          <Dialog.Close className="button button-white">Cancel</Dialog.Close>
          <button className="button" type="submit"><ArrowUpCircle size={17} aria-hidden="true" />{dryRun ? 'Run preview' : `Sync ${plural(plan.changes.length, 'resource')}`}</button>
        </footer>
      </form>
    </DemoDialog>
  )
}
