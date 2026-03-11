# AI Agent Programming Instructions

Welcome to the **Forensic Image Annotation Tool** project. This document provides essential guidelines and constraints for AI agents contributing to this codebase.

## 🛠️ Development Environment

- **Operating System:** Windows 10 or Windows 11.
- **Shell:** PowerShell.
- **Constraints:**
  - **NO WSL:** Windows Subsystem for Linux is NOT available.
  - **NO Linux Commands:** Do not use commands like `ls`, `rm -rf`, `mkdir -p` (unless they are PowerShell aliases), `grep`, `sed`, `awk`, etc.
  - **PowerShell Only:** Use native PowerShell commands (e.g., `dir`, `copy-item`, `remove-item`, `select-string`).

## 🌐 Project Context

- **Type:** Web Application.
- **Core Tech Stack:**
  - **Framework:** React (Vite-based).
  - **Styling:** Vanilla CSS / CSS Modules.
  - **Interactivity:** Native DOM for images, SVG for overlays, Canvas for exporting.
- **Local First:** All image processing and data handling must be performed **locally** in the browser. No server-side image processing.

## ✍️ Coding Standards

We prioritize code that is professional, maintainable, and easy to audit for forensic purposes.

- **Highly Structured:** Organize code into logical components, hooks, and services. Follow the architecture outlined in `implementation_plan.md`.
- **Functional Approach:** Prefer functional programming patterns and React hooks over class components.
- **Readability:** Use descriptive variable and function names.
- **Documentation:**
  - Add clear, concise comments to explain "why" something is done, especially for complex coordinate math or canvas manipulations.
  - Keep logic transparent for other developers.
- **Premium Aesthetics:** Our UI should feel premium, sleek, and high-contrast (Dark Mode). Refer to the `implementation_plan.md` for design specifics.

## 🚀 Common Workflows

- **Starting Dev Server:** `npm run dev`
- **Building Project:** `npm run build`
- **Adding Dependencies:** Use `npm install` (native Windows shell).

---

*Note: This file is intended for AI agents. Always review `implementation_plan.md` before starting new feature development.*
