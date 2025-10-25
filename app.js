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

// Webcam setup (same)
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

// Load BodyPix
async function loadBodyPix() {
  net = await bodyPix.load();
  draw();
}

// AI virtual background replace
draw = async function() {
  if (
    video.readyState === video.HAVE_ENOUGH_DATA &&
    bgLoaded &&
    net
  ) {
    // Segmentation of person
    const segmentation = await net.segmentPerson(video, { internalResolution: 'medium' });
    // Draw Mars background
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    // Get webcam frame
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixel = imageData.data;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const webcamData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixel.length; i += 4) {
      const n = i / 4;
      if (segmentation.data[n] === 1) {
        // Foreground (person) pixel: copy from webcam
        pixel[i] = webcamData.data[i];
        pixel[i + 1] = webcamData.data[i + 1];
        pixel[i + 2] = webcamData.data[i + 2];
        pixel[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
  requestAnimationFrame(draw);
};

document.addEventListener('DOMContentLoaded', () => {
  initWebcam();
  loadBodyPix();
});
