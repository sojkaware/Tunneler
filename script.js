// Tunneler - Core Game Logic

/**
 * CENTRAL CONFIGURATION
 * All game parameters are stored here as requested.
 */
const CONFIG = {
    WORLD: {
        WIDTH: 512,//1024,
        HEIGHT: 256,//512,
        FPS: 20, // Conventional low FPS feel
        SCORE_LIMIT: 3,
    },
    VIEW: {
        WIDTH: 76,
        HEIGHT: 71,
    },
    COLORS: {
        BLACK: '#000000',
        DARK_BLUE: '#0000b6',
        CANNON_YELLOW: '#f3eb1c',
        SHIELD_TURQUOISE: '#28f3f3',
        PANEL_HIGHLIGHT: '#727272',
        PANEL_SOLID: '#656565',
        PANEL_SHADOW: '#333333',
        LIGHT_BLUE: '#2c2cff',
        LIGHT_GREEN: '#00ff00',
        DARK_GREEN: '#00aa00',
        LIGHT_ORANGE: '#c37930',
        DARK_ORANGE: '#ba5904',
        ROCK_GRAY: '#9a9a9a',
        BULLET_RED: '#ff3408',
        BULLET_RED_TAIL: '#b40204',
    },
    WORLD_GEN: {
        BORDER_JAGGED: 35, // 0-100
        BORDER_DEPTH: 60,
        BORDER_DENSITY: 85,
        FINGER_THICK: 6,
        FINGER_TAPER: 40,
        ISLAND_SEED: 15,
        ISLAND_SCALE: 25,
        ISLAND_CA: 4,
        ROCK_MIN_SIZE: 2,
    },
    ENTITIES: {
        BASE_SIZE: 35,
        BASE_WALL: 1,
        BASE_ENTRANCE_GAP: 7,
        MIN_BASE_DISTANCE: 1024 / 6,
    },
    PHYSICS: {
        MOVES_PER_FRAME: 1, // Traditional fixed step
        ENERGY_MAX: 100,
        SHIELD_MAX: 100,
        ENERGY_MOVE_COST: 0.05,
        ENERGY_DIG_COST: 0.20,
        RECHARGE_RATE: 0.5,
        RECHARGE_RATE_SHIELD: 0.2
    },
    INTERFERENCE: {
        THRESHOLD: 25, // Energy below this triggers signal loss
        DEGRADATION_PWR: 0.03,
        DROP_CHANCE_RANGE: [0.0, 0.5],
        DROP_DURATION_RANGE: [2, 50],
        STUTTER: 2,
        ROM_ROWS: 500,
        NOISE_DENSITY: 0.6,
        PATTERN_STRENGTH: 0.38
    },
    COMBAT: {
        BULLET_CADENCE: 2, // Every 2 frames
        BULLET_SPEED: 2,
        FIRE_ENERGY_COST: 5,
        INFLOW_RATE_MAX: 1.0, // Proportional to energy
        TANK_EXPLOSION: { N: 60, R: 10, LIFE: 26 },
        BULLET_EXPLOSION: { N: 12, R: 1, LIFE: 2 },
        FIRE_FRAME_MULTIPLIER: 2
    },
    UI: {
        TEXT_SIZE: 1, // Base multiplier for bitmap font (pixels per font-pixel)
        RAINBOW_COLORS: ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#ee82ee'],
        OVERLAY_MIN_TIME: 3000 // ms
    }
};

// Internal State
const STATE = {
    world: null, // Uint8Array(WIDTH * HEIGHT) -> 0: SoilA, 1: Rock, 2: SoilB, 3: Empty
    players: [
        {
            id: 'blue',
            x: 0, y: 0, angle: 0,
            energy: CONFIG.PHYSICS.ENERGY_MAX,
            shield: CONFIG.PHYSICS.SHIELD_MAX,
            score: 0,
            baseX: 0, baseY: 0,
            viewX: 0, viewY: 0,
            color: CONFIG.COLORS.LIGHT_BLUE,
            wheelColor: CONFIG.COLORS.DARK_BLUE,
            dropout: { inBurst: false, burstRemaining: 0, stutterRemaining: 0, cachedFrame: null },
            isDestroyed: false
        },
        {
            id: 'green',
            x: 0, y: 0, angle: 0,
            energy: CONFIG.PHYSICS.ENERGY_MAX,
            shield: CONFIG.PHYSICS.SHIELD_MAX,
            score: 0,
            baseX: 0, baseY: 0,
            viewX: 0, viewY: 0,
            color: CONFIG.COLORS.LIGHT_GREEN,
            wheelColor: CONFIG.COLORS.DARK_GREEN,
            dropout: { inBurst: false, burstRemaining: 0, stutterRemaining: 0, cachedFrame: null },
            isDestroyed: false
        }
    ],
    keys: {},
    noiseROM: null,
    round: 1,
    isRoundEnding: false,
    roundEndTimer: 0,
    waitingForInput: false,
    isGameOver: false,
    winner: null,
    bullets: [],
    particles: [],
    frameCounter: 0,
    overlayStartTime: 0
};

// CELL TYPES
const CELLS = {
    SOIL_A: 0,
    ROCK: 1,
    SOIL_B: 2,
    EMPTY: 3
};

let lastTime = 0;

/**
 * BITMAP FONT - IBM PC BIOS 8x8 Look
 * Each character is a 64-bit mask (stored as hexadecimal strings of 8 bytes)
 * 1: ON, 0: OFF
 */
