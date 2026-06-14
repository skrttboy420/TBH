import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; error?: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>เข้าสู่ระบบ</CardTitle>
        <CardDescription>เข้าสู่แดชบอร์ดควบคุมฟาร์มของคุณ</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm
          redirectTo={searchParams.redirect}
          initialError={searchParams.error ? "ยืนยันตัวตนไม่สำเร็จ ลองใหม่อีกครั้ง" : undefined}
        />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
