import OwnerConsole from "@/components/owner/OwnerConsole";
import SessionDetail from "@/components/owner/SessionDetail";
import { getOwnerSession } from "@/lib/services/auth";

export default async function OwnerSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerSession();
  if (!owner) {
    return <OwnerConsole authenticated={false} initialView="sessions" />;
  }

  const { id } = await params;
  return <SessionDetail sessionId={id} />;
}
