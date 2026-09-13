import OwnerConsole from "@/components/owner/OwnerConsole";
import { getOwnerSession } from "@/lib/services/auth";

export default async function OwnerDevicesPage() {
  const owner = await getOwnerSession();
  return <OwnerConsole authenticated={Boolean(owner)} initialView="devices" />;
}
