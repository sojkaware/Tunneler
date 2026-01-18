// Tunneler UI Initialization

document.addEventListener('DOMContentLoaded', () => {
    // Labels "E" and "S" pixel data (7x5)
    // 1 = color, 0 = transparent
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

    function drawLabel(canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(7, 5);
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 7; x++) {
                const idx = (y * 7 + x) * 4;
                if (data[y][x]) {
                    const rgb = hexToRgb(color);
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

    // Initialize View Screens
    const canvasLeft = document.getElementById('canvas-left');
    const canvasRight = document.getElementById('canvas-right');
    if (canvasLeft && canvasRight) {
        canvasLeft.getContext('2d').fillRect(0, 0, 76, 71);
        canvasRight.getContext('2d').fillRect(0, 0, 76, 71);
    }

    // Draw Labels (Injecting canvases if they don't exist, or just use existing ones)
    // For this demo, let's just use the labels placeholders in HTML
    document.querySelectorAll('.energy .label').forEach((el, i) => {
        const id = `label-e-${i}`;
        el.innerHTML = `<canvas id="${id}" width="7" height="5"></canvas>`;
        drawLabel(id, fontE, '#f3eb1c');
    });
    document.querySelectorAll('.shield .label').forEach((el, i) => {
        const id = `label-s-${i}`;
        el.innerHTML = `<canvas id="${id}" width="7" height="5"></canvas>`;
        drawLabel(id, fontS, '#28f3f3');
    });

    console.log('Tunneler UI Initialized');
});
