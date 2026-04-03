# Submission Notes

## What I'd test next with more time

- `PUT /tasks/:id` field whitelist — currently you can overwrite `id` or `createdAt`
- Unknown `?status` query param should return 400 vs silent empty array
- Pagination with `limit=0` or negative values
- Very large payloads / title length limits

## What surprised me

Two things stood out:

1. `completeTask` hardcoding `priority: 'medium'` — no reason to reset priority when completing a task. Looks like a copy-paste artifact.
2. `getPaginated` using `page * limit` for offset — the route defaults to page 1, so page 0 was never reachable, meaning the first page of results was permanently inaccessible through the API.

## Questions I'd ask before shipping to production

1. **Auth** — who can assign or complete tasks belonging to others?
2. **Persistence** — the in-memory store resets on restart. Is a database integration expected soon?
3. **`PUT` semantics** — is this a full replace or partial update? Right now missing fields are preserved from the existing task.
4. **Pagination response shape** — should it return `{ data: [], total: N }` or the bare array? Bare array makes it impossible for clients to paginate without guessing.