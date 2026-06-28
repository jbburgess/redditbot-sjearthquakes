/** Reddit helpers shared by the match-thread jobs. */

import { reddit } from '@devvit/web/server';
import type { Post } from '@devvit/web/server';
import { MATCH_FLAIR_KEYWORD } from '../shared/config';

/**
 * Find the link flair template id matching `flairText` (case-insensitive).
 * Returns undefined if not found.
 */
export async function getFlairTemplateId(
  subredditName: string,
  flairText: string
): Promise<string | undefined> {
  const templates = await reddit.getPostFlairTemplates(subredditName);
  const wanted = flairText.toLowerCase();
  return templates.find((t) => t.text.toLowerCase() === wanted)?.id;
}

/**
 * Find recent stickied match threads whose title contains `summary` and whose
 * flair looks like a match thread.
 */
export async function findStickiedMatchThreads(
  subredditName: string,
  summary: string
): Promise<Post[]> {
  const posts = await reddit.getNewPosts({ subredditName, limit: 100 }).all();
  const needle = summary.toLowerCase();
  return posts.filter(
    (p) =>
      p.stickied &&
      p.title.toLowerCase().includes(needle) &&
      (p.flair?.text?.toLowerCase().includes(MATCH_FLAIR_KEYWORD) ?? false)
  );
}
