// ============================================================
//  Bot Telegram Generator Config Dark Tunnel (SANDEKALA)
//  Cloudflare Worker — modules format (`export default`).
//
//  Tugas bot: pelanggan kirim akun SSH atau Xray (VLESS / VMess /
//  Trojan / Shadowsocks) dalam bentuk APA PUN — bahkan acak /
//  berantakan — bot parsing otomatis, ambil field yang diperlukan,
//  lalu buatkan file config Dark Tunnel (.dark.backup) + link
//  darktunnel:// per config. TANPA jualan, TANPA pembayaran,
//  TANPA Nadia, TANPA KV.
//
//  Format config (dipulihkan dari APK Dark Tunnel 1.0.26, lihat
//  hidden_files/analisis-format-config.md):
//   - Config = satu baris `darktunnel://<base64url(JSON TunnelConfig)>`
//   - File `.dark.backup` = satu link darktunnel:// per baris.
//   - JSON wajib cuma `type` + `name`; enum huruf besar persis.
//   - Aplikasi TIDAK bisa impor link SSH dan tidak ada `ss://` —
//     bot WAJIB generate `darktunnel://` untuk SSH.
//   - Impor link standar selalu hasilkan inject DISABLED; inject
//     hanya diaktifkan kalau akun butuh bug/SNI (mode DIRECT_SNI,
//     payload template standar aplikasi).
//
//  Secrets Worker (di dashboard Cloudflare):
//   - BOT_TOKEN (wajib): token bot Telegram dari BotFather.
//  Variabel env opsional:
//   - ADMIN_CHAT_ID: chat id admin, untuk notifikasi error internal.
//   - BOT_USERNAME: username bot tanpa @ (mis. darktunnel_sandekala_bot),
//     dipakai untuk tombol "Buka di Chat Pribadi" di grup.
//
//  Deploy: pasang secret di atas, lalu deploy file ini sebagai Worker
//  dan set webhook Telegram ke URL Worker-nya:
//   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<URL_WORKER>
// ============================================================

const PAYLOAD_TEMPLATE = "[method] [host_port] [protocol][crlf]Host: [host][crlf]Service: {SERVICE}[crlf]Mode: Bypass[crlf][crlf]";

const PESAN_START =
  "👋 <b>Generator Config Dark Tunnel</b>\n\n" +
  "Kirim akun kamu apa adanya — bot akan buatkan config Dark Tunnel-nya.\n\n" +
  "Yang bisa diproses:\n" +
  "• Link <b>VLESS / VMess / Trojan / Shadowsocks</b> (boleh banyak sekaligus)\n" +
  "• Akun <b>SSH</b> (host, port, username, password) — tulis bebas, boleh acak\n" +
  "• Kalau akun pakai <b>bug / SNI</b>, tulis juga bug-nya (mis. <code>SNI: bug.example.com</code>) supaya inject aktif\n\n" +
  "Contoh SSH:\n" +
  "<pre>Host: sg1.contoh.com\nPort: 22\nUsername: userku\nPassword: passku</pre>\n\n" +
  "Bot akan balas dengan link <code>darktunnel://</code> + file <code>.dark.backup</code>.\n" +
  "Cara impor: di aplikasi Dark Tunnel, pilih <b>Import / Restore</b> lalu pilih file-nya — atau tempel link-nya.";

const PESAN_GRUP =
  "👋 <b>Generator Config Dark Tunnel</b>\n\n" +
  "Kirim akun SSH / VLESS / VMess / Trojan / Shadowsocks kamu, bot buatkan config Dark Tunnel-nya.\n\n" +
  "⚠️ Jangan kirim akun di grup — akun kamu bisa dilihat semua anggota. Order lewat chat pribadi bot ini ya.";

const CARA_IMPOR =
  "📥 <b>Cara impor ke Dark Tunnel:</b>\n" +
  "1. Unduh file <code>.dark.backup</code> di atas.\n" +
  "2. Di aplikasi Dark Tunnel, pilih <b>Import / Restore</b> lalu pilih file itu.\n" +
  "   — atau tempel link <code>darktunnel://</code> di atas lewat Import dari clipboard.\n" +
  "3. Pilih config-nya, tekan <b>Connect</b>.";

// ================= UTIL BASE64 (jalan di Worker & Node) =================

