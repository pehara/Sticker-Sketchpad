// Import the CSS file for styling
import "./style.css";

// Constants for better readability
const ZERO = 0;
const ONE = 1;

// Class definition for stickers
class Sticker {
  constructor(private x: number, private y: number, private sticker: string) {}

  display(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.sticker, this.x, this.y);
  }
}

const drawnStickers: Set<Sticker> = new Set<Sticker>();

// A single freehand stroke made of connected points
class MarkerLine {
  private points: { x: number; y: number }[] = [];
  private thickness: number;
  private color: string;

  constructor(initialPoint: { x: number; y: number }, thickness: number) {
    this.points.push(initialPoint);
    this.thickness = thickness;
    this.color = this.randomColor();
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.points[0].x, this.points[0].y);
      ctx.lineWidth = this.thickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = this.color;

      for (const point of this.points) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
  }

  private randomColor(): string {
    const randomHex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
    return `#${randomHex}`;
  }
}

// Select the app container and set initial constants
const app: HTMLDivElement = document.querySelector("#app")!;
const INITIAL_MARKER_LINES_LENGTH = 0;

const gameName = "Sticker Sketchpad";
document.title = gameName;

const header = document.createElement("h1");
header.textContent = gameName;
app.append(header);

// Canvas
const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 480;
canvas.height = 480;
canvas.style.border = "1px solid rgba(255,255,255,0.12)";
canvas.style.borderRadius = "12px";
canvas.style.backgroundColor = "white";
app.append(canvas);

const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
let isDrawing = false;
const markerLines: MarkerLine[] = [];

const THIN_MARKER = 3 as const;
const THICK_MARKER = 10 as const;
let currentMarkerThickness: typeof THIN_MARKER | typeof THICK_MARKER = THIN_MARKER;
let selectedSticker: string | null = null;
let toolPreview: MarkerLine | null = null;

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);
canvas.addEventListener("mousemove", handleToolMove);

function startDrawing(e: MouseEvent) {
  const { x, y } = cursorPosition(e);

  if (selectedSticker) {
    drawnStickers.add(new Sticker(x, y, selectedSticker));
    updateCanvas();
    return;
  }

  isDrawing = true;
  markerLines.push(new MarkerLine({ x, y }, currentMarkerThickness));
}

function draw(e: MouseEvent) {
  if (!isDrawing || !ctx || selectedSticker) return;
  const { x, y } = cursorPosition(e);

  markerLines[markerLines.length - ONE].drag(x, y);
  updateCanvas();
}

function stopDrawing() {
  isDrawing = false;
}

function cursorPosition(e: MouseEvent) {
  return {
    x: e.clientX - canvas.offsetLeft,
    y: e.clientY - canvas.offsetTop,
  };
}

function updateCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const line of markerLines) {
    line.display(ctx);
  }
  for (const sticker of drawnStickers) {
    sticker.display(ctx);
  }

  if (!isDrawing && toolPreview) {
    toolPreview.display(ctx);
  }
}

function handleToolMove(e: MouseEvent) {
  if (isDrawing) return;
  const { x, y } = cursorPosition(e);

  if (!selectedSticker) {
    toolPreview = new MarkerLine({ x, y }, currentMarkerThickness);
  }
  updateCanvas();
}

// Toolbar container
const toolbar: HTMLDivElement = document.createElement("div");
toolbar.className = "toolbar";
app.append(toolbar);

function makeSection(label: string): HTMLDivElement {
  const section = document.createElement("div");
  section.className = "toolbar-section";

  const labelEl = document.createElement("div");
  labelEl.className = "section-label";
  labelEl.textContent = label;
  section.append(labelEl);

  const row = document.createElement("div");
  row.className = "button-row";
  section.append(row);

  toolbar.append(section);
  return row;
}

// --- Brush section ---
const brushRow = makeSection("Brush");

const thinButton = document.createElement("button");
thinButton.textContent = "Thin";
thinButton.classList.add("selectedTool");
thinButton.addEventListener("click", () => setMarkerThickness(THIN_MARKER, thinButton, thickButton));
brushRow.append(thinButton);

