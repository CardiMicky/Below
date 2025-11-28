const videoElement = document.getElementById('videoElement');
const statusOverlay = document.getElementById('status');
const shutterBtn = document.getElementById('shutterBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const zoomBtns = document.querySelectorAll('.zoom-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const flashBtn = document.getElementById('flashBtn');
const timerBtn = document.getElementById('timerBtn');
const settingsBtn = document.getElementById('settingsBtn');
const moreBtn = document.getElementById('moreBtn');
const galleryBtn = document.getElementById('galleryBtn');
const timeDisplay = document.getElementById('timeDisplay');

let stream = null;
let currentFacingMode = 'user'; // 'user' for front, 'environment' for back
let currentZoom = 1;
let flashEnabled = false;
let availableCameras = [];
let currentCameraIndex = 0;

// Update time display
function updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    timeDisplay.textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
}
updateTime();
setInterval(updateTime, 60000); // Update every minute

// Check if browser supports getUserMedia and HTTPS
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showStatus('Your browser does not support camera access.\nPlease use a modern browser like Chrome, Firefox, or Safari.');
} else if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    showStatus('Camera access requires HTTPS.\nPlease access this site over a secure connection.');
} else {
    // Browser supports camera and we're on HTTPS/localhost
    console.log('Camera API available');
}

// Enumerate available cameras
async function enumerateCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        
        // Sort cameras: front camera first (usually has 'user' facingMode or 'front' in label)
        availableCameras.sort((a, b) => {
            const aLabel = (a.label || '').toLowerCase();
            const bLabel = (b.label || '').toLowerCase();
            const aIsFront = aLabel.includes('front') || aLabel.includes('user') || aLabel.includes('facing');
            const bIsFront = bLabel.includes('front') || bLabel.includes('user') || bLabel.includes('facing');
            
            if (aIsFront && !bIsFront) return -1;
            if (!aIsFront && bIsFront) return 1;
            return 0;
        });
        
        console.log(`Found ${availableCameras.length} camera(s)`);
        return availableCameras.length > 0;
    } catch (error) {
        console.error('Error enumerating cameras:', error);
        return false;
    }
}

// Auto-start camera when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        startCamera();
    }, 500);
});

// Start camera
async function startCamera(deviceId = null) {
    try {
        // Stop existing stream first
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Enumerate cameras if we haven't yet (or re-enumerate to get labels after permission)
        if (availableCameras.length === 0) {
            await enumerateCameras();
        }
        
        // Build device constraint
        let deviceConstraint = {};
        if (deviceId) {
            deviceConstraint.deviceId = { exact: deviceId };
        } else if (availableCameras.length > 0) {
            deviceConstraint.deviceId = { exact: availableCameras[currentCameraIndex].deviceId };
        } else {
            deviceConstraint.facingMode = currentFacingMode;
        }

        // Try multiple constraint levels, from ideal to absolute minimum
        const constraintAttempts = [
            // Attempt 1: Ideal resolution
            {
                video: {
                    ...deviceConstraint,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            },
            // Attempt 2: Lower resolution
            {
                video: {
                    ...deviceConstraint,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            },
            // Attempt 3: Just device, no resolution
            {
                video: deviceConstraint,
                audio: false
            },
            // Attempt 4: Absolute minimum - just facingMode or any camera
            {
                video: availableCameras.length > 0 ? {} : { facingMode: currentFacingMode },
                audio: false
            }
        ];

        let lastError = null;
        for (let i = 0; i < constraintAttempts.length; i++) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraintAttempts[i]);
                console.log(`Camera started with constraint level ${i + 1}`);
                break; // Success, exit loop
            } catch (error) {
                lastError = error;
                // If it's a constraint error, try next level
                if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
                    console.warn(`Constraint level ${i + 1} failed, trying next...`, error);
                    continue; // Try next constraint level
                } else {
                    // For other errors (permission, not found, etc), stop trying
                    throw error;
                }
            }
        }

        // If we exhausted all attempts and still no stream
        if (!stream) {
            throw lastError || new Error('Failed to access camera after all attempts');
        }
        
        videoElement.srcObject = stream;
        
        // Re-enumerate after getting permission to get device labels
        if (availableCameras.length > 0 && !availableCameras[0].label) {
            await enumerateCameras();
        }
        
        // Update current facing mode based on active track
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        if (settings.facingMode) {
            currentFacingMode = settings.facingMode;
        }
        
        hideStatus();
        document.body.classList.add('camera-active');
        
        // Update video mirroring
        updateVideoMirroring();
        
        console.log('Camera started successfully', {
            deviceId: settings.deviceId,
            facingMode: settings.facingMode,
            label: track.label
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
        // Only show error for non-constraint issues
        if (error.name !== 'OverconstrainedError' && error.name !== 'ConstraintNotSatisfiedError') {
            handleCameraError(error);
        } else {
            // For constraint errors, try one more time with absolute minimum
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                videoElement.srcObject = stream;
                hideStatus();
                document.body.classList.add('camera-active');
                updateVideoMirroring();
                console.log('Camera started with absolute minimum constraints');
            } catch (finalError) {
                handleCameraError(finalError);
            }
        }
    }
}

