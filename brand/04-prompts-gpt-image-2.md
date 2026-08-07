# 04 · Prompts para GPT Image 2.0

Copy-paste directo. Cada prompt indica sus parámetros y sus referencias.

**Los prompts están en inglés a propósito** — el modelo obedece
significativamente mejor instrucciones en inglés. El texto que debe aparecer
*dentro* de la imagen va en español y siempre marcado como literal.

---

## El bloque `<<LOCK>>`

Todos los prompts terminan con la línea `<<LOCK>>`. **Sustitúyela por este
bloque completo antes de enviar.** Es lo que mantiene 24 generaciones dentro del
mismo sistema.

```text
[BRAND LOCK — DO NOT DEVIATE]
Brand: SupplyFlow (never render the name unless the prompt explicitly asks for it).
Palette: near-black #0B0C0E, acid lime #C9FA43, pure white #FFFFFF, cool grey #9AA0AB.
Use exactly these hex values. No other colours.
Shape language: rounded rectangles, corner radius generous and consistent,
uniform rounded-cap strokes, strictly horizontal and vertical geometry,
diagonals only at 45 degrees.
Signature device: a single acid-lime horizontal bar with rounded caps that
crosses the composition and extends slightly past the form on the right.
Style: flat vector, solid fills, no gradients, no shadows, no texture, no 3D,
no bevel, no glow, no outline stroke around the whole image.
Negative space: at least 25 percent of the canvas.
Never: flames, fire, leaves, sprouts, chef hats, shopping carts, delivery trucks,
shields, sparkles, globes, gradient meshes, plastic sheen, isometric projection,
bloom, long shadows, watermarks, invented text or fake UI microcopy,
detailed facial features, lime-coloured text on a white background.
```

---

# A · Núcleo de marca

## A1-a · Símbolo — ruta abstracta *"El umbral"*

`1:1` · `2k` · `high` · fondo transparente · **sin referencias**

```text
Create ONE centred logo symbol on a fully transparent background.

MARK TYPE: abstract mark.

CENTRAL MECHANISM: a vertical rounded-square vessel seen straight on, its lower
two thirds filled as one solid block, with a single horizontal bar crossing the
full width of the mark exactly at the top edge of that fill and extending two
units past the vessel on the right, ending in a rounded cap.

SHAPE LOGIC: constructed on a 24-unit square grid. Vessel outline is a 3-unit
uniform stroke with 4-unit corner radii. All geometry is strictly horizontal and
vertical. The mark is optically centred with equal clear space on all four sides.

DISTINCTIVE ELEMENT: where the crossing bar meets the vessel outline, the outline
is knocked out for 2 units on each side, so the bar reads as cutting THROUGH the
container rather than sitting on top of it. This knock-out is the single most
important detail — render it precisely.

TREATMENT: flat vector, solid fills only.

COLOUR: exactly two colours. The vessel is near-black #0B0C0E. The fill block and
the crossing bar are acid lime #C9FA43. Background fully transparent.

COMPOSITION: one single mark, centred, occupying about 80 percent of the canvas.
Nothing else in frame. No container, no badge, no circle behind it.

CONSTRAINTS: no text, no letters, no numbers, no wordmark, no tagline.
Clean editable vector paths, minimal anchor points, must stay legible at 16 px.

<<LOCK>>
```

## A1-b · Símbolo — ruta lettermark *"La S interrumpida"*

`1:1` · `2k` · `high` · fondo transparente · **sin referencias**

```text
Create ONE centred logo symbol on a fully transparent background.

MARK TYPE: lettermark. The single letter S, and only the letter S.

CENTRAL MECHANISM: an S built from two thick rounded-cap arcs of uniform weight,
constructed geometrically rather than typographically, with one clean horizontal
interruption cutting straight across the letter at its optical midpoint, splitting
the upper arc from the lower arc by a gap of one stroke width.

SHAPE LOGIC: constructed on a 24-unit square grid from circular arcs and straight
segments only. Stroke weight uniform at 4 units, rounded caps. The interruption is
perfectly horizontal and spans the full width of the letter.

DISTINCTIVE ELEMENT: the gap is not empty — an acid-lime horizontal bar with
rounded caps sits inside it, spanning the letter's width and extending two units
past the letter on the right.

TREATMENT: flat vector, solid fills only.

COLOUR: exactly two colours. The S arcs are near-black #0B0C0E. The bar in the gap
is acid lime #C9FA43. Background fully transparent.

COMPOSITION: one single letterform, centred, occupying about 75 percent of the
canvas. Nothing else in frame.

CONSTRAINTS: only the letter S — no other letters, no words, no numbers, no
tagline. Do not render a typeface S; construct it geometrically.
Clean editable vector paths, minimal anchor points, legible at 16 px.

<<LOCK>>
```

