const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─────────────────────────────────────────────
// UNIT TESTS — taskService
// ─────────────────────────────────────────────

describe('taskService — create', () => {
  test('creates a task with required fields only', () => {
    const task = taskService.create({ title: 'Test' });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  test('creates a task with all fields', () => {
    const task = taskService.create({
      title: 'Full task',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-01-01T00:00:00.000Z',
    });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2030-01-01T00:00:00.000Z');
  });
});

describe('taskService — getAll', () => {
  test('returns empty array initially', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns all tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('returns a copy, not a reference', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.push({ id: 'fake' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('taskService — getByStatus', () => {
  test('returns only matching tasks', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'todo' });
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(2);
    result.forEach((t) => expect(t.status).toBe('todo'));
  });

  test('returns empty array if no match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('done')).toEqual([]);
  });

  // BUG CAUGHT: original used t.status.includes(status) — so searching
  // for "in" would match "in_progress" AND "done" (no) but more critically
  // searching "todo" would also match "in_progress" via partial string match
  // if status was something like "todo_extra". The fix uses strict equality.
  test('does not do partial/substring matching', () => {
    taskService.create({ title: 'A', status: 'in_progress' });
    // "in" is a substring of "in_progress" — original bug would return this
    const result = taskService.getByStatus('in');
    expect(result).toHaveLength(0);
  });
});

describe('taskService — getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // BUG CAUGHT: original used offset = page * limit (0-based pages).
  // So page=1, limit=2 would skip 2 items instead of starting at item 0.
  // Convention (and the route code) treats page as 1-based.
  test('page 1 returns the first items', () => {
    const result = taskService.getPaginated(1, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
    expect(result[1].title).toBe('Task 2');
  });

  test('page 2 returns the next items', () => {
    const result = taskService.getPaginated(2, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 3');
    expect(result[1].title).toBe('Task 4');
  });

  test('last page returns remaining items', () => {
    const result = taskService.getPaginated(3, 2);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task 5');
  });

  test('page beyond range returns empty array', () => {
    const result = taskService.getPaginated(10, 2);
    expect(result).toEqual([]);
  });
});

describe('taskService — getStats', () => {
  test('returns zero counts on empty store', () => {
    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('counts overdue tasks (past dueDate, not done)', () => {
    taskService.create({ title: 'Overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Done overdue', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Future', status: 'todo', dueDate: '2099-01-01T00:00:00.000Z' });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });
});

describe('taskService — update', () => {
  test('updates existing task fields', () => {
    const task = taskService.create({ title: 'Old' });
    const updated = taskService.update(task.id, { title: 'New', priority: 'high' });
    expect(updated.title).toBe('New');
    expect(updated.priority).toBe('high');
    expect(updated.id).toBe(task.id);
  });

  test('returns null for non-existent id', () => {
    expect(taskService.update('non-existent', { title: 'X' })).toBeNull();
  });
});

describe('taskService — remove', () => {
  test('removes an existing task and returns true', () => {
    const task = taskService.create({ title: 'A' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('returns false for non-existent id', () => {
    expect(taskService.remove('non-existent')).toBe(false);
  });
});

describe('taskService — completeTask', () => {
  test('marks task as done and sets completedAt', () => {
    const task = taskService.create({ title: 'A' });
    const updated = taskService.completeTask(task.id);
    expect(updated.status).toBe('done');
    expect(updated.completedAt).not.toBeNull();
  });

  // BUG CAUGHT: original completeTask silently reset priority to 'medium'
  // regardless of the task's original priority. No reason for this —
  // completing a task shouldn't change its priority.
  test('does not change the task priority', () => {
    const task = taskService.create({ title: 'A', priority: 'high' });
    const updated = taskService.completeTask(task.id);
    expect(updated.priority).toBe('high');
  });

  test('returns null for non-existent id', () => {
    expect(taskService.completeTask('non-existent')).toBeNull();
  });
});

describe('taskService — assignTask', () => {
  test('assigns a user to a task', () => {
    const task = taskService.create({ title: 'A' });
    const updated = taskService.assignTask(task.id, 'alice');
    expect(updated.assignee).toBe('alice');
  });

  test('overwrites an existing assignee', () => {
    const task = taskService.create({ title: 'A' });
    taskService.assignTask(task.id, 'alice');
    const updated = taskService.assignTask(task.id, 'bob');
    expect(updated.assignee).toBe('bob');
  });

  test('returns null for non-existent id', () => {
    expect(taskService.assignTask('non-existent', 'alice')).toBeNull();
  });
});

// ─────────────────────────────────────────────
// INTEGRATION TESTS — API routes
// ─────────────────────────────────────────────

describe('GET /tasks', () => {
  test('returns empty array when no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'A' });
    await request(app).post('/tasks').send({ title: 'B' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by status', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'in_progress' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  test('paginates results — page 1', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
  });

  test('paginates results — page 2', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3');
  });
});

describe('POST /tasks', () => {
  test('creates a task with title only', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Write tests' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('todo');
  });

  test('creates a task with all fields', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Full',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('high');
  });

  test('returns 400 if title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 if title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid status', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', status: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid priority', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid dueDate', async () => {
    const res = await request(app).post('/tasks').send({ title: 'X', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates a task', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Old' });
    const id = create.body.id;
    const res = await request(app).put(`/tasks/${id}`).send({ title: 'New', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.priority).toBe('high');
  });

  test('returns 404 for non-existent id', async () => {
    const res = await request(app).put('/tasks/non-existent').send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid update fields', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app)
      .put(`/tasks/${create.body.id}`)
      .send({ title: '', status: 'bad' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes a task and returns 204', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app).delete(`/tasks/${create.body.id}`);
    expect(res.status).toBe(204);
  });

  test('returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/tasks/non-existent');
    expect(res.status).toBe(404);
  });

  test('task is actually gone after deletion', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    await request(app).delete(`/tasks/${create.body.id}`);
    const all = await request(app).get('/tasks');
    expect(all.body).toHaveLength(0);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks task as done', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app).patch(`/tasks/${create.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('returns 404 for non-existent id', async () => {
    const res = await request(app).patch('/tasks/non-existent/complete');
    expect(res.status).toBe(404);
  });

  test('does not reset priority to medium', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A', priority: 'high' });
    const res = await request(app).patch(`/tasks/${create.body.id}/complete`);
    expect(res.body.priority).toBe('high');
  });
});

describe('GET /tasks/stats', () => {
  test('returns all zero counts on empty store', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('correctly counts tasks by status', async () => {
    await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'B', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
  });

  test('counts overdue non-done tasks', async () => {
    await request(app)
      .post('/tasks')
      .send({ title: 'Overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });

  test('does not count done tasks as overdue', async () => {
    await request(app)
      .post('/tasks')
      .send({ title: 'Done', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(0);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a task to a user', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({ assignee: 'alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('alice');
  });

  test('trims whitespace from assignee', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({ assignee: '  alice  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('alice');
  });

  test('reassigning replaces the existing assignee', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    await request(app).patch(`/tasks/${create.body.id}/assign`).send({ assignee: 'alice' });
    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({ assignee: 'bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('bob');
  });

  test('returns 400 if assignee is missing', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app).patch(`/tasks/${create.body.id}/assign`).send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 if assignee is empty string', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if assignee is whitespace only', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A' });
    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent/assign')
      .send({ assignee: 'alice' });
    expect(res.status).toBe(404);
  });

  test('returned task includes all original fields', async () => {
    const create = await request(app).post('/tasks').send({ title: 'A', priority: 'high' });
    const res = await request(app)
      .patch(`/tasks/${create.body.id}/assign`)
      .send({ assignee: 'alice' });
    expect(res.body.title).toBe('A');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBe(create.body.id);
  });
});