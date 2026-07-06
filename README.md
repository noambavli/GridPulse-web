# GridPulse Web

Angular dashboard for **GridPulse**, a real-time energy / IoT consumption monitor. It handles
login, lists devices, charts consumption trends, shows and resolves alerts, updates live over
SignalR, and includes an **"Ask AI" chat** that answers questions about the grid — streaming
the assistant's answer token-by-token and showing which data queries it ran.

The backend API and the full Docker Compose stack live in a separate repository
([`GridPulse-server`](https://github.com/noambavli/GridPulse-server)).

---

## Stack

- Angular 22 (standalone components, signals, lazy-loaded routes)
- Chart.js for consumption trends
- `@microsoft/signalr` for live readings and alerts
- Streaming AI chat via `fetch` + Server-Sent Events (`AssistantService`)
- JWT auth (HTTP interceptor + route guard), SCSS styling

---

## Run locally

Requires Node.js ≥ 22.22.3 / ≥ 24.15.0 / ≥ 26.0.0 (Angular 22 CLI requirement) and the
GridPulse API running on `http://localhost:5103`.

```bash
npm install
npm start
```

Open http://localhost:4200 and sign in:

| Role   | Username | Password    |
| ------ | -------- | ----------- |
| Admin  | `admin`  | `admin123`  |
| Viewer | `viewer` | `viewer123` |

Admins can resolve alerts; viewers are read-only.

---

## Environments

`src/environments/` holds three configs, selected by build configuration:

| File                          | Used by                | API / hub base            |
| ----------------------------- | ---------------------- | ------------------------- |
| `environment.development.ts`  | `npm start`            | `http://localhost:5103`   |
| `environment.docker.ts`       | `ng build -c docker`   | relative (`/api`, `/hubs`) via nginx |
| `environment.ts`              | default production     | `http://localhost:5103`   |

---

## Build

```bash
npm run build                 # production build → dist/gridpulse/browser
npx ng build -c docker        # relative-URL build used by the Docker image
```

---

## Docker

The `Dockerfile` builds the app with the `docker` configuration and serves it via nginx,
proxying `/api` and `/hubs` (WebSocket) to the API container. It is built and orchestrated by
the Compose stack in `GridPulse-server` — see that repo's README to run the full system with
one `docker compose up`.

---

## Routes

- `/login` — public
- `/dashboard` — guarded; device list (default), `devices/:id` (detail + chart), `alerts`,
  `assistant` (Ask AI chat)

## AI chat

The `assistant` route streams answers from the API's `POST /api/assistant/ask` endpoint. It uses
`fetch` (not `HttpClient`) so it can POST, send the JWT, and read the Server-Sent Events stream
incrementally — `EventSource` supports none of those. The API needs an OpenAI key configured;
see the server repo's README.
