let audioCtx = null;
let timerInterval = null;
let breathingInterval = null;
let isSessionActive = false;
let timeLeft = 600; // 10 Minutes in seconds

// Audio Nodes
let humOsc1 = null;
let humOsc2 = null;
let humGain = null;
let isHumPlaying = false;

let rainNode = null;
let rainFilter = null;
let rainGain = null;
let isRainPlaying = false;

// DOM Elements
const breathRing = document.getElementById("breathRing");
const breathState = document.getElementById("breathState");
const timeRemaining = document.getElementById("timeRemaining");
const sessionBtn = document.getElementById("sessionBtn");
const resetBtn = document.getElementById("resetBtn");
const humToggle = document.getElementById("humToggle");
const rainToggle = document.getElementById("rainToggle");
const statusIndicator = document.getElementById("statusIndicator");

// Initialize Web Audio
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/* --- Procedural Synthesizers --- */

// 1. Cosmic Hum (Binaural Drone)
function startCosmicHum() {
    initAudio();
    const now = audioCtx.currentTime;

    humOsc1 = audioCtx.createOscillator();
    humOsc2 = audioCtx.createOscillator();
    humGain = audioCtx.createGain();

    humOsc1.type = 'sine';
    humOsc1.frequency.setValueAtTime(110, now); // 110Hz deep tone

    humOsc2.type = 'sine';
    humOsc2.frequency.setValueAtTime(111.5, now); // Slightly detuned for 1.5Hz binaural beat effect

    humGain.gain.setValueAtTime(0, now);
    humGain.gain.linearRampToValueAtTime(0.35, now + 1.5); // Smooth fade in

    humOsc1.connect(humGain);
    humOsc2.connect(humGain);
    humGain.connect(audioCtx.destination);

    humOsc1.start();
    humOsc2.start();
    isHumPlaying = true;
    humToggle.textContent = "ON";
    humToggle.classList.add("active");
}

function stopCosmicHum() {
    if (humGain && audioCtx) {
        const now = audioCtx.currentTime;
        humGain.gain.cancelScheduledValues(now);
        humGain.gain.linearRampToValueAtTime(0, now + 0.8); // Smooth fade out
        setTimeout(() => {
            if (humOsc1) { humOsc1.stop(); humOsc1.disconnect(); }
            if (humOsc2) { humOsc2.stop(); humOsc2.disconnect(); }
            isHumPlaying = false;
        }, 800);
    }
    humToggle.textContent = "OFF";
    humToggle.classList.remove("active");
}

// 2. Cyber Rain (Real-time Noise Generation)
function startCyberRain() {
    initAudio();
    const now = audioCtx.currentTime;

    // Create a 2-second buffer of random noise
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    rainNode = audioCtx.createBufferSource();
    rainNode.buffer = buffer;
    rainNode.loop = true;

    // Filter to shape raw noise into soft rain
    rainFilter = audioCtx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(800, now);

    rainGain = audioCtx.createGain();
    rainGain.gain.setValueAtTime(0, now);
    rainGain.gain.linearRampToValueAtTime(0.25, now + 1.0); // Smooth fade in

    rainNode.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(audioCtx.destination);

    rainNode.start();
    isRainPlaying = true;
    rainToggle.textContent = "ON";
    rainToggle.classList.add("active");

    // Dynamic wind/rain sweeping effect
    simulateWind();
}

function simulateWind() {
    if (!isRainPlaying || !rainFilter) return;
    const now = audioCtx.currentTime;
    const sweepFreq = 600 + Math.random() * 500; // Drifts between 600Hz and 1100Hz
    rainFilter.frequency.exponentialRampToValueAtTime(sweepFreq, now + 3 + Math.random() * 3);
    setTimeout(simulateWind, 4000);
}

function stopCyberRain() {
    if (rainGain && audioCtx) {
        const now = audioCtx.currentTime;
        rainGain.gain.cancelScheduledValues(now);
        rainGain.gain.linearRampToValueAtTime(0, now + 0.8);
        setTimeout(() => {
            if (rainNode) { rainNode.stop(); rainNode.disconnect(); }
            isRainPlaying = false;
        }, 800);
    }
    rainToggle.textContent = "OFF";
    rainToggle.classList.remove("active");
}

/* --- Breathing Logic Loop --- */
const breathingSequence = [
    { state: "INHALE", duration: 4000, className: "inhale" },
    { state: "HOLD", duration: 4000, className: "hold" },
    { state: "EXHALE", duration: 4000, className: "exhale" }
];
let currentStep = 0;

function runBreathingStep() {
    if (!isSessionActive) return;

    const step = breathingSequence[currentStep];
    
    // UI Updates
    breathState.textContent = step.state;
    breathRing.className = "visualizer-inner " + step.className;

    breathingInterval = setTimeout(() => {
        currentStep = (currentStep + 1) % breathingSequence.length;
        runBreathingStep();
    }, step.duration);
}

/* --- Main Deep Work Timer --- */
function updateTimerUI() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeRemaining.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function startSession() {
    initAudio();
    isSessionActive = true;
    sessionBtn.textContent = "TERMINATE SESSION";
    statusIndicator.textContent = "ACTIVE";
    statusIndicator.classList.remove("pulses");

    // Start Breathing Core
    currentStep = 0;
    runBreathingStep();

    // Start Countdown Timer
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerUI();
        } else {
            endSession();
        }
    }, 1000);
}

function endSession() {
    clearInterval(timerInterval);
    clearTimeout(breathingInterval);
    isSessionActive = false;
    sessionBtn.textContent = "INITIALIZE DEEP WORK";
    statusIndicator.textContent = "CALIBRATING";
    statusIndicator.classList.add("pulses");
    breathState.textContent = "STANDBY";
    breathRing.className = "visualizer-inner";
}

/* --- Event Handlers --- */

// Atmosphere Toggles
humToggle.addEventListener("click", () => {
    if (isHumPlaying) {
        stopCosmicHum();
    } else {
        startCosmicHum();
    }
});

rainToggle.addEventListener("click", () => {
    if (isRainPlaying) {
        stopCyberRain();
    } else {
        startCyberRain();
    }
});

// Primary Start / Pause Action
sessionBtn.addEventListener("click", () => {
    if (isSessionActive) {
        endSession();
    } else {
        startSession();
    }
});

// Reset Deck Action
resetBtn.addEventListener("click", () => {
    endSession();
    stopCosmicHum();
    stopCyberRain();
    timeLeft = 600;
    updateTimerUI();
});
