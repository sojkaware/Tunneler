# Goal For The AI
To code a pixel-perfect remake of the original Tuneller game.

## Technical requirements
The game must be runnable from a statically hosted site, for example from Github pages.
Use HTML5 Canvas for rendering, index.html, script.js and style.css should be enough.
Lets use WSAD instead of WXAD and use SHIFT as Fire since it does not messup with Chrome shortcuts.
Random generator must be truly random to avoid repeated pseudorandom patterns.

## Non-Gameplay Screens In The Remake
The UI or menu is not descibed but you can examine the `round.png` image to get an idea of the look.
I think its this font: IBM PC BIOS 8x8 Font, Code Page 437 (CP437)(CGA and EGA adapters) "VGA 8x8" or "DOS Font". All text must be concistent with vibrant colors of the original game, no ClearType or font smoothing, pure digital solid look.e

Initially, there should be no extra screen, just jump straight into the game.

### End Of Round Screen
After one of the tanks is destroyed, the game should show black screen with `ROUND X` in a 1px thin pink rectangle in the middle of the screen. Below from left to right, it should be `BLUE` and `GREEN` (no boxes, just text). Below these it should be a number representing score for each player.

Colors:
`ROUND`: rainbow, each lettter different random color per display.
`BLUE` and `GREEN`: their respective colors.

Go to the next round only if the player responds by any key press, but let the screen be visible for minimum of 3 seconds

### Game Over Screen
After the game, show who won and display: "Press any key to play again".
Start the new game only if player responds, also keep it minimum 3 seconds visible.

### Initial Show Controls Screen
Initially, show:
Make `CONTROLS` centered on top of the screen, and this under it:
```
MOVEMENT: 
WSAD | ARROWS
FIRE:
SHIFT | SHIFT
```
Preserve left/right player's colors.
`CONTROLS`will be the same as `ROUND X` colors.
`MOVEMENT`, `FIRE` will be solid, non flickering pink color.
Start the new game only if player responds, also keep it minimum 3 seconds visible.

## Important Rules For AI
Never edit my spec files without my approval.
I must explicitly ask you for doing edits to spec files.
Any edits I will ask you to do to spec files must be implemented as "minimum required changes" to accomplish the request.

NEVER test the game interactively by launching browser and taking screenshots. I can test it well and give you detailed feedback. Just code what I want and I will test it.

ALL settings or parameters MUST be in single place. Avoid having params scattered around the codebase.

## Pre-requisites
First code isolated demos (each covering a particular aspect or behaviour of the game) so human coder can review them and approve them.
Each demo must be standalone and independently runnable and made with the same technical stack as the final game.