const BIT_FONT = {
    '0': ['3c', '66', '6e', '76', '66', '66', '3c', '00'],
    '1': ['18', '38', '18', '18', '18', '18', '7e', '00'],
    '2': ['3c', '66', '06', '0c', '18', '30', '7e', '00'],
    '3': ['3c', '66', '06', '1c', '06', '66', '3c', '00'],
    '4': ['1c', '3c', '6c', '6c', 'fe', '0c', '1e', '00'],
    '5': ['7e', '60', '7c', '06', '06', '66', '3c', '00'],
    '6': ['1c', '30', '60', '7c', '66', '66', '3c', '00'],
    '7': ['7e', '06', '0c', '18', '30', '30', '30', '00'],
    '8': ['3c', '66', '66', '3c', '66', '66', '3c', '00'],
    '9': ['3c', '66', '66', '3e', '06', '0c', '38', '00'],
    'A': ['3c', '66', '66', '7e', '66', '66', '66', '00'],
    'B': ['7c', '66', '66', '7c', '66', '66', '7c', '00'],
    'C': ['3c', '66', '60', '60', '60', '66', '3c', '00'],
    'D': ['78', '6c', '66', '66', '66', '6c', '78', '00'],
    'E': ['7e', '60', '60', '78', '60', '60', '7e', '00'],
    'F': ['7e', '60', '60', '78', '60', '60', '60', '00'],
    'G': ['3c', '66', '60', '6e', '66', '66', '3c', '00'],
    'H': ['66', '66', '66', '7e', '66', '66', '66', '00'],
    'I': ['3c', '18', '18', '18', '18', '18', '3c', '00'],
    'J': ['1e', '0c', '0c', '0c', '0c', '6c', '38', '00'],
    'K': ['66', '6c', '78', '70', '78', '6c', '66', '00'],
    'L': ['60', '60', '60', '60', '60', '60', '7e', '00'],
    'M': ['63', '77', '7f', '6b', '63', '63', '63', '00'],
    'N': ['66', '76', '7e', '7e', '6e', '66', '66', '00'],
    'O': ['3c', '66', '66', '66', '66', '66', '3c', '00'],
    'P': ['7c', '66', '66', '7c', '60', '60', '60', '00'],
    'Q': ['3c', '66', '66', '66', '6e', '3c', '0e', '00'],
    'R': ['7c', '66', '66', '7c', '78', '6c', '66', '00'],
    'S': ['3c', '66', '30', '1c', '06', '66', '3c', '00'],
    'T': ['7e', '18', '18', '18', '18', '18', '18', '00'],
    'U': ['66', '66', '66', '66', '66', '66', '3c', '00'],
    'V': ['66', '66', '66', '66', '66', '3c', '18', '00'],
    'W': ['63', '63', '63', '6b', '7f', '77', '63', '00'],
    'X': ['66', '66', '3c', '18', '3c', '66', '66', '00'],
    'Y': ['66', '66', '66', '3c', '18', '18', '18', '00'],
    'Z': ['7e', '06', '0c', '18', '30', '60', '7e', '00'],
    ' ': ['00', '00', '00', '00', '00', '00', '00', '00'],
    '-': ['00', '00', '00', '3e', '00', '00', '00', '00'],
    '!': ['18', '18', '18', '18', '00', '00', '18', '00'],
    ':': ['00', '18', '18', '00', '18', '18', '00', '00'],
    '.': ['00', '00', '00', '00', '00', '00', '18', '00'],
    ',': ['00', '00', '00', '00', '00', '00', '18', '18'],
};

function drawBitmapText(ctx, text, x, y, color, scale = 1) {
    const charW = 8 * scale;
    const charH = 8 * scale;

    ctx.fillStyle = color;

    for (let i = 0; i < text.length; i++) {
        const char = text[i].toUpperCase();
        const bitmap = BIT_FONT[char] || BIT_FONT[' '];

        bitmap.forEach((hex, rowIdx) => {
            const byte = parseInt(hex, 16);
            for (let bit = 7; bit >= 0; bit--) {
                if ((byte >> bit) & 1) {
                    const px = x + i * charW + (7 - bit) * scale;
                    const py = y + rowIdx * scale;
                    ctx.fillRect(px, py, scale, scale);
                }
            }
        });
    }
}

function updateGameScale() {
    const scale = Math.min(window.innerWidth / 160, window.innerHeight / 100);
    document.documentElement.style.setProperty('--game-scale', scale);
}
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initSprites();
    initNoiseROM();
    setupGame();
    updateGameScale();

    // Event Listeners for Input
    window.addEventListener('keydown', (e) => {
        STATE.keys[e.code] = true;
        handleGlobalInput(e.code);
    });
    window.addEventListener('keyup', (e) => { STATE.keys[e.code] = false; });

    window.addEventListener('resize', updateGameScale);

    requestAnimationFrame(gameLoop);
});

function handleGlobalInput(code) {
    const now = Date.now();
    const canContinue = (now - STATE.overlayStartTime >= CONFIG.UI.OVERLAY_MIN_TIME);

    if (STATE.isGameOver) {
        if (canContinue) {
            // "Press any key to play again"
            resetEntireGame();
        }
    } else if (STATE.isRoundEnding && STATE.waitingForInput) {
        if (canContinue) {
            // Any key to continue round
            STATE.isRoundEnding = false;
            STATE.waitingForInput = false;
            STATE.round++;
            initRound();
            const overlay = document.getElementById('overlay-canvas');
            if (overlay) overlay.style.display = 'none';
        }
    }
}

function resetEntireGame() {
    STATE.players.forEach(p => p.score = 0);
    STATE.round = 1;
    STATE.isGameOver = false;
    STATE.winner = null;
    setupGame();
}

// Movement Speeds (Pixels per frame)
const SPEEDS = {
    TUNNEL: 1.5,
    DIGGING: 0.5,
    TANK_SIZE: 7
};

