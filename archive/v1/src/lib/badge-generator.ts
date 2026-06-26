import { createCanvas } from "canvas";
import QRCode from "qrcode";

type ContentType = "HUMAN" | "AI" | "WITH_AI";

interface BadgeConfig {
  contentType: ContentType;
  contentId: string;
  baseUrl: string;
  greyscale?: boolean;
}

const COLORS = {
  HUMAN: {
    primary: "#06b6d4",
    secondary: "#0891b2",
    text: "#155e75",
    light: "#cffafe",
    bg: "#ecfeff",
  },
  AI: {
    primary: "#ec4899",
    secondary: "#db2777",
    text: "#9d174d",
    light: "#fce7f3",
    bg: "#fdf2f8",
  },
  WITH_AI: {
    primary: "#8b5cf6",
    secondary: "#7c3aed",
    text: "#5b21b6",
    light: "#ede9fe",
    bg: "#faf5ff",
  },
};

const GREYSCALE_COLORS = {
  primary: "#525252",
  secondary: "#404040",
  text: "#525252",
  light: "#e5e5e5",
  bg: "#f5f5f5",
};

const LABELS = {
  HUMAN: { prefix: "MADE BY", letters: "HI", bottomText: "100% Human Intelligence" },
  AI: { prefix: "MADE BY", letters: "AI", bottomText: "100% AI Generated" },
  WITH_AI: { prefix: "MADE WITH", letters: "AI", bottomText: "Human + AI" },
};

export async function generateBadge(config: BadgeConfig): Promise<Buffer> {
  const { contentType, contentId, baseUrl, greyscale = false } = config;

  // Rectangular dimensions - narrower without middle section
  const padding = 16;
  const topRowHeight = 24;
  const elementSize = 120;
  const gap = 16;
  const labels = LABELS[contentType];
  const bottomRowHeight = labels.bottomText ? 20 : 0;
  const width = padding + elementSize + gap + elementSize + padding; // 288
  const height = padding + topRowHeight + elementSize + bottomRowHeight + padding; // 176 or 196

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const colors = greyscale ? GREYSCALE_COLORS : COLORS[contentType];

  // Draw background with rounded corners
  ctx.fillStyle = colors.bg;
  roundRect(ctx, 0, 0, width, height, 16);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, width - 3, height - 3, 14);
  ctx.stroke();

  // Calculate positions
  const lettersX = padding;
  const qrX = padding + elementSize + gap;
  const topY = padding;
  const elementsY = topY + topRowHeight;

  // Draw top row labels
  ctx.fillStyle = colors.text;
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // "MADE BY" or "MADE WITH" label over letters
  ctx.fillText(labels.prefix, lettersX + elementSize / 2, topY);

  // "SCAN" label over QR code
  ctx.fillText("SCAN", qrX + elementSize / 2, topY);

  // Draw left side - Letters (HI or AI)
  ctx.fillStyle = colors.primary;
  roundRect(ctx, lettersX, elementsY, elementSize, elementSize, 12);
  ctx.fill();

  // Draw the letters
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${elementSize * 0.5}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labels.letters, lettersX + elementSize / 2, elementsY + elementSize / 2 + 4);

  // Draw "w/" for WITH_AI badge in top-left of colored square
  // Position: centered in rectangle between top-left of square and top-left of "A" in "AI"
  if (contentType === "WITH_AI") {
    const aiFontSize = elementSize * 0.5; // 60px for 120px element
    const aiTextWidth = aiFontSize * 0.85; // Approximate width of "AI"
    const aWidth = aiFontSize * 0.58; // Approximate width of "A"
    const aHeight = aiFontSize * 0.72; // Approximate cap height

    // "AI" is centered in the square
    const aiCenterX = lettersX + elementSize / 2;
    const aiCenterY = elementsY + elementSize / 2 + 4;

    // Northwest corner of "A" bounding box
    const aNorthwestX = aiCenterX - aiTextWidth / 2;
    const aNorthwestY = aiCenterY - aHeight / 2;

    // Second rectangle: from square's NW corner to A's NW corner
    const rectX = lettersX;
    const rectY = elementsY;
    const rectWidth = aNorthwestX - lettersX;
    const rectHeight = aNorthwestY - elementsY;

    // Center "w/" in this rectangle
    const wCenterX = rectX + rectWidth / 2;
    const wCenterY = rectY + rectHeight / 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("w/", wCenterX, wCenterY);
  }

  // Generate QR code
  const declarationUrl = `${baseUrl}/declaration/${contentId}`;
  const qrDataUrl = await QRCode.toDataURL(declarationUrl, {
    width: elementSize,
    margin: 0,
    color: {
      dark: colors.secondary,
      light: "#ffffff",
    },
  });

  // Draw QR code background
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX, elementsY, elementSize, elementSize, 12);
  ctx.fill();

  // Draw QR border
  ctx.strokeStyle = colors.light;
  ctx.lineWidth = 2;
  roundRect(ctx, qrX, elementsY, elementSize, elementSize, 12);
  ctx.stroke();

  // Load and draw QR code
  const qrImage = await loadImage(qrDataUrl);
  const qrPadding = 8;
  ctx.drawImage(
    qrImage,
    qrX + qrPadding,
    elementsY + qrPadding,
    elementSize - qrPadding * 2,
    elementSize - qrPadding * 2
  );

  // Draw bottom text if present (for HUMAN type)
  // Center vertically between bottom of colored square (elementsY + elementSize) and bottom border (height - padding)
  if (labels.bottomText) {
    ctx.fillStyle = colors.text;
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bottomTextY = elementsY + elementSize + (bottomRowHeight + padding) / 2;
    ctx.fillText(labels.bottomText, width / 2, bottomTextY);
  }

  return canvas.toBuffer("image/png");
}

