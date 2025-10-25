// Get DOM elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 640;
canvas.height = 480;

// WebRTC webcam access
async function initWebcam() {
  try {
    console.log('Requesting webcam access...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 640, 
        height: 480 
      } 
    });
    
    console.log('Webcam access granted!');
    video.srcObject = stream;
    video.play();
    
    // Start drawing loop
    draw();
    
  } catch (error) {
    console.error('Webcam error:', error);
    document.getElementById('container').innerHTML += 
      '<p style="color: red; margin-top: 20px;">❌ Webcam access denied. Please allow camera permission and refresh the page.</p>';
  }
}

// Draw webcam feed to canvas
function draw() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(draw);
}

// Mars mode toggle (placeholder)
function toggleMars() {
  alert('🚀 Mars mode - coming soon!');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initWebcam);
