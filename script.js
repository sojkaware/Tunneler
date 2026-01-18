// Tunneler - Core Game Logic

/**
 * CENTRAL CONFIGURATION
 * All game parameters are stored here as requested.
 */
const CONFIG = {
    WORLD: {
        WIDTH: 1024,
        HEIGHT: 512,
        FPS: 30, // Conventional low FPS feel
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
        DARK_BLUE_PLAYER: '#0000b6',
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
            color: CONFIG.COLORS.LIGHT_BLUE
        },
        {
            id: 'green',
            x: 0, y: 0, angle: 0,
            energy: CONFIG.PHYSICS.ENERGY_MAX,
            shield: CONFIG.PHYSICS.SHIELD_MAX,
            score: 0,
            baseX: 0, baseY: 0,
            viewX: 0, viewY: 0,
            color: CONFIG.COLORS.LIGHT_GREEN
        }
    ],
    keys: {}
};

// CELL TYPES
const CELLS = {
    SOIL_A: 0,
    ROCK: 1,
    SOIL_B: 2,
    EMPTY: 3
};

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initGame();
    // Event Listeners for Input
    window.addEventListener('keydown', (e) => { STATE.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { STATE.keys[e.code] = false; });

    requestAnimationFrame(gameLoop);
});

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

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    document.querySelectorAll('.energy .label').forEach((el) => drawLabel(el, fontE, CONFIG.COLORS.CANNON_YELLOW));
    document.querySelectorAll('.shield .label').forEach((el) => drawLabel(el, fontS, CONFIG.COLORS.SHIELD_TURQUOISE));
}

function initGame() {
    generateWorld();
    placeEntities();
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
    const gap = CONFIG.ENTITIES.BASE_ENTRANCE_GAP;
    const side = (baseSize - gap) / 2;

    // Interior is empty (black/hollow)
    for (let y = by + 1; y < by + baseSize - 1; y++) {
        for (let x = bx + 1; x < bx + baseSize - 1; x++) {
            STATE.world[y * w + x] = CELLS.EMPTY;
        }
    }

    // Walls
    const placeWall = (x, y) => { STATE.world[y * w + x] = CELLS.EMPTY; /* Base walls are actually empty space in original? No, specs say "Color equals tank body color" */ };
    // Wait, original base is hollow inside (black). Walls are colored.
    // I previously set them to EMPTY. Correcting:
    // Actually, I'll use a special marker or just render them differently.
    // For now, let's treat base walls as a special "indestructible" color type or just modify the world.
    // Since world is a Uint8Array, let's add 4: BASE_BLUE, 5: BASE_GREEN.
    const blueVal = 10, greenVal = 11;
    const val = (color === CONFIG.COLORS.LIGHT_BLUE) ? blueVal : greenVal;

    // Top/Bottom walls with gaps
    for (let x = bx; x < bx + baseSize; x++) {
        if (x < bx + side || x >= bx + side + gap) {
            STATE.world[by * w + x] = val;
            STATE.world[(by + baseSize - 1) * w + x] = val;
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
        p.viewX = Math.floor(p.x - CONFIG.VIEW.WIDTH / 2);
        p.viewY = Math.floor(p.y - CONFIG.VIEW.HEIGHT / 2);
        // Clamp to world
        p.viewX = Math.max(0, Math.min(CONFIG.WORLD.WIDTH - CONFIG.VIEW.WIDTH, p.viewX));
        p.viewY = Math.max(0, Math.min(CONFIG.WORLD.HEIGHT - CONFIG.VIEW.HEIGHT, p.viewY));
    });
}

// Combat Constants in CONFIG
Object.assign(CONFIG, {
    COMBAT: {
        BULLET_CADENCE: 2, // Every 2 frames
        BULLET_SPEED: 2,
        FIRE_ENERGY_COST: 5,
        INFLOW_RATE_MAX: 1.0, // Proportional to energy
        TANK_EXPLOSION: { N: 30, R: 7, LIFE: 12 },
        BULLET_EXPLOSION: { N: 4, R: 1, LIFE: 3 }
    }
});

// Update STATE
Object.assign(STATE, {
    bullets: [],
    particles: [],
    frameCounter: 0
});

