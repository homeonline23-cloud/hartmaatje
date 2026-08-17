import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { STORIES } from "@/lib/stories";
import { isAppLang } from "@/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_COMPANIONS = new Set(["fenna", "maarten", "peter", "colette"]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const storyId = form.get("story_id");
    const companion = form.get("companion");
    const lang = form.get("lang");
    const file = form.get("file");

    if (typeof storyId !== "string" || !STORIES.some((s) => s.id === storyId)) {
      return NextResponse.json({ detail: "Invalid story_id" }, { status: 400 });
    }
    if (
      typeof companion !== "string" ||
      !VALID_COMPANIONS.has(companion)
    ) {
      return NextResponse.json({ detail: "Invalid companion" }, { status: 400 });
    }
    if (typeof lang !== "string" || !isAppLang(lang)) {
      return NextResponse.json({ detail: "Invalid lang" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }
    if (
      !file.type.includes("audio") &&
      !file.name.toLowerCase().endsWith(".mp3")
    ) {
      return NextResponse.json(
        { detail: "File must be an audio/MP3 file" },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), "public", "stories", storyId, lang);
    await mkdir(dir, { recursive: true });

    const dest = path.join(dir, `${companion}.mp3`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, buffer);

    return NextResponse.json({
      ok: true,
      message: `Saved to /stories/${storyId}/${lang}/${companion}.mp3`,
      path: `/stories/${storyId}/${lang}/${companion}.mp3`,
    });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