## A1-c · Símbolo — ruta pictórica *"La caja abierta"*

`1:1` · `2k` · `high` · fondo transparente · **sin referencias**

```text
Create ONE centred logo symbol on a fully transparent background.

MARK TYPE: pictorial mark.

CENTRAL MECHANISM: a supply crate seen perfectly straight on from the front as a
rounded square, with its lid rendered as a separate horizontal bar lifted one
stroke width above the body and extending two units past the crate on the right.

SHAPE LOGIC: constructed on a 24-unit square grid. Crate body is a 3-unit uniform
stroke with 4-unit corner radii, open at the top. The lifted lid is a solid bar
with rounded caps and the same 3-unit height. Strictly frontal — no perspective,
no side faces, no isometric projection, no depth.

DISTINCTIVE ELEMENT: inside the crate body, a solid block fills the lower half and
stops on a perfectly flat line, so the crate reads as half full; the gap between
that fill line and the lifted lid is the whole idea of the mark.

TREATMENT: flat vector, solid fills only.

COLOUR: exactly two colours. Crate body and inner fill are near-black #0B0C0E.
The lifted lid bar is acid lime #C9FA43. Background fully transparent.

COMPOSITION: one single mark, centred, occupying about 80 percent of the canvas.
Nothing else in frame.

CONSTRAINTS: no text, no letters, no numbers. Not a cardboard box with flaps, not
a parcel, not a gift box, no tape, no label. Clean editable vector paths, minimal
anchor points, legible at 16 px.

<<LOCK>>
```

---

## A2 · Rejilla de construcción

`1:1` · `2k` · `high` · fondo blanco · `Image0` = A1 aprobado

```text
Create a logo construction diagram on a pure white background.

Image0 is the approved SupplyFlow symbol. Reproduce it EXACTLY — identical
geometry, proportions, stroke weights, negative space and colours. Do not redraw,
simplify, restyle or recolour it. It only defines the mark; it does not define
this layout.

LAYOUT: the symbol centred, drawn over a light cool-grey #E4E7EC construction grid
of 24 by 24 equal square units, with thin 1-px grid lines. Around the symbol, a
dashed cool-grey rectangle marks the clear space at a distance equal to one
quarter of the symbol's height on all four sides. Thin grey dimension lines with
small perpendicular end ticks run along the top and left edges.

COLOUR: white background, grey grid and guides, symbol in its exact original
colours.

CONSTRAINTS: no text, no numbers, no labels, no annotations, no measurements
written out. Guides only. Flat, technical, precise.

<<LOCK>>
```

## A3 · Lockup horizontal

`3:2` · `2k` · `high` · fondo transparente · `Image0` = A1 aprobado

> ⚠️ Asset más frágil del set. Revisa el wordmark **carácter por carácter**. Si el
> modelo altera letterforms dos veces seguidas, **compón el lockup
> tipográficamente** con Schibsted Grotesk real y usa esta generación solo como
> guía de proporción.

```text
Create ONE horizontal brand lockup on a fully transparent background.

Image0 is the approved SupplyFlow symbol. Reproduce it EXACTLY — identical
geometry, proportions, stroke weights, negative space and colours. Do not redraw,
simplify, restyle, recolour or crop it.

LAYOUT: the symbol on the left, then a gap equal to half the symbol's width, then
the wordmark on the right, both sharing one optical centre line.

WORDMARK: the exact literal text "SupplyFlow" — one word, capital S, capital F,
no space, no other characters. Set in a tight modern geometric grotesque, heavy
weight, tight letter spacing, in near-black #0B0C0E. The cap height of the
wordmark equals 55 percent of the symbol's height.

COLOUR: symbol in its exact original colours, wordmark in near-black #0B0C0E,
background fully transparent.

COMPOSITION: the lockup horizontally and vertically centred, occupying about
80 percent of the canvas width. Nothing else in frame.

CONSTRAINTS: no tagline, no descriptor, no registered mark, no box, no underline,
no second line of text. Spell it exactly "SupplyFlow" — verify every character.

<<LOCK>>
```

