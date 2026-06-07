import { ProviderShell } from "@/app/app-provider/_components/ProviderShell";
import { requirePlatformAdmin } from "@/lib/provider/auth";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin } = await requirePlatformAdmin();

  return <ProviderShell admin={admin}>{children}</ProviderShell>;
}



