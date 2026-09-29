# Presage SmartSpectra Chest & Respiration Monitoring: Developer Handover Guide

This guide contains everything you need to set up, run, and understand contactless **Presage SmartSpectra Chest & Respiration Monitoring** in web applications and containerized environments. It includes integration code, architecture explanations, camera capture requirements, critical bug fixes learned the hard way, and how to configure the **Presage MCP Server** and **Agent Skills** for your AI coding assistants.

---

## 1. Overview & Architecture

### What is SmartSpectra?
Presage Technologies' **SmartSpectra SDK** measures physiological vitals (breathing rate, chest/abdominal waveforms, pulse rate, HRV) directly from standard video frames using optical flow and remote photoplethysmography (rPPG).
- **Metric Computation is 100% On-Device:** Frames are processed locally within the SDK's native C++ engine.
- **Backend Gating Only:** The Presage API is contacted once at startup only to authenticate the API key and validate plan limits. Frame bytes never leave your machine/server.

### High-Level System Architecture
```
┌────────────────────────────────────────────────────────┐
│                   BROWSER / CLIENT                     │
│  - Webcam stream (640x480)                             │
│  - Downscaled to 320x240 via Hidden <canvas>           │
│  - Non-overlapping sequential frame dispatch (~30 FPS) │
│  - Real-time Vitals HUD (RPM, Chest Motion, Guidance)  │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/vitals/frame (ArrayBuffer RGBA)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 NODE.JS SERVER (SSR)                   │
│  - @smartspectra/node-sdk (Native C++ FFI runtime)     │
│  - Synthetic Monotonic 30 FPS Timestamp Generator      │
│  - Minimal On-Device Metrics: [0, 2] (Chest + Rate)    │
│  - Protobuf Decoder: decodeMetrics(buf)                │
└───────────────────────────┬────────────────────────────┘
                            │ Returns { vitals, validation, status }
                            ▼
┌────────────────────────────────────────────────────────┐
│                   SQLITE / DATABASE                    │
│  - Reactions table stores { heart_rate, breathing_rate }│
│  - Analytics & AI Chat summarize physiological trends   │
└────────────────────────────────────────────────────────┘
```

---

## 2. AI Coding Tools: MCP Server & Skills Setup

If you or your team use AI coding tools (Claude Code, Cursor, Windsurf, Antigravity, Codex), configuring the official Presage MCP server and skills gives your assistant direct access to the documentation, live SDK types, and API keys.

### A. Configuring the Hosted Presage MCP Server

Presage hosts an official MCP server at `https://mcp.presagetech.com/mcp`. It exposes tools for searching documentation (`docs.search`), reading full doc pages (`docs.read`), managing developer API keys (`api_keys.get`), and checking usage.

#### For Antigravity / Claude Code / Custom Agent Configurations:
Create or edit `.agents/mcp_config.json`:
```json
{
  "mcpServers": {
    "presagetech": {
      "serverUrl": "https://mcp.presagetech.com/mcp"
    }
  }
}
```

