import * as Tabs from '@radix-ui/react-tabs'
import { Box, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import StatusChip from './StatusChip'
import type { Container } from './demo-data'

const logTabs = ['Summary', 'Logs', 'Events', 'Stats', 'Inspect'] as const
const workerLogs = [
  '10:40:41 INFO  worker starting · queue=orders',
  '10:40:42 INFO  connected postgres:5432/shop',
  '10:40:42 ERROR migration 0042_add_refunds not applied',
  '10:40:42 FATAL schema is 1 migration behind, exiting',
  '── exited with code 1 · restart 2 in 10 s',
  '10:40:52 INFO  worker starting · queue=orders',
  '10:40:53 ERROR migration 0042_add_refunds not applied',
  '10:40:53 FATAL schema is 1 migration behind, exiting',
  '── exited with code 1 · restart 3 in 10 s',
  '10:41:03 INFO  worker starting · queue=orders',
  '10:41:03 FATAL schema is 1 migration behind, exiting',
  '── exited with code 1 · waiting 20 s',
]
const containerStates = { healthy: 'Running', progressing: 'Starting', degraded: 'Restarting', unknown: 'Unknown' }

export default function ContainerDetails({ container, image, network, onClose }: {
  container: Container
  image: string
  network: string
  onClose: () => void
}) {
  const failing = container.health === 'degraded'
  const state = containerStates[container.health]
  const [view, setView] = useState<string>(failing ? 'Logs' : 'Summary')
  const [query, setQuery] = useState('')
  const [follow, setFollow] = useState(false)
  const logsRef = useRef<HTMLDivElement>(null)
  const logs = failing ? workerLogs : [`10:40:41 INFO  ${container.name} ${state.toLowerCase()}`]
  const lines = logs.filter((line) => line.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (follow && logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [follow, view, query, container.health])

  return (
    <aside className="sticker widget container-details" aria-labelledby="container-details-title" id="container-details" tabIndex={-1}>
      <header className="details-heading">
        <span className={`small-icon ${failing ? 'status-degraded' : ''}`}><Box size={17} aria-hidden="true" /></span>
        <h2 id="container-details-title"><code>{container.name}</code></h2>
        <button className="round-button" type="button" aria-label="Close details" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="chips">
        <StatusChip status={container.health} />
        {failing && <span className="note">crash loop · 3 tries</span>}
      </div>
      <dl className="facts detail-facts">
        <div><dt>Image</dt><dd><code>{image}</code></dd></div>
        <div><dt>State</dt><dd><strong>{state}</strong></dd></div>
        <div><dt>Last exit</dt><dd>{failing ? 'code 1 · 10:41:03' : '—'}</dd></div>
        <div><dt>Network</dt><dd><code>{network}</code></dd></div>
      </dl>
      <Tabs.Root value={view} onValueChange={setView} className="tab-stack">
        <Tabs.List className="tab-list tab-list-small" aria-label="Container views">
          {logTabs.map((tab) => <Tabs.Trigger className="tab-button" key={tab} value={tab}>{tab}</Tabs.Trigger>)}
        </Tabs.List>
        <Tabs.Content value="Summary" className="detail-pane">
          <p>{failing ? 'The worker exits because a database migration is missing.' : `${container.name} is ${state.toLowerCase()} on ${network}.`}</p>
        </Tabs.Content>
        <Tabs.Content value="Logs" className="log-pane">
          <div className="log-toolbar">
            <label className="sr-only" htmlFor="log-filter">Filter logs</label>
            <input id="log-filter" type="search" value={query} placeholder="Filter logs" onChange={(event) => setQuery(event.target.value)} />
            <button className={`button ${follow ? '' : 'button-white'}`} type="button" aria-pressed={follow} onClick={() => setFollow(!follow)}>
              {follow && <span className="follow-dot" aria-hidden="true" />}Follow
            </button>
          </div>
          <div className="code-box logs" ref={logsRef} tabIndex={0} role="region" aria-label="Sample log output">
            {lines.length ? lines.map((line) => {
              if (line.startsWith('──')) return <div key={line} className="muted">{line}</div>
              const [time, level, ...message] = line.split(' ')
              return (
                <div key={line}>
                  <span className="muted">{time} </span>
                  <strong className={level === 'ERROR' || level === 'FATAL' ? 'text-degraded' : undefined}>{level}</strong>
                  {' '}{message.join(' ')}
                </div>
              )
            }) : <p>No matching log lines.</p>}
          </div>
        </Tabs.Content>
        <Tabs.Content value="Events" className="detail-pane">
          <ul className="activity-list">
            {failing && <li><span>Restart scheduled</span><time className="activity-when muted">10:41:03</time></li>}
            <li><span>Container started</span><time className="activity-when muted">10:40:41</time></li>
          </ul>
        </Tabs.Content>
        <Tabs.Content value="Stats" className="detail-pane">
          <dl className="facts detail-facts">
            <div><dt>CPU (sample)</dt><dd>{failing ? '—' : '1.2%'}</dd></div>
            <div><dt>Memory (sample)</dt><dd>{failing ? '—' : '42 MiB'}</dd></div>
          </dl>
        </Tabs.Content>
        <Tabs.Content value="Inspect">
          <pre className="code-box inspect">{JSON.stringify({ name: container.name, image, state, network }, null, 2)}</pre>
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}
