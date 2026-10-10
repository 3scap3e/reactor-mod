import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  if (request.headers.get("content-type") !== "video/mp4") {
    return NextResponse.json({ error: "Expected an MP4 video" }, { status: 415 });
  }
  const bytes = Buffer.from(await request.arrayBuffer());
  if (!bytes.length) {
    return NextResponse.json({ error: "The video is empty" }, { status: 400 });
  }
  const filename = `fast-h3-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.mp4`;
  try {
    const directory = path.join(process.cwd(), "generated-videos");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
    return NextResponse.json({ path: `generated-videos/${filename}` });
  } catch {
    return NextResponse.json({ error: "Could not write the video to generated-videos" }, { status: 500 });
  }
}