function b64urlEncodeText(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecodeText(s) {
  const norm = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// Decode base64 standar / url-safe yang toleran (padding boleh hilang).
function b64DecodeToleran(s) {
  let t = String(s).trim().replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Nama file backup: darktunnel-YYYYMMDD-HHmmss.dark.backup (WIB).
function namaFileBackup(nowMs) {
  const d = new Date((nowMs ?? Date.now()) + 7 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return "darktunnel-" + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) +
    "-" + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + ".dark.backup";
}

// ================= GENERATOR TUNNELCONFIG =================

const TUNNEL_TYPES = ["SSH", "SSH_DNSTT", "OPENVPN", "VMESS", "VLESS", "TROJAN", "SHADOWSOCKS", "V2RAY_CUSTOM_CONFIG"];

function injectConfigAktif(bug, service) {
  return {
    enabled: true,
    mode: "DIRECT_SNI",
    serverNameIndication: bug,
    payload: PAYLOAD_TEMPLATE.replace("{SERVICE}", service),
  };
}

// Bangun TunnelConfig V2Ray (VMess/VLess/Trojan/Shadowsocks).
// `v2` = {host, port, uuid, transportNetwork, tls, serverNameIndication,
//          wsPath, wsHeaderHost, grpcServiceName}; `bug` = SNI/bug atau null.
function bangunV2ray(type, name, v2, bug) {
  const key = { VMESS: "vmessTunnelConfig", VLESS: "vlessTunnelConfig", TROJAN: "trojanTunnelConfig", SHADOWSOCKS: "shadowsocksTunnelConfig" }[type];
  const cfg = { host: v2.host, port: v2.port, uuid: v2.uuid || "" };
  if (v2.transportNetwork) cfg.transportNetwork = v2.transportNetwork;
  if (v2.tls !== undefined) cfg.tls = v2.tls;
  if (v2.serverNameIndication) cfg.serverNameIndication = v2.serverNameIndication;
  if (v2.wsPath) cfg.wsPath = v2.wsPath;
  if (v2.wsHeaderHost) cfg.wsHeaderHost = v2.wsHeaderHost;
  if (v2.grpcServiceName) cfg.grpcServiceName = v2.grpcServiceName;
  const sub = { v2rayConfig: cfg };
  if (bug) sub.injectConfig = injectConfigAktif(bug, type);
  return { type, name, [key]: sub };
}

function bangunSsh(name, ssh, bug) {
  const sub = { sshConfig: { host: ssh.host, port: ssh.port, username: ssh.username, password: ssh.password } };
  if (bug) sub.injectConfig = injectConfigAktif(bug, "SSH");
  return { type: "SSH", name, sshTunnelConfig: sub };
}

export function toDarktunnelLink(cfg) {
  const json = JSON.stringify(cfg);
  return "darktunnel://" + b64urlEncodeText(json);
}

export function fromDarktunnelLink(link) {
  if (!String(link).startsWith("darktunnel://")) return null;
  try {
    const cfg = JSON.parse(b64urlDecodeText(String(link).slice("darktunnel://".length)));
    if (!cfg || !TUNNEL_TYPES.includes(cfg.type) || !cfg.name) return null;
    return cfg;
  } catch { return null; }
}

// ================= PARSER LINK XRAY =================

function bersihLink(m) {
  // Buang tanda baca akhir kalimat yang sering menempel di chat.
  return String(m).replace(/[.,;:!?]+$/, "").replace(/\)+$/, (x) => x);
}

function namaDariFragment(frag, fallback) {
  try {
    const d = decodeURIComponent(frag || "");
    if (d.trim()) return d.trim();
  } catch { if (frag && frag.trim()) return frag.trim(); }
  return fallback;
}

function petakanTransport(typeParam, def = "Websocket") {
  const t = String(typeParam || "").toLowerCase();
  if (t === "tcp") return "TCP";
  if (t === "grpc") return "gRPC";
  if (t === "ws" || t === "websocket") return "Websocket";
  return def;
}

// vless://uuid@host:port?security=tls&sni=..&type=ws&path=..&host=..#nama
// trojan://password@host:port?....#nama
export function parseVlessTrojanLink(raw, type) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname;
  const port = u.port ? Number(u.port) : (type === "TROJAN" ? 443 : 443);
  const uuid = decodeURIComponent(u.username || "");
  if (!host || !uuid || !port) return null;
  const q = u.searchParams;
  const sec = (q.get("security") || "").toLowerCase();
  const tls = sec ? (sec === "tls" || sec === "xtls") : (port === 443);
  const v2 = {
    host, port, uuid,
    transportNetwork: petakanTransport(q.get("type"), "Websocket"),
    tls,
    serverNameIndication: q.get("sni") || "",
    wsPath: q.get("path") || "",
    wsHeaderHost: q.get("host") || "",
    grpcServiceName: q.get("serviceName") || "",
  };
  return bangunV2ray(type, namaDariFragment(u.hash ? u.hash.slice(1) : "", host), v2, null);
}

// vmess://base64(JSON {v,ps,add,port,id,aid,net,type,host,path,tls,sni,scy})
export function parseVmessLink(raw) {
  let j;
  try { j = JSON.parse(b64DecodeToleran(raw.slice("vmess://".length))); } catch { return null; }
  if (!j || !j.add || !j.id) return null;
  const port = Number(j.port) || 443;
  const tls = String(j.tls || "").toLowerCase();
  const v2 = {
    host: String(j.add), port, uuid: String(j.id),
    transportNetwork: petakanTransport(j.net, "Websocket"),
    tls: tls ? (tls === "tls" || tls === "xtls") : (port === 443),
    serverNameIndication: j.sni ? String(j.sni) : "",
    wsPath: j.path ? String(j.path) : "",
    wsHeaderHost: j.host ? String(j.host) : "",
    grpcServiceName: "",
  };
  return bangunV2ray("VMESS", (j.ps && String(j.ps).trim()) || v2.host, v2, null);
}

// ss:// — tiga bentuk:
//   ss://base64(method:password@host:port)#nama
//   ss://base64(method:password)@host:port#nama
//   ss://method:password@host:port#nama   (plaintext)
export function parseSsLink(raw) {
  const body = raw.slice("ss://".length);
  const hashIdx = body.indexOf("#");
  const frag = hashIdx >= 0 ? body.slice(hashIdx + 1) : "";
  const main = hashIdx >= 0 ? body.slice(0, hashIdx) : body;
  let method = "", password = "", host = "", port = 0;
  const atIdx = main.lastIndexOf("@");
  let credPart = main, hostPart = "";
  if (atIdx >= 0) { credPart = main.slice(0, atIdx); hostPart = main.slice(atIdx + 1); }
  // hostPart bisa "host:port" polos, atau "host:port/?plugin=..."
  if (hostPart) {
    const hp = hostPart.split(/[/?]/)[0];
    const m = hp.match(/^(.+):(\d{1,5})$/);
    if (!m) return null;
    host = m[1]; port = Number(m[2]);
  }
  // credPart: plaintext "method:password" ATAU base64("method:password@host:port" / "method:password")
  const tryCred = (s) => {
    const i = s.indexOf(":");
    if (i <= 0) return null;
    return { method: s.slice(0, i), password: s.slice(i + 1) };
  };
  let cred = null;
  if (credPart.includes(":")) {
    cred = tryCred(decodeURIComponent(credPart));
  } else {
    try {
      const dec = b64DecodeToleran(credPart);
      if (dec.includes("@")) {
        // base64(method:password@host:port) — host ikut di dalam
        const inner = dec.split("@");
        cred = tryCred(inner[0]);
        if (!hostPart && inner[1]) {
          const m = inner[1].split(/[/?]/)[0].match(/^(.+):(\d{1,5})$/);
          if (m) { host = m[1]; port = Number(m[2]); }
        }
      } else {
        cred = tryCred(dec);
      }
    } catch { return null; }
  }
  if (!cred || !cred.password || !host || !port) return null;
  method = cred.method;
  const v2 = { host, port, uuid: cred.password, transportNetwork: "TCP", tls: false };
  // method/cipher tidak ada di model ShadowsocksConfig aplikasi
  // (kemungkinan hardcoded chacha20-poly1305) — disimpan di nama bila perlu.
  const cfg = bangunV2ray("SHADOWSOCKS", namaDariFragment(frag, host), v2, null);
  if (method) cfg._ssMethod = method; // penanda internal, dibuang sebelum encode
  return cfg;
}

// ================= DETEKSI BUG / SNI =================

const LABEL_BUG = /(?:sni|bug)(?:\s*(?:host|domain))?\s*[:=]\s*([A-Za-z0-9][A-Za-z0-9.\-]*)/gi;
const LABEL_BUG_ALT = /(?:host\s*sni|bug\s*host|domain\s*cloudfront|cloudfront(?:\s*domain)?)\s*[:=]\s*([A-Za-z0-9][A-Za-z0-9.\-]*)/gi;
const RE_CLOUDFRONT = /[A-Za-z0-9][A-Za-z0-9\-]*\.cloudfront\.net/gi;

// Cari bug/SNI di teks (label eksplisit, atau domain cloudfront.net).
// `hostsDikenal` = host akun yang sudah ketemu — domain yang sama
// dengan host akun BUKAN bug. Semua kemunculan label dicek satu per
// satu (bukan cuma yang pertama), supaya `sni=` di query sebuah link
// tidak menutupi label bug yang asli.
export function deteksiBug(teks, hostsDikenal) {
  const dikenal = new Set((hostsDikenal || []).map((h) => String(h).toLowerCase()));
  const ambil = (re) => {
    for (const m of String(teks).matchAll(re)) {
      const bug = (m[1] || "").replace(/[.,;:!?]+$/, "");
      if (bug.includes(".") && !dikenal.has(bug.toLowerCase())) return bug;
    }
    return null;
  };
  return ambil(LABEL_BUG) || ambil(LABEL_BUG_ALT) || (() => {
    const semua = String(teks).match(RE_CLOUDFRONT) || [];
    for (const d of semua) if (!dikenal.has(d.toLowerCase())) return d;
    return null;
  })();
}

// ================= PARSER AKUN SSH DARI TEKS ACAK =================

const LABEL_HOST = /(?:hostname|host|server|ip|alamat|domain)(?:nya)?\s*(?::|=|di)?\s*([A-Za-z0-9][A-Za-z0-9.\-]*\.[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})/i;
const LABEL_PORT = /(?:port)(?:nya)?\s*(?::|=)?\s*(\d{1,5})/i;
const LABEL_USER = /(?:username|user\s*name|nama\s*pengguna|user)(?:\s*(?:nya|saya))?\s*[:=]\s*([A-Za-z0-9._\-@]+)/i;
const LABEL_PASS = /(?:password|pass(?:word)?|kata\s*sandi)(?:nya)?\s*[:=]\s*([^\s]+)/i;

// host:port@user:pass  — mis. sg1.contoh.com:22@userku:passku
const RE_KOMPAK_1 = /([A-Za-z0-9][A-Za-z0-9.\-]*\.[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})@([A-Za-z0-9._\-]+):([^\s@]+)/;
// user:pass@host:port  — mis. userku:passku@sg1.contoh.com:22
const RE_KOMPAK_2 = /([A-Za-z0-9._\-]+):([^\s@:\/]+)@([A-Za-z0-9][A-Za-z0-9.\-]*\.[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})/;
// ssh://user:pass@host:port
const RE_SSH_URI = /ssh:\/\/([A-Za-z0-9._\-]+):([^\s@:\/]+)@([A-Za-z0-9][A-Za-z0-9.\-]*)(?::(\d{1,5}))?/i;

function bersihNilai(v) {
  return String(v || "").replace(/^[`"'“”]+|[`"'“”.,;:!?]+$/g, "").trim();
}

function validHost(h) {
  if (!h) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(h)) return true;
  return /^[A-Za-z0-9][A-Za-z0-9.\-]*\.[A-Za-z]{2,}$/.test(h) && !h.toLowerCase().endsWith(".dark.backup");
}

// Cari akun SSH di teks. Return {akun|null, kurang:[...], adaSsh:boolean}.
// `akun` = {host, port, username, password}. Username/password TIDAK
// pernah ditebak — kalau tidak ketemu, akun = null dan `kurang` berisi
// field yang hilang.
export function parseSshTeks(teks) {
  const akunList = [];
  let sisa = String(teks || "");

  // 1) Format kompak — boleh banyak dalam satu pesan.
  const polaKompak = [
    { re: RE_KOMPAK_1, map: (m) => ({ host: m[1], port: Number(m[2]), username: m[3], password: bersihNilai(m[4]) }) },
    { re: RE_KOMPAK_2, map: (m) => ({ host: m[3], port: Number(m[4]), username: m[1], password: bersihNilai(m[2]) }) },
    { re: RE_SSH_URI, map: (m) => ({ host: m[3], port: m[4] ? Number(m[4]) : 22, username: m[1], password: bersihNilai(m[2]) }) },
  ];
  for (const { re, map } of polaKompak) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m;
    while ((m = g.exec(sisa)) !== null) {
      const a = map(m);
      if (validHost(a.host) && a.username && a.password) {
        akunList.push(a);
        sisa = sisa.slice(0, m.index) + " " + sisa.slice(m.index + m[0].length);
        g.lastIndex = 0;
      }
    }
  }

  // 2) Format label (Host: ... Port: ... Username: ... Password: ...).
  //    Baris yang isinya label bug/SNI dilewati — "Domain CloudFront"
  //    atau "Host SNI" bukan host akun.
  const RE_BARIS_BUG = /^\s*(?:sni|bug|host\s*sni|bug\s*host|domain\s*cloudfront|cloudfront(?:\s*domain)?)(?:nya)?\s*[:=]/i;
  const barisBersih = sisa.split(/\n/).filter((b) => !RE_BARIS_BUG.test(b));
  const teksBersih = barisBersih.join("\n");
  //    Ambil per baris agar nilai tidak "menelan" label berikutnya.
  const baris = barisBersih;
  let host = "", port = 0, username = "", password = "";
  let ketemuLabel = false;
  for (const b of baris) {
    const mh = b.match(LABEL_HOST);
    if (mh && validHost(bersihNilai(mh[1]))) { host = bersihNilai(mh[1]); ketemuLabel = true; }
    const mp = b.match(LABEL_PORT);
    if (mp) { port = Number(mp[1]); ketemuLabel = true; }
    const mu = b.match(LABEL_USER);
    if (mu) { username = bersihNilai(mu[1]); ketemuLabel = true; }
    const mw = b.match(LABEL_PASS);
    if (mw) { password = bersihNilai(mw[1]); ketemuLabel = true; }
  }
  // Label bisa juga sebaris ("Username: x Password: y") — coba global.
  if (!username || !password || !host) {
    const gu = teksBersih.match(LABEL_USER); if (gu && !username) { username = bersihNilai(gu[1]); ketemuLabel = true; }
    const gw = teksBersih.match(LABEL_PASS); if (gw && !password) { password = bersihNilai(gw[1]); ketemuLabel = true; }
    const gh = teksBersih.match(LABEL_HOST); if (gh && !host && validHost(bersihNilai(gh[1]))) { host = bersihNilai(gh[1]); ketemuLabel = true; }
    const gp = teksBersih.match(LABEL_PORT); if (gp && !port) { port = Number(gp[1]); ketemuLabel = true; }
  }
  if (host && username && password) {
    akunList.push({ host, port: port || 22, username, password });
  } else if (ketemuLabel || /ssh/i.test(teks)) {
    const kurang = [];
    if (!host) kurang.push("Host/Server");
    if (!username) kurang.push("Username");
    if (!password) kurang.push("Password");
    return { akunList, kurang, adaSsh: true };
  }
  return { akunList, kurang: [], adaSsh: akunList.length > 0 };
}

// ================= ORKESTRATOR PARSING PESAN =================

const RE_LINK = /(?:vless|vmess|trojan|ss|darktunnel):\/\/[^\s"'<>]+/gi;

// Parse satu pesan teks jadi daftar TunnelConfig.
// Return {configs:[...], kurangSsh:[], adaIsi:boolean, adaLink:boolean}.
export function parsePesan(teks) {
  const teksAsli = String(teks || "");
  const configs = [];
  let adaLink = false;

  // 1) Semua link Xray / darktunnel di pesan (boleh banyak).
  const semuaLink = teksAsli.match(RE_LINK) || [];
  let sisa = teksAsli;
  for (const mentah of semuaLink) {
    const link = bersihLink(mentah);
    adaLink = true;
    sisa = sisa.replace(mentah, " ");
    let cfg = null;
    try {
      if (link.startsWith("vless://")) cfg = parseVlessTrojanLink(link, "VLESS");
      else if (link.startsWith("trojan://")) cfg = parseVlessTrojanLink(link, "TROJAN");
      else if (link.startsWith("vmess://")) cfg = parseVmessLink(link);
      else if (link.startsWith("ss://")) cfg = parseSsLink(link);
      else if (link.startsWith("darktunnel://")) {
        const dec = fromDarktunnelLink(link);
        if (dec) configs.push(dec);
        continue;
      }
    } catch { cfg = null; }
    if (cfg) configs.push(cfg);
  }

  // 2) Akun SSH dari sisa teks (setelah link dibuang).
  const ssh = parseSshTeks(sisa);
  const hostsDikenal = configs.map((c) => {
    const sub = c.vlessTunnelConfig || c.vmessTunnelConfig || c.trojanTunnelConfig || c.shadowsocksTunnelConfig || c.sshTunnelConfig;
    return sub?.v2rayConfig?.host || sub?.sshConfig?.host || "";
  }).filter(Boolean);
  for (const a of ssh.akunList) hostsDikenal.push(a.host);

  // 3) Bug/SNI — dari label eksplisit atau domain cloudfront.net.
  //    Dicari di teks yang link-nya sudah dibuang, supaya `sni=` di
  //    dalam query sebuah link tidak dikira label bug.
  const bug = deteksiBug(sisa, hostsDikenal);

  // 4) Terapkan inject ke config Xray bila ada bug (SNI link tetap
  //    jadi TLS SNI-nya; inject terpisah di injectConfig).
  if (bug) {
    for (const c of configs) {
      const subKey = ["vmessTunnelConfig", "vlessTunnelConfig", "trojanTunnelConfig", "shadowsocksTunnelConfig"].find((k) => c[k]);
      if (subKey && !c[subKey].injectConfig) c[subKey].injectConfig = injectConfigAktif(bug, c.type);
    }
  }

  // 5) Config SSH (nama = username; fallback host).
  for (const a of ssh.akunList) {
    configs.push(bangunSsh(a.username, a, bug));
  }

  // Bersihkan penanda internal sebelum dipakai.
  for (const c of configs) delete c._ssMethod;

  return {
    configs,
    kurangSsh: ssh.kurang,
    adaSsh: ssh.adaSsh,
    adaLink,
    adaIsi: configs.length > 0 || ssh.adaSsh || adaLink,
  };
}

// ================= TELEGRAM API =================

async function telegramApi(env, method, body) {
  try {
    const r = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await r.json().catch(() => null);
  } catch { return null; }
}

async function sendTelegram(env, chatId, text, keyboard) {
  const body = { chat_id: chatId, text: String(text).slice(0, 4000), parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await telegramApi(env, "sendMessage", body);
}

async function sendDocument(env, chatId, filename, content, caption) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new File([content], filename, { type: "application/octet-stream" }));
  if (caption) form.append("caption", String(caption).slice(0, 1000));
  form.append("parse_mode", "HTML");
  try {
    await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendDocument", { method: "POST", body: form });
  } catch { /* kirim dokumen gagal — link tetap sudah terkirim */ }
}

async function jawabAlert(env, callbackQueryId, text) {
  await telegramApi(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: String(text).slice(0, 200),
    show_alert: true,
  });
}

