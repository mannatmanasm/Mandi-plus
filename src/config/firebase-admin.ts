import * as admin from 'firebase-admin';
import * as fs from 'fs';

function loadServiceAccount() {
  //  Render / production (ENV)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    return JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString(
        'utf8',
      ),
    );
  }

  //  Local development (file)
  if (fs.existsSync('./secrets/firebase-admin.json')) {
    return JSON.parse(fs.readFileSync('./secrets/firebase-admin.json', 'utf8'));
  }

  throw new Error(
    'Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_B64 or add secrets/firebase-admin.json',
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      'https://mandiplus-tracker-default-rtdb.asia-southeast1.firebasedatabase.app',
  });
}

export { admin };