function initUI() {
    // Labels "E" and "S" pixel data (7x5)
    const fontE = [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1]
    ];
    const fontS = [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1]
    ];

    function drawLabel(containerEl, data, color) {
        const id = `label-${Math.random().toString(36).substr(2, 9)}`;
        containerEl.innerHTML = `<canvas id="${id}" width="7" height="5"></canvas>`;
        const canvas = document.getElementById(id);
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(7, 5);
        const rgb = hexToRgb(color);
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 7; x++) {
                if (data[y][x]) {
                    const idx = (y * 7 + x) * 4;
                    imgData.data[idx] = rgb.r;
                    imgData.data[idx + 1] = rgb.g;
                    imgData.data[idx + 2] = rgb.b;
                    imgData.data[idx + 3] = 255;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    document.querySelectorAll('.energy .label').forEach((el) => drawLabel(el, fontE, CONFIG.COLORS.CANNON_YELLOW));
    document.querySelectorAll('.shield .label').forEach((el) => drawLabel(el, fontS, CONFIG.COLORS.SHIELD_TURQUOISE));
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function initNoiseROM() {
    const cfg = CONFIG.INTERFERENCE;
    const rowBytes = CONFIG.VIEW.WIDTH * 3;
    const romSize = rowBytes * cfg.ROM_ROWS;
    STATE.noiseROM = new Uint8ClampedArray(romSize);

    // Initial noise filled grid
    for (let i = 0; i < romSize; i++) {
        STATE.noiseROM[i] = Math.floor(Math.random() * 256);
    }

    // Inject bands (from demo)
    const nBands = Math.floor(50 + 200 * cfg.PATTERN_STRENGTH);
    for (let i = 0; i < nBands; i++) {
        const rowStart = Math.floor(Math.random() * (cfg.ROM_ROWS - 10)) * rowBytes;
        const nRows = Math.floor(Math.random() * Math.max(2, Math.floor(6 * cfg.PATTERN_STRENGTH))) + 1;
        const length = nRows * rowBytes;

        if (Math.random() < cfg.PATTERN_STRENGTH) {
            const patLen = Math.floor(Math.random() * Math.max(3, Math.floor(20 * (1 - cfg.PATTERN_STRENGTH) + 3))) + 2;
            const pattern = new Uint8Array(patLen);
            for (let p = 0; p < patLen; p++) pattern[p] = Math.floor(Math.random() * 256);
            for (let j = 0; j < length; j++) STATE.noiseROM[rowStart + j] = pattern[j % patLen];
        } else {
            const color = Math.floor(Math.random() * 256);
            for (let j = 0; j < length; j++) STATE.noiseROM[rowStart + j] = color;
        }
    }
}

function getNoiseFrame(player) {
    const cfg = CONFIG.INTERFERENCE;
    const vw = CONFIG.VIEW.WIDTH;
    const vh = CONFIG.VIEW.HEIGHT;
    const rowBytes = vw * 3;
    const start = Math.floor(Math.random() * (cfg.ROM_ROWS - vh)) * rowBytes;

    if (!player.dropout.cachedFrame) player.dropout.cachedFrame = new Uint8ClampedArray(vw * vh * 4);
    const target = player.dropout.cachedFrame;

    for (let y = 0; y < vh; y++) {
        for (let x = 0; x < vw; x++) {
            const romIdx = start + (y * rowBytes) + (x * 3);
            const canvasIdx = (y * vw + x) * 4;

            const r = STATE.noiseROM[romIdx];
            const g = STATE.noiseROM[romIdx + 1];
            const b = STATE.noiseROM[romIdx + 2];

            const showPixel = Math.random() < cfg.NOISE_DENSITY;
            if (showPixel) {
                target[canvasIdx] = r; target[canvasIdx + 1] = g; target[canvasIdx + 2] = b; target[canvasIdx + 3] = 255;
            } else {
                target[canvasIdx] = 0; target[canvasIdx + 1] = 0; target[canvasIdx + 2] = 0; target[canvasIdx + 3] = 255;
            }
        }
    }
}

function setupGame() {
    generateWorld();
    placeEntities();
    initRound();

    // Set crisp rendering for all canvases
    ['canvas-left', 'canvas-right', 'overlay-canvas'].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
        }
    });
}

function initRound() {
    // Reset player states for new round
    STATE.players.forEach(p => {
        // Respawn at base center
        p.x = p.baseX + CONFIG.ENTITIES.BASE_SIZE / 2;
        p.y = p.baseY + CONFIG.ENTITIES.BASE_SIZE / 2;
        p.angle = (p.id === 'blue') ? 90 : 270; // Face inwards initially
        p.energy = CONFIG.PHYSICS.ENERGY_MAX;
        p.shield = CONFIG.PHYSICS.SHIELD_MAX;
        p.fireReservoir = 100;
        p.dropout = { inBurst: false, burstRemaining: 0, stutterRemaining: 0, cachedFrame: null };
        p.isDestroyed = false;
    });

    // Clear projectiles and particles
    STATE.bullets = [];
    STATE.particles = [];
    updateViewPositions();
}

/**
 * WORLD GENERATION
 * Ported from approved world_gen_demo
 */
function generateWorld() {
    const w = CONFIG.WORLD.WIDTH;
    const h = CONFIG.WORLD.HEIGHT;
    STATE.world = new Uint8Array(w * h);

    // Initial noise filled grid
    for (let i = 0; i < STATE.world.length; i++) {
        STATE.world[i] = Math.random() < 0.5 ? CELLS.SOIL_A : CELLS.SOIL_B;
    }

    generateBorders();
    generateIslands();
}

function generateBorders() {
    const w = CONFIG.WORLD.WIDTH;
    const h = CONFIG.WORLD.HEIGHT;
    const cfg = CONFIG.WORLD_GEN;

    function drawStalagmite(startX, startY, angle, maxLen) {
        let x = startX, y = startY, curAngle = angle;
        const length = 5 + Math.random() * maxLen;
        for (let i = 0; i < length; i++) {
            const progress = i / length;
            const thickness = Math.max(0.5, cfg.FINGER_THICK * (1 - progress * (cfg.FINGER_TAPER / 100)));
            x += Math.cos(curAngle); y += Math.sin(curAngle);
            curAngle += (Math.random() - 0.5) * (cfg.BORDER_JAGGED / 100) * 2;
            const r = Math.ceil(thickness);
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const wx = Math.floor(x + dx), wy = Math.floor(y + dy);
                    if (wx >= 0 && wx < w && wy >= 0 && wy < h && dx * dx + dy * dy <= thickness * thickness) {
                        STATE.world[wy * w + wx] = CELLS.ROCK;
                    }
                }
            }
        }
    }

    const spawnFreq = 2 + (1 - (cfg.BORDER_DENSITY / 100)) * 50;
    for (let x = 0; x < w; x += spawnFreq + Math.random() * 5) drawStalagmite(x, 0, Math.PI / 2, cfg.BORDER_DEPTH);
    for (let x = 0; x < w; x += spawnFreq + Math.random() * 5) drawStalagmite(x, h - 1, -Math.PI / 2, cfg.BORDER_DEPTH);
    for (let y = 0; y < h; y += spawnFreq + Math.random() * 5) drawStalagmite(0, y, 0, cfg.BORDER_DEPTH);
    for (let y = 0; y < h; y += spawnFreq + Math.random() * 5) drawStalagmite(w - 1, y, Math.PI, cfg.BORDER_DEPTH);

    // SOLID BORDERS
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < 2; y++) {
            STATE.world[y * w + x] = CELLS.ROCK;
            STATE.world[(h - 1 - y) * w + x] = CELLS.ROCK;
        }
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < 2; x++) {
            STATE.world[y * w + x] = CELLS.ROCK;
            STATE.world[y * w + (w - 1 - x)] = CELLS.ROCK;
        }
    }
}

