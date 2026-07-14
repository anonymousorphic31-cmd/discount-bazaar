---
name: Local Mongo/Redis + Next.js dev on Replit
description: Gotchas when running a local mongod/redis-server plus a separate Next.js frontend workflow on Replit (no cloud DB, two workflows).
---

- `configureWorkflow`'s `waitForPort` only accepts a fixed port allowlist (3000-3003, 4200, 5000-webview-only, 5173, 6000, 6800, 8000, 8008, 8080, 8099, 9000). A backend on an arbitrary port (e.g. 4000) will never satisfy the health check — pick a port from the list.
  **Why:** discovered when a "Backend" workflow configured with port 4000 silently never confirmed startup.
  **How to apply:** when scaffolding a new backend+frontend split, put the frontend on 5000 (webview) and the backend on one of the other allowed ports (e.g. 8000, console output type).

- `mongod --fork` and `redis-server --daemonize yes` both need **absolute** paths for `--dbpath`/`--logpath`/`--dir` in a workflow command. Relative paths (`.data/mongodb`) fail silently or with "can't open log file" because the forked/daemonized process's cwd resolution differs from the parent shell's.
  **How to apply:** always use `/home/runner/workspace/...`-style absolute paths in workflow commands that fork/daemonize a process.

- Chain mongod-start + redis-start + app-start in one workflow with `;` (not `&&`) so a "still running from last restart" error from the DB commands doesn't prevent the app server from starting.

- Next.js 16's `allowedDevOrigins` does **not** accept a `"*"` wildcard — it silently keeps blocking cross-origin HMR/data requests (shows as `ERR_INVALID_HTTP_RESPONSE` on the websocket and a console warning naming the exact blocked host). List the concrete hosts instead, e.g. `[process.env.REPLIT_DEV_DOMAIN, "127.0.0.1", "localhost"]`.
