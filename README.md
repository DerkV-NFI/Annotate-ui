# Forensic Image Annotation Tool

A browser-based tool for forensic image comparison. Load images into two side-by-side windows, pan and zoom them, and draw linked markers (points or areas) between corresponding features. The result can be exported as an image, a CSV, or a project file.

**Everything runs locally in your browser.** Images are never uploaded to a server.

## Install

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or newer (or 22.12+), with npm. Vite 7 requires one of these.

### Steps

```powershell
# 1. Clone the repository and enter it
git clone <repository-url>
cd Annotate-ui

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open the URL printed in the terminal (usually http://localhost:5173).

### Other commands

| Command           | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload                     |
| `npm run build`   | Type-check and create a production build in `dist/`      |
| `npm run preview` | Serve the production build locally                       |
| `npm run lint`    | Run ESLint                                               |

The `dist/` folder is static and can be served by any web server.

## Features

### Image windows
- Two windows (Image 1 and Image 2) for comparing images.
- Load images by drag and drop or by clicking to browse. Multiple files can be selected at once.
- Load more images into a window at any time with the **+ Add Image** button.
- In pan mode, click an image to select it, then:
  - drag it to move it;
  - drag a corner handle to resize it (aspect ratio is kept);
  - click the red trash button at its top-right corner to delete it. Annotations linked to that image are removed too.
- Switch between **side-by-side** and **top/bottom** layouts.

### Navigation
- Scroll wheel zooms, anchored at the cursor.
- Drag empty space (or use the middle mouse button) to pan a window.
- **1:1** resets to actual size; **Fit** fits all images in the window.

### Annotations
- Click a feature in one window, then the matching feature in the other, to create a linked annotation.
- Marker types:
  - **Point**: an arrow ends exactly on the pixel, with no dot covering it.
  - **Area**: an ellipse with adjustable size and rotation; it can be locked or unlinked between the two windows.
- Markers stay attached to the image pixel they were placed on, even when you move, resize or zoom the image.
- Drag marker handles to adjust positions. Click a marker to edit it.
- Each annotation has a text note, a colour, and can be reordered or deleted from the sidebar.

### Appearance settings
- Numeric (1, 2, 3) or alphabetic (A, B, C) labels.
- Label font size, text colour, optional background and background colour, and label position (Image 1, Center, Image 2).
- Line thickness.
- Light and dark theme.

### Saving and exporting
- **Save Project / Load Project**: stores images, annotations and settings in a single JSON file. Older single-image project files still load.
- **Export Image**: PNG of both windows with the annotations (selection handles and controls are excluded), cropped to the content.
- **Export CSV Data**: annotation labels and notes.
- **New Project** clears everything and warns about unsaved changes.

## Tech stack

React 19, TypeScript, Vite 7, SVG overlay for markers, and [modern-screenshot](https://github.com/qq15725/modern-screenshot) for image export.