function generateIslands() {
    const w = CONFIG.WORLD.WIDTH, h = CONFIG.WORLD.HEIGHT;
    const cfg = CONFIG.WORLD_GEN;

    // Perlin/Value noise simplified for island seeding
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (STATE.world[y * w + x] === CELLS.ROCK) continue;
            // Using Math.random for seed density in islands as demo did something similar
            if (Math.random() < (cfg.ISLAND_SEED / 1000)) {
                STATE.world[y * w + x] = CELLS.ROCK;
            }
        }
    }

    // Cellular Automata refinement
    for (let iter = 0; iter < cfg.ISLAND_CA; iter++) {
        const nextWorld = new Uint8Array(STATE.world);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let rockNeighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (STATE.world[(y + dy) * w + (x + dx)] === CELLS.ROCK) rockNeighbors++;
                    }
                }
                if (STATE.world[y * w + x] === CELLS.ROCK) {
                    if (rockNeighbors < 4) nextWorld[y * w + x] = Math.random() < 0.5 ? CELLS.SOIL_A : CELLS.SOIL_B;
                } else if (rockNeighbors > 4) {
                    nextWorld[y * w + x] = CELLS.ROCK;
                }
            }
        }
        STATE.world = nextWorld;
    }
}

/**
 * ENTITY PLACEMENT
 */
function placeEntities() {
    const w = CONFIG.WORLD.WIDTH, h = CONFIG.WORLD.HEIGHT;
    const baseSize = CONFIG.ENTITIES.BASE_SIZE;

    function canPlaceBase(bx, by) {
        // Must not overlap rock
        for (let y = by; y < by + baseSize; y++) {
            for (let x = bx; x < bx + baseSize; x++) {
                if (STATE.world[y * w + x] === CELLS.ROCK) return false;
            }
        }
        return true;
    }

    // Place Blue Base (Left Side)
    let bluePlaced = false;
    while (!bluePlaced) {
        const bx = Math.floor(Math.random() * (w / 2 - baseSize - 50)) + 25;
        const by = Math.floor(Math.random() * (h - baseSize - 50)) + 25;
        if (canPlaceBase(bx, by)) {
            STATE.players[0].baseX = bx;
            STATE.players[0].baseY = by;
            STATE.players[0].x = bx + baseSize / 2;
            STATE.players[0].y = by + baseSize / 2;
            drawBase(bx, by, CONFIG.COLORS.LIGHT_BLUE);
            bluePlaced = true;
        }
    }

    // Place Green Base (Right Side)
    let greenPlaced = false;
    while (!greenPlaced) {
        const bx = Math.floor(Math.random() * (w / 2 - baseSize - 50)) + w / 2 + 25;
        const by = Math.floor(Math.random() * (h - baseSize - 50)) + 25;

        // Distance check
        const dx = bx - STATE.players[0].baseX;
        const dy = by - STATE.players[0].baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > CONFIG.ENTITIES.MIN_BASE_DISTANCE && canPlaceBase(bx, by)) {
            STATE.players[1].baseX = bx;
            STATE.players[1].baseY = by;
            STATE.players[1].x = bx + baseSize / 2;
            STATE.players[1].y = by + baseSize / 2;
            drawBase(bx, by, CONFIG.COLORS.LIGHT_GREEN);
            greenPlaced = true;
        }
    }
}

function drawBase(bx, by, color) {
    const w = CONFIG.WORLD.WIDTH;
    const baseSize = CONFIG.ENTITIES.BASE_SIZE;
    const gap = 9; // Widened to 9px for 7px tank
    const side = (baseSize - gap) / 2;

    // Interior is empty (black/hollow)
    for (let y = by + 1; y < by + baseSize - 1; y++) {
        for (let x = bx + 1; x < bx + baseSize - 1; x++) {
            STATE.world[y * w + x] = CELLS.EMPTY;
        }
    }

    const blueVal = 10, greenVal = 11;
    const val = (color === CONFIG.COLORS.LIGHT_BLUE) ? blueVal : greenVal;

    // Top/Bottom walls with gaps
    for (let x = bx; x < bx + baseSize; x++) {
        const isGap = (x >= Math.floor(bx + side) && x < Math.floor(bx + side + gap));
        if (!isGap) {
            STATE.world[by * w + x] = val;
            STATE.world[(by + baseSize - 1) * w + x] = val;
        } else {
            STATE.world[by * w + x] = CELLS.EMPTY;
            STATE.world[(by + baseSize - 1) * w + x] = CELLS.EMPTY;
        }
    }
    // Left/Right walls
    for (let y = by; y < by + baseSize; y++) {
        STATE.world[y * w + bx] = val;
        STATE.world[y * w + (bx + baseSize - 1)] = val;
    }
}

function updateViewPositions() {
    STATE.players.forEach(p => {
        // Center the view on the tank, then floor the coordinates
        // This ensures the tank stays at a fixed pixel offset relative to the view edges
        // We use Math.floor(p.x) and Math.floor(p.y) as the "locked" pixel position of the tank
        p.viewX = Math.floor(p.x) - Math.floor(CONFIG.VIEW.WIDTH / 2);
        p.viewY = Math.floor(p.y) - Math.floor(CONFIG.VIEW.HEIGHT / 2);
        // Clamp to world
        p.viewX = Math.max(0, Math.min(CONFIG.WORLD.WIDTH - CONFIG.VIEW.WIDTH, p.viewX));
        p.viewY = Math.max(0, Math.min(CONFIG.WORLD.HEIGHT - CONFIG.VIEW.HEIGHT, p.viewY));
    });
}



