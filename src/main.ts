import "./style.css";

type Tool = "brush" | "eraser" | "fill" | "eyedropper" | "sticker" | "pan";

type Action =
  | { kind: "stroke"; line: MarkerLine }
  | { kind: "sticker"; sticker: Sticker }
  | { kind: "fill"; x: number; y: number; color: string };

interface StrokeData {
  kind: "stroke";
  points: { x: number; y: number }[];
  thickness: number;
  color: string;
  mode: "draw" | "erase";
}
interface StickerData {
  kind: "sticker";
  x: number;
  y: number;
  sticker: string;
  size: number;
}
interface FillData {
  kind: "fill";
  x: number;
  y: number;
  color: string;
}
type SerializedAction = StrokeData | StickerData | FillData;

interface GalleryEntry {
  id: string;
  name: string;
  savedAt: number;
  data: SerializedAction[];
}

class Sticker {
  constructor(private x: number, private y: number, private sticker: string, private size: number) {}

  display(ctx: CanvasRenderingContext2D) {
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.sticker, this.x, this.y);
  }

  toData(): StickerData {
    return { kind: "sticker", x: this.x, y: this.y, sticker: this.sticker, size: this.size };
  }

  static fromData(data: StickerData): Sticker {
    return new Sticker(data.x, data.y, data.sticker, data.size ?? 40);
  }
}

class MarkerLine {
  private points: { x: number; y: number }[] = [];

  constructor(
    initialPoint: { x: number; y: number },
    private thickness: number,
    private color: string,
    private mode: "draw" | "erase",
  ) {
    this.points.push(initialPoint);
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = this.mode === "erase" ? "destination-out" : "source-over";
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
    ctx.restore();
  }

  toData(): StrokeData {
    return {
      kind: "stroke",
      points: [...this.points],
      thickness: this.thickness,
      color: this.color,
      mode: this.mode,
    };
  }

  static fromData(data: StrokeData): MarkerLine {
    const line = new MarkerLine(data.points[0], data.thickness, data.color, data.mode);
    for (let i = 1; i < data.points.length; i++) {
      line.drag(data.points[i].x, data.points[i].y);
    }
    return line;
  }
}

function randomHexColor(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
    255,
  ];
}

function colorsMatch(
  r1: number, g1: number, b1: number, a1: number,
  r2: number, g2: number, b2: number, a2: number,
  tolerance: number,
): boolean {
  return (
    Math.abs(r1 - r2) <= tolerance &&
    Math.abs(g1 - g2) <= tolerance &&
    Math.abs(b1 - b2) <= tolerance &&
    Math.abs(a1 - a2) <= tolerance
  );
}

function floodFill(targetCtx: CanvasRenderingContext2D, startX: number, startY: number, hexColor: string) {
  const { width, height } = targetCtx.canvas;
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;

  const imageData = targetCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const [fr, fg, fb, fa] = hexToRgba(hexColor);

  const startIdx = (sy * width + sx) * 4;
  const tr = data[startIdx];
  const tg = data[startIdx + 1];
  const tb = data[startIdx + 2];
  const ta = data[startIdx + 3];

  if (colorsMatch(tr, tg, tb, ta, fr, fg, fb, fa, 0)) return;

  const tolerance = 40;
  const visited = new Uint8Array(width * height);
  const stack: [number, number][] = [[sx, sy]];

  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const vIdx = y * width + x;
    if (visited[vIdx]) continue;

    const idx = vIdx * 4;
    if (!colorsMatch(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], tr, tg, tb, ta, tolerance)) continue;

    visited[vIdx] = 1;
    data[idx] = fr;
    data[idx + 1] = fg;
    data[idx + 2] = fb;
    data[idx + 3] = fa;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  targetCtx.putImageData(imageData, 0, 0);
}

function serializeActions(source: Action[]): SerializedAction[] {
  return source.map((a) => {
    if (a.kind === "stroke") return a.line.toData();
    if (a.kind === "sticker") return a.sticker.toData();
    return { kind: "fill", x: a.x, y: a.y, color: a.color };
  });
}

