"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
};

const emailSchema = z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง");

function safeRedirect(path: FormDataEntryValue | null): string {
  if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/dashboard";
}

function siteOrigin(): string {
  const h = headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "กรุณากรอกรหัสผ่าน") })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  redirect(safeRedirect(formData.get("redirect")));
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = z
    .object({
      email: emailSchema,
      password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
      displayName: z.string().trim().max(40, "ชื่อยาวเกินไป").optional(),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: (formData.get("displayName") as string) || undefined,
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: parsed.data.displayName ? { display_name: parsed.data.displayName } : undefined,
      emailRedirectTo: `${siteOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // When email confirmation is enabled, no session is returned until the user
  // clicks the link — surface a "check your inbox" message instead of redirecting.
  if (!data.session) {
    return {
      message: "สมัครสำเร็จ! เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว กรุณายืนยันก่อนเข้าสู่ระบบ",
    };
  }

  redirect("/dashboard");
}
