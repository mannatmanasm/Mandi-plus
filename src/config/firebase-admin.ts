import * as admin from 'firebase-admin';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./secrets/firebase-admin.json', 'utf8'),
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      'https://mandiplus-tracker-default-rtdb.asia-southeast1.firebasedatabase.app',
  });
}

export { admin };
