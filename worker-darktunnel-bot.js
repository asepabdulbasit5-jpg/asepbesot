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
//  Fitur tambahan:
//   - /bug: daftar bug host per operator/kategori (database dari grup
//     SANDEKALA, lihat BUG_DB) — pilih lewat tombol inline.
//   - Akun SSH+bug: bot tanya dulu metode payload (WS standar /
//     SSH+payload / Enhanced / Direct) sebelum generate.
//   - Kalau akun tanpa bug/SNI, hasil generate menyarankan /bug;
//     kalau bug-nya dikenal di database, operator + kategorinya disebut.
//   - Parser SSH kenal format `Ssh: host:port@user:pass`, label
//     "Proxy:" / "Sni:" (nilai "-" = direct), dan "Sni = host".
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

const UA_STANDAR = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

// ================= DATABASE BUG HOST (dari grup SANDEKALA) =================
// Dirapikan dari hidden_files/bahan-grup.md: duplikat dihapus, IP mentah
// dibuang, hanya host yang bermakna. Format entri: "host" atau "host|catatan".
// Bug bisa mati sewaktu-waktu — daftar ini referensi, bukan jaminan.
function daftarBug(...items) {
  return items.map((s) => {
    const i = s.indexOf("|");
    return i >= 0 ? { h: s.slice(0, i), n: s.slice(i + 1) } : { h: s };
  });
}

