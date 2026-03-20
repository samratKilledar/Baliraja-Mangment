const fetch = global.fetch || require('node-fetch');

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

async function sendPush(tokens, title, body, data = {}) {
  if (!process.env.FCM_SERVER_KEY) {
    console.log('FCM_SERVER_KEY not set; skipping push delivery');
    return { skipped: true };
  }

  const payload = {
    registration_ids: tokens,
    notification: { title, body },
    data
  };

  const res = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${process.env.FCM_SERVER_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  return json;
}

module.exports = { sendPush };
