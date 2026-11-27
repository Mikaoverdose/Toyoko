import { Background, ReactFlow } from '@xyflow/react'

export default function App() {
  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-border bg-surface p-4 text-muted">
        Toyoko
      </aside>
      <main className="flex-1">
        <ReactFlow nodes={[]} edges={[]} fitView>
          <Background gap={16} color="var(--color-border)" />
        </ReactFlow>
      </main>
    </div>
  )
}
