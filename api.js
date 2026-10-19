// api.js — fungsi fetch ke Worker backend HUB AI SECURITY

const API_BASE = "https://api.ptstore.my.id"; // sesuaikan dengan domain worker kamu

/**
 * Minta token verifikasi untuk sebuah domain.
 * @param {string} domain
 * @returns {Promise<{success: boolean, token?: string, message?: string}>}
 */
async function requestToken(domain) {
  const res = await fetch(`${API_BASE}/v1/security/request-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.message) {
    data.message = `Permintaan gagal (status ${res.status}).`;
  }
  return data;
}

/**
 * Cek status verifikasi kepemilikan domain.
 * @param {string} domain
 * @returns {Promise<{success: boolean, verified: boolean, message?: string}>}
 */
async function checkVerification(domain) {
  const res = await fetch(
    `${API_BASE}/v1/security/check-verification?domain=${encodeURIComponent(domain)}`
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.message) {
    data.message = `Permintaan gagal (status ${res.status}).`;
  }
  return data;
}

module.exports = { requestToken, checkVerification, API_BASE };
