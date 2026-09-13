"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collectDeviceSnapshot } from "@/lib/client-intelligence";
import type { DeviceSnapshot, PermissionState, SessionInfo } from "@/components/types";
import { ActionButton, DataRow, Eyebrow, Panel, StatusPill } from "@/components/ui";

type TimelineItem = { time: string; label: string; detail?: string };
type PermissionStatus = "NOT_REQUESTED" | "REQUESTING" | "GRANTED" | "DENIED" | "NOT_SUPPORTED" | "INTERACTION_REQUIRED" | "ACTIVE";
type CameraStatus = PermissionStatus | "RECORDING" | "STOPPED";
type SectionKey = "identity" | "projects" | "research" | "experiments" | "archive" | "contact";

type PreciseLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

type BootStep = {
  id: string;
  title: string;
  detail: string;
  permission?: "camera" | "microphone" | "location";
};

const bootSteps: BootStep[] = [
  { id: "intro", title: "KIM", detail: "PRIVATE DIGITAL IDENTITY" },
  { id: "init", title: "INITIALIZING", detail: "Cinematic identity layer online." },
  { id: "session", title: "ESTABLISHING SESSION", detail: "Backend request creates the KIM session and observes public network identity." },
  { id: "environment", title: "READING CLIENT ENVIRONMENT", detail: "Only browser-exposed client properties are inspected." },
  { id: "network", title: "NETWORK OBSERVED", detail: "Public IP is sourced from the server request, not client JavaScript." },
  { id: "device", title: "DEVICE PROFILE CREATED", detail: "Browser, platform, screen, viewport, language, and supported APIs are classified." },
  { id: "camera", title: "CAMERA ACCESS", detail: "KIM requests video through the real browser permission prompt.", permission: "camera" },
  { id: "microphone", title: "MICROPHONE ACCESS", detail: "KIM requests audio through the real browser permission prompt. No recording starts.", permission: "microphone" },
  { id: "location", title: "LOCATION ACCESS", detail: "KIM requests one precise location sample through Geolocation.", permission: "location" },
  { id: "ready", title: "DIGITAL PROFILE INITIALIZED", detail: "Permission results and available environment data are sealed into this session." },
  { id: "welcome", title: "WELCOME TO KIM", detail: "Enter the personal digital environment." }
];

const sections: Record<SectionKey, { title: string; eyebrow: string; copy: string; records: string[] }> = {
  identity: {
    eyebrow: "Identity",
    title: "WHO IS KIM?",
    copy: "KIM is a private digital identity: part personal archive, part browser laboratory, part cinematic interface. The system feels mysterious, but its data boundaries stay honest.",
    records: ["Private digital presence", "Ethical permission-based intelligence", "Premium technical storytelling"]
  },
  projects: {
    eyebrow: "Projects",
    title: "PROJECT INDEX",
    copy: "Projects are presented as system records rather than portfolio tiles. Each one carries a technical purpose, a privacy boundary, and a visual signature.",
    records: ["KIM Vault", "Permission Boot Sequence", "Device Profile Engine"]
  },
  research: {
    eyebrow: "Research",
    title: "RESEARCH LAYER",
    copy: "KIM studies what browsers can expose, what they must ask for, and what responsible systems should refuse to collect.",
    records: ["Browser capability mapping", "Consent-aware media flows", "Network observation limits"]
  },
  experiments: {
    eyebrow: "Experiments",
    title: "BROWSER LAB",
    copy: "Small experiments reveal real browser capabilities without turning them into covert identification or fake security theater.",
    records: ["WebGL capability readout", "Local media recorder", "Permission-state timeline"]
  },
  archive: {
    eyebrow: "Archive",
    title: "PRIVATE ARCHIVE",
    copy: "The public surface is narrow. Explicit submissions move into KIM Vault, where only the owner can inspect sessions, locations, media, and audit events.",
    records: ["Private storage", "Audit trail", "Retention controls"]
  },
  contact: {
    eyebrow: "Contact",
    title: "SIGNAL CHANNEL",
    copy: "A minimal contact layer for collaborators who care about craft, restraint, and systems that do not lie about what they know.",
    records: ["owner@example.com", "Technical collaborations", "No stealth collection requests"]
  }
};