## A4 · Lockup vertical

`3:4` · `2k` · `high` · fondo transparente · `Image0` = A3

```text
Create ONE vertical brand lockup on a fully transparent background.

Image0 is the approved SupplyFlow horizontal lockup. Reproduce its symbol and its
wordmark EXACTLY — identical geometry, identical letterforms, identical spelling
"SupplyFlow", identical colours. The ONLY change is the arrangement.

LAYOUT: symbol on top, centred. Below it, a gap equal to one third of the symbol's
height. Below that, the wordmark, centred, horizontally aligned to the symbol's
optical centre. The wordmark's cap height equals 40 percent of the symbol's height.

COLOUR: unchanged from Image0. Background fully transparent.

COMPOSITION: the stack centred in the canvas, occupying about 70 percent of the
canvas height. Nothing else in frame.

CONSTRAINTS: no tagline, no descriptor, no box, no underline. Do not re-letter the
wordmark — copy the letterforms from Image0.

<<LOCK>>
```

## A5 · Símbolo monocromo (dos pasadas)

`1:1` · `2k` · `high` · fondo transparente · `Image0` = A1 aprobado

```text
Reproduce the symbol in Image0 as a single-colour version on a fully transparent
background.

Preserve its geometry, proportions, stroke weights, corner radii and internal
negative space EXACTLY. The knock-out where the horizontal bar crosses the outline
must remain open — do not fill it, do not close it.

COLOUR: render every part of the mark in solid [near-black #0B0C0E | pure white
#FFFFFF]. No second colour, no grey, no tint, no opacity variation.

CONSTRAINTS: no text, no background, no shadow, no outline added around the mark.

<<LOCK>>
```

*Corre este prompt dos veces, una por cada opción entre corchetes.*

---

# B · Iconos de plataforma

## B1 · App icon iOS

`1:1` · `2k` · `high` · **fondo opaco** · `Image0` = A1 aprobado

```text
Create ONE finished square app icon.

Image0 is the approved SupplyFlow symbol. Reproduce it EXACTLY — identical
geometry, proportions, stroke weights and colours.

CANVAS: a perfectly square, fully opaque, edge-to-edge near-black #0B0C0E
background. The background MUST reach all four edges and all four corners as a
plain square. Do NOT round the corners of the canvas. Do NOT add a circle, a
squircle, a rounded card, a border, a frame or a drop shadow — the operating
system applies its own mask.

SYMBOL: centred, occupying 58 percent of the canvas width, optically centred both
axes. Rendered in acid lime #C9FA43 and pure white #FFFFFF, whichever assignment
keeps the crossing bar as the lime element.

CONSTRAINTS: no text, no letters, no numbers, no gradient, no glow, no texture,
no vignette. Flat solid background, flat solid mark.

<<LOCK>>
```

## B3 · Icono maskable PWA

`1:1` · `2k` · `high` · **fondo opaco** · `Image0` = B1

```text
Create ONE square maskable app icon.

Image0 is the approved SupplyFlow app icon. Keep its exact symbol geometry and
its exact colours. The ONLY change is scale and safe area.

CANVAS: perfectly square, fully opaque, edge-to-edge near-black #0B0C0E, square
corners, no rounding.

SAFE ZONE: the symbol must fit entirely inside the central 40 percent of the
canvas — that is, a centred circle of 40 percent diameter must fully contain every
part of the mark, including the right-hand tip of the crossing bar. Everything
outside that zone is plain background that the platform may crop away.

CONSTRAINTS: no text, no border, no frame, no shadow. Nothing in the outer region
except flat background colour.

<<LOCK>>
```

## B4 · Icono monocromo (Android themed)

`1:1` · `2k` · `high` · fondo transparente · `Image0` = A5 blanco

```text
Reproduce the mark in Image0 on a fully transparent background, in solid pure
white #FFFFFF only.

Preserve geometry and proportions exactly. Scale the mark to occupy the central
50 percent of the canvas, optically centred.

CONSTRAINTS: one colour only, no lime, no grey, no opacity variation, no text,
no background, no shadow. The whole mark must remain readable as a single flat
silhouette when tinted any colour.

<<LOCK>>
```

## B6 · Icono de notificación

`1:1` · `1k` · `high` · fondo transparente · `Image0` = A5 blanco

