# Forensic Image Annotation Tool

This plan outlines the design and development roadmap for a web-based interface tailored for forensic image comparison and annotation. The application allows users to compare pairs of images, pan/zoom intuitively, and place linked markers (points or areas) on corresponding features in both images across multiple independent comparisons within a single project.

## Architecture & Technology Stack

- **Framework:** React via Next.js or Vite. React's state management handles complex interactions like linked annotations across multiple comparison tabs and coordinated pan/zoom.
- **Styling:** Vanilla CSS or CSS Modules for a sleek, dark mode interface that maximizes screen real estate and minimizes distractions, utilizing modern CSS variables for easy theme management.
- **Canvas / Interactivity:** Use native DOM elements (`<img>` with CSS transforms) for crisp image rendering, overlaid with a single full-screen `<svg>` element to draw precision circles and connecting arrows that track correctly with the images during pan and zoom.
- **Image Exporting Engine:** We will utilize the `<canvas>` API combined with libraries like `html2canvas` or raw drawing to generate composite images (combining the UI layout, images, and SVG strings) for saving the comparison directly to disk.
- **State Management:** React Context or a lightweight library like Zustand to manage global project state (tabs, images loaded, current pan/zoom transforms, list of annotations, layout direction).

## Features Breakdown

### 1. Project Management & Layout
- **Multi-pair Tabs:** Users can add multiple "tabs" to the top of the screen to create multiple analysis pairs in one single project session.
- **Toggleable Layout:** A split-screen layout that maximizes screen space, with an option to toggle between **Side-by-Side** (50/50 vertical split) and **Top/Bottom** (50/50 horizontal split).
- **Exporting Results:**
  - **Visual Export:** The output can be saved as a high-quality image per comparison tab. The exported result will faithfully include both images along with the overlaid line graphics (arrows, circles) and labels exactly as they appear in the UI viewport.
  - **Data Export:** The associated textual notes and annotations (labels, descriptions, and coordinate math if needed) are saved to disk as a `.csv` or `.txt` file parsing logic.

### 2. Image Loading & Navigation (Pan & Zoom)
- **Local File Loading:** Users can load local images into the two panels via drag-and-drop or file selection for each active tab.
- **Zooming:** Scroll wheel zooms in and out. The zooming will be anchored to the mouse cursor position for intuitive navigation.
- **Panning:** Click and drag (or middle-click and drag) to move the images around.
- **Coordinate Mapping:** A system to translate screen coordinates to the intrinsic pixel coordinates of the images, ensuring exact precision.

### 3. Annotation System
- **Pairing Mechanism:** The user clicks a feature on Image 1 (creating the origin), then clicks the corresponding feature on Image 2 (destination).
- **Auto-labeling:** Annotations are automatically labeled with a sequential number (1, 2, 3...) or letter (A, B, C...). The sequence type can be toggled.
- **Marker Types:**
  - **Point:** A precise point where **only the arrow points to the exact pixel**. No colored dot or special marker is drawn so the interesting pixel beneath it is not covered.
  - **Area:** A circle indicating a region, with the arrow pointing to the edge or center of the circle. The user can drag a handle on the circle's edge to adjust its radius dynamically.
- **Connecting Arrow:** A scalable vector arrow is drawn connecting the two coordinates across the screen. This arrow updates dynamically in real-time as either image is panned, zoomed, or resized.
- **Interactive Workflow:** Immediately after clicking the points in the images, focus is shifted to a text field where the user can write the specific details of the comparison for that new annotation.

### 4. UI Controls & Data Management
- A sidebar overlay containing a list of all drawn annotations for the current active tab.
- **List Management:** 
  - Annotations can be deleted.
  - The order of annotations can be changed by dragging and dropping them in the sidebar list (updating the sequence labels accordingly).
- For each annotation, the text field can be edited at any time.

## Development Phases

### Phase 1: Project Setup & Core Layout
1. Initialize the React/Vite project in `d:\code\Annotate-ui`.
2. Create the main shell: Tabs for project management, a toolbar, a sidebar list, and the main split-pane dual-image viewer area.
3. Build the layout toggle (Side-by-Side vs. Top/Bottom) and file-drop zones for each image panel.

### Phase 2: Pan & Zoom Interactions
1. Implement custom dragging and scroll-wheel zooming on the image containers.
2. Build the coordinate conversion utilities required to handle tracking elements regardless of zoom, pan, and pane layout.

### Phase 3: The Annotation State Machine & Rendering
1. Develop the logic for placing markers logic (e.g., idle -> place first point -> place second point -> auto-focus text input).
2. Create the overarching `<svg>` overlay layer.
3. Draw the connecting arrow pointing exactly at the designated pixel coordinate without obscuring it via a marker dot. 
4. Implement the "Area" marker type, rendering a resizable circle at the clicked coordinates.

### Phase 4: Extended Features (Data Export & Ordering)
1. Build the drag-and-drop reordering functionality within the sidebar list to update annotation numbering sequentially.
2. Implement the text data export logic routing comparison notes to a strictly typed `.csv` file. 

### Phase 5: Image Export Engine & UX Polish
1. Develop the `html2canvas` (or equivalent) logic capable of capturing the exact CSS transforms of the images and the explicit coordinate vectors of the SVGs into a single downloadable pixel buffer.
2. Add visual polish: dark-mode aesthetics, smooth transitions, and tooltips.
3. Refine edge case handling for arrow drawing when an image is panned off-screen.
