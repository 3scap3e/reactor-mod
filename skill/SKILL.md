---
name: fast-h3
description: Maintain the custom FastH3 single-video interface, session authentication, frame targets, capture lifecycle, and automatic MP4 saving.
---

# Maintaining FastH3 Studio

This app generates one video per session. It has no episode composer, AI writer,
scene presets, queue management UI, or manual recording modal. Keep the README
and this guide aligned with changes.

## Active files

- `modules/SingleClip.tsx` owns the form, previews, and saving feedback.
- `hooks/useSingleClip.ts` owns the generation and capture lifecycle.
- `types/clip.ts` owns the input types and constants.
- `app/FastH3App.tsx` mounts the provider and active components.
- `app/components/` contains the header, status, command errors, and live video.
- `app/api/reactor/token/route.ts` mints scoped session tokens.
- `app/api/clips/save/route.ts` saves MP4 files on the server filesystem.

## Generation contract

Generate is the only connect path. The flow is connect → setAutoplay →
setCanvas → optional uploadFile → enqueue. The canvas is fixed at 4:3,
1024×768, and must be set while nothing is queued or playing.

Image roles are visible radio choices selectable before uploading, disabled
while busy. Default to `first`. Upload the image once and pass its FileRef as
`starting_frame` for `first`, `ending_frame` for `last`, or both for `both`.
Without an image, omit both fields. Do not represent these as whole-scene
reference conditioning.

Await typed commands and handle refused replies. Model-specific operations
come from `@reactor-models/fast-h3`. Model-independent recording components,
`Clip`, and `RecordingError` may come from `@reactor-team/js-sdk`.
Subscriptions handle broadcasts and lifecycle events; command answers belong
on awaited calls. Follow only the enqueued clip ID for playback and capture.

On clip_finished or clip_stopped, requestClip captures the trailing playback.
Disconnect before assembling and saving the MP4. Failures, refused commands,
Cancel, and the safety timeout also disconnect. Never leave a billed session
open after work ends. Clear session snapshots when disconnected.

## Automatic saving

Use the typed `downloadClipAsFile(clip, null)` to produce a Blob without a
browser download trigger, then POST it as video/mp4 to `/api/clips/save`.
The Node route creates `generated-videos/` under process.cwd() and writes a
unique timestamp/UUID filename. Never accept client-controlled output paths.
The folder is gitignored. Confirm the saved path in the UI. If saving fails,
keep the preview and manual Download button and surface the error.

Failed or cancelled runs without a captured clip cannot produce a file.
Files live on the server machine; hosted deployments need persistent writable
storage. Local runs place them in this app folder when started here.

## Authentication

Keep REACTOR_API_KEY server-side. The token route returns `{ jwt, expires_at }`
with Cache-Control: private, no-store and authorization_details scoped to
`reactor/fast-h3`, matching the provider. The client fetches with cache: no-store
and memoizes in module scope until shortly before expiry, coalescing parallel
requests. A session is bound to the token that created it: reuse that token for
all session hops. Never replace this with HTTP-cache-based token reuse,
unscoped tokens, or a third-party identity provider.

The server page shows SetupRequired when the key is absent. No OpenAI key
or AI writer is part of this interface.

## Verification

Run pnpm build and pnpm exec tsc --noEmit inside this folder. For runtime
validation, generate and play an MP4 from generated-videos, repeat to confirm
unique files, test Cancel and disconnect/retry, unset the API key to check the
setup screen, and verify save errors retain manual download. Runtime model
checks consume credits. Never commit, push, or open a PR without explicit
maintainer permission in the current conversation.