function gameLoop(time) {
    const delta = time - lastTime;
    const interval = 1000 / CONFIG.WORLD.FPS;

    if (delta >= interval) {
        lastTime = time - (delta % interval);
        STATE.frameCounter++;
        updateMovement();
        updateCombat();
        updateExplosions();
        updateViewPositions();
        updateRoundFlow();
        if (!STATE.isGameOver) render();
        else renderGameOver();
    }
    requestAnimationFrame(gameLoop);
}

function updateMovement() {
    const controls = [
        { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', player: STATE.players[0] },
        { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', player: STATE.players[1] }
    ];

    controls.forEach(c => {
        let dx = 0, dy = 0;
        if (STATE.keys[c.up]) dy -= 1;
        if (STATE.keys[c.down]) dy += 1;
        if (STATE.keys[c.left]) dx -= 1;
        if (STATE.keys[c.right]) dx += 1;

        if (dx !== 0 || dy !== 0) {
            // Update Angle (North = 0)
            if (dy === -1 && dx === 0) c.player.angle = 0;
            else if (dy === -1 && dx === 1) c.player.angle = 45;
            else if (dy === 0 && dx === 1) c.player.angle = 90;
            else if (dy === 1 && dx === 1) c.player.angle = 135;
            else if (dy === 1 && dx === 0) c.player.angle = 180;
            else if (dy === 1 && dx === -1) c.player.angle = 225;
            else if (dy === 0 && dx === -1) c.player.angle = 270;
            else if (dy === -1 && dx === -1) c.player.angle = 315;

            // Speed logic: Check if digging or in tunnel
            const isDigging = checkIsDigging(c.player.x, c.player.y, dx, dy);
            let speed = isDigging ? SPEEDS.DIGGING : SPEEDS.TUNNEL;

            // Normalize diagonal speed (approx 1/sqrt(2))
            let moveX = dx;
            let moveY = dy;
            if (dx !== 0 && dy !== 0) {
                const norm = Math.sqrt(dx * dx + dy * dy);
                moveX /= norm;
                moveY /= norm;
            }

            const nextX = c.player.x + moveX * speed;
            const nextY = c.player.y + moveY * speed;

            // Collision with Rock or Base
            if (!checkObstacleCollision(nextX, nextY)) {
                c.player.x = nextX;
                c.player.y = nextY;
                // Energy Drain
                c.player.energy = Math.max(0, c.player.energy - (isDigging ? CONFIG.PHYSICS.ENERGY_DIG_COST : CONFIG.PHYSICS.ENERGY_MOVE_COST));
                // Dig soil (smoothed)
                digSoil(c.player.x, c.player.y, dx, dy);
            }
        }

        // RECHARGE logic
        const inBase = checkInBase(c.player);
        if (inBase) {
            c.player.energy = Math.min(CONFIG.PHYSICS.ENERGY_MAX, c.player.energy + CONFIG.PHYSICS.RECHARGE_RATE);
            if (inBase === c.player.id) { // Own base
                c.player.shield = Math.min(CONFIG.PHYSICS.SHIELD_MAX, c.player.shield + CONFIG.PHYSICS.RECHARGE_RATE_SHIELD);
            }
        }

        // SIGNAL LOSS logic
        updateSignalLoss(c.player);
    });
}

function checkInBase(p) {
    const baseSize = CONFIG.ENTITIES.BASE_SIZE;
    // Check all players' bases
    for (let other of STATE.players) {
        if (p.x >= other.baseX && p.x < other.baseX + baseSize &&
            p.y >= other.baseY && p.y < other.baseY + baseSize) {
            return other.id;
        }
    }
    return null;
}

function updateSignalLoss(p) {
    const cfg = CONFIG.INTERFERENCE;
    if (p.energy > cfg.THRESHOLD) {
        p.dropout.inBurst = false;
        return;
    }

    // Degradation factor
    const noiseFactor = 1.0 - Math.pow(p.energy / cfg.THRESHOLD, cfg.DEGRADATION_PWR);
    const lossProb = cfg.DROP_CHANCE_RANGE[0] + noiseFactor * (cfg.DROP_CHANCE_RANGE[1] - cfg.DROP_CHANCE_RANGE[0]);
    const burstLenEst = cfg.DROP_DURATION_RANGE[0] + noiseFactor * (cfg.DROP_DURATION_RANGE[1] - cfg.DROP_DURATION_RANGE[0]);

    if (!p.dropout.inBurst) {
        if (Math.random() < lossProb) {
            p.dropout.inBurst = true;
            p.dropout.burstRemaining = Math.floor(burstLenEst * (0.8 + Math.random() * 0.7));
            p.dropout.stutterRemaining = 0;
        }
    } else {
        if (p.dropout.stutterRemaining <= 0) {
            getNoiseFrame(p);
            p.dropout.stutterRemaining = cfg.STUTTER;
        }
        p.dropout.stutterRemaining--;
        p.dropout.burstRemaining--;
        if (p.dropout.burstRemaining <= 0) p.dropout.inBurst = false;
    }
}

function checkObstacleCollision(nx, ny) {
    const w = CONFIG.WORLD.WIDTH;
    const r = 3; // Strict 7x7 for tank body and cannon tip
    const cx = Math.round(nx);
    const cy = Math.round(ny);

    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const tx = cx + dx;
            const ty = cy + dy;
            // Boundary check
            if (tx < 0 || tx >= CONFIG.WORLD.WIDTH || ty < 0 || ty >= CONFIG.WORLD.HEIGHT) return true;
            const cell = STATE.world[ty * w + tx];
            if (cell === CELLS.ROCK || cell === 10 || cell === 11) return true;
        }
    }
    return false;
}

function checkIsDigging(px, py, dx, dy) {
    const w = CONFIG.WORLD.WIDTH;
    const x = Math.floor(px + dx * (SPEEDS.TANK_SIZE / 2 + 1));
    const y = Math.floor(py + dy * (SPEEDS.TANK_SIZE / 2 + 1));
    const cell = STATE.world[y * w + x];
    return cell === CELLS.SOIL_A || cell === CELLS.SOIL_B;
}

