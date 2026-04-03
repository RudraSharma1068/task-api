# Bug Report

## Bug 1 — `getPaginated` uses 0-based page indexing (FIXED)

**File:** `src/services/taskService.js`

**Expected:** `?page=1&limit=2` returns the first 2 tasks.

**Actual:** With `offset = page * limit`, page 1 skips the first 2 items. Page 0 is the only way to see the first items — which the route never produces.

**How I found it:** Wrote a pagination test seeding 5 tasks, called page 1 with limit 2 and expected Task 1 back. Got Task 3 instead.

**Fix:**
```js
// Before
const offset = page * limit;

// After
const offset = (page - 1) * limit;
```

---

## Bug 2 — `getByStatus` uses substring matching instead of equality

**File:** `src/services/taskService.js`

**Expected:** Only tasks with exact status match are returned.

**Actual:** `t.status.includes(status)` does a substring check. Searching `'in'` would match `'in_progress'`.

**How I found it:** Read the code and noticed `.includes()` on a status string — that's a substring method, not equality.

**Fix:**
```js
// Before
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// After
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug 3 — `completeTask` silently resets priority to `'medium'` (FIXED)

**File:** `src/services/taskService.js`

**Expected:** Completing a task only changes status to `'done'` and sets `completedAt`.

**Actual:** Hardcoded `priority: 'medium'` overwrites whatever priority the task had.

**How I found it:** Created a high-priority task, completed it, asserted priority stayed `'high'`. Test failed.

**Fix:**
```js
// Before
const updated = {
  ...task,
  priority: 'medium',
  status: 'done',
  completedAt: new Date().toISOString(),
};

// After
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Other issues worth noting

- `PUT /tasks/:id` allows overwriting `id` and `createdAt` since all fields are spread directly
- `GET /tasks?status=garbage` returns empty array silently instead of a 400
- Pagination response has no total count so clients can't know how many pages exist