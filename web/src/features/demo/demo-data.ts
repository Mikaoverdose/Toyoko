export type Health = 'healthy' | 'progressing' | 'degraded' | 'unknown'
export type Status = Health | 'synced' | 'outofsync'

export type Container = {
  name: string
  health: Health
}

type Service = {
  name: string
  image: string
  containers: Container[]
}

type Change = {
  service: string
  detail: string
  kind: 'changed' | 'new'
}

type SyncPlan = {
  message: string
  changes: Change[]
  file: string
  diff: string[]
  order: string[]
}

export type DemoApp = {
  id: string
  name: string
  path: string
  branch: string
  health: Health
  revision: string
  target: string
  lastSync: string
  method: 'auto' | 'manual'
  services: Service[]
  plan?: SyncPlan
}

export type SyncEntry = Pick<DemoApp, 'id' | 'name' | 'revision' | 'method'> & {
  when: string
  status: 'progressing' | 'healthy'
}

export type NewAppInput = Pick<DemoApp, 'name' | 'path' | 'branch'>

const target = 'e12d9b7'

function service(app: string, name: string, image: string, ...health: Health[]): Service {
  return {
    name,
    image,
    containers: (health.length ? health : ['healthy'] as const).map((state, index) => ({
      name: `${app}-${name}-${index + 1}`,
      health: state,
    })),
  }
}

export const demoApps: DemoApp[] = [
  {
    id: 'shop', name: 'shop', path: 'apps/shop', branch: 'main', health: 'degraded',
    revision: 'a1c9e2f', target, lastSync: '2 h ago', method: 'manual',
    services: [
      service('shop', 'web', 'nginx:1.27'),
      service('shop', 'api', 'shop/api:1.8.2', 'healthy', 'healthy'),
      service('shop', 'worker', 'shop/worker:1.8.2', 'degraded'),
      service('shop', 'postgres', 'postgres:16'),
      service('shop', 'redis', 'redis:7.4'),
    ],
    plan: {
      message: 'add refunds queue',
      changes: [
        { service: 'worker', detail: 'image 1.8.2 → 1.9.0', kind: 'changed' },
        { service: 'api', detail: 'image 1.8.2 → 1.9.0 · env +1', kind: 'changed' },
        { service: 'migrate', detail: 'new one-shot job', kind: 'new' },
      ],
      file: 'compose.yaml · services.worker',
      diff: [
        '-  image: shop/worker:1.8.2',
        '+  image: shop/worker:1.9.0',
        '+  depends_on:',
        '+    migrate: { condition: service_completed_successfully }',
      ],
      order: ['migrate', 'api', 'worker'],
    },
  },
  {
    id: 'metrics', name: 'metrics', path: 'apps/metrics', branch: 'main', health: 'progressing',
    revision: target, target, lastSync: '40 s ago', method: 'auto',
    services: [
      service('metrics', 'prometheus', 'prom/prometheus:v3', 'healthy', 'progressing'),
      service('metrics', 'grafana', 'grafana/grafana:12'),
      service('metrics', 'exporter', 'prom/node-exporter:v1'),
    ],
  },
  {
    id: 'proxy', name: 'proxy', path: 'apps/proxy', branch: 'main', health: 'healthy',
    revision: '7d03b41', target, lastSync: '3 d ago', method: 'manual',
    services: [service('proxy', 'gateway', 'traefik:v3.4')],
    plan: {
      message: 'update gateway image',
      changes: [{ service: 'gateway', detail: 'image v3.4 → v3.5', kind: 'changed' }],
      file: 'compose.yaml · services.gateway',
      diff: ['-  image: traefik:v3.4', '+  image: traefik:v3.5'],
      order: ['gateway'],
    },
  },
  {
    id: 'blog', name: 'blog', path: 'apps/blog', branch: 'main', health: 'healthy',
    revision: target, target, lastSync: '1 d ago', method: 'auto',
    services: [service('blog', 'web', 'ghost:6'), service('blog', 'database', 'mysql:8')],
  },
  {
    id: 'home-media', name: 'home-media', path: 'apps/media', branch: 'main', health: 'healthy',
    revision: target, target, lastSync: '1 d ago', method: 'auto',
    services: [
      service('home-media', 'jellyfin', 'jellyfin/jellyfin:10'),
      service('home-media', 'requests', 'jellyseerr:2'),
      service('home-media', 'library', 'navidrome:0.58'),
      service('home-media', 'indexer', 'meilisearch:v1'),
    ],
  },
]

export const demoSyncs: SyncEntry[] = [
  { id: 'metrics', name: 'metrics', revision: target, method: 'auto', when: '40 s ago', status: 'progressing' },
  { id: 'shop', name: 'shop', revision: 'a1c9e2f', method: 'manual', when: '2 h ago', status: 'healthy' },
  { id: 'blog', name: 'blog', revision: target, method: 'auto', when: '1 d ago', status: 'healthy' },
]

export function appLink(id: string) {
  return `#/apps/${encodeURIComponent(id)}`
}

export function containerCounts(app: DemoApp) {
  const containers = app.services.flatMap((item) => item.containers)
  return { up: containers.filter((item) => item.health === 'healthy').length, total: containers.length }
}

export function plural(count: number, name: string) {
  return `${count} ${name}${count === 1 ? '' : 's'}`
}

export function applyDemoSync(app: DemoApp): DemoApp {
  const images: Record<string, string> = app.id === 'shop'
    ? { api: 'shop/api:1.9.0', worker: 'shop/worker:1.9.0' }
    : { gateway: 'traefik:v3.5' }

  return {
    ...app,
    revision: app.target,
    health: 'healthy',
    lastSync: 'Just now',
    method: 'manual',
    plan: undefined,
    services: [
      ...app.services.map((item) => ({
        ...item,
        image: images[item.name] ?? item.image,
        containers: item.containers.map((container) => ({ ...container, health: 'healthy' as const })),
      })),
      ...(app.id === 'shop' ? [{ name: 'migrate', image: 'shop/api:1.9.0', containers: [] }] : []),
    ],
  }
}