const thickButton = document.createElement("button");
thickButton.textContent = "Thick";
thickButton.addEventListener("click", () => setMarkerThickness(THICK_MARKER, thickButton, thinButton));
brushRow.append(thickButton);

function setMarkerThickness(
  thickness: typeof THIN_MARKER | typeof THICK_MARKER,
  activeButton: HTMLButtonElement,
  inactiveButton: HTMLButtonElement,
) {
  currentMarkerThickness = thickness;
  selectedSticker = null;
  activeButton.classList.add("selectedTool");
  inactiveButton.classList.remove("selectedTool");
  clearStickerSelection();
}

// --- Stickers section ---
const stickerRow = makeSection("Stickers");
const stickerCodes = ["😸", "😹", "😻"];
const stickerButtons: HTMLButtonElement[] = [];

for (const code of stickerCodes) {
  const stickerButton = document.createElement("button");
  stickerButton.textContent = code;
  stickerButton.className = "sticker-btn";
  stickerButton.addEventListener("click", () => selectSticker(code, stickerButton));
  stickerRow.append(stickerButton);
  stickerButtons.push(stickerButton);
}

const customStickerButton = document.createElement("button");
customStickerButton.textContent = "+ Custom";
customStickerButton.addEventListener("click", () => {
  const customText = prompt("Enter your custom sticker text:");
  if (customText && customText.trim() !== "") {
    selectSticker(customText, customStickerButton);
  }
});
stickerRow.append(customStickerButton);

function selectSticker(sticker: string, button: HTMLButtonElement) {
  selectedSticker = sticker;
  toolPreview = null;
  for (const btn of [...stickerButtons, customStickerButton]) {
    btn.classList.remove("selectedTool");
  }
  button.classList.add("selectedTool");
}

function clearStickerSelection() {
  for (const btn of [...stickerButtons, customStickerButton]) {
    btn.classList.remove("selectedTool");
  }
}

// --- Actions section ---
const actionRow = makeSection("Actions");

const undoStack: (MarkerLine | Sticker)[] = [];

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
undoButton.className = "action-btn";
undoButton.addEventListener("click", undoDrawing);
actionRow.append(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
redoButton.className = "action-btn";
redoButton.addEventListener("click", redoDrawing);
actionRow.append(redoButton);

const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
clearButton.className = "action-btn";
clearButton.addEventListener("click", clearDrawing);
actionRow.append(clearButton);

const exportButton = document.createElement("button");
exportButton.textContent = "Export PNG";
exportButton.className = "action-btn primary";
exportButton.addEventListener("click", exportCanvas);
actionRow.append(exportButton);

function undoDrawing() {
  if (isDrawing) return;
  if (markerLines.length > INITIAL_MARKER_LINES_LENGTH) {
    undoStack.push(markerLines.pop()!);
  } else if (drawnStickers.size > 0) {
    const undoneSticker = Array.from(drawnStickers).pop()!;
    drawnStickers.delete(undoneSticker);
    undoStack.push(undoneSticker);
  }
  updateCanvas();
}

function redoDrawing() {
  if (isDrawing || undoStack.length === 0) return;
  const restored = undoStack.pop()!;
  if (restored instanceof MarkerLine) {
    markerLines.push(restored);
  } else {
    drawnStickers.add(restored);
  }
  updateCanvas();
}

function clearDrawing() {
  if (isDrawing) return;
  markerLines.length = 0;
  drawnStickers.clear();
  undoStack.length = 0;
  updateCanvas();
}

function exportCanvas() {
  if (!ctx) return;

  const scale = 4;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = canvas.height * scale;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.scale(scale, scale);
  tempCtx.fillStyle = "white";
  tempCtx.fillRect(0, 0, canvas.width, canvas.height);

  for (const line of markerLines) {
    line.display(tempCtx);
  }
  for (const sticker of drawnStickers) {
    sticker.display(tempCtx);
  }

  const link = document.createElement("a");
  link.href = tempCanvas.toDataURL("image/png");
  link.download = "sticker-sketch.png";
  link.click();
}
