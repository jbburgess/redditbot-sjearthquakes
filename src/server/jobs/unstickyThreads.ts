/** Unsticky match threads for an event. Ported from `_unsticky_match_threads`. */

import type { UnstickyJobData } from '../../shared/types';
import { findStickiedMatchThreads } from '../reddit';
import { lockThreadPost } from './threadPosts';

/**
 * Unsticky every stickied match thread that matches the event summary, then lock
 * the post-match and Man-of-the-Match threads now that their active window has
 * ended.
 */
export async function handleUnstickyThreads(
  subredditName: string,
  data: UnstickyJobData
): Promise<void> {
  const { event } = data;
  const threads = await findStickiedMatchThreads(subredditName, event.summary);

  if (threads.length === 0) {
    console.warn(`No stickied match threads found for event "${event.summary}"`);
  }

  for (const thread of threads) {
    await thread.unsticky();
    console.info(`Unstickied match thread "${thread.title}"`);
  }

  // The post-match and MOTM threads' active window is over; lock them so
  // discussion moves on and the MOTM thread no longer needs comment moderation.
  await lockThreadPost(event.id, 'postmatch');
  await lockThreadPost(event.id, 'motm');
}
