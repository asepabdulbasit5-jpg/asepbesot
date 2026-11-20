// ============================================================
// Auto-sync Nadia -> worker-reseller-bot.js (+ deploy otomatis)
// Dijalankan GitHub Actions tiap pagi (07:00 WIB) atau manual.
// ------------------------------------------------------------
// Yang dilakukan:
//  1. Ambil daftar server + saldo dari API Nadia.
//  2. Bandingkan dengan SERVERS di worker-reseller-bot.js
//     (logika sama kayak /ceknadia di bot).
//  3. Terapkan perubahan AMAN saja ke file bot:
//       - hapus server yang hilang dari Nadia
//       - ganti nama mengikuti Nadia (spasi dinormalisasi)
//       - update protokol (hanya kalau live kirim daftar non-kosong)
//       - refresh used/limit dari data live
//  4. Kirim ringkasan ke admin lewat Telegram.
//  5. Tulis scripts/nadia-sync-status.json (heartbeat + jejak
//     perubahan; TANPA nominal saldo — repo ini publik).
//  6. Set output `changed` buat workflow (deploy jalan kalau true).
// Yang TIDAK dilakukan otomatis:
//  - tambah server baru (protokolnya bisa tidak diketahui —
//    dilaporkan ke admin, tambahkan manual)
//  - ubah harga (harga modal tidak ada di API Nadia)
// Pengaman (kalau kena, file TIDAK diubah, admin dikabari):
//  - fetch ke Nadia gagal
//  - daftar live < 10 server (kemungkinan respons rusak)
//  - server default (CLOUDFRONT NEOLITE PRO) tidak ada di live
//  - hasil edit gagal validasi (jumlah < 10, default hilang,
//    serverId/kode ganda)
// Secrets yang dibutuhkan (repo GitHub > Settings > Secrets):
//  NADIA_API_KEY, TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID.
// ============================================================
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const API = (process.env.NADIA_API_URL || "https://www.nadiavpn.web.id/api/v1").replace(/\/$/, "");
const KEY = process.env.NADIA_API_KEY || "";
const TG = process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN = process.env.ADMIN_CHAT_ID || "";
const BOT_FILE = "worker-reseller-bot.js";
const STATUS_FILE = "scripts/nadia-sync-status.json";
const DEFAULT_ID = "01a1ca6a-b60e-73b9-a2fa-8684c0b25d62"; // CLOUDFRONT NEOLITE PRO
const SALDO_MINIMAL = 15000;
const MIN_LIVE = 10;

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function wib(d = new Date()) {
  const t = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${t.getUTCDate()} ${BULAN[t.getUTCMonth()]} ${t.getUTCFullYear()}, ${p(t.getUTCHours())}.${p(t.getUTCMinutes())} WIB`;
}
function rupiah(n) {
  return "Rp" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
const normalNama = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// --- parsing respons Nadia (cara sama kayak bot) ---
function cariArray(x, dalam = 0) {
  if (Array.isArray(x)) {
    const mirip = x.filter((i) => i && typeof i === "object" && (i.server_id || i.id) && (i.name || i.nama));
    if (x.length > 0 && mirip.length >= Math.max(1, Math.floor(x.length / 2))) return x;
    return null;
  }
  if (x && typeof x === "object" && dalam < 4) {
    for (const v of Object.values(x)) {
      const r = cariArray(v, dalam + 1);
      if (r) return r;
    }
  }
  return null;
}
function cariSaldo(x, dalam = 0) {
  if (x && typeof x === "object" && dalam < 4) {
    for (const [k, v] of Object.entries(x)) {
      if (/^(balance|saldo|amount|total)$/i.test(k) && typeof v === "number") return v;
      if (typeof v === "string" && /^(balance|saldo|amount|total)$/i.test(k) && /^\d+(\.\d+)?$/.test(v.trim())) return Number(v);
      const r = cariSaldo(v, dalam + 1);
      if (typeof r === "number") return r;
    }
  }
  return null;
}
function parseLive(x) {
  const id = x.server_id || x.id || x.uuid;
  if (!id) return null;
  const nama = x.name || x.nama || x.server_name || x.domain || "?";
  let proto = x.protocols || x.protocol || x.supported_protocols || [];
  if (typeof proto === "string") proto = proto.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (Array.isArray(proto)) proto = proto.map((v) => String(v).toLowerCase());
  else proto = [];
  const ambil = (...keys) => {
    for (const k of keys) if (x[k] !== undefined && x[k] !== null && x[k] !== "") return Number(x[k]);
    return null;
  };
  return {
    serverId: String(id),
    nama: String(nama),
    protocols: proto,
    used: ambil("used", "used_count", "count", "active", "user_count", "users", "active_users", "total_users", "occupied", "terpakai"),
    limit: ambil("limit", "max", "max_users", "max_user", "capacity", "total", "slots", "quota", "limit_user"),
  };
}

// --- baca SERVERS dari file bot ---
function ekstrakServers(teks) {
  const i = teks.indexOf("const SERVERS = [");
  if (i < 0) throw new Error("Blok SERVERS tidak ketemu di file bot");
  const j = teks.indexOf("\n];", i);
  if (j < 0) throw new Error("Penutup SERVERS tidak ketemu di file bot");
  const sumber = teks.slice(teks.indexOf("[", i), j + 2); // sampai "]" penutup (j = posisi "\n];")
  // File ini ditulis Muse sendiri (hanya literal) — aman di-eval.
  return new Function("return (" + sumber + ")")();
}

// --- bandingkan live vs bot (sama kayak /ceknadia) ---
function bandingkan(live, bot) {
  const liveById = new Map(live.map((x) => [String(x.serverId), x]));
  const baru = [], hilang = [], gantiNama = [], gantiProto = [];
  for (const x of live) {
    const b = bot.find((s) => String(s.serverId) === String(x.serverId));
    if (!b) { baru.push(x); continue; }
    const namaBot = normalNama(String(b.nama).replace(" — PENUH", ""));
    if (x.nama && normalNama(x.nama) !== "?" && normalNama(x.nama) !== namaBot) {
      gantiNama.push({ bot: b, live: normalNama(x.nama) });
    }
    const pl = [...(x.protocols || [])].sort().join(",");
    const pb = [...(b.protocols || [])].sort().join(",");
    if (pl && pl !== pb) gantiProto.push({ bot: b, live: [...(x.protocols || [])] });
  }
  for (const s of bot) if (!liveById.has(String(s.serverId))) hilang.push(s);
  return { baru, hilang, gantiNama, gantiProto, adaPerubahan: hilang.length + gantiNama.length + gantiProto.length > 0 };
}

// --- terapkan perubahan ke teks file (per baris, diff minimal) ---
function terapkan(teks, hasil) {
  const lines = teks.split("\n");
  const awal = lines.findIndex((l) => l.startsWith("const SERVERS = ["));
  let akhir = -1;
  for (let i = awal + 1; i < lines.length; i++) { if (lines[i] === "];") { akhir = i; break; } }
  if (awal < 0 || akhir < 0) throw new Error("Blok SERVERS tidak ketemu");
  const hilangIds = new Set(hasil.hilang.map((s) => String(s.serverId)));
  const namaBaru = new Map(hasil.gantiNama.map((g) => [String(g.bot.serverId), g.live]));
  const protoBaru = new Map(hasil.gantiProto.map((g) => [String(g.bot.serverId), g.live]));
  const liveById = new Map(hasil._live.map((x) => [String(x.serverId), x]));
  const keluar = [];
  for (let i = awal + 1; i < akhir; i++) {
    const baris = lines[i];
    const mId = baris.match(/serverId:\s*"([^"]+)"/);
    if (!mId) { keluar.push(baris); continue; }
    const id = mId[1];
    if (hilangIds.has(id)) continue; // hapus baris server ini
    let b = baris;
    if (namaBaru.has(id)) b = b.replace(/nama:\s*"[^"]*"/, `nama: "${namaBaru.get(id)}"`);
    if (protoBaru.has(id)) b = b.replace(/protocols:\s*\[[^\]]*\]/, `protocols: ${JSON.stringify(protoBaru.get(id))}`);
    const lv = liveById.get(id);
    if (lv && Number.isFinite(Number(lv.used)) && Number.isFinite(Number(lv.limit))) {
      b = b.replace(/used:\s*\d+,\s*limit:\s*\d+/, `used: ${Number(lv.used)}, limit: ${Number(lv.limit)}`);
    }
    const mUsed = b.match(/used:\s*(\d+)/);
    const mLimit = b.match(/limit:\s*(\d+)/);
    const penuh = mUsed && mLimit && Number(mUsed[1]) >= Number(mLimit[1]);
    b = b.replace(/penuh:\s*true,\s*/, ""); // buang flag lama (koma pemisah dipertahankan)
    if (penuh) b = b.replace(/protocols:\s*\[[^\]]*\],/, (m) => m + " penuh: true,");
    keluar.push(b);
  }
  let teksBaru = [...lines.slice(0, awal + 1), ...keluar, ...lines.slice(akhir)].join("\n");
  const jml = keluar.filter((l) => /serverId:/.test(l)).length;
  const jmlSelow = keluar.filter((l) => /nama:\s*"SSH SELOW/.test(l)).length;
  teksBaru = teksBaru.replace(/SEMUA \d+ server Nadia/, `SEMUA ${jml} server Nadia`);
  teksBaru = teksBaru.replace(/\/\/ \d+ server SSH SELOW/, `// ${jmlSelow} server SSH SELOW`);
  // Catatan sinkron: hapus catatan lama 20 Nov (2 baris), pasang yang baru.
  teksBaru = teksBaru.replace(/\/\/ 20 Nov 2026 \(\/ceknadia\):[^\n]*\n\/\/ Nadia\);[^\n]*\n/, "");
  const bagian = [];
  if (hasil.hilang.length) bagian.push(`hapus ${hasil.hilang.length} server`);
  if (hasil.gantiNama.length) bagian.push(`ganti ${hasil.gantiNama.length} nama`);
  if (hasil.gantiProto.length) bagian.push(`ganti ${hasil.gantiProto.length} protokol`);
  const catatan = `// Sinkron otomatis: ${wib()} — ${bagian.join(", ") || "cek rutin"}.`;
  if (/\/\/ Sinkron otomatis:/.test(teksBaru)) {
    teksBaru = teksBaru.replace(/\/\/ Sinkron otomatis:[^\n]*/, catatan);
  } else {
    teksBaru = teksBaru.replace(/(SEMUA \d+ server Nadia[^\n]*\n)/, `$1${catatan}\n`);
  }
  return teksBaru;
}

