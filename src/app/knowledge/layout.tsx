import { SurfaceShell } from "@/components/surface";

/**
 * The knowledge layer reads on paper.
 *
 * Long-form reading in dark mode is genuinely worse, so this route group
 * defaults to the light surface regardless of the app's default. A user
 * preference still overrides it.
 */
export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SurfaceShell surface="light">{children}</SurfaceShell>;
}
