export type Availability = "AVAILABLE" | "UNAVAILABLE" | "NOT SUPPORTED" | "PERMISSION REQUIRED";

export type SessionInfo = {
  sessionId: string;
  network: {
    publicIp: string;
    protocol: string;
    approximateNetworkLocation: string;
  };
  timestamp: string;
  csrfToken: string;
};

export type DeviceSnapshot = {
  userAgent?: string;
  browser?: string;
  platform?: string;
  language?: string;
  languages?: string[];
  timezone?: string;
  screen?: { width: number; height: number; colorDepth?: number };
  viewport?: { width: number; height: number };
  devicePixelRatio?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
  online?: boolean;
  colorScheme?: "light" | "dark" | "not-supported";
  reducedMotion?: "reduce" | "no-preference" | "not-supported";
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  capabilities?: Record<string, boolean>;
};

export type PermissionState = "LOCKED" | "PROMPT" | "GRANTED" | "DENIED" | "UNSUPPORTED";
