// Storage abstraction. Si SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estan
// definidos, sube a Supabase Storage (bucket "uploads"). Sino, escribe al
// filesystem local (UPLOADS_DIR).

const fs = require('fs');
const path = require('path');

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

let supabaseClient = null;
if (useSupabase) {
  const { createClient } = require('@supabase/supabase-js');
  supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`📦 Storage: Supabase (bucket: ${SUPABASE_BUCKET})`);
} else {
  console.log('📦 Storage: filesystem local');
}

function genFilename(originalname) {
  const ext = (path.extname(originalname || '') || '').toLowerCase().replace(/[^.\w]/g, '');
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

// Sube un buffer + metadata. Devuelve { url, filename } donde url es relativa
// (`/uploads/xxx`) en modo local, o absoluta (https://…) en modo Supabase.
async function uploadBuffer(buffer, originalname, mimetype, uploadsDir) {
  const filename = genFilename(originalname);

  if (useSupabase) {
    const { data, error } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(filename, buffer, { contentType: mimetype, upsert: false });
    if (error) throw error;
    const { data: pub } = supabaseClient.storage.from(SUPABASE_BUCKET).getPublicUrl(data.path);
    return { url: pub.publicUrl, filename };
  }

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const fullPath = path.join(uploadsDir, filename);
  fs.writeFileSync(fullPath, buffer);
  return { url: `/uploads/${filename}`, filename };
}

module.exports = { uploadBuffer, useSupabase };
