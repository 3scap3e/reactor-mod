# Agent instructions for FastH3 Studio

Speak with the user in Egyptian Arabic and briefly correct their phrasing
before answering. Write project documentation in English.

This repository contains only the custom FastH3 Next.js application.
The former CLI and other templates were removed at the user's request.
Read skill/SKILL.md before editing. Keep it and README.md current.

Never commit, push, or open a PR without explicit maintainer permission
in the current conversation. Remote branches count as publishing.

Keep REACTOR_API_KEY server-side and tokens scoped to reactor/fast-h3.
Preserve no-store responses and module-scoped token memoization. Use typed
model commands and await replies; subscriptions are for broadcasts.
Disconnect after each run before saving. Preserve .env.local,
.local-backup, and generated-videos during cleanup.

Run pnpm build and pnpm exec tsc --noEmit from the root. Check generation,
reconnection, missing-key setup, and saved MP4 files when possible; report
when paid model checks have not been run.
