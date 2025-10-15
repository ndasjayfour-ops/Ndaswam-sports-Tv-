// google-drive.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const enabled = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!enabled) {
  module.exports = { uploadJson: async () => { /* noop */ } };
} else {
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive.file'] });
  async function uploadJson(filename, obj) {
    try {
      const client = await auth.getClient();
      const drive = google.drive({ version: 'v3', auth: client });
      const tmp = path.join(__dirname, filename);
      fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
      // check for existing file by name (simple)
      const list = await drive.files.list({ q: `name='${filename}' and trashed=false`, fields: 'files(id,name)' });
      const media = { mimeType: 'application/json', body: fs.createReadStream(tmp) };
      if (list.data.files && list.data.files.length) {
        await drive.files.update({ fileId: list.data.files[0].id, media });
      } else {
        await drive.files.create({ requestBody: { name: filename }, media, fields: 'id' });
      }
      fs.unlinkSync(tmp);
    } catch (e) {
      console.error('Drive upload failed:', e.message || e);
    }
  }
  module.exports = { uploadJson };
}