async function jawabCallback(env, callbackQueryId) {
  await telegramApi(env, "answerCallbackQuery", { callback_query_id: callbackQueryId });
}

async function kabariAdmin(env, teks) {
  if (!env.ADMIN_CHAT_ID) return;
  try { await sendTelegram(env, env.ADMIN_CHAT_ID, "⚠️ Bot Dark Tunnel: " + teks); } catch { /* abaikan */ }
}

// ================= HANDLER TELEGRAM =================

async function handlePesanAkun(env, chatId, teks) {
  let hasil;
  try {
    hasil = parsePesan(teks);
  } catch (e) {
    await kabariAdmin(env, "parse gagal: " + String(e && e.message || e).slice(0, 200));
    await sendTelegram(env, chatId,
      "😕 Maaf, bot gagal membaca pesan itu. Coba kirim lagi akunnya — link VLESS / VMess / Trojan / Shadowsocks, atau akun SSH (host, port, username, password).");
    return;
  }

  if (!hasil.configs.length) {
    // Ada jejak SSH tapi field kurang → sebut field yang hilang.
    if (hasil.adaSsh && hasil.kurangSsh.length) {
      await sendTelegram(env, chatId,
        "🔎 Akun SSH-nya belum lengkap — yang tidak ketemu: <b>" + escapeHtml(hasil.kurangSsh.join(", ")) + "</b>.\n\n" +
        "Kirim lagi dengan format seperti ini:\n" +
        "<pre>Host: sg1.contoh.com\nPort: 22\nUsername: userku\nPassword: passku</pre>\n" +
        "Boleh juga format <code>host:port@user:pass</code> atau <code>user:pass@host:port</code>.");
      return;
    }
    // Pesan sampah / tidak ada akun sama sekali → panduan singkat.
    await sendTelegram(env, chatId,
      "🤔 Bot tidak menemukan akun di pesan itu.\n\n" +
      "Kirim akun <b>SSH</b> atau link <b>VLESS / VMess / Trojan / Shadowsocks</b> — boleh ditempel apa adanya, bot yang rapikan.\n\n" +
      "Contoh SSH:\n" +
      "<pre>Host: sg1.contoh.com\nPort: 22\nUsername: userku\nPassword: passku</pre>\n" +
      "Ketik /start untuk lihat panduan lengkap.");
    return;
  }

  // Sukses: link per config + satu file .dark.backup.
  const links = hasil.configs.map((c) => toDarktunnelLink(c));
  const nama = hasil.configs.map((c) => c.type + " — " + c.name);
  const ringkas = "✅ <b>Config Dark Tunnel jadi (" + links.length + "):</b>\n" + nama.map((n) => "• " + escapeHtml(n)).join("\n");

  // Kirim link dalam blok <pre> (bisa disalin), dipecah bila panjang.
  let pesanLink = ringkas + "\n\n";
  const potongan = [];
  for (let i = 0; i < links.length; i++) {
    const blok = "<pre>" + escapeHtml(links[i]) + "</pre>";
    if ((pesanLink + blok + "\n").length > 3800) { potongan.push(pesanLink); pesanLink = ""; }
    pesanLink += blok + "\n";
  }
  if (pesanLink.trim()) potongan.push(pesanLink);
  for (const p of potongan) await sendTelegram(env, chatId, p);

  const isiFile = links.join("\n") + "\n";
  await sendDocument(env, chatId, namaFileBackup(), isiFile, "📁 File config Dark Tunnel (" + links.length + " config)");
  await sendTelegram(env, chatId, CARA_IMPOR);
}

