# Good Practices

Best practices for the Toyoko tech stack, collected from official docs and well-known community sources (see [Sources](#sources)). These are defaults. When existing code in this repo does something different on purpose, follow the code and flag the conflict instead of silently "fixing" it.

## Stack at a glance

| Area | Tech |
| --- | --- |
| Backend | Go 1.27, stdlib `net/http` (`ServeMux` with method patterns), Docker Engine SDK `github.com/moby/moby/client` |
| Frontend | React 19, TypeScript 7 (native compiler), Vite 8, pnpm |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens in `web/src/index.css`), Geist fonts, Radix UI primitives, lucide-react icons |
| State | TanStack Query v5 (server state), Zustand v5 (client/UI state) |
| Visuals | `@xyflow/react` (graph), `elkjs` (auto layout), `@xterm/xterm` (terminal), `uplot` (time-series charts) |
| Lint | oxlint (`web/.oxlintrc.json`) |

Dev setup: Vite proxies `/api` (including WebSockets) to the Go server on `:8080`.

---

## 1. Go backend (`server/`)

### HTTP server
- **Use an explicit `http.Server` with timeouts**, not bare `http.ListenAndServe`. At minimum set `ReadHeaderTimeout` (protects against slowloris), plus `ReadTimeout` and `IdleTimeout`. Leave `WriteTimeout` at 0 (or handle per-route) for long-lived routes such as log streaming, exec/terminal WebSockets and event streams, because a global write timeout will cut them off.
- **Shut down gracefully.** Use `signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)`, then call `srv.Shutdown(ctx)` with a 5–10s timeout. `http.ErrServerClosed` from `ListenAndServe` is expected and is not an error.
- **Use stdlib routing patterns** (`mux.HandleFunc("GET /api/containers/{id}", ...)`, `r.PathValue("id")`). Don't add a router library unless the stdlib can't do the job.
- **Keep all routes under `/api/`** so the Vite proxy and any production reverse proxy stay simple.
- **Use `r.Context()` for every downstream call** (Docker, I/O) so a client disconnect cancels the work.
- **Write JSON responses through one helper** that sets `Content-Type: application/json`, writes the status code, and handles the encode error. Return errors as a consistent JSON shape (e.g. `{"error": "..."}`) with the right status code.
- **Limit request bodies** with `http.MaxBytesReader` and decode with `json.NewDecoder(...).DisallowUnknownFields()` where strictness helps.

### Logging
- Use `log/slog` (structured, `slog.NewJSONHandler` or a text handler for dev) instead of `log`. Log with key/value attributes such as `slog.String("container", id)`, not formatted strings.
- Don't log secrets, env vars of containers, or full request bodies.

### Errors
- Wrap errors with context, context first: `fmt.Errorf("inspect container %s: %w", id, err)`.
- Use `%w` only when callers should be able to `errors.Is/As` the cause. Use `%v` at API boundaries to avoid leaking internals.
- Don't wrap without adding information (`fmt.Errorf("%w", err)` is noise).
- Don't send raw internal error text to HTTP clients in production paths. Log the detail and return a safe message.
- Handle every error, including `json.Encode` / `Close` where it matters. No `_ =` without a comment explaining why.

### Code organisation
- Keep `main.go` thin: config, wiring, start/stop. Put handlers and Docker logic in small packages (e.g. `internal/api`, `internal/docker`) once `main.go` grows past one screen.
- Pass dependencies (Docker client, logger) explicitly through a struct or constructor, not globals.
- `context.Context` is always the first parameter. Never store it in a struct.
- Accept interfaces, return concrete types. Define small interfaces where they are used (useful for faking the Docker client in tests).
- Run `gofmt`/`goimports`, `go vet`, and `staticcheck` (or `golangci-lint`). Keep `go.mod` tidy (`go mod tidy`).

### Concurrency
- Every goroutine needs a clear owner and a way to stop (context cancellation). No fire-and-forget goroutines on request paths.
- Run tests with `-race` when touching concurrent code (streams, WebSockets, event fan-out).

### Testing
- Use table-driven tests and `net/http/httptest` for handlers.
- Fake the Docker API behind a small interface rather than requiring a live daemon in unit tests. Gate integration tests that need Docker behind a build tag or env var.

---

## 2. Docker Engine SDK (`github.com/moby/moby/client`)

- **Use the new module paths only**: `github.com/moby/moby/client` and `github.com/moby/moby/api/...`. Do not mix them with old `github.com/docker/docker/...` imports or tutorial snippets, because the APIs differ.
- Create one client at startup with `client.New(client.FromEnv, client.WithAPIVersionNegotiation())`, share it, and `Close()` on shutdown. The client is safe for concurrent use.
- **Always `Close()` stream readers** (`ContainerLogs`, `ContainerAttach`, events, stats, exec attach) with `defer`, and tie them to the request context so they end when the browser disconnects.
- **Demultiplex non-TTY streams** with `stdcopy.StdCopy` (`github.com/moby/moby/api/pkg/stdcopy`). TTY containers/exec sessions return a raw stream, so check `Config.Tty` before choosing.
- For stats, prefer the streaming API over polling and forward deltas. Compute CPU % from the documented `cpu_stats`/`precpu_stats` deltas.
- Never build Docker API calls from unvalidated user input (image names, commands, mounts). Validate IDs and allowlist actions.

### Security (important for a Docker dashboard)
- Access to the Docker socket is **root-equivalent on the host**. Mounting it read-only does **not** make it safe.
- Bind the Go server to `127.0.0.1` by default, not `0.0.0.0`, unless auth is in place.
- Any destructive or exec endpoint (stop, remove, exec/terminal) must require authentication and should check `Origin` on WebSocket upgrades (CSRF/cross-site WebSocket hijacking).
- Never expose the Docker daemon over plain TCP (`2375`). If remote access is needed, use TLS (`2376`) or SSH, or a socket proxy that allowlists API endpoints.

---

## 3. React 19 + TypeScript 7 (`web/`)

### React
- **You might not need an Effect.** Derive values during render instead of syncing state with `useEffect`. Handle user actions in event handlers. Use Effects only to sync with external systems (WebSocket, xterm, uPlot, DOM APIs).
- Every Effect that subscribes or creates something must **clean it up**. Code must survive StrictMode's double mount/unmount in dev (it's enabled in `main.tsx`) without creating two sockets or two terminals.
- **Don't fetch in `useEffect`.** Use TanStack Query (see below).
- Keep components small and colocated by feature (e.g. `src/features/containers/...`). Export one component per file. oxlint enforces `only-export-components` so Fast Refresh keeps working.
- Follow the Rules of Hooks (enforced by oxlint as an error).
- Don't add `useMemo`/`useCallback` everywhere by reflex. Add them when a stable reference is actually needed (React Flow props, Effect deps, memoized children) or when a profiler shows a cost. If the React Compiler is enabled later, remove the manual memoization it makes redundant.
- Use stable, unique `key`s (container ID), never array indexes for dynamic lists.
- Add error boundaries around heavy, independent panels (graph, terminal, charts) so one crash doesn't blank the app.