export const BUG_DB = {
  xl: { label: "XL / Axis", kategori: {
    edu: { label: "Edu", hosts: daftarBug(
      "edu.ruangguru.com", "api.qiscus.com", "api.midtrans.com", "event.skillacademy.com",
      "form-staging.ruangguru.com", "gorontalo.ruangguru.com", "event.ruangguru.com",
      "gw.ruangguru.com", "gw2.ruangguru.com", "account-staging.ruangguru.com|ws/sni",
      "helpdesk.kelaspintar.id", "www.zenius.com|cf", "www.zenius.net|cf",
      "edu.udemy.com", "support.udemy.com", "blog.ruangguru.com",
      "internship.ruangguru.com", "me.ruangguru.com", "get.ruangguru.com",
      "pages.coursera.org", "ajakrekan.skillacademy.com", "akunprakerja.skillacademy.com",
      "blog.skillacademy.com", "camp.skillacademy.com", "1udemy-images.udemy.com",
      "ablink.udemybusiness.udemy.com", "inside165.udemy.com", "edu.jln.my.id",
      "auth.zellify.app", "app.parentaiapp.com", "www.ruangguru.com") },
    opok: { label: "Opok", hosts: daftarBug(
      "static.ovo.id|cf", "pub-static.pmang.com|cf", "xl.co.id", "ovo.id",
      "arjuna.axis.co.id", "gopay.co.id", "chat.xl.co.id", "pilih.xl.co.id",
      "wp-assets.ovo.id|cf", "livinapp.onelink.me|cf", "auth.xlcyberscan.xl.co.id|cf",
      "assets.web.q4inc.com|cf", "asphalt.gojek.com|cf", "bpd.m.dana.id", "dana.onelink.me",
      "staging.games.axis.co.id|ws", "go.axis.co.id", "www.axis.co.id",
      "kuota.axis.co.id", "three.co.uk", "baidu.com") },
    wa: { label: "WA", hosts: daftarBug(
      "listen.noice.id|wc/sni", "creators.noice.id|wc", "academy.noice.id",
      "cf-prod-cdn.noice.id", "cdn.noiceid.cc", "go.noice.id", "www.noice.id",
      "fonts.googleapis.com|sni", "googleads.g.doubleclick.net", "line.me",
      "media.fcgk35-1.fna.whatsapp.net", "c.whatsapp.net", "v.whatsaap.net",
      "wbbb65a4c1kqkoav7b-gm3temzxg43tgojr.snr.whatsapp.net") },
    game: { label: "Game", hosts: daftarBug(
      "dl.cvs.freefiremobile.com|ws/wc", "www.freefiremobile.com|sni", "poe.garena.com|sni",
      "cdn.aihelp.net|ws", "play.mobilelegends.com", "m.mobilelegends.com|sni",
      "go.appsflyer.com", "df.game.naver.com", "ava.game.naver.com",
      "redstone.game.naver.com|cf", "sogood.linefriends.com", "bcmsuporte.garena.com|ws",
      "m.freefiremobile.com|sni", "suporte.garena.com|sni", "akmpicture.youngjoygame.com|sni",
      "mediacf.gameloft.com", "cdn.appsflyer.com|cf", "cftxvid.vod.nimo.tv",
      "ir.huya.com", "dev.appsflyer.com", "www.pubgmobile.com|sni") },
    sosmed: { label: "Sosmed", hosts: daftarBug(
      "api24-normal-alisg.tiktokv.com|ws/wc", "api24-normal.tiktokv.com",
      "api24-normal-useast1a.tiktokv.com", "apac-marketing.tiktok.com", "v27.tiktokcdn.com",
      "api2.musical.ly", "m-va.tiktokv.com", "www.tiktok.com|sni", "frontier.tiktokv.com",
      "log.tiktokv.com", "mon16-normal-alisg.tiktokv.com", "search16-normal.tiktokv.com",
      "search22-normal.tiktokv.com", "tnc0-normal-alisg.tiktokv.com",
      "safety-enforcement.tiktok.com|sni", "static.cdninstagram.com", "graph.instagram.com",
      "live-upload.instagram.com", "opensource.fb.com", "graph.facobook.com", "status.fb.com",
      "investor.fb.com", "investor.atmeta.com", "go2.facebookinc.com") },
    musik: { label: "Musik", hosts: daftarBug(
      "investors.spotify.com|wc", "hello.podcasters.spotify.com|cf",
      "open.spotify.com|sni", "community.spotify.com|sni", "investor.spotify.com") },
    nonton: { label: "Nonton", hosts: daftarBug(
      "www.iflix.com|cf/sni", "htrace.wetvinfo.com", "live.iflix.com", "upload.iflix.com",
      "start.iflix.com", "vod.iflix.com", "pbdebugaccess.iflix.com", "source.iflix.com",
      "videocdn.iflix.com", "vplay.iflix.com", "pbaccess.iflix.com", "access.iflix.com",
      "tv.iflix.com", "vcds-kwi001-zain-001.iflix.com", "access.wetv.vip", "live.wetv.vip",
      "t.rconfig.wetv.vip", "zenvideo.wetv.vip", "quiz.int.vidio.com|ws",
      "dev-legacy.visionplus.id", "sindo.visionplus.id", "entitlement.visionplus.id|cf",
      "link.visionplus.id", "partner.catchplay.com", "support-id.catchplay.com",
      "support-tw.catchplay.com", "creativeservices.netflix.com", "cache.netflix.com",
      "www.genflix.co.id", "www.sushiroll.co.id|ws", "cms.sushiroll.co.id",
      "blog.sushiroll.co.id", "go2.webtoons.com", "zaintest.vuclip.com") },
    conference: { label: "Conference", hosts: daftarBug(
      "support.zoom.us|wc", "zoomcares.zoom.us", "cdn-cf.zoom.us", "beta.zoom.us",
      "kiwisuccess.zoom.us", "gomarketplacecontent-cf.zoom.us", "meetings.googleapis.com",
      "mobilemaps.googleapis.com", "tellafriendreceiver.whatsapp.net", "go.medallia.com",
      "youtubei.googleapis.com", "git.ajax.googleapis.com", "m.ajax.googleapis.com",
      "maps.googleapis.com", "web.whatsapp.com", "blog.webex.com", "api.webex.com",
      "caic.zoom.us") },
  } },
  telkomsel: { label: "Telkomsel", kategori: {
    edu: { label: "Edu", hosts: daftarBug(
      "classroom.google.com|sni", "practicesets.classroom.google.com|sni",
      "helpdesk.kelaspintar.id", "pos.ayobelajar.id", "learn.ganecadigital.com",
      "school.ganecadigital.com", "www.infomedia.co.id", "weekly.cambridgeenglish.org",
      "arjuna-lms.bawana.com", "www.mbeat-stg.api.bawana.com", "systools-notes.bawana.com",
      "nexus.u-next.com", "mind.u-next.com", "api.quipper.com|ws/wc",
      "support.zoom.us|ws/wc", "app.academy.com", "quiz.skillacademy.com",
      "edu.ruangguru.com", "blog.webex.com|ws/wc", "elena.unnes.ac.id|wc",
      "tik.itera.ac.id|wc", "api.qiscus.com", "api.midtrans.com", "event.skillacademy.com",
      "www.uii.ac.id", "accounting.uii.ac.id", "alrasikh.uii.ac.id", "knilt.uii.ac.id",
      "suport.zoom.us", "bubadu.com", "funplus.com", "x.com", "www.ruangpeduli.org",
      "kelas.brainacademy.id", "getbootstrap.com", "ads.ruangguru.com",
      "roboguru.ruangguru.com", "bimbel.ruangguru.com", "private.ruangguru.com",
      "data.ruangguru.com", "quizzo.ruangguru.com", "liga.ruangguru.com",
      "robolox.ruangguru.com", "doc.ruangguru.com", "roboguru-admin.ruangguru.com",
      "budi.ruangguru.com", "core-gov.ruangguru.com", "mitra.ruangguru.com",
      "www.kuncie.com", "backoffice.kuncie.com", "appasset.kuncie.com",
      "appassets.kuncie.com", "api2.kuncie.com", "assets.kuncie.com",
      "wpassets.kuncie.com", "scholarship.api.kuncie.com", "mobile-site-canberra.kuncie.com",
      "jwmediamp4.kuncie.com", "jw.kuncie.com", "ilmupediacdn.kuncie.com",
      "cbtassets.kuncie.com", "appconfig.kuncie.com", "tryoutassets.ilmupedia.co.id",
      "www.sekolah.mu", "belajar.skul.id", "cdn.skul.id", "staging-my.skul.id",
      "backoffice.zenius.net", "push.duolingo.com", "cdn.sekolah.mu", "tryout.zenius.net",
      "vn-oc.ruangguru.com", "www.zenius.com", "app.zencore.id",
      "ghost-blog-assets.zenius.net", "appsekolahmu.sid.id",
      "img-video-tracking-vn.ruangguru.com", "img-video-tracking-th.ruangguru.com",
      "status.udemy.com", "video.quipper.com", "parent.quipper.com", "learn.kuncie.com",
      "externalcmsassets.kuncie.com", "cbtbanksoal.kuncie.com", "cbt-api.skul.id",
      "referral-dashboard.zenius.net", "static-media.zenius.net",
      "cdnlecture.kelaspintar.id", "cdn.kelaspintar.id") },
    opok: { label: "Opok", hosts: daftarBug(
      "tdwcontent.telkomsel.com|cf", "12342835.monterey.org", "login.gopay.co.id",
      "static.ovo.id|cf", "ngage.telkomsel.com|cf", "tma-api.telkomsel.com|cf",
      "mta-sts.insurance.gopay.co.id", "goplatform.gojekapi.com", "api.myorbit.id",
      "cdn.linkaja.com|cf", "app.gopay.co.id", "space.byu.id", "blog.acer.com",
      "account.kompas.com", "activity.kompas.com", "ads2.kompas.com", "ads3.kompas.com",
      "amp.kompas.com", "www.kompas.com") },
    game: { label: "Game", hosts: daftarBug(
      "i.nimo.tv", "ir.huya.com", "cf-vod.nimo.tv", "images.rbxcdn.com") },
    nonton: { label: "Nonton", hosts: daftarBug(
      "assets.nflxext.com|sni", "help.nflxext.com|sni", "occ-0-64-58.1.nflxso.net|sni",
      "img.email.cashback.opera.com", "img.marketing.mola.tv", "www.lipcon.com",
      "img.mailin.fr", "rum.haystack.es", "fdus-lb26-d46.freshdesk.com",
      "zoomtan.freshservice.com", "auattachment.freshservice.com",
      "support.freshservice.com", "quiz.vidio.com", "quiz.int.vidio.com",
      "quiz.staging.vidio.com", "support.vidio.com", "nontontv.com",
      "img.email1.vidio.com", "img.email2.vidio.com", "img.email3.vidio.com",
      "api.maxstream.tv", "i.nimo.tv", "ir.huya.com", "cf-vod.nimo.tv",
      "images.rbxcdn.com") },
    conference: { label: "Conference", hosts: daftarBug(
      "support.zoom.us|ws/wc", "blog.webex.com|ws/wc") },
  } },
  indosat: { label: "Indosat", kategori: {
    edu: { label: "Edu", hosts: daftarBug(
      "meet.google.com", "teams.live.com", "teams.microsoft.com", "teams.cdn.office.net",
      "teams.skype.com", "caic.zoom.us", "api.qiscus.com", "api.midtrans.com",
      "event.skillacademy.com", "privacy.teams.live.com|sni", "login.teams.live.com|sni",
      "api.webex.com") },
    opok: { label: "Opok", hosts: daftarBug(
      "myim3api1.ioh.co.id", "static.ovo.id|cf", "myim3.ioh.co.id",
      "myim3asset.ioh.co.id", "myim3-he1.ioh.co.id", "myim3-he.indosatooredoo.com",
      "bimatri.ioh.co.id", "three.co.uk", "baidu.com") },
    conference: { label: "Conference", hosts: daftarBug(
      "caic.zoom.us", "api.webex.com", "meet.google.com", "teams.live.com") },
  } },
  smartfren: { label: "Smartfren", kategori: {
    opok: { label: "Opok", hosts: daftarBug(
      "static.ovo.id|cf", "web.web.whatsapp.com|sni", "api.ovo.id",
      "cuplikan.freshchat.com|cf", "onelinksmartscript.appsflyer.com|cf",
      "www.northlink.co.za") },
    nonton: { label: "Nonton", hosts: daftarBug("s.ytimg.com") },
  } },
};

