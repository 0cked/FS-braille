import { BrailleCell } from "./translation";

export type SvgLayout = {
  cell_width_mm: number;
  cell_height_mm: number;
  dot_diameter_mm: number;
  interdot_x_mm: number;
  interdot_y_mm: number;
  intercell_x_mm: number;
  interline_y_mm: number;
  margin_left_mm: number;
  margin_top_mm: number;
};

export const DEFAULT_SVG_LAYOUT: SvgLayout = {
  cell_width_mm: 6.3,
  cell_height_mm: 10.0,
  dot_diameter_mm: 1.5,
  interdot_x_mm: 2.5,
  interdot_y_mm: 2.5,
  intercell_x_mm: 3.0,
  interline_y_mm: 4.0,
  margin_left_mm: 4.0,
  margin_top_mm: 4.0
};

const DOT_POSITIONS: Array<[number, number]> = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 1],
  [1, 2]
];

export const renderBrailleSvg = (
  lines: BrailleCell[][],
  layout: SvgLayout
): { svg: string; widthMm: number; heightMm: number } => {
  const maxCells = Math.max(0, ...lines.map((line) => line.length));
  const widthMm =
    layout.margin_left_mm * 2 +
    maxCells * layout.cell_width_mm +
    Math.max(0, maxCells - 1) * layout.intercell_x_mm;
  const heightMm =
    layout.margin_top_mm * 2 +
    lines.length * layout.cell_height_mm +
    Math.max(0, lines.length - 1) * layout.interline_y_mm;

  const circles: string[] = [];

  lines.forEach((line, lineIndex) => {
    const baseY =
      layout.margin_top_mm +
      lineIndex * (layout.cell_height_mm + layout.interline_y_mm);
    line.forEach((cell, cellIndex) => {
      const baseX =
        layout.margin_left_mm +
        cellIndex * (layout.cell_width_mm + layout.intercell_x_mm);
      const bits = cell.bitstring.split("");
      bits.forEach((bit, bitIndex) => {
        if (bit !== "1") {
          return;
        }
        const [col, row] = DOT_POSITIONS[bitIndex];
        const cx = baseX + col * layout.interdot_x_mm;
        const cy = baseY + row * layout.interdot_y_mm;
        circles.push(
          `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${(
            layout.dot_diameter_mm / 2
          ).toFixed(3)}" />`
        );
      });
    });
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" role="img" aria-label="Braille preview">\n` +
    `<rect width="100%" height="100%" fill="white" />\n` +
    circles.join("\n") +
    `\n</svg>`;

  return { svg, widthMm, heightMm };
};
