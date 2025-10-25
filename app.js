// Get DOM elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// State management
let helmetEnabled = false; // Start with overlays disabled
let currentMask = 'helmet'; // 'helmet' or 'alien'
let currentBackground = 'mars'; // 'mars' or 'space-station'
let martianGirlfriendEnabled = false; // Martian girlfriend overlay

// Helmet customization
let helmetColor = 'white';
let helmetStyle = 'classic';

// Helmet color mapping
function getHelmetColor(colorName) {
  const colors = {
    'white': { base: '#F8F8F8', highlight: '#FFFFFF', shadow: '#B8B8B8', stroke: '#A0A0A0' },
    'silver': { base: '#C0C0C0', highlight: '#E0E0E0', shadow: '#808080', stroke: '#606060' },
    'blue': { base: '#4169E1', highlight: '#6495ED', shadow: '#191970', stroke: '#000080' }
  };
  return colors[colorName] || colors['white'];
}

// Alien customization
let alienColor = 'green'; // Default

// Colors mapping for aliens
function getAlienColors(colorName) {
  // Main skin, highlight, accent, antenna
  const colors = {
    'green': {
      base: '#228B22', overlay: '#32CD32', texture: '#90EE90', antenna: '#32CD32', glow: '#90EE90'
    },
    'blue': {
      base: '#0080ff', overlay: '#00f0ff', texture: '#bfe9ff', antenna: '#00bfff', glow: '#bfe9ff'
    },
    'purple': {
      base: '#8000ff', overlay: '#a066ff', texture: '#dfbfff', antenna: '#bf80ff', glow: '#dfbfff'
    },
    'pink': {
      base: '#ff0080', overlay: '#ff66b3', texture: '#ffc0e1', antenna: '#ff66b3', glow: '#ffc0e1'
    }
  };
  return colors[colorName] || colors['green'];
}

// Set canvas size to fill entire screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Background images
const bgImg = new Image();
bgImg.src = 'mars_background.jpeg';
let bgLoaded = false;
bgImg.onload = () => { bgLoaded = true; };

const spaceStationImg = new Image();
spaceStationImg.src = 'space_station.jpg';
let spaceStationLoaded = false;
spaceStationImg.onload = () => { spaceStationLoaded = true; };

