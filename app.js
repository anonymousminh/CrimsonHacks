// Get DOM elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const helmetToggle = document.getElementById('helmetToggle');

// State management
let helmetEnabled = true;
let currentMask = 'helmet'; // 'helmet' or 'alien'

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
  // Draw Mars BG
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Optional: Compose person with BodyPix mask here (not covered now)

  // Draw the webcam (under helmet)
  ctx.save();
  ctx.globalAlpha = 0.99; // can tweak blending
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw overlay on detected faces
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    for (const landmarks of results.multiFaceLandmarks) {
      if (helmetEnabled) {
        if (currentMask === 'helmet') {
          drawHelmet(ctx, landmarks);
        } else if (currentMask === 'alien') {
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

// Add event listener for helmet toggle button
helmetToggle.addEventListener('click', toggleHelmet);

// Control Panel Toggle Functionality
const maskToggles = document.querySelectorAll('.mask-toggle');
const bgToggles = document.querySelectorAll('.bg-toggle');

// Face mask toggle functionality
maskToggles.forEach(toggle => {
  toggle.addEventListener('click', () => {
    // Remove active class from all mask toggles
    maskToggles.forEach(t => t.classList.remove('active'));
    // Add active class to clicked toggle
    toggle.classList.add('active');
    
    // Get the selected mask type
    const selectedMask = toggle.getAttribute('data-mask');
    currentMask = selectedMask;
    console.log('Selected face mask:', selectedMask);
    
    // Update helmet toggle button text based on selection
    if (selectedMask === 'helmet') {
      helmetToggle.textContent = helmetEnabled ? '🪖 Remove Helmet' : '👤 Show Helmet';
    } else if (selectedMask === 'alien') {
      helmetToggle.textContent = helmetEnabled ? '👽 Remove Alien' : '👤 Show Alien';
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
    console.log('Selected background:', selectedBg);
    
    // TODO: Implement background switching logic here
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
