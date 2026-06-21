/** Unsticky match threads for an event. Ported from `_unsticky_match_threads`. */

import type { UnstickyJobData } from '../../shared/types';
import { findStickiedMatchThreads } from '../reddit';

/** Unsticky every stickied match thread that matches the event summary. */
export async function handleUnstickyThreads(
  subredditName: string,
  data: UnstickyJobData
): Promise<void> {
  const { event } = data;
  const threads = await findStickiedMatchThreads(subredditName, event.summary);

  if (threads.length === 0) {
    console.warn(`No stickied match threads found for event "${event.summary}"`);
    return;
  }

  for (const thread of threads) {
    await thread.unsticky();
    console.info(`Unstickied match thread "${thread.title}"`);
  }
}
