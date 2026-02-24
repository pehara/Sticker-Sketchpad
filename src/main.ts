// Import the CSS file for styling
import "./style.css";

// Constants for better readability
const ZERO = 0;
const ONE = 1;

// Class definition for stickers
class Sticker {
    constructor(private x: number, private y: number, private sticker: string) {}

    // Display method to draw the sticker on the canvas
    display(ctx: CanvasRenderingContext2D) {
        // Draw the sticker on the canvas with a smaller font size
        ctx.font = "24px Arial"; // Change the font size to your desired value
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.sticker, this.x, this.y);
    }
}
// Set to store instances of the Sticker class
const drawnStickers: Set<Sticker> = new Set<Sticker>();

// Modified MarkerLine class with thickness parameter
// Updated MarkerLine class with thickness and sticker properties
class MarkerLine {
    private points: { x: number; y: number }[] = [];
    private thickness: number;
    //private sticker: string; // Add the sticker property
    private color: string; // Add the color property

    constructor(initialPoint: { x: number; y: number }, thickness: number, sticker: string) {
        this.points.push(initialPoint);
        this.thickness = thickness;
        //this.sticker = sticker;
        this.color = this.randomColor(); // Set initial random color
    }

    // Add a point to the line as the user drags the cursor
    drag(x: number, y: number) {
        this.points.push({ x, y });
    }

    // Display the line on the canvas
    display(ctx: CanvasRenderingContext2D) {
        if (this.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);

            // Set the line thickness based on the provided thickness
            ctx.lineWidth = this.thickness;

            // Set the line color based on the sticker
            ctx.strokeStyle = this.color;

            for (const point of this.points) {
                ctx.lineTo(point.x, point.y);
            }

            ctx.stroke();
        }
    }

    // Add a method to determine a random color for the line
    private randomColor(): string {
        const randomHex = Math.floor(Math.random() * 16777215).toString(16);
        return `#${randomHex}`;
    }
}

// Select the app container and set initial constants
const app: HTMLDivElement = document.querySelector("#app")!;
const INITIAL_MARKER_LINES_LENGTH = 0;
// const THIN_MARKER_THICKNESS = 1;
// const THICK_MARKER_THICKNESS = 2;

// Step 0: Set the game name and update the document title
const gameName = "drawing app";
document.title = gameName;

// Create and append the header element
const header = document.createElement("h1");
header.innerHTML = gameName;
app.append(header);

// Step 1: Create and style the canvas
const canvas: HTMLCanvasElement = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.border = "1px solid black"; // Thin black border
canvas.style.borderRadius = "8px"; // Optional rounded corners
canvas.style.boxShadow = "2px 2px 8px rgba(0, 0, 0, 0.2)"; // Optional drop shadow
canvas.style.backgroundColor = "white"; // White background
app.append(canvas);

// Step 2: Allow the user to draw on the canvas using mouse events
const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
let isDrawing = false;
const markerLines: MarkerLine[] = [];

// Step 6: Constants for marker thickness
const THIN_MARKER = 3 as const;
const THICK_MARKER = 10 as const;
let currentMarkerThickness: typeof THIN_MARKER | typeof THICK_MARKER = THIN_MARKER;
let selectedSticker: string | null = null;
let isStickerButtonClicked = false;
let toolPreview: MarkerLine | null = null;
let stickerPreviewCommand: ToolPreviewCommand | null = null;

// Event listeners for drawing
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);
canvas.addEventListener("mousemove", handleToolMove);

// Function to initiate drawing
function startDrawing(e: MouseEvent) {
    isDrawing = true;

    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;

    // Create a new MarkerLine and add it to the array
    const newMarkerLine = new MarkerLine({ x, y }, currentMarkerThickness, ""); // Add an empty string for the sticker
    markerLines.push(newMarkerLine);
}


// Function to draw sticker preview separately
function drawStickerPreview(x: number, y: number, sticker: string) {
    if (toolPreview) {
        toolPreview.display(ctx!);
    }

    if (isDrawing && stickerPreviewCommand) {
        stickerPreviewCommand.execute(x, y);
    }
}