export async function generateSimpleBadge(contentType: ContentType, greyscale: boolean = false): Promise<Buffer> {
  // Simple badge - just the letters and label, no QR code
  const padding = 16;
  const topRowHeight = 24;
  const elementSize = 120;
  const labels = LABELS[contentType];
  const bottomRowHeight = labels.bottomText ? 20 : 0;
  const width = padding + elementSize + padding; // 152
  const height = padding + topRowHeight + elementSize + bottomRowHeight + padding; // 176 or 196

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const colors = greyscale ? GREYSCALE_COLORS : COLORS[contentType];

  // Draw background with rounded corners
  ctx.fillStyle = colors.bg;
  roundRect(ctx, 0, 0, width, height, 16);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, width - 3, height - 3, 14);
  ctx.stroke();

  // Calculate positions
  const lettersX = padding;
  const topY = padding;
  const elementsY = topY + topRowHeight;

  // Draw top row label
  ctx.fillStyle = colors.text;
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(labels.prefix, lettersX + elementSize / 2, topY);

  // Draw Letters (HI or AI)
  ctx.fillStyle = colors.primary;
  roundRect(ctx, lettersX, elementsY, elementSize, elementSize, 12);
  ctx.fill();

  // Draw the letters
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${elementSize * 0.5}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labels.letters, lettersX + elementSize / 2, elementsY + elementSize / 2 + 4);

  // Draw "w/" for WITH_AI badge in top-left of colored square
  // Position: centered in rectangle between top-left of square and top-left of "A" in "AI"
  if (contentType === "WITH_AI") {
    const aiFontSize = elementSize * 0.5; // 60px for 120px element
    const aiTextWidth = aiFontSize * 0.85; // Approximate width of "AI"
    const aHeight = aiFontSize * 0.72; // Approximate cap height

    // "AI" is centered in the square
    const aiCenterX = lettersX + elementSize / 2;
    const aiCenterY = elementsY + elementSize / 2 + 4;

    // Northwest corner of "A" bounding box
    const aNorthwestX = aiCenterX - aiTextWidth / 2;
    const aNorthwestY = aiCenterY - aHeight / 2;

    // Second rectangle: from square's NW corner to A's NW corner
    const rectX = lettersX;
    const rectY = elementsY;
    const rectWidth = aNorthwestX - lettersX;
    const rectHeight = aNorthwestY - elementsY;

    // Center "w/" in this rectangle
    const wCenterX = rectX + rectWidth / 2;
    const wCenterY = rectY + rectHeight / 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("w/", wCenterX, wCenterY);
  }

  // Draw bottom text if present (for HUMAN type)
  // Center vertically between bottom of colored square (elementsY + elementSize) and bottom border (height - padding)
  if (labels.bottomText) {
    ctx.fillStyle = colors.text;
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bottomTextY = elementsY + elementSize + (bottomRowHeight + padding) / 2;
    ctx.fillText(labels.bottomText, width / 2, bottomTextY);
  }

  return canvas.toBuffer("image/png");
}

// Helper function to draw rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper function to load image from data URL
async function loadImage(dataUrl: string) {
  const { loadImage: canvasLoadImage } = await import("canvas");
  return canvasLoadImage(dataUrl);
}
