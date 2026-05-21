//app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { transcribeWithSarvam } from "@/lib/stt/sarvam";
import { recordUsage } from "@/lib/usage";
import { serverEnv } from "@/lib/env";
import type { Visit } from "@/types/db";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { visitId?: string };
    const visitId = body?.visitId;
    if (!visitId) {
      return NextResponse.json({ error: "Missing visitId" }, { status: 400 });
    }

    // Load visit (RLS-scoped to this doctor)
    const { data: visit, error: vErr } = await sb
      .from("visits")
      .select("id, doctor_id, audio_url, clinic_id")
      .eq("id", visitId)
      .single();
    if (vErr || !visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    const v = visit as Pick<Visit, "id" | "doctor_id" | "audio_url" | "clinic_id">;
    if (v.doctor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!visit.audio_url) {
      return NextResponse.json({ error: "No audio attached to this visit" }, { status: 400 });
    }

    // Download audio bytes via service role (bypass RLS once authenticated check passed).
    const admin = supabaseAdmin();
    const { data: file, error: dlErr } = await admin.storage
      .from(serverEnv.supabaseAudioBucket)
      .download(visit.audio_url as string);
    if (dlErr || !file) {
      return NextResponse.json(
        { error: `Could not load audio: ${dlErr?.message || "missing"}` },
        { status: 500 },
      );
    }

    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const filename = (visit.audio_url as string).split("/").pop() || "audio.webm";
    const contentType = file.type || "audio/webm";

    const result = await transcribeWithSarvam(buf, filename, contentType);

    // Persist transcript fields
    const update: Record<string, unknown> = {
      transcript_text: result.transcript,
      transcript_language: result.language_code,
      transcript_speakers: result.turns,
    };
    const { error: upErr } = await admin
      .from("visits")
      .update(update as never)
      .eq("id", visitId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // Cost log: derive audio duration from the last diarized turn's end time
    // (Sarvam returns this per-turn). Fallback to 0 if no turns came back.
    try {
      const lastEnd =
        result.turns && result.turns.length > 0
          ? result.turns[result.turns.length - 1].end || 0
          : 0;
      if (v.clinic_id) {
        await recordUsage({
          clinicId: v.clinic_id,
          userId: user.id,
          visitId,
          service: "sarvam_stt",
          operation: "transcribe",
          audioDurationSeconds: Math.max(0, Math.round(lastEnd * 100) / 100),
          metadata: {
            model: "saaras:v3",
            language: result.language_code,
            turn_count: result.turns?.length ?? 0,
          },
        });
      }
    } catch (e) {
      console.error("[transcribe] usage log failed", e);
    }

    return NextResponse.json({
      ok: true,
      transcriptLength: result.transcript.length,
      turns: result.turns.length,
      language: result.language_code,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