// Function to handle drawing on the canvas
function draw(e: MouseEvent) {
    if (!isDrawing || !ctx) return;
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;

    if (selectedSticker) {
        // Handle drawing stickers separately
		drawStickerPreview(x, y, selectedSticker);
		
		// Execute the IncludeStickerCommand at the beginning of drawing
		const includeStickerCommand = new IncludeStickerCommand(selectedSticker || "★", { x: 0, y: 0 });
		includeStickerCommand.execute({ x: 0, y: 0 }); // Pass initial position (it can be adjusted)
		includeStickerCommand.execute({ x, y });
	
    } else {
        // Handle drawing regular lines
        markerLines[markerLines.length - ONE].drag(x, y);
        ctx.clearRect(ZERO, ZERO, canvas.width, canvas.height);

        for (const line of markerLines) {
            line.display(ctx);
        }

        if (!isDrawing) {
            // Draw the tool preview if the mouse is not down
			drawToolPreview(x, y, selectedSticker ?? "");
        }
    }
}

// Function to stop drawing
function stopDrawing() {
  isDrawing = false;
}

// // Function to clear the canvas
// function clearCanvas() {
// 	if (!ctx) return;
// 	ctx.clearRect(ZERO, ZERO, canvas.width, canvas.height);
// 	markerLines.length = 0; // Clear the array of marker lines
// 	canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch the "drawing-changed" event
// }

// Step 3: Add an observer for the "drawing-changed" event
canvas.addEventListener("drawing-changed", updateCanvas);

// Function to update the canvas
function updateCanvas() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all marker lines
    for (const line of markerLines) {
        line.display(ctx);
    }

    // Draw all stickers
    for (const sticker of drawnStickers) {
        sticker.display(ctx);
    }
}

// Step 4: Create a container for buttons
const buttonsContainer: HTMLDivElement = document.createElement("div");
buttonsContainer.style.marginTop = "10px"; // Adjust margin as needed
app.append(buttonsContainer);

// Step 5: Add clear, undo, and redo buttons
const clearButton: HTMLButtonElement = document.createElement("button");
clearButton.textContent = "Clear";
clearButton.addEventListener("click", clearDrawing);
buttonsContainer.append(clearButton);

const undoButton: HTMLButtonElement = document.createElement("button");
undoButton.textContent = "Undo";
undoButton.addEventListener("click", undoDrawing);
buttonsContainer.append(undoButton);

const redoButton: HTMLButtonElement = document.createElement("button");
redoButton.textContent = "Redo";
redoButton.addEventListener("click", redoDrawing);
buttonsContainer.append(redoButton);

const undoStack: (MarkerLine | Sticker)[] = [];
const redoStack: (MarkerLine | Sticker)[] = [];

// Function to undo the last drawing action
function undoDrawing() {
    if (!isDrawing && markerLines.length > INITIAL_MARKER_LINES_LENGTH) {
        const undoneLine = markerLines.pop()!;
        undoStack.push(undoneLine);
    } else if (!isDrawing && drawnStickers.size > 0) {
        const undoneSticker = Array.from(drawnStickers).pop()!;
        undoStack.push(undoneSticker);
        drawnStickers.delete(undoneSticker);
    }

    // Update the canvas immediately after undoing
    updateCanvas();
    canvas.dispatchEvent(new Event("drawing-changed"));
}