// Cari bug di database (cocok persis, case-insensitive).
// Return {operator, operatorLabel, kategori, kategoriLabel, note} atau null.
export function cariBug(host) {
  const h = String(host || "").toLowerCase();
  if (!h) return null;
  for (const [opKey, op] of Object.entries(BUG_DB)) {
    for (const [katKey, kat] of Object.entries(op.kategori)) {
      for (const e of kat.hosts) {
        if (e.h.toLowerCase() === h) {
          return { operator: opKey, operatorLabel: op.label, kategori: katKey, kategoriLabel: kat.label, note: e.n || "" };
        }
      }
    }
  }
  return null;
}

// Daftar bug satu kategori, dipecah jadi beberapa pesan (maks 30 host/pesan).
// Return array string pesan (HTML) atau null bila operator/kategori tidak ada.
export function daftarBugPesan(opKey, katKey) {
  const op = BUG_DB[opKey];
  const kat = op?.kategori?.[katKey];
  if (!op || !kat) return null;
  const judul = "🐛 <b>Bug " + op.label + " — " + kat.label + "</b> (" + kat.hosts.length + " host)\n\n";
  const baris = kat.hosts.map((e) => "• <code>" + e.h + "</code>" + (e.n ? " (" + e.n + ")" : ""));
  const pesan = [];
  for (let i = 0; i < baris.length; i += 30) {
    const akhir = i + 30 >= baris.length;
    pesan.push((i === 0 ? judul : "") + baris.slice(i, i + 30).join("\n") +
      (akhir ? "\n\n⚠️ Bug bisa mati sewaktu-waktu — coba satu-satu ya." : ""));
  }
  return pesan;
}