### TypeScript
- The project is on **TypeScript 7** (the native Go-based compiler, ~8–12x faster builds). `tsc -b` is the type check. Note that `esModuleInterop`/`allowSyntheticDefaultImports` can no longer be `false`, and tools that rely on the old compiler API may not work yet.
- Keep `verbatimModuleSyntax` on: use `import type { X }` for type-only imports.
- `erasableSyntaxOnly` is on: **no `enum`, `namespace`, or parameter properties**. Use union types / `as const` objects instead.
- Avoid `any`. Use `unknown` and narrow at the boundary. Type API responses explicitly (ideally one `api/types.ts` mirroring the Go JSON structs).
- Avoid non-null `!` assertions except at true invariants (like `getElementById('root')!`).
- Prefer `satisfies` for typed config objects (e.g. `nodeTypes`) to keep literal types.

### Vite
- Call the backend through relative `/api/...` URLs only. The dev proxy (and a production reverse proxy) handles routing. Never hardcode `localhost:8080` in app code.
- Only `VITE_`-prefixed env vars are exposed to the client. Never put secrets in them.
- Lazy-load heavy panels with `React.lazy` + dynamic `import()` (xterm, elkjs, uPlot) to keep the first load small.

### Tooling
- Use **pnpm** only (there is a `pnpm-lock.yaml`). Don't commit an `package-lock.json`/`yarn.lock`.
- Run `pnpm lint` (oxlint) and `pnpm build` (`tsc -b && vite build`) before calling frontend work done.

---

## 4. TanStack Query v5 (server state)

- **All server data goes through Query.** Don't copy query data into Zustand or `useState`.
- **Use `queryOptions()` factories** to keep `queryKey` and `queryFn` together, and reuse them for `useQuery`, `prefetchQuery`, `setQueryData` and invalidation:
  ```ts
  export const containerQueries = {
    all: () => ['containers'] as const,
    list: () => queryOptions({ queryKey: [...containerQueries.all(), 'list'], queryFn: fetchContainers }),
    detail: (id: string) => queryOptions({ queryKey: [...containerQueries.all(), 'detail', id], queryFn: () => fetchContainer(id) }),
  }
  ```
