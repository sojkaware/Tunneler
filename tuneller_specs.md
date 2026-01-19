# Conventions of the specs
Outer Reference: All item dimensions (WIDTH/HEIGHT) include the 3D borders (the 3D effect is part of the item's total footprint).

Absolute Offsets: All margins/paddings are measured from the absolute outermost edge of the container (pixel 0) to the absolute outermost edge of the child item.

3D Orientation: 
"Raised" = Top/Left Highlight, Bottom/Right Shadow.
"Sunken" = Top/Left Shadow, Bottom/Right Highlight.


# About The Game
Tunneler is a two player, top-down perspective game written in the early 1990s by Geoffrey Silverton for DOS on IBM-PC compatible computers.
The objective of the game is to be the first to win three rounds. A round continues until one tank blows up (from being shot or simply running out of energy).

Players can move in one of 8 directions. Movement in tunnels is three times as fast as normal digging. Fast digging can be accomplished by firing the tank's cannon while moving. Various actions use up different amounts of energy: moving costs some energy, digging costs more, and shooting costs the most. Shields are damaged when hit by the other player's cannon. Players can refuel at either base but can repair their shields only at their own bases.

# Hands-on Experience
Low-resolution pixelated DOS look.
Controls act instantly/real-time but the game itself is rendered frame by frame at fixed low FPS so all animations (explosions/movements) are not smooth but have visible frame-by-frame look.

# Display
Each player has a view screen and an instrument panel with two meters. The view screen shows your surroundings from above (about 1% of the entire "world"). The two meters indicate the player's energy and shield condition.


# Controls (BLUE player: - GREEN player)
Movement (up, down, left right): WSAD keys - arrow keys
Fire: left <CTRL> - <ENTER>
Hold two direction keys at once to move diagonally.

# Colors
black = hollow space (digged soil)

cannon_yellow = #f3eb1c

light_blue = #2c2cff
dark_blue = #0000b6

light_green = #00ff00
dark_green = #00aa00

light_orange = #c37930
dark_orange = #ba5904
rock_gray = #9a9a9a

bullet_red = #ff3408
bullet_red_tail = #b40204

panel_highlight = #727272
panel_solid = #656565
panel_shadow = #333333
shield_turquoise = #28f3f3


# Main Screen
SCREEN_WIDTH = 160
SCREEN_HEIGHT = 100
Background color: dark_blue.
Each player owns half of the screen: View Screen on top, Info Panel on bottom.


# Player View Screen
WIDTH = 76
HEIGHT = 71

Global positioning context:
Padding 2px from top and sides of Main Screen.

Horizontal composition:
2px background + 76px left view + 4px background + 76px right view + 2px background.

## Low Energy Interfrence Visual Feedback
The lower the Player's energy, the more likely it is and the longer the interference effect covers the entire player's View Screen.
Loosing vision / visual dropouts effect's purpose is to make it harder to see the game and motivate the player to refuel at the base.


# Info Panel Container
WIDTH = 68
HEIGHT = 25

Positioning: 1px from bottom of player's View Screen, 6px from each side.
Base color: panel_solid.
Has 3D effect.

## 3D Effect (Raised)
Outer highlight: top edge 1px, left edge 2px, color panel_highlight.
Outer shadow: bottom edge 1px, right edge 2px, color panel_shadow.

## Status Rows
Two rows used for layout grouping only.
Row 1 (top): Energy.
Row 2 (bottom): Shield.
Each row contains a Label and a Bar Slot Container.
Bar Slot Container contains an Active Bar Fill indicating the metric.

### Label
WIDTH = 7
HEIGHT = 5
Content: single letter ("E" for Energy, "S" for Shield).
Color: Energy = cannon_yellow, Shield = shield_turquoise.

Margins relative to Info Panel Container:
Vertical 5px from top inner edge.
Horizontal 4px from left inner edge.

### Bar Slot Container
WIDTH = 52
HEIGHT = 8

Margins relative to Info Panel Container:
Vertical 3px from top outer edge.
Horizontal 12px from left outer edge.

## 3D Effect (Raised)
Outer highlight: top edge 1px, left edge 2px, color panel_highlight.
Outer shadow: bottom edge 1px, right edge 2px, color panel_shadow.

#### Active Bar Fill
WIDTH = 44
HEIGHT = 4
Perfectly centered within Bar Slot Container.


# Tanks

Hardcoded sprites as numpy arrays.

Left pressed (270 degrees, cannon points left and tank is firing bullets to the left):
[[0 0 0 0 0 0 0],
 [0 3 3 3 3 3 3],
 [0 0 1 1 1 1 0],
 [2 2 2 2 1 1 0],
 [0 0 1 1 1 1 0],
 [0 3 3 3 3 3 3],
 [0 0 0 0 0 0 0]]

Up + Right pressed together (45 degrees, cannon points to top right corner):
[[0 0 0 3 0 0 0],
 [0 0 3 1 0 2 0],
 [0 3 1 1 2 0 0],
 [3 1 1 2 1 1 3],
 [0 0 1 1 1 3 0],
 [0 0 0 1 3 0 0],
 [0 0 0 3 0 0 0]]

Legend:
3 = wheels (dark)
2 = cannon (yellow)
1 = body (light)
0 = transparent
North = 0 degrees reference.


# Base
Base wall is obstacle. Tank or fire can't pass through it, same as Rock.
Square base, side length 35px, wall thickness 1px.
Two entrances located north and south.
Each entrance is a centered gap 7px wide (14 + 7 + 14).
Color equals tank body color.


# Soil
Colors: light_orange and dark_orange, random with equal probability.

## Soil Digging by Tank Movement
Tank movement digs soil 1px around the tank.


# Tank Explosion
N_SHRAPNELS = 30
CORE_RADIUS = 1 × tank width
N_MAX_LIFESPAN = 12


# Bullet
Consists of two pixels: lead (bullet_red) and tail (bullet_red_tail).
Constant cadence visualized as 2px bullet followed by 2px gap.


# Bullet Impact Explosion
N_SHRAPNELS = 4
CORE_RADIUS = single pixel (closest to impact point)
N_MAX_LIFESPAN = 3


# Rock
Obstacle. Also acts as a natural border of the fixed area where game happens. Nothing can pass, even shrapnels.
Color: rock_gray


# World
WIDTH = 1024
HEIGHT = 512

Inner part is playable area (playground) separated from the outer part by a border. The inner (playable soil) part is a single large squareish connected "cave" enclosed by a rock border on all sides, with rare grey rocks forming walls and obstacles.

## Outer part (outside the playground)
Made of rock (100%)

## Inside (playground)
Made of soil with rare and rather small "islands" or "clusters" inside the central soil area.

Border described from a birds eye from distance:
The boundary is not a smooth line; its highly jagged, resembles "acid erosion". The rock "bites" into the soil mass from all four edges in irregular, varying short-long, thin "fingers" or "stalactites" pointing inward, creating a very uneven, comb-like appearance. Sometimes frantic, zig-zag pattern. There are "bays" of rock pushed deep into the soil and "peninsulas" of soil stretching out into the rock. 

From close view (Player's View Screen), the rocky islands and border seem smooth and not particularly rough.

The rock/soil game world is likely generated using a cellular automaton (CA) algorithm, commonly used for procedural cave or terrain generation in games from that era. This produces organic, irregular shapes with clumped regions, jagged pixel-level edges, and scattered isolated clusters—matching the thick, uneven grey border surrounding the black playable area and the smaller grey specks or blobs within it.

The algorithm probably relies on random seeding followed by iterative smoothing. It starts with a filled grid and evolves it based on local rules, similar to Conway's Game of Life but tuned for cave-like structures.

## Entities Placement
The positions of bases are random within their respective halves of the world and must satisfy minimum distance of 1/6 world width.
Tank is always in the center of the base.
Blue base and its tank must ALWAYS occupy left half of the world.
Green base and its tank must ALWAYS occupy right half of the world.
The placement algorithm should be run once at the beginning of the very game but not after each round - the game map from the previous round must be preserved so players can continue exploring the same world.
If any overlap of the base and rock occurs, the placement algorithm must run again until no collision occurs.



# Mechanics

## View Updating
When the tank moves, the environment should move around the tank while the tank's sprite should not move or wiggle. No jitter.

## General Explosion
Particle effect defined by CORE_RADIUS, N_SHRAPNELS, N_MAX_LIFESPAN.

### Shrapnels
Size is globally constant at 1px.
Color is bullet_red.
Each shrapnel is assigned random angle (0–360), random initial position within CORE_RADIUS, and random lifespan at creation.
Each shrapnel exists at most N_MAX_LIFESPAN frames; random lifespan must guarantee this maximum.

Action order:
Shrapnels spawn in core → move radially outward → disappear → soil is removed where shrapnel was present.

Solid interaction rules:
Shrapnels cannot overlap tank body, base, or rock.
Pixel interaction order applies only within materials: Soil → Fire → Hollow space (black).
Pixels belonging to tank, base, or rock cannot be turned into fire.


## Bullet

### Physics
Can't bounce off objects, can only do explosion on impact.
Can't explode on collision with other player's bullet. Each other's bullets can overlap and continue in the same direction.

### Firing
Analoguous to a toilet flusher mechanism.
Inflow rate is proportional to tank energy.
Fire key held down means the toilet is flushed whenever full.
Outflow rate is always maximum and constant (bullet cadence).
Maximum energy means inflow equals outflow and reservoir does not deplete.
Lower energy means reservoir depletes while maintaining constant outflow.
When reservoir is empty, bullets stop immediately even if fire key is held.
No bullets fire again until reservoir is fully refilled.
Once full, flushing resumes at the same constant cadence but stops early due to low energy.

Fire key behavior:
Pressed once: single bullet.
Held: equivalent to repeated presses at constant cadence.


