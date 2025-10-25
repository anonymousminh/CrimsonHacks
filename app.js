// Get DOM elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// State management
let helmetEnabled = false; // Start with overlays disabled
let currentMask = 'helmet'; // 'helmet' or 'alien'
let currentBackground = 'mars'; // 'mars' or 'space-station'

// Set canvas size to fill entire screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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
      video: { width: window.innerWidth, height: window.innerHeight } 
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
  // Step 1: Use BodyPix to segment person from background
  const segmentation = await net.segmentPerson(video, { internalResolution: 'medium' });
  console.log('BodyPix segmentation complete, background:', currentBackground);
  
  // Step 2: Draw background based on current selection
  if (currentBackground === 'mars') {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else if (currentBackground === 'space-station') {
    // Draw space station background (dark space with stars)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Step 3: Composite person with background using BodyPix segmentation
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixel = imageData.data;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const webcamData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Replace background pixels with selected background, keep person pixels from webcam
  for (let i = 0; i < pixel.length; i += 4) {
    const n = i / 4;
    if (segmentation.data[n] === 1) {
      // Person pixel: copy from webcam
      pixel[i] = webcamData.data[i];
      pixel[i + 1] = webcamData.data[i + 1];
      pixel[i + 2] = webcamData.data[i + 2];
      pixel[i + 3] = 255;
    }
    // Background pixels: keep selected background (already drawn)
  }
  ctx.putImageData(imageData, 0, 0);

  // Draw overlay on detected faces
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    console.log('Faces detected:', results.multiFaceLandmarks.length, 'helmetEnabled:', helmetEnabled, 'currentMask:', currentMask);
    for (const landmarks of results.multiFaceLandmarks) {
      if (helmetEnabled) {
        if (currentMask === 'helmet') {
          console.log('Drawing helmet');
          drawHelmet(ctx, landmarks);
        } else if (currentMask === 'alien') {
          console.log('Drawing alien');
          // Apply alien transformation to the face
          applyAlienTransformation(ctx, landmarks);
          // Draw alien antennas
          drawAlienAntennas(ctx, landmarks);
        }
      } else {
        // Draw face mesh landmarks when overlay is off
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
  const helmetPadding = 50;
  const offsetY = -40;
  const helmetX = x - helmetPadding;
  const helmetY = y - helmetPadding * 1.5+offsetY; // More padding on top for helmet dome
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
  ctx.globalAlpha = .5; // Slight tint for visor effect
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
  drawHelmetAdditionalDetails(ctx, helmetX, helmetY, helmetWidth, helmetHeight);
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
function drawHelmetAdditionalDetails(ctx, x, y, width, height) {
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

// Apply alien transformation to detected face
function applyAlienTransformation(ctx, landmarks) {
  const faceBox = getFaceBoundingBox(landmarks);
  if (!faceBox) return;
  
  const { x, y, width, height } = faceBox;
  const increaseRatio = 1.2;
  
  // Save context for face-specific transformation
  ctx.save();
  
  // Create clipping path for the face area only
  ctx.beginPath();
  ctx.ellipse(x + width/2, y + height/2, width/2 * increaseRatio, height/2 * increaseRatio, 0, 0, Math.PI * 2);
  ctx.clip();
  
  // Apply green alien skin color transformation
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#228B22'; // Forest green
  ctx.fillRect(x, y, width* increaseRatio, height* increaseRatio);
  
  // Add alien-like color variations
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = '#32CD32'; // Lime green
  ctx.fillRect(x, y, width* increaseRatio, height* increaseRatio);
  
  // Add some alien texture effect
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = '#90EE90'; // Light green
  ctx.fillRect(x, y, width* increaseRatio, height* increaseRatio  );
  
  ctx.restore();
}

// Draw alien antennas on the head
function drawAlienAntennas(ctx, landmarks) {
  const faceBox = getFaceBoundingBox(landmarks);
  if (!faceBox) return;
  
  const { x, y, width, height } = faceBox;
  const increaseRatio = 2.5;
  const centerX = x + width / 2;
  const antennaY = y - 20; // Above the head
  
  // Draw left antenna
  ctx.strokeStyle = '#228B22';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.2, antennaY);
  ctx.lineTo(centerX - width * 0.15, antennaY - 30*increaseRatio);
  ctx.stroke();
  
  // Draw right antenna
  ctx.beginPath();
  ctx.moveTo(centerX + width * 0.2, antennaY);
  ctx.lineTo(centerX + width * 0.15, antennaY - 30*increaseRatio);
  ctx.stroke();
  
  // Draw antenna tips (glowing orbs)
  ctx.fillStyle = '#32CD32';
  ctx.beginPath();
  ctx.arc(centerX - width * 0.15, antennaY - 30*increaseRatio, 6, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(centerX + width * 0.15, antennaY - 30*increaseRatio, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Add glow effect to antenna tips
  ctx.shadowColor = '#32CD32';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#90EE90';
  ctx.beginPath();
  ctx.arc(centerX - width * 0.15, antennaY - 30*increaseRatio, 3*increaseRatio, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(centerX + width * 0.15, antennaY - 30*increaseRatio, 3*increaseRatio, 0, Math.PI * 2);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowBlur = 0;
}

// Control Panel Toggle Functionality
const maskToggles = document.querySelectorAll('.mask-toggle');
const bgToggles = document.querySelectorAll('.bg-toggle');

// Face mask toggle functionality - handles both mask switching AND overlay toggling
maskToggles.forEach(toggle => {
  toggle.addEventListener('click', () => {
    const selectedMask = toggle.getAttribute('data-mask');
    
    // If clicking the same mask that's already active, toggle overlay on/off
    if (currentMask === selectedMask) {
      helmetEnabled = !helmetEnabled;
      console.log('Toggle overlay:', helmetEnabled ? 'ON' : 'OFF', 'for mask:', currentMask);
    } else {
      // If clicking a different mask, switch to that mask and turn overlay on
      currentMask = selectedMask;
      helmetEnabled = true;
      console.log('Switch to mask:', selectedMask, 'overlay:', 'ON');
    }
    
    // Update button states
    maskToggles.forEach(t => t.classList.remove('active'));
    toggle.classList.add('active');
    
    // Update button text to show current state
    if (helmetEnabled) {
      toggle.textContent = selectedMask === 'helmet' ? '🪖 Remove Helmet' : '👽 Remove Alien';
    } else {
      toggle.textContent = selectedMask === 'helmet' ? '🪖 Show Helmet' : '👽 Show Alien';
    }
  });
});

// Background toggle functionality
bgToggles.forEach(toggle => {
  toggle.addEventListener('click', () => {
    // Remove active class from all bg toggles
    bgToggles.forEach(t => t.classList.remove('active'));
    // Add active class to clicked toggle
    toggle.classList.add('active');
    
    // Get the selected background type
    const selectedBg = toggle.getAttribute('data-bg');
    currentBackground = selectedBg;
    console.log('Selected background:', selectedBg);
  });
});

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

document.addEventListener('DOMContentLoaded', async () => {
  await initWebcam();
  await loadBodyPix(); // Mars background still handled by BodyPix if needed
  loadFaceMesh();
  draw();
});