export default function KIMExperience() {
  const [bootIndex, setBootIndex] = useState(0);
  const [bootComplete, setBootComplete] = useState(false);
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [interactionRequest, setInteractionRequest] = useState<BootStep | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [device, setDevice] = useState<(DeviceSnapshot & Record<string, unknown>) | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>("NOT_REQUESTED");
  const [location, setLocation] = useState<PreciseLocation | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("NOT_REQUESTED");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphoneStatus, setMicrophoneStatus] = useState<PermissionStatus>("NOT_REQUESTED");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("identity");
  const [profileOpen, setProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const runningRef = useRef(false);
  const processedBootIndexes = useRef(new Set<number>());
  const sessionAttemptedRef = useRef(false);

  const addTimeline = useCallback((label: string, detail?: string) => {
    setTimeline((items) => [
      ...items,
      { time: new Date().toLocaleTimeString([], { hour12: false }), label, detail }
    ]);
  }, []);

  const sendPermissionEvent = useCallback(
    async (capability: "CAMERA" | "MICROPHONE" | "LOCATION", state: PermissionState) => {
      if (!session) return;
      await fetch("/api/permission", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kim-csrf": session.csrfToken },
        body: JSON.stringify({ sessionId: session.sessionId, capability, state })
      }).catch(() => undefined);
    },
    [session]
  );

  const createSession = useCallback(async () => {
    if (session) return session;
    if (sessionAttemptedRef.current) return null;
    sessionAttemptedRef.current = true;
    const response = await fetch("/api/session", { method: "POST" });
    if (!response.ok) {
      addTimeline("SESSION UNAVAILABLE", "Backend storage is not configured or temporarily unavailable.");
      return null;
    }
    const data = (await response.json()) as SessionInfo;
    setSession(data);
    addTimeline("SESSION STARTED", data.sessionId);
    addTimeline("NETWORK OBSERVED", data.network.publicIp);
    return data;
  }, [addTimeline, session]);

  const captureDevice = useCallback(
    async (currentSession: SessionInfo | null) => {
      const snapshot = collectDeviceSnapshot();
      setDevice(snapshot);
      addTimeline("DEVICE PROFILE CREATED", `${snapshot.browser ?? "Browser"} / ${snapshot.platform ?? "Platform"}`);
      if (!currentSession) return;
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kim-csrf": currentSession.csrfToken },
        body: JSON.stringify({ sessionId: currentSession.sessionId, payload: snapshot })
      }).catch(() => undefined);
    },
    [addTimeline]
  );

  const queryPermission = async (name: "camera" | "microphone" | "geolocation") => {
    try {
      if (!navigator.permissions?.query) return "prompt";
      const status = await navigator.permissions.query({ name: name as PermissionName });
      return status.state;
    } catch {
      return "prompt";
    }
  };

  const requestCamera = useCallback(
    async (mode: "auto" | "gesture") => {
      addTimeline("CAMERA PERMISSION REQUESTED");
      await sendPermissionEvent("CAMERA", "PROMPT");

      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        setCameraStatus("NOT_SUPPORTED");
        await sendPermissionEvent("CAMERA", "UNSUPPORTED");
        addTimeline("CAMERA NOT SUPPORTED", "Secure context and MediaDevices API are required");
        return "NOT_SUPPORTED" as const;
      }

      setCameraStatus("REQUESTING");
      try {
        const stream = await mediaWithTimeout({ video: true, audio: false }, 8500);
        setCameraStream(stream);
        setCameraStatus("ACTIVE");
        await sendPermissionEvent("CAMERA", "GRANTED");
        addTimeline("CAMERA ENABLED", "Live preview active. Recording has not started.");
        return "GRANTED" as const;
      } catch {
        const permission = await queryPermission("camera");
        if (mode === "auto" && permission !== "denied") {
          setCameraStatus("INTERACTION_REQUIRED");
          addTimeline("CAMERA INTERACTION REQUIRED", "Browser policy requires a direct action.");
          return "INTERACTION_REQUIRED" as const;
        }
        setCameraStatus("DENIED");
        await sendPermissionEvent("CAMERA", "DENIED");
        addTimeline("CAMERA ACCESS DECLINED", "KIM continues without camera access.");
        return "DENIED" as const;
      }
    },
    [addTimeline, sendPermissionEvent]
  );

  const requestMicrophone = useCallback(
    async (mode: "auto" | "gesture") => {
      addTimeline("MICROPHONE PERMISSION REQUESTED");
      await sendPermissionEvent("MICROPHONE", "PROMPT");

      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        setMicrophoneStatus("NOT_SUPPORTED");
        await sendPermissionEvent("MICROPHONE", "UNSUPPORTED");
        addTimeline("MICROPHONE NOT SUPPORTED", "Secure context and MediaDevices API are required");
        return "NOT_SUPPORTED" as const;
      }

      setMicrophoneStatus("REQUESTING");
      try {
        const stream = await mediaWithTimeout({ audio: true, video: false }, 8500);
        setMicStream(stream);
        setMicrophoneStatus("ACTIVE");
        await sendPermissionEvent("MICROPHONE", "GRANTED");
        addTimeline("MICROPHONE READY", "Input level visible. No audio recording started.");
        return "GRANTED" as const;
      } catch {
        const permission = await queryPermission("microphone");
        if (mode === "auto" && permission !== "denied") {
          setMicrophoneStatus("INTERACTION_REQUIRED");
          addTimeline("MICROPHONE INTERACTION REQUIRED", "Browser policy requires a direct action.");
          return "INTERACTION_REQUIRED" as const;
        }
        setMicrophoneStatus("DENIED");
        await sendPermissionEvent("MICROPHONE", "DENIED");
        addTimeline("MICROPHONE ACCESS DECLINED", "KIM continues without microphone access.");
        return "DENIED" as const;
      }
    },
    [addTimeline, sendPermissionEvent]
  );

  const requestLocation = useCallback(
    async (mode: "auto" | "gesture") => {
      addTimeline("LOCATION PERMISSION REQUESTED");
      await sendPermissionEvent("LOCATION", "PROMPT");

      if (!navigator.geolocation || !window.isSecureContext) {
        setLocationStatus("NOT_SUPPORTED");
        await sendPermissionEvent("LOCATION", "UNSUPPORTED");
        addTimeline("LOCATION NOT SUPPORTED", "Secure context and Geolocation API are required");
        return "NOT_SUPPORTED" as const;
      }

      setLocationStatus("REQUESTING");
      return new Promise<"GRANTED" | "DENIED" | "NOT_SUPPORTED" | "INTERACTION_REQUIRED">((resolve) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          if (mode === "auto") {
            setLocationStatus("INTERACTION_REQUIRED");
            addTimeline("LOCATION INTERACTION REQUIRED", "Browser policy did not resolve the automatic request.");
            resolve("INTERACTION_REQUIRED");
            return;
          }
          setLocationStatus("DENIED");
          addTimeline("LOCATION ACCESS UNRESOLVED", "KIM continues without precise location.");
          resolve("DENIED");
        }, 10500);

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            const nextLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            setLocation(nextLocation);
            setLocationStatus("GRANTED");
            await sendPermissionEvent("LOCATION", "GRANTED");
            addTimeline("LOCATION SHARED", `Accuracy +/- ${Math.round(position.coords.accuracy)}m`);

            if (session) {
              await fetch("/api/location", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-kim-csrf": session.csrfToken },
                body: JSON.stringify({ sessionId: session.sessionId, ...nextLocation })
              }).catch(() => undefined);
            }
            resolve("GRANTED");
          },
          async () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            const permission = await queryPermission("geolocation");
            if (mode === "auto" && permission !== "denied") {
              setLocationStatus("INTERACTION_REQUIRED");
              addTimeline("LOCATION INTERACTION REQUIRED", "Browser policy requires a direct action.");
              resolve("INTERACTION_REQUIRED");
              return;
            }
            setLocationStatus("DENIED");
            await sendPermissionEvent("LOCATION", "DENIED");
            addTimeline("LOCATION ACCESS DECLINED", "Approximate network location may still be available.");
            resolve("DENIED");
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
      });
    },
    [addTimeline, sendPermissionEvent, session]
  );

  const runPermission = useCallback(
    async (step: BootStep, mode: "auto" | "gesture") => {
      if (step.permission === "camera") return requestCamera(mode);
      if (step.permission === "microphone") return requestMicrophone(mode);
      if (step.permission === "location") return requestLocation(mode);
      return "GRANTED" as const;
    },
    [requestCamera, requestLocation, requestMicrophone]
  );

  const advance = useCallback(() => {
    setBootIndex((index) => {
      if (index >= bootSteps.length - 1) {
        setBootComplete(true);
        return index;
      }
      return index + 1;
    });
  }, []);

  useEffect(() => {
    if (runningRef.current || bootComplete || interactionRequest) return;
    if (processedBootIndexes.current.has(bootIndex)) return;
    const step = bootSteps[bootIndex];
    processedBootIndexes.current.add(bootIndex);
    runningRef.current = true;
    setRunningStep(step.id);

    async function runStep() {
      try {
        if (step.id === "session") {
          await createSession();
        } else if (step.id === "environment") {
          const currentSession = session ?? (await createSession());
          await captureDevice(currentSession);
        } else if (step.permission) {
          const result = await runPermission(step, "auto");
          if (result === "INTERACTION_REQUIRED") {
            setInteractionRequest(step);
            return;
          }
        }

        const delay = step.permission ? 650 : step.id === "intro" ? 1150 : 820;
        window.setTimeout(advance, delay);
      } catch {
        addTimeline("CONNECTION TEMPORARILY UNAVAILABLE");
        window.setTimeout(advance, 900);
      } finally {
        runningRef.current = false;
        setRunningStep(null);
      }
    }

    void runStep();
  }, [addTimeline, advance, bootComplete, bootIndex, captureDevice, createSession, interactionRequest, runPermission, session]);

  useEffect(() => {
    if (!videoRef.current || !cameraStream) return;
    videoRef.current.srcObject = cameraStream;
  }, [cameraStream, bootComplete, profileOpen]);

  useEffect(() => {
    if (cameraStatus !== "RECORDING") return;
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [cameraStatus]);

  useEffect(() => {
    if (!micStream) return;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(micStream);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    source.connect(analyser);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      micStream.getTracks().forEach((track) => track.stop());
      void audioContext.close();
    };
  }, [micStream]);

  const continuePermission = async () => {
    if (!interactionRequest) return;
    const current = interactionRequest;
    setInteractionRequest(null);
    await runPermission(current, "gesture");
    advance();
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraStatus(recordedBlob ? "STOPPED" : "NOT_REQUESTED");
    addTimeline("CAMERA STOPPED");
  };

  const stopMicrophone = () => {
    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
    setMicLevel(0);
    setMicrophoneStatus("NOT_REQUESTED");
    addTimeline("MICROPHONE STOPPED");
  };

  const startRecording = async () => {
    if (!cameraStream || !("MediaRecorder" in window)) return;
    chunksRef.current = [];
    setRecordedBlob(null);
    setUploadStatus(null);
    setRecordingSeconds(0);
    setRecordingStartedAt(Date.now());
    const recorder = new MediaRecorder(cameraStream, { mimeType: "video/webm" });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setCameraStatus("STOPPED");
      addTimeline("RECORDING STOPPED", "Captured locally in this browser.");
    };
    recorder.start();
    setCameraStatus("RECORDING");
    addTimeline("RECORDING STARTED", "Local recording only. No upload has occurred.");

    if (session) {
      await fetch("/api/media/event", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kim-csrf": session.csrfToken },
        body: JSON.stringify({ sessionId: session.sessionId, event: "recording_started" })
      }).catch(() => undefined);
    }
  };

  const stopRecording = async () => {
    recorderRef.current?.stop();
    if (session) {
      await fetch("/api/media/event", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-kim-csrf": session.csrfToken },
        body: JSON.stringify({ sessionId: session.sessionId, event: "recording_stopped" })
      }).catch(() => undefined);
    }
  };

  const deleteRecording = () => {
    setRecordedBlob(null);
    setUploadStatus(null);
    addTimeline("LOCAL RECORDING DELETED");
  };

  const uploadRecording = async () => {
    if (!recordedBlob || !session) return;
    setUploadStatus("SENDING TO KIM VAULT");
    const formData = new FormData();
    formData.set("sessionId", session.sessionId);
    formData.set("durationMs", String(recordingStartedAt ? Date.now() - recordingStartedAt : recordingSeconds * 1000));
    formData.set("mediaType", "VIDEO");
    formData.set("file", recordedBlob, "kim-recording.webm");

    const response = await fetch("/api/media/upload", {
      method: "POST",
      headers: { "x-kim-csrf": session.csrfToken },
      body: formData
    });

    setUploadStatus(response.ok ? "UPLOADED TO PRIVATE VAULT" : "VAULT TRANSFER FAILED");
    addTimeline(response.ok ? "MEDIA UPLOADED" : "MEDIA UPLOAD FAILED");
  };

  const deleteLocation = async () => {
    if (session) {
      await fetch("/api/location", {
        method: "DELETE",
        headers: { "x-kim-csrf": session.csrfToken }
      }).catch(() => undefined);
    }
    setLocation(null);
    setLocationStatus("NOT_REQUESTED");
    addTimeline("LOCATION DATA DELETED");
  };

  const currentStep = bootSteps[bootIndex];

  return (
    <main className="kim-noise kim-scan min-h-screen overflow-hidden bg-radialNoise text-frost">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_34%)]" />
      <AnimatePresence mode="wait">
        {!bootComplete ? (
          <BootScreen
            key="boot"
            step={currentStep}
            bootIndex={bootIndex}
            running={runningStep === currentStep.id}
            interactionRequest={interactionRequest}
            cameraStatus={cameraStatus}
            microphoneStatus={microphoneStatus}
            locationStatus={locationStatus}
            session={session}
            device={device}
            onContinue={continuePermission}
            onPrivacy={() => setPrivacyOpen(true)}
          />
        ) : (
          <KimShell
            key="shell"
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            profileOpen={profileOpen}
            setProfileOpen={setProfileOpen}
            onPrivacy={() => setPrivacyOpen(true)}
            session={session}
            device={device}
            timeline={timeline}
            locationStatus={locationStatus}
            location={location}
            cameraStatus={cameraStatus}
            microphoneStatus={microphoneStatus}
            micLevel={micLevel}
            videoRef={videoRef}
            recordedBlob={recordedBlob}
            recordingSeconds={recordingSeconds}
            uploadStatus={uploadStatus}
            onStopCamera={stopCamera}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onDeleteRecording={deleteRecording}
            onUploadRecording={uploadRecording}
            onStopMicrophone={stopMicrophone}
            onDeleteLocation={deleteLocation}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {privacyOpen ? <PrivacyOverlay onClose={() => setPrivacyOpen(false)} /> : null}
      </AnimatePresence>
    </main>
  );
}

