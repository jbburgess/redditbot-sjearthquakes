# San Jose Earthquakes Match Thread Bot

An automated match-thread bot for the San Jose Earthquakes subreddit. It follows the
club's schedule and keeps the community's game-day discussion organized without any
manual effort from the mod team.

## What it does

- **Pre-match threads** — posts a stickied pre-match thread ahead of kickoff with the
  matchup, kickoff time, venue, broadcast info, team records, and recent form.
- **Match threads** — posts a stickied match thread at kickoff (sorted by *new*) and
  keeps it updated live with the score, key events, and confirmed lineups as the match
  progresses.
- **Post-match threads** — posts a stickied post-match thread once the match ends, with
  the final score, match events, and full player lineups.
- **Man of the Match threads** — posts a Man of the Match thread with a per-player
  performance summary table, then adds one nomination comment per player who featured so
  members can upvote their pick. The thread is kept tidy by removing stray top-level
  comments during its active voting window.
- **Thread housekeeping** — applies the correct link flair to each thread, stickies and
  later un-stickies threads at the right times, and locks each thread once its discussion
  window has passed.

All schedule and match data is sourced from ESPN. Moderators can also post any thread
on demand from the subreddit menu, and toggle each thread type on or off in the app's
settings.

## Configuration

The bot exposes subreddit-level settings so moderators can tailor its behavior:

- The ESPN team ID to follow (defaults to `191`, the San Jose Earthquakes).
- Per-thread-type toggles to enable or disable automatic creation.
- The exact link flair text to apply to each thread type.

## Fetch Domains

The following domains are required for this app:

- `sjearthquakes.com` - Used to fetch club news and announcements directly from the official San Jose Earthquakes website for posting to the subreddit; preferred to ESPN as the primary source for official club news/releases.
- `site.api.espn.com` - *[Already in the global allow list]* Used to fetch the team's schedule, fixtures, and live/post-match details (scores, events, lineups, and player performance stats) that populate every match thread.

## Future Enhancements

The following features are planned but not currently possible due to Devvit platform
limitations. They will be added as the platform gains support:

- **Native Man of the Match poll** — the Man of the Match thread currently collects votes
  via per-player nomination comments that members upvote. A native Reddit poll would be ideal,
  but Devvit's post API only supports link, text, and media posts (poll data is
  read-only), so native polls can't be created by an app today.
- **Game-day community status** — We'd like to automatically set the subreddit's community
  status bubble (e.g. "Match Day! Quakes vs. Portland 7:30 PM PT") around each match.
  Devvit currently exposes no API to read or set the community status, so this still has to
  be done manually.
