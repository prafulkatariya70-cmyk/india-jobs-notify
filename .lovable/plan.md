# Daily import from verified official notices

## Goal
Turn the existing daily monitor into a cautious importer, starting with UPSC’s official RSS feed and linked recruitment advertisements. Other portals remain health-checked until their formats have reliable adapters.

## Work
- Add Worker-compatible PDF text extraction and a server-only UPSC importer.
- Read the official UPSC RSS feed, fetch only linked recruitment PDFs, and publish a listing only when its title, vacancy count, qualification, source links, and a future closing date can be verified from the advertisement. Skip corrections, incomplete notices, oversized documents, and expired deadlines rather than guessing.
- Make imports repeat-safe by matching the official advertisement link and listing title; record imported counts and source-specific failures in the existing sync history.
- Keep the current daily schedule and user-facing pages unchanged; update the roadmap to clearly identify which source is supported.
- Validate parsing against a live official notice and run the project build.

## Technical details
Use a Cloudflare Worker-compatible PDF text library; keep parsing/import logic in a server-only helper. Do not add schema changes or claim automated coverage for sources without adapters. The scheduled endpoint remains protected by its existing cron authentication.