function gameLoop() {
    STATE.frameCounter++;
    updateMovement();
    updateCombat();
    updateExplosions();
    updateViewPositions();
    render();
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
            // Update Angle
            c.player.angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Speed logic: Check if digging or in tunnel
            const isDigging = checkIsDigging(c.player.x, c.player.y, dx, dy);
            const speed = isDigging ? SPEEDS.DIGGING : SPEEDS.TUNNEL;

            const nextX = c.player.x + dx * speed;
            const nextY = c.player.y + dy * speed;

            // Collision with Rock
            if (!checkRockCollision(nextX, nextY)) {
                c.player.x = nextX;
                c.player.y = nextY;
                // Dig soil
                digSoil(c.player.x, c.player.y);
            }
        }
    });
}

function checkIsDigging(px, py, dx, dy) {
    const w = CONFIG.WORLD.WIDTH;
    const x = Math.floor(px + dx * (SPEEDS.TANK_SIZE / 2 + 1));
    const y = Math.floor(py + dy * (SPEEDS.TANK_SIZE / 2 + 1));
    const cell = STATE.world[y * w + x];
    return cell === CELLS.SOIL_A || cell === CELLS.SOIL_B;
}

function checkRockCollision(nx, ny) {
    const w = CONFIG.WORLD.WIDTH;
    const r = SPEEDS.TANK_SIZE / 2;
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const tx = Math.floor(nx + dx);
            const ty = Math.floor(ny + dy);
            if (STATE.world[ty * w + tx] === CELLS.ROCK) return true;
        }
    }
    return false;
}

function digSoil(px, py) {
    const w = CONFIG.WORLD.WIDTH;
    const r = SPEEDS.TANK_SIZE / 2 + 1; // Dig 1px around tank
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const tx = Math.floor(px + dx);
            const ty = Math.floor(py + dy);
            const cell = STATE.world[ty * w + tx];
            if (cell === CELLS.SOIL_A || cell === CELLS.SOIL_B) {
                STATE.world[ty * w + tx] = CELLS.EMPTY;
            }
        }
    }
}

function updateCombat() {
    const fireKeys = ['ControlLeft', 'Enter'];

    STATE.players.forEach((p, i) => {
        // Toilet flusher logic placeholder
        // p.fireReservoir is refilled by energy
        if (!p.fireReservoir) p.fireReservoir = 100;

        const inflow = (p.energy / CONFIG.PHYSICS.ENERGY_MAX) * CONFIG.COMBAT.INFLOW_RATE_MAX * 10;
        p.fireReservoir = Math.min(100, p.fireReservoir + inflow);

        if (STATE.keys[fireKeys[i]] && p.fireReservoir >= CONFIG.COMBAT.FIRE_ENERGY_COST && STATE.frameCounter % CONFIG.COMBAT.BULLET_CADENCE === 0) {
            p.fireReservoir -= CONFIG.COMBAT.FIRE_ENERGY_COST;
            p.energy = Math.max(0, p.energy - 0.5); // Shooting costs energy
            fireBullet(p);
        }
    });

    // Move Bullets
    for (let i = STATE.bullets.length - 1; i >= 0; i--) {
        const b = STATE.bullets[i];
        b.x += b.dx * CONFIG.COMBAT.BULLET_SPEED;
        b.y += b.dy * CONFIG.COMBAT.BULLET_SPEED;

        if (checkRockCollision(b.x, b.y) || checkTankHit(b)) {
            spawnExplosion(b.x, b.y, CONFIG.COMBAT.BULLET_EXPLOSION);
            STATE.bullets.splice(i, 1);
        } else if (b.x < 0 || b.x >= CONFIG.WORLD.WIDTH || b.y < 0 || b.y >= CONFIG.WORLD.HEIGHT) {
            STATE.bullets.splice(i, 1);
        }
    }
}

function fireBullet(p) {
    const rad = p.angle * Math.PI / 180;
    STATE.bullets.push({
        x: p.x + Math.cos(rad) * 6,
        y: p.y + Math.sin(rad) * 6,
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
                spawnExplosion(p.x, p.y, CONFIG.COMBAT.TANK_EXPLOSION);
                // Round reset logic would go here
            }
            return true;
        }
    }
    return false;
}

