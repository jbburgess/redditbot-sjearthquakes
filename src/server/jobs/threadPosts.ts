/**
 * Remember and recall the Reddit post id of each thread type for a match, so
 * later actions can find and act on a thread (lock the pre-match thread when the
 * match thread posts, lock the match thread when the post-match/MOTM threads
 * post, moderate the MOTM thread, etc.).
 */

import { redis, reddit, settings } from '@devvit/web/server';
import type { ThreadType } from '../../shared/types';
import { SETTING_KEYS } from '../../shared/config';

const HOUR = 60 * 60 * 1000;
/** Markers live comfortably past the final (unsticky/lock) action. */
const TTL_MS = 4 * 24 * HOUR;

/** Every thread type whose post id is tracked. */
export const TRACKED_THREAD_TYPES: ThreadType[] = ['prematch', 'match', 'postmatch', 'motm'];

/** Redis key holding the post id for an event's thread of a given type. */
export function threadPostKey(eventId: string, type: ThreadType): string {
  return `thread:postid:${eventId}:${type}`;
}

/** Record the post id of a freshly-posted thread of `type`. */
export async function rememberThreadPost(
  eventId: string,
  type: ThreadType,
  postId: string
): Promise<void> {
  await redis.set(threadPostKey(eventId, type), postId, {
    expiration: new Date(Date.now() + TTL_MS),
  });
}

/** Recall the post id of a previously-posted thread of `type`, if known. */
export async function recallThreadPost(
  eventId: string,
  type: ThreadType
): Promise<string | undefined> {
  return (await redis.get(threadPostKey(eventId, type))) ?? undefined;
}

/**
 * Lock a previously-posted thread of `type` for the event, if its id is known.
 * No-ops when the "lock inactive match threads" setting is disabled (it defaults
 * to enabled), so mods can turn off all thread locking with a single toggle.
 */
export async function lockThreadPost(eventId: string, type: ThreadType): Promise<void> {
  if ((await settings.get<boolean>(SETTING_KEYS.lockInactiveThreads)) === false) return;
  const postId = await recallThreadPost(eventId, type);
  if (!postId) return;
  try {
    const post = await reddit.getPostById(postId as `t3_${string}`);
    await post.lock();
    console.info(`Locked ${type} thread ${postId}`);
  } catch (err) {
    console.error(`Failed to lock ${type} thread ${postId}`, err);
  }
}
