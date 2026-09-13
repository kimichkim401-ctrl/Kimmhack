import OwnerConsole from "@/components/owner/OwnerConsole";
import { getOwnerSession } from "@/lib/services/auth";

export default async function OwnerPage() {
  const owner = await getOwnerSession();
  return <OwnerConsole authenticated={Boolean(owner)} initialView="overview" />;
}
