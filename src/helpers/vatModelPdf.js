// IVA › Models 303 i 390: the model 303 of a quarter as a PDF with real text
// (2026-11-04). It was html2pdf, a picture of the page: nothing could be
// selected. Now jsPDF draws the text, so the amounts can be copied into the
// AEAT's form; they are written as the form takes them (20808,25: comma
// decimals, no thousands dots). The layout follows model303Sheet() of
// domain/vatModels.js: the AEAT's sections and box numbers, the entity, and
// «Esborrany» or when and with which receipt it was filed.
import { jsPDF } from "jspdf";
import rubikRegularUrl from "@/assets/fonts/Rubik-Regular.ttf?url";
import rubikMediumUrl from "@/assets/fonts/Rubik-Medium.ttf?url";

const PAGE_W = 210;
const PAGE_H = 297;
const LEFT = 14;
const RIGHT = PAGE_W - 14;
const BOTTOM = PAGE_H - 14;
// right edges of the value columns, and the widths of the box tag and the value
const COL = { quota: RIGHT, rate: 155, base: 132 };
const TAG_W = 8;
const VALUE_W = { quota: 26, rate: 10, base: 26 };
const LABEL_W = COL.base - VALUE_W.base - TAG_W - 2 - LEFT - 3;

const TEXT = [51, 51, 51];
const MUTED = [143, 143, 143];
const LINE = [238, 238, 238];
const LINE_STRONG = [204, 204, 204];
const BAND = [248, 248, 250];
const DRAFT = [180, 83, 9];

// as the AEAT's form takes it: 20808,25 / -10,71
export function aeatAmount(value) {
  const v = Number(value) || 0;
  // half away from zero, past the binary error of 10.705 & co.
  const cents = Math.round(Math.abs(v) * 100 + 1e-6);
  return `${v < 0 && cents ? "-" : ""}${(cents / 100).toFixed(2).replace(".", ",")}`;
}

const rate = value => `${String(Number(value) || 0).replace(".", ",")} %`;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// Rubik, the app's font, embedded; Helvetica when it can't be loaded
async function loadFonts(doc) {
  try {
    const [regular, medium] = await Promise.all(
      [rubikRegularUrl, rubikMediumUrl].map(async url => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        return toBase64(await res.arrayBuffer());
      })
    );
    doc.addFileToVFS("Rubik-Regular.ttf", regular);
    doc.addFont("Rubik-Regular.ttf", "Rubik", "normal");
    doc.addFileToVFS("Rubik-Medium.ttf", medium);
    doc.addFont("Rubik-Medium.ttf", "Rubik", "bold");
    return "Rubik";
  } catch (e) {
    return "helvetica";
  }
}

/**
 * The jsPDF document of a model303Sheet(). `fonts: false` skips loading Rubik
 * (tests). `today` is the generation date as printed.
 */
export async function buildModel303Pdf(sheet, { today, fonts = true } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const family = fonts ? await loadFonts(doc) : "helvetica";
  const font = (weight = "normal", size = 8.8, color = TEXT) => {
    doc.setFont(family, weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  let y = 0;
  const room = needed => {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = 14;
    }
  };

  // band: title, entity, status
  doc.setFillColor(...BAND);
  doc.rect(0, 0, PAGE_W, 24, "F");
  font("bold", 16);
  doc.text(sheet.title, LEFT, 12);
  if (sheet.entity) {
    font("normal", 8.8);
    doc.text(sheet.entity, LEFT, 18);
  }
  font(sheet.draft ? "bold" : "normal", 8.5, sheet.draft ? DRAFT : TEXT);
  doc.text(doc.splitTextToSize(sheet.status, 80), RIGHT, 12, { align: "right" });
  y = 32;

  // a value with its box tag, right-aligned at `right`
  const cell = (c, right, width, text, weight) => {
    const tagX = right - width - 2 - TAG_W;
    doc.setDrawColor(221, 221, 221);
    doc.roundedRect(tagX, y - 3, TAG_W, 4, 0.5, 0.5, "S");
    font("normal", 7.5, MUTED);
    doc.text(c.box, tagX + TAG_W / 2, y, { align: "center" });
    font(weight, 8.8);
    doc.text(text, right, y, { align: "right" });
  };
  const rule = (color = LINE) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(LEFT, y + 1.5, RIGHT, y + 1.5);
  };

  for (const sec of sheet.sections) {
    const hasBase = sec.lines.some(l => l.base);
    room(14);
    font("bold", 10);
    doc.text(sec.title, LEFT, y);
    y += 5;
    if (hasBase) {
      font("normal", 8, MUTED);
      doc.text("Base imposable", COL.base, y, { align: "right" });
      if (sec.rates) doc.text("Tipus", COL.rate, y, { align: "right" });
      doc.text("Quota", COL.quota, y, { align: "right" });
      rule();
      y += 5;
    }
    const rows = sec.total ? [...sec.lines, { label: sec.total.label, vat: { box: sec.total.box, value: sec.total.value }, total: true }] : sec.lines;
    for (const l of rows) {
      const weight = l.total ? "bold" : "normal";
      font(weight, 8.8);
      const label = doc.splitTextToSize(l.label, hasBase ? LABEL_W : COL.quota - VALUE_W.quota - TAG_W - 2 - LEFT - 3);
      room(label.length * 3.8 + 2);
      doc.text(label, LEFT + 1, y);
      if (l.base) cell(l.base, COL.base, VALUE_W.base, aeatAmount(l.base.value), weight);
      if (sec.rates && l.rate) cell(l.rate, COL.rate, VALUE_W.rate, rate(l.rate.value), weight);
      if (l.vat) cell(l.vat, COL.quota, VALUE_W.quota, l.vat.pct ? rate(l.vat.value) : aeatAmount(l.vat.value), weight);
      y += (label.length - 1) * 3.8;
      rule(l.total ? LINE_STRONG : LINE);
      y += 5;
    }
    y += 3;
  }

  // settlement
  room(16);
  font("bold", 10);
  doc.text("Liquidació", LEFT, y);
  y += 6;
  doc.setDrawColor(...LINE_STRONG);
  doc.line(LEFT, y - 4.5, RIGHT, y - 4.5);
  font("bold", 8.8);
  doc.text(sheet.settlement.label, LEFT + 1, y);
  if (sheet.settlement.box) cell({ box: sheet.settlement.box }, COL.quota, VALUE_W.quota, aeatAmount(sheet.settlement.amount), "bold");
  doc.setDrawColor(...LINE_STRONG);
  doc.line(LEFT, y + 2, RIGHT, y + 2);
  y += 8;

  room(10);
  font("normal", 7.5, MUTED);
  doc.text(
    doc.splitTextToSize(
      `Generat per ESSTRAPIS el ${today}. Imports en el format del formulari de l'AEAT (coma decimal, sense punts de milers). ` +
        "Les caselles que no es calculen (recàrrec d'equivalència, criteri de caixa, importacions…) no hi surten.",
      RIGHT - LEFT
    ),
    LEFT,
    y
  );
  return doc;
}
