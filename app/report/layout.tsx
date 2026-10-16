import RequireAuth from "@/components/RequireAuth";

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}