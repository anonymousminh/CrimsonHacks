// Get DOM elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const helmetToggle = document.getElementById('helmetToggle');

// Helmet visibility state
let helmetEnabled = true;

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
    maxNumFaces: 10, // Allow detection of up to 10 faces
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

  // Draw the webcam (under helmet)
  ctx.save();
  ctx.globalAlpha = 0.99; // can tweak blending
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw helmet overlay on detected faces
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    for (const landmarks of results.multiFaceLandmarks) {
      if (helmetEnabled) {
        drawHelmet(ctx, landmarks);
      } else {
        // Draw face mesh landmarks when helmet is off
        //drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {color: "#00FF00", lineWidth: 1});
        //drawLandmarks(ctx, landmarks, {color: "#FF0000", lineWidth: 2});
      }
    }
  }
}

// Draw helmet overlay on face
function drawHelmet(ctx, landmarks) {
  // Get face bounding box from landmarks
  const faceBox = getFaceBoundingBox(landmarks);
  
  if (!faceBox) return;
  
  const { x, y, width, height } = faceBox;
  
  // Calculate helmet dimensions (slightly larger than face)
  const helmetPadding = 20;
  const helmetX = x - helmetPadding;
  const helmetY = y - helmetPadding * 1.5; // More padding on top for helmet dome
  const helmetWidth = width + helmetPadding * 2;
  const helmetHeight = height + helmetPadding * 2.5;
  
  // Save context for clipping
  ctx.save();
  
  // Draw helmet base (dark metallic)
  ctx.fillStyle = '#2C2C2C';
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 3;
  
  // Create helmet shape (rounded rectangle with dome top)
  ctx.beginPath();
  ctx.roundRect(helmetX, helmetY, helmetWidth, helmetHeight, 15);
  ctx.fill();
  ctx.stroke();
  
  // Draw helmet dome (top part)
  ctx.fillStyle = '#3A3A3A';
  ctx.beginPath();
  ctx.arc(helmetX + helmetWidth/2, helmetY + 30, helmetWidth/2 - 10, Math.PI, 0, false);
  ctx.fill();
  
  // Draw visor area (transparent)
  const visorY = helmetY + helmetHeight * 0.3;
  const visorHeight = helmetHeight * 0.4;
  
  // Create clipping path for visor
  ctx.beginPath();
  ctx.roundRect(helmetX + 10, visorY, helmetWidth - 20, visorHeight, 8);
  ctx.clip();
  
  // Draw webcam content in visor area (this makes it transparent)
  ctx.globalAlpha = 0.7; // Slight tint for visor effect
  ctx.drawImage(video, helmetX + 10, visorY, helmetWidth - 20, visorHeight, 
                helmetX + 10, visorY, helmetWidth - 20, visorHeight);
  
  ctx.restore();
  
  // Draw visor frame
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(helmetX + 10, visorY, helmetWidth - 20, visorHeight, 8);
  ctx.stroke();
  
  // Add some helmet details
  drawHelmetDetails(ctx, helmetX, helmetY, helmetWidth, helmetHeight);
}

// Get bounding box from face landmarks
function getFaceBoundingBox(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  landmarks.forEach(landmark => {
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// Draw additional helmet details
function drawHelmetDetails(ctx, x, y, width, height) {
  // Draw ventilation holes
  ctx.fillStyle = '#1A1A1A';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 20 + i * 15, y + height - 15, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw side details
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + width - 15, y + height * 0.2);
  ctx.lineTo(x + width - 5, y + height * 0.2);
  ctx.moveTo(x + width - 15, y + height * 0.8);
  ctx.lineTo(x + width - 5, y + height * 0.8);
  ctx.stroke();
}

// Draw loop for sending frames to MediaPipe
async function draw() {
  if (video.readyState === video.HAVE_ENOUGH_DATA && bgLoaded && faceMeshReady) {
    await faceMesh.send({image: video});
  }
  requestAnimationFrame(draw);
}

// Toggle helmet function
function toggleHelmet() {
  helmetEnabled = !helmetEnabled;
  
  if (helmetEnabled) {
    helmetToggle.textContent = '🪖 Remove Helmet';
    helmetToggle.classList.remove('helmet-off');
  } else {
    helmetToggle.textContent = '👤 Show Helmet';
    helmetToggle.classList.add('helmet-off');
  }
}

// Add event listener for toggle button
helmetToggle.addEventListener('click', toggleHelmet);

document.addEventListener('DOMContentLoaded', async () => {
  await initWebcam();
  await loadBodyPix(); // Mars background still handled by BodyPix if needed
  loadFaceMesh();
  draw();
});
