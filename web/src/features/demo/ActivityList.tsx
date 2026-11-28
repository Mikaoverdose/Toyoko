import { Check, LoaderCircle } from 'lucide-react'
import { appLink } from './demo-data'
import type { SyncEntry } from './demo-data'

export default function ActivityList({ entries, showRevision = false }: {
  entries: SyncEntry[]
  showRevision?: boolean
}) {
  if (entries.length === 0) return <p className="muted">No recorded syncs yet.</p>

  return (
    <ul className="activity-list">
      {entries.map(({ id, name, revision, when, method, status }) => {
        const Icon = status === 'progressing' ? LoaderCircle : Check
        return (
          <li key={`${id}-${revision}`}>
            <Icon size={16} className={status === 'progressing' ? 'text-progressing' : 'text-healthy'} role="img" aria-label={status === 'progressing' ? 'In progress' : 'Succeeded'} />
            {showRevision ? <code>{revision}</code> : <a href={appLink(id)}>{name}</a>}
            <span className="muted">{method}</span>
            <span className="activity-when muted">{when}</span>
          </li>
        )
      })}
    </ul>
  )
}
