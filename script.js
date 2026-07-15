// --- Web Audio Context & Node Registry ---
let audioCtx;
const synths = {
    drone: null,
    rain: null,
    static: null
};

function initAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
}

// --- Procedural Synth Engines ---

// 1. Deep Space Engine Hum (Low Frequency Drifting Drone)
function startDrone() {
    initAudio();
    
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // 55Hz (A1) for a rich, chest-vibrating ship hum
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(55, audioCtx.currentTime);
    
    // Detuned helper oscillator for chorusing/beating movement
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(55.5, audioCtx.currentTime);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(110, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();

    synths.drone = { osc1, osc2, gain: gainNode };
}

// 2. Cosmic Rain (Granular Water/Droplet Synthesis)
function startRain() {
    initAudio();

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);

    // Dynamic looping interval simulating random cosmic droplets hitting the hull
    const intervalId = setInterval(() => {
        if (gainNode.gain.value === 0) return;
        
        const osc = audioCtx.createOscillator();
        const dropGain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = "sine";
        // Higher pitched frequencies for glassy impacts
        const pitch = 1500 + Math.random() * 2000;
        osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(pitch, audioCtx.currentTime);

        dropGain.gain.setValueAtTime(0, audioCtx.currentTime);
        dropGain.gain.linearRampToValueAtTime(Math.random() * 0.1, audioCtx.currentTime + 0.01);
        dropGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15 + Math.random() * 0.1);

        osc.connect(filter);
        filter.connect(dropGain);
        dropGain.connect(gainNode);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }, 80);

    synths.rain = { gain: gainNode, intervalId };
}

// 3. Solar Wind Static (Organic Bandpass Pink Noise)
function startStatic() {
    initAudio();

    // Create a 2-second loop buffer of white noise
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Voss-McCartney filter algorithm to turn harsh white noise into softer pink noise
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // compensation factor
        b6 = white * 0.115926;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(350, audioCtx.currentTime);
    filter.Q.setValueAtTime(1.2, audioCtx.currentTime);

    // LFO (Low-Frequency Oscillator) to automatically modulate solar sweep speed
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime); // very slow sweep
    lfoGain.gain.setValueAtTime(150, audioCtx.currentTime); // sweep depth

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    lfo.start();
    source.start();

    synths.static = { source, lfo, gain: gainNode };
}

// --- Dynamic Atmospheric Control Event Binds ---

document.getElementById("droneVolume").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("droneVal").innerText = val > 0 ? `${Math.round(val * 200)}%` : "OFF";
    if (val > 0) {
        if (!synths.drone) startDrone();
        if (audioCtx.state === "suspended") audioCtx.resume();
        synths.drone.gain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.1);
    } else if (synths.drone) {
        synths.drone.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    }
});

document.getElementById("rainVolume").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("rainVal").innerText = val > 0 ? `${Math.round(val * 200)}%` : "OFF";
    if (val > 0) {
        if (!synths.rain) startRain();
        if (audioCtx.state === "suspended") audioCtx.resume();
        synths.rain.gain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.15);
    } else if (synths.rain) {
        synths.rain.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
    }
});

document.getElementById("staticVolume").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("staticVal").innerText = val > 0 ? `${Math.round(val * 333)}%` : "OFF";
    if (val > 0) {
        if (!synths.static) startStatic();
        if (audioCtx.state === "suspended") audioCtx.resume();
        synths.static.gain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.2);
    } else if (synths.static) {
        synths.static.gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
    }
});

// --- Focus Pomodoro Timer Logic ---

let timerInterval;
let timeLeft = 1500; // default 25 minutes
let timerRunning = false;

const timerDisplay = document.getElementById("timerDisplay");
const startTimerBtn = document.getElementById("startTimerBtn");
const resetTimerBtn = document.getElementById("resetTimerBtn");
const modeButtons = document.querySelectorAll(".mode-btn");

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const secs = (timeLeft % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `${mins}:${secs}`;
}

