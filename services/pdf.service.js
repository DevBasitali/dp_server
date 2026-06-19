const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// ── Page geometry ──────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const RIGHT_X = PAGE_W - MARGIN;          // 545.28
const CONTENT_W = RIGHT_X - MARGIN;       // 495.28
const FOOTER_RESERVED = 30;
const CONTENT_BOTTOM = MARGIN + FOOTER_RESERVED; // minimum y for content

// ── Colors ─────────────────────────────────────────────────────────────────────
const C = {
  black: rgb(0,     0,     0    ),
  g333:  rgb(0.20,  0.20,  0.20 ),
  g444:  rgb(0.267, 0.267, 0.267),
  g666:  rgb(0.40,  0.40,  0.40 ),
  g999:  rgb(0.60,  0.60,  0.60 ),
  gAAA:  rgb(0.667, 0.667, 0.667),
  gCCC:  rgb(0.80,  0.80,  0.80 ),
  gEEE:  rgb(0.933, 0.933, 0.933),
  gF5:   rgb(0.961, 0.961, 0.961),
};

// ── Table column start positions ───────────────────────────────────────────────
const COL_NUM_X  = MARGIN;           // 50  → width 30  → ends at 80
const COL_NAME_X = MARGIN + 30;      // 80  → width 265 → ends at 345
const COL_QTY_X  = MARGIN + 295;     // 345 → width 100 → ends at 445
const COL_IMG_X  = MARGIN + 395;     // 445 → width 100 → ends at 545

// ── Image limits ───────────────────────────────────────────────────────────────
const IMG_MAX_W = 80;
const IMG_MAX_H = 80;

// ── Fetch & embed helpers ──────────────────────────────────────────────────────

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function embedImage(pdfDoc, url) {
  const result = await fetchImageBuffer(url);
  if (!result) return null;
  const { buffer, contentType } = result;
  try {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      return await pdfDoc.embedJpg(buffer);
    }
    return await pdfDoc.embedPng(buffer);
  } catch {
    return null;
  }
}

// ── Text helpers ───────────────────────────────────────────────────────────────

function spacedTextWidth(text, font, size, letterSpacing) {
  let w = 0;
  for (const char of text) {
    w += font.widthOfTextAtSize(char, size) + letterSpacing;
  }
  return Math.max(0, w - letterSpacing);
}

