# MarsCam Alienizer - Project Context Document

## Project Overview
- **Name**: MarsCam Alienizer
- **Category**: Funny/Entertainment
- **Event**: Space Apps Hackathon
- **Build Time**: 12-16 hours
- **Goal**: Browser-based web app that captures webcam feed and applies Mars-themed texture overlays and alien filters in real-time

## Core Concept
A fun, interactive web app that transforms users into Martian explorers by:

- Capturing live webcam feed
- Overlaying Mars terrain textures (red soil, rocky landscapes)
- Adding space station environment effects
- Applying alien filters and astronaut helmet effects (stretch goal)
- Integrating authentic NASA Mars imagery for visual effects

## Tech Stack

### Frontend
- **HTML5 Canvas** - Real-time video manipulation and texture compositing
- **Plain JavaScript** - No frameworks for faster prototyping
- **WebRTC (MediaDevices.getUserMedia)** - Native browser webcam access
- **CSS3** - Basic styling and button effects

### APIs & Data Sources
- **NASA Mars Rover Photos API** - Authentic Mars terrain textures
  - Endpoint: https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos
  - Rate limit: 1,000 calls/day
  - Alternative sources: uahirise.org, pds-imaging.jpl.nasa.gov
- **NASA APOD API (optional)** - Space backgrounds and star fields
- **Fetch API** - Simple HTTP requests for NASA data

### Computer Vision (Stretch Goal)
- **face-api.js** - Lightweight face detection library
  - Pre-trained models from GitHub (justadudewhohacks/face-api.js)
  - Use for alien skin overlays and astronaut helmet positioning

### Hosting & Deployment
- **Glitch.com** - Primary hosting platform
  - Free tier
  - Automatic HTTPS (required for WebRTC)
  - Instant deployment and sharing
  - No build process needed

### Optional Enhancements
- **Tailwind CSS** - Rapid UI styling (if time permits)
- **Web Audio API** - Martian wind sounds, alien effects
- **Three.js** - 3D space station effects (advanced, +2 hours)

## Project Structure
```
marscam-alienizer/
├── index.html          # Main UI with video/canvas elements
├── app.js              # Core logic: webcam, canvas rendering, overlays
├── styles.css          # Layout and button styling
├── assets/
│   ├── mars_texture.jpg        # Pre-downloaded Mars terrain
│   ├── space_station_texture.jpg # Metallic/star background
│   └── alien_overlay.png       # Alien filter assets (optional)
└── README.md           # Project documentation
```

## Core Features (MVP - 4-7 hours)

### 1. Webcam Capture
- Access user's webcam via WebRTC
- Display feed on HTML5 Canvas at 640x480 resolution
- Maintain 60fps with requestAnimationFrame
- Handle permissions and errors gracefully

### 2. Mars Texture Overlay
- Overlay Mars terrain on bottom 30% of canvas (floor effect)
- Use semi-transparent alpha blending (0.5 opacity)
- Toggle on/off with "Mars Mode" button
- Pre-cache textures to avoid API rate limits

### 3. Space Station Mode
- Full-screen overlay with metallic/starry texture
- Toggle between Mars and Space Station modes
- Mutual exclusivity between modes
- 0.4 alpha for subtle background effect

### 4. Basic UI
- Toggle buttons for different modes
- Clean, space-themed design
- Responsive canvas sizing
- Error messages for webcam access issues

## Stretch Features (8-12 hours total)

### Face Detection & Alien Filters
- Integrate face-api.js for face landmark detection
- Overlay alien skin textures on detected faces
- Add astronaut helmet effects
- Real-time face tracking at 30fps minimum

### Easter Eggs & Animations
- Animated Mars rover crossing screen
- Random alien giggles or sounds
- Shooting stars in Space Station mode
- "Discover Mars" achievements

### NASA Data Integration
- Dynamic texture fetching from Mars Rover Photos API
- Display rover name and Sol (Martian day) information
- Rotate through different Mars locations
- Show APOD as background option

### Audio Effects
- Martian wind ambient sound
- Alien voice modulation
- Sci-fi UI interaction sounds
- Volume controls

## Technical Implementation Details