function spawnExplosion(x, y, cfg) {
    for (let i = 0; i < cfg.N; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        STATE.particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            life: Math.floor(Math.random() * cfg.LIFE) + 1,
            maxLife: cfg.LIFE
        });
    }
}

function updateExplosions() {
    const w = CONFIG.WORLD.WIDTH;
    for (let i = STATE.particles.length - 1; i >= 0; i--) {
        const p = STATE.particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;

        // Remove soil where particle is
        const tx = Math.floor(p.x), ty = Math.floor(p.y);
        if (tx >= 0 && tx < CONFIG.WORLD.WIDTH && ty >= 0 && ty < CONFIG.WORLD.HEIGHT) {
            const cell = STATE.world[ty * w + tx];
            if (cell === CELLS.SOIL_A || cell === CELLS.SOIL_B) {
                STATE.world[ty * w + tx] = CELLS.EMPTY;
            }
        }
        if (p.life <= 0) STATE.particles.splice(i, 1);
    }
}

const TANK_SPRITE = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 3, 3, 3, 3, 3, 3],
    [0, 0, 1, 1, 1, 1, 0],
    [2, 2, 2, 2, 1, 1, 0], // Pointer (cannon) on left/right
    [0, 0, 1, 1, 1, 1, 0],
    [0, 3, 3, 3, 3, 3, 3],
    [0, 0, 0, 0, 0, 0, 0]
];

function render() {
    const w = CONFIG.WORLD.WIDTH;
    const vw = CONFIG.VIEW.WIDTH;
    const vh = CONFIG.VIEW.HEIGHT;

    STATE.players.forEach((p, i) => {
        const canvas = document.getElementById(i === 0 ? 'canvas-left' : 'canvas-right');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(vw, vh);

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
        ctx.putImageData(imageData, 0, 0);

        // Render Entities on top
        renderBullets(ctx, p);
        renderParticles(ctx, p);
        renderTanks(ctx, p);

        // Update HUD
        const panel = document.getElementById(i === 0 ? 'panel-left' : 'panel-right');
        panel.querySelector('.energy-fill').style.width = (p.energy / CONFIG.PHYSICS.ENERGY_MAX * 44) + 'px';
        panel.querySelector('.shield-fill').style.width = (p.shield / CONFIG.PHYSICS.SHIELD_MAX * 44) + 'px';
    });
}

function getCellColor(cell) {
    if (cell === CELLS.SOIL_A) return CONFIG.COLORS.LIGHT_ORANGE;
    if (cell === CELLS.SOIL_B) return CONFIG.COLORS.DARK_ORANGE;
    if (cell === CELLS.ROCK) return CONFIG.COLORS.ROCK_GRAY;
    if (cell === CELLS.EMPTY) return CONFIG.COLORS.BLACK;
    if (cell === 10) return CONFIG.COLORS.LIGHT_BLUE;
    if (cell === 11) return CONFIG.COLORS.LIGHT_GREEN;
    return CONFIG.COLORS.BLACK;
}

function renderTanks(ctx, viewOwner) {
    STATE.players.forEach(p => {
        const relX = p.x - viewOwner.viewX;
        const relY = p.y - viewOwner.viewY;

        if (relX > -5 && relX < CONFIG.VIEW.WIDTH + 5 && relY > -5 && relY < CONFIG.VIEW.HEIGHT + 5) {
            ctx.save();
            ctx.translate(relX, relY);
            ctx.rotate(p.angle * Math.PI / 180);

            // Draw Tank Pixels
            TANK_SPRITE.forEach((row, sy) => {
                row.forEach((val, sx) => {
                    if (val === 0) return;
                    let color;
                    if (val === 1) color = p.color;
                    else if (val === 2) color = CONFIG.COLORS.CANNON_YELLOW;
                    else if (val === 3) color = CONFIG.COLORS.PANEL_SHADOW; // Wheels
                    ctx.fillStyle = color;
                    ctx.fillRect(sx - 3, sy - 3, 1, 1);
                });
            });
            ctx.restore();
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

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}
