# Low Energy/loosing vision/dropouts screen effect
Here is a demonstration of a very good re-make of the original effect in the game:
```
# Simualtor of interference/dropouts depending on signal strength.
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from IPython.display import HTML

WIDTH, HEIGHT = 64, 48
FPS = 30
SECONDS = 5

SIGNAL_QUALITY = 0.95 # The main control input - SIGNAL_QUALITY (0.0-1.0) will map to the bottom 0-25% of Tank's Energy. (dropouts can't start when energy is >25%)
DEGRADATION_PWR = 0.03 # Controls non linearity of the mapping (how fast signal degrades)

# TIMING
DROP_CHANCE_RANGE = (0.0, 0.5) # Prob of dropout starting per frame [Best Case, Worst Case]
DROP_DURATION_RANGE = (2, 50) # Estimated duration of dropout in frames [Best Case, Worst Case]

# VISUALS
PATTERN_STRENGTH = 0.3
NOISE_DENSITY = 0.7
STUTTER = 2  # frames to hold same noise pattern

row_bytes = WIDTH * 3
rom_size = row_bytes * 500
rom_np = np.random.randint(0, 256, rom_size, dtype=np.uint8)

n_bands = int(50 + 200 * PATTERN_STRENGTH)
for _ in range(n_bands):
    row_start = np.random.randint(0, rom_size // row_bytes - 10) * row_bytes
    n_rows = np.random.randint(1, max(2, int(6 * PATTERN_STRENGTH)))
    length = n_rows * row_bytes
    if np.random.rand() < PATTERN_STRENGTH:
        pat_len = np.random.randint(2, max(3, int(20 * (1 - PATTERN_STRENGTH) + 3)))
        pattern = np.random.randint(0, 256, pat_len)
        rom_np[row_start:row_start+length] = np.resize(pattern, length)
    else:
        rom_np[row_start:row_start+length] = np.random.randint(0, 256)

def get_noise_frame():
    start = np.random.randint(0, rom_size // row_bytes - HEIGHT) * row_bytes
    frame_np = rom_np[start:start + HEIGHT * row_bytes].reshape(HEIGHT, WIDTH, 3).copy()
    if NOISE_DENSITY < 1.0:
        mask = np.random.rand(HEIGHT, WIDTH) > NOISE_DENSITY
        frame_np[mask] = 0
    return frame_np

def generate_frames(quality, total_frames):
    # Non-linear mapping
    eff_quality = np.power(quality, DEGRADATION_PWR)
    noise_factor = 1.0 - eff_quality

    # Map effective quality to probability and duration ranges
    p_min, p_max = DROP_CHANCE_RANGE
    loss_prob = p_min + noise_factor * (p_max - p_min)

    d_min, d_max = DROP_DURATION_RANGE
    burst_len_est = d_min + noise_factor * (d_max - d_min)
    
    frames_out = []
    in_burst = False
    burst_remaining = 0
    cached_np = None
    stutter_remaining = 0
    
    while len(frames_out) < total_frames:
        if not in_burst:
            if np.random.rand() < loss_prob:
                in_burst = True
                # Randomize the duration slightly around the calculated estimate
                burst_remaining = int(burst_len_est * np.random.uniform(0.8, 1.5))
            else:
                frames_out.append(np.full((HEIGHT, WIDTH, 3), 255, dtype=np.uint8))
                continue
        
        if stutter_remaining <= 0:
            cached_np = get_noise_frame()
            stutter_remaining = STUTTER
        
        frames_out.append(cached_np)
        stutter_remaining -= 1
        burst_remaining -= 1
        
        if burst_remaining <= 0:
            in_burst = False
    
    return frames_out

frames_list = generate_frames(SIGNAL_QUALITY, FPS * SECONDS)

fig, ax = plt.subplots(figsize=(4, 4))
ax.axis('off')
im = ax.imshow(frames_list[0])

def update(i):
    im.set_data(frames_list[i])
    return [im]

anim = FuncAnimation(fig, update, frames=len(frames_list), interval=1000/FPS, blit=True)
plt.close()
HTML(anim.to_jshtml())
```

Simpler way how to generate it, just for reference, but I want the advanced way:
```
import numpy as np
import matplotlib.pyplot as plt

width, height = 50, 50
dark_floor = np.zeros((height, width, 3), dtype=np.uint8)

# This creates the signal spikes/vibrant neons (e.g., #00ff00, #b90000, #2af6f6)
bright_signal = np.random.randint(140, 256, (height, width, 3), dtype=np.uint8)

# Real TV noise affects RGB channels independently.
# Under X% chance the electron beam "fires" (shows the bright signal), otherwise, it stays off.
sparsity_mask = np.random.rand(height, width, 3) > 0.75 # Sparsity
noise_img = np.where(sparsity_mask, bright_signal, dark_floor)
```