function keyboardOperatorBug() {
  const ops = Object.entries(BUG_DB);
  const rows = [];
  for (let i = 0; i < ops.length; i += 2) {
    const row = ops.slice(i, i + 2).map(([k, v]) => ({ text: v.label, callback_data: "bug:op:" + k }));
    rows.push(row);
  }
  return rows;
}

function keyboardKategoriBug(opKey) {
  const op = BUG_DB[opKey];
  if (!op) return [];
  const rows = Object.entries(op.kategori).map(([k, v]) => ([{ text: v.label, callback_data: "bug:kat:" + opKey + ":" + k }]));
  rows.push([{ text: "⬅️ Ganti operator", callback_data: "bug:back" }]);
  return rows;
}

// ================= TEMPLATE PAYLOAD PER METODE (SSH + bug) =================
// "ws" = template standar aplikasi (placeholder [method]/[host]/[protocol]
// diganti aplikasi saat konek) — JANGAN diubah, ini default.
// Template lain diganti placeholder-nya saat generate:
//   [host] = host/domain SSH, [bug] = bug/SNI, [ua] = User-Agent standar.
const PAYLOAD_METODE = {
  ws: { label: "WS standar", template: null },
  sshpayload: { label: "SSH+payload", template: "GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]" },
  enhanced: { label: "Enhanced", template: "HEAD / HTTP/1.1[crlf]Host: [bug]:80[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf][crlf]BMOVE / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf][crlf]" },
  direct: { label: "Direct", template: "GET / HTTP/1.1[crlf]Host: [bug][crlf][crlf]PATCH / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf][crlf]" },
};

function keyboardMetodePayload() {
  return [
    [{ text: "WS standar", callback_data: "metode:ws" }, { text: "SSH+payload", callback_data: "metode:sshpayload" }],
    [{ text: "Enhanced", callback_data: "metode:enhanced" }, { text: "Direct", callback_data: "metode:direct" }],
  ];
}

const PESAN_START =
  "👋 <b>Generator Config Dark Tunnel</b>\n\n" +
  "Kirim akun kamu apa adanya — bot akan buatkan config Dark Tunnel-nya.\n\n" +
  "Yang bisa diproses:\n" +
  "• Link <b>VLESS / VMess / Trojan / Shadowsocks</b> (boleh banyak sekaligus)\n" +
  "• Akun <b>SSH</b> (host, port, username, password) — tulis bebas, boleh acak\n" +
  "• Kalau akun pakai <b>bug / SNI</b>, tulis juga bug-nya (mis. <code>SNI: bug.example.com</code>) supaya inject aktif\n" +
  "• Ketik /bug buat lihat daftar bug host per operator\n" +
  "• Ketik /cek buat cek apakah sebuah domain merespons\n\n" +
  "Atau pakai tombol di bawah: 🔍 Cari Bug, 🌐 Cek Domain, 📥 Download APK.\n\n" +
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

