# PixelForge

PixelForge is a lightweight, mobile-friendly grid and pixel editor that runs entirely in your browser. You design on a grid of square cells, where each cell can hold a solid colour or a texture image, and export the result as a PNG or SVG. It started as a 2D Minecraft block blueprint editor, but it works for any grid-based design: icons, sprites, tile maps, pixel art and traced reference images.

It uses plain HTML, CSS and JavaScript. There are no frameworks, build tools, dependencies, servers or network requests. Everything stays in your browser.

> **Authorship notice:** this application and this README were **not created by a human**. They were written entirely by **Claude, an AI model made by Anthropic**, through an iterative conversation with a person who gave the requirements and feedback. I (Claude) wrote all of the code and documentation. Please review the code and test it yourself before relying on it for anything important.

---

## Contents

- [Quick start](#quick-start)
- [Features](#features)
- [Using PixelForge](#using-pixelforge)
- [Keyboard and pointer reference](#keyboard-and-pointer-reference)
- [Export and SVG import format](#export-and-svg-import-format)
- [Project structure and data model](#project-structure-and-data-model)
- [Browser support](#browser-support)
- [Testing status](#testing-status)
- [Known limitations](#known-limitations)
- [Ideas for future work](#ideas-for-future-work)

---

## Quick start

1. Put `index.html`, `style.css` and `script.js` in the same folder.
2. Open `index.html` in a modern browser. No server or internet connection is needed, so it works offline.
3. In the **Create canvas** dialog, enter a width and height in blocks and press **Create**.
4. Draw, then use **Export** to download a PNG or SVG.

---

## Features

### Canvas and resolution
- Create a canvas from **1 to 512** cells in each dimension.
- **Advanced settings** has a **Pixels per block** option (whole numbers from **1 to 256**, default **16**). Each cell represents an R × R pixel image, where R is this value.
- The export size is always `width × R` by `height × R`, regardless of editor zoom. The dialog shows the export size as you type.
- Limits and warnings:
  - Each export side may not exceed 16384 px.
  - You are warned before creating canvases over 128 × 128 blocks, or exports over about 16.7 million pixels, which may fail on mobile browsers.
  - You are asked to confirm before a new canvas discards a non-empty design.
- The resolution is a property of the canvas. It is only applied when you press Create, so cancelling the dialog never changes the current canvas.

| Canvas | Pixels per block | Export | Required texture size |
|---|---|---|---|
| 32 × 32 | 16 | 512 × 512 | 16 × 16 |
| 32 × 32 | 32 | 1024 × 1024 | 32 × 32 |
| 32 × 32 | 64 | 2048 × 2048 | 64 × 64 |

### Drawing tools
The tool panel (a bottom bar on mobile) provides:

| Tool | What it does |
|---|---|
| **Select** | Drag to select a rectangle of cells. Tap the Select button again to clear the selection. |
| **Fill** | Paints the selected colour or texture. Drag to paint freehand. Starting inside an existing selection fills the whole selection. This is the default tool. |
| **Erase** | Clears cells, with the same behaviour as Fill. Erasing a selection clears its contents and then the selection. |
| **Move** | Drags the selection, or a single cell if nothing is selected. |
| **Pick** | Samples a colour from a cell (see [Colour picker tool](#colour-picker-tool)). |
| **Copy** | Copies the selection to an internal clipboard, then clears the selection. |
| **Paste** | Shows a ghost preview of the clipboard. Drag to position it and release to place it. |
| **Palette** | (Mobile) opens or collapses the colour and texture panel. |

Selection and clipboard behaviour:
- A selection can be **moved partly or fully beyond the canvas edge**. When you release, only the part inside the canvas is kept, the rest is cropped, and the canvas size never changes. The new selection covers only the part that remains inside.
- Moves are applied from a snapshot, so overlapping moves are correct and leave no duplicated content at the original location.
- Copying never changes the canvas, and the clipboard survives selection changes.
- After pasting, only the newly pasted region is selected, so it can be moved or copied again.
- Selections are cleared when you undo, redo, enter the Paste tool, create a new canvas, or finish an erase or copy.
- **Undo and Redo** keep up to 60 steps.

### Colours
- The **Colour** tab shows a **preview bar** with the selected colour. Tap it to open the colour popup.
- The popup shows **six suggested colours** and a **Custom** button. Suggestions are built from your project:
  1. the currently selected colour,
  2. recently chosen or saved custom colours,
  3. colours used on the canvas, most used first,
  4. default colours to fill any remaining slots.

  Near-identical shades are skipped so the six are distinct. If your project has more than six colours, an **All project colours** list appears in the popup too.
- **Custom** opens three **HSV sliders**: Hue 0–360°, Saturation 0–100% and Value 0–100%, with live numeric readouts. The sliders start from the current colour, and greys, black and white are handled correctly. A native colour input is included as an extra option.
- **Back** restores the previous colour and returns to the suggestions. **Apply** keeps the colour and saves it to the project palette.
- Project colours belong to the current project. They are reset by a new canvas and filled by SVG import.

### Textures
- Open the **Texture** tab to upload textures. You can select several files at once.
- Accepted formats are **PNG, JPG and WebP**, and each image must be **exactly R × R pixels** for the active canvas. Images are never resized, cropped or distorted. Wrong-sized files are rejected with a message that names the file and the required size.
- Transparency is preserved, and textures stay local to your browser.
- Duplicate textures are detected by their image content, so the same texture is never added twice.
- Thumbnails show the file name as a tooltip. **Remove** hides the selected texture and warns you first if cells use it.
- **Texture compositing:** applying a texture to a cell that already has a texture or colour draws the new texture over the existing content using normal alpha compositing. The result is a new R × R texture that is added to the palette without duplicates. For example, a flower with a transparent background applied over grass shows the flower on grass.
  - Only the edited cell is composited. Originals and other cells are never changed.
  - Empty cells and fully opaque textures skip compositing, and a stroke composites each cell only once.
  - Undo and Redo, PNG and SVG export, and SVG import all work with composite textures.
- Changing the resolution removes the uploaded textures, because they would no longer match. You are warned before this happens.

### Colour picker tool
- With **Pick** selected, tap a cell to sample its colour. The selected colour updates and the editor switches to the Colour tab.
- On a texture cell, the exact pixel under the pointer is used. If that pixel is mostly transparent, the nearest visible pixel is used instead.
- Picking never changes the canvas.

### Palette tabs
The **Colour** and **Texture** buttons are genuine tabs. Each tab shows only its own controls, and switching does not reset your selected colour, selected texture or palettes. The reference image controls stay visible in both tabs.

### Reference image (tracing guide)
- Use **Add Reference Image** (PNG, JPG or WebP) to place an image behind your cells. It is not converted into cells. Add, Adjust, Remove and Replace are all in the palette panel.
- The adjust bar offers drag-to-move, **−** and **+** scaling with the aspect ratio kept, **Fit**, an **opacity slider (0–100%)**, **Done** and **Cancel**.
- While adjusting, the tools are dimmed and a highlighted bar is shown, so you cannot draw by accident. **Esc** cancels.
- After **Done**, the image stays behind the cells while you draw, fill, erase, select and move. It stays aligned when you pan or zoom.
- **Adjust** reopens the controls, **Replace** swaps the image, and **Remove** deletes it without affecting your design.
- The reference image is a separate layer. It is never part of the cell data, selections or copy and paste. Its opacity does not affect cell colours or textures.
- It **is included in PNG and SVG exports**, at its current position, scale and opacity, and always behind the cells.

### Export
See [Export and SVG import format](#export-and-svg-import-format) for details.

### Import SVG project
- In the **Create canvas** dialog, choose **Import SVG project…** to reopen an SVG that PixelForge exported and keep editing it. The grid, resolution, colours, textures and reference image are restored as editable data, not as a flattened picture.

### Navigation and mobile support
- Zoom with the **−**, **+** and **Fit** buttons, with Ctrl and the mouse wheel, or by pinching. Zoom ranges from 2 to 64 screen pixels per cell and never changes export resolution.
- Pan with the mouse wheel, middle or right mouse drag, Space and drag, or two fingers.
- One responsive layout serves desktop and mobile: a side panel on desktop, and a bottom toolbar with a collapsible palette on narrow screens. Controls are about 44 px for touch, the layout uses `100dvh`, and the page doesn't scroll sideways.
- The canvas blocks browser gestures, text selection and image dragging while you draw. Mouse, touch and stylus input all work through pointer events. A second finger cancels any stroke in progress so a pinch never draws.
- The palette panel closes when you start drawing, so it doesn't cover your work.

---

## Using PixelForge

**Draw a simple design**
1. Create a canvas, then pick a colour from the **Colour** tab.
2. With **Fill**, tap or drag across the canvas.
3. Use **Select**, then **Move**, **Copy** and **Paste** to rearrange parts of the design.

**Build with textures**
1. Create the canvas at the resolution that matches your texture files, for example 32 for 32 × 32 images.
2. Open the **Texture** tab, press **Upload Textures** and choose your images.
3. Select a thumbnail and paint. Layer a transparent texture over another to composite them.

**Trace a reference image**
1. Press **Add Reference Image**, then position, scale and set the opacity.
2. Press **Done**, then paint colours or textures over the reference.
3. Export. The reference is included, so remove it first if you want the design alone.

**Continue a project later**
1. Export as **SVG**.
2. Later, open PixelForge, choose **Import SVG project…**, and select the file.

---

## Keyboard and pointer reference

| Input | Action |
|---|---|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Y, or Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + C | Copy the selection |
| Ctrl/Cmd + V | Switch to the Paste tool |
| Delete / Backspace | Erase the selection and clear it |
| Esc | Cancel the current gesture, clear the selection, close the export menu, or cancel image adjustment |
| Space + drag | Pan |
| Middle or right mouse drag | Pan |
| Mouse wheel | Pan |
| Ctrl + mouse wheel | Zoom |
| Pinch (touch) | Zoom and pan |

Shortcuts are ignored while a dialog is open.

---

## Export and SVG import format

### PNG
- Size is exactly `width × R` by `height × R`, with each cell rendered at R × R pixels and no smoothing on cells.
- Empty cells are fully **transparent**, and no background colour is painted. The PNG canvas explicitly has an alpha channel.
- If a reference image exists, it is drawn first at its position, scale and opacity. Cells are drawn on top, so empty cells reveal it.
- Grid lines, selection outlines, cursors and other editor overlays are never included.

### SVG
- It uses the same pixel dimensions as the PNG and is self-contained, with no external files or URLs.
- Solid cells are `<rect>` elements. Textures are embedded once as base64 PNG data URIs in `<defs>`, and cells reference them with `<use>`. Empty cells produce no elements.
- The reference image, if present, is an `<image>` placed behind the cells with its position, size and opacity.
- The root element carries metadata so the file can be re-imported:

  ```
  data-app="mc-blueprint" data-w="<blocks wide>" data-h="<blocks high>" data-bpb="<pixels per block>"
  ```

  The reference image carries `data-role="bg"`. These are standard `data-*` attributes, so ordinary SVG viewers ignore them. The `data-app` value is a leftover from the app's Minecraft origins and is not shown to users.

### Import behaviour
- The file is parsed with the browser's `DOMParser` as inert XML. It is never inserted into the page, scripts are never run, and nothing is fetched from the network.
- Only base64 PNG, JPEG and WebP data URIs are accepted as embedded images.
- If `data-bpb` is missing, you are asked for the pixels per block, and the grid size is derived from the SVG dimensions. Unsupported sizes are rejected with a message.
- Rectangles of the right size on grid positions become solid cells. `<use>` references become texture cells. Textures that are the wrong size, or items that aren't recognised, are skipped and counted in a message, so nothing is dropped silently.
- Imported textures are added to the palette without duplicates, imported colours are added to the project colours, and the reference image is restored as a separate layer.
- Importing replaces the current design, after asking you to confirm. SVGs not made by PixelForge are not turned into editable art. At most they import as an empty or partly recovered grid, with a warning.

---

## Project structure and data model

```
index.html   page structure, dialogs, toolbars
style.css    dark theme (CSS variables) and responsive layout
script.js    all application logic
```

- The design is a flat array of `width × height` cells. Each cell is `null` (empty), a hex colour such as `"#7cbd4b"`, or a texture reference such as `"t3"`.
- Textures are kept in a map: `{ name, canvas, dataURL, hidden }`. The canvas is used for drawing and compositing, and the data URL is used for thumbnails, de-duplication and SVG export.
- The grid, the view (zoom and pan), the selection and the clipboard are kept separate. Screen coordinates are converted to cell coordinates at every zoom level.
- The reference image is stored separately from the grid, in canvas coordinates, so it moves and scales with the canvas.
- History holds snapshots of the grid array, capped at 60.
- The editor draws on an HTML canvas sized to the viewport, and only the visible cells are drawn.

---

## Browser support

Any current evergreen browser (Chrome, Edge, Firefox, Safari) should work. The app relies on the `<dialog>` element, pointer events, `ResizeObserver`, `createImageBitmap` and canvas APIs. Older browsers without these are not supported.

---

## Testing status

Tests were run in headless **Chromium** (Playwright) on desktop. Other checks were done by reading the code and running small Node scripts on isolated functions.

**Verified in Chromium**
- Fill is the default tool, and the palette tabs hide controls belonging to the inactive tab.
- A transparent flower texture over a grass texture produces the right composite. Undo and Redo work, and the originals are unchanged.
- The Pick tool samples colours without changing cells.
- The suggested colours, the HSV sliders starting from the selected colour, and grey and white handling behave correctly.
- A 4 × 4 export is 64 × 64 px. An empty cell shows a half-opacity reference image through it, and the SVG contains the metadata and background image.
- Re-importing that SVG restores the size, resolution, cells, the composite texture without a duplicate, and the background.
- A 16 px texture is rejected on a 64 px canvas, and a 64 px texture is accepted.
- The move-beyond-edge cropping and selection-clipping logic gave correct results in a Node test.

**Not verified**
- Touch, pinch and stylus input, and layout on actual phones or tablets.
- Browsers other than Chromium.
- The 2048 × 2048 export case, and the large-canvas warnings.
- SVG import of files without metadata, malformed files, or files containing unsupported elements.
- Whether an imported reference image lines up exactly after Done and a second export.
- Full manual regression testing of every combination of features.

---

## Known limitations

- **Nothing is saved automatically.** Closing or reloading the page loses the design. Export as SVG to keep your work, and a warning appears when you leave with unsaved edits.
- Changing the pixels-per-block value removes uploaded textures. Creating any new canvas also resets the project colours.
- Composite textures build up in the palette, and you remove them manually.
- Very large canvases or very high resolutions may fail or run slowly, especially on mobile browsers that limit canvas size.
- The editor is **not an automatic image converter**. There is no resizing tool and no automatic JPEG-to-SVG vectorisation. You can trace an image by hand using the reference layer and export your traced grid as SVG, but results are blocky cells, not smooth curves.
- Zoom ranges from 2 to 64 screen pixels per cell. At very high resolutions with low zoom, textures are shown scaled down.
- Exported SVGs embed textures as PNG data, so files can be large for big, texture-heavy canvases.
- The window title and a few internal names (such as the `data-app="mc-blueprint"` marker) still reflect the app's earlier Minecraft-only name.

---

## Ideas for future work

These are not implemented. They are suggestions only.

- Automatic project save and restore in the browser.
- Image resizing and conversion tools, and optional automatic vectorisation of raster images.
- Extra drawing tools such as line, rectangle, flood fill and mirror.
- A project file format that stores the reference image position and the palettes explicitly.
- A grid-line toggle and custom grid colours.

---

## Credits

Designed through conversation with a human requester, and **written entirely by Claude, an AI model made by Anthropic**. No licence has been specified for this project. Choose and add one before sharing or publishing the code.
