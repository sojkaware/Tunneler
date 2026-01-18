# Goal For The AI
To code a pixel-perfect remake of the original Tuneller game.

## Technical requirements
The game must be runnable from a statically hosted site, for example from Github pages.

The UI or menu is not descibed but you can examine the `round.png` image to get an idea of the look.
I think its this font: IBM PC BIOS 8x8 Font, Code Page 437 (CP437)(CGA and EGA adapters) "VGA 8x8" or "DOS Font".

Initially, there should be no extra screen, just jump straight into the game.

After one of the tanks is destroyed, the game should show black screen with `ROUND X` in a pink box in the middle of the screen.
Below from left to right, it should be `BLUE` and `GREEN`. Below these it should be a number representing score for each player.
Colors: `ROUND`: rainbow, each lettter different random color. `BLUE` and `GREEN`: their respective colors.

After the game is over, show play again screen (F1 to play again, ESC to quit).

## Important Rules
Never edit my spec files without my approval.
I must explicitly ask you for doing edits to spec files.
Any edits I will ask you to do to spec files must be implemented as "minimum required changes" to accomplish the request.

Please avoid testing it yourself by interacting with the game in the browser and taking screenshots. I can test it well and give you detailed feedback. Just code what I want and I will test it.

## Pre-requisites
First code isolated demos (each covering a particular aspect or behaviour of the game) so human coder can review them and approve them.
Each demo must be standalone and independently runnable and made with the same technical stack as the final game.