### Canvas Rendering Pipeline
1. Clear canvas or draw previous frame
2. Draw webcam video feed (base layer)
3. Apply selected mode overlay (Mars/Space Station)
4. Apply face detection results (if enabled)
5. Draw UI elements on top
6. Request next animation frame

### Image Loading Strategy
- Pre-download high-quality textures (avoid API delays during demo)
- Use Image() objects for better performance
- Implement fallback textures if NASA API fails
- Cache responses using browser localStorage

### Performance Optimization
- Target 60fps for smooth video
- Resize large textures to 640x480 before use
- Use globalCompositeOperation for efficient blending
- Debounce button clicks to prevent rapid mode switching

## Development Timeline (12-16 hours)

### Phase 1: Foundation (2-3 hours)
- Set up Glitch project with HTTPS
- Implement webcam access and Canvas display
- Create basic HTML structure and CSS styling
- Test across Chrome and Firefox

### Phase 2: Core Features (3-4 hours)
- Download and integrate Mars textures
- Implement Mars Mode overlay with alpha blending
- Add Space Station Mode with background texture
- Create toggle button functionality
- Test texture loading and performance

### Phase 3: Polish & UI (2-3 hours)
- Enhance button styling with hover effects
- Add project title and branding
- Implement error handling for webcam access
- Add loading states for texture downloads
- Test on different screen sizes

### Phase 4: Stretch Goals (4-6 hours)
- Integrate face-api.js for face detection
- Create alien filter overlays
- Add audio effects with Web Audio API
- Implement NASA API dynamic fetching
- Add easter egg animations

## Testing Checklist
- [ ] Webcam access works on Chrome/Firefox
- [ ] HTTPS enabled (required for getUserMedia)
- [ ] Canvas renders at consistent framerate
- [ ] Textures load without blocking
- [ ] Mode toggles work correctly
- [ ] UI responsive on different screen sizes
- [ ] Error messages display for webcam failures
- [ ] Performance acceptable on mid-range laptops
- [ ] Demo works without internet (cached assets)

## Asset Sources

### Mars Textures
- NASA Mars Rover Photos API (Curiosity, Perseverance)
- USGS Astrogeology Science Center
- HiRISE (High Resolution Imaging Science Experiment)
- Mars Reconnaissance Orbiter images

### Space Station Textures
- NASA ISS imagery archives
- OpenGameArt.org (free sci-fi textures)
- NASA APOD for star fields
- Free metallic texture packs

### Face Filter Assets
- Custom PNG overlays with transparency
- Alien skin color gradients
- Astronaut helmet vector graphics

## Known Constraints & Workarounds

### Browser Compatibility
- **Issue**: getUserMedia requires HTTPS
- **Solution**: Use Glitch for automatic HTTPS

### API Rate Limits
- **Issue**: NASA API limited to 1,000 calls/day
- **Solution**: Pre-download textures, cache locally

### Performance on Low-End Devices
- **Issue**: Canvas rendering may lag on older hardware
- **Solution**: Reduce canvas resolution, lower framerate to 30fps

### Face Detection Accuracy
- **Issue**: face-api.js may struggle with poor lighting
- **Solution**: Add lighting tips in UI, provide manual positioning

## Success Metrics
- **Demo-able in 1 hour**: Basic webcam + canvas working
- **Feature complete in 8 hours**: Both overlay modes functional
- **Polished in 12 hours**: Alien filters and NASA integration
- **Audience engagement**: Laughs and photo sharing during demo

## Resources & Documentation
- **WebRTC API**: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **NASA APIs**: https://api.nasa.gov/
- **face-api.js**: https://github.com/justadudewhohacks/face-api.js
- **Glitch**: https://glitch.com/

## Team Notes
- **Priority**: Get webcam working first (foundation for everything)
- **Quick wins**: Pre-download textures, avoid API complexity early
- **Demo strategy**: Focus on funny reactions, emphasize NASA authenticity
- **Backup plan**: If face detection fails, focus on texture quality and UI polish

---
**Last Updated**: Hackathon Day 1  
**Status**: Ready to start development  
**Next Step**: Set up Glitch project and implement webcam capture
