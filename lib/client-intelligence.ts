import type { DeviceSnapshot } from "@/components/types";

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    type?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
};

export function detectBrowser(userAgent: string) {
  const rules = [
    { name: "Microsoft Edge", regex: /Edg\/([\d.]+)/ },
    { name: "Chrome", regex: /Chrome\/([\d.]+)/ },
    { name: "Safari", regex: /Version\/([\d.]+).*Safari/ },
    { name: "Firefox", regex: /Firefox\/([\d.]+)/ }
  ];

  for (const rule of rules) {
    const match = userAgent.match(rule.regex);
    if (match) return { name: rule.name, version: match[1] };
  }

  return { name: "NOT AVAILABLE", version: "NOT AVAILABLE" };
}

export function detectOperatingSystem(userAgent: string, platform: string) {
  const source = `${userAgent} ${platform}`;
  const rules = [
    { name: "Windows", regex: /Windows NT ([\d.]+)/ },
    { name: "iOS", regex: /OS ([\d_]+) like Mac OS X/ },
    { name: "macOS", regex: /Mac OS X ([\d_]+)/ },
    { name: "Android", regex: /Android ([\d.]+)/ },
    { name: "Linux", regex: /Linux/ }
  ];

  for (const rule of rules) {
    const match = source.match(rule.regex);
    if (match) {
      return { name: rule.name, version: match[1]?.replaceAll("_", ".") ?? "NOT AVAILABLE" };
    }
  }

  return { name: "NOT AVAILABLE", version: "NOT AVAILABLE" };
}

export function detectDeviceType(userAgent: string) {
  if (/Mobi|Android|iPhone/i.test(userAgent)) return "Mobile";
  if (/iPad|Tablet/i.test(userAgent)) return "Tablet";
  return "Desktop / Laptop";
}

export function collectDeviceSnapshot(): DeviceSnapshot & {
  browserVersion?: string;
  operatingSystem?: string;
  osVersion?: string;
  deviceType?: string;
} {
  const nav = navigator as NavigatorWithMemory;
  const userAgent = nav.userAgent;
  const browser = detectBrowser(userAgent);
  const os = detectOperatingSystem(userAgent, nav.platform);
  const canMatchMedia = typeof window.matchMedia === "function";
  const colorScheme = canMatchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : "not-supported";
  const reducedMotion = canMatchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduce"
      : "no-preference"
    : "not-supported";

  return {
    userAgent,
    browser: browser.name,
    browserVersion: browser.version,
    operatingSystem: os.name,
    osVersion: os.version,
    platform: nav.platform || "NOT AVAILABLE",
    deviceType: detectDeviceType(userAgent),
    language: nav.language,
    languages: Array.from(nav.languages ?? []),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    online: nav.onLine,
    colorScheme,
    reducedMotion,
    connection: nav.connection
      ? {
          effectiveType: nav.connection.effectiveType,
          downlink: nav.connection.downlink,
          rtt: nav.connection.rtt,
          saveData: nav.connection.saveData
        }
      : undefined,
    capabilities: {
      camera: Boolean(nav.mediaDevices?.getUserMedia),
      microphone: Boolean(nav.mediaDevices?.getUserMedia),
      geolocation: "geolocation" in nav,
      notifications: "Notification" in window,
      webgl: supportsWebGL(),
      webgpu: "gpu" in nav,
      webassembly: "WebAssembly" in window,
      serviceWorker: "serviceWorker" in nav,
      localStorage: supportsStorage("localStorage"),
      indexedDB: "indexedDB" in window,
      mediaRecorder: "MediaRecorder" in window,
      screenCapture: Boolean(nav.mediaDevices?.getDisplayMedia),
      touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      webRtc: Boolean(window.RTCPeerConnection)
    }
  };
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function supportsStorage(name: "localStorage") {
  try {
    const storage = window[name];
    const key = "__kim_storage_test__";
    storage.setItem(key, key);
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
