import {
  createServer,
  getServerPort,
  context,
  reddit,
  type TaskRequest,
  type TaskResponse,
} from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import express from 'express';
import type { PostThreadJobData, UnstickyJobData, MatchEvent } from '../shared/types';
import { handlePostThread } from './jobs/postThread';
import { handleUnstickyThreads } from './jobs/unstickyThreads';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// Liveness check — useful for confirming the server bundle boots.
router.get('/internal/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Scheduler: post a single match thread.
router.post('/internal/scheduler/post-thread', async (req, res) => {
  const { data } = req.body as TaskRequest<PostThreadJobData>;
  try {
    if (!data) throw new Error('post-thread job missing data');
    await handlePostThread(context.subredditName, data);
    res.status(200).json({} satisfies TaskResponse);
  } catch (err) {
    console.error('Failed to post match thread', err);
    res.status(500).json({} satisfies TaskResponse);
  }
});

// Scheduler: unsticky match threads for an event.
router.post('/internal/scheduler/unsticky-threads', async (req, res) => {
  const { data } = req.body as TaskRequest<UnstickyJobData>;
  try {
    if (!data) throw new Error('unsticky-threads job missing data');
    await handleUnstickyThreads(context.subredditName, data);
    res.status(200).json({} satisfies TaskResponse);
  } catch (err) {
    console.error('Failed to unsticky match threads', err);
    res.status(500).json({} satisfies TaskResponse);
  }
});

// Moderator menu action: post a sample pre-match thread to validate the
// post-thread path end-to-end during playtest.
router.post('/internal/menu/test-match-thread', async (req, res) => {
  void (req.body as MenuItemRequest);
  // Dump context BEFORE any plugin call — empty fields explain auth failures.
  console.info(
    'CTX',
    JSON.stringify({
      subredditName: context.subredditName,
      subredditId: context.subredditId,
      userId: context.userId,
      appName: context.appName,
      appVersion: context.appVersion,
      postId: context.postId,
    })
  );
  try {
    // Read probe: confirms reads work (isolates write-permission issues).
    const sub = await reddit.getCurrentSubreddit();
    console.info(
      `Read probe ok: subreddit=${sub.name} id=${sub.id} subredditName(ctx)=${context.subredditName}`
    );

    const event: MatchEvent = {
      id: `test-${Date.now()}`,
      summary: 'San Jose Earthquakes vs Test FC',
      start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      description: '',
      location: 'PayPal Park',
    };
    const data: PostThreadJobData = { event, type: 'prematch' };
    await handlePostThread(context.subredditName, data);
    res.status(200).json({
      showToast: { text: 'Posted a test pre-match thread', appearance: 'success' },
    } satisfies UiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to post test match thread:', message, err);
    res.status(200).json({
      showToast: { text: `Failed: ${message || 'unknown error'}`, appearance: 'neutral' },
    } satisfies UiResponse);
  }
});

app.use(router);

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(getServerPort());