```text
Create a heavily simplified notification icon on a fully transparent background,
derived from the mark in Image0.

SIMPLIFICATION: keep ONLY the primary container silhouette and the horizontal
crossing bar. Remove every internal detail, every fill level and the knock-out.
Thicken all strokes so the icon stays readable at 24 px.

COLOUR: solid pure white #FFFFFF only.

COMPOSITION: centred, occupying 70 percent of the canvas.

CONSTRAINTS: one colour, no text, no background, no shadow, no thin lines.

<<LOCK>>
```

## B5 · Splash screen (dos pasadas: oscuro y claro)

`9:16` · `2k` · `high` · fondo opaco · `Image0` = A4 lockup vertical

```text
Create ONE mobile splash screen.

Image0 is the approved SupplyFlow vertical lockup. Reproduce it EXACTLY —
identical symbol geometry, identical letterforms, identical spelling "SupplyFlow".
It defines the lockup only; it does not define this layout.

CANVAS: full-bleed flat [near-black #0B0C0E | paper #F4F5F7] background, no
gradient, no vignette.

LAYOUT: the lockup optically centred, occupying 45 percent of the canvas width.
In the background, a very faint regular dot grid at 4 percent opacity in
[white | near-black], dots spaced widely and evenly across the whole canvas.
One acid-lime #C9FA43 horizontal bar with rounded caps sits in the lower third,
centred, 20 percent of the canvas width, as a loading indicator.

[Tema claro: el wordmark y el símbolo van en near-black #0B0C0E; la barra sigue
siendo lima.]

CONSTRAINTS: no text other than the wordmark inside the lockup. No tagline, no
version number, no copyright line, no status bar, no device frame, no photo.

<<LOCK>>
```

---

# C · Onboarding

## C0 · ⭐ Ancla de estilo — la pieza que define todo

`1:1` · `2k` · `high` · fondo transparente · `Image0` = A1 aprobado

> Genera **dos variantes**, elige una, y congélala. Todo C, D y E dependen de ella.

```text
Create ONE flat-vector illustration on a fully transparent background. This image
establishes an illustration system, so every drawing decision must be deliberate
and repeatable.

Image0 is the approved SupplyFlow symbol. It defines ONLY the shape DNA — corner
radii, stroke character and the colour relationship. It does NOT define the
subject and must NOT appear anywhere in this illustration.

SCENE: a standing human figure seen from the side on the left, drawn as a plain
solid silhouette with no facial features, no hair detail and no clothing detail,
one arm raised forward. In front of the figure, a tall rounded-rectangle panel
drawn as an outline. Inside the panel, three vertical rounded bars filled to three
different heights. One acid-lime horizontal bar with rounded caps crosses all
three bars at the same height and extends past the panel's right edge. From that
extended tip, a thin path with rounded caps travels right, turns 90 degrees
downward, and ends in a solid acid-lime dot.

DRAWING RULES — these define the whole system:
- Uniform stroke weight throughout, equal to 3.5 percent of the canvas width.
- All stroke ends and joins fully rounded.
- All corner radii generous and consistent.
- Only horizontal and vertical geometry; the only diagonals are exactly 45 degrees.
- Solid fills only; no outlines drawn on top of fills; no cross-hatching, no
  stippling, no line shading, no halftone.
- Every shape closed and clean, as if drawn with a vector pen.

COLOUR — exactly three: near-black #0B0C0E for the figure and the panel outline,
acid lime #C9FA43 for the crossing bar and the end dot only, cool grey #9AA0AB for
the three level bars. Lime appears nowhere else. Background fully transparent.

BACKGROUND TEXTURE: a very faint regular dot grid in cool grey #9AA0AB at 6 percent
opacity behind the scene, evenly spaced.

COMPOSITION: the scene occupies the central 70 percent of the canvas with generous
even margins. The figure and the panel share one horizontal baseline.

CONSTRAINTS: no text, no numbers, no labels, no UI chrome, no buttons, no arrows
other than the described path, no props, no floor line, no plants, no coffee cups,
no laptops.

<<LOCK>>
```

## C1 · Onboarding 1 — *"Tu stock, en una sola lista"*

`3:4` · `2k` · `high` · fondo transparente · `Image0` = C0