const martianGirlfriendImg = new Image();
martianGirlfriendImg.src = 'Gemini_Generated_Image_cu2irbcu2irbcu2i.png';
let martianGirlfriendLoaded = false;
martianGirlfriendImg.onload = () => { martianGirlfriendLoaded = true; };

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
    // Draw space station background
    if (spaceStationLoaded) {
      // Option 1: Stretch to fill (might look pixelated if image is small)
      ctx.drawImage(spaceStationImg, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback: dark space while image loads
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else if (currentBackground === 'fly-through-space') {
    // Use the existing star animation for fly-through space
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
  
  // Draw Martian girlfriend overlay if enabled
  if (martianGirlfriendEnabled && martianGirlfriendLoaded) {
    drawMartianGirlfriendOverlay(ctx);
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
  
  // Draw based on selected style
  if (helmetStyle === 'modern') {
    drawModernHelmet(ctx, helmetX, helmetY, helmetWidth, helmetHeight);
  } else {
    // Classic style (existing implementation)
    drawClassicHelmet(ctx, helmetX, helmetY, helmetWidth, helmetHeight);
  }
}

// Draw classic astronaut helmet
function drawClassicHelmet(ctx, helmetX, helmetY, helmetWidth, helmetHeight) {
  // Save context for clipping
  ctx.save();
  
  // Get selected helmet color
  const helmetColors = getHelmetColor(helmetColor);
  
  // Draw realistic astronaut helmet base with 3D metallic effects using selected color
  const baseGradient = ctx.createLinearGradient(helmetX, helmetY, helmetX + helmetWidth, helmetY + helmetHeight);
  baseGradient.addColorStop(0, helmetColors.highlight); // Bright highlight
  baseGradient.addColorStop(0.2, helmetColors.base); // Base color
  baseGradient.addColorStop(0.4, helmetColors.base); // Base color
  baseGradient.addColorStop(0.6, helmetColors.shadow); // Shadow
  baseGradient.addColorStop(0.8, helmetColors.shadow); // Darker shadow
  baseGradient.addColorStop(1, helmetColors.highlight); // Light metallic highlight
  
  ctx.fillStyle = baseGradient;
  ctx.strokeStyle = helmetColors.stroke;
  ctx.lineWidth = 2;
  
  // Create helmet shape (rounded rectangle with dome top)
  ctx.beginPath();
  ctx.roundRect(helmetX, helmetY, helmetWidth, helmetHeight, 15);
  ctx.fill();
  ctx.stroke();
  
  // Draw helmet dome with 3D radial gradient for realistic curvature
  const domeCenterX = helmetX + helmetWidth/2;
  const domeCenterY = helmetY + 30;
  const domeRadius = helmetWidth/2 - 10;
  
  const domeGradient = ctx.createRadialGradient(domeCenterX, domeCenterY, 0, domeCenterX, domeCenterY, domeRadius);
  domeGradient.addColorStop(0, helmetColors.highlight); // Bright center highlight
  domeGradient.addColorStop(0.3, helmetColors.base); // Light metallic
  domeGradient.addColorStop(0.6, helmetColors.base); // Medium color
  domeGradient.addColorStop(0.9, helmetColors.shadow); // Darker color
  domeGradient.addColorStop(1, helmetColors.shadow); // Dark edge for depth
  
  ctx.fillStyle = domeGradient;
  ctx.beginPath();
  ctx.arc(domeCenterX, domeCenterY, domeRadius, Math.PI, 0, false);
  ctx.fill();
  
  // Add dome rim with metallic shine
  ctx.strokeStyle = '#909090';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(domeCenterX, domeCenterY, domeRadius, Math.PI, 0, false);
  ctx.stroke();
  
  // Draw realistic blue visor with astronaut helmet styling
  const visorY = helmetY + helmetHeight * 0.3;
  const visorHeight = helmetHeight * 0.4;
  const visorX = helmetX + 10;
  const visorWidth = helmetWidth - 20;
  
  // Create clipping path for visor
  ctx.beginPath();
  ctx.roundRect(visorX, visorY, visorWidth, visorHeight, 8);
  ctx.clip();
  
  // Draw webcam content in visor area
  ctx.globalAlpha = 0.85; // Good visibility
  ctx.drawImage(video, visorX, visorY, visorWidth, visorHeight, 
                visorX, visorY, visorWidth, visorHeight);
  
  // Add realistic blue visor tint for astronaut helmet
  ctx.globalCompositeOperation = 'multiply';
  const blueVisorGradient = ctx.createLinearGradient(visorX, visorY, visorX + visorWidth, visorY + visorHeight);
  blueVisorGradient.addColorStop(0, 'rgba(100, 150, 255, 0.3)'); // Light blue
  blueVisorGradient.addColorStop(0.3, 'rgba(80, 130, 240, 0.4)'); // Medium blue
  blueVisorGradient.addColorStop(0.7, 'rgba(60, 110, 220, 0.35)'); // Darker blue
  blueVisorGradient.addColorStop(1, 'rgba(90, 140, 250, 0.32)'); // Light blue
  
  ctx.fillStyle = blueVisorGradient;
  ctx.fillRect(visorX, visorY, visorWidth, visorHeight);
  
  // Add subtle reflection highlights
  ctx.globalCompositeOperation = 'screen';
  const reflectionGradient = ctx.createLinearGradient(visorX, visorY, visorX + visorWidth, visorY + visorHeight);
  reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); // Top reflection
  reflectionGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)'); // Upper reflection
  reflectionGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)'); // Lower reflection
  reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0.12)'); // Bottom reflection
  
  ctx.fillStyle = reflectionGradient;
  ctx.fillRect(visorX, visorY, visorWidth, visorHeight);
  
  ctx.restore();
  
  // Draw realistic visor frame with white metallic appearance
  const frameGradient = ctx.createLinearGradient(visorX, visorY, visorX + visorWidth, visorY + visorHeight);
  frameGradient.addColorStop(0, '#D0D0D0'); // Light metallic
  frameGradient.addColorStop(0.3, '#B0B0B0'); // Medium metallic
  frameGradient.addColorStop(0.7, '#A0A0A0'); // Darker metallic
  frameGradient.addColorStop(1, '#C0C0C0'); // Light metallic
  
  ctx.strokeStyle = frameGradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(visorX, visorY, visorWidth, visorHeight, 8);
  ctx.stroke();
  
  // Add visor seal with white metallic appearance
  ctx.strokeStyle = '#909090';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(visorX - 1, visorY - 1, visorWidth + 2, visorHeight + 2, 9);
  ctx.stroke();
  
  // Add some helmet details
  drawHelmetAdditionalDetails(ctx, helmetX, helmetY, helmetWidth, helmetHeight);
}