- **Query keys are dependency arrays**: every variable that the `queryFn` uses must be in the key. Structure keys from generic to specific so you can invalidate a whole branch.
- Set a sensible default `staleTime` on the `QueryClient` (the default of 0 refetches a lot). Use `refetchInterval` for polled status, but prefer WebSocket/event pushes that call `queryClient.setQueryData`/`invalidateQueries`.
- Mutations (start/stop/remove) invalidate or update the related queries in `onSuccess`/`onSettled`. Use optimistic updates only where the UX really needs it.
- `queryFn` must **throw on non-2xx** responses (`fetch` doesn't), so Query sees errors.
- Pass the `signal` from the `queryFn` context to `fetch` so cancelled queries abort the request.

## 5. Zustand v5 (client/UI state)

- Use Zustand only for **client/UI state** (selected node, panel layout, open terminal tabs, preferences), never for server data.
- **Always select, never grab the whole store**: `useStore((s) => s.selectedId)`.
- Selectors must return stable references. Returning a new object/array from a selector causes **infinite render loops in v5**. Use atomic selectors, or wrap multi-field picks with `useShallow` from `zustand/react/shallow`.
- Export custom hooks (`useSelectedId()`, `useUiActions()`) instead of the raw store. Keep actions in a separate `actions` object so components can select them once.
- Keep stores small and split by concern rather than one global store.

---

## 6. Tailwind CSS v4

- Configuration is **CSS-first**: tokens live in `@theme` in `web/src/index.css`. There is no `tailwind.config.js`; don't add one.
- **Use the semantic tokens** (`bg-surface`, `border-border`, `text-muted`, `text-accent`, …) instead of raw palette classes (`bg-zinc-900`) or hex values in components.
- **Status colors (`healthy`, `progressing`, …) are for status only, never decoration** (rule from `index.css`).
- Tokens are also exposed as CSS variables (`var(--color-border)`), so use those in non-Tailwind places (React Flow, uPlot, xterm themes) to stay consistent.
- Add a new token to `@theme` before using a new color/size twice. Avoid arbitrary values (`w-[317px]`) except for one-offs.
- Keep class lists readable. Extract a component when the same long class list repeats, rather than using `@apply` widely.

## 7. Radix UI + accessibility

- Use Radix primitives (Dialog, DropdownMenu, Tabs, Tooltip) for interactive widgets instead of hand-rolled ones. They handle focus trapping, keyboard nav and ARIA.
- Always give `Dialog` a `Dialog.Title` (and `Description` or `aria-describedby={undefined}`). Use `asChild` to keep semantic elements.
- Icon-only buttons (lucide) need an `aria-label`. Tooltips aren't a replacement for labels.
- Make sure everything works with the keyboard and that focus states are visible on the dark theme.

---

## 8. React Flow (`@xyflow/react`) + elkjs

- **Define `nodeTypes`/`edgeTypes` at module level** (outside components). Defining them inline re-creates them on every render and resets React Flow.
- **Wrap custom nodes and edges in `memo`.** Keep props passed to `<ReactFlow>` stable (no inline objects/functions). Use `useCallback` for handlers like `onNodesChange`.
- Inside nodes, read only what you need. Avoid `useNodes()`/`useStore` selectors that change on every drag; select narrow slices.
- Type nodes and edges (`Node<MyData, 'container'>`) and build a union type for all node kinds.
- Use `onlyRenderVisibleElements` for big graphs.
- **Run elkjs layout off the main thread** (elk Web Worker via `workerUrl`/`workerFactory`, or at least `elk.bundled.js` behind a lazy import). Lay out after nodes are measured (`useNodesInitialized`), and only re-layout when the graph structure changes, not on every status update.
- Use ELK ports to map React Flow handles when nodes have multiple handles, to cut edge crossings.
- Import `@xyflow/react/dist/style.css` once (already in `index.css`).

## 9. xterm.js (`@xterm/xterm`)

- Use the scoped packages only (`@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-attach`, …). The old unscoped `xterm-addon-*` packages are deprecated.
- Create the `Terminal` inside a `useEffect` attached to a ref, and in cleanup **close the WebSocket and call `terminal.dispose()`** (this also disposes loaded addons). Must be StrictMode-safe.
- Use `FitAddon` with a `ResizeObserver` on the container (not just `window.resize`), debounce it, and send the new cols/rows to the backend so the container TTY is resized (Docker `ContainerExecResize`/`ContainerResize`).
- Use the binary WebSocket type (`binaryType = 'arraybuffer'`) for exec streams. Handle close/error by showing a state in the UI and offering reconnect.
- Theme xterm from the CSS tokens and the Geist Mono font.

## 10. uPlot (charts)

- Create the chart once in an Effect, call `chart.destroy()` in cleanup, and push new data with `chart.setData()` instead of re-creating the chart.
- Don't put every incoming sample into React state. Keep streamed stats in a bounded buffer (ring buffer / typed arrays) outside React and redraw at most once per animation frame.
- Resize with `chart.setSize()` from a `ResizeObserver`.
- uPlot data is columnar (`[xs, ys1, ys2…]`, x in **seconds**). Keep series arrays aligned in length.
- Use CSS token colors for series; status colors only for status meaning.

---

## 11. Git & workflow

- Small, focused commits with a prefix: `feat:`, `fix:`, `add:`, `del:`, `chore:`, `style:`, `docs:`, `refactor:`, `test:`.
- Never commit secrets, `.env` files, or build outputs (`server/toyoko`, `server/server`, `web/dist`).
- Before marking work done:
  - Backend: `cd server && gofmt -l . && go vet ./... && go build ./... && go test ./...`
  - Frontend: `cd web && pnpm lint && pnpm build`

---

## Sources

- Go HTTP server timeouts & graceful shutdown: [OneUptime – Production-ready HTTP server in Go](https://oneuptime.com/blog/post/2026-02-20-go-http-server-production/view), [Reintech – timeouts & graceful shutdown](https://reintech.io/blog/building-production-ready-http-servers-go-timeouts-graceful-shutdown), [DigitalOcean – HTTP server in Go](https://www.digitalocean.com/community/tutorials/how-to-make-an-http-server-in-go)
- Go errors: [Go Blog – Working with Errors in Go 1.13](https://go.dev/blog/go1.13-errors), [Go Wiki – Error Values FAQ](https://go.dev/wiki/ErrorValueFAQ), [rednafi – To wrap or not to wrap](https://rednafi.com/go/to-wrap-or-not-to-wrap/)
- Docker SDK: [Docker – Develop with Engine SDKs](https://docs.docker.com/reference/api/engine/sdk/), [Docker – SDK examples](https://docs.docker.com/reference/api/engine/sdk/examples/)
- Docker socket security: [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html), [Quarkslab – Why exposing the Docker socket is a bad idea](https://blog.quarkslab.com/why-is-exposing-the-docker-socket-a-really-bad-idea.html)
- React: [react.dev – You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), [react.dev – useEffect](https://react.dev/reference/react/useEffect)
- TypeScript 7: [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [InfoQ – TypeScript 7 released](https://infoq.com/news/2026/08/typescript-7-released/)
- TanStack Query: [Query Options guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-options), [ESLint prefer-query-options](https://tanstack.com/query/v5/docs/eslint/prefer-query-options), [TkDodo's blog index](https://tanstack.com/query/v5/docs/react/community/tkdodos-blog), [Telerik – Query key patterns](https://www.telerik.com/blogs/query-keys-patterns-scaling-tanstack-query)
- Zustand: [Zustand v5.0.0 release](https://github.com/pmndrs/zustand/releases/tag/v5.0.0), [TkDodo – Working with Zustand](https://tkdodo.eu/blog/working-with-zustand), [zustand#2329](https://github.com/pmndrs/zustand/issues/2329)
- Tailwind v4: [Tailwind v4 beta docs](https://v3.tailwindcss.com/docs/v4-beta), [Tailwind v4 token architecture](https://camoa.github.io/dev-guides/design-systems/tailwind-tokens/tailwind-v4-token-architecture), [Steve Kinney – Tailwind best practices](https://stevekinney.com/courses/tailwind/tailwind-best-practices)
- React Flow & ELK: [React Flow – Performance](https://reactflow.dev/learn/advanced-use/performance), [React Flow – ELKjs example](https://reactflow.dev/examples/layout/elkjs), [ELKjs multiple handles](https://reactflow.dev/examples/layout/elkjs-multiple-handles), [elkjs README](https://github.com/kieler/elkjs)
- xterm.js: [@xterm/xterm 6.0 README](https://unpkg.com/@xterm/xterm@6.0.0/README.md), [@xterm/addon-attach](https://npmjs.com/package/@xterm/addon-attach), [Cloudflare – Browser terminals](https://developers.cloudflare.com/sandbox/sdk/guides/browser-terminals/)
- uPlot: [uPlot](https://npmjs.com/package/uplot), [uplot-wrappers](https://github.com/skalinichev/uplot-wrappers), [freeCodeCamp – High-frequency real-time data in React](https://www.freecodecamp.org/news/high-frequency-real-time-data-in-react-from-ring-buffers-to-offscreencanvas/)
