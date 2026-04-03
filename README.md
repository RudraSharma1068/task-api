# Task API

A REST API for managing tasks, built with Node.js and Express.

## Setup

\```bash
npm install
npm start        # runs on http://localhost:3000
\```

## Tests

\```bash
npm test         # run tests
npm run coverage # run with coverage report
\```

## Coverage

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /tasks | List all tasks |
| GET | /tasks?status=todo | Filter by status |
| GET | /tasks?page=1&limit=10 | Paginated list |
| POST | /tasks | Create a task |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |
| PATCH | /tasks/:id/complete | Mark as complete |
| PATCH | /tasks/:id/assign | Assign task to a user |
| GET | /tasks/stats | Counts by status + overdue |

## Bugs Fixed

- **Pagination off-by-one** — `getPaginated` used `page * limit` making page 1 skip the first items
- **Substring status matching** — `getByStatus` used `.includes()` instead of `===`
- **Priority reset on complete** — `completeTask` was hardcoding `priority: 'medium'`

See `src/BUGS.md` for full details.