#### For Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "presagetech": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.presagetech.com/mcp"]
    }
  }
}
```

#### For Cursor (`~/.cursor/mcp.json` or Workspace Settings):
```json
{
  "mcpServers": {
    "presagetech": {
      "url": "https://mcp.presagetech.com/mcp"
    }
  }
}
```

---

### B. Installing the `using-smartspectra` Agent Skill

Presage publishes an AI agent skill that teaches models the entire API lifecycle, enum codes, protobuf schemas, and best practices.

1. Create directory:
   ```bash
   mkdir -p .agents/skills/using-smartspectra
   ```
2. Download or copy the skill file:
   ```bash
   curl -s https://smartspectra.presagetech.com/skill.md -o .agents/skills/using-smartspectra/SKILL.md
   ```
3. When using an agent, invoke the skill or mention `@using-smartspectra` whenever working on vital signal pipelines.

---

## 3. Critical Lessons Learned & Troubleshooting (Must-Read!)

During our production integration in Docker/Node.js, we diagnosed four major failure modes. Avoid these pitfalls:

### Pitfall 1: Encrypted Neural Models Fail in Headless Linux / Docker
- **The Issue:** Requesting `cardioMetrics` (such as `16: ARTERIAL_PRESSURE_TRACE` or `17: HRV`), `edaMetrics`, or `faceMetrics` (`14: EXPRESSIONS`) causes the C++ engine to download encrypted neural weights. On Linux, the decryptor requests the Linux FreeDesktop Secret Service via D-Bus:
  ```
  Load secret 'key_id' failed: D-Bus Secret Service is not reachable (Cannot autolaunch D-Bus without X11 $DISPLAY).
  Calculator::Open() for node "...PhysiologyInferenceCalculator" failed: device_id is required for remote model download
  SmartSpectra Error [3]: SmartSpectra configuration failed.
  ```
- **The Solution:** Stick to the pure **on-device breathing bundle** (`[0, 2]`).
  - `0`: `CHEST_BREATHING` (real-time chest thoracic expansion trace)
  - `2`: `BREATHING_RATE` (respiratory rate in RPM)
  These metrics use classical rPPG physics and optical flow. They run **100% locally on CPU without remote downloads, without D-Bus, and without X11**.

### Pitfall 2: Timestamp Jitter & Network Gap Errors (`Error [11]` & `Error [8]`)
- **The Issue:** If the client browser streams webcam frames over HTTP using `performance.now()`, network latency or frame buffering produces non-monotonic timestamps or gaps (>100ms). The C++ graph will panic:
  ```
  SmartSpectra Error [11]: SmartSpectra detected a gap between camera frame timestamps.
  SmartSpectra Error [8]: SmartSpectra processing failed.
  ```
- **The Solution:**
  1. **Client-side lock (`isSendingFrameRef`):** Ensure only one frame request is in-flight at a time. Never launch concurrent frame uploads.
  2. **Server-side synthetic timeline:** Rather than trusting network arrival timestamps, generate a monotonic 30 FPS timeline on the server:
     ```ts
     const frameIndex = (sessionFrameCounts.get(sessionId) || 0) + 1;
     sessionFrameCounts.set(sessionId, frameIndex);
     const timestampUs = 1000000 + frameIndex * 33333; // Exactly 33,333µs spacing
     sdk.sendFrame(buffer, width, height, stride, 2, timestampUs);
     ```

### Pitfall 3: The 30-Second Warm-up Window & Zero Confidence
- **The Issue:** New users often expect `breathingRate` immediately on the first frame. For the first ~25–30 seconds, `breathingRate` will be empty or report confidence `0`.
- **The Solution:**
  - This is expected physics: breathing cycles take 3–5 seconds per breath, requiring ~30 seconds of continuous data to compute a stable Fourier/peak frequency.
  - **What to display during warm-up:**
    - Live **`Chest Motion`** (`metrics.breathing.upperTrace`), which streams active thoracic movement values immediately.
    - Live **`ValidationStatus` hints** (`"Hold still and record"`, `"Increase light on face"`, `"Center face"`, `"Chest not visible"`).

### Pitfall 4: SDK Reset Cooldown
- **The Issue:** If an error occurs and you call `sdk.reset()` on every frame, you will spam the Presage auth servers and trigger `HTTP 429 Too Many Requests` or `502 Bad Gateway`.
- **The Solution:** Impose a **3-second cooldown** on `sdk.reset()` calls.

---

## 4. Complete Server Implementation (`server.ts`)

Here is the clean, verified Node.js SSR proxy implementation:

```typescript
import { SmartSpectraSDK, decodeMetrics } from "@smartspectra/node-sdk";
import { createRequire } from "node:module";
import path from "node:path";

// 1. One-time low-level FFI preconfiguration for Linux cache path
try {
  const req = createRequire(import.meta.url);
  const sdkEntry = req.resolve("@smartspectra/node-sdk");
  const ffiPath = path.join(path.dirname(sdkEntry), "ffi.js");
  const ffi = req(ffiPath);
  if (typeof ffi?.preconfigure === "function") {
    ffi.preconfigure("/tmp/smartspectra", "app-docker-device");
  }
} catch (e) {
  console.warn("SmartSpectra preconfigure notice:", e);
}

const smartSpectraSessions = new Map<string, SmartSpectraSDK>();
const lastMetrics = new Map<string, any>();
const lastValidation = new Map<string, { code: number; hint: string; timestamp: number }>();
const sessionFrameCounts = new Map<string, number>();

