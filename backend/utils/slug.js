// Small slug utility — no external deps
function basicSlug(input) {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 200);
}

// Generate a unique slug for `table.column` by appending suffixes when collisions
async function generateUniqueSlug(pool, table, column, base) {
  let slug = basicSlug(base) || `item-${Date.now()}`;
  // check for collision
  let attempt = 0;
  while (true) {
    const [rows] = await pool.query(`SELECT 1 FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [slug]);
    if (!rows.length) return slug;
    attempt += 1;
    // append counter
    const suffix = `-${attempt}`;
    // ensure max length 255
    const maxBase = 255 - suffix.length;
    slug = (basicSlug(base).slice(0, maxBase) + suffix);
    if (attempt > 1000) {
      // fallback to timestamp
      return `${basicSlug(base).slice(0, 180)}-${Date.now()}`;
    }
  }
}

module.exports = { basicSlug, generateUniqueSlug };