startTimerBtn.addEventListener("click", () => {
    initAudio(); // Initialize audio systems on focus start
    if (timerRunning) {
        clearInterval(timerInterval);
        startTimerBtn.textContent = "RESUME";
        timerRunning = false;
    } else {
        timerRunning = true;
        startTimerBtn.textContent = "PAUSE";
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerRunning = false;
                startTimerBtn.textContent = "COMPLETED";
                triggerAlarmChime();
            }
        }, 1000);
    }
});

resetTimerBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerRunning = false;
    const activeMode = document.querySelector(".mode-btn.active");
    timeLeft = parseInt(activeMode.getAttribute("data-time"));
    updateTimerDisplay();
    startTimerBtn.textContent = "INITIATE";
});

modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        modeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        clearInterval(timerInterval);
        timerRunning = false;
        timeLeft = parseInt(btn.getAttribute("data-time"));
        updateTimerDisplay();
        startTimerBtn.textContent = "INITIATE";
    });
});

// Deep Retro Cosmic alarm synth chime on session end
function triggerAlarmChime() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.5); // Sweeps up to C6
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1);
}

// --- Interactive Warp Starfield Engine (Canvas 2D) ---

const canvas = document.getElementById("starfieldCanvas");
const ctx = canvas.getContext("2d");

let stars = [];
const numStars = 200;
let baseSpeed = 1.5;
let speedMult = 1;
let warpX = 0; // Interactive offsets
let warpY = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Star Object blueprints
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width - canvas.width / 2;
        this.y = Math.random() * canvas.height - canvas.height / 2;
        this.z = Math.random() * canvas.width; // 3D perspective depth vector
        this.px = this.x;
        this.py = this.y;
    }

    update() {
        this.z -= baseSpeed * speedMult;
        if (this.z <= 0) {
            this.reset();
            this.z = canvas.width;
        }

        // Apply mouse-bend offsets to warp calculations
        const screenX = (this.x / this.z) * canvas.width * 0.8 + canvas.width / 2 + (warpX * (canvas.width - this.z) * 0.0005);
        const screenY = (this.y / this.z) * canvas.height * 0.8 + canvas.height / 2 + (warpY * (canvas.height - this.z) * 0.0005);

        this.screenX = screenX;
        this.screenY = screenY;
    }

    draw() {
        if (!this.prevScreenX) {
            this.prevScreenX = this.screenX;
            this.prevScreenY = this.screenY;
        }

        // Star glowing aesthetic color palette based on velocity
        const hue = 180 + (speedMult * 15);
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${Math.min(1, 1 - this.z / canvas.width)})`;
        ctx.lineWidth = Math.max(1, 2.5 * (1 - this.z / canvas.width));
        
        // Render 3D streak trails
        ctx.beginPath();
        ctx.moveTo(this.screenX, this.screenY);
        ctx.lineTo(this.prevScreenX, this.prevScreenY);
        ctx.stroke();

        this.prevScreenX = this.screenX;
        this.prevScreenY = this.screenY;
    }
}

// Generate star array
for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
}

// Canvas Render Loop
function animateStarfield() {
    requestAnimationFrame(animateStarfield);

    // Fade overlay to draw star trails
    ctx.fillStyle = "rgba(3, 3, 8, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        star.update();
        star.draw();
    });
}
animateStarfield();

// Interactive star bending mouse/touch handlers
function handleMove(clientX, clientY) {
    warpX = clientX - canvas.width / 2;
    warpY = clientY - canvas.height / 2;
    // Speed increases as cursor gets further from center
    const dist = Math.sqrt(warpX * warpX + warpY * warpY);
    const maxDist = Math.sqrt((canvas.width/2)**2 + (canvas.height/2)**2);
    speedMult = 1 + (dist / maxDist) * 8; // scale up to 9x speed
}

window.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));

window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });

window.addEventListener("mouseleave", () => {
    warpX = 0;
    warpY = 0;
    speedMult = 1;
});
