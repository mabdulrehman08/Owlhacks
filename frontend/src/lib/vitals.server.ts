/**
 * Contactless breathing measurement with Presage SmartSpectra, served from this
 * Node server at /api/vitals/{start,frame,stop}. See handover.md for background.
 *
 * - Only the on-device breathing bundle is requested (CHEST_BREATHING, BREATHING_RATE):
 *   it runs locally on CPU, needs no model downloads, and works in headless Docker.
 * - Frames arrive over HTTP, so their timing is irregular. The SDK gets each frame's
 *   real capture time (so breathing rate stays correct at any frame rate), forced
 *   monotonic, with stalls shortened below the SDK's gap limit (~100 ms).
 * - Presage is contacted only at start to validate SMARTSPECTRA_API_KEY; frames never
 *   leave this server. Without a key these routes answer 503 and the UI hides vitals.
 */
import { createRequire } from "node:module";
import path from "node:path";

type SdkModule = {
  SmartSpectraSDK: new (opts: Record<string, unknown>) => SdkInstance;
  decodeMetrics: (buf: Buffer) => unknown;
};
type SdkInstance = {
  processingStatus: number;
  on: (event: string, cb: (...args: never[]) => void) => SdkInstance;
  useCustomInput: () => SdkInstance;
  start: () => void;
  stop: () => void;
  reset: () => void;
  destroy: () => Promise<void>;
  sendFrame: (
    buf: Buffer,
    width: number,
    height: number,
    stride: number,
    pixelFormat: number,
    timestampUs: number,
  ) => void;
};
type Decoded = {
  breathing?: {
    rate?: { value?: number; confidence?: number }[];
    upperTrace?: { value?: number }[];
  };
};

type VitalsSession = {
  sdk: SdkInstance;
  frames: number;
  /** Last timestamp given to the SDK, and the client capture time (ms) it came from. */
  lastUs: number;
  lastCaptureMs: number | undefined;
  lastSeen: number;
  lastReset: number;
  resets: number;
  metrics?: Decoded;
  hint: string;
  code: number;
};

const CHEST_BREATHING = 0;
const BREATHING_RATE = 2;
const PIXEL_FORMAT_RGBA = 2;
const STATUS_ERROR = 5;
const FRAME_US = 33_333; // assumed spacing when the client sends no capture time
const MAX_GAP_US = 90_000; // the SDK errors on timestamp gaps over ~100 ms
const RESET_COOLDOWN_MS = 3_000; // resets re-authenticate; don't hammer Presage
const MAX_RESETS = 3; // e.g. a rejected key fails every time; give up instead of retrying forever
const IDLE_TIMEOUT_MS = 60_000; // tab closed without /stop
const MAX_SESSIONS = 20;
const MAX_FRAME_PIXELS = 640 * 480;

const sessions = new Map<string, VitalsSession>();
let sdkModule: SdkModule | null | undefined;

/**
 * Load the SDK from node_modules at runtime. It resolves a per-platform native
 * library itself, so it must not be bundled; createRequire from the app root keeps
 * the bundler's hands off it.
 */
function loadSdk(): SdkModule | null {
  if (sdkModule !== undefined) return sdkModule;
  try {
    const require = createRequire(path.join(process.cwd(), "package.json"));
    sdkModule = require("@smartspectra/node-sdk") as SdkModule;
  } catch (err) {
    console.warn("SmartSpectra SDK unavailable; breathing vitals disabled:", err);
    sdkModule = null;
  }
  return sdkModule;
}

function apiKey() {
  return process.env["SMARTSPECTRA_API_KEY"]?.trim() || "";
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function endSession(id: string) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  try {
    s.sdk.stop();
    await s.sdk.destroy();
  } catch (err) {
    console.warn("SmartSpectra session cleanup failed:", err);
  }
}

// Sweep sessions whose browser went away without calling /stop.
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.lastSeen > IDLE_TIMEOUT_MS) void endSession(id);
}, 15_000).unref?.();

function latest<T extends { value?: number }>(arr: T[] | undefined): number | undefined {
  return Array.isArray(arr) && arr.length ? arr[arr.length - 1]?.value : undefined;
}

export function isVitalsRequest(url: URL) {
  return url.pathname.startsWith("/api/vitals/");
}

