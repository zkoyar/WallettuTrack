import { LanguageSwitcher } from "@/components/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}
