import type { NextRequest } from "next/server";
import { authenticateAgent } from "@/lib/api/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const BUCKET = "screenshots";

// Agent uploads a PNG (multipart/form-data, field "file"). We push it to the
// private storage bucket and record a row; the web app reads it via signed URL.
export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return fail("UNAUTHORIZED", "โทเคนเอเจนต์ไม่ถูกต้อง");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("VALIDATION_ERROR", "ต้องส่งเป็น multipart/form-data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("VALIDATION_ERROR", "ไม่พบไฟล์ 'file'");

  const commandId = (form.get("commandId") as string) || null;
  const widthRaw = form.get("width");
  const heightRaw = form.get("height");
  const width = widthRaw ? Number(widthRaw) : null;
  const height = heightRaw ? Number(heightRaw) : null;

  const admin = createAdminClient();

  // Idempotent: ignore "already exists".
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => undefined);

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${agent.user_id}/${agent.id}/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "image/png",
    upsert: false,
  });
  if (upErr) return fail("INTERNAL", "อัปโหลดภาพไม่สำเร็จ", upErr.message);

  const { data: row, error } = await admin
    .from("screenshots")
    .insert({
      agent_id: agent.id,
      user_id: agent.user_id,
      command_id: commandId,
      storage_path: path,
      width,
      height,
    })
    .select("*")
    .maybeSingle();
  if (error) return fail("INTERNAL", "บันทึกข้อมูลภาพไม่สำเร็จ", error.message);

  return ok({ screenshot: row });
}
