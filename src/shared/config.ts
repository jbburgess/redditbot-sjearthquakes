/** Configuration and formatting helpers for match-thread posting. */

import type { MatchEvent, ThreadType } from './types';

/** Subreddit-scoped setting keys (declared in devvit.json, editable by mods). */
export const SETTING_KEYS = {
  flairPreMatch: 'flairPreMatch',
  flairMatch: 'flairMatch',
  flairPostMatch: 'flairPostMatch',
  flairMotm: 'flairMotm',
} as const;

/** Fallback flair text used when a setting is blank. */
export const DEFAULT_FLAIR: Record<ThreadType, string> = {
  prematch: 'Pre Match',
  match: 'Match Thread',
  postmatch: 'Post Match',
  motm: 'Man of the Match',
};

/** Flair substring used to identify match-related threads when unstickying. */
export const MATCH_FLAIR_KEYWORD = 'match';

/** How the body of a thread is generated. */
type BodyKind = 'none' | 'motm';

interface ThreadConfig {
  /** Prefix prepended to the event summary to build the title. */
  titlePrefix: string;
  /** Setting key holding the flair text for this thread type. */
  flairKey: string;
  /** Whether the thread should be stickied after posting. */
  sticky: boolean;
  /** Whether the suggested comment sort should be set to "new". */
  sortNew: boolean;
  /** Whether to append the kickoff time to the title. */
  timeSuffix: boolean;
  /** How to build the selftext body. */
  body: BodyKind;
}

/** Per-thread-type behavior, such as title prefix, flair key, and body type. */
export const THREAD_CONFIG: Record<ThreadType, ThreadConfig> = {
  prematch: {
    titlePrefix: 'Pre-Match Thread: ',
    flairKey: SETTING_KEYS.flairPreMatch,
    sticky: true,
    sortNew: false,
    timeSuffix: true,
    body: 'none',
  },
  match: {
    titlePrefix: 'Match Thread: ',
    flairKey: SETTING_KEYS.flairMatch,
    sticky: true,
    sortNew: true,
    timeSuffix: true,
    body: 'none',
  },
  postmatch: {
    titlePrefix: 'Post-Match Thread: ',
    flairKey: SETTING_KEYS.flairPostMatch,
    sticky: true,
    sortNew: false,
    timeSuffix: false,
    body: 'none',
  },
  motm: {
    titlePrefix: 'Man of the Match: ',
    flairKey: SETTING_KEYS.flairMotm,
    sticky: false,
    sortNew: true,
    timeSuffix: false,
    body: 'motm',
  },
};

/** Selftext for Man of the Match threads. */
export const MOTM_BODY =
  "One top-level comment for each player. Duplicates will be removed. " +
  "If there's already a comment for the player you want to nominate, feel free " +
  'to upvote that and add any additional thoughts in a reply underneath the original comment; ' +
  'open discussion on nominees is welcome outside of top-level nominations.';

/**
 * Format a kickoff time as `strftime("%I:%M %p")` in the America/Los_Angeles zone, 
 * e.g. "07:30 PM" Pacific time.
*/
export function formatKickoffTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

/** Build the thread title for the given type and event. */
export function buildTitle(type: ThreadType, event: MatchEvent): string {
  const cfg = THREAD_CONFIG[type];
  let title = cfg.titlePrefix + event.summary;
  if (cfg.timeSuffix) {
    title += ` (${formatKickoffTime(event.start)})`;
  }
  return title;
}

/** Build the selftext body for the given type and event. */
export function buildBody(type: ThreadType): string {
  if (THREAD_CONFIG[type].body === 'motm') {
    return MOTM_BODY;
  }
  return '';
}
