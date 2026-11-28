import * as Tabs from '@radix-ui/react-tabs'
import { Box, GitBranch, History, Package, RefreshCw } from 'lucide-react'
import { Component, lazy, Suspense, useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import ActivityList from './ActivityList'
import ContainerDetails from './ContainerDetails'
import DemoDialog from './DemoDialog'
import StatusChip from './StatusChip'
import SyncDialog from './SyncDialog'
import { containerCounts, plural } from './demo-data'
import type { DemoApp, SyncEntry } from './demo-data'

const ResourceGraph = lazy(() => import('./ResourceGraph'))
const views = ['Tree', 'Network', 'List'] as const

class GraphBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed
      ? <p className="sticker empty-state" role="alert">The resource map could not load. Open the List tab to view your containers.</p>
      : this.props.children
  }
}

export default function AppDetail({ app, activity, onSync }: {
  app: DemoApp
  activity: SyncEntry[]
  onSync: (app: DemoApp) => void
}) {
  const [view, setView] = useState<string>('Tree')
  const [selected, setSelected] = useState<string | null>(() =>
    app.services.flatMap(({ containers }) => containers).find(({ health }) => health === 'degraded')?.name ?? null,
  )
  const [notice, setNotice] = useState('')
  const service = app.services.find(({ containers }) => containers.some(({ name }) => name === selected))
  const container = service?.containers.find(({ name }) => name === selected)
  const { total } = containerCounts(app)
  const network = `${app.name}_default`
  const drifted = app.revision !== app.target
  const changed = app.plan?.changes.filter(({ kind }) => kind === 'changed').length ?? 0

  const selectContainer = useCallback((name: string) => {
    setSelected(name)
    if (!window.matchMedia('(max-width: 1000px)').matches) return
    window.requestAnimationFrame(() => {
      document.getElementById('container-details')?.focus()
    })
  }, [])

  function sync(options: { dryRun: boolean; pull: boolean; prune: boolean }) {
    const request = [
      options.pull && 'pull images first',
      options.prune && 'remove obsolete containers',
    ].filter(Boolean).join(', ')
    setNotice(`${options.dryRun ? 'Dry run complete. No resources changed.' : 'Demo sync complete.'}${request ? ` Options: ${request}.` : ''}`)
    if (!options.dryRun) onSync(app)
  }

  function closeDetails() {
    setSelected(null)
    document.querySelector<HTMLElement>('#resource-views [aria-selected=true]')?.focus()
  }

  return (
    <>
      <main className="main-panel detail-main" id="main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href="#/">Applications</a><span aria-hidden="true">/</span><span aria-current="page">{app.name}</span>
        </nav>
        <div className="detail-title">
          <div className="section-heading">
            <span className="badge-icon"><Package size={22} aria-hidden="true" /></span>
            <h1><span className="highlight pop-word">{app.name}</span></h1>
            <StatusChip status={app.health} />
            {app.revision && <StatusChip status={drifted ? 'outofsync' : 'synced'} />}
            {changed > 0 && <span className="note">{plural(changed, 'service')} changed!</span>}
          </div>
          <div className="detail-actions">
            <button className="button button-white" type="button" onClick={() => setNotice('Demo status refreshed.')}>
              <RefreshCw size={16} aria-hidden="true" />Refresh
            </button>
            <DemoDialog
              trigger={<button className="button button-white" type="button">History</button>}
              icon={History} title={<span className="highlight">Sync history</span>}
              description={`Recorded syncs for ${app.name}.`} compact
            >
              <ActivityList entries={activity.filter(({ id }) => id === app.id)} showRevision />
            </DemoDialog>
            <SyncDialog app={app} onSync={sync} />
          </div>
        </div>
        <div className="chips">
          <span className="chip"><GitBranch size={14} aria-hidden="true" /><code>{app.path} · {app.branch}</code></span>
          {app.revision && <span className="chip">live <code>{app.revision}</code></span>}
          {drifted && <span className="chip status-outofsync">target <code>{app.target}</code>{app.plan && <> · {app.plan.message}</>}</span>}
          {app.revision && <span className="chip">synced {app.lastSync.toLowerCase()} · {app.method}</span>}
        </div>
        <div className={notice ? 'detail-notice' : 'sr-only'} role="status">{notice}</div>
        {app.services.length === 0 ? (
          <div className="sticker empty-state">
            <Package size={24} aria-hidden="true" />
            <p>This demo app has no sample resources yet.</p>
          </div>
        ) : (
          <Tabs.Root className="tab-stack" value={view} onValueChange={setView}>
            <div className="map-toolbar">
              <Tabs.List className="tab-list" aria-label="Resource views" id="resource-views">
                {views.map((name) => <Tabs.Trigger className="tab-button" value={name} key={name}>{name}</Tabs.Trigger>)}
              </Tabs.List>
              <span className="muted">{plural(app.services.length, 'service')} · {plural(total, 'container')}</span>
            </div>
            {(['Tree', 'Network'] as const).map((name) => (
              <Tabs.Content key={name} value={name}>
                {view === name && (
                  <GraphBoundary>
                    <Suspense fallback={<p className="sticker empty-state" role="status">Loading the resource map…</p>}>
                      <ResourceGraph app={app} network={name === 'Network'} selected={selected} onSelect={selectContainer} />
                    </Suspense>
                  </GraphBoundary>
                )}
              </Tabs.Content>
            ))}
            <Tabs.Content value="List">
              {view === 'List' && (
                <div className="sticker resource-list">
                  {app.services.map(({ name, image, containers }) => (
                    <section key={name}>
                      <header><h2>{name}</h2><code className="muted">{image}</code></header>
                      {containers.length > 0 && <ul>{containers.map((item) => (
                        <li key={item.name}>
                          <button type="button" aria-pressed={item.name === selected} onClick={() => selectContainer(item.name)}>
                            <Box size={16} className="resource-icon" aria-hidden="true" /><code>{item.name}</code><StatusChip status={item.health} />
                          </button>
                        </li>
                      ))}</ul>}
                    </section>
                  ))}
                </div>
              )}
            </Tabs.Content>
          </Tabs.Root>
        )}
      </main>
      {container && service && <ContainerDetails key={container.name} container={container} image={service.image} network={network} onClose={closeDetails} />}
    </>
  )
}
