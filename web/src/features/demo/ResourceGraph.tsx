import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react'
import type { Edge, FitViewOptions, Node, NodeProps, NodeTypes } from '@xyflow/react'
import { Box, CircleAlert, CircleCheck, LayoutGrid, LoaderCircle, Network, Package } from 'lucide-react'
import { memo, useMemo } from 'react'
import Doodle from './Doodle'
import { plural } from './demo-data'
import type { Container, DemoApp } from './demo-data'

type GraphNode = Node<{
  kind: 'application' | 'network' | 'service' | 'container'
  title: string
  subtitle: string
  selected?: boolean
  status?: Container['health']
  onSelect?: (name: string) => void
}, 'sticker'>

const nodeIcons = { application: LayoutGrid, network: Network, service: Package, container: Box }
const fitOptions = { padding: '5%', maxZoom: 1.05 } satisfies FitViewOptions
const gap = 80
const nodeHeight = 56
const edgeOptions = { type: 'smoothstep' }
const nodeStates = {
  healthy: { icon: CircleCheck, className: 'text-healthy' },
  progressing: { icon: LoaderCircle, className: 'text-progressing' },
  degraded: { icon: CircleAlert, className: 'text-degraded' },
  unknown: null,
}

const StickerNode = memo(function StickerNode({ data }: NodeProps<GraphNode>) {
  const { kind, title, subtitle, selected, status, onSelect } = data
  const Icon = nodeIcons[kind]
  const state = status && nodeStates[status]
  const contents = (
    <>
      <span className={`small-icon ${status === 'degraded' ? 'status-degraded' : ''}`}><Icon size={16} aria-hidden="true" /></span>
      <span className="graph-node-label">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      {state && <state.icon className={`graph-node-status ${state.className}`} size={15} aria-hidden="true" />}
    </>
  )

  return (
    <>
      {(kind === 'service' || kind === 'container') && <Handle type="target" position={Position.Left} />}
      {kind === 'container' ? (
        <button className="graph-node nodrag nopan" type="button" aria-pressed={selected} onClick={() => onSelect?.(title)}>
          {contents}
        </button>
      ) : <div className={`graph-node graph-node-${kind}`}>{contents}</div>}
      {kind !== 'container' && <Handle type="source" position={Position.Right} />}
    </>
  )
})

const nodeTypes = { sticker: StickerNode } satisfies NodeTypes

function buildGraph(app: DemoApp, network: boolean, selected: string | null, onSelect: (name: string) => void) {
  const nodes: GraphNode[] = []
  const edges: Edge[] = []
  let row = 0

  function addNode(id: string, x: number, y: number, width: number, data: GraphNode['data']) {
    nodes.push({ id, type: 'sticker', position: { x, y }, width, height: nodeHeight, data })
  }

  function connect(source: string, target: string, degraded = false) {
    edges.push({ id: `${source}:${target}`, source, target, className: degraded ? 'edge-degraded' : undefined })
  }

  for (const service of app.services) {
    const serviceId = `service-${service.name}`
    const size = Math.max(1, service.containers.length)
    if (!network) {
      addNode(serviceId, 232, (row + (size - 1) / 2) * gap, 176, {
        kind: 'service', title: service.name, subtitle: service.image,
      })
      connect('root', serviceId)
    }
    for (const container of service.containers) {
      const subtitle = container.health === 'degraded' ? 'restarting · exit 1'
        : container.health === 'progressing' ? 'starting' : 'running · 2 d'
      addNode(container.name, network ? 265 : 472, row * gap, 208, {
        kind: 'container', title: container.name, subtitle, status: container.health,
        selected: container.name === selected, onSelect,
      })
      connect(network ? 'root' : serviceId, container.name, container.health === 'degraded')
      row += 1
    }
    if (!service.containers.length && !network) row += 1
  }

  nodes.unshift({
    id: 'root', type: 'sticker', position: { x: 0, y: Math.max(0, row - 1) * gap / 2 },
    width: network ? 192 : 168, height: nodeHeight,
    data: network
      ? { kind: 'network', title: `${app.name}_default`, subtitle: plural(row, 'container') }
      : { kind: 'application', title: app.name, subtitle: `app · ${plural(app.services.length, 'service')}` },
  })

  return { nodes, edges }
}

export default function ResourceGraph({ app, network, selected, onSelect }: {
  app: DemoApp
  network: boolean
  selected: string | null
  onSelect: (name: string) => void
}) {
  const { nodes, edges } = useMemo(() => buildGraph(app, network, selected, onSelect), [app, network, selected, onSelect])

  return (
    <section className="sticker graph-frame" aria-label={network ? 'Container network' : 'Resource map'}>
      <div className="graph-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={edgeOptions}
          fitView
          fitViewOptions={fitOptions}
          attributionPosition="top-right"
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          minZoom={0.3}
        >
          <Background gap={18} size={2} color="color-mix(in srgb, var(--color-deep) 40%, transparent)" />
          <Controls fitViewOptions={fitOptions} showInteractive={false} position="bottom-right" orientation="horizontal" />
        </ReactFlow>
        <Doodle motif="sparkle" className="graph-sparkle" />
        <Doodle motif="slime" className="graph-slime" />
      </div>
    </section>
  )
}
