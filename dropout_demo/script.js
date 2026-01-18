/**
 * Tuneller Dropout Effect Demo
 * Ported from Python prototype in dropout_effect.md
 */

const WIDTH = 64;
const HEIGHT = 48;
const FPS = 30;

// Config state
let SIGNAL_QUALITY = 0.95;
let PATTERN_STRENGTH = 0.38;
let NOISE_DENSITY = 0.6;
let STUTTER = 2;

// Constraints from specs
const DROP_CHANCE_RANGE = [0.0, 0.5];
const DROP_DURATION_RANGE = [2, 50];
const DEGRADATION_PWR = 0.03;

// ROM settings
const rowBytes = WIDTH * 3;
const romRows = 500;
const romSize = rowBytes * romRows;
let romBuffer = new Uint8ClampedArray(romSize);

// Canvas setup
const canvas = document.getElementById('dropoutCanvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.createImageData(WIDTH, HEIGHT);

// UI elements
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const patternSlider = document.getElementById('patternSlider');
const patternValue = document.getElementById('patternValue');
const noiseSlider = document.getElementById('noiseSlider');
const noiseValue = document.getElementById('noiseValue');
const stutterSlider = document.getElementById('stutterSlider');
const stutterValue = document.getElementById('stutterValue');
const energyFill = document.getElementById('energyFill');
const statusOverlay = document.getElementById('statusOverlay');
const stateDisplay = document.getElementById('stateDisplay');
const burstDisplay = document.getElementById('burstDisplay');
const resetButton = document.getElementById('resetButton');

/**
 * Generates a fresh Noise ROM with patterns/bands
 */
function initializeROM() {
    // Fill with random noise
    for (let i = 0; i < romSize; i++) {
        romBuffer[i] = Math.floor(Math.random() * 256);
    }

    // Inject bands
    const nBands = Math.floor(50 + 200 * PATTERN_STRENGTH);
    for (let i = 0; i < nBands; i++) {
        const rowStart = Math.floor(Math.random() * (romRows - 10)) * rowBytes;
        const nRows = Math.floor(Math.random() * Math.max(2, Math.floor(6 * PATTERN_STRENGTH))) + 1;
        const length = nRows * rowBytes;

        if (Math.random() < PATTERN_STRENGTH) {
            // Pattern band
            const patLen = Math.floor(Math.random() * Math.max(3, Math.floor(20 * (1 - PATTERN_STRENGTH) + 3))) + 2;
            const pattern = new Uint8Array(patLen);
            for (let p = 0; p < patLen; p++) {
                pattern[p] = Math.floor(Math.random() * 256);
            }

            for (let j = 0; j < length; j++) {
                romBuffer[rowStart + j] = pattern[j % patLen];
            }
        } else {
            // Solid band
            const color = Math.floor(Math.random() * 256);
            for (let j = 0; j < length; j++) {
                romBuffer[rowStart + j] = color;
            }
        }
    }
}

/**
 * Samples a frame from the ROM
 */
function getNoiseFrame(targetBuffer) {
    const start = Math.floor(Math.random() * (romRows - HEIGHT)) * rowBytes;

    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const romIdx = start + (y * rowBytes) + (x * 3);
            const canvasIdx = (y * WIDTH + x) * 4;

            const r = romBuffer[romIdx];
            const g = romBuffer[romIdx + 1];
            const b = romBuffer[romIdx + 2];

            const showPixel = Math.random() < NOISE_DENSITY;

            if (showPixel) {
                targetBuffer[canvasIdx] = r;
                targetBuffer[canvasIdx + 1] = g;
                targetBuffer[canvasIdx + 2] = b;
                targetBuffer[canvasIdx + 3] = 255;
            } else {
                targetBuffer[canvasIdx] = 0;
                targetBuffer[canvasIdx + 1] = 0;
                targetBuffer[canvasIdx + 2] = 0;
                targetBuffer[canvasIdx + 3] = 255;
            }
        }
    }
}

// Simulation state
let inBurst = false;
let burstRemaining = 0;
let stutterRemaining = 0;
let cachedFrame = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

function update() {
    // Non-linear mapping
    const effQuality = Math.pow(SIGNAL_QUALITY, DEGRADATION_PWR);
    const noiseFactor = 1.0 - effQuality;

    const lossProb = DROP_CHANCE_RANGE[0] + noiseFactor * (DROP_CHANCE_RANGE[1] - DROP_CHANCE_RANGE[0]);
    const burstLenEst = DROP_DURATION_RANGE[0] + noiseFactor * (DROP_DURATION_RANGE[1] - DROP_DURATION_RANGE[0]);

    if (!inBurst) {
        if (Math.random() < lossProb) {
            inBurst = true;
            burstRemaining = Math.floor(burstLenEst * (0.8 + Math.random() * 0.7));
            statusOverlay.textContent = 'SIGNAL LOSS';
            statusOverlay.style.color = '#f00';
            stateDisplay.textContent = 'BURSTING';
        } else {
            // Normal frame (just white for this demo to represent "clear view")
            // In the real game, this would be the game world
            imageData.data.fill(255);
            ctx.putImageData(imageData, 0, 0);
            statusOverlay.textContent = 'SIGNAL OK';
            statusOverlay.style.color = '#0f0';
            stateDisplay.textContent = 'NORMAL';
            burstDisplay.textContent = '0';
        }
    }

    if (inBurst) {
        if (stutterRemaining <= 0) {
            getNoiseFrame(cachedFrame);
            stutterRemaining = STUTTER;
        }

        imageData.data.set(cachedFrame);
        ctx.putImageData(imageData, 0, 0);

        stutterRemaining--;
        burstRemaining--;
        burstDisplay.textContent = burstRemaining;

        if (burstRemaining <= 0) {
            inBurst = false;
        }
    }

    // Update energy bar (visual only)
    // Map SIGNAL_QUALITY 0-1 to Energy 0-25%
    // Energy > 25% should always be clear.
    // For this demo, we just show the quality level.
    energyFill.style.width = (SIGNAL_QUALITY * 100) + '%';

    // Low quality makes energy bar yellow/red in real game
    // Here we just keep it yellow as per specs
}

// Event Listeners
qualitySlider.addEventListener('input', () => {
    SIGNAL_QUALITY = parseFloat(qualitySlider.value);
    qualityValue.textContent = SIGNAL_QUALITY.toFixed(2);
});

patternSlider.addEventListener('input', () => {
    PATTERN_STRENGTH = parseFloat(patternSlider.value);
    patternValue.textContent = PATTERN_STRENGTH.toFixed(2);
    initializeROM(); // Re-gen ROM if pattern changes significantly
});

noiseSlider.addEventListener('input', () => {
    NOISE_DENSITY = parseFloat(noiseSlider.value);
    noiseValue.textContent = NOISE_DENSITY.toFixed(2);
});

stutterSlider.addEventListener('input', () => {
    STUTTER = parseInt(stutterSlider.value);
    stutterValue.textContent = STUTTER;
});

resetButton.addEventListener('click', () => {
    initializeROM();
});

// Start loop
initializeROM();
setInterval(update, 1000 / FPS);