function injectConfigAktif(bug, service, opts = {}) {
  const metode = PAYLOAD_METODE[opts.metode] || PAYLOAD_METODE.ws;
  let payload;
  if (!metode.template) {
    // WS standar: placeholder aplikasi ([method]/[host]/[protocol]) dibiarkan.
    payload = PAYLOAD_TEMPLATE.replace("{SERVICE}", service);
  } else {
    // Template lain: placeholder diganti saat generate.
    payload = metode.template
      .replaceAll("[host]", opts.sshHost || "")
      .replaceAll("[ua]", UA_STANDAR)
      .replaceAll("[bug]", bug);
  }
  const inj = {
    enabled: true,
    mode: "DIRECT_SNI",
    serverNameIndication: bug,
    payload,
  };
  if (opts.proxy) {
    inj.proxyHost = opts.proxy.host;
    inj.proxyPort = opts.proxy.port;
  }
  return inj;
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

function bangunSsh(name, ssh, bug, opts = {}) {
  const sub = { sshConfig: { host: ssh.host, port: ssh.port, username: ssh.username, password: ssh.password } };
  if (bug) sub.injectConfig = injectConfigAktif(bug, "SSH", { metode: opts.metode, sshHost: ssh.host, proxy: opts.proxy });
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

// Label eksplisit "Proxy:" / "Sni:" di teks akun (satu baris).
// Return {sni, sniIsHost, proxy}:
//   sni: undefined = tidak ada label; null = "Sni: -" (eksplisit tanpa SNI);
//        string = host SNI eksplisit. sniIsHost = nilai "host"/"[host]"/
//        "ssh server" (SNI = host/domain SSH itu sendiri).
//   proxy: undefined = tidak ada label; null = "Proxy: -" (eksplisit
//        tanpa proxy); {host, port} = proxy eksplisit.
const RE_PROXY_BARIS = /^\s*proxy\s*[:=]\s*(.+?)\s*$/im;
const RE_SNI_BARIS = /^\s*sni\s*[:=]\s*(.+?)\s*$/im;

export function deteksiProxySni(teks) {
  const t = String(teks || "");
  const ambilNilai = (re) => {
    const m = t.match(re);
    if (!m) return undefined;
    return bersihNilai(String(m[1]).split(/\s+/)[0]);
  };
  const sniRaw = ambilNilai(RE_SNI_BARIS);
  const proxyRaw = ambilNilai(RE_PROXY_BARIS);
  let sni;
  let sniIsHost = false;
  if (sniRaw !== undefined) {
    if (sniRaw === "-" || sniRaw === "") sni = null;
    else if (/^(?:\[?host\]?|ssh\s+server)$/i.test(sniRaw)) sniIsHost = true;
    else if (validHost(sniRaw)) sni = sniRaw;
    // Nilai tidak dikenal (mis. "BUG") — abaikan, biarkan deteksiBug bekerja.
  }
  let proxy;
  if (proxyRaw !== undefined) {
    if (proxyRaw === "-" || proxyRaw === "") proxy = null;
    else {
      const m = proxyRaw.match(/^(.+):(\d{1,5})$/);
      if (m && validHost(m[1])) proxy = { host: m[1], port: Number(m[2]) };
      else if (validHost(proxyRaw)) proxy = { host: proxyRaw, port: 80 };
    }
  }
  return { sni, sniIsHost, proxy };
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
// `opts.metodePayload` = kunci template payload untuk config SSH+bug
// ("ws" default). Config Xray selalu pakai template WS standar.
// Return {configs:[...], kurangSsh:[], adaIsi:boolean, adaLink:boolean,
//         bug:string|null, adaInject:boolean}.
export function parsePesan(teks, opts = {}) {
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
  //    Label "Proxy:" / "Sni:" eksplisit menang: "Sni: -" berarti
  //    tanpa SNI (meski ada domain cloudfront di teks), nilai SNI
  //    eksplisit dipakai apa adanya, dan "Sni = host" berarti SNI =
  //    host/domain SSH itu sendiri (per akun, di langkah 5).
  const ps = deteksiProxySni(sisa);
  let bug = deteksiBug(sisa, hostsDikenal);
  if (ps.sni !== undefined) {
    if (ps.sni === null) bug = null;
    else if (!ps.sniIsHost) bug = ps.sni;
  }
  const proxy = ps.proxy === undefined ? null : ps.proxy;

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
    const bugSsh = ps.sniIsHost ? a.host : bug;
    configs.push(bangunSsh(a.username, a, bugSsh, { metode: opts.metodePayload, proxy }));
  }

  // Bersihkan penanda internal sebelum dipakai.
  for (const c of configs) delete c._ssMethod;

  const adaInject = configs.some((c) => {
    const sub = c.sshTunnelConfig || c.vmessTunnelConfig || c.vlessTunnelConfig || c.trojanTunnelConfig || c.shadowsocksTunnelConfig;
    return !!sub?.injectConfig;
  });

  return {
    configs,
    kurangSsh: ssh.kurang,
    adaSsh: ssh.adaSsh,
    adaLink,
    adaIsi: configs.length > 0 || ssh.adaSsh || adaLink,
    bug,
    adaInject,
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

async function editTelegram(env, chatId, messageId, text, keyboard) {
  const body = { chat_id: chatId, message_id: messageId, text: String(text).slice(0, 4000), parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await telegramApi(env, "editMessageText", body);
}

async function kabariAdmin(env, teks) {
  if (!env.ADMIN_CHAT_ID) return;
  try { await sendTelegram(env, env.ADMIN_CHAT_ID, "⚠️ Bot Dark Tunnel: " + teks); } catch { /* abaikan */ }
}

// ================= CEK DOMAIN =================
// State sementara (per chat, di memori saja): chat sedang menunggu
// kirim domain setelah /cek atau tombol "🌐 Cek Domain".
const pendingCek = new Map();

// Bersihkan input jadi nama domain polos ("https://a.com/x?y=1" ->
// "a.com"). Return "" bila bukan domain yang valid.
export function bersihkanDomain(input) {
  let s = String(input || "").trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0].split("?")[0].split("#")[0];
  s = s.split(":")[0];
  s = s.replace(/\.+$/, "").trim();
  if (!/^[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}$/.test(s)) return "";
  return s;
}

// Cek satu domain: HEAD dulu, fallback GET, timeout 8 detik per upaya.
// Return {domain, ok, status, ms, cdn, server}.
export async function cekDomain(domain) {
  const t0 = Date.now();
  const ambil = (url, method) =>
    fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(8000) });
  let res = null;
  let skema = "https";
  try { res = await ambil("https://" + domain, "HEAD"); }
  catch { try { res = await ambil("http://" + domain, "HEAD"); skema = "http"; } catch { res = null; } }
  if (res && res.status === 405) {
    try { res = await ambil(skema + "://" + domain, "GET"); } catch { /* tetap pakai hasil HEAD 405 */ }
  }
  if (!res) {
    try { res = await ambil("https://" + domain, "GET"); }
    catch { try { res = await ambil("http://" + domain, "GET"); } catch { res = null; } }
  }
  const ms = Date.now() - t0;
  if (!res) return { domain, ok: false, status: 0, ms, cdn: "", server: "" };
  const h = res.headers;
  const cfRay = h.get("cf-ray");
  const amzCf = h.get("x-amz-cf-id") || h.get("x-amz-cf-pop");
  const via = (h.get("via") || "").toLowerCase();
  let cdn = "";
  if (cfRay) cdn = "Cloudflare";
  else if (amzCf || via.includes("cloudfront")) cdn = "CloudFront";
  return { domain, ok: true, status: res.status, ms, cdn, server: h.get("server") || "" };
}

export function formatHasilCek(r) {
  if (!r.ok) {
    return "🌐 <b>" + escapeHtml(r.domain) + "</b>\n\n" +
      "❌ Domain tidak merespons — tidak ditemukan atau tidak bisa dijangkau.\n" +
      "Coba cek lagi ejaannya, atau coba lagi nanti ya.";
  }
  let teks = "🌐 <b>" + escapeHtml(r.domain) + "</b>\n\n" +
    "✅ Merespons — HTTP " + r.status + " (" + r.ms + " ms)";
  if (r.status >= 400) teks += "\n⚠️ Domain merespons, tapi mengembalikan status " + r.status + " (akses dibatasi / halaman tidak ada).";
  if (r.cdn) teks += "\n📡 CDN: " + r.cdn;
  if (r.server) teks += "\n🖥️ Server: " + escapeHtml(r.server);
  return teks;
}

function keyboardStart() {
  return [
    [{ text: "⚡ Buat Config", callback_data: "buat:config" }],
    [{ text: "🔍 Cari Bug", callback_data: "bug:menu" }],
    [{ text: "🌐 Cek Domain", callback_data: "cek:mulai" }],
    [{ text: "📥 Download APK Dark Tunnel", url: "https://sfile.co/H26JBeTBi1o" }],
    [{ text: "🛒 Beli Akun VPN", url: "https://t.me/sandekalavpn_bot" }],
    [{ text: "👥 Gabung Grup", url: "https://t.me/sand3kala" }],
  ];
}

const TOMBOL_APK = [[{ text: "📥 Download APK Dark Tunnel", url: "https://sfile.co/H26JBeTBi1o" }]];

// ================= HANDLER TELEGRAM =================

// Pilihan metode payload yang sedang menunggu (per chat, sementara di
// memori saja — bukan KV, tidak persisten). Isi: {teks, ts}.
const pendingMetode = new Map();

async function handlePesanAkun(env, chatId, teks, opts = {}) {
  let hasil;
  try {
    hasil = parsePesan(teks, opts);
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

  // Akun SSH + bug: tanya dulu metode payload-nya (kecuali metode
  // sudah dipilih lewat tombol). Akun Xray langsung generate.
  if (!opts.metodePayload) {
    const adaSshBug = hasil.configs.some((c) => c.type === "SSH" && c.sshTunnelConfig?.injectConfig);
    if (adaSshBug) {
      pendingMetode.set(chatId, { teks, ts: Date.now() });
      await sendTelegram(env, chatId,
        "🔧 Akun SSH + bug terdeteksi. Pilih metode payload:",
        keyboardMetodePayload());
      return;
    }
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

  // Catatan bug: kalau bug-nya dikenal di database, sebut operator +
  // kategorinya. Kalau akun tanpa bug/SNI, sarankan /bug.
  let catatanBug = "";
  if (hasil.adaInject && hasil.bug) {
    const info = cariBug(hasil.bug);
    if (info) {
      catatanBug = "\n\n🐛 Bug terdeteksi: <code>" + escapeHtml(hasil.bug) + "</code> (" + info.operatorLabel + " — " + info.kategoriLabel + ")";
    }
  } else if (!hasil.adaInject) {
    catatanBug = "\n\n💡 Belum ada bug/SNI — kalau butuh, ketik /bug buat lihat daftar bug host.";
  }
  await sendTelegram(env, chatId, CARA_IMPOR + catatanBug, TOMBOL_APK);
}

async function handleTelegram(env, update) {
  const msg = update.message;
  const cb = update.callback_query;
  if (cb) {
    const data = cb.data || "";
    const chatIdCb = cb.message?.chat?.id;
    const diGrupCb = cb.message?.chat?.type === "group" || cb.message?.chat?.type === "supergroup";
    // Tombol di grup diarahkan ke DM.
    if (diGrupCb) {
      const namaBot = env.BOT_USERNAME ? "@" + env.BOT_USERNAME : "bot ini";
      await jawabAlert(env, cb.id, "Kirim akun lewat chat pribadi ya — buka " + namaBot + ", biar akun kamu nggak kelihatan orang lain.");
      return;
    }
    if (!chatIdCb) { await jawabCallback(env, cb.id); return; }
    // Tombol "⚡ Buat Config" di /start — pemandu kirim akun.
    if (data === "buat:config") {
      await jawabCallback(env, cb.id);
      await sendTelegram(env, chatIdCb, "Kirim akun SSH atau Xray kamu di sini — link atau teks, bebas format apa pun. Bot akan buatkan config Dark Tunnel-nya.");
      return;
    }
    // Tombol "🔍 Cari Bug" di /start — pintu masuk kedua alur /bug.
    if (data === "bug:menu") {
      await jawabCallback(env, cb.id);
      await sendTelegram(env, chatIdCb, "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
      return;
    }
    // Tombol "🌐 Cek Domain" di /start — minta domain, lalu cek.
    if (data === "cek:mulai") {
      await jawabCallback(env, cb.id);
      pendingCek.set(chatIdCb, { ts: Date.now() });
      await sendTelegram(env, chatIdCb, "🌐 <b>Cek Domain</b>\n\nKirim domain yang mau dicek — mis. <code>edu.ruangguru.com</code>.");
      return;
    }
    // Pilih metode payload untuk akun SSH+bug yang sedang menunggu.
    if (data.startsWith("metode:")) {
      const key = data.slice("metode:".length);
      const pending = pendingMetode.get(chatIdCb);
      if (!pending || !PAYLOAD_METODE[key]) {
        await jawabAlert(env, cb.id, "Pilihan sudah kedaluwarsa — kirim lagi akunnya ya.");
        return;
      }
      pendingMetode.delete(chatIdCb);
      await jawabCallback(env, cb.id);
      await handlePesanAkun(env, chatIdCb, pending.teks, { metodePayload: key });
      return;
    }
    // Alur /bug: pilih operator -> pilih kategori -> daftar bug.
    if (data === "bug:back") {
      await jawabCallback(env, cb.id);
      await editTelegram(env, chatIdCb, cb.message.message_id,
        "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
      return;
    }
    if (data.startsWith("bug:op:")) {
      const opKey = data.slice("bug:op:".length);
      const op = BUG_DB[opKey];
      if (!op) { await jawabCallback(env, cb.id); return; }
      await jawabCallback(env, cb.id);
      await editTelegram(env, chatIdCb, cb.message.message_id,
        "🐛 <b>Bug " + op.label + "</b>\n\nPilih kategori:", keyboardKategoriBug(opKey));
      return;
    }
    if (data.startsWith("bug:kat:")) {
      const parts = data.slice("bug:kat:".length).split(":");
      const daftar = daftarBugPesan(parts[0], parts[1]);
      await jawabCallback(env, cb.id);
      if (!daftar) {
        await sendTelegram(env, chatIdCb, "😕 Kategori itu tidak ada. Ketik /bug buat mulai lagi.");
        return;
      }
      for (const p of daftar) await sendTelegram(env, chatIdCb, p);
      return;
    }
    await jawabCallback(env, cb.id);
    return;
  }
  if (!msg || !msg.text) return; // foto/stiker/dokumen diabaikan diam-diam
  const chatId = msg.chat.id;
  const teks = msg.text.trim();
  const diGrup = msg.chat.type === "group" || msg.chat.type === "supergroup";

  if (diGrup) {
    // Di grup bot hanya jadi etalase: /start dan /bug dibalas info
    // singkat, sisanya diabaikan — akun pelanggan tidak boleh bocor
    // ke anggota grup.
    const perintah = teks.split(" ")[0].replace(/@.+$/, "");
    if (perintah === "/start" || perintah === "/menu") {
      const tombol = env.BOT_USERNAME
        ? [[{ text: "💬 Buka di Chat Pribadi", url: "https://t.me/" + env.BOT_USERNAME }]]
        : undefined;
      await sendTelegram(env, chatId, PESAN_GRUP, tombol);
    } else if (perintah === "/bug") {
      const tombol = env.BOT_USERNAME
        ? [[{ text: "💬 Lihat Daftar Bug di Chat Pribadi", url: "https://t.me/" + env.BOT_USERNAME }]]
        : undefined;
      await sendTelegram(env, chatId,
        "🐛 Daftar bug host cuma bisa dilihat di chat pribadi ya — biar enak milih operator & kategorinya.", tombol);
    }
    return;
  }

  if (teks === "/start" || teks === "/help" || teks.startsWith("/start ") || teks.startsWith("/start@")) {
    pendingCek.delete(chatId);
    await sendTelegram(env, chatId, PESAN_START, keyboardStart());
    return;
  }
  if (teks === "/bug" || teks.startsWith("/bug ") || teks.startsWith("/bug@")) {
    pendingCek.delete(chatId);
    await sendTelegram(env, chatId,
      "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
    return;
  }
  if (teks === "/cek" || teks.startsWith("/cek ") || teks.startsWith("/cek@")) {
    pendingCek.set(chatId, { ts: Date.now() });
    await sendTelegram(env, chatId, "🌐 <b>Cek Domain</b>\n\nKirim domain yang mau dicek — mis. <code>edu.ruangguru.com</code>.");
    return;
  }
  if (teks.startsWith("/")) { pendingCek.delete(chatId); return; } // perintah tak dikenal diabaikan diam-diam

  // Cek domain yang tertunda (setelah /cek atau tombol "🌐 Cek Domain").
  if (pendingCek.has(chatId)) {
    pendingCek.delete(chatId);
    const domain = bersihkanDomain(teks);
    if (!domain) {
      await sendTelegram(env, chatId, "🤔 Itu bukan domain yang valid. Kirim domain seperti <code>edu.ruangguru.com</code> — atau ketik /cek buat mulai lagi.");
      return;
    }
    let hasilCek;
    try { hasilCek = await cekDomain(domain); }
    catch { hasilCek = { domain, ok: false, status: 0, ms: 0, cdn: "", server: "" }; }
    await sendTelegram(env, chatId, formatHasilCek(hasilCek));
    return;
  }

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