// Stop camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        stream = null;
    }
    
    videoElement.srcObject = null;
    document.body.classList.remove('camera-active');
    showStatus('Camera stopped');
}

// Switch camera
switchCameraBtn.addEventListener('click', async () => {
    // Prevent multiple rapid clicks
    if (switchCameraBtn.disabled) return;
    switchCameraBtn.disabled = true;
    
    try {
        if (availableCameras.length < 2) {
            // Fallback to facingMode if we don't have enumerated devices
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            stopCamera();
            await new Promise(resolve => setTimeout(resolve, 200));
            await startCamera();
        } else {
            // Switch to next camera in the list
            currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
            
            // Stop current stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            
            // Small delay to ensure previous stream is fully stopped
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Start with new camera
            await startCamera();
            
            console.log(`Switched to camera ${currentCameraIndex + 1} of ${availableCameras.length}`);
        }
        
        // Update video mirroring based on camera type
        updateVideoMirroring();
    } catch (error) {
        console.error('Error switching camera:', error);
        handleCameraError(error);
    } finally {
        switchCameraBtn.disabled = false;
    }
});

// Update video mirroring (mirror front camera, don't mirror back camera)
function updateVideoMirroring() {
    let isFrontCamera = false;
    
    // First, try to get facingMode from the active track
    if (stream && stream.getVideoTracks().length > 0) {
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        if (settings.facingMode === 'user') {
            isFrontCamera = true;
        } else if (settings.facingMode === 'environment') {
            isFrontCamera = false;
        }
    }
    
    // If we couldn't determine from track, check camera label
    if (availableCameras.length > 0 && stream) {
        const camera = availableCameras[currentCameraIndex];
        const label = (camera.label || '').toLowerCase();
        if (!stream.getVideoTracks()[0].getSettings().facingMode) {
            // Only use label if facingMode is not available
            isFrontCamera = label.includes('front') || 
                           label.includes('user') || 
                           label.includes('facing');
        }
    }
    
    // Final fallback to currentFacingMode
    if (!stream || !stream.getVideoTracks()[0]) {
        isFrontCamera = currentFacingMode === 'user';
    }
    
    // Apply mirroring
    if (isFrontCamera) {
        videoElement.style.transform = 'scaleX(-1)';
    } else {
        videoElement.style.transform = 'scaleX(1)';
    }
}

// Zoom controls
zoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        zoomBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentZoom = parseFloat(btn.dataset.zoom);
        applyZoom();
    });
});

function applyZoom() {
    if (videoElement.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.zoom) {
            const zoomValue = Math.min(
                Math.max(capabilities.zoom.min, currentZoom * capabilities.zoom.max),
                capabilities.zoom.max
            );
            track.applyConstraints({ advanced: [{ zoom: zoomValue }] });
        }
    }
}

// Camera modes
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Flash toggle
flashBtn.addEventListener('click', () => {
    flashEnabled = !flashEnabled;
    flashBtn.style.opacity = flashEnabled ? '1' : '0.5';
    // Note: Flash control requires additional implementation
});

// Shutter button
shutterBtn.addEventListener('click', () => {
    // Capture photo functionality
    capturePhoto();
});

function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Flip horizontally for selfie view
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0);
    
    // Convert to blob and update gallery thumbnail
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const thumbnail = galleryBtn.querySelector('.thumbnail-placeholder');
        thumbnail.style.backgroundImage = `url(${url})`;
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';
    });
    
    // Visual feedback
    shutterBtn.style.transform = 'scale(0.85)';
    setTimeout(() => {
        shutterBtn.style.transform = '';
    }, 100);
}

// Gallery button
galleryBtn.addEventListener('click', () => {
    // Open gallery - implement as needed
    console.log('Gallery clicked');
});

// Settings button
settingsBtn.addEventListener('click', () => {
    console.log('Settings clicked');
});

// Timer button
timerBtn.addEventListener('click', () => {
    console.log('Timer clicked');
});

// More button
moreBtn.addEventListener('click', () => {
    console.log('More options clicked');
});

// Status messages
function showStatus(message, showRetry = false) {
    const retryBtn = showRetry ? '<button class="retry-btn" onclick="location.reload()">Retry</button>' : '';
    statusOverlay.innerHTML = `<div class="status-content"><p>${message.replace(/\n/g, '<br>')}</p>${retryBtn}</div>`;
    statusOverlay.classList.remove('hidden');
    document.body.classList.remove('camera-active');
}

function hideStatus() {
    statusOverlay.classList.add('hidden');
    document.body.classList.add('camera-active');
}

function handleCameraError(error) {
    let errorMessage = '';
    let showRetry = false;
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied.\nPlease allow camera access in your browser settings.';
        showRetry = true;
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use.\nPlease close other apps using the camera.';
        showRetry = true;
    } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported.\nPlease use a modern browser.';
    } else {
        errorMessage = `Unable to access camera.\n${error.message || 'Please check your browser settings and try again.'}`;
        showRetry = true;
    }
    
    showStatus(errorMessage, showRetry);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Optionally stop camera when app goes to background
    } else if (stream === null) {
        startCamera();
    }
});