```text
Create ONE flat-vector illustration on a fully transparent background.

Image0 is the STYLE ANCHOR. It defines stroke weight, stroke ending, corner radii,
colour proportion, the silhouette drawing style and the background dot grid.
It does NOT define the subject or the composition — draw the new scene below.

SCENE: a human silhouette seen from the side, standing on the left, holding a tall
rounded-rectangle panel with both hands as if reading it. The panel fills the right
two thirds of the frame and contains six evenly spaced horizontal rows. Each row is
a thin rounded bar in cool grey, and each row ends on the right with a small
rounded square. Four of those squares are cool grey; two are acid lime.

COLOUR: near-black #0B0C0E figure and panel outline, cool grey #9AA0AB rows,
acid lime #C9FA43 on exactly two row markers. Faint grey dot grid behind.

COMPOSITION: vertical format. Figure and panel share one baseline in the lower two
thirds; generous empty space in the upper third for headline text that this image
does NOT contain.

CONSTRAINTS: no text, no numbers, no readable labels, no fake UI microcopy,
no buttons, no icons inside the rows.

<<LOCK>>
```

## C2 · Onboarding 2 — *"Marca el mínimo, no el inventario"*

`3:4` · `2k` · `high` · fondo transparente · `Image0` = C0 · `Image1` = C1

```text
Create ONE flat-vector illustration on a fully transparent background.

Image0 is the STYLE ANCHOR: stroke weight, stroke ending, corner radii, colour
proportion, silhouette style, dot grid.
Image1 is the previous illustration in this set. Reuse ITS EXACT human silhouette —
same proportions, same body shape, same head shape, same solid fill. It does NOT
define the pose or the composition.

SCENE: the same silhouette, now seen from the side reaching up with one arm and
touching the top of a tall rounded-rectangle container that stands to its right.
The container is filled from the bottom to just under one third of its height.
One acid-lime horizontal bar with rounded caps crosses the container exactly at
the two-thirds mark — clearly ABOVE the fill level — and extends past the
container's right edge. The gap between the fill and the lime bar is the focal
point of the image and must be visually obvious.

COLOUR: near-black #0B0C0E figure and container outline, cool grey #9AA0AB fill
block, acid lime #C9FA43 on the crossing bar only. Faint grey dot grid behind.

COMPOSITION: vertical format, scene in the lower two thirds, generous empty space
in the upper third.

CONSTRAINTS: no text, no numbers, no percentage marks, no measuring scale ticks,
no arrows, no exclamation marks.

<<LOCK>>
```

## C3 · Onboarding 3 — *"El pedido viaja solo hasta la compra"*

`3:4` · `2k` · `high` · fondo transparente · `Image0` = C0 · `Image1` = C2

```text
Create ONE flat-vector illustration on a fully transparent background.

Image0 is the STYLE ANCHOR: stroke weight, stroke ending, corner radii, colour
proportion, silhouette style, dot grid.
Image1 is the previous illustration. Reuse ITS EXACT human silhouette proportions
and drawing style. It does NOT define the pose or the composition.

SCENE: two human silhouettes, one in the upper left and one in the lower right,
facing each other across the frame. Between them, a continuous path with rounded
caps travels from the first figure: right, then 90 degrees down, then right again,
then 90 degrees down, ending at the second figure. Three evenly spaced solid dots
sit along the path; the first two are cool grey and the last one, nearest the
second figure, is acid lime. Beside the upper figure, a small rounded-square
container; beside the lower figure, an identical container, filled.

COLOUR: near-black #0B0C0E figures, containers and path, cool grey #9AA0AB on the
first two dots, acid lime #C9FA43 on the final dot and on the filled container's
fill. Faint grey dot grid behind.

COMPOSITION: vertical format, the path forming a clear staircase down the frame,
generous empty space in the upper third.

CONSTRAINTS: no text, no numbers, no arrowheads, no vehicles, no map, no location
pins, no dashed lines.

<<LOCK>>
```

## C4 · Onboarding 4 — *"Listo"*

`3:4` · `2k` · `high` · fondo transparente · `Image0` = C0 · `Image1` = C3

```text
Create ONE flat-vector illustration on a fully transparent background.

Image0 is the STYLE ANCHOR: stroke weight, stroke ending, corner radii, colour
proportion, silhouette style, dot grid.
Image1 is the previous illustration. Reuse ITS EXACT human silhouette proportions
and drawing style. It does NOT define the pose or the composition.

SCENE: a single human silhouette seen from the front, centred, standing upright
with both arms relaxed. Behind and above it, a rounded-rectangle phone shape drawn
as an outline, larger than the figure, containing one acid-lime horizontal bar with
rounded caps near its top. Above the phone's top-left corner, a small solid
rounded-square badge in acid lime, suggesting a notification, with no number and no
symbol inside it.

COLOUR: near-black #0B0C0E figure and phone outline, acid lime #C9FA43 on the bar
and the badge only. Faint grey dot grid behind.

COMPOSITION: vertical format, symmetrical, calm, scene in the lower two thirds,
generous empty space in the upper third.

CONSTRAINTS: no text, no numbers inside the badge, no check mark, no confetti, no
sparkles, no celebration effects, no fake UI inside the phone.

<<LOCK>>
```

