// Web Audio API Procedural Synthesizers
let audioCtx = null;
let humOsc = null;
let humGain = null;
let rainNode = null;
let rainGain = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

// 1. Synthesizes a deep binaural space-shuttle drone (Cosmic Hum)
function startCosmicHum() {
    initAudio();
    if (humOsc) return;

    humOsc = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    humGain = audioCtx.createGain();

    humOsc.type = 'sawtooth';
    humOsc.frequency.setValueAtTime(55, audioCtx.currentTime); // Deep A1 note

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, audioCtx.currentTime);
    filter.Q.setValueAtTime(3, audioCtx.currentTime);

    lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime); // Slow sweep (LFO)
    lfoGain.gain.setValueAtTime(40, audioCtx.currentTime);

    humGain.gain.setValueAtTime(0.08, audioCtx.currentTime); // Keep it ambient

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    humOsc.connect(filter);
    filter.connect(humGain);
    humGain.connect(audioCtx.destination);

    humOsc.start();
    lfo.start();
}

function stopCosmicHum() {
    if (humOsc) {
        humOsc.stop();
        humOsc.disconnect();
        humOsc = null;
    }
}

// 2. Generates procedural Pink/Brown noise mimicking a futuristic rain curtain
function startCyberRain() {
    initAudio();
    if (rainNode) return;

    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Dynamic fractal brown noise calculation
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
    }

    rainNode = audioCtx.createBufferSource();
    rainNode.buffer = noiseBuffer;
    rainNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, audioCtx.currentTime);

    rainGain = audioCtx.createGain();
    rainGain.gain.setValueAtTime(0.15, audioCtx.currentTime);

    rainNode.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(audioCtx.destination);

    rainNode.start();
}

function stopCyberRain() {
    if (rainNode) {
        rainNode.stop();
        rainNode.disconnect();
        rainNode = null;
    }
}

// Timer & Breathing Coach Engine
let timerDuration = 600; // 10 minutes in seconds
let timeLeft = timerDuration;
let timerInterval = null;
let breathInterval = null;
let isRunning = false;

const breathRing = document.getElementById("breathRing");
const breathState = document.getElementById("breathState");
const timeRemainingDisplay = document.getElementById("timeRemaining");
const statusIndicator = document.querySelector(".status-indicator");

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    timeRemainingDisplay.textContent = `${mins}:${secs}`;
}

// Seamless Breathing Pattern (4s Inhale, 4s Exhale)
function runBreathingPattern() {
    if (!isRunning) return;

    let inhale = true;
    breathState.textContent = "INHALE";
    breathRing.className = "visualizer-inner inhale";

    breathInterval = setInterval(() => {
        inhale = !inhale;
        if (inhale) {
            breathState.textContent = "INHALE";
            breathRing.className = "visualizer-inner inhale";
        } else {
            breathState.textContent = "EXHALE";
            breathRing.className = "visualizer-inner exhale";
        }
    }, 4000);
}

function toggleSession() {
    initAudio();
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    if (isRunning) {
        // Pause State
        clearInterval(timerInterval);
        clearInterval(breathInterval);
        isRunning = false;
        document.getElementById("sessionBtn").textContent = "RESUME DEEP WORK";
        statusIndicator.textContent = "PAUSED";
        breathRing.className = "visualizer-inner";
        breathState.textContent = "PAUSED";
    } else {
        // Run State
        isRunning = true;
        document.getElementById("sessionBtn").textContent = "PAUSE SYSTEM";
        statusIndicator.textContent = "ACTIVE FOCUS";
        runBreathingPattern();

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                completeSession();
            }
        }, 1000);
    }
}

function resetSession() {
    clearInterval(timerInterval);
    clearInterval(breathInterval);
    isRunning = false;
    timeLeft = timerDuration;
    updateTimerDisplay();
    document.getElementById("sessionBtn").textContent = "INITIALIZE DEEP WORK";
    statusIndicator.textContent = "CALIBRATING";
    breathRing.className = "visualizer-inner";
    breathState.textContent = "STANDBY";
}

function completeSession() {
    resetSession();
    statusIndicator.textContent = "COMPLETED";
    breathState.textContent = "RESTORED";
    alert("Deep Work Cycle Completed. Reconnect with the physical world.");
}

// User Interaction Bindings
document.getElementById("sessionBtn").addEventListener("click", toggleSession);
document.getElementById("resetBtn").addEventListener("click", resetSession);

document.getElementById("humToggle").addEventListener("click", (e) => {
    initAudio();
    if (e.target.classList.contains("active")) {
        stopCosmicHum();
        e.target.classList.remove("active");
        e.target.textContent = "OFF";
    } else {
        startCosmicHum();
        e.target.classList.add("active");
        e.target.textContent = "ON";
    }
});

document.getElementById("rainToggle").addEventListener("click", (e) => {
    initAudio();
    if (e.target.classList.contains("active")) {
        stopCyberRain();
        e.target.classList.remove("active");
        e.target.textContent = "OFF";
    } else {
        startCyberRain();
        e.target.classList.add("active");
        e.target.textContent = "ON";
    }
});
