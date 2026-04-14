const prisma = require('../lib/prisma');
const AppError = require('../lib/errors');

const WA_KEYS = ['whatsapp_phone_number_id', 'whatsapp_access_token', 'owner_whatsapp_number'];

async function loadSettings(ownerId) {
  let map = {};
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { ownerId, key: { in: WA_KEYS } },
    });
    map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  } catch {
    // Table not yet created — fall back to env vars
  }
  return {
    phoneNumberId:       map.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID  || '',
    accessToken:         map.whatsapp_access_token     || process.env.WHATSAPP_ACCESS_TOKEN      || '',
    ownerWhatsappNumber: map.owner_whatsapp_number     || process.env.OWNER_WHATSAPP_NUMBER      || '',
  };
}

exports.getWhatsapp = async ({ requestingUser }) => {
  const s = await loadSettings(requestingUser.ownerId);
  return {
    phoneNumberId:       s.phoneNumberId,
    accessToken:         s.accessToken ? '***' + s.accessToken.slice(-4) : '',
    ownerWhatsappNumber: s.ownerWhatsappNumber,
  };
};

exports.updateWhatsapp = async ({ body, requestingUser }) => {
  const { phoneNumberId, accessToken, ownerWhatsappNumber } = body;
  const ownerId = requestingUser.ownerId;

  const updates = [
    { key: 'whatsapp_phone_number_id', value: phoneNumberId },
    { key: 'whatsapp_access_token',    value: accessToken },
    { key: 'owner_whatsapp_number',    value: ownerWhatsappNumber },
  ].filter(u => u.value !== undefined && u.value !== null && u.value !== '');

  try {
    await Promise.all(updates.map(u =>
      prisma.systemSetting.upsert({
        where:  { key_ownerId: { key: u.key, ownerId } },
        update: { value: u.value },
        create: { key: u.key, value: u.value, ownerId },
      })
    ));
  } catch {
    throw new AppError('Database migration not yet applied. Run: npx prisma migrate dev --name add_system_settings', 503);
  }

  return { message: 'Settings saved.' };
};

exports.testWhatsapp = async ({ requestingUser }) => {
  const s = await loadSettings(requestingUser.ownerId);

  if (!s.phoneNumberId || !s.accessToken || !s.ownerWhatsappNumber) {
    throw new AppError('WhatsApp credentials not fully configured.', 400);
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${s.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${s.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:   s.ownerWhatsappNumber,
        type: 'text',
        text: { body: 'Dollar Point — Test message. Your WhatsApp integration is working correctly.' },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'Meta API request failed';
    throw new AppError(`Connection failed: ${msg}`, 502);
  }

  return { message: 'Test message sent successfully.' };
};
