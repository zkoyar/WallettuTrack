import Link from "next/link";
import { RegistrationForm } from "@/components/auth/registration-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isRegistrationAvailable } from "@/lib/registration";
import { getServerI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const { t } = await getServerI18n();
  if (await isRegistrationAvailable()) return <RegistrationForm />;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("Registration closed")}</CardTitle>
        <CardDescription>
          {t(
            "This installation already has an administrator or is not accepting new registrations."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {t(
          "If you manage this server, review and change REGISTRATION_MODE, then restart the application."
        )}
      </CardContent>
      <CardFooter>
        <Link
          href="/login"
          className="text-sm font-medium underline underline-offset-4"
        >
          {t("Back to sign in")}
        </Link>
      </CardFooter>
    </Card>
  );
}
