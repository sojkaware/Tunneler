const WORLD_WIDTH = 1024;
const WORLD_HEIGHT = 512;
const VIEW_WIDTH = 76;
const VIEW_HEIGHT = 71;

const COLORS = {
    ROCK: '#9a9a9a',
    SOIL_LIGHT: '#c37930',
    SOIL_DARK: '#ba5904',
    EMPTY: '#000000'
};

const canvas = document.getElementById('world-canvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generate-btn');
const zoomToggle = document.getElementById('zoom-toggle');

const controls = {
    borderJagged: document.getElementById('border-jagged'),
    borderDepth: document.getElementById('border-depth'),
    borderDensity: document.getElementById('border-density'),
    fingerThick: document.getElementById('finger-thick'),
    fingerTaper: document.getElementById('finger-taper'),
    islandSeed: document.getElementById('island-seed'),
    islandScale: document.getElementById('island-scale'),
    islandCA: document.getElementById('island-ca'),
    rockMinSize: document.getElementById('rock-min-size')
};

const vals = {
    borderJagged: document.getElementById('val-border-jagged'),
    borderDepth: document.getElementById('val-border-depth'),
    borderDensity: document.getElementById('val-border-density'),
    fingerThick: document.getElementById('val-finger-thick'),
    fingerTaper: document.getElementById('val-finger-taper'),
    islandSeed: document.getElementById('val-island-seed'),
    islandScale: document.getElementById('val-island-scale'),
    islandCA: document.getElementById('val-island-ca'),
    rockMinSize: document.getElementById('val-rock-min-size')
};

let worldGrid = []; // 0: soil_light, 1: rock, 2: soil_dark
let zoomLevel = 'full';
let panX = WORLD_WIDTH / 2 - VIEW_WIDTH / 2;
let panY = WORLD_HEIGHT / 2 - VIEW_HEIGHT / 2;

function init() {
    canvas.width = WORLD_WIDTH;
    canvas.height = WORLD_HEIGHT;

    // Initialize numeric values
    Object.keys(vals).forEach(key => {
        vals[key].textContent = controls[key].value;
    });

    generateWorld();
    render();

    Object.keys(controls).forEach(key => {
        controls[key].addEventListener('input', () => {
            vals[key].textContent = controls[key].value;
            generateWorld();
            render();
        });
    });
}

// 2D Value Noise
let noiseValues = new Float32Array(256 * 256);
function randomizeNoise() {
    for (let i = 0; i < noiseValues.length; i++) noiseValues[i] = Math.random();
}

function getNoise2D(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const f = (t) => t * t * (3 - 2 * t);
    const u = f(xf);
    const v = f(yf);
    const aa = noiseValues[yi * 256 + xi];
    const ab = noiseValues[yi * 256 + (xi + 1 & 255)];
    const ba = noiseValues[(yi + 1 & 255) * 256 + xi];
    const bb = noiseValues[(yi + 1 & 255) * 256 + (xi + 1 & 255)];
    return aa * (1 - u) * (1 - v) + ab * u * (1 - v) + ba * (1 - u) * v + bb * u * v;
}

function generateWorld() {
    randomizeNoise();
    worldGrid = Array(WORLD_HEIGHT).fill().map(() => new Uint8Array(WORLD_WIDTH));

    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            worldGrid[y][x] = Math.random() < 0.5 ? 0 : 2;
        }
    }

    generateBordersTapered();
    generateIslandsNoise();
}

function generateBordersTapered() {
    const jaggedness = controls.borderJagged.value / 100;
    const maxDepth = parseInt(controls.borderDepth.value);
    const baseDensity = controls.borderDensity.value / 100;
    const startThick = parseInt(controls.fingerThick.value);
    const taperRate = controls.fingerTaper.value / 100;

    function drawStalagmite(startX, startY, angle, maxLen) {
        let x = startX;
        let y = startY;
        let curAngle = angle;
        const length = 5 + Math.random() * maxLen;

        for (let i = 0; i < length; i++) {
            const progress = i / length;
            // Taper thickness: from startThick down to 1 (or less)
            const thickness = Math.max(0.5, startThick * (1 - progress * taperRate));

            x += Math.cos(curAngle);
            y += Math.sin(curAngle);

            // Random bend: jaggedness controls variance
            curAngle += (Math.random() - 0.5) * jaggedness * 2.0;

            // Fill blob
            const r = Math.ceil(thickness);
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const wx = Math.floor(x + dx);
                    const wy = Math.floor(y + dy);
                    if (wx >= 0 && wx < WORLD_WIDTH && wy >= 0 && wy < WORLD_HEIGHT) {
                        if (dx * dx + dy * dy <= thickness * thickness) worldGrid[wy][wx] = 1;
                    }
                }
            }
        }
    }

    // Spawn spacing based on density
    const spawnFreq = 2 + (1 - baseDensity) * 50;

    // Top
    for (let x = 0; x < WORLD_WIDTH; x += spawnFreq + Math.random() * 5) {
        drawStalagmite(x, 0, Math.PI / 2, maxDepth);
    }
    // Bottom
    for (let x = 0; x < WORLD_WIDTH; x += spawnFreq + Math.random() * 5) {
        drawStalagmite(x, WORLD_HEIGHT - 1, -Math.PI / 2, maxDepth);
    }
    // Left
    for (let y = 0; y < WORLD_HEIGHT; y += spawnFreq + Math.random() * 5) {
        drawStalagmite(0, y, 0, maxDepth);
    }
    // Right
    for (let y = 0; y < WORLD_HEIGHT; y += spawnFreq + Math.random() * 5) {
        drawStalagmite(WORLD_WIDTH - 1, y, Math.PI, maxDepth);
    }

    // Solidify base
    const baseThick = 4;
    for (let x = 0; x < WORLD_WIDTH; x++) {
        for (let y = 0; y < baseThick; y++) {
            worldGrid[y][x] = 1;
            worldGrid[WORLD_HEIGHT - 1 - y][x] = 1;
        }
    }
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < baseThick; x++) {
            worldGrid[y][x] = 1;
            worldGrid[y][WORLD_WIDTH - 1 - x] = 1;
        }
    }
}

