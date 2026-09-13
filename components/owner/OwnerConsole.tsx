"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionButton, DataRow, Eyebrow, Panel, StatusPill } from "@/components/ui";

type ConsoleView = "overview" | "sessions" | "network" | "devices" | "location" | "media" | "audit" | "settings";

type OwnerSummary = {
  overview: {
    totalSessions: number;
    activeSessions: number;
    permissionGrants: number;
    networkObservations: number;
    deviceProfiles: number;
    locationGrants: number;
    mediaCount: number;
    auditEvents: number;
  };
  recentVisits: Array<Record<string, unknown>>;
  recentAudit: Array<Record<string, unknown>>;
};

export default function OwnerConsole({ authenticated, initialView }: { authenticated: boolean; initialView: ConsoleView }) {
  const [isAuthed, setIsAuthed] = useState(authenticated);
  const [view, setView] = useState<ConsoleView>(initialView);
  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([]);
  const [locations, setLocations] = useState<Array<Record<string, unknown>>>([]);
  const [media, setMedia] = useState<Array<Record<string, unknown>>>([]);
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]);
  const [retention, setRetention] = useState({ sessionDays: 30, locationDays: 30, mediaDays: 7 });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthed) return;
    const [summaryResponse, sessionsResponse, locationResponse, mediaResponse, auditResponse, settingsResponse] = await Promise.all([
      fetch("/api/owner/summary"),
      fetch("/api/owner/sessions"),
      fetch("/api/owner/location"),
      fetch("/api/owner/media"),
      fetch("/api/owner/audit"),
      fetch("/api/owner/settings")
    ]);

    if (summaryResponse.status === 401) {
      setIsAuthed(false);
      return;
    }

    if (summaryResponse.ok) setSummary((await summaryResponse.json()) as OwnerSummary);
    if (sessionsResponse.ok) setSessions(((await sessionsResponse.json()) as { sessions: Array<Record<string, unknown>> }).sessions);
    if (locationResponse.ok) setLocations(((await locationResponse.json()) as { locations: Array<Record<string, unknown>> }).locations);
    if (mediaResponse.ok) setMedia(((await mediaResponse.json()) as { media: Array<Record<string, unknown>> }).media);
    if (auditResponse.ok) setAudit(((await auditResponse.json()) as { audit: Array<Record<string, unknown>> }).audit);
    if (settingsResponse.ok) setRetention(((await settingsResponse.json()) as { retention: typeof retention }).retention);
  }, [isAuthed]);

  useEffect(() => {
    void load();
  }, [load]);

  const nav = useMemo(
    () => [
      ["overview", "Overview"],
      ["sessions", "Sessions"],
      ["network", "Network"],
      ["devices", "Devices"],
      ["location", "Locations"],
      ["media", "Media Vault"],
      ["audit", "Audit"],
      ["settings", "Settings"]
    ] as const,
    []
  );

  if (!isAuthed) {
    return <OwnerLogin onAuthenticated={() => setIsAuthed(true)} />;
  }

  return (
    <main className="kim-noise kim-scan min-h-screen bg-radialNoise px-4 py-6 text-frost sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>KIM</Eyebrow>
            <h1 className="mt-3 text-5xl font-medium text-signal md:text-7xl">PRIVATE COMMAND CENTER</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-frost/65">
              Owner-only view of sessions, observations, explicit grants, submitted media, and audit events.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {nav.map(([key, label]) => (
              <button
                className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                  view === key ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-white/10 bg-white/[0.025] text-muted hover:text-frost"
                }`}
                key={key}
                onClick={() => setView(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {message ? <div className="mt-4 border border-cyan/30 bg-cyan/10 p-3 font-mono text-xs uppercase tracking-[0.18em] text-cyan">{message}</div> : null}

        <div className="mt-6">
          {view === "overview" ? <Overview summary={summary} /> : null}
          {view === "sessions" ? <Sessions sessions={sessions} onDelete={async (id) => deleteResource(`/api/owner/sessions?sessionId=${id}`, setMessage, load)} /> : null}
          {view === "network" ? <NetworkArchive sessions={sessions} /> : null}
          {view === "devices" ? <DeviceArchive sessions={sessions} /> : null}
          {view === "location" ? <LocationArchive locations={locations} onDelete={async (id) => deleteResource(`/api/owner/location?locationId=${id}`, setMessage, load)} /> : null}
          {view === "media" ? <MediaVault media={media} onDelete={async (id) => deleteResource(`/api/owner/media?mediaId=${id}`, setMessage, load)} /> : null}
          {view === "audit" ? <AuditTimeline audit={audit} /> : null}
          {view === "settings" ? <OwnerSettings retention={retention} setRetention={setRetention} setMessage={setMessage} reload={load} /> : null}
        </div>
      </div>
    </main>
  );
}

function OwnerLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="kim-noise kim-scan grid min-h-screen place-items-center bg-radialNoise p-4 text-frost">
      <Panel className="w-full max-w-lg p-6">
        <Eyebrow>KIM Owner Access</Eyebrow>
        <h1 className="mt-4 text-4xl text-signal">PRIVATE ARCHIVE</h1>
        <form
          className="mt-7 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            const response = await fetch("/api/owner/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password })
            });
            if (!response.ok) {
              setError("ACCESS DENIED");
              return;
            }
            onAuthenticated();
          }}
        >
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Owner Email</span>
            <input className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 text-frost outline-none focus:focus-ring" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Password</span>
            <input className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 text-frost outline-none focus:focus-ring" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error ? <div className="font-mono text-xs uppercase tracking-[0.18em] text-red-200">{error}</div> : null}
          <ActionButton type="submit">AUTHENTICATE</ActionButton>
        </form>
      </Panel>
    </main>
  );
}

function Overview({ summary }: { summary: OwnerSummary | null }) {
  const overview = summary?.overview;
  const metrics = [
    ["TOTAL SESSIONS", overview?.totalSessions ?? 0],
    ["ACTIVE SESSIONS", overview?.activeSessions ?? 0],
    ["PERMISSION GRANTS", overview?.permissionGrants ?? 0],
    ["NETWORK OBSERVATIONS", overview?.networkObservations ?? 0],
    ["DEVICE PROFILES", overview?.deviceProfiles ?? 0],
    ["LOCATION EVENTS", overview?.locationGrants ?? 0],
    ["MEDIA", overview?.mediaCount ?? 0],
    ["AUDIT EVENTS", overview?.auditEvents ?? 0]
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel className="p-5 sm:p-6">
        <Eyebrow>Overview</Eyebrow>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {metrics.map(([label, value]) => (
            <div className="border border-white/10 bg-white/[0.025] p-4" key={label}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
              <div className="mt-3 text-4xl text-signal">{value}</div>
            </div>
          ))}
        </div>
      </Panel>
      <AuditTimeline audit={summary?.recentAudit ?? []} compact />
    </div>
  );
}

function Sessions({ sessions, onDelete }: { sessions: Array<Record<string, unknown>>; onDelete: (id: string) => void }) {
  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Sessions</Eyebrow>
      <div className="mt-5 space-y-3">
        {sessions.map((session) => {
          const latestTelemetry = latestArrayRecord(session.telemetry);
          const device = asRecord(latestTelemetry.payload);
          const network = latestArrayRecord(session.networkObservations);
          const permissions = arrayRecords(session.permissions);
          return (
          <div className="border border-white/10 bg-white/[0.025] p-4" key={String(session.id)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link className="font-mono text-xs text-frost transition hover:text-cyan" href={`/owner/sessions/${String(session.id)}`}>{String(session.id)}</Link>
              <ActionButton variant="danger" onClick={() => onDelete(String(session.id))}>DELETE SESSION</ActionButton>
            </div>
            <div className="mt-4 grid gap-x-6 md:grid-cols-3">
              <DataRow label="Created" value={text(session.createdAt)} />
              <DataRow label="Last Seen" value={text(session.lastSeenAt)} />
              <DataRow label="Public IP" value={text(session.ipAddress)} />
              <DataRow label="Country" value={text(network.country)} />
              <DataRow label="Region" value={text(network.region)} />
              <DataRow label="City" value={text(network.city)} />
              <DataRow label="Timezone" value={text(network.timezone ?? device.timezone)} />
              <DataRow label="Browser" value={text(device.browser)} />
              <DataRow label="OS" value={text(device.operatingSystem)} />
              <DataRow label="Device" value={text(device.deviceType)} />
              <DataRow label="Permissions" value={permissions.length ? permissions.map((item) => `${item.capability}:${item.state}`).join(" / ") : "NOT REQUESTED"} />
            </div>
          </div>
        );
        })}
      </div>
    </Panel>
  );
}

function NetworkArchive({ sessions }: { sessions: Array<Record<string, unknown>> }) {
  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Network Observations</Eyebrow>
      <div className="mt-5 space-y-3">
        {sessions.map((session) => {
          const network = latestArrayRecord(session.networkObservations);
          return (
          <div className="grid gap-3 border border-white/10 bg-white/[0.025] p-4 md:grid-cols-3" key={String(session.id)}>
            <DataRow label="Session" value={<Link className="hover:text-cyan" href={`/owner/sessions/${String(session.id)}`}>{String(session.id)}</Link>} />
            <DataRow label="Public IP" value={text(session.ipAddress)} />
            <DataRow label="IP Version" value={ipVersion(text(session.ipAddress))} />
            <DataRow label="Country" value={text(network.country)} />
            <DataRow label="Region" value={text(network.region)} />
            <DataRow label="City" value={text(network.city)} />
            <DataRow label="Timezone" value={text(network.timezone)} />
            <DataRow label="ISP" value={text(network.isp)} />
            <DataRow label="ASN" value={text(network.asn)} />
            <DataRow label="Approximate" value="NETWORK LOCATION / APPROXIMATE" />
          </div>
        );
        })}
      </div>
    </Panel>
  );
}

function DeviceArchive({ sessions }: { sessions: Array<Record<string, unknown>> }) {
  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Device Profiles</Eyebrow>
      <div className="mt-5 space-y-3">
        {sessions.map((session) => {
          const latestTelemetry = latestArrayRecord(session.telemetry);
          const device = asRecord(latestTelemetry.payload);
          const screen = asRecord(device.screen);
          const viewport = asRecord(device.viewport);
          return (
            <div className="grid gap-3 border border-white/10 bg-white/[0.025] p-4 md:grid-cols-3" key={String(session.id)}>
              <DataRow label="Session" value={<Link className="hover:text-cyan" href={`/owner/sessions/${String(session.id)}`}>{String(session.id)}</Link>} />
              <DataRow label="Browser" value={text(device.browser)} />
              <DataRow label="Version" value={text(device.browserVersion)} />
              <DataRow label="OS" value={text(device.operatingSystem)} />
              <DataRow label="Device" value={text(device.deviceType)} />
              <DataRow label="Platform" value={text(device.platform)} />
              <DataRow label="Screen" value={screen.width ? `${text(screen.width)} x ${text(screen.height)}` : "UNAVAILABLE"} />
              <DataRow label="Viewport" value={viewport.width ? `${text(viewport.width)} x ${text(viewport.height)}` : "UNAVAILABLE"} />
              <DataRow label="Timezone" value={text(device.timezone)} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LocationArchive({ locations, onDelete }: { locations: Array<Record<string, unknown>>; onDelete: (id: string) => void }) {
  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Location Events</Eyebrow>
      <div className="mt-5 space-y-3">
        {locations.map((location) => (
          <div className="border border-white/10 bg-white/[0.025] p-4" key={String(location.id)}>
            <div className="flex flex-wrap justify-between gap-3">
              <StatusPill tone="good">USER PERMISSION</StatusPill>
              <ActionButton variant="danger" onClick={() => onDelete(String(location.id))}>DELETE LOCATION</ActionButton>
            </div>
            <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
              <DataRow label="Session" value={String(location.sessionId)} />
              <DataRow label="Latitude" value={String(location.latitude)} />
              <DataRow label="Longitude" value={String(location.longitude)} />
              <DataRow label="Accuracy" value={`${String(location.accuracy)} meters`} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MediaVault({ media, onDelete }: { media: Array<Record<string, unknown>>; onDelete: (id: string) => void }) {
  const [tab, setTab] = useState<"ALL" | "IMAGE" | "VIDEO" | "AUDIO">("ALL");
  const filtered = media.filter((item) => tab === "ALL" || item.mediaType === tab);

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>KIM Media Vault</Eyebrow>
        <div className="flex gap-2">
          {(["ALL", "IMAGE", "VIDEO", "AUDIO"] as const).map((item) => (
            <button className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] ${tab === item ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-white/10 bg-white/[0.025] text-muted"}`} key={item} onClick={() => setTab(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-frost/65">Private metadata only. Media bytes are stored outside public routes and are not exposed as public URLs.</p>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {filtered.map((item) => (
          <div className="grid gap-3 border border-white/10 bg-white/[0.025] p-4" key={String(item.id)}>
            <div className="aspect-video overflow-hidden border border-white/10 bg-black">
              {item.mediaType === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Private KIM vault media" className="h-full w-full object-cover" src={`/api/owner/media/${String(item.id)}/file`} />
              ) : item.mediaType === "VIDEO" ? (
                <video className="h-full w-full object-cover" controls src={`/api/owner/media/${String(item.id)}/file`} />
              ) : (
                <div className="grid h-full place-items-center p-4">
                  <audio controls src={`/api/owner/media/${String(item.id)}/file`} />
                </div>
              )}
            </div>
            <div className="grid gap-x-6 sm:grid-cols-2">
              <DataRow label="Media" value={String(item.id)} />
              <DataRow label="Session" value={String(item.sessionId)} />
              <DataRow label="Type" value={String(item.mediaType)} />
              <DataRow label="Size" value={`${String(item.byteSize)} bytes`} />
              <DataRow label="Duration" value={item.durationMs ? `${String(item.durationMs)}ms` : "UNAVAILABLE"} />
              <DataRow label="Consent" value={String(item.consentState)} />
              <DataRow label="Created" value={String(item.createdAt)} />
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton variant="secondary" onClick={() => window.open(`/api/owner/media/${String(item.id)}/file`, "_blank", "noopener,noreferrer")}>VIEW</ActionButton>
              <ActionButton variant="danger" onClick={() => onDelete(String(item.id))}>DELETE MEDIA</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AuditTimeline({ audit, compact = false }: { audit: Array<Record<string, unknown>>; compact?: boolean }) {
  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Audit Timeline</Eyebrow>
      <div className={`mt-5 space-y-3 overflow-auto pr-2 ${compact ? "max-h-[360px]" : "max-h-[70vh]"}`}>
        {audit.map((item) => (
          <div className="border-l border-white/[0.12] pl-4" key={String(item.id)}>
            <div className="font-mono text-[10px] text-muted">{String(item.createdAt)}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-frost">{String(item.action)}</div>
            <div className="mt-1 text-xs text-muted">{String(item.actor)} {item.sessionId ? `/ ${String(item.sessionId)}` : ""}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OwnerSettings({
  retention,
  setRetention,
  setMessage,
  reload
}: {
  retention: { sessionDays: number; locationDays: number; mediaDays: number };
  setRetention: (value: { sessionDays: number; locationDays: number; mediaDays: number }) => void;
  setMessage: (message: string | null) => void;
  reload: () => Promise<void>;
}) {
  const updateField = (key: keyof typeof retention, value: string) => {
    setRetention({ ...retention, [key]: Number(value) });
  };

  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Retention Settings</Eyebrow>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          ["sessionDays", "Session Data"],
          ["locationDays", "Location Data"],
          ["mediaDays", "Media"]
        ].map(([key, label]) => (
          <label className="block" key={key}>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
            <input className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 text-frost outline-none focus:focus-ring" min={1} max={365} value={retention[key as keyof typeof retention]} onChange={(event) => updateField(key as keyof typeof retention, event.target.value)} type="number" />
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <ActionButton
          onClick={async () => {
            const response = await fetch("/api/owner/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(retention)
            });
            setMessage(response.ok ? "RETENTION UPDATED" : "RETENTION UPDATE FAILED");
            await reload();
          }}
        >
          SAVE RETENTION
        </ActionButton>
        <ActionButton
          variant="danger"
          onClick={async () => {
            const response = await fetch("/api/owner/settings", { method: "DELETE" });
            setMessage(response.ok ? "ALL VISITOR DATA DELETED" : "DELETE FAILED");
            await reload();
          }}
        >
          DELETE ALL DATA
        </ActionButton>
      </div>
    </Panel>
  );
}

async function deleteResource(url: string, setMessage: (message: string | null) => void, reload: () => Promise<void>) {
  const response = await fetch(url, { method: "DELETE" });
  setMessage(response.ok ? "DELETED" : "DELETE FAILED");
  await reload();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function latestArrayRecord(value: unknown): Record<string, unknown> {
  return arrayRecords(value)[0] ?? {};
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "UNAVAILABLE";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "UNAVAILABLE";
  return String(value);
}

function ipVersion(ip: string) {
  if (!ip || ip === "UNAVAILABLE" || ip === "unavailable") return "UNAVAILABLE";
  return ip.includes(":") ? "IPv6" : "IPv4";
}