function drawSpacedText(page, text, { x, y, size, font, color, letterSpacing }) {
  let cx = x;
  for (const char of text) {
    page.drawText(char, { x: cx, y, size, font, color });
    cx += font.widthOfTextAtSize(char, size) + letterSpacing;
  }
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── Section drawers ────────────────────────────────────────────────────────────

function drawHeader(page, boldFont, regularFont, orderNumber) {
  const startY = PAGE_H - MARGIN; // 791.89

  // Left: company name
  page.drawText('DOLLAR POINT', {
    x: MARGIN, y: startY, size: 24, font: boldFont, color: C.black,
  });

  // Right: document title, right-aligned with letter-spacing
  const titleText = 'VENDOR ORDER REQUEST';
  const titleW = spacedTextWidth(titleText, boldFont, 10, 1);
  drawSpacedText(page, titleText, {
    x: RIGHT_X - titleW, y: startY, size: 10, font: boldFont, color: C.black, letterSpacing: 1,
  });

  const subY = startY - 28; // 24pt title + 4pt gap

  // Left: tagline
  page.drawText('Manage Smarter. Grow Faster.', {
    x: MARGIN, y: subY, size: 9, font: regularFont, color: C.g666,
  });

  // Right: order number, right-aligned
  const onW = regularFont.widthOfTextAtSize(orderNumber, 9);
  page.drawText(orderNumber, {
    x: RIGHT_X - onW, y: subY, size: 9, font: regularFont, color: C.g666,
  });

  // Thick divider 15pt below tagline baseline
  const divY = subY - 9 - 15;
  page.drawLine({
    start: { x: MARGIN, y: divY },
    end:   { x: RIGHT_X, y: divY },
    thickness: 2,
    color: C.black,
  });

  return divY - 20; // cursor after header
}

function drawInfoSection(page, boldFont, regularFont, y, { branch, vendor, dateStr, requesterName }) {
  const midX = MARGIN + CONTENT_W / 2; // ~298

  // ── Left column ──────────────────────────────────────────────────────────────
  let lY = y;

  drawSpacedText(page, 'FROM', {
    x: MARGIN, y: lY, size: 8, font: boldFont, color: C.g999, letterSpacing: 1,
  });
  lY -= 12; // 8pt label + 4pt gap

  page.drawText(branch.name, { x: MARGIN, y: lY, size: 12, font: boldFont, color: C.black });
  lY -= 16; // 12pt text + 4pt gap

  const location = branch.location || branch.address || '';
  if (location) {
    page.drawText(location, { x: MARGIN, y: lY, size: 9, font: regularFont, color: C.g444 });
    lY -= 13;
  }

  // ── Right column ─────────────────────────────────────────────────────────────
  let rY = y;

  drawSpacedText(page, 'TO VENDOR', {
    x: midX, y: rY, size: 8, font: boldFont, color: C.g999, letterSpacing: 1,
  });
  rY -= 12;

  page.drawText(vendor.name, { x: midX, y: rY, size: 12, font: boldFont, color: C.black });
  rY -= 16;

  if (vendor.whatsapp_number) {
    page.drawText(vendor.whatsapp_number, { x: midX, y: rY, size: 9, font: regularFont, color: C.g444 });
    rY -= 9;
  }

  rY -= 12; // margin-top: 12 before DATE

  drawSpacedText(page, 'DATE', {
    x: midX, y: rY, size: 8, font: boldFont, color: C.g999, letterSpacing: 1,
  });
  rY -= 11; // 8pt label + 3pt gap

  page.drawText(dateStr, { x: midX, y: rY, size: 9, font: regularFont, color: C.black });
  rY -= 9;
  rY -= 8; // margin-top: 8 before REQUESTED BY

  drawSpacedText(page, 'REQUESTED BY', {
    x: midX, y: rY, size: 8, font: boldFont, color: C.g999, letterSpacing: 1,
  });
  rY -= 11;

  page.drawText(requesterName, { x: midX, y: rY, size: 9, font: regularFont, color: C.black });
  rY -= 9;

  // Thin separator below the taller column
  const sectionBottom = Math.min(lY, rY) - 10;
  page.drawLine({
    start: { x: MARGIN, y: sectionBottom },
    end:   { x: RIGHT_X, y: sectionBottom },
    thickness: 0.5,
    color: C.gCCC,
  });

  return sectionBottom - 15;
}

function drawItemsTitle(page, boldFont, y, label) {
  drawSpacedText(page, label || 'REQUESTED ITEMS', {
    x: MARGIN, y, size: 8, font: boldFont, color: C.g999, letterSpacing: 2,
  });
  return y - 8 - 12; // 8pt text + 12pt margin-bottom
}

function drawTableHeader(page, boldFont, y) {
  page.drawRectangle({
    x: MARGIN, y: y - 24, width: CONTENT_W, height: 24, color: C.gF5,
  });

  const textY = y - 24 + 9; // vertically center 8pt text in 24pt row
  page.drawText('#',         { x: COL_NUM_X  + 5, y: textY, size: 8, font: boldFont, color: C.g333 });
  page.drawText('ITEM NAME', { x: COL_NAME_X + 5, y: textY, size: 8, font: boldFont, color: C.g333 });
  page.drawText('QTY',       { x: COL_QTY_X  + 5, y: textY, size: 8, font: boldFont, color: C.g333 });
  page.drawText('IMAGE',     { x: COL_IMG_X  + 5, y: textY, size: 8, font: boldFont, color: C.g333 });

  return y - 24; // bottom of header row
}

function calcRowHeight(img) {
  if (img) {
    const scale = Math.min(IMG_MAX_W / img.width, IMG_MAX_H / img.height, 1);
    return Math.max(img.height * scale + 20, 50);
  }
  return 55; // 40pt placeholder + 15pt padding
}

function drawItemRow(page, boldFont, regularFont, y, item, img, index) {
  const rowH = calcRowHeight(img);
  const TEXT_OFFSET = 15; // distance from top of row to text baseline

  // Index number
  page.drawText(String(index + 1), {
    x: COL_NUM_X + 8, y: y - TEXT_OFFSET, size: 9, font: boldFont, color: C.black,
  });

  // Item name
  page.drawText(item.item_name || '', {
    x: COL_NAME_X + 5, y: y - TEXT_OFFSET, size: 10, font: regularFont, color: C.black,
  });

  // Quantity
  page.drawText(`${item.quantity} pcs`, {
    x: COL_QTY_X + 5, y: y - TEXT_OFFSET, size: 10, font: boldFont, color: C.black,
  });

  // Image or dashed placeholder, centered in the 100pt image column
  const imgColW = 100;

  if (img) {
    const scale = Math.min(IMG_MAX_W / img.width, IMG_MAX_H / img.height, 1);
    const iW = img.width * scale;
    const iH = img.height * scale;
    const iX = COL_IMG_X + (imgColW - iW) / 2;
    const iY = y - rowH / 2 - iH / 2; // centered vertically in row

    page.drawRectangle({
      x: iX - 1, y: iY - 1, width: iW + 2, height: iH + 2,
      borderWidth: 0.5, borderColor: C.gCCC,
    });
    page.drawImage(img, { x: iX, y: iY, width: iW, height: iH });
  } else {
    const phW = 70;
    const phH = 40;
    const phX = COL_IMG_X + (imgColW - phW) / 2;
    const phY = y - rowH / 2 - phH / 2;

    page.drawRectangle({
      x: phX, y: phY, width: phW, height: phH,
      borderWidth: 0.5,
      borderColor: C.gCCC,
      borderDashArray: [3, 3],
    });
    const label = 'No image';
    const lW = regularFont.widthOfTextAtSize(label, 7);
    page.drawText(label, {
      x: phX + (phW - lW) / 2, y: phY + phH / 2 - 3,
      size: 7, font: regularFont, color: C.g999,
    });
  }

  // Row separator
  page.drawLine({
    start: { x: MARGIN, y: y - rowH },
    end:   { x: RIGHT_X, y: y - rowH },
    thickness: 0.5,
    color: C.gEEE,
  });

  return y - rowH;
}

function drawNotes(page, boldFont, regularFont, y, notes) {
  drawSpacedText(page, 'NOTES', {
    x: MARGIN, y, size: 8, font: boldFont, color: C.g999, letterSpacing: 2,
  });
  y -= 12;

  const lines = wrapText(notes, regularFont, 9, CONTENT_W - 10);
  for (const line of lines) {
    page.drawText(line, { x: MARGIN, y, size: 9, font: regularFont, color: C.g444 });
    y -= 13;
  }

  return y;
}

function drawFooter(page, regularFont, pageNum, totalPages) {
  const lineY = MARGIN + 20;
  const textY = MARGIN + 7;

  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end:   { x: RIGHT_X, y: lineY },
    thickness: 0.5,
    color: C.gCCC,
  });

  page.drawText('Dollar Point — Confidential', {
    x: MARGIN, y: textY, size: 7, font: regularFont, color: C.gAAA,
  });

  const centerText = 'This is an official inventory request document.';
  const cW = regularFont.widthOfTextAtSize(centerText, 7);
  page.drawText(centerText, {
    x: (PAGE_W - cW) / 2, y: textY, size: 7, font: regularFont, color: C.gAAA,
  });

  const pageText = `Page ${pageNum} of ${totalPages}`;
  const pW = regularFont.widthOfTextAtSize(pageText, 7);
  page.drawText(pageText, {
    x: RIGHT_X - pW, y: textY, size: 7, font: regularFont, color: C.gAAA,
  });
}

