// Get DOM elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 640;
canvas.height = 480;

// Background image
const bgImg = new Image();
bgImg.src = 'mars_background.jpeg';
let bgLoaded = false;
bgImg.onload = () => { bgLoaded = true; };

// BodyPix model
let net = null;

// Webcam setup
async function initWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    video.srcObject = stream;
    video.play();
  } catch (error) {
    document.getElementById('container').innerHTML += 
      '<p style="color: red; margin-top: 20px;">❌ Webcam access denied. Please allow camera permission and refresh the page.</p>';
  }
}

// Load BodyPix (optional, for Mars
// background replacement effect)
async function loadBodyPix() {
  net = await bodyPix.load();
}

// --- MediaPipe Face Mesh Setup ---
let faceMesh, faceMeshReady = false;
function loadFaceMesh() {
  faceMesh = new FaceMesh({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  faceMesh.onResults(onFaceResults);
  faceMeshReady = true;
}

// Handle FaceMesh results (calls each time there's a frame with a face)
async function onFaceResults(results) {
  // Draw Mars BG
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Optional: Compose person with BodyPix mask here (not covered now)

  // Draw the webcam (under landmarks)
  ctx.save();
  ctx.globalAlpha = 0.99; // can tweak blending
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw face mesh landmarks
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {color: "#00FF00", lineWidth: 1});
      drawLandmarks(ctx, landmarks, {color: "#FF0000", lineWidth: 2});
    }
  }
}

// Draw loop for sending frames to MediaPipe
async function draw() {
  if (video.readyState === video.HAVE_ENOUGH_DATA && bgLoaded && faceMeshReady) {
    await faceMesh.send({image: video});
  }
  requestAnimationFrame(draw);
}

document.addEventListener('DOMContentLoaded', async () => {
  await initWebcam();
  await loadBodyPix(); // Mars background still handled by BodyPix if needed
  loadFaceMesh();
  draw();
});
