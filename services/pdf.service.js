const { PDFDocument, StandardFonts, rgb, PageSizes } = require('pdf-lib');

const LINE_COLOR = rgb(0.7, 0.7, 0.7);
const BLACK = rgb(0, 0, 0);
const DARK_GRAY = rgb(0.3, 0.3, 0.3);

const MARGIN = 50;
const PAGE_WIDTH = PageSizes.A4[0];
const PAGE_HEIGHT = PageSizes.A4[1];
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Fetch a remote image and return its buffer + contentType.
 * Returns null on failure.
 */
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

/**
 * Embed an image into the PDF document.
 * Supports JPEG and PNG. Returns null on failure or unsupported type.
 */
async function embedImage(pdfDoc, url) {
  const result = await fetchImageBuffer(url);
  if (!result) return null;
  const { buffer, contentType } = result;
  try {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      return await pdfDoc.embedJpg(buffer);
    }
    if (contentType.includes('png')) {
      return await pdfDoc.embedPng(buffer);
    }
    // WebP and others: attempt PNG embed (may fail gracefully)
    return await pdfDoc.embedPng(buffer);
  } catch {
    return null;
  }
}

/**
 * Draw a horizontal divider line.
 */
function drawDivider(page, y) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: LINE_COLOR,
  });
  return y - 12;
}

/**
 * Generate order PDF and return as Buffer.
 *
 * @param {object} params
 * @param {object} params.order        - VendorOrder record
 * @param {object} params.vendor       - Vendor record
 * @param {object} params.branch       - Branch record
 * @param {object} params.requester    - User record (the manager)
 * @param {Array}  params.items        - VendorOrderItem records (with image_url)
 * @returns {Promise<Buffer>}
 */
exports.generateOrderPDF = async ({ order, vendor, branch, requester, items }) => {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ORD-YYYY-XXXX format using year + last 4 chars of order id
  const year = new Date(order.created_at).getFullYear();
  const suffix = order.id.replace(/-/g, '').slice(-4).toUpperCase();
  const orderNumber = `ORD-${year}-${suffix}`;

  const dateStr = new Date(order.created_at).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Pre-fetch all item images
  const embeddedImages = await Promise.all(
    items.map((item) => (item.image_url ? embedImage(pdfDoc, item.image_url) : Promise.resolve(null)))
  );

  let page = pdfDoc.addPage(PageSizes.A4);
  let y = PAGE_HEIGHT - MARGIN;

  const addPageIfNeeded = (neededSpace) => {
    if (y - neededSpace < MARGIN + 40) {
      page = pdfDoc.addPage(PageSizes.A4);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Header ──────────────────────────────────────────────────────────────
  page.drawText('DOLLAR POINT', {
    x: MARGIN,
    y,
    size: 26,
    font: boldFont,
    color: BLACK,
  });
  y -= 28;

  page.drawText('Vendor Order Request', {
    x: MARGIN,
    y,
    size: 13,
    font: regularFont,
    color: DARK_GRAY,
  });
  y -= 18;

  y = drawDivider(page, y);

  // ── Order Info ──────────────────────────────────────────────────────────
  const infoLines = [
    ['Branch', branch.name],
    ['Vendor', vendor.name],
    ['Vendor WhatsApp', vendor.whatsapp_number],
    ['Date', dateStr],
    ['Order Number', orderNumber],
  ];

  for (const [label, value] of infoLines) {
    addPageIfNeeded(18);
    page.drawText(`${label}:`, { x: MARGIN, y, size: 10, font: boldFont, color: BLACK });
    page.drawText(String(value), { x: MARGIN + 130, y, size: 10, font: regularFont, color: BLACK });
    y -= 16;
  }
  y -= 4;

  y = drawDivider(page, y);

  // ── Items ───────────────────────────────────────────────────────────────
  addPageIfNeeded(20);
  page.drawText('ITEMS REQUESTED', {
    x: MARGIN,
    y,
    size: 12,
    font: boldFont,
    color: BLACK,
  });
  y -= 20;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const img = embeddedImages[i];

    addPageIfNeeded(18);
    page.drawText(`${i + 1}. ${item.item_name}`, {
      x: MARGIN,
      y,
      size: 11,
      font: boldFont,
      color: BLACK,
    });
    y -= 16;

    addPageIfNeeded(16);
    page.drawText(`Quantity: ${item.quantity} pcs`, {
      x: MARGIN + 12,
      y,
      size: 10,
      font: regularFont,
      color: DARK_GRAY,
    });
    y -= 14;

    if (img) {
      const maxImgWidth = Math.min(CONTENT_WIDTH * 0.5, 200);
      const scale = maxImgWidth / img.width;
      const imgWidth = maxImgWidth;
      const imgHeight = img.height * scale;

      addPageIfNeeded(imgHeight + 10);
      page.drawImage(img, {
        x: MARGIN + 12,
        y: y - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
      y -= imgHeight + 10;
    }

    y -= 12; // space between items
  }

  y = drawDivider(page, y);

  // ── Notes ───────────────────────────────────────────────────────────────
  if (order.notes) {
    addPageIfNeeded(36);
    page.drawText('Notes:', { x: MARGIN, y, size: 10, font: boldFont, color: BLACK });
    y -= 16;

    // Wrap notes text naively at ~80 chars
    const words = order.notes.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 80) {
        addPageIfNeeded(14);
        page.drawText(line.trim(), { x: MARGIN + 12, y, size: 10, font: regularFont, color: DARK_GRAY });
        y -= 14;
        line = '';
      }
      line += word + ' ';
    }
    if (line.trim()) {
      addPageIfNeeded(14);
      page.drawText(line.trim(), { x: MARGIN + 12, y, size: 10, font: regularFont, color: DARK_GRAY });
      y -= 14;
    }
    y -= 6;

    y = drawDivider(page, y);
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  addPageIfNeeded(32);
  page.drawText(`Sent by: ${requester.name}`, {
    x: MARGIN,
    y,
    size: 10,
    font: regularFont,
    color: DARK_GRAY,
  });
  y -= 14;

  page.drawText(`Dollar Point — ${branch.name}`, {
    x: MARGIN,
    y,
    size: 10,
    font: boldFont,
    color: BLACK,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
