# Tunneler: A Vibecoding Experiment

Is it possible to vibecode a pixel-perfect HTML5 remake of the classic 2-player tank combat game Tunneler using only Gemini 3 Flash?

The question arose in December 2025 while watching a colleague fiddling with Claude Code to recreate the same game. It was playable, but it lacked the soul. I didn't know the game then, but I became captivated by its raw, underground aesthetic. 

Tunneler exists in a sort of digital time capsule. Its home, [tunneler.org](http://tunneler.org), is a remnant of the early web where Geoffrey Silverton tells the story of Turbo Pascal, lost source code on floppies, and that unmistakable CGA glow. It’s a niche world of basement battles and DOSBox nostalgia—reminiscent of 90s sessions where you’d crowd around a single keyboard for *Lotus Esprit Turbo Challenge* or *Micro Machines*, yelling as pixels flew. Pure, shared chaos in a dimly lit room.

---

### The "Perfect Spec" Problem

I quickly realized that no "perfect specs file" exists for a game like this. Basic mechanics can be described in text, but the visual interference effects and procedural world generation are almost unexpressable. They are felt, not just read.

Spendng a month writing JavaScript was not an option for someone with near-zero knowledge of the language. Instead, I took a detour through Python—the only language I barely understand—to build isolated demos for the map generation and signal interference. If these narrow tasks couldn't be "vibecoded" in isolation, the project was dead.

I spent about three hours immersed in the original, capturing screenshots and crafting a spec file that defined everything from physics to the exact pixel layouts of the tank sprites.

### Antigravity

Opening Antigravity to port the logic to JS was initially a disaster. It tried to manipulate the code interactively by taking screenshots of the browser. It didn't work. I pivot—I asked it to generate a wall of sliders so I could tune the world generation parameters manually. 1.5 hours of fiddling finally yielded plausible maps. 

The interference effect was smoother; Gemini ported the Python logic to JS with zero changes needed. Another few hours of back-and-forth established the round transitions and the play-again flow.


### Starting Point Assets

These are the core assets provided to the AI at the beginning of the "vibecoding" session:

*   **Specifications**: [tuneller_specs.md](tuneller_specs.md) — The detailed logic and pixel layouts.
*   **Project Goal**: [webapp_remake_goal.md](webapp_remake_goal.md) — The technical requirements and UI plan.
*   **Reference Images**: [gameplay_screenshot_pixel_perfect.png](gameplay_screenshot_pixel_perfect.png), [round.png](round.png).
*   **Concept Proofs**: [world_rock_preview.png](world_rock_preview.png), [dropout_effect.md](dropout_effect.md).

### Next Steps

*   **The One-Shot**: Test if Claude 4.5 Opus can one-shot the entire game when presented with the full asset stack.
*   **Mobile Port**: An Android version utilizing tilt controls, touch firing, and Bluetooth multiplayer.

---

*Coded via Antigravity & Gemini 3 Flash*
