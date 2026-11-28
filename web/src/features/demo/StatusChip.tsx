import { ArrowUpCircle, Check, CircleAlert, CircleCheck, CircleHelp, LoaderCircle } from 'lucide-react'
import type { Status } from './demo-data'

const statuses = {
  healthy: { label: 'Healthy', icon: CircleCheck },
  progressing: { label: 'Progressing', icon: LoaderCircle },
  degraded: { label: 'Degraded', icon: CircleAlert },
  unknown: { label: 'Unknown', icon: CircleHelp },
  synced: { label: 'Synced', icon: Check },
  outofsync: { label: 'Out of sync', icon: ArrowUpCircle },
}

export default function StatusChip({ status }: { status: Status }) {
  const { label, icon: Icon } = statuses[status]

  return <span className={`chip status-${status}`}><Icon size={14} aria-hidden="true" />{label}</span>
}