function digSoil(px, py, dx, dy) {
    const w = CONFIG.WORLD.WIDTH;
    // Use Math.floor(px) and Math.floor(py) to match view/sprite world coordinates
    const cx = Math.floor(px);
    const cy = Math.floor(py);

    // Smoothed square mask (7x7 with corners removed)
    const MASK = [
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0]
    ];

    for (let dym = -3; dym <= 3; dym++) {
        for (let dxm = -3; dxm <= 3; dxm++) {
            if (MASK[dym + 3][dxm + 3]) {
                const tx = cx + dxm;
                const ty = cy + dym;
                if (tx >= 0 && tx < CONFIG.WORLD.WIDTH && ty >= 0 && ty < CONFIG.WORLD.HEIGHT) {
                    const cell = STATE.world[ty * w + tx];
                    if (cell === CELLS.SOIL_A || cell === CELLS.SOIL_B) {
                        STATE.world[ty * w + tx] = CELLS.EMPTY;
                    }
                }
            }
        }
    }
}

function updateCombat() {
    const fireKeys = ['ShiftLeft', 'ShiftRight'];

    STATE.players.forEach((p, i) => {
        const inflow = (p.energy / CONFIG.PHYSICS.ENERGY_MAX) * CONFIG.COMBAT.INFLOW_RATE_MAX * 10;
        p.fireReservoir = Math.min(100, (p.fireReservoir || 100) + inflow);

        if (STATE.keys[fireKeys[i]] && p.energy > 0 && p.fireReservoir >= CONFIG.COMBAT.FIRE_ENERGY_COST && STATE.frameCounter % CONFIG.COMBAT.BULLET_CADENCE === 0) {
            p.fireReservoir -= CONFIG.COMBAT.FIRE_ENERGY_COST;
            p.energy = Math.max(0, p.energy - 0.5); // Shooting costs energy
            fireBullet(p);
        }

        // Destruction by zero energy
        if (p.energy <= 0 && !STATE.isRoundEnding) {
            destroyTank(p);
        }
    });

    // Move Bullets Iteratively (1px at a time to prevent tunneling)
    for (let i = STATE.bullets.length - 1; i >= 0; i--) {
        const b = STATE.bullets[i];
        let collided = false;

        for (let step = 0; step < CONFIG.COMBAT.BULLET_SPEED; step++) {
            const nextX = b.x + b.dx;
            const nextY = b.y + b.dy;

            if (checkBulletCollision(nextX, nextY) || checkTankHit({ x: nextX, y: nextY, owner: b.owner })) {
                // Spawn explosion at the CURRENT (last safe) position to stay on "soil side"
                spawnExplosion(b.x, b.y, CONFIG.COMBAT.BULLET_EXPLOSION);
                STATE.bullets.splice(i, 1);
                collided = true;
                break;
            }
            b.x = nextX;
            b.y = nextY;
        }

        if (!collided && (b.x < 0 || b.x >= CONFIG.WORLD.WIDTH || b.y < 0 || b.y >= CONFIG.WORLD.HEIGHT)) {
            STATE.bullets.splice(i, 1);
        }
    }
}

function destroyTank(p) {
    if (STATE.isRoundEnding) return;
    p.energy = 0; // Explicitly zero out energy
    STATE.isRoundEnding = true;
    STATE.roundEndTimer = 60; // Wait 3 seconds at 20fps for explosion/screen
    p.isDestroyed = true;
    spawnExplosion(p.x, p.y, CONFIG.COMBAT.TANK_EXPLOSION);

    // Increment opponent's score
    const winner = STATE.players.find(other => other.id !== p.id);
    if (winner) winner.score++;
}

function updateRoundFlow() {
    if (STATE.isGameOver) return;

    if (STATE.isRoundEnding) {
        if (STATE.waitingForInput) return; // Wait for key press

        STATE.roundEndTimer--;
        if (STATE.roundEndTimer <= 0) {
            // Check for Game Over
            const p1 = STATE.players[0];
            const p2 = STATE.players[1];
            if (p1.score >= CONFIG.WORLD.SCORE_LIMIT || p2.score >= CONFIG.WORLD.SCORE_LIMIT) {
                STATE.isGameOver = true;
                STATE.winner = p1.score >= CONFIG.WORLD.SCORE_LIMIT ? p1 : p2;
                STATE.overlayStartTime = Date.now(); // Record start time for Game Over screen
                return;
            }

            STATE.waitingForInput = true;
            STATE.overlayStartTime = Date.now(); // Record start time for Round screen
        }
    }
}

function checkBulletCollision(bx, by) {
    const w = CONFIG.WORLD.WIDTH;
    const tx = Math.floor(bx);
    const ty = Math.floor(by);
    if (tx < 0 || tx >= CONFIG.WORLD.WIDTH || ty < 0 || ty >= CONFIG.WORLD.HEIGHT) return true;
    const cell = STATE.world[ty * w + tx];
    // Explode on Rock, Basewalls (10, 11), or Soil
    return cell === CELLS.ROCK || cell === 10 || cell === 11 || cell === CELLS.SOIL_A || cell === CELLS.SOIL_B;
}

function fireBullet(p) {
    const rad = (p.angle - 90) * Math.PI / 180;
    // Spawn at cannon tip (approx 4px from center for 7x7 sprite)
    const sx = Math.floor(p.x) + Math.cos(rad) * 4;
    const sy = Math.floor(p.y) + Math.sin(rad) * 4;

    // Check if cannon tip is already inside a wall
    if (checkBulletCollision(sx, sy)) {
        spawnExplosion(sx, sy, CONFIG.COMBAT.BULLET_EXPLOSION);
        return;
    }

    STATE.bullets.push({
        x: sx,
        y: sy,
        dx: Math.cos(rad),
        dy: Math.sin(rad),
        owner: p.id
    });
}

function checkTankHit(b) {
    for (let p of STATE.players) {
        if (p.id === b.owner) continue;
        const dist = Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2);
        if (dist < 4) {
            p.shield -= 20;
            if (p.shield <= 0) {
                destroyTank(p);
            }
            return true;
        }
    }
    return false;
}