// ── Main export ────────────────────────────────────────────────────────────────

exports.generateOrderPDF = async ({ order, vendor, branch, requester, items }) => {
  const pdfDoc = await PDFDocument.create();
  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const year   = new Date(order.created_at).getFullYear();
  const suffix = order.id.replace(/-/g, '').slice(-4).toUpperCase();
  const orderNumber = `ORD-${year}-${suffix}`;

  const dateStr = new Date(order.created_at).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Pre-fetch all item images in parallel
  const embeddedImages = await Promise.all(
    items.map((item) => (item.image_url ? embedImage(pdfDoc, item.image_url) : Promise.resolve(null)))
  );

  const pages = [];

  function newPage() {
    const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    return p;
  }

  // ── First page ───────────────────────────────────────────────────────────────
  let page = newPage();
  let y = drawHeader(page, boldFont, regularFont, orderNumber);

  y = drawInfoSection(page, boldFont, regularFont, y, {
    branch,
    vendor,
    dateStr,
    requesterName: requester.name,
  });

  y = drawItemsTitle(page, boldFont, y);
  y = drawTableHeader(page, boldFont, y);

  // ── Item rows ────────────────────────────────────────────────────────────────
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const img  = embeddedImages[i];
    const rowH = calcRowHeight(img);

    if (y - rowH < CONTENT_BOTTOM) {
      page = newPage();
      y = drawHeader(page, boldFont, regularFont, orderNumber);
      y = drawItemsTitle(page, boldFont, y, 'REQUESTED ITEMS (CONTINUED)');
      y = drawTableHeader(page, boldFont, y);
    }

    y = drawItemRow(page, boldFont, regularFont, y, item, img, i);
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (order.notes) {
    const noteLines  = wrapText(order.notes, regularFont, 9, CONTENT_W - 10);
    const notesHeight = 20 + noteLines.length * 13;

    if (y - notesHeight < CONTENT_BOTTOM) {
      page = newPage();
      y = drawHeader(page, boldFont, regularFont, orderNumber);
    }

    y -= 12;
    page.drawLine({
      start: { x: MARGIN, y }, end: { x: RIGHT_X, y },
      thickness: 0.5, color: C.gCCC,
    });
    y -= 15;
    drawNotes(page, boldFont, regularFont, y, order.notes);
  }

  // ── Footers on all pages ─────────────────────────────────────────────────────
  const totalPages = pages.length;
  for (let i = 0; i < pages.length; i++) {
    drawFooter(pages[i], regularFont, i + 1, totalPages);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