function BootScreen({
  step,
  bootIndex,
  running,
  interactionRequest,
  cameraStatus,
  microphoneStatus,
  locationStatus,
  session,
  device,
  onContinue,
  onPrivacy
}: {
  step: BootStep;
  bootIndex: number;
  running: boolean;
  interactionRequest: BootStep | null;
  cameraStatus: CameraStatus;
  microphoneStatus: PermissionStatus;
  locationStatus: PermissionStatus;
  session: SessionInfo | null;
  device: (DeviceSnapshot & Record<string, unknown>) | null;
  onContinue: () => void;
  onPrivacy: () => void;
}) {
  const permissionStatus =
    step.permission === "camera" ? cameraStatus : step.permission === "microphone" ? microphoneStatus : step.permission === "location" ? locationStatus : null;

  return (
    <motion.section className="relative z-10 grid min-h-screen place-items-center px-4 py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <div className="absolute inset-x-6 top-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        <span>KIM / BOOT</span>
        <button className="transition hover:text-frost" onClick={onPrivacy} type="button">PRIVACY</button>
      </div>
      <div className="w-full max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Private Digital Identity</Eyebrow>
          <AnimatePresence mode="wait">
            <motion.div key={step.id} initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -20, filter: "blur(10px)" }} transition={{ duration: 0.5 }}>
              <h1 className={step.id === "intro" ? "mt-8 text-[clamp(5.5rem,26vw,16rem)] font-medium leading-none text-signal" : "mt-8 text-[clamp(2.4rem,10vw,7rem)] font-medium leading-none text-signal"}>
                {step.title}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-frost/68 sm:text-base">{step.detail}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2">
            <CompactStatus label="SESSION" value={session ? "ACTIVE" : bootIndex > 1 ? "REQUESTING" : "LOCKED"} />
            <CompactStatus label="NETWORK" value={session ? "OBSERVED" : "LOCKED"} />
            <CompactStatus label="DEVICE" value={device ? "PROFILED" : "LOCKED"} />
          </div>

          {permissionStatus ? (
            <div className="mx-auto mt-5 max-w-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{step.title}</span>
                <StatusPill tone={permissionTone(permissionStatus)}>{permissionStatus}</StatusPill>
              </div>
              {interactionRequest?.id === step.id ? (
                <div className="mt-4 text-left">
                  <p className="text-sm leading-6 text-frost/70">Browser interaction required. Continue will call the real browser permission API.</p>
                  <div className="mt-4">
                    <ActionButton onClick={onContinue}>CONTINUE</ActionButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mx-auto mt-9 grid max-w-3xl grid-cols-11 gap-1">
            {bootSteps.map((item, index) => (
              <div className={`h-1 transition ${index <= bootIndex ? "bg-cyan/75" : "bg-white/10"}`} key={item.id} />
            ))}
          </div>
          {running ? <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">SYSTEM STEP ACTIVE</div> : null}
        </div>
      </div>
    </motion.section>
  );
}

function KimShell(props: {
  activeSection: SectionKey;
  setActiveSection: (section: SectionKey) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  onPrivacy: () => void;
  session: SessionInfo | null;
  device: (DeviceSnapshot & Record<string, unknown>) | null;
  timeline: TimelineItem[];
  locationStatus: PermissionStatus;
  location: PreciseLocation | null;
  cameraStatus: CameraStatus;
  microphoneStatus: PermissionStatus;
  micLevel: number;
  videoRef: React.Ref<HTMLVideoElement>;
  recordedBlob: Blob | null;
  recordingSeconds: number;
  uploadStatus: string | null;
  onStopCamera: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDeleteRecording: () => void;
  onUploadRecording: () => void;
  onStopMicrophone: () => void;
  onDeleteLocation: () => void;
}) {
  const current = sections[props.activeSection];

  return (
    <motion.div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-4 py-5 sm:px-6 lg:px-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.65 }}>
      <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Link className="font-mono text-xs uppercase tracking-[0.38em] text-signal" href="/">KIM</Link>
        <div className="flex items-center gap-3">
          <button className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition hover:text-frost" onClick={() => props.setProfileOpen(!props.profileOpen)} type="button">
            SYSTEM PROFILE
          </button>
          <button className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition hover:text-frost" onClick={props.onPrivacy} type="button">
            PRIVACY
          </button>
          <StatusPill tone="good">READY</StatusPill>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Eyebrow>{current.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(3.4rem,12vw,8.5rem)] font-medium leading-[0.88] text-signal">{current.title}</h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-frost/72 sm:text-lg">{current.copy}</p>
          <nav className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="KIM sections">
            {(Object.keys(sections) as SectionKey[]).map((key) => (
              <button
                className={`border px-3 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                  props.activeSection === key ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-white/10 bg-white/[0.025] text-muted hover:text-frost"
                }`}
                key={key}
                onClick={() => props.setActiveSection(key)}
                type="button"
              >
                {key}
              </button>
            ))}
          </nav>
        </div>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <Eyebrow>KIM Environment</Eyebrow>
            <StatusPill tone="good">WELCOME</StatusPill>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {current.records.map((record) => (
              <div className="min-h-28 border border-white/10 bg-white/[0.025] p-4" key={record}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Record</div>
                <div className="mt-3 text-sm leading-6 text-frost/75">{record}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <CompactStatus label="NETWORK" value={props.session ? "OBSERVED" : "UNAVAILABLE"} />
            <CompactStatus label="DEVICE" value={props.device ? "PROFILED" : "UNAVAILABLE"} />
            <CompactStatus label="CAMERA" value={props.cameraStatus} />
            <CompactStatus label="MICROPHONE" value={props.microphoneStatus} />
            <CompactStatus label="LOCATION" value={props.locationStatus} />
            <CompactStatus label="VAULT" value="PRIVATE" />
          </div>
        </Panel>
      </section>

      <AnimatePresence>
        {props.profileOpen ? <SystemProfile {...props} /> : null}
      </AnimatePresence>
    </motion.div>
  );
}

function SystemProfile(props: Parameters<typeof KimShell>[0]) {
  return (
    <motion.section className="pb-10" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }}>
      <div className="grid gap-4 lg:grid-cols-2">
        <NetworkDevicePanel session={props.session} device={props.device} />
        <CapabilityPanel device={props.device} cameraStatus={props.cameraStatus} microphoneStatus={props.microphoneStatus} locationStatus={props.locationStatus} />
        <MediaControlPanel {...props} />
        <LocationPanel location={props.location} locationStatus={props.locationStatus} onDeleteLocation={props.onDeleteLocation} />
        <TimelinePanel items={props.timeline} />
      </div>
    </motion.section>
  );
}

function NetworkDevicePanel({ session, device }: { session: SessionInfo | null; device: (DeviceSnapshot & Record<string, unknown>) | null }) {
  const ip = session?.network.publicIp;
  const ipVersion = ip?.includes(":") ? "IPv6" : ip && ip !== "unavailable" ? "IPv4" : "UNAVAILABLE";
  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Network / Device</Eyebrow>
      <div className="mt-5 grid gap-x-6 sm:grid-cols-2">
        <DataRow label="Public IP" value={ip ?? "UNAVAILABLE"} />
        <DataRow label="IP Version" value={ipVersion} />
        <DataRow label="IP Location" value="UNAVAILABLE - approximate provider not configured" />
        <DataRow label="Protocol" value={session?.network.protocol ?? "UNAVAILABLE"} />
        <DataRow label="Browser" value={device?.browser as string | undefined} />
        <DataRow label="Version" value={device?.browserVersion as string | undefined} />
        <DataRow label="OS" value={device?.operatingSystem as string | undefined} />
        <DataRow label="Platform" value={device?.platform as string | undefined} />
        <DataRow label="Screen" value={device?.screen ? `${device.screen.width} x ${device.screen.height}` : "UNAVAILABLE"} />
        <DataRow label="Viewport" value={device?.viewport ? `${device.viewport.width} x ${device.viewport.height}` : "UNAVAILABLE"} />
        <DataRow label="DPR" value={device?.devicePixelRatio?.toString() ?? "UNAVAILABLE"} />
        <DataRow label="Timezone" value={device?.timezone} />
      </div>
    </Panel>
  );
}

function CapabilityPanel({ device, cameraStatus, microphoneStatus, locationStatus }: { device: (DeviceSnapshot & Record<string, unknown>) | null; cameraStatus: CameraStatus; microphoneStatus: PermissionStatus; locationStatus: PermissionStatus }) {
  const caps = device?.capabilities ?? {};
  const entries = [
    ["Camera", permissionCapabilityState(caps.camera, cameraStatus)],
    ["Microphone", permissionCapabilityState(caps.microphone, microphoneStatus)],
    ["Geolocation", permissionCapabilityState(caps.geolocation, locationStatus)],
    ["WebGL", caps.webgl ? "SUPPORTED" : "UNAVAILABLE"],
    ["WebGPU", caps.webgpu ? "SUPPORTED" : "UNAVAILABLE"],
    ["WebAssembly", caps.webassembly ? "SUPPORTED" : "UNAVAILABLE"],
    ["MediaRecorder", caps.mediaRecorder ? "SUPPORTED" : "UNAVAILABLE"],
    ["Service Worker", caps.serviceWorker ? "SUPPORTED" : "UNAVAILABLE"],
    ["IndexedDB", caps.indexedDB ? "SUPPORTED" : "UNAVAILABLE"],
    ["Screen Capture", caps.screenCapture ? "SUPPORTED" : "UNAVAILABLE"],
    ["Touch", caps.touch ? "AVAILABLE" : "UNAVAILABLE"],
    ["WebRTC", caps.webRtc ? "SUPPORTED" : "UNAVAILABLE"]
  ];

  return (
    <Panel className="p-5 sm:p-6">
      <Eyebrow>Capability Matrix</Eyebrow>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {entries.map(([label, state]) => (
          <div className="flex items-center justify-between border border-white/10 bg-white/[0.025] px-3 py-3" key={label}>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-frost">{state}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MediaControlPanel(props: Parameters<typeof KimShell>[0]) {
  const recordingUrl = useMemo(() => (props.recordedBlob ? URL.createObjectURL(props.recordedBlob) : null), [props.recordedBlob]);
  useEffect(() => () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <Eyebrow>Media Interface</Eyebrow>
        <StatusPill tone={props.cameraStatus === "ACTIVE" || props.cameraStatus === "RECORDING" ? "good" : "neutral"}>{props.cameraStatus}</StatusPill>
      </div>
      <div className="mt-5 aspect-video overflow-hidden border border-white/10 bg-black">
        {props.cameraStatus === "ACTIVE" || props.cameraStatus === "RECORDING" ? (
          <video ref={props.videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        ) : recordingUrl ? (
          <video src={recordingUrl} controls className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center font-mono text-xs uppercase tracking-[0.2em] text-muted">CAMERA RESULT SEALED</div>
        )}
      </div>
      {props.cameraStatus === "RECORDING" ? <div className="mt-4 font-mono text-sm uppercase tracking-[0.22em] text-red-200">RECORDING {formatSeconds(props.recordingSeconds)}</div> : null}
      {props.uploadStatus ? <div className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-cyan">{props.uploadStatus}</div> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <ActionButton variant="secondary" onClick={props.onStartRecording} disabled={props.cameraStatus !== "ACTIVE"}>START RECORDING</ActionButton>
        <ActionButton variant="secondary" onClick={props.onStopRecording} disabled={props.cameraStatus !== "RECORDING"}>STOP RECORDING</ActionButton>
        <ActionButton variant="secondary" onClick={props.onStopCamera} disabled={!["ACTIVE", "RECORDING"].includes(props.cameraStatus)}>STOP CAMERA</ActionButton>
        <ActionButton variant="danger" onClick={props.onDeleteRecording} disabled={!props.recordedBlob}>DELETE</ActionButton>
        <ActionButton onClick={props.onUploadRecording} disabled={!props.recordedBlob}>SEND TO KIM VAULT</ActionButton>
      </div>
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Microphone Level</span>
          <span>{props.microphoneStatus}</span>
        </div>
        <div className="h-2 border border-white/10 bg-white/[0.04]">
          <div className="h-full bg-cyan transition-all" style={{ width: `${props.micLevel}%` }} />
        </div>
        <div className="mt-4">
          <ActionButton variant="secondary" onClick={props.onStopMicrophone} disabled={props.microphoneStatus !== "ACTIVE"}>STOP MICROPHONE</ActionButton>
        </div>
      </div>
    </Panel>
  );
}

function LocationPanel({ location, locationStatus, onDeleteLocation }: { location: PreciseLocation | null; locationStatus: PermissionStatus; onDeleteLocation: () => void }) {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <Eyebrow>Location</Eyebrow>
        <StatusPill tone={locationStatus === "GRANTED" ? "good" : locationStatus === "DENIED" ? "bad" : "warn"}>{locationStatus}</StatusPill>
      </div>
      <MiniMap location={location} />
      <div className="mt-5">
        <DataRow label="Latitude" value={location ? location.latitude.toFixed(6) : locationStatus === "DENIED" ? "DENIED" : "PERMISSION REQUIRED"} />
        <DataRow label="Longitude" value={location ? location.longitude.toFixed(6) : locationStatus === "DENIED" ? "DENIED" : "PERMISSION REQUIRED"} />
        <DataRow label="Accuracy" value={location ? `+/- ${Math.round(location.accuracy)} meters` : "UNAVAILABLE"} />
        <DataRow label="Timestamp" value={location ? new Date(location.timestamp).toISOString() : "UNAVAILABLE"} />
      </div>
      <div className="mt-5">
        <ActionButton variant="danger" onClick={onDeleteLocation} disabled={!location}>DELETE LOCATION DATA</ActionButton>
      </div>
    </Panel>
  );
}

function MiniMap({ location }: { location: PreciseLocation | null }) {
  const left = location ? `${((location.longitude + 180) / 360) * 100}%` : "50%";
  const top = location ? `${((90 - location.latitude) / 180) * 100}%` : "50%";
  return (
    <div className="relative mt-5 aspect-[16/9] overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:32px_32px]" />
      <div className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">GPS LOCATION / USER PERMISSION</div>
      {location ? <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border border-cyan bg-cyan/[0.35] shadow-[0_0_24px_rgba(117,215,229,0.45)]" style={{ left, top }} /> : null}
      {!location ? <div className="absolute inset-0 grid place-items-center font-mono text-xs uppercase tracking-[0.2em] text-muted">NO PRECISE LOCATION</div> : null}
    </div>
  );
}

function TimelinePanel({ items }: { items: TimelineItem[] }) {
  return (
    <Panel className="p-5 sm:p-6 lg:col-span-2">
      <Eyebrow>Session Timeline</Eyebrow>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div className="border-l border-white/[0.12] pl-4" key={`${item.time}-${item.label}-${index}`}>
            <div className="font-mono text-[10px] text-muted">{item.time}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-frost">{item.label}</div>
            {item.detail ? <div className="mt-1 text-xs text-muted">{item.detail}</div> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CompactStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.025] p-3 text-left">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-2 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-frost">{value}</div>
    </div>
  );
}

function PrivacyOverlay({ onClose }: { onClose: () => void }) {
  const rows = [
    ["PUBLIC IP", "AVAILABLE"],
    ["BROWSER", "AVAILABLE"],
    ["DEVICE PROFILE", "AVAILABLE"],
    ["GPS", "PERMISSION REQUIRED"],
    ["CAMERA", "PERMISSION REQUIRED"],
    ["MICROPHONE", "PERMISSION REQUIRED"],
    ["PHONE NUMBER", "NOT AVAILABLE"],
    ["CONTACTS", "NOT AVAILABLE"],
    ["PASSWORDS", "NOT AVAILABLE"],
    ["PRIVATE FILES", "NOT AVAILABLE"],
    ["EXACT HOME ADDRESS", "NOT GUARANTEED"],
    ["PRIVATE IP", "NOT RELIABLY AVAILABLE"]
  ];

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="panel max-h-[88vh] w-full max-w-3xl overflow-auto p-6" initial={{ scale: 0.96, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 18 }}>
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>KIM Privacy</Eyebrow>
          <ActionButton variant="secondary" onClick={onClose}>CLOSE</ActionButton>
        </div>
        <h2 className="mt-6 text-3xl text-signal">What Does KIM Know?</h2>
        <p className="mt-4 text-sm leading-7 text-frost/70">
          Some information is automatically available to websites. Other information requires your browser permission prompt. KIM does not bypass browser security controls, does not secretly access camera or microphone, and stores private data only after explicit submission.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {rows.map(([label, state]) => (
            <div className="flex items-center justify-between border border-white/10 bg-white/[0.025] px-3 py-3" key={label}>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-frost">{state}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function permissionCapabilityState(supported: boolean | undefined, state: string) {
  if (!supported) return "UNAVAILABLE";
  if (["GRANTED", "ACTIVE", "STOPPED"].includes(state)) return "AVAILABLE";
  if (state === "DENIED") return "DENIED";
  if (state === "NOT_SUPPORTED") return "NOT SUPPORTED";
  return "PERMISSION REQUIRED";
}

function permissionTone(status: string): "neutral" | "good" | "warn" | "bad" {
  if (["GRANTED", "ACTIVE", "STOPPED"].includes(status)) return "good";
  if (status === "DENIED") return "bad";
  if (status === "NOT_SUPPORTED") return "neutral";
  return "warn";
}

function mediaWithTimeout(constraints: MediaStreamConstraints, timeoutMs: number) {
  let settled = false;
  return new Promise<MediaStream>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      settled = true;
      reject(new Error("BROWSER_INTERACTION_TIMEOUT"));
    }, timeoutMs);

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (settled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve(stream);
      })
      .catch((error: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
