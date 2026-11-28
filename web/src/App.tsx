import { GitBranch, LayoutGrid, Search, SlidersHorizontal } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import Applications from './features/demo/Applications'
import Doodle from './features/demo/Doodle'
import Mascot from './features/demo/Mascot'
import NewAppDialog from './features/demo/NewAppDialog'
import ThemePicker from './features/demo/ThemePicker'
import { appLink, applyDemoSync, demoApps, demoSyncs } from './features/demo/demo-data'
import type { DemoApp, NewAppInput } from './features/demo/demo-data'
import { readTheme } from './features/demo/themes'
import type { Theme } from './features/demo/themes'

const AppDetail = lazy(() => import('./features/demo/AppDetail'))

const navigation = [
  { label: 'Applications', href: '#/', icon: LayoutGrid },
  { label: 'Repositories', href: '#/repositories', icon: GitBranch },
  { label: 'Settings', href: '#/settings', icon: SlidersHorizontal },
]

function subscribeToRoute(onRoute: () => void) {
  window.addEventListener('hashchange', onRoute)
  return () => window.removeEventListener('hashchange', onRoute)
}

function readRoute() {
  return window.location.hash || '#/'
}

export default function App() {
  const route = useSyncExternalStore(subscribeToRoute, readRoute)
  const [workspace, setWorkspace] = useState({ apps: demoApps, activity: demoSyncs })
  const [theme, setTheme] = useState(readTheme)
  const [search, setSearch] = useState('')
  const { apps, activity } = workspace
  const detail = apps.find(({ id }) => appLink(id) === route)
  const page = route.startsWith('#/apps/') ? '#/' : route

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [route])

  function changeTheme(next: Theme) {
    setTheme(next)
    try {
      localStorage.setItem('toyoko-theme', next)
    } catch {
      // Theme switching still works when storage is unavailable.
    }
  }

  function createApp(input: NewAppInput) {
    const app: DemoApp = {
      ...input, id: input.name, health: 'unknown', revision: '', target: '',
      lastSync: 'Never', method: 'manual', services: [],
    }
    setWorkspace((current) => ({ ...current, apps: [...current.apps, app] }))
    setSearch('')
    window.location.hash = appLink(app.id)
  }

  function syncApp(app: DemoApp) {
    if (!app.plan) return
    const synced = applyDemoSync(app)
    setWorkspace((current) => ({
      apps: current.apps.map((item) => item.id === app.id ? synced : item),
      activity: [{
        id: synced.id, name: synced.name, revision: synced.revision,
        method: synced.method, when: synced.lastSync, status: 'healthy',
      }, ...current.activity],
    }))
  }

  return (
    <div className="desk" data-theme={theme}>
      <a className="skip-link" href="#main" onClick={(event) => {
        event.preventDefault()
        const main = document.getElementById('main')
        if (main) {
          main.tabIndex = -1
          main.focus()
        }
      }}>Skip to content</a>
      <div className="desk-shell">
        <header className="topbar">
          <a className="brand" href="#/" aria-label="Toyoko home" onClick={() => setSearch('')}>
            <span className="badge-icon"><Doodle motif="cat" className="brand-cat" /></span>
            <span>Toyoko</span>
          </a>
          <form className="desk-search" role="search" onSubmit={(event) => {
            event.preventDefault()
            window.location.hash = '#/'
          }}>
            <label htmlFor="desk-search" className="sr-only">Search apps and containers</label>
            <input id="desk-search" type="search" placeholder="Search apps, containers…" value={search} onChange={(event) => setSearch(event.target.value)} />
            <button type="submit" aria-label="Search"><Search size={19} aria-hidden="true" /></button>
          </form>
          <div className="topbar-controls">
            <ThemePicker theme={theme} onChange={changeTheme} />
            <NewAppDialog names={apps.map(({ id }) => id)} onCreate={createApp} />
          </div>
        </header>

        <div className={`workspace ${detail ? 'detail-workspace' : ''}`}>
          <nav className="sticker sidebar" aria-label="Main navigation">
            {navigation.map(({ label, href, icon: Icon }) => (
              <a href={href} key={href} aria-current={page === href ? 'page' : undefined} onClick={() => setSearch('')}>
                <Icon size={18} aria-hidden="true" />{label}
              </a>
            ))}
            <Doodle motif="mug" className="sidebar-mug" />
            <Doodle motif="plant" className="sidebar-plant" />
            <Doodle motif="sparkle" className="sidebar-sparkle" />
          </nav>

          {detail ? (
            <Suspense fallback={<main className="main-panel" id="main"><p role="status">Loading application…</p></main>}>
              <AppDetail key={detail.id} app={detail} activity={activity} onSync={syncApp} />
            </Suspense>
          ) : page === '#/repositories' ? (
            <main className="main-panel" id="main">
              <div className="section-heading">
                <span className="badge-icon"><GitBranch size={22} aria-hidden="true" /></span>
                <h1><span className="highlight pop-word">Repositories</span></h1>
              </div>
              <section className="sticker widget repositories" aria-labelledby="sources-heading">
                <h2 id="sources-heading"><span className="highlight">Git sources</span></h2>
                <ul className="activity-list">
                  {apps.map((app) => (
                    <li key={app.id}>
                      <a href={appLink(app.id)}>{app.name}</a><code className="muted">{app.path}</code>
                      <span className="chip activity-when">{app.branch}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </main>
          ) : page === '#/settings' ? (
            <main className="main-panel" id="main">
              <div className="section-heading">
                <span className="badge-icon"><SlidersHorizontal size={22} aria-hidden="true" /></span>
                <h1><span className="highlight pop-word">Settings</span></h1>
              </div>
              <section className="sticker widget settings" aria-labelledby="appearance-heading">
                <h2 id="appearance-heading"><span className="highlight">Appearance</span></h2>
                <ThemePicker theme={theme} onChange={changeTheme} showLabels />
              </section>
            </main>
          ) : route !== '#/' ? (
            <main className="main-panel" id="main">
              <div className="sticker empty-state">
                <h1>Application unavailable</h1>
                <a className="button" href="#/">Back to applications</a>
              </div>
            </main>
          ) : <Applications apps={apps} activity={activity} query={search.trim()} onClearSearch={() => setSearch('')} />}
        </div>
      </div>
      <Mascot />
    </div>
  )
}
