/**
 * WhatsApp service — Meta WhatsApp Cloud API.
 */

/**
 * Send a WhatsApp text message.
 * @param {string} toNumber  - recipient number (e.g. "923001234567")
 * @param {string} message
 */
async function sendWhatsApp(toNumber, message) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: { body: message }
      })
    }
  );
  const data = await response.json();
  if (!response.ok) {
    console.error('WhatsApp API error:', data);
    return false;
  }
  return true;
}

/**
 * Build the vendor-facing order message.
 */
function buildVendorMessage({ branchName, date, items, notes, pdfUrl }) {
  const itemLines = items
    .map((it) => `- ${it.item_name}: ${it.quantity} pcs`)
    .join('\n');

  let msg = `Dollar Point — ${branchName}\nNew Order Request — ${date}\n\nItems:\n${itemLines}`;
  if (notes) msg += `\n\nNote: ${notes}`;
  msg += `\n\nView Full Order PDF: ${pdfUrl}`;
  return msg;
}

/**
 * Build the owner-facing order message (prefixed copy of vendor message).
 */
function buildOwnerMessage({ managerName, vendorName, branchName, date, items, notes, pdfUrl }) {
  const vendorMsg = buildVendorMessage({ branchName, date, items, notes, pdfUrl });
  return `[ORDER SENT] ${managerName} sent order to ${vendorName}\nBranch: ${branchName} — ${date}\n${vendorMsg}`;
}

/**
 * Send order notification to vendor and owner.
 * Does NOT throw — caller handles failure.
 */
exports.sendOrderNotifications = async ({ order, vendor, branch, requester, items, pdfUrl }) => {
  const date = new Date(order.created_at).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const vendorMsg = buildVendorMessage({
    branchName: branch.name,
    date,
    items,
    notes: order.notes,
    pdfUrl,
  });

  const ownerMsg = buildOwnerMessage({
    managerName: requester.name,
    vendorName: vendor.name,
    branchName: branch.name,
    date,
    items,
    notes: order.notes,
    pdfUrl,
  });

  await sendWhatsApp(vendor.whatsapp_number, vendorMsg);

  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
  if (ownerNumber) {
    await sendWhatsApp(ownerNumber, ownerMsg);
  }
};