async function handleTelegram(env, update) {
  const msg = update.message;
  const cb = update.callback_query;
  if (cb) {
    // Bot ini tidak pakai tombol di DM; tombol di grup diarahkan ke DM.
    if (cb.message?.chat?.type === "group" || cb.message?.chat?.type === "supergroup") {
      const namaBot = env.BOT_USERNAME ? "@" + env.BOT_USERNAME : "bot ini";
      await jawabAlert(env, cb.id, "Kirim akun lewat chat pribadi ya — buka " + namaBot + ", biar akun kamu nggak kelihatan orang lain.");
    } else {
      await jawabCallback(env, cb.id);
    }
    return;
  }
  if (!msg || !msg.text) return; // foto/stiker/dokumen diabaikan diam-diam
  const chatId = msg.chat.id;
  const teks = msg.text.trim();
  const diGrup = msg.chat.type === "group" || msg.chat.type === "supergroup";

  if (diGrup) {
    // Di grup bot hanya jadi etalase: /start dibalas info singkat,
    // sisanya diabaikan — akun pelanggan tidak boleh bocor ke anggota grup.
    const perintah = teks.split(" ")[0].replace(/@.+$/, "");
    if (perintah === "/start" || perintah === "/menu") {
      const tombol = env.BOT_USERNAME
        ? [[{ text: "💬 Buka di Chat Pribadi", url: "https://t.me/" + env.BOT_USERNAME }]]
        : undefined;
      await sendTelegram(env, chatId, PESAN_GRUP, tombol);
    }
    return;
  }

  if (teks === "/start" || teks === "/help" || teks.startsWith("/start ") || teks.startsWith("/start@")) {
    await sendTelegram(env, chatId, PESAN_START);
    return;
  }
  if (teks.startsWith("/")) return; // perintah tak dikenal diabaikan diam-diam

  await handlePesanAkun(env, chatId, teks);
}

// ================= ENTRYPOINT WORKER =================

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "POST") {
      let update;
      try { update = await req.json(); } catch { return new Response("ok"); }
      try {
        await handleTelegram(env, update);
      } catch (e) {
        await kabariAdmin(env, "error handleTelegram: " + String(e && e.message || e).slice(0, 300));
        try {
          const chatId = update?.message?.chat?.id;
          if (chatId) await sendTelegram(env, chatId, "😕 Maaf, ada gangguan sebentar. Coba kirim lagi akunnya ya.");
        } catch { /* abaikan */ }
      }
      return new Response("ok");
    }
    return new Response("Bot generator config Dark Tunnel aktif");
  },
};
