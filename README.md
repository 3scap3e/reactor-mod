# FastH3 Studio

A custom single-video interface built with Next.js, React, and TypeScript.
Enter a prompt, choose a duration and optional image targets, and generate a
video. Every completed capture is saved automatically as an MP4.

## Setup

You need Node.js 20 or newer, pnpm, and a Reactor API key with access to FastH3.
The app calls the hosted model; no local GPU is required.

From the repository root:

```bash
pnpm install
cp .env.example .env.local
```

Edit `.env.local` and set your key:

```dotenv
REACTOR_API_KEY=rk_your_key_here
```

Get a key from [Reactor API keys](https://www.reactor.inc/account/api-keys).
Keep `.env.local` private. The server exchanges this key for scoped session
tokens; the browser never receives the API key. No OpenAI key is needed.

## Run locally

Run these commands from the repository root:

```bash
pnpm dev
```

Open http://localhost:3000. If that port is already occupied, use the URL
printed in your terminal. Restart the server after changing `.env.local`.
If the key is missing, the app displays a setup screen.

For a production build on your local machine:

```bash
pnpm build
pnpm start
```

## Generate a video

1. Enter a prompt describing the subject, action, camera, style, and sound.
2. Optionally upload an image and choose **Use image as**:
   - **First frame only** (default): start on your image, with a free ending.
   - **Last frame only**: start from the prompt and end on your image.
   - **First and last frame**: use the same image for both endpoints.
3. Choose the duration and click **Generate clip**.
4. Wait for generation, playback, and saving. The interface confirms the saved path.

Output is fixed to 4:3 (1024×768). Images are fitted to that canvas. The model
may snap the requested duration to an available clip length. FastH3 uses
frame targets rather than a whole-scene reference image.

Generation opens a billed Reactor session. The app captures the finished
playback, disconnects, then assembles and saves the MP4. Cancel ends the run.
Failed or cancelled attempts without a capture cannot produce a video file.

## Where videos are saved

When running from this folder, files are saved in:

```text
generated-videos/fast-h3-<timestamp>-<unique-id>.mp4
```

The folder is created automatically and excluded from Git. Each capture gets
its own filename, so previous videos are retained. The folder lives on the
computer running the Next.js server, rather than in the browser Downloads
folder. The **Download** button also lets you save a browser copy.

If automatic saving fails, the interface displays an error and keeps the
preview and Download button. Download promptly: the preview link expires.
On hosted deployments, automatic saving requires a writable, persistent
server filesystem; ephemeral hosting does not provide a durable archive.

## Code layout

- `modules/SingleClip.tsx`: prompt, image role, duration, preview, and download UI.
- `hooks/useSingleClip.ts`: connect, upload, generate, capture, disconnect, and save.
- `types/clip.ts`: input types, canvas settings, and timing constants.
- `app/FastH3App.tsx`: model provider and memoized token resolver.
- `app/api/reactor/token/route.ts`: server-side scoped session tokens.
- `app/api/clips/save/route.ts`: writes completed MP4 files to disk.
- `app/components/`: header, connection status, command errors, and live video.
- `skill/SKILL.md`: maintenance instructions for this interface.

The episode composer, AI scene writer, episode presets, queue controls, and
manual recording modal have been removed. The Reactor SDK and token route
remain necessary to run FastH3; its UI package supplies the current design tokens.

## Checks

```bash
pnpm build
pnpm exec tsc --noEmit
```

For an end-to-end check, generate a clip, verify the saved MP4 plays from disk,
then generate another and verify both files remain. Check Cancel, disconnect
and retry, and a missing API key. Generation checks use your Reactor credits.
