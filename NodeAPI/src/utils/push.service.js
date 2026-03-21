const fetch = global.fetch || require('node-fetch');

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

async function sendPush(tokens, title, body, data = {}) {
  if (!process.env.FCM_SERVER_KEY) {
    console.log('FCM_SERVER_KEY not set; skipping push delivery');
    return { skipped: true };
  }

  const payload = {
    priority: 'high',
    registration_ids: tokens,
    notification: {
      title,
      body,
      sound: 'default',
      android_channel_id: 'default-notifications'
    },
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

  let json;
  try {
    json = await res.json();
  } catch (err) {
    console.error('FCM parse error', err);
    return { error: 'parse_error' };
  }

  if (!res.ok || json.failure || json.error) {
    console.error('FCM send error', {
      status: res.status,
      statusText: res.statusText,
      response: json
    });
  }

  return json;
}

module.exports = { sendPush };