function validasi(teksBaru) {
  let arr;
  try { arr = ekstrakServers(teksBaru); } catch (e) { return "SERVERS hasil edit tidak bisa dibaca: " + e.message; }
  if (arr.length < MIN_LIVE) return `Jumlah server hasil edit cuma ${arr.length}`;
  if (!arr.some((s) => String(s.serverId) === DEFAULT_ID)) return "Server default (NEOLITE PRO) hilang dari daftar";
  if (new Set(arr.map((s) => String(s.serverId))).size !== arr.length) return "Ada serverId ganda";
  if (new Set(arr.map((s) => s.kode)).size !== arr.length) return "Ada kode server ganda";
  return null;
}

// --- Telegram & status ---
async function kirimTelegram(teks) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: ADMIN, text: teks }),
    });
    if (!r.ok) console.error("Gagal kirim Telegram:", r.status, (await r.text().catch(() => "")).slice(0, 200));
  } catch (e) { console.error("Gagal kirim Telegram:", e.message); }
}
function setOutput(k, v) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}
function tulisStatus(obj) {
  writeFileSync(STATUS_FILE, JSON.stringify(obj, null, 2) + "\n");
}

// --- alur utama ---
export async function main() {
  const SELALU_KABARI = process.env.ALWAYS_NOTIFY === "true";
  if (!KEY || !TG || !ADMIN) {
    console.error("Secrets belum lengkap (NADIA_API_KEY / TELEGRAM_BOT_TOKEN / ADMIN_CHAT_ID).");
    process.exit(1);
  }
  const kepala = `🔍 Auto-cek Nadia — ${wib()}`;
  const gagal = async (alasan) => {
    const teks = `${kepala}\n\n❌ Auto-sync dibatalkan: ${alasan}\nFile bot TIDAK diubah. Cek manual /ceknadia di bot ya.`;
    await kirimTelegram(teks);
    tulisStatus({ checkedAt: new Date().toISOString(), live: null, bot: null, changed: false, error: alasan });
    setOutput("changed", "false");
  };
  let liveRaw, saldoRaw;
  try {
    const r = await fetch(`${API}/servers`, { headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    liveRaw = await r.json();
  } catch (e) { await gagal(`tidak bisa ambil daftar server (${e.message})`); return; }
  try {
    const r = await fetch(`${API}/user/balance`, { headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" } });
    if (r.ok) saldoRaw = await r.json();
  } catch { /* saldo gagal dibaca — bukan alasan batal, cukup tidak dilaporkan */ }
  const liveArr = cariArray(liveRaw);
  if (!liveArr) { await gagal("respons daftar server tidak dikenali"); return; }
  const live = liveArr.map(parseLive).filter(Boolean);
  if (live.length < MIN_LIVE) { await gagal(`daftar live cuma ${live.length} server (diduga respons rusak)`); return; }
  if (!live.some((x) => String(x.serverId) === DEFAULT_ID)) { await gagal("server default (NEOLITE PRO) tidak ada di daftar live"); return; }
  let teksBot;
  try { teksBot = readFileSync(BOT_FILE, "utf8"); } catch (e) { await gagal(`tidak bisa baca ${BOT_FILE} (${e.message})`); return; }
  let bot;
  try { bot = ekstrakServers(teksBot); } catch (e) { await gagal(`SERVERS di file bot tidak bisa dibaca (${e.message})`); return; }
  const hasil = bandingkan(live, bot);
  hasil._live = live;
  const saldo = cariSaldo(saldoRaw);
  const saldoBaris = typeof saldo === "number"
    ? `💰 Saldo: ${rupiah(saldo)}${saldo < SALDO_MINIMAL ? " ⚠️ (di bawah Rp15.000 — trial belum bisa)" : ""}`
    : "💰 Saldo: (gagal dibaca)";
  const status = {
    checkedAt: new Date().toISOString(),
    live: live.length,
    bot: bot.length,
    changed: hasil.adaPerubahan,
    dihapus: hasil.hilang.map((s) => s.nama),
    gantiNama: hasil.gantiNama.map((g) => `${g.bot.nama} → ${g.live}`),
    gantiProtokol: hasil.gantiProto.map((g) => g.bot.nama),
    serverBaru: hasil.baru.map((x) => x.nama),
    saldoRendah: typeof saldo === "number" ? saldo < SALDO_MINIMAL : null,
    error: null,
  };
  if (!hasil.adaPerubahan) {
    tulisStatus(status);
    setOutput("changed", "false");
    if (SELALU_KABARI) {
      await kirimTelegram(`${kepala}\nLive: ${live.length} server • Bot: ${bot.length} server\n${saldoBaris}\n\n✅ Semua sama — tidak ada perubahan.`);
    } else {
      console.log("Tidak ada perubahan — diam (jadwal harian).");
    }
    return;
  }
  let teksBaru;
  try {
    teksBaru = terapkan(teksBot, hasil);
    const err = validasi(teksBaru);
    if (err) throw new Error(err);
  } catch (e) {
    await gagal(`hasil edit gagal validasi (${e.message})`);
    return;
  }
  writeFileSync(BOT_FILE, teksBaru);
  tulisStatus(status);
  setOutput("changed", "true");
  const baris = [`${kepala}`, `Live: ${live.length} server • Bot: ${bot.length} server`, saldoBaris, ""];
  if (hasil.hilang.length) {
    baris.push("🗑️ Dihapus dari bot (hilang dari Nadia):");
    for (const s of hasil.hilang) baris.push(`• ${s.nama}`);
  }
  if (hasil.gantiNama.length) {
    baris.push("✏️ Nama diganti:");
    for (const g of hasil.gantiNama) baris.push(`• ${g.bot.nama} → ${g.live}`);
  }
  if (hasil.gantiProto.length) {
    baris.push("🔀 Protokol diganti:");
    for (const g of hasil.gantiProto) baris.push(`• ${g.bot.nama}: [${g.live.join(", ")}]`);
  }
  if (hasil.baru.length) {
    baris.push("", "🆕 BARU di Nadia (BELUM ditambah otomatis — protokol belum pasti):");
    for (const x of hasil.baru) baris.push(`• ${x.nama} — ID: ${x.serverId}`);
    baris.push("Kirim ke Muse biar ditambahkan manual.");
  }
  baris.push("", "File bot sudah diupdate — deploy otomatis jalan, bot langsung pakai daftar baru.");
  await kirimTelegram(baris.join("\n"));
  console.log("Perubahan diterapkan ke file bot.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error("Auto-sync gagal:", e); process.exit(1); });
}