function deserializeActions(data: SerializedAction[]): Action[] {
  return data.map((d) => {
    if (d.kind === "stroke") return { kind: "stroke", line: MarkerLine.fromData(d) };
    if (d.kind === "sticker") return { kind: "sticker", sticker: Sticker.fromData(d) };
    return { kind: "fill", x: d.x, y: d.y, color: d.color };
  });
}

function renderActionsToContext(targetCtx: CanvasRenderingContext2D, list: Action[]) {
  targetCtx.save();
  targetCtx.globalCompositeOperation = "source-over";
  targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
  targetCtx.fillStyle = "#ffffff";
  targetCtx.fillRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
  targetCtx.restore();

  for (const action of list) {
    if (action.kind === "stroke") action.line.display(targetCtx);
    else if (action.kind === "sticker") action.sticker.display(targetCtx);
    else floodFill(targetCtx, action.x, action.y, action.color);
  }
}

function renderThumbnail(data: SerializedAction[], size: number): HTMLCanvasElement {
  const full = document.createElement("canvas");
  full.width = CANVAS_SIZE;
  full.height = CANVAS_SIZE;
  const fullCtx = full.getContext("2d")!;
  renderActionsToContext(fullCtx, deserializeActions(data));

  const thumb = document.createElement("canvas");
  thumb.width = size;
  thumb.height = size;
  thumb.className = "gallery-thumb";
  const thumbCtx = thumb.getContext("2d")!;
  thumbCtx.drawImage(full, 0, 0, size, size);
  return thumb;
}

// --- Storage ---
const AUTOSAVE_KEY = "sticker-sketchpad:autosave";
const GALLERY_KEY = "sticker-sketchpad:gallery";
let autosaveTimer: number | undefined;

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializeActions(actions)));
  }, 500);
}

function loadAutosave(): Action[] {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return [];
  try {
    return deserializeActions(JSON.parse(raw) as SerializedAction[]);
  } catch {
    return [];
  }
}

function loadGalleryList(): GalleryEntry[] {
  const raw = localStorage.getItem(GALLERY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GalleryEntry[];
  } catch {
    return [];
  }
}

function saveGalleryList(list: GalleryEntry[]) {
  localStorage.setItem(GALLERY_KEY, JSON.stringify(list));
}