// Function to redo the last undone drawing action
function redoDrawing() {
    if (undoStack.length > INITIAL_MARKER_LINES_LENGTH || redoStack.length > 0) {
        if (undoStack.length > INITIAL_MARKER_LINES_LENGTH) {
            const redoneLine = undoStack.pop()!;
            if (redoneLine instanceof MarkerLine) {
                markerLines.push(redoneLine);
            } else if (redoneLine instanceof Sticker) {
                drawnStickers.add(redoneLine);
            }
        } else {
            const redoneSticker = redoStack.pop()!;
            if (redoneSticker instanceof Sticker) {
                drawnStickers.add(redoneSticker);
            }
        }

        // Update the canvas immediately after redoing
        updateCanvas();
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
}

// Function to clear the canvas
function clearDrawing() {
    if (!isDrawing) {
        // Clear both marker lines and stickers
        markerLines.length = 0;
        drawnStickers.clear();

        // Update the canvas immediately after clearing
        updateCanvas();
        canvas.dispatchEvent(new Event("drawing-changed"));
    }
}

// Step 6: Add thin and thick marker buttons
const thinButton: HTMLButtonElement = document.createElement("button");
thinButton.textContent = "★ Thin Brush";
thinButton.addEventListener("click", () => {
    setMarkerThickness(THIN_MARKER);
    isStickerButtonClicked = false;
});
buttonsContainer.append(thinButton);

const thickButton: HTMLButtonElement = document.createElement("button");
thickButton.textContent = "★ Thick Brush";
thickButton.addEventListener("click", () => {
    setMarkerThickness(THICK_MARKER);
    isStickerButtonClicked = false;
});
buttonsContainer.append(thickButton);

// Function to set the marker thickness and indicate the selected tool
function setMarkerThickness(thickness: 3 | 10) {
    currentMarkerThickness = thickness;

    thinButton.classList.remove("selectedTool");
    thickButton.classList.remove("selectedTool");
    if (thickness === 3) {
        thinButton.classList.add("selectedTool");
    } else {
        thickButton.classList.add("selectedTool");
    }

    // Set isStickerButtonClicked to false when a marker button is clicked
    isStickerButtonClicked = false;
}

// Step 7: Function to draw the tool preview
function drawToolPreview(x: number, y: number, sticker: string) {
    if (!isDrawing && toolPreview) {
        toolPreview.display(ctx!);
    }

    if (isDrawing) {
        toolPreview = new MarkerLine({ x, y }, currentMarkerThickness, sticker);
        toolPreview.display(ctx!);
    }
}

// Updated ToolPreviewCommand class to include the 'sticker' property
class ToolPreviewCommand {
    constructor(private x: number, private y: number, private sticker: string, private thickness: number) {}

    // Update the execute method to use the class properties
    execute(cursorX: number, cursorY: number) {
        // Use the properties within the execute method to avoid TypeScript warnings
        console.log(`x: ${this.x}, y: ${this.y}, thickness: ${this.thickness}`);
        
        drawToolPreview(cursorX, cursorY, this.sticker);
    }
}


// Function to clear the tool preview
function clearToolPreview() {
    toolPreview = null;
    updateCanvas();
}

// Function to handle tool movement
function handleToolMove(e: MouseEvent) {
    if (!isDrawing) {
        const x = e.clientX - canvas.offsetLeft;
        const y = e.clientY - canvas.offsetTop;

        // Update the tool preview position
        clearToolPreview();
        const toolPreviewCommand = new ToolPreviewCommand(x, y, "★", currentMarkerThickness);
        toolPreviewCommand.execute(x, y);  // Provide the necessary arguments
    }
}


// Step 8: Emoji Unicode character codes for stickers
const stickerCodes = ["😸", "😹", "😻"];

// Create buttons for each sticker and append them to the buttonsContainer
for (let i = 0; i < stickerCodes.length; i++) {
    const stickerButton: HTMLButtonElement = document.createElement("button");
    stickerButton.textContent = `★ Cat Sticker ${i + 1}`;
    stickerButton.addEventListener("click", () => handleStickerClick(stickerCodes[i]));
    buttonsContainer.append(stickerButton);
}

// Function to handle sticker button click
function handleStickerClick(sticker: string) {
    // Dispatch the "tool-moved" event with the selected sticker as data
    fireEvent("tool-moved", sticker);

    // Set the selected sticker
    selectedSticker = sticker;

    // Create a new ToolPreviewCommand with the selected sticker
    stickerPreviewCommand = new ToolPreviewCommand(0, 0, selectedSticker, currentMarkerThickness);

    // Execute the IncludeStickerCommand with the selected sticker only if the sticker button is clicked
    if (isStickerButtonClicked) {
        // Execute the IncludeStickerCommand at the beginning of drawing
		const includeStickerCommand = new IncludeStickerCommand(selectedSticker || "★", { x: 0, y: 0 });
		includeStickerCommand.execute({ x: 0, y: 0 }); // Pass initial position (it can be adjusted)
    }

    // Set isStickerButtonClicked to true when the sticker button is clicked
    isStickerButtonClicked = true;
}


// Class for including stickers as commands
class IncludeStickerCommand {
    private sticker: string;
    private position: { x: number; y: number };

    constructor(sticker: string, position: { x: number; y: number }) {
        this.sticker = sticker;
        this.position = position;
    }

    execute(cursorPosition: { x: number; y: number }) {
        // Log the position to the console
        console.log("Position:", this.position);

        // Store the drawn sticker as an instance of the Sticker class
        drawnStickers.add(new Sticker(cursorPosition.x, cursorPosition.y, this.sticker));

        // Redraw all stickers whenever the canvas is updated
        updateCanvas();
    }

    drag(cursorPosition: { x: number; y: number }) {
        // Clear the canvas and redraw all marker lines with the currentMarkerThickness
        ctx!.clearRect(ZERO, ZERO, canvas.width, canvas.height);
        for (const line of markerLines) {
            line.display(ctx!);
        }

        // Draw the sticker at the new position during drag
        drawSticker(cursorPosition.x, cursorPosition.y, this.sticker);
    }
}



// Function to create custom sticker at cursor position
function createCustomStickerAtCursor(cursorPosition: { x: number; y: number }) {
    const customText = prompt("Enter your custom sticker text:");

    if (customText !== null && customText.trim() !== "") {
        // Use the IncludeStickerCommand to add the custom sticker at the cursor position
        const includeStickerCommand = new IncludeStickerCommand(customText, cursorPosition);
        includeStickerCommand.execute(cursorPosition);
    }
}

function drawSticker(x: number, y: number, sticker: string) {
    // Draw the sticker on the canvas with a smaller font size
    ctx!.font = "24px Arial"; // Change the font size to your desired value
    ctx!.textAlign = "center";
    ctx!.textBaseline = "middle";
    ctx!.fillText(sticker, x, y);
}

function fireEvent<T>(eventName: string, data: T) {
    const event = new CustomEvent<T>(eventName, { detail: data });
    document.dispatchEvent(event);
}


// Step 9: Add a button for creating custom stickers

const createCustomStickerButton: HTMLButtonElement = document.createElement("button");
createCustomStickerButton.textContent = "Create Custom Sticker";
createCustomStickerButton.addEventListener("click", createCustomSticker);
buttonsContainer.append(createCustomStickerButton);

// Function to create custom sticker
function createCustomSticker() {
    const customText = prompt("Enter your custom sticker text:");

    if (customText !== null && customText.trim() !== "") {
        // // Use the IncludeStickerCommand to add the custom sticker
        // const includeStickerCommand = new IncludeStickerCommand(customText);
		// includeStickerCommand.execute({ x: 100, y: 100 }); // Initial position (adjust as needed)
		// // Event listener for canvas click to create custom sticker
		canvas.addEventListener("click", (e) => {
			const x = e.clientX - canvas.offsetLeft;
			const y = e.clientY - canvas.offsetTop;
			createCustomStickerAtCursor({ x, y });
		});
    }
}

// Step 10: Add an export button
const exportButton: HTMLButtonElement = document.createElement("button");
exportButton.textContent = "Export";
exportButton.addEventListener("click", exportCanvas);
buttonsContainer.append(exportButton);

// Function to export the canvas as PNG
function exportCanvas() {
    if (!ctx) return;

    // Create a temporary canvas with a larger size
    const tempCanvas: HTMLCanvasElement = document.createElement("canvas");
    tempCanvas.width = canvas.width * 4;
    tempCanvas.height = canvas.height * 4;
    const tempCtx: CanvasRenderingContext2D = tempCanvas.getContext("2d")!;

    // Scale the context to match the temporary canvas size
    tempCtx.scale(4, 4);

    // Draw all marker lines on the temporary canvas
    for (const line of markerLines) {
        line.display(tempCtx);
    }

    // Draw all stickers on the temporary canvas
    for (const sticker of drawnStickers) {
        sticker.display(tempCtx);
    }

    // Trigger a file download with the contents of the temporary canvas as a PNG file
    const dataURL = tempCanvas.toDataURL("image/png");
    const link: HTMLAnchorElement = document.createElement("a");
    link.href = dataURL;
    link.download = "exported_canvas.png";
    link.click();
}
