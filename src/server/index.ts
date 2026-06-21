import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import {
  createServer,
  getServerPort,
  context,
  type TaskRequest,
  type TaskResponse,
} from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import type { PostThreadJobData, UnstickyJobData, MatchEvent } from '../shared/types';
import { handlePostThread } from './jobs/postThread';
import { handleUnstickyThreads } from './jobs/unstickyThreads';

const app = new Hono();

// Liveness check — useful for confirming the server bundle boots.
app.get('/internal/health', (c) => c.json({ status: 'ok' }, 200));

// Scheduler: post a single match thread.
app.post('/internal/scheduler/post-thread', async (c) => {
  const { data } = await c.req.json<TaskRequest<PostThreadJobData>>();
  try {
    if (!data) throw new Error('post-thread job missing data');
    await handlePostThread(context.subredditName, data);
    return c.json<TaskResponse>({}, 200);
  } catch (err) {
    console.error('Failed to post match thread', err);
    return c.json<TaskResponse>({}, 500);
  }
});

// Scheduler: unsticky match threads for an event.
app.post('/internal/scheduler/unsticky-threads', async (c) => {
  const { data } = await c.req.json<TaskRequest<UnstickyJobData>>();
  try {
    if (!data) throw new Error('unsticky-threads job missing data');
    await handleUnstickyThreads(context.subredditName, data);
    return c.json<TaskResponse>({}, 200);
  } catch (err) {
    console.error('Failed to unsticky match threads', err);
    return c.json<TaskResponse>({}, 500);
  }
});

// Moderator menu action: post a sample pre-match thread to validate the
// post-thread path end-to-end during playtest.
app.post('/internal/menu/test-match-thread', async (c) => {
  void (await c.req.json<MenuItemRequest>());
  try {
    const event: MatchEvent = {
      id: `test-${Date.now()}`,
      summary: 'San Jose Earthquakes vs Test FC',
      start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      description: '',
      location: 'PayPal Park',
    };
    const data: PostThreadJobData = { event, type: 'prematch' };
    await handlePostThread(context.subredditName, data);
    return c.json<UiResponse>(
      { showToast: { text: 'Posted a test pre-match thread', appearance: 'success' } },
      200
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to post test match thread:', message, err);
    return c.json<UiResponse>(
      { showToast: { text: `Failed: ${message || 'unknown error'}`, appearance: 'neutral' } },
      200
    );
  }
});

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
