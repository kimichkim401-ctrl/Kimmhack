import OwnerConsole from "@/components/owner/OwnerConsole";
import { getOwnerSession } from "@/lib/services/auth";

export default async function OwnerSessionsPage() {
  const owner = await getOwnerSession();
  return <OwnerConsole authenticated={Boolean(owner)} initialView="sessions" />;
}