export async function handleVitalsRequest(request: Request, url: URL): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (url.pathname === "/api/vitals/start") {
    const sdk = apiKey() ? loadSdk() : null;
    if (!sdk) return json({ error: "Breathing vitals are not configured" }, 503);
    if (sessions.size >= MAX_SESSIONS) return json({ error: "Too many active sessions" }, 429);

    const id = crypto.randomUUID();
    try {
      const instance = new sdk.SmartSpectraSDK({
        apiKey: apiKey(),
        requestedMetrics: [CHEST_BREATHING, BREATHING_RATE],
        enableTelemetry: false,
        logLevel: 3, // errors only
      });
      const session: VitalsSession = {
        sdk: instance,
        frames: 0,
        lastUs: 1_000_000,
        lastCaptureMs: undefined,
        lastSeen: Date.now(),
        lastReset: 0,
        resets: 0,
        hint: "Starting…",
        code: -1,
      };
      instance.on("metrics", (buf: Buffer) => {
        try {
          session.metrics = sdk.decodeMetrics(buf) as Decoded;
        } catch {
          // keep the previous reading
        }
      });
      instance.on("validationStatus", (code: number, _ts: number, hint: string) => {
        session.code = code;
        session.hint = hint;
      });
      instance.on("error", (code: number, message: string) => {
        console.error(`SmartSpectra error [${code}]: ${message}`);
        // Surfaced to the viewer (e.g. a rejected API key) instead of silently showing nothing.
        session.hint = "Breathing measurement unavailable";
      });
      instance.useCustomInput();
      instance.start();
      sessions.set(id, session);
      return json({ sessionId: id });
    } catch (err) {
      console.error("Failed to start SmartSpectra:", err);
      return json({ error: "Could not start breathing measurement" }, 502);
    }
  }

  if (url.pathname === "/api/vitals/frame") {
    const id = url.searchParams.get("sessionId") ?? "";
    const width = Number(url.searchParams.get("width"));
    const height = Number(url.searchParams.get("height"));
    const s = sessions.get(id);
    if (!s) return json({ error: "Session not found" }, 404);
    s.lastSeen = Date.now();

    if (s.sdk.processingStatus === STATUS_ERROR) {
      if (s.resets < MAX_RESETS && s.lastSeen - s.lastReset > RESET_COOLDOWN_MS) {
        s.lastReset = s.lastSeen;
        s.resets += 1;
        try {
          s.sdk.reset();
          s.sdk.useCustomInput();
          s.sdk.start();
          s.frames = 0;
          s.lastUs = 1_000_000;
          s.lastCaptureMs = undefined;
        } catch (err) {
          console.error("SmartSpectra reset failed:", err);
        }
      }
      return json({
        status: STATUS_ERROR,
        validation: {
          code: s.code,
          hint: s.resets >= MAX_RESETS ? "Breathing measurement unavailable" : "Restarting…",
        },
        // Tells the browser to stop streaming frames to a session that won't recover.
        failed: s.resets >= MAX_RESETS,
        vitals: {},
      });
    }

    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width * height > MAX_FRAME_PIXELS
    ) {
      return json({ error: "Invalid frame size" }, 400);
    }
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length !== width * height * 4) return json({ error: "Invalid frame buffer" }, 400);

    // Real capture spacing keeps the breathing rate true; clamp so it's always
    // increasing and never exceeds the SDK's gap limit.
    const captureMs = Number(url.searchParams.get("t"));
    const hasCapture = url.searchParams.has("t") && Number.isFinite(captureMs);
    let stepUs = FRAME_US;
    if (hasCapture && s.lastCaptureMs !== undefined) {
      stepUs = Math.min(
        MAX_GAP_US,
        Math.max(1_000, Math.round((captureMs - s.lastCaptureMs) * 1000)),
      );
    }
    if (hasCapture) s.lastCaptureMs = captureMs;
    const timestampUs = s.frames === 0 ? s.lastUs : s.lastUs + stepUs;
    s.lastUs = timestampUs;
    s.frames += 1;
    try {
      s.sdk.sendFrame(buffer, width, height, width * 4, PIXEL_FORMAT_RGBA, timestampUs);
    } catch {
      // transient frame errors are expected while the pipeline warms up
    }

    const rate = s.metrics?.breathing?.rate;
    return json({
      status: s.sdk.processingStatus,
      validation: { code: s.code, hint: s.hint },
      vitals: {
        breathingRate: latest(rate),
        breathingConfidence:
          Array.isArray(rate) && rate.length ? rate[rate.length - 1]?.confidence : undefined,
        chestMotion: latest(s.metrics?.breathing?.upperTrace),
      },
    });
  }

  if (url.pathname === "/api/vitals/stop") {
    const id = url.searchParams.get("sessionId") ?? "";
    await endSession(id);
    return json({ success: true });
  }

  return json({ error: "Not found" }, 404);
}
