# Tunneler: A Vibecoding Experiment

Is it possible to vibecode a pixel-perfect HTML5 remake of the classic 2-player tank combat game Tunneler using only Gemini 3 Flash?

The question arose in December 2025 while watching a colleague fiddling with Claude Code to recreate the same game. It was playable, but it lacked the soul. I didn't know the game then, but I became captivated by its raw, underground aesthetic. 

Tunneler exists in a sort of digital time capsule. Its home, [tunneler.org](http://tunneler.org), is a remnant of the early web where Geoffrey Silverton tells the story of Turbo Pascal, lost source code on floppies, and that unmistakable CGA glow. It’s a niche world of basement battles and DOSBox nostalgia—reminiscent of 90s sessions where you’d crowd around a single keyboard for *Lotus Esprit Turbo Challenge* or *Micro Machines*, yelling as pixels flew. Pure, shared chaos in a dimly lit room.

---

## The "Perfect Spec" Problem

I quickly realized that no "perfect specs file" exists for a game like this. Basic mechanics can be described in text, sure, but the exact visual interference effect and procedural world generation implemented in the original are unexpressable.

Spendng a month writing JavaScript was not an option for someone with near-zero knowledge of the language. Instead, I took a detour through Python—the only language I barely understand—to build isolated demos for the map generation and signal interference. If these narrow tasks couldn't be done, the project was dead.

I spent about three hours immersed in the original, capturing screenshots and crafting a spec file that defined everything from physics to the exact pixel layouts of the tank sprites.

## Antigravity

First thing I wanted was to master the world generation logic. Antigravity launched the demo and tried to manipulate it interactively by taking screenshots of the browser. It didn't work. I pivot — I asked it to generate a wall of sliders so I could tune the world generation parameters manually. 1.5 hours of fiddling finally yielded plausible maps, resembling the original. The interference effect was smoother; Gemini ported the Python logic to JS with zero changes needed. 

After approx 4 hours of fiddling I had a working game, added 'end round' and 'game over' screens that are not pixel-perfect, but pleasing.

### Pain-points
- Orientation of the tank sprites was wrong initially, Gemini struggled to generalize rotations of my hardcoded sprites.
- Camera movement was not smooth but wiggly, Gemini struggled to understand the tank must be stationary in the center of the screen and the world moves around it.
- I had to guide it to implement collision detection correctly.
- The explosions animations needed tuning to match closely the original, but that was expected.

### Known Issues
- The tip of the barrel and the wheels on the edges wrongly overlap with the base.
- Speeds, damage amount and firing rate are not yet tuned to match closely the original.


## Starting Point Assets

These are the core assets provided to the AI at the beginning of the "vibecoding" session:

*   **Specifications**: [tuneller_specs.md](tuneller_specs.md) — The detailed logic and pixel layouts. 
*   **Project Goal**: [webapp_remake_goal.md](webapp_remake_goal.md) — The technical requirements and UI plan.
*   **Reference Images**: [gameplay_screenshot_pixel_perfect.png](gameplay_screenshot_pixel_perfect.png), [round.png](round.png).
*   **Concept Proofs**: [world_rock_preview.png](world_rock_preview.png), [dropout_effect.md](dropout_effect.md).

(The world generation demo was done by Antigravity from my text description and my original python attempts were not used in the end and so were the image assets - were rather for me as a reference when writing the specs.)

## Next Steps

*   **The Real One-Shot**: Let Claude 4.5 Opus one-shot the entire game when presented with the exact same asset stack (utilizing also the images from the original game).
*   **Mobile Port**: An Android version utilizing tilt controls, touch firing, and Bluetooth multiplayer.
