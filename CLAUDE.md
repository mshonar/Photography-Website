# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal photography portfolio website — static HTML/CSS/JS that fetches and displays photos from the Unsplash API. No build system, no package manager, no frameworks.

## Development

**Running locally**: Open `index.html` directly in a browser. No server or build step required.

**Deploying**: Upload all three files (`index.html`, `style.css`, `script.js`) to any static hosting service (Netlify, GitHub Pages, Vercel, etc.).

## File Structure

- [`index.html`](index.html) — HTML skeleton; all styling and logic are in external files
- [`style.css`](style.css) — all styles, organized by component with CSS custom properties
- [`script.js`](script.js) — all JavaScript, wrapped in an IIFE (no ES modules; site opens via `file://`)

## Architecture

**API Integration** (`script.js`): Fetches from the Unsplash API via a centralized `apiGet()` helper. The `CONFIG` object at the top holds the API key and username (`shonar`). Three endpoints are used:
- `GET /users/{username}` — profile image, bio, total photo count
- `GET /users/{username}/statistics` — downloads and views totals
- `GET /users/{username}/photos?per_page=30` — photo gallery

User data and stats are fetched in parallel via `Promise.all`. Photos are fetched sequentially after.

**Gallery**: CSS multi-column masonry layout (`columns: 3 280px`). Gallery items start hidden (`opacity:0; transform:translateY(24px)`) and become visible via `.is-visible` class added by an `IntersectionObserver` as items scroll into view.

**Lightbox**: Always present in the DOM, toggled via `.is-open` class. `openLightbox(index)` reads from `state.photos[]` by index; uses `requestAnimationFrame` before adding `.is-open` so the CSS opacity transition fires. Navigation supports click arrows, keyboard (`←`/`→`/`Esc`), and touch swipe.

**Loading states**: Skeleton shimmer cards are injected into the gallery before fetching and removed once photos render. Stat values use `.skeleton-text` class until real data arrives.

**Design tokens**: CSS custom properties on `:root` in `style.css` — off-white background (`#fafafa`), dark text (`#0f172a`), gray borders. Typography: Plus Jakarta Sans (Google Fonts). Header uses `backdrop-filter: blur(16px) saturate(180%)` for frosted glass effect and compacts on scroll via `[data-scrolled]` attribute.
