# Sticker Sketchpad

A browser-based drawing app with brushes, an eraser, a fill bucket, stickers, zoom/pan, and autosave — built with TypeScript and Vite.

**[Live Demo](https://pehara.github.io/Sticker-Sketchpad/)**

## Features

- **Brush** — freehand drawing with adjustable size (2px–40px) and a hover preview showing brush size before you click
- **Eraser** — same brush mechanics, erases to transparent
- **Fill bucket** — click to flood-fill an enclosed region with the current color
- **Eyedropper** — sample any color already on the canvas
- **Color picker** — pick an exact color, or toggle "Random Colors" for a random hue per stroke
- **Stickers** — multiple sticker sets (Cats, Faces, Nature, Food, Animals, Space) plus custom text stickers, with adjustable size
- **Zoom & pan** — scroll to zoom, drag with the Pan tool to move around the canvas
- **Undo / Redo** — full history across strokes, stickers, and fills (`Ctrl+Z` / `Ctrl+Y`)
- **Autosave** — your in-progress drawing persists in the browser across refreshes
- **My Drawings gallery** — save named snapshots with live thumbnails, reload or delete them anytime
- **Export** — download your drawing as a PNG
- **Keyboard shortcuts panel** — click the `?` button for a quick reference

All saved data (autosave + gallery) lives in the browser's `localStorage` — nothing is sent to a server.

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool and dev server
- [ESLint](https://eslint.org/) — linting with `@typescript-eslint`
- Deployed via GitHub Actions to GitHub Pages

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended). If you don't have it installed, [nvm](https://github.com/nvm-sh/nvm) is the easiest way to get it:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install --lts
  nvm use --lts
  ```

### Installation

```bash
git clone https://github.com/pehara/Sticker-Sketchpad.git
cd Sticker-Sketchpad
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite dev server with hot reloading — open the printed `localhost` URL in your browser. Changes to `main.ts` or `style.css` show up live without a manual refresh.

### Build

```bash
npm run build
```

Type-checks with `tsc` and builds a production bundle to `dist/`.

### Preview production build

```bash
npm run preview
```

### Lint / test

```bash
npm run test
```

Runs the type check, build, and ESLint.

## Deployment

Pushing to `main` triggers a GitHub Actions workflow (`.github/workflows/`) that builds the project and deploys the `dist/` output to GitHub Pages automatically.

## Project Structure

```
├── src/
│   ├── main.ts        # App logic — canvas, tools, toolbar, gallery
│   └── style.css      # Styling
├── index.html          # Entry HTML
├── vite.config.js      # Vite configuration
└── package.json
```

## License

MIT