export async function handleSmartSpectraApi(request: Request, url: URL): Promise<Response | null> {
  // START SESSION
  if (url.pathname === "/api/vitals/start") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const sessionId = Math.random().toString(36).slice(2);
    try {
      const sdk = new SmartSpectraSDK({
        apiKey: process.env.SMARTSPECTRA_API_KEY || "YOUR_KEY",
        requestedMetrics: [0, 2], // 0: CHEST_BREATHING (trace), 2: BREATHING_RATE (RPM)
        enableTelemetry: false,
        logLevel: 3, // kError (quiet in production)
      });

      sdk.on("metrics", (buf, ts) => {
        try {
          const decoded = decodeMetrics(buf);
          lastMetrics.set(sessionId, { timestamp: ts, data: decoded });
        } catch {
          lastMetrics.set(sessionId, { timestamp: ts, error: "Decode error" });
        }
      });

      sdk.on("validationStatus", (code, ts, hint) => {
        lastValidation.set(sessionId, { code, hint, timestamp: ts });
      });

      sdk.on("error", (code, msg) => {
        console.error(`SmartSpectra Error [${code}]: ${msg}`);
      });

      sdk.useCustomInput();
      sdk.start();
      smartSpectraSessions.set(sessionId, sdk);

      return new Response(JSON.stringify({ sessionId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Failed to start SmartSpectra:", err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  // PUSH FRAME
  if (url.pathname === "/api/vitals/frame") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const sessionId = url.searchParams.get("sessionId");
    const width = parseInt(url.searchParams.get("width") || "0");
    const height = parseInt(url.searchParams.get("height") || "0");
    if (!sessionId || !smartSpectraSessions.has(sessionId)) {
      return new Response("Session not found", { status: 404 });
    }

    const sdk = smartSpectraSessions.get(sessionId)!;

    // Error recovery with 3-second rate limit cooldown
    if (sdk.processingStatus === 5) { // 5 = kError
      const now = Date.now();
      const lastReset = (sdk as any)._lastResetTime || 0;
      if (now - lastReset > 3000) {
        (sdk as any)._lastResetTime = now;
        console.log(`[Frame] Resetting SDK pipeline after error...`);
        try {
          sdk.reset();
          sdk.useCustomInput();
          sdk.start();
        } catch (e: any) {
          console.error(`[Frame] Reset failed:`, e.message);
        }
      }
      return new Response(JSON.stringify({ status: 5, error: "SDK in error state" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stride = width * 4; // RGBA = 4 bytes per pixel

    if (width <= 0 || height <= 0 || buffer.length !== stride * height) {
      return new Response("Invalid dimensions or buffer size", { status: 400 });
    }

    // Synthetic 30 FPS timeline (33,333 microseconds per frame)
    const frameIndex = (sessionFrameCounts.get(sessionId) || 0) + 1;
    sessionFrameCounts.set(sessionId, frameIndex);
    const timestampUs = 1000000 + frameIndex * 33333;

    try {
      // 2 = PixelFormat.kRGBA
      sdk.sendFrame(buffer, width, height, stride, 2, timestampUs);
    } catch (e) {
      // Ignore transient frame errors
    }

    const rawMetrics = lastMetrics.get(sessionId) || {};
    const validation = lastValidation.get(sessionId) || { code: 0, hint: "Tracking..." };
    const decoded = rawMetrics.data;

    const latestVal = (arr: any[]) => Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1]?.value : undefined;

    const payload = {
      status: sdk.processingStatus,
      validation: {
        code: validation.code,
        hint: validation.hint,
      },
      vitals: {
        breathingRate: latestVal(decoded?.breathing?.rate),
        chestMotion: latestVal(decoded?.breathing?.upperTrace),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // STOP SESSION
  if (url.pathname === "/api/vitals/stop") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { sessionId } = await request.json();
    const sdk = smartSpectraSessions.get(sessionId);
    if (sdk) {
      sdk.stop();
      sdk.destroy();
      smartSpectraSessions.delete(sessionId);
      lastMetrics.delete(sessionId);
      sessionFrameCounts.delete(sessionId);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return null;
}
```

---

## 5. Complete Client Implementation (React + Canvas)

### A. Non-Overlapping Sequential Frame Dispatch Loop
In your camera tracking component:

```tsx
import React, { useRef, useState, useEffect, useCallback } from "react";

export function VitalCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const isSendingFrameRef = useRef<boolean>(false);
  const lastDispatchTimeRef = useRef<number>(0);
  const ssSessionIdRef = useRef<string | null>(null);

  const [liveVitals, setLiveVitals] = useState<{
    br?: number;
    chestMotion?: number;
    hint?: string;
  }>({});

  // 1. Start SmartSpectra session on server
  useEffect(() => {
    let activeSession: string | null = null;
    fetch("/api/vitals/start", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.sessionId) {
          ssSessionIdRef.current = data.sessionId;
          activeSession = data.sessionId;
        }
      });

    return () => {
      if (activeSession) {
        fetch("/api/vitals/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession }),
        });
      }
    };
  }, []);

  // 2. Continuous frame pump (~30 FPS, non-overlapping)
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;
    const sessionId = ssSessionIdRef.current;

    if (video && canvas && sessionId && video.readyState >= 2 && !video.paused) {
      const now = performance.now();

      // Ensure 33ms spacing (30 FPS) and no concurrent HTTP requests
      if (!isSendingFrameRef.current && now - lastDispatchTimeRef.current >= 33) {
        lastDispatchTimeRef.current = now;
        isSendingFrameRef.current = true;

        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          fetch(`/api/vitals/frame?sessionId=${sessionId}&width=320&height=240`, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: imgData.data.buffer,
          })
            .then((res) => res.json())
            .then((data) => {
              if (data?.vitals) {
                setLiveVitals({
                  br: data.vitals.breathingRate,
                  chestMotion: data.vitals.chestMotion,
                  hint: data.validation?.hint,
                });
              }
            })
            .catch(console.error)
            .finally(() => {
              isSendingFrameRef.current = false;
            });
        }
      }
    }

    requestAnimationFrame(processFrame);
  }, []);

  useEffect(() => {
    const frameId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(frameId);
  }, [processFrame]);

  return (
    <div className="relative w-[320px] h-[240px] rounded-xl overflow-hidden bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Real-Time Vitals HUD */}
      <div className="absolute top-2 left-2 right-2 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex justify-between items-center px-1">
          {/* Respiration RPM */}
          <div className="bg-black/80 text-white text-[11px] px-3 py-1.5 rounded-lg shadow border border-white/10 flex items-center gap-2">
            <span className="text-cyan-400 text-sm">🫁</span>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Respiration</span>
              <span className="font-mono font-bold text-white">
                {liveVitals.br && liveVitals.br > 0 ? `${liveVitals.br.toFixed(0)} RPM` : "Calculating..."}
              </span>
            </div>
          </div>

          {/* Chest Motion Indicator */}
          {liveVitals.chestMotion !== undefined && (
            <div className="bg-emerald-950/80 text-emerald-300 text-[10px] px-2.5 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Chest Motion: Active</span>
            </div>
          )}
        </div>

        {/* SmartSpectra Sensor Guidance Banner */}
        {liveVitals.hint && liveVitals.hint !== "Valid" && (
          <div className="self-center bg-amber-500/90 text-black text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 animate-pulse">
            <span>⚠️</span>
            <span>{liveVitals.hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6. Dockerfile & Container Setup

Ensure your Docker container installs `dbus` (generating `/var/lib/dbus/machine-id` so the native C++ runtime has a unique host identifier):

```dockerfile
FROM node:22-bookworm-slim

WORKDIR /app

# Install CA certificates for SSL and dbus for unique machine-id
RUN apt-get update && apt-get install -y ca-certificates dbus && \
    dbus-uuidgen > /var/lib/dbus/machine-id && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

---

## 7. Camera & Measurement Checklist for Users

Because SmartSpectra reads subtle pixel motion and color shifts, coach users on these 5 physical setup conditions:

| Condition | Requirement |
| :--- | :--- |
| **Lighting** | Even, diffuse light on the face and upper torso. Avoid heavy backlighting (windows behind subject). |
| **Framing** | Both **face** and **upper chest** must be visible in frame. If framed as a tight headshot, chest tracking will report `Chest not visible`. |
| **Camera Stability** | Place the laptop/camera on a stable surface (desk/stand). Handheld shaking degrades chest motion tracking. |
| **Stillness** | Remain relatively still during measurement. Avoid speaking or laughing continuously during breathing warm-up. |
| **Patience** | Wait **30 seconds** for the initial `breathingRate` calculation. The `Chest Motion: Active` badge confirms the sensor is successfully reading movement immediately. |

---

## 8. Verification Commands

To test your running server locally or inside Docker:

```bash
# 1. Start a test session
curl -s -X POST http://localhost:3000/api/vitals/start
# Response: {"sessionId":"abc123xyz"}

# 2. Push a blank test frame (320x240 RGBA = 307200 bytes)
node -e '
const buf = Buffer.alloc(320 * 240 * 4);
fetch("http://localhost:3000/api/vitals/frame?sessionId=abc123xyz&width=320&height=240", {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: buf
}).then(r => r.json()).then(console.log);
'
# Response: { status: 3, validation: { code: 5, hint: "Increase light on face." }, vitals: {} }

# 3. Stop session
curl -s -X POST http://localhost:3000/api/vitals/stop \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"abc123xyz"}'
# Response: {"success":true}
```
