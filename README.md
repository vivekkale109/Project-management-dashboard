# FlowPilot Project Management Dashboard

FlowPilot is a responsive full-stack project management dashboard built for portfolio use. It includes:

- JWT authentication with login and signup
- Role-aware actions for `admin`, `manager`, and `team-member`
- Project CRUD and member assignment
- Task CRUD with deadlines, priorities, comments, attachments, and drag-and-drop kanban updates
- Dashboard analytics with charts, recent activity, notifications, and a calendar-style deadline view
- Team performance cards, CSV export, dark/light mode, and motion polish

## Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Recharts
- Backend: Node.js, Express, JWT, bcryptjs
- Persistence: local JSON datastore in [`server/data/store.json`](./server/data/store.json)

## Demo accounts

- `admin@flowpilot.dev`
- `manager@flowpilot.dev`
- `member@flowpilot.dev`

Password for all demo accounts:

- `demo123`

## Run locally

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and the API runs on `http://localhost:3001`.

To build the client:

```bash
npm run build
npm start
```
