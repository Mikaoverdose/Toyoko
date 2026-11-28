import * as Tabs from '@radix-ui/react-tabs'
import { LayoutGrid, SearchX } from 'lucide-react'
import { useState } from 'react'
import Doodle from './Doodle'
import ActivityList from './ActivityList'
import StatusChip from './StatusChip'
import { appLink, containerCounts, plural } from './demo-data'
import type { DemoApp, SyncEntry } from './demo-data'

const filters = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'healthy', label: 'Healthy', match: (app: DemoApp) => app.health === 'healthy' },
  { key: 'degraded', label: 'Needs love', match: (app: DemoApp) => app.health === 'degraded' },
  { key: 'outofsync', label: 'Out of sync', match: (app: DemoApp) => app.revision !== app.target },
]

function AppCards({ apps, clearSearch }: { apps: DemoApp[]; clearSearch?: () => void }) {
  if (!apps.length) {
    return (
      <div className="sticker empty-state">
        <SearchX size={24} aria-hidden="true" />
        <p>No applications match this view.</p>
        {clearSearch && <button className="button button-white" type="button" onClick={clearSearch}>Clear search</button>}
      </div>
    )
  }

  return (
    <div className="app-grid">
      {apps.map((app) => {
        const { up, total } = containerCounts(app)
        const drifted = app.revision !== app.target
        return (
          <article key={app.id} className="sticker lift app-card">
            <header className="card-heading">
              <h2><a className="card-link" href={appLink(app.id)}>{app.name}</a></h2>
              <span className="chip">{plural(app.services.length, 'service')}</span>
            </header>
            <div className="chips">
              <StatusChip status={app.health} />
              {app.revision && <StatusChip status={drifted ? 'outofsync' : 'synced'} />}
            </div>
            <dl className="facts">
              <div><dt>Source</dt><dd><code>{app.path} · {app.branch}</code></dd></div>
              <div><dt>Revision</dt><dd><code>{app.revision || '—'}{drifted && <> → <span className="text-outofsync">{app.target}</span></>}</code></dd></div>
              <div><dt>Containers</dt><dd><strong>{up} of {total} up</strong></dd></div>
              <div><dt>Last sync</dt><dd>{app.lastSync}</dd></div>
            </dl>
          </article>
        )
      })}
    </div>
  )
}

export default function Applications({ apps, activity, query, onClearSearch }: {
  apps: DemoApp[]
  activity: SyncEntry[]
  query: string
  onClearSearch: () => void
}) {
  const [filter, setFilter] = useState('all')
  const matches = apps.filter((app) => [
    app.name, app.path, ...app.services.flatMap((service) => service.containers.map(({ name }) => name)),
  ].some((value) => value.toLowerCase().includes(query.toLowerCase())))
  const attention = apps.filter(({ health }) => health === 'degraded').length
  const { up, total } = apps.map(containerCounts).reduce((counts, app) => ({
    up: counts.up + app.up,
    total: counts.total + app.total,
  }), { up: 0, total: 0 })

  return (
    <>
      <main className="main-panel" id="main">
        <div className="section-heading">
          <span className="badge-icon"><LayoutGrid size={22} aria-hidden="true" /></span>
          <h1><span className="highlight pop-word">Applications</span></h1>
          {attention > 0 && <span className="note">{attention} {attention === 1 ? 'needs' : 'need'} love ♡</span>}
        </div>
        <Tabs.Root value={filter} onValueChange={setFilter} className="tab-stack">
          <Tabs.List className="tab-list" aria-label="Filter apps">
            {filters.map(({ key, label, match }) => (
              <Tabs.Trigger className="tab-button" key={key} value={key}>{label} · {matches.filter(match).length}</Tabs.Trigger>
            ))}
          </Tabs.List>
          {filters.map(({ key, match }) => (
            <Tabs.Content key={key} value={key}>
              <AppCards apps={matches.filter(match)} clearSearch={query ? onClearSearch : undefined} />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </main>
      <aside className="widget-rail" aria-label="Dashboard widgets">
        <section className="sticker widget host-widget" aria-labelledby="host-heading">
          <Doodle motif="cat" className="host-cat" />
          <h2 id="host-heading"><span className="highlight">Docker host</span></h2>
          <div className="chips">
            <span className="connection"><span aria-hidden="true" />Connected</span>
            <span className="chip">local · demo</span>
          </div>
          <dl className="facts">
            <div><dt>Docker API</dt><dd><code>1.51</code></dd></div>
            <div><dt>Containers</dt><dd><strong>{up} of {total} up</strong></dd></div>
          </dl>
        </section>
        <section className="sticker widget" aria-labelledby="recent-heading">
          <h2 id="recent-heading"><span className="highlight">Recent syncs</span></h2>
          <ActivityList entries={activity.slice(0, 3)} />
        </section>
        <div className="rail-art" aria-hidden="true">
          <Doodle motif="controller" className="rail-controller" />
          <Doodle motif="disk" className="rail-disk" />
          <Doodle motif="sparkle" className="rail-sparkle" />
        </div>
      </aside>
    </>
  )
}
