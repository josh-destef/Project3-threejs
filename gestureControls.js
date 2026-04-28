import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const MAX_TILT = 0.3;
const TRACKING_LANDMARK = 5;
const SMOOTH = 0.12;
const PINCH_THRESHOLD = 0.07;

export class GestureControls {
  constructor() {
    this._landmarker = null;
    this._video = null;
    this._running = false;
    this._lastVideoTime = -1;
    this._hands = [];
  }

  /** Call once at startup. Returns a Promise that resolves when ready. */
  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    this._landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });

    this._video = document.getElementById("webcam-preview");
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
    });
    this._video.srcObject = stream;
    await new Promise((res) => (this._video.onloadedmetadata = res));
    this._video.play();
  }

  /** Begin the detection loop. Call after init() resolves. */
  start() {
    this._running = true;
    this._detect();
  }

  /** Stop the detection loop and release the webcam. */
  stop() {
    this._running = false;
    this._video?.srcObject?.getTracks().forEach((t) => t.stop());
  }

  /**
   * Called every frame from main.js animate().
   * Returns null  → no hand detected, fall back to keyboard/touch.
   * Returns { rotX, rotZ, pinch } → hand visible.
   */
  getData() {
    return this._hands;
  }

  _detect() {
    if (!this._running) return;
    if (this._video.currentTime !== this._lastVideoTime) {
      this._lastVideoTime = this._video.currentTime;
      const results = this._landmarker.detectForVideo(this._video, performance.now());
      this._process(results);
    }
    requestAnimationFrame(() => this._detect());
  }

  _process(results) {
    this._hands = [];
    if (!results.landmarks) return;

    for (let i = 0; i < results.landmarks.length; i++) {
      const lm = results.landmarks[i];
      const handedness = results.handednesses[i][0].categoryName;
      const anchor = lm[TRACKING_LANDMARK];
      
      const dx = lm[4].x - lm[8].x;
      const dy = lm[4].y - lm[8].y;
      const pinch = Math.sqrt(dx * dx + dy * dy) < PINCH_THRESHOLD;

      // Estimate hand size (distance from wrist to middle finger base)
      const sdx = lm[0].x - lm[9].x;
      const sdy = lm[0].y - lm[9].y;
      const size = Math.sqrt(sdx * sdx + sdy * sdy);

      // Apply a bounding box constraint so the user doesn't have to reach the extreme edges
      const marginX = 0.15; // 15% margin on left and right
      const marginY = 0.15; // 15% margin on top and bottom
      
      // Remap and clamp x and y
      let mappedX = ((1 - anchor.x) - marginX) / (1 - 2 * marginX);
      let mappedY = (anchor.y - marginY) / (1 - 2 * marginY);
      
      mappedX = Math.max(0, Math.min(1, mappedX));
      mappedY = Math.max(0, Math.min(1, mappedY));

      this._hands.push({
        x: mappedX,
        y: mappedY,
        z: anchor.z,
        pinch: pinch,
        size: size,
        handedness: handedness,
        landmarks: lm
      });
    }
  }
}