function spawnExplosion(x, y, cfg) {
    const w = CONFIG.WORLD.WIDTH;
    const h = CONFIG.WORLD.HEIGHT;

    for (let i = 0; i < cfg.N; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * cfg.R;
        const speed = Math.random() * 0.8 + 0.2;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;

        // Don't spawn particles inside solid walls/rocks
        const tx = Math.floor(px);
        const ty = Math.floor(py);
        if (tx >= 0 && tx < w && ty >= 0 && ty < h) {
            const cell = STATE.world[ty * w + tx];
            if (cell === CELLS.ROCK || cell === 10 || cell === 11) continue;
        }

        STATE.particles.push({
            x: px,
            y: py,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: Math.floor(Math.random() * cfg.LIFE) + 1,
            maxLife: cfg.LIFE
        });
    }
}

function updateExplosions() {
    const w = CONFIG.WORLD.WIDTH;
    const isUpdateFrame = (STATE.frameCounter % CONFIG.COMBAT.FIRE_FRAME_MULTIPLIER === 0);

    for (let i = STATE.particles.length - 1; i >= 0; i--) {
        const p = STATE.particles[i];
        if (isUpdateFrame) {
            p.x += p.dx;
            p.y += p.dy;
        }
        p.life--;

        // Shrapnel collision check (Stop on rock/walls)
        const tx = Math.floor(p.x), ty = Math.floor(p.y);
        if (tx >= 0 && tx < CONFIG.WORLD.WIDTH && ty >= 0 && ty < CONFIG.WORLD.HEIGHT) {
            const cell = STATE.world[ty * w + tx];
            if (cell === CELLS.ROCK || cell === 10 || cell === 11) {
                STATE.particles.splice(i, 1);
            } else if (cell === CELLS.SOIL_A || cell === CELLS.SOIL_B) {
                STATE.world[ty * w + tx] = CELLS.EMPTY;
            }
        }
        if (p.life <= 0) STATE.particles.splice(i, 1);
    }
}

const TANK_SPRITES = {};

function initSprites() {
    const lateral = [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 3, 3, 3, 3, 3, 3],
        [0, 0, 1, 1, 1, 1, 0],
        [2, 2, 2, 2, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0],
        [0, 3, 3, 3, 3, 3, 3],
        [0, 0, 0, 0, 0, 0, 0]
    ];

    const diagonal = [
        [0, 0, 0, 3, 0, 0, 0],
        [0, 0, 3, 1, 0, 2, 0],
        [0, 3, 1, 1, 2, 0, 0],
        [3, 1, 1, 2, 1, 1, 3],
        [0, 0, 1, 1, 1, 3, 0],
        [0, 0, 0, 1, 3, 0, 0],
        [0, 0, 0, 3, 0, 0, 0]
    ];

    function rotate(m) {
        const n = m.length;
        const res = Array.from({ length: n }, () => new Array(n));
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                res[x][n - 1 - y] = m[y][x];
            }
        }
        return res;
    }

    function flipH(m) {
        return m.map(row => [...row].reverse());
    }

    function flipV(m) {
        return [...m].reverse();
    }

    // 270 (Left) is our template (lateral)
    TANK_SPRITES[270] = lateral;
    TANK_SPRITES[90] = flipH(lateral);

    // 0 (Up) is lateral rotated CW
    const up = rotate(lateral);
    TANK_SPRITES[0] = up;
    TANK_SPRITES[180] = flipV(up);

    // Diagonal: 45 (Up-Right) is our template
    TANK_SPRITES[45] = diagonal;
    TANK_SPRITES[135] = flipV(diagonal);
    TANK_SPRITES[225] = flipH(TANK_SPRITES[135]);
    TANK_SPRITES[315] = flipH(diagonal);
}

// Sprites are initialized in the DOMContentLoaded listener above.