---

# D · Estados vacíos

Un solo prompt plantilla. **Todos usan `Image0` = C0 y ninguno se encadena entre
sí** — puedes lanzarlos en paralelo.

`1:1` · `2k` · `high` · fondo transparente · `Image0` = C0

```text
Create ONE small flat-vector spot illustration on a fully transparent background.

Image0 is the STYLE ANCHOR. It defines stroke weight, stroke ending, corner radii,
colour proportion, silhouette drawing style and the faint background dot grid.
It does NOT define the subject or the composition.

SCENE: {{ESCENA}}

COLOUR: near-black #0B0C0E for forms and outlines, cool grey #9AA0AB for secondary
elements, acid lime #C9FA43 used ONCE and only where indicated. Faint grey dot grid
behind. Background fully transparent.

COMPOSITION: square format, one single centred object, occupying the central
65 percent of the canvas, generous even margins. Simpler and quieter than a full
illustration — this is a spot, not a scene.

CONSTRAINTS: no text, no numbers, no labels, no fake UI, no emoji, no faces,
no arrows, no exclamation marks, no question marks.

<<LOCK>>
```

Sustituye `{{ESCENA}}` por la línea correspondiente:

| ID | `{{ESCENA}}` |
|---|---|
| **D1** Sin pedidos | `an empty rounded-rectangle tray drawn as an outline, seen straight on, with one acid-lime horizontal bar with rounded caps resting flat across its open top` |
| **D2** Checklist completo | `a rounded-square container filled completely to the top with a solid acid-lime block, with one near-black horizontal bar with rounded caps crossing it near the top and extending past its right edge` |
| **D3** Sin notificaciones | `a rounded-rectangle panel drawn as an outline with three evenly spaced thin cool-grey horizontal bars inside it, and one small solid acid-lime dot resting outside the panel at its lower right corner` |
| **D4** Sin resultados | `a large rounded-square outline with a single acid-lime horizontal bar with rounded caps crossing its centre and extending past its right edge, and nothing at all inside the square` |
| **D5** Catálogo vacío | `nine identical small rounded-square outlines arranged in a 3 by 3 grid with even spacing, all empty, except the centre one which is filled solid acid lime` |
| **D6** Sin conexión | `a continuous path with rounded caps travelling right, turning 90 degrees down and right again, broken by one clean gap at its midpoint, with a small solid acid-lime dot on each side of the gap` |
| **D7** Error genérico | `a rounded-square container tilted exactly 45 degrees resting on one corner, drawn as an outline, with one acid-lime horizontal bar with rounded caps crossing it horizontally through its centre` |

---

# E · Hojas de familia

Una sola generación por hoja, a `4k`, y después se recorta. **No generes estos
iconos uno por uno** — perderás la consistencia de trazo.

## E1 · Hoja de iconos de categoría

`1:1` · `4k` · `high` · fondo transparente · `Image0` = C0

```text
Create ONE icon sheet on a fully transparent background.

Image0 is the STYLE ANCHOR. It defines stroke weight, stroke ending, corner radii
and colour proportion. It does NOT define the subjects or the layout.

LAYOUT: exactly 8 icons in a 4 by 2 grid. Every cell is exactly the same size.
Every icon is optically centred inside its own cell and occupies the same
proportion of its cell, about 60 percent. Padding is identical in every cell.
Thin cool-grey #9AA0AB separator lines at 15 percent opacity divide the cells.

CRITICAL: all 8 icons must share the exact same stroke width, the same corner
radius language and the same visual weight, as if drawn in a single pass by one
hand. This consistency matters more than any individual icon.

THE 8 ICONS, in reading order, each drawn as a simple frontal geometric outline:
1. protein — a rounded rectangle with one 45-degree corner cut
2. dairy — a tall rounded rectangle with a narrower rounded neck on top
3. produce — a circle with one short straight stem angled at 45 degrees
4. dry goods — a rounded rectangle with a horizontal band across its upper third
5. beverages — a tall narrow rounded rectangle with a horizontal fill line low inside
6. frozen — a square rotated exactly 45 degrees with a horizontal bar through it
7. cleaning — a rounded rectangle with a small rounded square attached on top left
8. disposables — three identical stacked horizontal rounded bars with even gaps

COLOUR: near-black #0B0C0E outlines. Exactly one element in each icon is filled
acid lime #C9FA43 — always the smallest element. Background fully transparent.

CONSTRAINTS: no text, no numbers, no labels, no captions under the icons, no
literal photographic detail, no food realism, no shading, no shadows.

<<LOCK>>
```

