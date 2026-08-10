import { AppShell } from "@/components/shell/app-shell";
import { routeSurface } from "@/lib/design/surface";

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell surface={routeSurface("/design")}>{children}</AppShell>;
}