function generateIslandsNoise() {
    const seedDensity = controls.islandSeed.value / 100;
    const islandScale = controls.islandScale.value;
    const caIterations = controls.islandCA.value;
    const minRockSize = parseInt(controls.rockMinSize.value);

    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            if (worldGrid[y][x] === 1) continue;
            const noise = getNoise2D(x / islandScale, y / islandScale);
            if (Math.pow(noise, 2) > (1 - seedDensity)) {
                worldGrid[y][x] = 1;
            }
        }
    }

    for (let iteration = 0; iteration < caIterations; iteration++) {
        let newGrid = worldGrid.map(row => new Uint8Array(row));
        for (let y = 1; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 1; x < WORLD_WIDTH - 1; x++) {
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dy === 0 && dx === 0) continue;
                        if (worldGrid[y + dy][x + dx] === 1) neighbors++;
                    }
                }
                if (worldGrid[y][x] === 1) {
                    if (neighbors < 4) newGrid[y][x] = Math.random() < 0.5 ? 0 : 2;
                } else {
                    if (neighbors > 4) newGrid[y][x] = 1;
                }
            }
        }
        worldGrid = newGrid;
    }

    if (minRockSize > 0) {
        let finalGrid = worldGrid.map(row => new Uint8Array(row));
        for (let y = 1; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 1; x < WORLD_WIDTH - 1; x++) {
                if (worldGrid[y][x] === 1) {
                    let neighbors = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dy === 0 && dx === 0) continue;
                            if (worldGrid[y + dy][x + dx] === 1) neighbors++;
                        }
                    }
                    if (neighbors < minRockSize) finalGrid[y][x] = Math.random() < 0.5 ? 0 : 2;
                }
            }
        }
        worldGrid = finalGrid;
    }
}

function render() {
    if (zoomLevel === 'full') {
        canvas.width = WORLD_WIDTH;
        canvas.height = WORLD_HEIGHT;
        canvas.style.width = '1024px';
        canvas.style.height = '512px';
        drawGrid(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
        canvas.width = VIEW_WIDTH;
        canvas.height = VIEW_HEIGHT;
        canvas.style.width = (VIEW_WIDTH * 8) + 'px';
        canvas.style.height = (VIEW_HEIGHT * 8) + 'px';
        drawGrid(Math.floor(panX), Math.floor(panY), VIEW_WIDTH, VIEW_HEIGHT);
    }
}

function drawGrid(startX, startY, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const worldX = startX + x;
            const worldY = startY + y;
            let color;
            if (worldX < 0 || worldX >= WORLD_WIDTH || worldY < 0 || worldY >= WORLD_HEIGHT) {
                color = COLORS.ROCK;
            } else {
                const cell = worldGrid[worldY][worldX];
                if (cell === 1) color = COLORS.ROCK;
                else if (cell === 0) color = COLORS.SOIL_LIGHT;
                else color = COLORS.SOIL_DARK;
            }
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            const idx = (y * width + x) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

generateBtn.addEventListener('click', () => {
    generateWorld();
    render();
});

zoomToggle.addEventListener('change', (e) => {
    zoomLevel = e.target.value;
    const container = document.getElementById('canvas-container');
    if (zoomLevel === 'full') {
        container.style.width = '1024px';
        container.style.height = '512px';
    } else {
        container.style.width = (VIEW_WIDTH * 8) + 'px';
        container.style.height = (VIEW_HEIGHT * 8) + 'px';
    }
    render();
});

let isDragging = false;
canvas.addEventListener('mousedown', () => isDragging = true);
window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('mousemove', (e) => {
    if (!isDragging || zoomLevel === 'full') return;
    panX -= e.movementX / 8;
    panY -= e.movementY / 8;
    panX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, panX));
    panY = Math.max(0, Math.min(WORLD_HEIGHT - VIEW_HEIGHT, panY));
    render();
});

init();