## E2 · Hoja de avatares de rol

`3:2` · `2k` · `high` · fondo transparente · `Image0` = C0

```text
Create ONE avatar sheet on a fully transparent background.

Image0 is the STYLE ANCHOR: stroke weight, stroke ending, corner radii, colour
proportion and the featureless silhouette drawing style. It does NOT define the
layout.

LAYOUT: exactly 3 circular avatars in one row, evenly spaced, identical diameter,
identical padding. Each avatar is a solid filled circle containing one human
silhouette from the shoulders up, drawn with no facial features whatsoever.

THE 3 AVATARS, left to right — the silhouettes are identical; only the small
attribute shape beside each shoulder changes:
1. kitchen — a small rounded square at the lower left of the circle
2. purchasing — a small horizontal rounded bar at the lower left of the circle
3. admin — a small circle at the lower left of the circle

COLOUR: circle background cool grey #9AA0AB at 20 percent opacity, silhouette
near-black #0B0C0E, attribute shape solid acid lime #C9FA43. Background outside
the circles fully transparent.

CONSTRAINTS: no text, no faces, no eyes, no mouths, no hair detail, no hats,
no uniforms, no tools, no name labels.

<<LOCK>>
```

## E3 · Marcas de restaurante placeholder

`3:2` · `2k` · `high` · fondo transparente · `Image0` = A1 aprobado

```text
Create ONE sheet of 6 placeholder brand marks on a fully transparent background.

Image0 defines the corner radius language and the flat-vector treatment only.
It must NOT appear in this sheet.

LAYOUT: exactly 6 identical rounded squares in a 3 by 2 grid, evenly spaced,
identical size and padding. Each square contains the same simple geometric device:
one solid horizontal bar with rounded caps across the lower third, and one smaller
solid square above it on the left.

THE ONLY DIFFERENCE between the 6 is the fill colour of the rounded square, in this
order: #C9FA43, #FF4D5E, #FFB020, #4CC2FF, #A98BFF, #9AA0AB.
The inner device is near-black #0B0C0E in all 6.

CONSTRAINTS: no text, no letters, no initials, no numbers, no logos, no icons of
food or buildings. Identical geometry in all 6 cells — only the colour changes.

<<LOCK>>
```

## E4 · Insignias de racha

`16:9` · `2k` · `high` · fondo transparente · `Image0` = C0

```text
Create ONE badge sheet on a fully transparent background.

Image0 is the STYLE ANCHOR: stroke weight, stroke ending, corner radii and colour
proportion. It does NOT define the layout.

LAYOUT: exactly 5 badges in one row, evenly spaced, identical diameter, identical
padding. Each badge is a circle drawn as a thick outline with rounded stroke ends.

PROGRESSION: the badges represent an increasing streak. The circular outline of
badge 1 is filled as an arc covering 20 percent of the circle, badge 2 covers
40 percent, badge 3 covers 60 percent, badge 4 covers 80 percent and badge 5 covers
100 percent. The filled arc always starts at the top and runs clockwise. Inside
every badge, centred, one horizontal bar with rounded caps — identical in all 5.

COLOUR: unfilled portion of the outline in cool grey #9AA0AB, filled arc in acid
lime #C9FA43, inner bar in near-black #0B0C0E. Background fully transparent.

CONSTRAINTS: no text, no numbers, no stars, no trophies, no medals, no ribbons,
no laurel wreaths, no sparkles.

<<LOCK>>
```

---

# F · Marketing

> **Regla dura:** las capturas de pantalla son **capturas reales de la app**,
> subidas como referencia. Nunca pidas al modelo que invente una interfaz.

## F1 · OG / share card

`16:9` · `2k` · `high` · fondo opaco · `Image0` = A3 lockup · `Image1` = captura real