// --- Toasts ---
const toastContainer = document.createElement("div");
toastContainer.className = "toast-container";
document.body.append(toastContainer);

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.append(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

// --- App setup ---
const app: HTMLDivElement = document.querySelector("#app")!;

const headerRow = document.createElement("div");
headerRow.className = "header-row";
app.append(headerRow);

const header = document.createElement("h1");
header.textContent = "Sticker Sketchpad";
headerRow.append(header);

const headerActions = document.createElement("div");
headerActions.className = "header-actions";
headerRow.append(headerActions);

const exportButton = document.createElement("button");
exportButton.textContent = "Export PNG";
exportButton.className = "export-btn";
exportButton.addEventListener("click", exportCanvas);
headerActions.append(exportButton);

const helpButton = document.createElement("button");
helpButton.textContent = "?";
helpButton.className = "help-btn";
helpButton.setAttribute("aria-label", "Keyboard shortcuts");
helpButton.addEventListener("click", () => shortcutsModal.classList.add("visible"));
headerActions.append(helpButton);

const CANVAS_SIZE = 640;

const canvasViewport = document.createElement("div");
canvasViewport.className = "canvas-viewport";
app.append(canvasViewport);

const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
canvas.className = "sketch-canvas";
canvasViewport.append(canvas);

const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");

let isDrawing = false;
let currentLine: MarkerLine | null = null;
let currentTool: Tool = "brush";
let currentSize = 6;
let currentColor = "#646cff";
let randomColorMode = false;
let selectedSticker: string | null = null;
let currentStickerSize = 40;
let currentStickerSet = "Cats";
let hoverPos: { x: number; y: number } | null = null;

let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartScreen: { x: number; y: number } | null = null;
let panOrigin: { x: number; y: number } | null = null;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

const actions: Action[] = [];
const redoStack: Action[] = [];
const allModeButtons: HTMLButtonElement[] = [];
let stickerButtons: HTMLButtonElement[] = [];

function pushAction(action: Action) {
  actions.push(action);
  redoStack.length = 0;
  scheduleAutosave();
}

function cursorPosition(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function updateCanvas() {
  if (!ctx) return;
  renderActionsToContext(ctx, actions);
  if (actions.length === 0) drawEmptyHint();
  if (!isDrawing) drawHoverPreview();
}

function drawEmptyHint() {
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.font = "24px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Start drawing...", canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

function drawHoverPreview() {
  if (!ctx || !hoverPos) return;
  if (currentTool !== "brush" && currentTool !== "eraser") return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hoverPos.x, hoverPos.y, currentSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = currentTool === "eraser" ? "#999999" : (randomColorMode ? "#888888" : currentColor);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.restore();
}

function applyTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

function setZoom(newZoom: number) {
  zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
  zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
  applyTransform();
}

function resetView() {
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  zoomLabel.textContent = "100%";
  applyTransform();
}

function startDrawing(e: MouseEvent) {
  if (currentTool === "pan") {
    isPanning = true;
    panStartScreen = { x: e.clientX, y: e.clientY };
    panOrigin = { x: panX, y: panY };
    canvas.style.cursor = "grabbing";
    return;
  }

  const { x, y } = cursorPosition(e);

  if (currentTool === "sticker" && selectedSticker) {
    pushAction({ kind: "sticker", sticker: new Sticker(x, y, selectedSticker, currentStickerSize) });
    updateCanvas();
    return;
  }

  if (currentTool === "fill") {
    const color = randomColorMode ? randomHexColor() : currentColor;
    pushAction({ kind: "fill", x, y, color });
    updateCanvas();
    return;
  }

  if (currentTool === "eyedropper") {
    if (!ctx) return;
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    currentColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
    colorInput.value = currentColor;
    randomColorMode = false;
    updateRandomButtonState();
    setTool("brush", brushButton);
    return;
  }

  isDrawing = true;
  const color = randomColorMode ? randomHexColor() : currentColor;
  const mode = currentTool === "eraser" ? "erase" : "draw";
  currentLine = new MarkerLine({ x, y }, currentSize, color, mode);
  pushAction({ kind: "stroke", line: currentLine });
  updateCanvas();
}

function draw(e: MouseEvent) {
  if (isPanning && panStartScreen && panOrigin) {
    panX = panOrigin.x + (e.clientX - panStartScreen.x);
    panY = panOrigin.y + (e.clientY - panStartScreen.y);
    applyTransform();
    return;
  }

  if (!isDrawing || !currentLine) return;
  const { x, y } = cursorPosition(e);
  currentLine.drag(x, y);
  updateCanvas();
  scheduleAutosave();
}

function stopDrawing() {
  if (isPanning) {
    isPanning = false;
    panStartScreen = null;
    panOrigin = null;
    canvas.style.cursor = "grab";
    return;
  }
  isDrawing = false;
  currentLine = null;
  updateCanvas();
}

function handleToolMove(e: MouseEvent) {
  hoverPos = cursorPosition(e);
  if (!isDrawing && !isPanning) updateCanvas();
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);
canvas.addEventListener("mousemove", handleToolMove);
canvasViewport.addEventListener(
  "wheel",
  (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom(zoomLevel * factor);
  },
  { passive: false },
);

// --- Toolbar ---
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

function activateButton(button: HTMLButtonElement) {
  for (const b of allModeButtons) b.classList.remove("selectedTool");
  button.classList.add("selectedTool");
}

function setTool(tool: Tool, button: HTMLButtonElement) {
  currentTool = tool;
  selectedSticker = null;
  activateButton(button);

  const cursors: Record<Tool, string> = {
    brush: "crosshair",
    eraser: "crosshair",
    fill: "cell",
    eyedropper: "copy",
    sticker: "pointer",
    pan: "grab",
  };
  canvas.style.cursor = cursors[tool];
  updateCanvas();
}

// --- Tools ---
const toolRow = makeSection("Tools");

const brushButton = document.createElement("button");
brushButton.textContent = "🖌 Brush";
brushButton.addEventListener("click", () => setTool("brush", brushButton));
toolRow.append(brushButton);
allModeButtons.push(brushButton);

const eraserButton = document.createElement("button");
eraserButton.textContent = "🧽 Eraser";
eraserButton.addEventListener("click", () => setTool("eraser", eraserButton));
toolRow.append(eraserButton);
allModeButtons.push(eraserButton);

const fillButton = document.createElement("button");
fillButton.textContent = "🪣 Fill";
fillButton.addEventListener("click", () => setTool("fill", fillButton));
toolRow.append(fillButton);
allModeButtons.push(fillButton);

const eyedropperButton = document.createElement("button");
eyedropperButton.textContent = "💧 Pick Color";
eyedropperButton.addEventListener("click", () => setTool("eyedropper", eyedropperButton));
toolRow.append(eyedropperButton);
allModeButtons.push(eyedropperButton);

// --- Color ---
const colorRow = makeSection("Color");

const colorInput = document.createElement("input");
colorInput.type = "color";
colorInput.className = "color-swatch";
colorInput.value = currentColor;
colorInput.addEventListener("input", () => {
  currentColor = colorInput.value;
  randomColorMode = false;
  updateRandomButtonState();
});
colorRow.append(colorInput);

const randomToggleButton = document.createElement("button");
randomToggleButton.textContent = "🎲 Random Colors";
randomToggleButton.addEventListener("click", () => {
  randomColorMode = !randomColorMode;
  updateRandomButtonState();
});
colorRow.append(randomToggleButton);

function updateRandomButtonState() {
  randomToggleButton.classList.toggle("selectedTool", randomColorMode);
}

// --- Brush size ---
const sizeSection = document.createElement("div");
sizeSection.className = "toolbar-section";
const sizeLabel = document.createElement("div");
sizeLabel.className = "section-label";
sizeLabel.textContent = "Brush Size";
sizeSection.append(sizeLabel);

const sizeRow = document.createElement("div");
sizeRow.className = "button-row size-row";
sizeSection.append(sizeRow);
toolbar.append(sizeSection);

const sizeSlider = document.createElement("input");
sizeSlider.type = "range";
sizeSlider.min = "2";
sizeSlider.max = "40";
sizeSlider.value = String(currentSize);
sizeRow.append(sizeSlider);

const sizeValueLabel = document.createElement("span");
sizeValueLabel.className = "size-value";
sizeValueLabel.textContent = `${currentSize}px`;
sizeRow.append(sizeValueLabel);

sizeSlider.addEventListener("input", () => {
  currentSize = Number(sizeSlider.value);
  sizeValueLabel.textContent = `${currentSize}px`;
  updateCanvas();
});

// --- Stickers ---
const stickerSets: Record<string, string[]> = {
  Cats: ["😸", "😹", "😻", "🐱", "🐈", "🐈‍⬛", "😾", "🙀"],
  Faces: ["😀", "😍", "🤔", "😎", "😂", "🥳", "😴", "🤩"],
  Nature: ["🌸", "🌵", "🌊", "⭐", "🌈", "🍁", "🌙", "☀️"],
  Food: ["🍕", "🍩", "☕", "🍓", "🍔", "🍦", "🍉", "🌮"],
  Animals: ["🐶", "🐼", "🦊", "🐸", "🐧", "🦄", "🐢", "🦋"],
  Space: ["🚀", "🛸", "🪐", "👽", "🌟", "☄️", "🌌", "🛰️"],
};

const stickerSection = document.createElement("div");
stickerSection.className = "toolbar-section";
const stickerLabel = document.createElement("div");
stickerLabel.className = "section-label";
stickerLabel.textContent = "Stickers";
stickerSection.append(stickerLabel);

const stickerControlsRow = document.createElement("div");
stickerControlsRow.className = "button-row";
stickerSection.append(stickerControlsRow);

const stickerSetSelect = document.createElement("select");
for (const setName of Object.keys(stickerSets)) {
  const option = document.createElement("option");
  option.value = setName;
  option.textContent = setName;
  stickerSetSelect.append(option);
}
stickerSetSelect.value = currentStickerSet;
stickerSetSelect.addEventListener("change", () => {
  currentStickerSet = stickerSetSelect.value;
  renderStickerButtons();
});
stickerControlsRow.append(stickerSetSelect);

const stickerButtonsRow = document.createElement("div");
stickerButtonsRow.className = "button-row";
stickerSection.append(stickerButtonsRow);

toolbar.append(stickerSection);

const customStickerButton = document.createElement("button");
customStickerButton.textContent = "+ Custom";
customStickerButton.addEventListener("click", () => {
  const customText = prompt("Enter your custom sticker text:");
  if (customText && customText.trim() !== "") {
    selectSticker(customText, customStickerButton);
  }
});

function selectSticker(sticker: string, button: HTMLButtonElement) {
  currentTool = "sticker";
  selectedSticker = sticker;
  activateButton(button);
  canvas.style.cursor = "pointer";
  updateCanvas();
}

function renderStickerButtons() {
  stickerButtonsRow.innerHTML = "";
  const keep = allModeButtons.filter((b) => !stickerButtons.includes(b) && b !== customStickerButton);
  allModeButtons.length = 0;
  allModeButtons.push(...keep);
  stickerButtons = [];

  for (const code of stickerSets[currentStickerSet]) {
    const stickerButton = document.createElement("button");
    stickerButton.textContent = code;
    stickerButton.className = "sticker-btn";
    stickerButton.addEventListener("click", () => selectSticker(code, stickerButton));
    stickerButtonsRow.append(stickerButton);
    stickerButtons.push(stickerButton);
    allModeButtons.push(stickerButton);
  }

  stickerButtonsRow.append(customStickerButton);
  allModeButtons.push(customStickerButton);
}

// --- Sticker size ---
const stickerSizeSection = document.createElement("div");
stickerSizeSection.className = "toolbar-section";
const stickerSizeLabel = document.createElement("div");
stickerSizeLabel.className = "section-label";
stickerSizeLabel.textContent = "Sticker Size";
stickerSizeSection.append(stickerSizeLabel);

const stickerSizeRow = document.createElement("div");
stickerSizeRow.className = "button-row size-row";
stickerSizeSection.append(stickerSizeRow);
toolbar.append(stickerSizeSection);

const stickerSizeSlider = document.createElement("input");
stickerSizeSlider.type = "range";
stickerSizeSlider.min = "16";
stickerSizeSlider.max = "96";
stickerSizeSlider.value = String(currentStickerSize);
stickerSizeRow.append(stickerSizeSlider);

const stickerSizeValueLabel = document.createElement("span");
stickerSizeValueLabel.className = "size-value";
stickerSizeValueLabel.textContent = `${currentStickerSize}px`;
stickerSizeRow.append(stickerSizeValueLabel);

stickerSizeSlider.addEventListener("input", () => {
  currentStickerSize = Number(stickerSizeSlider.value);
  stickerSizeValueLabel.textContent = `${currentStickerSize}px`;
});

// --- View (zoom/pan) ---
const viewRow = makeSection("View");

const zoomOutButton = document.createElement("button");
zoomOutButton.textContent = "−";
zoomOutButton.className = "action-btn";
zoomOutButton.addEventListener("click", () => setZoom(zoomLevel / 1.25));
viewRow.append(zoomOutButton);

const zoomLabel = document.createElement("span");
zoomLabel.className = "size-value";
zoomLabel.textContent = "100%";
viewRow.append(zoomLabel);

const zoomInButton = document.createElement("button");
zoomInButton.textContent = "+";
zoomInButton.className = "action-btn";
zoomInButton.addEventListener("click", () => setZoom(zoomLevel * 1.25));
viewRow.append(zoomInButton);

const resetViewButton = document.createElement("button");
resetViewButton.textContent = "Reset View";
resetViewButton.className = "action-btn";
resetViewButton.addEventListener("click", resetView);
viewRow.append(resetViewButton);

const panButton = document.createElement("button");
panButton.textContent = "🖐 Pan";
panButton.addEventListener("click", () => setTool("pan", panButton));
viewRow.append(panButton);
allModeButtons.push(panButton);

// --- Actions ---
const actionRow = makeSection("Actions");

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

function undoDrawing() {
  if (isDrawing || actions.length === 0) return;
  redoStack.push(actions.pop()!);
  updateCanvas();
  scheduleAutosave();
}

function redoDrawing() {
  if (isDrawing || redoStack.length === 0) return;
  actions.push(redoStack.pop()!);
  updateCanvas();
  scheduleAutosave();
}

function clearDrawing() {
  if (isDrawing) return;
  actions.length = 0;
  redoStack.length = 0;
  updateCanvas();
  scheduleAutosave();
}

function exportCanvas() {
  if (!ctx) return;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "sticker-sketch.png";
  link.click();
  showToast("Exported!");
}

// --- My Drawings (gallery) ---
const gallerySection = document.createElement("div");
gallerySection.className = "toolbar-section";

const galleryLabel = document.createElement("div");
galleryLabel.className = "section-label";
galleryLabel.textContent = "My Drawings";
gallerySection.append(galleryLabel);

const galleryControls = document.createElement("div");
galleryControls.className = "button-row";
gallerySection.append(galleryControls);

const saveAsButton = document.createElement("button");
saveAsButton.textContent = "💾 Save As";
saveAsButton.className = "action-btn";
saveAsButton.addEventListener("click", handleSaveAs);
galleryControls.append(saveAsButton);

const galleryList = document.createElement("div");
galleryList.className = "gallery-list";
gallerySection.append(galleryList);

toolbar.append(gallerySection);

function handleSaveAs() {
  const name = prompt("Name this drawing:", `Drawing ${new Date().toLocaleDateString()}`);
  if (!name || name.trim() === "") return;
  const list = loadGalleryList();
  list.push({
    id: crypto.randomUUID(),
    name: name.trim(),
    savedAt: Date.now(),
    data: serializeActions(actions),
  });
  saveGalleryList(list);
  renderGalleryList();
  showToast(`Saved "${name.trim()}"`);
}

function loadDrawing(entry: GalleryEntry) {
  if (isDrawing) return;
  actions.length = 0;
  redoStack.length = 0;
  actions.push(...deserializeActions(entry.data));
  updateCanvas();
  scheduleAutosave();
}

function deleteDrawing(id: string) {
  const list = loadGalleryList().filter((e) => e.id !== id);
  saveGalleryList(list);
  renderGalleryList();
}

function renderGalleryList() {
  const list = loadGalleryList();
  galleryList.innerHTML = "";

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "gallery-empty";
    empty.textContent = "No saved drawings yet.";
    galleryList.append(empty);
    return;
  }

  for (const entry of list) {
    const row = document.createElement("div");
    row.className = "gallery-item";

    row.append(renderThumbnail(entry.data, 56));

    const nameEl = document.createElement("span");
    nameEl.className = "gallery-item-name";
    nameEl.textContent = entry.name;
    row.append(nameEl);

    const actionsEl = document.createElement("div");
    actionsEl.className = "gallery-item-actions";

    const loadBtn = document.createElement("button");
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", () => loadDrawing(entry));
    actionsEl.append(loadBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => deleteDrawing(entry.id));
    actionsEl.append(deleteBtn);

    row.append(actionsEl);
    galleryList.append(row);
  }
}

// --- Keyboard shortcuts modal ---
const shortcutsModal = document.createElement("div");
shortcutsModal.className = "modal-overlay";
shortcutsModal.innerHTML = `
  <div class="modal">
    <h2>Keyboard Shortcuts</h2>
    <ul>
      <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> — Undo</li>
      <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> — Redo</li>
      <li>Scroll over canvas — Zoom in/out</li>
    </ul>
    <button class="modal-close">Close</button>
  </div>
`;
document.body.append(shortcutsModal);
shortcutsModal.querySelector(".modal-close")!.addEventListener("click", () => {
  shortcutsModal.classList.remove("visible");
});
shortcutsModal.addEventListener("click", (e) => {
  if (e.target === shortcutsModal) shortcutsModal.classList.remove("visible");
});

document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.key === "z") {
    e.preventDefault();
    undoDrawing();
  } else if (e.key === "y") {
    e.preventDefault();
    redoDrawing();
  }
});

// --- Initialize ---
actions.push(...loadAutosave());
renderStickerButtons();
renderGalleryList();
setTool("brush", brushButton);
updateCanvas();