// Draw modern helmet with circular design and orange accents
function drawModernHelmet(ctx, helmetX, helmetY, helmetWidth, helmetHeight) {
  // Save context for clipping
  ctx.save();
  
  // Get selected helmet color
  const helmetColors = getHelmetColor(helmetColor);
  
  // Create a more circular helmet shape
  const centerX = helmetX + helmetWidth / 2;
  const centerY = helmetY + helmetHeight / 2;
  const radius = Math.min(helmetWidth, helmetHeight) / 2;
  
  // Draw main circular helmet body
  const mainGradient = ctx.createRadialGradient(centerX, centerY - radius/3, 0, centerX, centerY, radius);
  mainGradient.addColorStop(0, helmetColors.highlight);
  mainGradient.addColorStop(0.3, helmetColors.base);
  mainGradient.addColorStop(0.7, helmetColors.shadow);
  mainGradient.addColorStop(1, helmetColors.shadow);
  
  ctx.fillStyle = mainGradient;
  ctx.strokeStyle = helmetColors.stroke;
  ctx.lineWidth = 2;
  
  // Create circular helmet shape
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Draw the main dome (more pronounced circular dome)
  const domeRadius = radius * 0.85;
  const domeCenterY = centerY - radius * 0.1;
  
  const domeGradient = ctx.createRadialGradient(centerX, domeCenterY, 0, centerX, domeCenterY, domeRadius);
  domeGradient.addColorStop(0, helmetColors.highlight);
  domeGradient.addColorStop(0.4, helmetColors.base);
  domeGradient.addColorStop(0.8, helmetColors.shadow);
  domeGradient.addColorStop(1, helmetColors.shadow);
  
  ctx.fillStyle = domeGradient;
  ctx.beginPath();
  ctx.arc(centerX, domeCenterY, domeRadius, Math.PI, 0, false);
  ctx.fill();
  
  // Draw circular visor with dark tint
  const visorRadius = radius * 0.6;
  const visorCenterY = centerY + radius * 0.1;
  
  // Dark circular visor
  ctx.fillStyle = 'rgba(20, 20, 40, 0.8)'; // Dark blue-black visor
  ctx.beginPath();
  ctx.arc(centerX, visorCenterY, visorRadius, Math.PI, 0, false);
  ctx.fill();
  
  // Orange circular visor frame (key feature of modern helmet)
  ctx.strokeStyle = '#FF6B35'; // Orange frame
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centerX, visorCenterY, visorRadius, Math.PI, 0, false);
  ctx.stroke();
  
  // Draw side protrusions (communication devices) - more circular
  const sideProtrusionRadius = 12;
  const sideProtrusionY = centerY + radius * 0.2;
  
  // Left side protrusion
  ctx.fillStyle = '#FF6B35'; // Orange
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.7, sideProtrusionY, sideProtrusionRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Right side protrusion
  ctx.beginPath();
  ctx.arc(centerX + radius * 0.7, sideProtrusionY, sideProtrusionRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Add circular panel lines
  ctx.strokeStyle = helmetColors.stroke;
  ctx.lineWidth = 2;
  
  // Top circular panel line
  ctx.beginPath();
  ctx.arc(centerX, centerY - radius * 0.3, radius * 0.8, Math.PI, 0, false);
  ctx.stroke();
  
  // Add small orange details/buttons in a circular pattern
  ctx.fillStyle = '#FF6B35';
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 0.8) + (i * Math.PI * 0.4 / 3);
    const buttonX = centerX + Math.cos(angle) * radius * 0.7;
    const buttonY = centerY + Math.sin(angle) * radius * 0.3;
    ctx.beginPath();
    ctx.arc(buttonX, buttonY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add a small circular sensor on top
  ctx.fillStyle = '#FF6B35';
  ctx.beginPath();
  ctx.arc(centerX + radius * 0.3, centerY - radius * 0.4, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Add small circular details around the helmet
  ctx.fillStyle = helmetColors.stroke;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const detailX = centerX + Math.cos(angle) * radius * 0.9;
    const detailY = centerY + Math.sin(angle) * radius * 0.9;
    ctx.beginPath();
    ctx.arc(detailX, detailY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

// Draw Martian girlfriend overlay (small image next to face)
function drawMartianGirlfriendOverlay(ctx) {
  // Position the Martian girlfriend to the right of the customization panel
  const overlayWidth = canvas.width * 0.15; // 15% of screen width (smaller)
  const overlayHeight = canvas.height * 0.25; // 25% of screen height (smaller)
  
  // Position to the right of the customization panel (which is on the left side)
  const customizationPanelWidth = 300; // Approximate width of customization panel
  const overlayX = customizationPanelWidth + 20; // 20px to the right of panel
  const overlayY = canvas.height * 0.2; // 20% from top (moved lower)
  
  // Draw the Martian girlfriend image
  ctx.drawImage(martianGirlfriendImg, overlayX, overlayY, overlayWidth, overlayHeight);
  
  // Add a subtle border/frame
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 3;
  ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
  
  // Add a subtle shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
  ctx.shadowBlur = 0;
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

// Draw additional helmet details with white astronaut helmet styling
function drawHelmetAdditionalDetails(ctx, x, y, width, height) {
  // Draw ventilation holes with white metallic appearance
  const ventGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
  ventGradient.addColorStop(0, '#C0C0C0');
  ventGradient.addColorStop(1, '#808080');
  
  ctx.fillStyle = ventGradient;
  for (let i = 0; i < 3; i++) {
    const ventX = x + 20 + i * 15;
    const ventY = y + height - 15;
    
    ctx.save();
    ctx.translate(ventX, ventY);
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Draw side details with white metallic appearance
  const sideGradient = ctx.createLinearGradient(x + width - 15, y + height * 0.2, x + width - 5, y + height * 0.2);
  sideGradient.addColorStop(0, '#B0B0B0');
  sideGradient.addColorStop(1, '#D0D0D0');
  
  ctx.strokeStyle = sideGradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + width - 15, y + height * 0.2);
  ctx.lineTo(x + width - 5, y + height * 0.2);
  ctx.moveTo(x + width - 15, y + height * 0.8);
  ctx.lineTo(x + width - 5, y + height * 0.8);
  ctx.stroke();
  
  // Add subtle surface texture for realistic white metallic appearance
  addWhiteHelmetSurfaceTexture(ctx, x, y, width, height);
}

// Add subtle surface texture for realistic white metallic astronaut helmet
function addWhiteHelmetSurfaceTexture(ctx, x, y, width, height) {
  ctx.save();
  
  // Add subtle metallic highlights
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.08;
  
  for (let i = 0; i < 30; i++) {
    const highlightX = x + Math.random() * width;
    const highlightY = y + Math.random() * height;
    const highlightSize = Math.random() * 3 + 1;
    
    ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
    ctx.beginPath();
    ctx.arc(highlightX, highlightY, highlightSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add subtle metallic scratches
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.03;
  ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 8; i++) {
    const scratchX = x + Math.random() * width;
    const scratchY = y + Math.random() * height;
    const scratchLength = Math.random() * 25 + 10;
    
    ctx.beginPath();
    ctx.moveTo(scratchX, scratchY);
    ctx.lineTo(scratchX + scratchLength, scratchY);
    ctx.stroke();
  }
  
  // Add subtle shadow effects for 3D depth
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
  
  // Add shadow along edges
  ctx.fillRect(x, y, width, 2); // Top edge
  ctx.fillRect(x, y + height - 2, width, 2); // Bottom edge
  ctx.fillRect(x, y, 2, height); // Left edge
  ctx.fillRect(x + width - 2, y, 2, height); // Right edge
  
  ctx.restore();
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
  // Use selected color set
  const c = getAlienColors(alienColor);
  // Alien main skin tone
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = c.base;
  ctx.fillRect(x, y, width*increaseRatio, height*increaseRatio);
  // Overlay highlight
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = c.overlay;
  ctx.fillRect(x, y, width*increaseRatio, height*increaseRatio);
  // Texture
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = c.texture;
  ctx.fillRect(x, y, width*increaseRatio, height*increaseRatio);
  ctx.restore();
}

function drawAlienAntennas(ctx, landmarks) {
  const faceBox = getFaceBoundingBox(landmarks);
  if (!faceBox) return;
  const { x, y, width, height } = faceBox;
  const increaseRatio = 2.5;
  const centerX = x + width / 2;
  const antennaY = y - 20;
  const c = getAlienColors(alienColor);
  // Left antenna
  ctx.strokeStyle = c.base;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.2, antennaY);
  ctx.lineTo(centerX - width * 0.15, antennaY - 30*increaseRatio);
  ctx.stroke();
  // Right antenna
  ctx.beginPath();
  ctx.moveTo(centerX + width * 0.2, antennaY);
  ctx.lineTo(centerX + width * 0.15, antennaY - 30*increaseRatio);
  ctx.stroke();
  // Antenna tips
  ctx.fillStyle = c.antenna;
  ctx.beginPath();
  ctx.arc(centerX - width * 0.15, antennaY - 30*increaseRatio, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + width * 0.15, antennaY - 30*increaseRatio, 6, 0, Math.PI * 2);
  ctx.fill();
  // Glow effect
  ctx.shadowColor = c.antenna;
  ctx.shadowBlur = 10;
  ctx.fillStyle = c.glow;
  ctx.beginPath();
  ctx.arc(centerX - width * 0.15, antennaY - 30*increaseRatio, 3*increaseRatio, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + width * 0.15, antennaY - 30*increaseRatio, 3*increaseRatio, 0, Math.PI * 2);
  ctx.fill();
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

// Helmet color customization
const helmetColorOptions = document.querySelectorAll('#helmetCustomization .color-option');
helmetColorOptions.forEach(option => {
  option.addEventListener('click', () => {
    helmetColor = option.getAttribute('data-color');
    console.log('Helmet color changed to:', helmetColor);
    
    // Update active state
    helmetColorOptions.forEach(o => o.classList.remove('active'));
    option.classList.add('active');
  });
});

// Helmet style customization
const helmetStyleOptions = document.querySelectorAll('#helmetCustomization .style-option');
helmetStyleOptions.forEach(option => {
  option.addEventListener('click', () => {
    helmetStyle = option.getAttribute('data-style');
    console.log('Helmet style changed to:', helmetStyle);
    
    // Update active state
    helmetStyleOptions.forEach(o => o.classList.remove('active'));
    option.classList.add('active');
  });
});

// Alien color customization
const alienColorOptions = document.querySelectorAll('#alienCustomization .color-option');
alienColorOptions.forEach(option => {
  option.addEventListener('click', () => {
    alienColor = option.getAttribute('data-color');
    console.log('Alien color changed to:', alienColor);
    // Update active state
    alienColorOptions.forEach(o => o.classList.remove('active'));
    option.classList.add('active');
  });
});

// Martian Girlfriend Button Functionality
const martianButton = document.getElementById('martianButton');

// Toggle Martian girlfriend overlay
martianButton.addEventListener('click', () => {
  martianGirlfriendEnabled = !martianGirlfriendEnabled;
  console.log('Martian girlfriend overlay:', martianGirlfriendEnabled ? 'ON' : 'OFF');
  
  // Update button text to show current state
  if (martianGirlfriendEnabled) {
    martianButton.textContent = '👽 Hide Martian Girlfriend';
  } else {
    martianButton.textContent = '👽 Meet Martian Girlfriend';
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// ------- EmailJS Integration & Capture Button -------
// Initialize EmailJS (do this after the SDK loads)
document.addEventListener('DOMContentLoaded', function() {
  emailjs.init('3d8Kj_AoQa26UdWkH'); // <-- REPLACE with your EmailJS Public Key
});

const capturePhotoBtn = document.getElementById('capturePhotoBtn');

// Modal elements
const emailModal = document.getElementById('emailModal');
const emailInput = document.getElementById('emailInput');
const cancelEmailModal = document.getElementById('cancelEmailModal');
const emailForm = document.getElementById('emailForm');
const templateSelect = document.getElementById('templateSelect');

let capturedBlob = null; // Holds the blob between steps

capturePhotoBtn.addEventListener('click', () => {
  // Capture the image as a blob, open modal when ready
  canvas.toBlob(function(blob) {
    capturedBlob = blob;
    emailModal.style.display = 'flex';
    emailInput.value = '';
    emailInput.focus();
  }, 'image/jpeg', 0.92);
});

cancelEmailModal.addEventListener('click', () => {
  emailModal.style.display = 'none';
  capturedBlob = null;
});

emailForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  emailModal.style.display = 'none';
  const toEmail = emailInput.value;
  const templateId = templateSelect.value; // Get selected email template
  if (!capturedBlob || !toEmail) return;
  // Upload to Cloudinary
  const formData = new FormData();
  formData.append('file', capturedBlob);
  formData.append('upload_preset', 'crimsonhacks'); // <-- your preset
  try {
    const cloudinaryRes = await fetch(
      'https://api.cloudinary.com/v1_1/dpxbjdi1m/image/upload',
      { method: 'POST', body: formData }
    );
    const cloudResJson = await cloudinaryRes.json();
    if (!cloudResJson.secure_url) throw new Error('Cloudinary upload failed');
    const imageUrl = cloudResJson.secure_url;
    // Prepare EmailJS params
    const emailParams = {
      to_email: toEmail,
      photo_url: imageUrl,
      subject: 'MarsCam Photo!',
      message: 'Photo captured from MarsCam!'
    };
    emailjs.send('service_g9jnp2a', templateId, emailParams)
      .then(() => alert('Photo sent successfully!'))
      .catch(err => alert('Failed to send photo: ' + err.text));
  } catch (err) {
    alert('Photo upload failed: ' + err.message);
  }
  capturedBlob = null;
});

document.addEventListener('DOMContentLoaded', async () => {
  await initWebcam();
  await loadBodyPix(); // Mars background still handled by BodyPix if needed
  loadFaceMesh();
  draw();
});
