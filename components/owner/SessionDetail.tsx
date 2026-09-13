import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DataRow, Eyebrow, Panel, StatusPill } from "@/components/ui";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "UNAVAILABLE";
  if (typeof value === "boolean") return value ? "AVAILABLE" : "UNAVAILABLE";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "UNAVAILABLE";
  return String(value);
}

function ipVersion(ip: string) {
  if (!ip || ip === "unavailable") return "UNAVAILABLE";
  return ip.includes(":") ? "IPv6" : "IPv4";
}

export default async function SessionDetail({ sessionId }: { sessionId: string }) {
  const session = await prisma.visitorSession.findUnique({
    where: { id: sessionId },
    include: {
      networkObservations: { orderBy: { createdAt: "desc" } },
      deviceCapabilities: { orderBy: { createdAt: "desc" }, take: 1 },
      telemetry: { orderBy: { createdAt: "desc" }, take: 1 },
      permissions: { orderBy: { createdAt: "desc" } },
      locationGrants: { orderBy: { grantedAt: "desc" } },
      media: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      mediaEvents: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!session) notFound();

  const device = asRecord(session.deviceCapabilities[0]?.payload ?? session.telemetry[0]?.payload);
  const screen = asRecord(device.screen);
  const viewport = asRecord(device.viewport);
  const connection = asRecord(device.connection);
  const capabilities = asRecord(device.capabilities);
  const network = session.networkObservations[0];
  const latestLocation = session.locationGrants.find((item) => !item.deletedAt);
  const permissionMap = new Map(session.permissions.map((item) => [item.capability, item.state]));
  const events = [
    ...session.auditLogs.map((item) => ({ at: item.createdAt, label: item.action, detail: item.actor })),
    ...session.mediaEvents.map((item) => ({ at: item.createdAt, label: item.event.toUpperCase(), detail: "MEDIA EVENT" }))
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <main className="kim-noise kim-scan min-h-screen bg-radialNoise px-4 py-6 text-frost sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto max-w-[1320px]">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end">
          <div>
            <Eyebrow>KIM Session</Eyebrow>
            <h1 className="mt-3 break-all text-3xl font-medium text-signal md:text-5xl">{session.id}</h1>
          </div>
          <Link className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition hover:text-frost" href="/owner/sessions">
            Back to Sessions
          </Link>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel className="p-5 sm:p-6">
            <Eyebrow>Network Observation</Eyebrow>
            <div className="mt-5">
              <DataRow label="Public IP" value={session.ipAddress} />
              <DataRow label="IP Version" value={ipVersion(session.ipAddress)} />
              <DataRow label="Country" value={network?.country ?? "UNAVAILABLE"} />
              <DataRow label="Region" value={network?.region ?? "UNAVAILABLE"} />
              <DataRow label="City" value={network?.city ?? "UNAVAILABLE"} />
              <DataRow label="ISP" value={network?.isp ?? "UNAVAILABLE"} />
              <DataRow label="ASN" value={network?.asn ?? "UNAVAILABLE"} />
              <DataRow label="Timezone" value={network?.timezone ?? text(device.timezone)} />
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <Eyebrow>Device Profile</Eyebrow>
            <div className="mt-5">
              <DataRow label="Browser" value={text(device.browser)} />
              <DataRow label="Version" value={text(device.browserVersion)} />
              <DataRow label="OS" value={text(device.operatingSystem)} />
              <DataRow label="Platform" value={text(device.platform)} />
              <DataRow label="Screen" value={screen.width ? `${text(screen.width)} x ${text(screen.height)}` : "UNAVAILABLE"} />
              <DataRow label="Viewport" value={viewport.width ? `${text(viewport.width)} x ${text(viewport.height)}` : "UNAVAILABLE"} />
              <DataRow label="DPR" value={text(device.devicePixelRatio)} />
              <DataRow label="CPU Cores" value={text(device.hardwareConcurrency)} />
              <DataRow label="Memory" value={device.deviceMemory ? `${text(device.deviceMemory)} GB` : "NOT SUPPORTED"} />
              <DataRow label="Touch" value={text(device.touchSupport)} />
              <DataRow label="Language" value={text(device.language)} />
              <DataRow label="Timezone" value={text(device.timezone)} />
              <DataRow label="Connection" value={connection.effectiveType ? `${text(connection.effectiveType)} / ${text(connection.downlink)} Mbps / ${text(connection.rtt)}ms` : "NOT SUPPORTED"} />
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <Eyebrow>Capabilities</Eyebrow>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {Object.entries(capabilities).map(([key, value]) => (
                <div className="flex items-center justify-between border border-white/10 bg-white/[0.025] px-3 py-3" key={key}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{key}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-frost">{text(value)}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <Eyebrow>Permissions / Location</Eyebrow>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["CAMERA", "MICROPHONE", "LOCATION"].map((key) => (
                <div className="border border-white/10 bg-white/[0.025] p-3" key={key}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{key}</div>
                  <div className="mt-2">
                    <StatusPill tone={permissionMap.get(key as "CAMERA" | "MICROPHONE" | "LOCATION") === "GRANTED" ? "good" : "warn"}>
                      {permissionMap.get(key as "CAMERA" | "MICROPHONE" | "LOCATION") ?? "NOT REQUESTED"}
                    </StatusPill>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <DataRow label="Location State" value={latestLocation ? "LOCATION GRANTED" : permissionMap.get("LOCATION") === "DENIED" ? "LOCATION DENIED" : "NO PRECISE LOCATION"} />
              <DataRow label="Latitude" value={latestLocation?.latitude.toFixed(6) ?? "UNAVAILABLE"} />
              <DataRow label="Longitude" value={latestLocation?.longitude.toFixed(6) ?? "UNAVAILABLE"} />
              <DataRow label="Accuracy" value={latestLocation ? `+/- ${Math.round(latestLocation.accuracy)} meters` : "UNAVAILABLE"} />
              <DataRow label="Timestamp" value={latestLocation?.grantedAt.toISOString() ?? "UNAVAILABLE"} />
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6 lg:col-span-2">
            <Eyebrow>Session Timeline</Eyebrow>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((item, index) => (
                <div className="border-l border-white/[0.12] pl-4" key={`${item.label}-${index}`}>
                  <div className="font-mono text-[10px] text-muted">{item.at.toISOString()}</div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-frost">{item.label}</div>
                  <div className="mt-1 text-xs text-muted">{item.detail}</div>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
