import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PATH = join(process.cwd(), "size-chart.json");

export interface SizeChartRow { size: string; chest: string; length: string; shoulder: string; }

const DEFAULTS: SizeChartRow[] = [
  { size: "XS",  chest: '34–36"', length: '26"', shoulder: '15"' },
  { size: "S",   chest: '36–38"', length: '27"', shoulder: '16"' },
  { size: "M",   chest: '38–40"', length: '28"', shoulder: '17"' },
  { size: "L",   chest: '40–42"', length: '29"', shoulder: '18"' },
  { size: "XL",  chest: '42–44"', length: '30"', shoulder: '19"' },
  { size: "XXL", chest: '44–46"', length: '31"', shoulder: '20"' },
];

export function getSizeChart(): SizeChartRow[] {
  if (!existsSync(PATH)) return [...DEFAULTS];
  try { return JSON.parse(readFileSync(PATH, "utf-8")); }
  catch { return [...DEFAULTS]; }
}

export function saveSizeChart(rows: SizeChartRow[]): SizeChartRow[] {
  writeFileSync(PATH, JSON.stringify(rows, null, 2), "utf-8");
  return rows;
}