```text
Create ONE social share card.

Image0 is the approved SupplyFlow horizontal lockup. Reproduce it EXACTLY —
identical symbol geometry, identical letterforms, identical spelling "SupplyFlow".
Image1 is a REAL screenshot of the application. Reproduce its pixels EXACTLY as
given: do not redraw it, do not change its text, its numbers, its layout or its
colours, do not add or remove any interface element. It may only be scaled,
rotated in-plane and masked into a device frame.

CANVAS: full-bleed flat near-black #0B0C0E, no gradient. A very faint white dot
grid at 4 percent opacity across the whole canvas.

LAYOUT: the lockup in the upper left, at 22 percent of the canvas width, with a
margin equal to 6 percent of the canvas width from the top and left edges.
Below it, on the left half, one line of literal headline text.
On the right half, Image1 masked inside a simple rounded-rectangle phone frame
drawn as a thin near-black outline, tilted 8 degrees clockwise, cropped by the
right edge of the canvas.

HEADLINE — render this literal text, exactly as written, including the accent:
"El mínimo se marca. La compra se ejecuta."
Set it in a tight modern geometric grotesque, heavy weight, two lines, tight
leading, in pure white #FFFFFF, except the word "mínimo" which is acid lime
#C9FA43. Preserve the accent on the í — verify it is rendered.

CONSTRAINTS: no other text, no tagline, no URL, no button, no badge, no App Store
or Google Play logos, no stock photography, no people.

<<LOCK>>
```

## F2 · Feature graphic de tienda

`16:9` · `2k` · `high` · fondo opaco · `Image0` = A4 lockup vertical

```text
Create ONE app store feature graphic.

Image0 is the approved SupplyFlow vertical lockup. Reproduce it EXACTLY —
identical symbol geometry, identical letterforms, identical spelling "SupplyFlow".

CANVAS: full-bleed flat near-black #0B0C0E. A very faint white dot grid at
4 percent opacity across the whole canvas.

LAYOUT: the lockup optically centred, occupying 30 percent of the canvas width.
Behind it, spanning the full canvas width and passing exactly behind the lockup's
optical centre, one acid-lime #C9FA43 horizontal bar with rounded caps, 1 percent
of the canvas height thick. The bar passes BEHIND the lockup and is interrupted by
a clear gap of clear space around it.

CONSTRAINTS: no text other than the wordmark inside the lockup. No tagline, no
screenshots, no device frames, no store badges, no people, no photography.

<<LOCK>>
```

## F3 · Screenshots de tienda (5 pasadas)

`9:16` · `2k` · `high` · fondo opaco · `Image0` = A3 lockup · `Image1` = captura real

```text
Create ONE app store screenshot frame.

Image1 is a REAL screenshot of the application. Reproduce its pixels EXACTLY as
given. Do not redraw it, do not restyle it, do not change a single word, number,
icon, colour or layout inside it, do not add or remove interface elements, do not
"improve" it. It may only be scaled and masked into a device frame.
Image0 is the approved lockup and defines the mark only; it does not appear here.

CANVAS: full-bleed flat near-black #0B0C0E with a very faint white dot grid at
4 percent opacity.

LAYOUT: one line of literal headline text across the top 18 percent of the canvas,
centred, with generous margins. Below it, Image1 masked inside a simple
rounded-rectangle device frame drawn as a thin near-black outline with a
1-px cool-grey inner edge, centred horizontally, cropped by the bottom edge of the
canvas.

HEADLINE — render this literal text exactly, preserving every accent: "{{TITULAR}}"
Set in a tight modern geometric grotesque, heavy weight, one or two lines, tight
leading, pure white #FFFFFF, with the single most important word in acid lime
#C9FA43.

CONSTRAINTS: no other text, no store badges, no ratings, no stars, no arrows, no
callout bubbles, no people, no hands holding the phone, no photography.

<<LOCK>>
```

Titulares (uno por pasada, con su captura real correspondiente):

| # | `{{TITULAR}}` | Captura |
|---|---|---|
| 1 | `Tu cocina, de un vistazo` | Dashboard |
| 2 | `Marca el mínimo en segundos` | DailyChecklist |
| 3 | `El pedido llega solo a compras` | RequestsList |
| 4 | `Compra con la lista ya hecha` | ShoppingView |
| 5 | `Catálogo y mínimos, en tu mano` | AdminCatalog |
