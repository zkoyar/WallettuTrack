"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Wallet, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.status === 429 || res?.error === "RateLimit") {
        toast.error(t("Too many attempts. Try again in 15 minutes."));
      } else if (res?.error) {
        toast.error(t("Invalid credentials"));
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error(t("Connection error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Wallet className="size-6" />
        </div>
        <CardTitle className="text-xl">{t("Welcome back")}</CardTitle>
        <CardDescription>{t("Sign in to manage your finances")}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <LoaderCircle className="animate-spin" />}
            {t("Sign in")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("Don't have an account?")}{" "}
            <Link href="/register" className="font-medium underline underline-offset-4">
              {t("Register")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