function render() {
    const w = CONFIG.WORLD.WIDTH;
    const vw = CONFIG.VIEW.WIDTH;
    const vh = CONFIG.VIEW.HEIGHT;

    if (STATE.isGameOver) {
        renderGameOver();
    } else if (STATE.isRoundEnding && STATE.waitingForInput) {
        renderRoundScreenFull();
    } else {
        // Hide overlay if not ending
        const overlay = document.getElementById('overlay-canvas');
        if (overlay) overlay.style.display = 'none';

        STATE.players.forEach((p, i) => {
            const canvas = document.getElementById(i === 0 ? 'canvas-left' : 'canvas-right');
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(vw, vh);

            if (p.dropout.inBurst && p.dropout.cachedFrame) {
                imageData.data.set(p.dropout.cachedFrame);
            } else {
                // Render World
                for (let y = 0; y < vh; y++) {
                    for (let x = 0; x < vw; x++) {
                        const wx = p.viewX + x;
                        const wy = p.viewY + y;
                        const cell = STATE.world[wy * w + wx];
                        const color = getCellColor(cell);
                        const rgb = hexToRgb(color);
                        const idx = (y * vw + x) * 4;
                        imageData.data[idx] = rgb.r;
                        imageData.data[idx + 1] = rgb.g;
                        imageData.data[idx + 2] = rgb.b;
                        imageData.data[idx + 3] = 255;
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);

            // Render Entities on top (if not in dropout)
            if (!p.dropout.inBurst) {
                renderBullets(ctx, p);
                renderParticles(ctx, p);
                renderTanks(ctx, p);
            }

            // Update HUD
            const panel = document.getElementById(i === 0 ? 'panel-left' : 'panel-right');
            panel.querySelector('.energy-fill').style.width = (p.energy / CONFIG.PHYSICS.ENERGY_MAX * 44) + 'px';
            panel.querySelector('.shield-fill').style.width = (p.shield / CONFIG.PHYSICS.SHIELD_MAX * 44) + 'px';
        });
    }
}

function getCellColor(cell) {
    if (cell === CELLS.SOIL_A) return CONFIG.COLORS.LIGHT_ORANGE;
    if (cell === CELLS.SOIL_B) return CONFIG.COLORS.DARK_ORANGE;
    if (cell === CELLS.ROCK) return CONFIG.COLORS.ROCK_GRAY;
    if (cell === CELLS.EMPTY) return CONFIG.COLORS.BLACK;
    if (cell === 10) return CONFIG.COLORS.LIGHT_BLUE; // Base walls
    if (cell === 11) return CONFIG.COLORS.LIGHT_GREEN; // Base walls
    return CONFIG.COLORS.BLACK;
}

function renderTanks(ctx, viewOwner) {
    STATE.players.forEach(p => {
        if (p.isDestroyed) return;
        // Consistent rounding: Math.floor(p.x) matches view calculation
        const relX = Math.floor(p.x) - viewOwner.viewX;
        const relY = Math.floor(p.y) - viewOwner.viewY;

        if (relX > -5 && relX < CONFIG.VIEW.WIDTH + 5 && relY > -5 && relY < CONFIG.VIEW.HEIGHT + 5) {
            // Get sprite for current angle
            const sprite = TANK_SPRITES[p.angle] || TANK_SPRITES[0];

            sprite.forEach((row, sy) => {
                row.forEach((val, sx) => {
                    if (val === 0) return;
                    let color;
                    if (val === 1) color = p.color;
                    else if (val === 2) color = CONFIG.COLORS.CANNON_YELLOW;
                    else if (val === 3) color = p.wheelColor; // Use player-specific wheel color
                    ctx.fillStyle = color;
                    // Draw pixels relative to the calculated top-left of the tank
                    ctx.fillRect(relX + sx - 3, relY + sy - 3, 1, 1);
                });
            });
        }
    });
}

function renderBullets(ctx, viewOwner) {
    STATE.bullets.forEach(b => {
        const relX = b.x - viewOwner.viewX;
        const relY = b.y - viewOwner.viewY;
        if (relX >= 0 && relX < CONFIG.VIEW.WIDTH && relY >= 0 && relY < CONFIG.VIEW.HEIGHT) {
            ctx.fillStyle = CONFIG.COLORS.BULLET_RED;
            ctx.fillRect(Math.floor(relX), Math.floor(relY), 1, 1);
            ctx.fillStyle = CONFIG.COLORS.BULLET_RED_TAIL;
            ctx.fillRect(Math.floor(relX - b.dx), Math.floor(relY - b.dy), 1, 1);
        }
    });
}

function renderParticles(ctx, viewOwner) {
    STATE.particles.forEach(p => {
        const relX = p.x - viewOwner.viewX;
        const relY = p.y - viewOwner.viewY;
        if (relX >= 0 && relX < CONFIG.VIEW.WIDTH && relY >= 0 && relY < CONFIG.VIEW.HEIGHT) {
            ctx.fillStyle = CONFIG.COLORS.BULLET_RED;
            ctx.fillRect(Math.floor(relX), Math.floor(relY), 1, 1);
        }
    });
}

function renderRoundScreenFull() {
    const canvas = document.getElementById('overlay-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const vw = 160, vh = 100;
    const scale = CONFIG.UI.TEXT_SIZE;

    // Ensure crisp rendering
    ctx.imageSmoothingEnabled = false;

    // Solid black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, vw, vh);

    // 1px Pink box - Small, framed around ROUND X
    const boxW = 64 * scale, boxH = 12 * scale;
    const bx = Math.floor((vw - boxW) / 2), by = 25;
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, boxW, boxH);

    // Text: ROUND X (Rainbow, stable colors)
    const text = `ROUND ${STATE.round}`;
    const charW = 8 * scale;
    const startX = Math.floor((vw - text.length * charW) / 2);
    const ty = Math.floor(by + (boxH - 8 * scale) / 2);

    for (let i = 0; i < text.length; i++) {
        // Flickering effect: Random color from palette per frame
        const color = CONFIG.UI.RAINBOW_COLORS[Math.floor(Math.random() * CONFIG.UI.RAINBOW_COLORS.length)];
        drawBitmapText(ctx, text[i], startX + i * charW, ty, color, scale);
    }

    // Scores
    const scoreY = 55;
    const leftX = Math.floor(vw / 4 - (4 * charW) / 2); // Center "BLUE" in left half
    const rightX = Math.floor(3 * vw / 4 - (5 * charW) / 2); // Center "GREEN" in right half

    drawBitmapText(ctx, 'BLUE', leftX, scoreY, CONFIG.COLORS.LIGHT_BLUE, scale);
    drawBitmapText(ctx, STATE.players[0].score.toString(), leftX + (4 * charW - charW) / 2, scoreY + 10 * scale, CONFIG.COLORS.LIGHT_BLUE, scale);

    drawBitmapText(ctx, 'GREEN', rightX, scoreY, CONFIG.COLORS.LIGHT_GREEN, scale);
    drawBitmapText(ctx, STATE.players[1].score.toString(), rightX + (5 * charW - charW) / 2, scoreY + 10 * scale, CONFIG.COLORS.LIGHT_GREEN, scale);
}

function renderGameOver() {
    const canvas = document.getElementById('overlay-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const vw = 160, vh = 100;
    const scale = CONFIG.UI.TEXT_SIZE;
    const charW = 8 * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, vw, vh);

    // Winner Text
    const blueScore = STATE.players[0].score;
    const greenScore = STATE.players[1].score;
    const winner = blueScore > greenScore ? 'BLUE' : 'GREEN';
    const winnerColor = blueScore > greenScore ? CONFIG.COLORS.LIGHT_BLUE : CONFIG.COLORS.LIGHT_GREEN;
    const winText = `${winner} WINS!`;

    drawBitmapText(ctx, winText, Math.floor((vw - winText.length * charW) / 2), 15, winnerColor, scale);

    // Prompt
    const prompt = 'PRESS ANY KEY TO PLAY AGAIN';
    drawBitmapText(ctx, prompt, Math.floor((vw - prompt.length * charW) / 2), 40, '#ffffff', scale);

    // Final Scores
    const bText = `BLUE: ${blueScore}`;
    const gText = `GREEN: ${greenScore}`;
    drawBitmapText(ctx, bText, Math.floor(vw / 2 - bText.length * charW - 5), 75, CONFIG.COLORS.LIGHT_BLUE, scale);
    drawBitmapText(ctx, gText, Math.floor(vw / 2 + 5), 75, CONFIG.COLORS.LIGHT_GREEN, scale);
}


