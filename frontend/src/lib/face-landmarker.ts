/** Blendshape category as returned by MediaPipe FaceLandmarker. */
export type Blendshape = { categoryName: string; score: number };

export type FaceLandmarkerLike = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => { faceBlendshapes?: { categories: Blendshape[] }[] };
  close?: () => void;
};

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/** Load MediaPipe FaceLandmarker (with blendshapes) in the browser, GPU first, CPU fallback. */
export async function loadFaceLandmarker(): Promise<FaceLandmarkerLike> {
  const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO" as const,
  });
  try {
    return await FaceLandmarker.createFromOptions(vision, options("GPU"));
  } catch (gpuErr) {
    console.warn("GPU delegate unavailable, falling back to CPU", gpuErr);
    return await FaceLandmarker.createFromOptions(vision, options("CPU"));
  }
}
