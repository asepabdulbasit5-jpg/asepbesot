// ============================================================
//  Bot Telegram Generator Config Dark Tunnel (SANDEKALA)
//  Cloudflare Worker — modules format (`export default`).
//
//  Tugas bot: pelanggan kirim akun SSH atau Xray (VLESS / VMess /
//  Trojan / Shadowsocks) dalam bentuk APA PUN — bahkan acak /
//  berantakan — bot parsing otomatis, ambil field yang diperlukan,
//  lalu buatkan file config Dark Tunnel (.dark, satu file per config).
//  TANPA jualan, TANPA pembayaran, TANPA Nadia.
//
//  Output: 1 config = 1 file .dark (isi satu link darktunnel://).
//  Link TIDAK pernah ditampilkan sebagai teks chat — hanya di dalam file.
//
//  KV (binding DATA, opsional): kalau dipasang, bot mencatat pengguna
//  (USER:<chatId>), bug tambahan admin (BUGS), config contoh (CONFIGS),
//  dan feed update (UPDATES). Tanpa KV, fitur-fitur itu tidak aktif
//  tapi generate config tetap jalan normal.
//
//  Format config (dipulihkan dari APK Dark Tunnel 1.0.26, lihat
//  hidden_files/analisis-format-config.md):
//   - Config = satu baris `darktunnel://<base64url(JSON TunnelConfig)>`
//   - File `.dark` (bot) = satu config, satu link darktunnel://.
//     (Backup aplikasi `.dark.backup` bisa berisi banyak link, tapi
//     bot kirim 1 config = 1 file `.dark`, sesuai contoh asli.)
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
//   - Admin (ADMIN_CHAT_ID): /tambahbug & /tambahconfig — bug/config
//     baru disimpan di KV lalu diumumkan ke semua pengguna (broadcast)
//     + masuk feed /update; /config untuk ambil config contoh.
//
//  Secrets Worker (di dashboard Cloudflare):
//   - BOT_TOKEN (wajib): token bot Telegram dari BotFather.
//  Variabel env opsional:
//   - ADMIN_CHAT_ID: chat id admin (Asep) — untuk perintah admin
//     (/tambahbug, /tambahconfig) dan notifikasi error internal.
//     Kalau tidak diset, perintah admin tidak aktif.
//   - BOT_USERNAME: username bot tanpa @ (mis. darktunnel_sandekala_bot),
//     dipakai untuk tombol "Buka di Chat Pribadi" di grup.
//
//  Binding KV opsional:
//   - DATA: KV namespace untuk pengguna tercatat, bug/config admin,
//     dan feed update. Tanpa binding ini, fitur admin tidak aktif
//     tapi generate config tetap jalan normal.
//  dan set webhook Telegram ke URL Worker-nya:
//   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<URL_WORKER>
// ============================================================

const PAYLOAD_TEMPLATE = "[method] [host_port] [protocol][crlf]Host: [host][crlf]Service: {SERVICE}[crlf]Mode: Bypass[crlf][crlf]";

const UA_STANDAR = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

// ================= DATABASE BUG HOST (dari grup SANDEKALA) =================
// Dibangun ulang dari hidden_files/daftar-bug-baru-asep.md (kiriman ulang Asep,
// 21 Nov 2026, v2.5) — daftar ini MENGGANTIKAN database lama; jangan pakai
// bahan-grup.md untuk daftar ini. Duplikat di dalam satu kategori dihapus.
// Entri bisa berupa hostname maupun alamat IP — bug IP tetap ditampilkan
// (koreksi 21 Nov 2026: hilangnya bug IP dari daftar adalah masalah, bukan
// perintah hapus). Format entri: "host" atau "host|catatan".
// Bug bisa mati sewaktu-waktu — daftar ini referensi, bukan jaminan.
function daftarBug(...items) {
  return items.map((s) => {
    const i = s.indexOf("|");
    return i >= 0 ? { h: s.slice(0, i), n: s.slice(i + 1) } : { h: s };
  });
}

export const BUG_DB = {
  xl: { label: "XL", kategori: {
    edu: { label: "Edu", metode: "enhanced", hosts: daftarBug(
      "api.qiscus.com", "api.midtrans.com", "event.skillacademy.com",
      "form-staging.ruangguru.com", "gorontalo.ruangguru.com", "event.ruangguru.com",
      "gw.ruangguru.com", "gw2.ruangguru.com", "account-staging.ruangguru.com|ws/sni",
      "helpdesk.kelaspintar.id", "www.zenius.com|cf", "www.zenius.net|cf",
      "162.159.140.147", "edu.udemy.com", "support.udemy.com", "blog.ruangguru.com",
      "104.18.3.2", "104.18.2.2", "internship.ruangguru.com", "edu.ruangguru.com",
      "me.ruangguru.com", "get.ruangguru.com", "104.17.72.206", "104.17.3.81",
      "104.17.74.206", "pages.coursera.org", "ajakrekan.skillacademy.com",
      "akunprakerja.skillacademy.com", "blog.skillacademy.com", "camp.skillacademy.com",
      "1udemy-images.udemy.com", "ablink.udemybusiness.udemy.com",
      "188.114.97.3", "188.114.96.3", "104.16.143.237", "104.16.142.237",
      "edu.jln.my.id", "www.ruangguru.com", "172.66.152.99", "auth.zellify.app",
      "app.parentaiapp.com") },
    opok: { label: "Opok", metode: "sshpayload", hosts: daftarBug(
      "pub-static.pmang.com|cf", "xl.co.id", "ovo.id", "arjuna.axis.co.id",
      "gopay.co.id", "chat.xl.co.id", "static.ovo.id|cf", "pilih.xl.co.id",
      "wp-assets.ovo.id|cf", "livinapp.onelink.me|cf", "auth.xlcyberscan.xl.co.id|cf",
      "13.249.231.12", "13.249.231.14", "13.249.231.31", "13.249.231.42",
      "13.249.231.43", "13.249.231.51", "13.249.231.71", "13.249.231.72",
      "13.249.231.97", "13.249.231.99", "13.249.231.85|cf", "13.249.231.84|cf",
      "13.249.251.81|cf", "13.35.202.97|cf", "18.161.49.87|cf", "18.244.51.92|cf",
      "13.35.202.3|cf", "13.35.202.129|cf", "104.19.168.112", "108.138.141.61|cf",
      "108.138.141.90|cf", "assets.web.q4inc.com|cf", "asphalt.gojek.com|cf",
      "bpd.m.dana.id", "dana.onelink.me", "108.157.254.16", "54.192.164.97",
      "54.192.164.129", "3.168.203.26") },
    wa: { label: "WA", metode: "enhanced", hosts: daftarBug(
      "31.13.67.51", "edgeray-shv-01-mia3.facebook.com",
      "wbbb65a4c1kqkoav7b-gm3temzxg43tgojr.snr.whatsapp.net",
      "fonts.googleapis.com|sni", "googleads.g.doubleclick.net", "chat.xl.co.id",
      "line.me", "104.22.3.25", "104.18.214.235", "104.18.147.61",
      "104.18.42.238", "104.16.51.111", "media.fcgk35-1.fna.whatsapp.net",
      "c.whatsapp.net", "v.whatsaap.net", "listen.noice.id") },
    game: { label: "Game", hosts: daftarBug(
      "df.game.naver.com", "ava.game.naver.com", "redstone.game.naver.com|cf",
      "sogood.linefriends.com", "dl.cvs.freefiremobile.com|ws/wc",
      "www.freefiremobile.com|sni", "poe.garena.com|sni", "cdn.aihelp.net|ws",
      "play.mobilelegends.com", "m.mobilelegends.com|sni", "104.16.241.118",
      "162.159.140.159", "go.appsflyer.com", "www.pubgmobile.com|sni",
      "104.16.16.243") },
    sosmed: { label: "Sosmed", metode: "direct", hosts: daftarBug(
      "safety-enforcement.tiktok.com|sni", "api24-normal-alisg.tiktokv.com|ws/wc",
      "api24-normal.tiktokv.com", "api24-normal-useast1a.tiktokv.com",
      "172.66.1.232", "162.159.141.236", "apac-marketing.tiktok.com",
      "v27.tiktokcdn.com", "api2.musical.ly", "104.18.19.183", "m-va.tiktokv.com",
      "www.tiktok.com|sni", "frontier.tiktokv.com", "log.tiktokv.com",
      "mon16-normal-alisg.tiktokv.com", "search16-normal.tiktokv.com",
      "search22-normal.tiktokv.com", "tnc0-normal-alisg.tiktokv.com",
      "static.cdninstagram.com", "graph.instagram.com", "live-upload.instagram.com",
      "investor.fb.com", "investor.atmeta.com", "162.159.130.11", "162.159.129.11",
      "opensource.fb.com", "graph.facobook.com", "status.fb.com",
      "go2.facebookinc.com") },
    musik: { label: "Musik", metode: "sshpayload", hosts: daftarBug(
      "investors.spotify.com|wc", "hello.podcasters.spotify.com|cf",
      "open.spotify.com|sni", "community.spotify.com|sni") },
    nonton: { label: "Nonton", metode: "direct", hosts: daftarBug(
      "www.iflix.com|cf/sni", "htrace.wetvinfo.com", "live.iflix.com", "upload.iflix.com",
      "start.iflix.com", "vod.iflix.com", "pbdebugaccess.iflix.com", "source.iflix.com",
      "videocdn.iflix.com", "vplay.iflix.com", "pbaccess.iflix.com", "access.iflix.com",
      "tv.iflix.com", "vcds-kwi001-zain-001.iflix.com", "access.wetv.vip", "live.wetv.vip",
      "t.rconfig.wetv.vip", "zenvideo.wetv.vip", "support-id.catchplay.com",
      "support-tw.catchplay.com", "partner.catchplay.com",
      "162.159.140.147", "172.66.0.145", "76.223.54.146", "3.33.139.32",
      "185.93.1.245", "44.230.85.241", "52.117.52.70", "13.248.169.48",
      "zaintest.vuclip.com", "104.20.25.114", "quiz.int.vidio.com|ws",
      "dev-legacy.visionplus.id", "104.21.58.186", "172.67.206.64", "104.21.235.171",
      "172.67.192.40", "104.21.73.208", "104.21.235.172", "162.159.128.7",
      "104.18.225.52", "sindo.visionplus.id", "entitlement.visionplus.id|cf",
      "link.visionplus.id") },
    conference: { label: "Conference", metode: "direct", hosts: daftarBug(
      "support.zoom.us|wc", "zoomcares.zoom.us", "170.114.46.0", "cdn-cf.zoom.us",
      "beta.zoom.us", "kiwisuccess.zoom.us", "gomarketplacecontent-cf.zoom.us",
      "meetings.googleapis.com", "mobilemaps.googleapis.com",
      "tellafriendreceiver.whatsapp.net", "go.medallia.com",
      "googleads.g.doubleclick.net", "youtubei.googleapis.com",
      "git.ajax.googleapis.com", "m.ajax.googleapis.com", "maps.googleapis.com",
      "web.whatsapp.com") },
  } },
  axis: { label: "Axis", kategori: {
    opok: { label: "Opok", metode: "sshpayload", hosts: daftarBug(
      "staging.games.axis.co.id|ws", "go.axis.co.id", "www.axis.co.id",
      "kuota.axis.co.id", "static.ovo.id|cf") },
    wa: { label: "WA", metode: "enhanced", hosts: daftarBug(
      "listen.noice.id|wc/sni", "creators.noice.id|wc") },
    nonton: { label: "Nonton", hosts: daftarBug(
      "cache.netflix.com", "go2.webtoons.com", "www.genflix.co.id",
      "www.sushiroll.co.id|ws", "cms.sushiroll.co.id", "blog.sushiroll.co.id",
      "172.67.213.134") },
    musik: { label: "Musik", metode: "sshpayload", hosts: daftarBug(
      "investors.spotify.com", "162.159.130.11", "investor.fb.com",
      "162.159.129.11", "investor.spotify.com", "open.spotify.com") },
    edu: { label: "Edu", metode: "enhanced", hosts: daftarBug("inside165.udemy.com") },
    game: { label: "Game", hosts: daftarBug(
      "bcmsuporte.garena.com|ws", "m.freefiremobile.com|sni", "suporte.garena.com|sni",
      "akmpicture.youngjoygame.com|sni", "ava.game.naver.com", "mediacf.gameloft.com",
      "poe.garena.com", "cdn.appsflyer.com|cf", "cftxvid.vod.nimo.tv",
      "ir.huya.com", "dev.appsflyer.com") },
  } },
  telkomsel: { label: "Telkomsel", kategori: {
    ilped: { label: "Ilped", metode: "sshpayload", hosts: daftarBug(
      "classroom.google.com|sni", "74.125.68.100", "practicesets.classroom.google.com|sni",
      "142.91.102.190", "104.18.17.214", "188.114.97.2", "162.159.134.42",
      "104.20.28.42", "helpdesk.kelaspintar.id", "pos.ayobelajar.id",
      "latazzina.base.shop", "learn.ganecadigital.com", "school.ganecadigital.com",
      "www.infomedia.co.id", "weekly.cambridgeenglish.org", "arjuna-lms.bawana.com",
      "www.mbeat-stg.api.bawana.com", "systools-notes.bawana.com", "nexus.u-next.com",
      "mind.u-next.com", "api.quipper.com|ws/wc", "104.18.9.196", "104.18.8.196",
      "172.66.152.99", "172.67.74.70", "support.zoom.us|ws/wc", "170.114.45.6",
      "app.academy.com", "quiz.skillacademy.com", "edu.ruangguru.com",
      "blog.webex.com|ws/wc", "elena.unnes.ac.id|wc", "tik.itera.ac.id|wc",
      "api.qiscus.com", "api.midtrans.com", "event.skillacademy.com",
      "www.uii.ac.id", "accounting.uii.ac.id", "alrasikh.uii.ac.id", "knilt.uii.ac.id",
      "suport.zoom.us", "bubadu.com", "funplus.com", "x.com", "www.ruangpeduli.org",
      "kelas.brainacademy.id", "getbootstrap.com", "104.26.3.86", "ads.ruangguru.com",
      "roboguru.ruangguru.com", "bimbel.ruangguru.com", "private.ruangguru.com",
      "data.ruangguru.com", "quizzo.ruangguru.com", "liga.ruangguru.com",
      "robolox.ruangguru.com", "doc.ruangguru.com", "roboguru-admin.ruangguru.com",
      "budi.ruangguru.com", "core-gov.ruangguru.com", "mitra.ruangguru.com",
      "104.18.25.139", "104.18.24.139", "www.kuncie.com", "backoffice.kuncie.com",
      "appasset.kuncie.com", "appassets.kuncie.com", "api2.kuncie.com",
      "assets.kuncie.com", "wpassets.kuncie.com", "scholarship.api.kuncie.com",
      "mobile-site-canberra.kuncie.com", "jwmediamp4.kuncie.com", "jw.kuncie.com",
      "ilmupediacdn.kuncie.com", "cbtassets.kuncie.com", "appconfig.kuncie.com",
      "tryoutassets.ilmupedia.co.id", "www.sekolah.mu", "belajar.skul.id",
      "cdn.skul.id", "staging-my.skul.id", "backoffice.zenius.net", "push.duolingo.com",
      "cdn.sekolah.mu", "tryout.zenius.net", "vn-oc.ruangguru.com", "www.zenius.com",
      "app.zencore.id", "ghost-blog-assets.zenius.net", "appsekolahmu.sid.id",
      "img-video-tracking-vn.ruangguru.com", "img-video-tracking-th.ruangguru.com",
      "status.udemy.com", "video.quipper.com", "parent.quipper.com", "learn.kuncie.com",
      "externalcmsassets.kuncie.com", "cbtbanksoal.kuncie.com", "cbt-api.skul.id",
      "referral-dashboard.zenius.net", "static-media.zenius.net",
      "cdnlecture.kelaspintar.id", "cdn.kelaspintar.id") },
    nonton: { label: "Nonton", hosts: daftarBug(
      "assets.nflxext.com|sni", "help.nflxext.com|sni", "occ-0-64-58.1.nflxso.net|sni",
      "img.email.cashback.opera.com", "img.marketing.mola.tv", "www.lipcon.com",
      "img.mailin.fr", "rum.haystack.es", "fdus-lb26-d46.freshdesk.com",
      "zoomtan.freshservice.com", "auattachment.freshservice.com",
      "support.freshservice.com", "quiz.vidio.com", "quiz.int.vidio.com",
      "quiz.staging.vidio.com", "support.vidio.com", "nontontv.com",
      "img.email1.vidio.com", "img.email2.vidio.com", "img.email3.vidio.com",
      "api.maxstream.tv") },
    opok: { label: "Opok", metode: "cftrace", hosts: daftarBug(
      "tdwcontent.telkomsel.com|cf", "12342835.monterey.org", "login.gopay.co.id",
      "static.ovo.id|cf", "104.18.17.214", "ngage.telkomsel.com|cf",
      "tma-api.telkomsel.com|cf", "15.232.198.233|cf", "15.232.29.104|cf",
      "108.138.141.79|cf", "18.161.49.111|cf", "18.161.49.41|cf",
      "18.161.49.87|cf", "18.161.49.116|cf", "162.159.128.79",
      "mta-sts.insurance.gopay.co.id", "goplatform.gojekapi.com", "api.myorbit.id",
      "54.192.164.25|cf", "65.8.76.45|cf", "65.8.76.7|cf", "cdn.linkaja.com|cf") },
    game: { label: "Game", hosts: daftarBug(
      "i.nimo.tv", "ir.huya.com", "cf-vod.nimo.tv", "images.rbxcdn.com",
      "18.64.37.89", "54.192.164.25|cf") },
  } },
  indosat: { label: "Indosat", kategori: {
    appfun: { label: "AppFun", metode: "cftrace", hosts: daftarBug("creativeservices.netflix.com|ws/wc") },
    opok: { label: "Opok", metode: "direct", hosts: daftarBug(
      "myim3api1.ioh.co.id", "104.18.21.18", "static.ovo.id|cf", "myim3.ioh.co.id",
      "198.19.1.179", "34.54.192.69", "198.18.0.22", "202.152.162.239",
      "myim3asset.ioh.co.id", "myim3-he1.ioh.co.id", "myim3-he.indosatooredoo.com") },
    edu: { label: "Edu", metode: "direct", hosts: daftarBug(
      "meet.google.com", "teams.live.com|sni", "teams.microsoft.com",
      "teams.cdn.office.net", "teams.skype.com", "caic.zoom.us", "api.qiscus.com",
      "api.midtrans.com", "event.skillacademy.com", "privacy.teams.live.com|sni",
      "login.teams.live.com|sni", "141.193.213.20") },
  } },
  smartfren: { label: "Smartfren", kategori: {
    opok: { label: "Opok", metode: "sshpayload", hosts: daftarBug(
      "static.ovo.id|cf", "web.web.whatsapp.com|sni", "api.ovo.id",
      "cuplikan.freshchat.com|cf", "onelinksmartscript.appsflyer.com|cf",
      "104.21.52.82", "www.northlink.co.za") },
    nonton: { label: "YouTube", hosts: daftarBug("s.ytimg.com") },
  } },
  // Tri (3) — kiriman Asep 21 Nov 2026: opok "MODE BOLAK BALIK" dan sosmed
  // (TikTok). Payload opok = template SSH+payload; payload sosmed =
  // template Direct (bug TikTok).
  tri: { label: "Tri (3)", kategori: {
    opok: { label: "Opok", metode: "sshpayload", hosts: daftarBug(
      "static.ovo.id|cf", "bimatri.ioh.co.id", "three.co.uk",
      "104.117.252.101", "23.73.192.165", "baidu.com", "104.18.6.170",
      "104.21.22.52") },
    sosmed: { label: "Sosmed", metode: "direct", hosts: daftarBug(
      "api24-normal.tiktokv.com", "apac-marketing.tiktok.com", "162.159.141.236") },
  } },
  // by.U — operator ke-7, brand digital Telkomsel (kiriman Asep 21 Nov 2026).
  // Satu kategori saja (opok). Proxy: space.byu.id:443 (bukan bug host).
  byu: { label: "by.U", kategori: {
    opok: { label: "Opok", metode: "sshpayload", hosts: daftarBug(
      "tdwcontent.telkomsel.com|cf", "blog.acer.com", "static.ovo.id|cf",
      "104.18.17.214", "162.159.138.78", "162.159.138.79", "account.kompas.com",
      "activity.kompas.com", "ads2.kompas.com", "ads3.kompas.com", "amp.kompas.com",
      "www.kompas.com") },
  } },
};

// Cari bug di database (cocok persis, case-insensitive).
// Return {operator, operatorLabel, kategori, kategoriLabel, note, metode} atau null.
// metode = metode payload kategori itu (v2.5), atau undefined bila tidak ada.
export function cariBug(host) {
  return cariBugKecuali(host, null);
}

// Cari bug di BUG_DB, lewati entri yang ada di deleted-set (objek
// { "op|kat|hostLower": 1 }, dari KV BUG_DELETED). Dipakai
// cariBugGabungan supaya bug yang sudah dihapus admin tidak terdeteksi
// lagi saat generate — tapi bug yang sama di kategori lain (yang tidak
// dihapus) tetap ketemu.
function cariBugKecuali(host, dihapus) {
  const h = String(host || "").toLowerCase();
  if (!h) return null;
  for (const [opKey, op] of Object.entries(BUG_DB)) {
    for (const [katKey, kat] of Object.entries(op.kategori)) {
      for (const e of kat.hosts) {
        if (e.h.toLowerCase() === h && !(dihapus && dihapus[kunciBugDihapus(opKey, katKey, h)])) {
          return { operator: opKey, operatorLabel: op.label, kategori: katKey, kategoriLabel: kat.label, note: e.n || "", metode: kat.metode };
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
  // Entri berupa IP tetap ditampilkan seperti host biasa.
  const hosts = kat.hosts;
  const judulDasar = "🐛 <b>Bug " + op.label + " — " + kat.label + "</b> (" + hosts.length + " host";
  const baris = hosts.map((e) => "• <code>" + e.h + "</code>" + (e.n ? " (" + e.n + ")" : ""));
  const pesan = [];
  // (v2.9.6) SETIAP potongan membawa judul — potongan lanjutan tanpa
  // judul dulu terlihat seperti daftar lepas yang tidak berhubungan
  // (laporan Asep 22 Nov 2026). Satu potongan: judul persis format lama.
  const total = Math.max(1, Math.ceil(baris.length / 30));
  for (let i = 0; i < baris.length; i += 30) {
    const akhir = i + 30 >= baris.length;
    const no = i / 30 + 1;
    const judul = total > 1 ? judulDasar + " — bagian " + no + "/" + total + ")\n\n" : judulDasar + ")\n\n";
    pesan.push(judul + baris.slice(i, i + 30).join("\n") +
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
  rows.push(...TOMBOL_KEMBALI);
  return rows;
}

function keyboardKategoriBug(opKey, kvKats) {
  const op = BUG_DB[opKey];
  const katsBawaan = op ? Object.keys(op.kategori) : [];
  const semua = [...new Set([...katsBawaan, ...(kvKats || [])])].sort((a, b) => {
    const ia = URUTAN_KATEGORI.indexOf(a), ib = URUTAN_KATEGORI.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const rows = baris2(semua.map((k) => ({ text: labelKategori(opKey, k), callback_data: "bug:kat:" + opKey + ":" + k })));
  rows.push([{ text: "⬅️ Ganti operator", callback_data: "bug:back" }]);
  rows.push(...TOMBOL_KEMBALI);
  return rows;
}

// Kelompokkan tombol jadi 2 per baris (biar daftar kategori tidak
// memanjang ke bawah — 1 tombol per baris bikin daftar kepanjangan).
function baris2(tombol) {
  const rows = [];
  for (let i = 0; i < tombol.length; i += 2) rows.push(tombol.slice(i, i + 2));
  return rows;
}

// ================= KV + ADMIN (opsional, graceful degradation) =================
// Semua akses KV dibungkus try/catch; kalau env.DATA tidak ada atau
// gagal, fitur admin/pelacakan diam-diam tidak aktif tapi generate
// config tetap jalan normal.

const BULAN_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Tanggal WIB format "20 Nov 2026".
export function tanggalWib(nowMs) {
  const d = new Date((nowMs ?? Date.now()) + 7 * 3600 * 1000);
  return d.getUTCDate() + " " + BULAN_ID[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

async function kvGet(env, key) {
  try {
    if (!env.DATA) return null;
    const raw = await env.DATA.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

async function kvPut(env, key, value) {
  try {
    if (!env.DATA) return false;
    await env.DATA.put(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

async function kvList(env, prefix) {
  try {
    if (!env.DATA) return [];
    const out = [];
    let cursor;
    do {
      const r = await env.DATA.list({ prefix, cursor });
      out.push(...(r.keys || []).map((k) => k.name));
      cursor = r.cursor;
    } while (cursor);
    return out;
  } catch { return []; }
}

// Catat pengirim DM sekali saja (USER:<chatId> = {nama, pertama}).
async function catatPengguna(env, chatId, nama) {
  if (!env.DATA) return;
  try {
    const key = "USER:" + chatId;
    if (await env.DATA.get(key)) return;
    await env.DATA.put(key, JSON.stringify({ nama: nama || "", pertama: tanggalWib() }));
  } catch { /* abaikan */ }
}

// ---- Validasi operator / kategori untuk perintah admin ----
const OPERATOR_ADMIN = { xl: "XL", axis: "Axis", telkomsel: "Telkomsel", indosat: "Indosat", smartfren: "Smartfren", tri: "Tri (3)", byu: "by.U" };
const URUTAN_KATEGORI = ["edu", "ilped", "opok", "wa", "game", "sosmed", "musik", "nonton", "conference", "appfun"];

export function normalisasiOperator(op) {
  const k = String(op || "").toLowerCase();
  return OPERATOR_ADMIN[k] ? k : null;
}

export function normalisasiKategori(kat) {
  const k = String(kat || "").toLowerCase();
  if (k === "ilmupedia") return "ilped";
  return URUTAN_KATEGORI.includes(k) ? k : null;
}

function labelOperator(opKey) {
  return BUG_DB[opKey]?.label || OPERATOR_ADMIN[opKey] || opKey;
}

function labelKategori(opKey, katKey) {
  return BUG_DB[opKey]?.kategori?.[katKey]?.label ||
    (katKey ? katKey[0].toUpperCase() + katKey.slice(1) : katKey);
}

// True bila host berupa alamat IP (IPv4, atau IPv6 sederhana).
// Dipakai /cek (bersihkanDomain + reverse DNS). Bug berupa IP BOLEH
// ditampilkan di daftar bug dan ditambahkan admin (koreksi 21 Nov 2026:
// hilangnya bug IP dari daftar adalah masalah, bukan perintah hapus).
export function isIP(host) {
  let h = String(host || "").trim();
  const mPort = h.match(/^(.+):(\d{1,5})$/);
  if (mPort && mPort[1].includes(".")) h = mPort[1];
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(h)) {
    return h.split(".").every((o) => Number(o) <= 255);
  }
  if (h.includes(":")) {
    return /^[0-9a-fA-F:.]+$/.test(h) && /[0-9a-fA-F]/.test(h) && h.split(":").length >= 2;
  }
  return false;
}

// Host bug valid: domain atau IP, boleh pakai :port.
export function validBugHost(s) {
  const h = String(s || "").trim();
  if (!h) return false;
  const m = h.match(/^(.+):(\d{1,5})$/);
  if (m) return validHost(m[1]) && Number(m[2]) > 0;
  return validHost(h);
}

// Chat ID admin (Asep). Workflow deploy tidak memasang ADMIN_CHAT_ID
// sebagai variabel Worker (hanya dipakai untuk notifikasi deploy), jadi
// env.ADMIN_CHAT_ID di Worker KOSONG — panel admin tidak pernah muncul.
// Fallback ke ID ini supaya admin tetap dikenali walau env belum diset
// di dashboard Cloudflare. (Chat ID bukan rahasia — cuma nomor pengenal
// chat Telegram, bukan token/kredensial.)
const ADMIN_CHAT_ID_DEFAULT = "1315468885";

function adminChatId(env) {
  return env.ADMIN_CHAT_ID ? String(env.ADMIN_CHAT_ID) : ADMIN_CHAT_ID_DEFAULT;
}

// Status admin: "ya" | "bukan" | "belum" (tidak ada ADMIN_CHAT_ID sama sekali).
function cekAdmin(env, chatId) {
  const adminId = adminChatId(env);
  if (!adminId) return "belum";
  return String(chatId) === adminId ? "ya" : "bukan";
}

// ---- Bug tambahan admin (KV key BUGS) ----
async function ambilBugsKv(env) {
  const d = await kvGet(env, "BUGS");
  return d && typeof d === "object" ? d : {};
}

// Jumlah bug host bawaan di BUG_DB (tanpa KV).
export function hitungBugBawaan() {
  let n = 0;
  for (const op of Object.values(BUG_DB)) {
    for (const kat of Object.values(op.kategori || {})) n += (kat.hosts || []).length;
  }
  return n;
}

// Jumlah bug tambahan dari KV (key BUGS).
async function hitungBugKv(env) {
  const bugs = await ambilBugsKv(env);
  let n = 0;
  for (const kats of Object.values(bugs)) {
    for (const arr of Object.values(kats || {})) n += (arr || []).length;
  }
  return n;
}

// ---- Bug yang dihapus admin (v2.8.0, KV key BUG_DELETED) ----
// Bug bawaan (BUG_DB) tidak bisa dihapus dari kode saat runtime, jadi
// penghapusannya dicatat di sini sebagai SET: { "op|kat|hostLower": 1 }.
// Pemisah "|" aman: host di BUG_DB tidak pernah mengandung "|" (di
// daftarBug, "|" memisahkan host dari catatan) dan op/kat adalah kunci
// enum. Kunci memuat op+kat: host yang sama bisa ada di beberapa
// kategori, hapus hanya berlaku untuk kategori yang dilihat admin.
// Bug KV (BUGS) dihapus langsung dari arraynya — bersih, tanpa jejak.
function kunciBugDihapus(opKey, katKey, host) {
  return String(opKey || "") + "|" + String(katKey || "") + "|" + String(host || "").toLowerCase();
}

async function ambilBugDihapusKv(env) {
  const d = await kvGet(env, "BUG_DELETED");
  return d && typeof d === "object" ? d : {};
}

// Hapus bug dari daftar: hapus dari KV BUGS bila ada, dan/atau catat
// ke BUG_DELETED bila host ada di BUG_DB (kategori itu). Return host
// (lowercase) yang dihapus, atau null bila tidak ketemu di mana pun.
export async function hapusBugKv(env, opKey, katKey, host) {
  const h = String(host || "").toLowerCase();
  if (!h || !env.DATA) return null;
  let ketemu = false;
  // (1) Bug KV: hapus dari array BUGS.
  const bugs = await ambilBugsKv(env);
  const arr = bugs?.[opKey]?.[katKey];
  if (Array.isArray(arr)) {
    const idx = arr.findIndex((e) => String(e.host || "").toLowerCase() === h);
    if (idx >= 0) {
      arr.splice(idx, 1);
      ketemu = true;
      if (!await kvPut(env, "BUGS", bugs)) return null;
    }
  }
  // (2) Bug bawaan: catat di deleted-set.
  const bawaan = BUG_DB[opKey]?.kategori?.[katKey]?.hosts || [];
  if (bawaan.some((e) => String(e.h || "").toLowerCase() === h)) {
    const dihapus = await ambilBugDihapusKv(env);
    dihapus[kunciBugDihapus(opKey, katKey, h)] = 1;
    if (!await kvPut(env, "BUG_DELETED", dihapus)) return null;
    ketemu = true;
  }
  return ketemu ? h : null;
}

// Jumlah bug bawaan yang sudah dihapus (hanya entri deleted-set yang
// benar-benar ada di BUG_DB — entri basi tidak dihitung). Dipakai
// /status supaya angka bug bawaan akurat.
export async function hitungBugDihapus(env) {
  const dihapus = await ambilBugDihapusKv(env);
  let n = 0;
  for (const kunci of Object.keys(dihapus)) {
    const [op, kat, host] = kunci.split("|");
    if (!op || !kat || !host) continue;
    const bawaan = BUG_DB[op]?.kategori?.[kat]?.hosts || [];
    if (bawaan.some((e) => String(e.h || "").toLowerCase() === host)) n++;
  }
  return n;
}

// Cari bug di KV dulu, lalu database bawaan. Return seperti cariBug().
export async function cariBugGabungan(env, host) {
  const h = String(host || "").toLowerCase();
  if (!h) return null;
  const kv = await ambilBugsKv(env);
  for (const [opKey, kats] of Object.entries(kv)) {
    for (const [katKey, arr] of Object.entries(kats || {})) {
      for (const e of arr || []) {
        if (String(e.host || "").toLowerCase() === h) {
          // Bug KV mewarisi metode payload kategorinya (bila ada di BUG_DB).
          return { operator: opKey, operatorLabel: labelOperator(opKey), kategori: katKey, kategoriLabel: labelKategori(opKey, katKey), note: e.catatan || "", metode: BUG_DB[opKey]?.kategori?.[katKey]?.metode };
        }
      }
    }
  }
  // Fallback database bawaan — lewati bug yang sudah dihapus admin.
  const dihapus = await ambilBugDihapusKv(env);
  return cariBugKecuali(host, dihapus);
}

// Daftar bug satu kategori: KV (didahulukan, 🆕 bila <7 hari) + bawaan,
// dedup. Return array string pesan (HTML) atau null bila tidak ada.
export async function daftarBugPesanGabungan(env, opKey, katKey) {
  const op = BUG_DB[opKey];
  const kat = op?.kategori?.[katKey];
  const kv = await ambilBugsKv(env);
  const kvList = (kv?.[opKey]?.[katKey] || []).filter((e) => e && e.host);
  if (!kat && kvList.length === 0) return null;
  const ada = new Set(kvList.map((e) => String(e.host).toLowerCase()));
  // Bug bawaan yang sudah dihapus admin tidak ditampilkan.
  const dihapus = await ambilBugDihapusKv(env);
  const baru = (e) => e.ts && Date.now() - e.ts < 7 * 86400 * 1000;
  const barisKv = kvList.map((e) =>
    "• <code>" + escapeHtml(e.host) + "</code>" +
    (e.catatan ? " (" + escapeHtml(e.catatan) + ")" : "") +
    (baru(e) ? " 🆕" : ""));
  const barisBawaan = kat
    ? kat.hosts.filter((e) => !ada.has(e.h.toLowerCase()) && !dihapus[kunciBugDihapus(opKey, katKey, e.h)]).map((e) =>
      "• <code>" + e.h + "</code>" + (e.n ? " (" + e.n + ")" : ""))
    : [];
  const semua = [...barisKv, ...barisBawaan];
  const judulDasar = "🐛 <b>Bug " + (op?.label || labelOperator(opKey)) + " — " + (kat?.label || labelKategori(opKey, katKey)) + "</b> (" + semua.length + " host";
  const pesan = [];
  // (v2.9.6) SETIAP potongan membawa judul — potongan lanjutan tanpa
  // judul dulu terlihat seperti daftar lepas yang tidak berhubungan
  // (laporan Asep 22 Nov 2026). Satu potongan: judul persis format lama.
  const total = Math.max(1, Math.ceil(semua.length / 30));
  for (let i = 0; i < semua.length; i += 30) {
    const akhir = i + 30 >= semua.length;
    const no = i / 30 + 1;
    const judul = total > 1 ? judulDasar + " — bagian " + no + "/" + total + ")\n\n" : judulDasar + ")\n\n";
    pesan.push(judul + semua.slice(i, i + 30).join("\n") +
      (akhir ? "\n\n⚠️ Bug bisa mati sewaktu-waktu — coba satu-satu ya." : ""));
  }
  return pesan;
}

// ---- Config contoh admin (KV key CONFIGS, array maks 20, terbaru dulu) ----
async function ambilConfigsKv(env) {
  const d = await kvGet(env, "CONFIGS");
  return Array.isArray(d) ? d : [];
}

// ---- Template config admin (v2.7, KV key TEMPLATE:<id>) ----
// Template = setting config tanpa akun; akun (host/username/password)
// diambil dari pengguna saat template dipakai. Upsert menurut nama.
async function ambilTemplatesKv(env) {
  const keys = await kvList(env, "TEMPLATE:");
  const out = [];
  for (const k of keys) {
    const t = await kvGet(env, k);
    if (t && t.id) out.push(t);
  }
  out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return out;
}

async function simpanTemplate(env, tpl, idTetap) {
  const semua = await ambilTemplatesKv(env);
  const namaLower = String(tpl.nama || "").toLowerCase();
  const ada = semua.find((e) => String(e.nama || "").toLowerCase() === namaLower);
  const id = idTetap || (ada ? ada.id : (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)));
  const entri = { ...tpl, id, tanggal: tanggalWib(), ts: Date.now() };
  if (!await kvPut(env, "TEMPLATE:" + id, entri)) return null;
  return { entri, aksi: (idTetap || ada) ? "diupdate" : "ditambahkan" };
}

async function hapusTemplateKv(env, id) {
  try {
    if (!env.DATA) return false;
    await env.DATA.delete("TEMPLATE:" + id);
    return true;
  } catch { return false; }
}

// ---- Template bawaan (v2.9.8) ----
// 9 template dikte Asep 22 Nov 2026 (00:52–00:58 WIB) + 2 template
// starter (XL Edu SSH, by.U Opok SSH — dari template-starter-3.json,
// draf 21 Nov 2026, dari bahan grup) + 4 template Ilped (api.quipper.com
// + wpassets.kuncie.com, masing-masing SSH + Xray WS, dikte Asep
// 01:18–01:19 WIB; koreksi Asep 22 Nov 05:57 WIB: bug-nya
// wpassets.kuncie.com, BUKAN wp-assets.ovo.id (v2.9.10)) + 2 template
// by.U Opok 500mb (SSH PAYLOAD_PROXY_SNI + Xray WS, dikte Asep
// 01:20 WIB) + 2 template Iflix Timur (bug
// www.iflix.com, SSH PAYLOAD_PROXY_SNI + Xray WS, dikte Asep 01:22 WIB)
// + 1 template Iflix Barat TLS (Xray SSL_TLS, SNI live.iflix.com, dikte
// Asep 01:22 WIB; SSH-nya = "XL Iflix Barat", ganti nama dari "XL Iflix"
// karena isinya sama persis: SSH_SNI live.iflix.com port 443) + 1 template
// XL Conference WC (bug support.zoom.us, dikte Asep 01:23 WIB) + 1 template
// XL Conference Proxy SNI (versi SSH-nya, bug sama support.zoom.us,
// dikte Asep 01:24 WIB) + 4 template Edu Timur (V1: bug IP 104.17.3.81,
// SSH PAYLOAD_PROXY + Xray WS; V2: bug www.zenius.net, SSH
// PAYLOAD_PROXY_SNI + Xray WS; dikte Asep 01:25–01:26 WIB) + 1 template
// XL TikTok TLS (Xray SSL_TLS, SNI api24-normal.tiktokv.com; Asep
// 01:31 WIB: TikTok ada 2 varian — SSH SNI + Xray SNI).
// Starter "Tsel Ilped SSH" (SNI classroom.google.com) TIDAK ikut: Asep
// bilang Ilped cuma pakai 2 bug itu (01:19 WIB). Total 27 template.
// Dimasukkan ke KV lewat /seedtemplate (admin, perintah teks) — upsert
// menurut nama (simpanTemplate), jadi aman diulang dan tidak ganda.
// Bentuk entri = persis hasil wizard (field kosong = null).
function sshBawaan(patch) {
  return { host: null, port: null, payload: null, proxyHost: null, proxyPort: null, sni: null, enhanced: false, slowdns: false, dnsNameServer: null, dnsPublicKey: null, dnsUdpHost: null, dnsUdpPort: null, ...patch };
}
function xrayBawaan(patch) {
  return { targetHost: null, targetPort: null, sni: null, headerHost: null, payload: null, sshHost: null, sshPort: null, sshUser: null, sshPass: null, nameServer: null, publicKey: null, udpDnsHost: null, udpDnsPort: null, proxyHost: null, proxyPort: null, ...patch };
}
export const TEMPLATE_BAWAAN = [
  { nama: "XL Iflix Barat", operator: "xl", kategori: "nonton", tipe: "SSH", metode: "SSH_SNI", ssh: sshBawaan({ port: 443, sni: "live.iflix.com" }), xray: null },
  { nama: "XL Iflix Timur WS TLS", operator: "xl", kategori: "nonton", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY_SNI", ssh: sshBawaan({ port: 443, proxyHost: "www.iflix.com", proxyPort: 443, sni: "www.iflix.com" }), xray: null },
  { nama: "XL Conference WS TLS", operator: "xl", kategori: "conference", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY_SNI", ssh: sshBawaan({ port: 443, proxyHost: "support.zoom.us", proxyPort: 443, sni: "support.zoom.us" }), xray: null },
  { nama: "XL TikTok", operator: "xl", kategori: "sosmed", tipe: "SSH", metode: "SSH_SNI", ssh: sshBawaan({ port: 443, sni: "api24-normal.tiktokv.com" }), xray: null },
  { nama: "Axis WA", operator: "axis", kategori: "wa", tipe: "SSH", metode: "SSH_DIRECT", ssh: sshBawaan({ host: "listen.noice.id", port: 80, payload: "HEAD / HTTP/1.1[crlf]Host: listen.noice.id:80[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf][crlf]BMOVE / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf][crlf]" }), xray: null },
  { nama: "XL Edu Jabar", operator: "xl", kategori: "edu", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY", ssh: sshBawaan({ port: 80, proxyHost: "edu.ruangguru.com", proxyPort: 80, payload: "HEAD / HTTP/1.1[crlf]Host: edu.ruangguru.com:80[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf][crlf]BMOVE / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf][crlf]", enhanced: true }), xray: null },
  { nama: "XL Edu Timur Proxy", operator: "xl", kategori: "edu", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY", ssh: sshBawaan({ port: 80, proxyHost: "104.17.3.81", proxyPort: 80, enhanced: true }), xray: null },
  { nama: "XL Edu Timur V2 WS TLS", operator: "xl", kategori: "edu", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY_SNI", ssh: sshBawaan({ port: 443, proxyHost: "www.zenius.net", proxyPort: 443, sni: "www.zenius.net", enhanced: true }), xray: null },
  { nama: "XL Edu Direct", operator: "xl", kategori: "edu", tipe: "SSH", metode: "SSH_DIRECT", ssh: sshBawaan({ host: "162.159.140.147", port: 80, payload: "GET / HTTP/1.1[crlf]Host: edu.ruangguru.com[crlf][crlf]PATCH / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf][crlf][split]HTTP/ 69[crlf][crlf]" }), xray: null },
  { nama: "XL Vision+", operator: "xl", kategori: "nonton", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY", ssh: sshBawaan({ port: 80, proxyHost: "link.visionplus.id", proxyPort: 80, payload: "HEAD / HTTP/1.1[crlf]Host: link.visionplus.id:80[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf*2]BMOVE / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf*2][split]HTTP/1.1 200 OK[crlf*2]" }), xray: null },
  { nama: "XL Catchplay", operator: "xl", kategori: "nonton", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY", ssh: sshBawaan({ port: 80, proxyHost: "partner.catchplay.com", proxyPort: 80, payload: "GET / HTTP/1.1[crlf]Host: partner.catchplay.com[crlf][crlf]PATCH / HTTP/1.1[crlf]Host: [host][crlf]Connection: Keep-Alive[crlf]Service: SSH[crlf]ModeX: Bypass[crlf]Upgrade: websocket[crlf][crlf]" }), xray: null },
  { nama: "XL Edu SSH", operator: "xl", kategori: "edu", tipe: "SSH", metode: null, ssh: sshBawaan({ port: 80, sni: "edu.ruangguru.com", proxyHost: "edu.ruangguru.com", proxyPort: 80, payload: "HEAD / HTTP/1.1[crlf]Host: edu.ruangguru.com:80[crlf]Connection: Keep-Alive[crlf]User-Agent: [ua][crlf][crlf]BMOVE / HTTP/1.1[crlf]Host: [host][crlf]Upgrade: websocket[crlf][crlf]", enhanced: true }), xray: null },
  { nama: "by.U Opok SSH", operator: "byu", kategori: "opok", tipe: "SSH", metode: null, ssh: sshBawaan({ sni: "tdwcontent.telkomsel.com", payload: "GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]", proxyHost: "space.byu.id", proxyPort: 443 }), xray: null },
  { nama: "by.U Opok WS TLS", operator: "byu", kategori: "opok", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY_SNI", ssh: sshBawaan({ port: 443, proxyHost: "space.byu.id", proxyPort: 443, sni: "[host]" }), xray: null },
  { nama: "Tsel Ilped Proxy", operator: "telkomsel", kategori: "ilped", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY", ssh: sshBawaan({ port: 80, proxyHost: "api.quipper.com", proxyPort: 80 }), xray: null },
  { nama: "Tsel Ilped WS TLS", operator: "telkomsel", kategori: "ilped", tipe: "SSH", metode: "SSH_PAYLOAD_PROXY_SNI", ssh: sshBawaan({ port: 443, proxyHost: "wpassets.kuncie.com", proxyPort: 443, sni: "wpassets.kuncie.com" }), xray: null },
  { nama: "XL Spotify WC", operator: "xl", kategori: "musik", tipe: "XRAY", metode: "WC", ssh: null, xray: xrayBawaan({ targetHost: "investors.spotify.com", targetPort: 443 }) },
  { nama: "XL Conference WC", operator: "xl", kategori: "conference", tipe: "XRAY", metode: "WC", ssh: null, xray: xrayBawaan({ targetHost: "support.zoom.us", targetPort: 443 }) },
  { nama: "XL Vidio", operator: "xl", kategori: "nonton", tipe: "XRAY", metode: "WS", ssh: null, xray: xrayBawaan({ targetHost: "quiz.int.vidio.com", targetPort: 80 }) },
  { nama: "Tsel Ilped WS Quipper", operator: "telkomsel", kategori: "ilped", tipe: "XRAY", metode: "WS", ssh: null, xray: xrayBawaan({ targetHost: "api.quipper.com", targetPort: 443 }) },
  { nama: "Tsel Ilped WS Wpassets", operator: "telkomsel", kategori: "ilped", tipe: "XRAY", metode: "WS", ssh: null, xray: xrayBawaan({ targetHost: "wpassets.kuncie.com", targetPort: 443 }) },
  { nama: "by.U Opok WS", operator: "byu", kategori: "opok", tipe: "XRAY", metode: "WS", ssh: null, xray: xrayBawaan({ targetHost: "tdwcontent.telkomsel.com", targetPort: 443 }) },
  { nama: "XL Iflix Timur WS", operator: "xl", kategori: "nonton", tipe: "XRAY", metode: "WS", ssh: null, xray: xrayBawaan({ targetHost: "www.iflix.com", targetPort: 443 }) },
  { nama: "XL Iflix Barat TLS", operator: "xl", kategori: "nonton", tipe: "XRAY", metode: "SSL_TLS", ssh: null, xray: xrayBawaan({ targetPort: 443, sni: "live.iflix.com" }) },
  { nama: "XL TikTok TLS", operator: "xl", kategori: "sosmed", tipe: "XRAY", metode: "SSL_TLS", ssh: null, xray: xrayBawaan({ targetPort: 443, sni: "api24-normal.tiktokv.com" }) },
  { nama: "XL Edu Timur WS", operator: "xl", kategori: "edu", tipe: "XRAY", metode: "WS", ssh: null, xray: xrayBawaan({ targetHost: "104.17.3.81", targetPort: 443 }) },
  { nama: "XL Edu Timur V2 WS", operator: "xl", kategori: "edu", tipe: "XRAY", metode: "WS", ssh: null, xray: xrayBawaan({ targetHost: "www.zenius.net", targetPort: 443 }) },
];

// Masukkan TEMPLATE_BAWAAN ke KV (satu per satu, upsert menurut nama).
// Return daftar { nama, ok, aksi } — dipakai /seedtemplate.
export async function seedTemplateBawaan(env) {
  const hasil = [];
  for (const tpl of TEMPLATE_BAWAAN) {
    const r = await simpanTemplate(env, tpl);
    hasil.push({ nama: tpl.nama, ok: !!r, aksi: r ? r.aksi : "gagal" });
  }
  return hasil;
}

// ---- Feed update (KV key UPDATES, array maks 20, terbaru dulu) ----
async function ambilUpdatesKv(env) {
  const d = await kvGet(env, "UPDATES");
  return Array.isArray(d) ? d : [];
}

async function catatUpdate(env, teks) {
  if (!env.DATA) return;
  try {
    const arr = await ambilUpdatesKv(env);
    arr.unshift({ teks, tanggal: tanggalWib(), ts: Date.now() });
    await kvPut(env, "UPDATES", arr.slice(0, 20));
  } catch { /* abaikan */ }
}

// Kirim pengumuman ke semua pengguna tercatat (kecuali admin).
// Return jumlah yang berhasil terkirim; yang gagal (mis. blokir bot)
// dilewati diam-diam, tidak dilaporkan.
async function siarkanUpdate(env, teks) {
  if (!env.DATA) return 0;
  const keys = await kvList(env, "USER:");
  const adminId = adminChatId(env);
  let terkirim = 0;
  for (const k of keys) {
    const chatId = k.slice("USER:".length);
    if (adminId && chatId === adminId) continue;
    try {
      const r = await sendTelegram(env, chatId, teks);
      if (r && r.ok) terkirim++;
    } catch { /* abaikan */ }
  }
  return terkirim;
}

// Catatan bug untuk caption file hasil generate (dipakai generate utama
// dan konfirmasi /tambahconfig). Return "" bila bug tidak dikenal.
async function catatanBugUntuk(env, hasil) {
  if (hasil.adaInject && hasil.bug) {
    const info = await cariBugGabungan(env, hasil.bug);
    if (info) {
      return "\n\n🐛 Bug terdeteksi: <code>" + escapeHtml(hasil.bug) + "</code> (" + info.operatorLabel + " — " + info.kategoriLabel + ")";
    }
    return "";
  }
  // (v2.9.5) Hint "Belum ada bug/SNI" dihapus atas permintaan Asep.
  return "";
}

// Ringkasan terformat dari satu TunnelConfig untuk caption hasil generate
// (pola @XHMTunBot — pengguna bisa memverifikasi isi config sebelum impor).
// (v2.9.5) Xray tampil format CLASH (satu entri proxy, bisa ditempel ke
// bagian `proxies:`); SSH tetap format label lama, tanpa baris "Inject"
// (Asep: kalau tidak guna, hapus dari semuanya). Kredensial (Key/UUID,
// Password) DITAMPILKAN atas permintaan Asep: itu data akun pengirim
// sendiri yang dikembalikan ke DM-nya sendiri, dan file .dark yang
// dikirim bersamaan sudah berisi kredensial yang sama.
// Nilai string di-quote ganda gaya YAML (escape \ dan ").
function yamlStr(v) {
  return "\"" + String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
}
export function ringkasanConfig(c) {
  if (!c || typeof c !== "object") return "";
  const sub = c.sshTunnelConfig || c.sshDnsttTunnelConfig || c.vmessTunnelConfig || c.vlessTunnelConfig || c.trojanTunnelConfig || c.shadowsocksTunnelConfig;
  const ssh = sub?.sshConfig;
  const v2 = sub?.v2rayConfig;
  const dnstt = sub?.dnsttConfig;
  const inj = sub?.injectConfig;
  const tipe = String(c.type || "").toUpperCase();
  // --- Xray: blok Clash (v2rayConfig ada) ---
  if (v2) {
    const adalahSs = tipe === "SHADOWSOCKS";
    const adalahTrojan = tipe === "TROJAN";
    const adalahVmess = tipe === "VMESS";
    const trans = v2.transportNetwork ? String(v2.transportNetwork) : "";
    const jaringan = trans === "Websocket" ? "ws" : trans === "gRPC" ? "grpc" : trans === "TCP" ? "tcp" : (trans ? trans.toLowerCase() : "ws");
    const tlsAktif = v2.tls === true;
    const y = [];
    y.push("- name: " + yamlStr(c.name || ""));
    y.push("  type: " + (adalahSs ? "ss" : adalahTrojan ? "trojan" : adalahVmess ? "vmess" : "vless"));
    y.push("  server: " + yamlStr(v2.host || ""));
    y.push("  port: " + (v2.port ?? ""));
    if (!adalahTrojan && !adalahSs) y.push("  uuid: " + yamlStr(v2.uuid || ""));
    if (adalahVmess) { y.push("  alterId: 0"); y.push("  cipher: auto"); }
    if (adalahSs) {
      if (c._ssMethod) y.push("  cipher: " + yamlStr(c._ssMethod));
      y.push("  password: " + yamlStr(v2.uuid || ""));
    }
    if (adalahTrojan) y.push("  password: " + yamlStr(v2.uuid || ""));
    if (!adalahSs) {
      y.push("  network: " + jaringan);
      y.push("  tls: " + (tlsAktif ? "true" : "false"));
      y.push("  udp: true");
      if (jaringan === "ws" && v2.wsPath) y.push("  ws-path: " + yamlStr(v2.wsPath));
      if (jaringan === "ws" && v2.wsHeaderHost) { y.push("  ws-headers:"); y.push("    Host: " + yamlStr(v2.wsHeaderHost)); }
      if (jaringan === "grpc" && v2.grpcServiceName) y.push("  grpc-service-name: " + yamlStr(v2.grpcServiceName));
      if (tlsAktif && v2.serverNameIndication) {
        if (adalahTrojan) y.push("  sni: " + yamlStr(v2.serverNameIndication));
        else y.push("  servername: " + yamlStr(v2.serverNameIndication));
      }
    } else {
      y.push("  udp: true");
    }
    // Info inject tanpa padanan Clash — jadi komentar (tetap valid YAML).
    if (inj?.proxyHost) y.push("  # proxy: " + inj.proxyHost + (inj.proxyPort ? ":" + inj.proxyPort : ""));
    if (dnstt || inj?.mode === "DNSTT") {
      const ns = dnstt?.serverName || inj?.dnsttServerName || "";
      y.push("  # slowdns: " + (ns || "ya"));
    }
    // SNI/bug (inject) yang beda dari TLS SNI — mis. jalur generik WC:
    // servername = domain server, tapi inject SNI = host WC. Bila sama
    // (metode WC — keduanya host WC) atau tanpa inject, nilainya sudah
    // tampil di servername:/Host: di atas, jadi tidak ditambah lagi.
    if (inj?.serverNameIndication && inj.serverNameIndication !== v2.serverNameIndication) {
      y.push("  # sni/bug: " + inj.serverNameIndication);
    }
    return "📋 <b>Rincian Config</b>\n<pre>" + y.map(escapeHtml).join("\n") + "</pre>";
  }
  // --- SSH: format label lama, tanpa baris "Inject" (v2.9.5) ---
  const baris = [];
  const tambah = (label, nilai) => {
    if (nilai === undefined || nilai === null || nilai === "") return;
    baris.push(String(label).padEnd(8, " ") + " : " + String(nilai));
  };
  tambah("Protokol", c.type || "");
  if (ssh) {
    tambah("Host", ssh.host);
    tambah("Port", ssh.port);
    tambah("Username", ssh.username);
    tambah("Password", ssh.password);
  }
  // Mode WC (v2.6): SNI inject = bug + "." + host server. Terdeteksi
  // bila SNI inject diakhiri "." + host server config ini.
  const sniInject = inj?.serverNameIndication || "";
  const hostServer = ssh?.host || v2?.host || "";
  const adalahWc = !!(inj && sniInject && hostServer && sniInject.endsWith("." + hostServer));
  tambah("SNI/Bug", sniInject ? sniInject + (adalahWc ? " (WC)" : "") : "");
  if (inj) {
    if (inj.proxyHost) tambah("Proxy", inj.proxyHost + (inj.proxyPort ? ":" + inj.proxyPort : ""));
    if (inj.payload !== undefined) tambah("Payload", inj.payload === "" ? "Tidak ada" : (inj.payloadEnhanced ? "Ada (Enhanced)" : "Ada"));
    if (adalahWc) tambah("Mode", "WC (wildcard)");
  }
  // SlowDNS (v2.7): tipe SSH_DNSTT atau inject mode DNSTT.
  if (dnstt || inj?.mode === "DNSTT") {
    const ns = dnstt?.serverName || inj?.dnsttServerName || "";
    tambah("SlowDNS", "Ya" + (ns ? " (Name Server: " + ns + ")" : ""));
  }
  if (!baris.length) return "";
  return "📋 <b>Rincian Config</b>\n<pre>" + baris.map(escapeHtml).join("\n") + "</pre>";
}

// ================= TEMPLATE CONFIG (v2.7) =================
// Template = setting config tanpa akun. Field template yang terisi
// MENANG atas hasil auto-detect; field kosong diambil dari akun pengguna.

// ---- Pemilih METODE di awal wizard Template Config (v2.9.0) ----
// Sebelum bikin template, admin memilih dulu METODE-nya (per tipe),
// supaya setting dan hasil generate sesuai per metode. `id` = nilai
// `template.metode` yang disimpan di KV; `label` = teks tombol.
// Daftar ini dari Asep (21 Nov 2026) + tambahan asisten untuk mengisi
// celah (XRAY gRPC, XRAY PROXY, SSH + PAYLOAD, SSH + PROXY).
export const METODE_TEMPLATE = {
  // (v2.9.5 koreksi) Label pendek tanpa prefix tipe — panel sudah
  // menyebut tipenya ("Template Config Baru (SSH/Xray)"), dan label
  // panjang terpotong di tombol ("SSH + PAYLOAD + PRO..." ganda).
  SSH: [
    { id: "SSH_SNI", label: "SNI" },
    { id: "SSH_PAYLOAD_PROXY", label: "WS" }, // (v2.9.8) Asep 01:32 WIB: "ssh payload proxy jadi ssh ws"
    { id: "SSH_PAYLOAD_PROXY_SNI", label: "WS TLS" }, // (v2.9.8) Asep 01:32 WIB: "ssh payload proxy sni jadi ssh ws tls"
    { id: "SSH_DIRECT", label: "DIRECT" },
    { id: "SSH_UDP", label: "UDP" },
    { id: "SSH_SLOWDNS", label: "SLOWDNS" },
    { id: "SSH_PAYLOAD", label: "PAYLOAD" },
    { id: "SSH_PROXY", label: "PROXY" },
  ],
  XRAY: [
    { id: "WS", label: "WS" },
    { id: "WC", label: "WC" },
    { id: "SSL_TLS", label: "SSL/TLS" },
    { id: "WC_TLS", label: "WC/TLS" },
    { id: "WC_ONERING", label: "WC ONERING" },
    { id: "XRAY_PAYLOAD", label: "PAYLOAD" },
    { id: "XRAY_PAYLOAD_PROXY", label: "PAYLOAD + PROXY" },
    { id: "XRAY_DNS", label: "OVER DNS" },
    { id: "XRAY_HTTP", label: "OVER HTTP" },
    { id: "XRAY_GRPC", label: "gRPC" },
    { id: "XRAY_PROXY", label: "PROXY" },
  ],
};

// Urutan tahap wizard per metode (tahap field KHUSUS metode itu saja).
// Tahap "ssh_proxyport"/"xray_proxyport" hanya muncul bila proxy diisi
// host saja (tanpa port) — dilewati tahapBerikutTemplate bila proxy
// kosong / port sudah terisi.
export const TAHAP_METODE_TEMPLATE = {
  // (v2.9.5) ssh_port jadi tahap PERTAMA semua metode SSH kecuali
  // DIRECT (port DIRECT sudah dari tahap ssh_bug format host:port).
  SSH_SNI: ["ssh_port", "ssh_sni"],
  SSH_PAYLOAD_PROXY: ["ssh_port", "ssh_proxy", "ssh_proxyport", "ssh_payload", "ssh_enhanced"],
  SSH_PAYLOAD_PROXY_SNI: ["ssh_port", "ssh_proxy", "ssh_proxyport", "ssh_sni", "ssh_payload", "ssh_enhanced"],
  SSH_DIRECT: ["ssh_bug", "ssh_payload", "ssh_enhanced"],
  SSH_UDP: ["ssh_port"],
  SSH_SLOWDNS: ["ssh_port", "ssh_sni", "ssh_ns", "ssh_pubkey", "ssh_udphost", "ssh_udpport"],
  SSH_PAYLOAD: ["ssh_port", "ssh_payload", "ssh_enhanced"],
  SSH_PROXY: ["ssh_port", "ssh_proxy", "ssh_proxyport"],
  WS: ["xray_target", "xray_domain", "xray_payload"],
  WC: ["xray_target", "xray_payload"], // (v2.9.5 koreksi) domain WC selalu dari host akun — wizard tidak lagi menanyakan domain
  SSL_TLS: ["xray_server", "xray_sni", "xray_payload"],
  WC_TLS: ["xray_bug", "xray_domain", "xray_payload"],
  WC_ONERING: ["xray_bugserver", "xray_host", "xray_payload"],
  XRAY_PAYLOAD: ["xray_target", "xray_sni", "xray_header", "xray_payload"],
  XRAY_PAYLOAD_PROXY: ["xray_target", "xray_sni", "xray_header", "xray_payload", "xray_proxy", "xray_proxyport"],
  XRAY_DNS: ["xray_target", "xray_sni", "xray_header", "xray_ns", "xray_pubkey", "xray_udphost", "xray_udpport"],
  XRAY_HTTP: ["xray_target", "xray_sni", "xray_proxy", "xray_proxyport", "xray_payload"],
  XRAY_GRPC: ["xray_target", "xray_sni", "xray_header", "xray_payload"],
  XRAY_PROXY: ["xray_target", "xray_sni", "xray_header", "xray_proxy", "xray_proxyport"],
};

// Tahap wizard LAMA (v2.7–v2.8.2, tanpa metode) — cadangan saja bila
// state wizard tanpa `metode` (wizard baru selalu memilih metode).
const TAHAP_LEGACY_SSH = ["ssh_port", "ssh_payload", "ssh_proxy", "ssh_proxyport", "ssh_sni", "ssh_enhanced", "ssh_slowdns", "ssh_ns", "ssh_pubkey", "ssh_udphost", "ssh_udpport"];
const TAHAP_LEGACY_XRAY = ["xray_target", "xray_sni", "xray_header", "xray_payload", "xray_ssh", "xray_ns", "xray_pubkey", "xray_udphost", "xray_udpport"];

// Label tombol metode untuk satu tipe+id; id tak dikenal -> id apa adanya.
export function labelMetode(tipe, id) {
  const m = (METODE_TEMPLATE[tipe] || []).find((e) => e.id === id);
  return m ? m.label : String(id || "-");
}

// Daftar tahap wizard untuk state ini (per metode; tanpa metode -> legacy).
export function daftarTahapMetode(st) {
  if (st?.metode && TAHAP_METODE_TEMPLATE[st.metode]) return TAHAP_METODE_TEMPLATE[st.metode];
  if (st?.tipe === "SSH") return TAHAP_LEGACY_SSH;
  if (st?.tipe === "XRAY") return TAHAP_LEGACY_XRAY;
  return [];
}

// Tahap pertama wizard (atau "ringkasan" bila metode tanpa tahap, mis. SSH_UDP).
export function tahapPertamaTemplate(st) {
  const daftar = daftarTahapMetode(st);
  for (const s of daftar) {
    if (s === "ssh_proxyport" || s === "xray_proxyport") continue;
    return s;
  }
  return "ringkasan";
}

// Tahap setelah `dari` dalam urutan metode ini (atau "ringkasan").
// Tahap port proxy dilewati bila proxy kosong / port sudah terisi.
export function tahapBerikutTemplate(st, dari) {
  const daftar = daftarTahapMetode(st);
  const i = daftar.indexOf(dari);
  if (i < 0) return st?.mode === "manual" ? "nama" : "ringkasan";
  for (let j = i + 1; j < daftar.length; j++) {
    const s = daftar[j];
    if (s === "ssh_proxyport" && (!st.ssh?.proxyHost || st.ssh.proxyPort != null)) continue;
    if (s === "xray_proxyport" && (!st.xray?.proxyHost || st.xray.proxyPort != null)) continue;
    return s;
  }
  return st?.mode === "manual" ? "nama" : "ringkasan";
}

// SlowDNS Xray aktif bila name server + public key sama-sama terisi.
export function xraySlowdnsAktif(t) {
  const x = t?.xray || {};
  return !!(String(x.nameServer || "").trim() && String(x.publicKey || "").trim());
}

// Ganti placeholder payload template: [host] = host server,
// [bug] = SNI/bug efektif, [ua] = User-Agent standar.
function isiPlaceholderPayload(tpl, host, bug) {
  return String(tpl || "")
    .replaceAll("[host]", host || "")
    .replaceAll("[ua]", UA_STANDAR)
    .replaceAll("[bug]", bug || "");
}

// v2.9.1: placeholder "[host]" untuk SNI template — SNI ngikutin host
// server akun pengguna saat generate. Selain "[host]" persis, nilai
// dikembalikan apa adanya (null tetap null).
export function isiPlaceholderHost(nilai, host) {
  return String(nilai).toLowerCase() === "[host]" ? (host || "") : nilai;
}

// Cari info bug untuk SNI efektif + terapkan aturan WC (v2.6) bila
// bug ber-tag wc. Return SNI efektif (WC host atau bug asli).
async function sniEfektifTemplate(env, bug, serverHost) {
  if (!bug) return "";
  let info = null;
  try { info = env ? await cariBugGabungan(env, bug) : cariBug(bug); } catch { info = cariBug(bug); }
  if (info && dukungWildcard(info.note)) return hostWildcard(bug, serverHost);
  return bug;
}

// Pastikan injectConfig ada di sub config; bila belum ada, buat dengan
// SNI awal + payload standar aplikasi (payload selalu ditimpa pemanggil).
function pastikanInject(sub, sniAwal, type) {
  let inj = sub.injectConfig;
  if (!inj) {
    inj = injectConfigAktif(sniAwal || "", type);
    sub.injectConfig = inj;
  }
  return inj;
}

// Payload template: terisi -> isi placeholder; kosong -> `""`
// (aturan v2.8.2 DIKEMBALIKAN di v2.9.7: omit di v2.9.5 ternyata membuat
// aplikasi isi ulang payload default SSH-nya sendiri — baris payload
// tetap tampil berisi Service: SSH di config VLESS. `""` = baris
// kosong; kolom tidak bisa hilang total selama inject aktif, temuan
// decompile: baris payload selalu digambar tanpa kondisi `if`.)
// (v2.9.8: aturan `""` di atas kini hanya untuk Xray — untuk SSH,
// template tanpa payload pakai PAYLOAD_SSH_DEFAULT di bawah.)
function isiPayloadTemplate(inj, payloadTpl, host, sni) {
  if (payloadTpl) inj.payload = isiPlaceholderPayload(payloadTpl, host, sni);
  else inj.payload = "";
}

// (v2.9.8) Payload default untuk template SSH tanpa payload — perintah
// Asep 22 Nov 2026 01:08 WIB ("kalau yang gak ada payload nya pakai
// ini aja"). Sama dengan PAYLOAD_METODE.sshpayload.template.
// [host] = host server akun, [ua] = User-Agent standar.
// Urutan isi payload SSH template: payload template > enhanced > default.
export const PAYLOAD_SSH_DEFAULT = "GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]";
function isiPayloadSshTemplate(inj, t, host, bug) {
  if (t.payload) inj.payload = isiPlaceholderPayload(t.payload, host, bug);
  else if (t.enhanced) inj.payload = isiPlaceholderPayload(PAYLOAD_METODE.enhanced.template, host, bug);
  else inj.payload = isiPlaceholderPayload(PAYLOAD_SSH_DEFAULT, host, bug);
}

// Terapkan template SSH ke satu config SSH hasil parsePesan.
// Template tanpa `metode` -> jalur generik v2.8.2 (kompatibilitas
// mundur); template bermetode -> cabang per metode (v2.9.0).
async function terapkanTemplateSsh(env, cfg, template, bugAkun) {
  // v2.9.1: SNI template "[host]" -> host server akun pengguna.
  // Resolusi di sini, sebelum cabang metode/generik memakai t.sni;
  // salinan dangkal saja — objek template dari KV jangan dimutasi.
  const hostAkun = cfg.sshTunnelConfig?.sshConfig?.host || "";
  const sni = isiPlaceholderHost(template.ssh?.sni, hostAkun);
  const tpl = sni !== template.ssh?.sni ? { ...template, ssh: { ...(template.ssh || {}), sni } } : template;
  if (tpl.metode) return terapkanTemplateSshMetode(env, cfg, tpl, bugAkun);
  return terapkanTemplateSshGenerik(env, cfg, tpl, bugAkun);
}

// Terapkan template SSH bermetode (v2.9.0). Mengubah cfg di tempat.
async function terapkanTemplateSshMetode(env, cfg, template, bugAkun) {
  const ssh = cfg.sshTunnelConfig?.sshConfig;
  if (!ssh) return cfg;
  const t = template.ssh || {};
  const m = template.metode;
  const sub = cfg.sshTunnelConfig;

  // (v2.9.5) Port template berlaku di SEMUA cabang metode SSH —
  // termasuk SSH_UDP dan cabang early-return lain; port kosong/null
  // = pakai port akun pengguna. (Baris sama di SSH_DIRECT/generik
  // dibiarkan sebagai duplikasi tak berbahaya; generik juga dipanggil
  // langsung dari jalur legacy tanpa metode.)
  if (t.port) ssh.port = t.port;

  // SSH UDP: plain SSH tanpa inject — hapus inject apa pun dari parse;
  // abaikan bug/SNI/payload/proxy apa pun.
  if (m === "SSH_UDP") {
    delete sub.injectConfig;
    return cfg;
  }

  // SSH DIRECT: host/port SSH dari bug template (user/pass tetap dari
  // akun pengguna); inject DIRECT, tanpa SNI, tanpa proxy.
  // (v2.9.8) [host] = host server akun, [bug] = bug template — host akun
  // disimpan dulu sebelum ssh.host ditimpa bug (sebelumnya [host] ikut
  // jadi bug, padahal Host kedua payload DIRECT harus server akun).
  if (m === "SSH_DIRECT") {
    const hostAkun = ssh.host;
    if (t.host) ssh.host = t.host;
    if (t.port) ssh.port = t.port;
    const butuh = !!(t.payload || t.enhanced || sub.injectConfig);
    if (butuh) {
      const inj = pastikanInject(sub, "", "SSH");
      inj.serverNameIndication = "";
      inj.mode = "DIRECT";
      isiPayloadSshTemplate(inj, t, hostAkun, t.host || "");
      delete inj.proxyHost;
      delete inj.proxyPort;
    }
    return cfg;
  }

  // SSH + PAYLOAD + PROXY: inject PROXY, tanpa SNI.
  if (m === "SSH_PAYLOAD_PROXY") {
    const butuh = !!(t.proxyHost || t.payload || t.enhanced || sub.injectConfig);
    if (!butuh) return cfg;
    const inj = pastikanInject(sub, "", "SSH");
    inj.mode = "PROXY";
    inj.serverNameIndication = "";
    if (t.proxyHost) {
      inj.proxyHost = t.proxyHost;
      if (t.proxyPort) inj.proxyPort = t.proxyPort;
    }
    // (v2.9.8) bug untuk payload enhanced = proxy (dulu "" -> "Host: :80"
    // rusak bila template enhanced tanpa payload, mis. Edu Timur).
    isiPayloadSshTemplate(inj, t, ssh.host, t.proxyHost || "");
    return cfg;
  }

  // SSH + PAYLOAD: inject DIRECT; SNI dari bug akun bila ada (fallback
  // perilaku lama), tanpa proxy.
  if (m === "SSH_PAYLOAD") {
    const bugAsli = bugAkun || sub.injectConfig?.serverNameIndication || null;
    const sniEfektif = await sniEfektifTemplate(env, bugAsli, ssh.host);
    const butuh = !!(sniEfektif || t.payload || t.enhanced || sub.injectConfig);
    if (!butuh) return cfg;
    const inj = pastikanInject(sub, sniEfektif, "SSH");
    inj.mode = "DIRECT";
    if (sniEfektif) inj.serverNameIndication = sniEfektif;
    isiPayloadSshTemplate(inj, t, ssh.host, sniEfektif);
    return cfg;
  }

  // SSH + PROXY: inject PROXY, tanpa payload, tanpa SNI.
  if (m === "SSH_PROXY") {
    const butuh = !!(t.proxyHost || sub.injectConfig);
    if (!butuh) return cfg;
    const inj = pastikanInject(sub, "", "SSH");
    inj.mode = "PROXY";
    inj.serverNameIndication = "";
    if (t.proxyHost) {
      inj.proxyHost = t.proxyHost;
      if (t.proxyPort) inj.proxyPort = t.proxyPort;
    }
    isiPayloadSshTemplate(inj, t, ssh.host, t.proxyHost || ""); // (v2.9.8) bug = proxy (bukan ""), sama seperti PAYLOAD_PROXY
    return cfg;
  }

  // SSH_SNI / SSH_PAYLOAD_PROXY_SNI / SSH_SLOWDNS = perilaku generik
  // v2.8.2 (sudah tepat: DIRECT_SNI / PROXY_SNI / DNSTT).
  return terapkanTemplateSshGenerik(env, cfg, template, bugAkun);
}

// Terapkan template SSH GENERIK (v2.8.2) — dipakai template lama tanpa
// `metode` dan metode yang perilakunya sama dengan generik.
// Mengubah cfg di tempat, return cfg yang sama.
async function terapkanTemplateSshGenerik(env, cfg, template, bugAkun) {
  const ssh = cfg.sshTunnelConfig?.sshConfig;
  if (!ssh) return cfg;
  const t = template.ssh || {};
  if (t.port) ssh.port = t.port;
  // Bug/SNI efektif: SNI template > bug akun > SNI inject lama.
  const bugAsli = t.sni || bugAkun || cfg.sshTunnelConfig.injectConfig?.serverNameIndication || null;
  const sniEfektif = await sniEfektifTemplate(env, bugAsli, ssh.host);
  const butuhInject = !!(sniEfektif || t.payload || t.proxyHost);
  let inj = cfg.sshTunnelConfig.injectConfig;
  if (butuhInject && !inj) {
    inj = injectConfigAktif(sniEfektif || "", "SSH", {
      metode: t.enhanced ? "enhanced" : undefined,
      sshHost: ssh.host,
      dnstt: t.slowdns ? { udpDnsHost: t.dnsUdpHost, udpDnsPort: t.dnsUdpPort, serverName: t.dnsNameServer, publicKey: t.dnsPublicKey } : undefined,
    });
    cfg.sshTunnelConfig.injectConfig = inj;
  }
  if (inj) {
    if (sniEfektif) inj.serverNameIndication = sniEfektif;
    // Payload template > enhanced > default Asep (v2.9.8 — "" v2.9.7
    // hanya tinggal untuk Xray).
    isiPayloadSshTemplate(inj, t, ssh.host, sniEfektif);
    if (t.proxyHost) {
      inj.proxyHost = t.proxyHost;
      if (t.proxyPort) inj.proxyPort = t.proxyPort;
      inj.mode = "PROXY_SNI";
    }
    if (t.slowdns) {
      inj.mode = "DNSTT";
      inj.dnsttUdpDnsHost = t.dnsUdpHost || "1.1.1.1";
      inj.dnsttUdpDnsPort = t.dnsUdpPort || 53;
      inj.dnsttServerName = t.dnsNameServer || "";
      inj.dnsttPublicKey = t.dnsPublicKey || "";
    }
  }
  // SlowDNS: ubah tipe jadi SSH_DNSTT + dnsttConfig.
  if (t.slowdns) {
    const dnstt = {
      udpDnsHost: t.dnsUdpHost || "1.1.1.1",
      udpDnsPort: t.dnsUdpPort || 53,
      serverName: t.dnsNameServer || "",
      publicKey: t.dnsPublicKey || "",
    };
    const sub = { sshConfig: ssh, dnsttConfig: dnstt };
    if (inj) sub.injectConfig = inj;
    cfg.type = "SSH_DNSTT";
    cfg.sshDnsttTunnelConfig = sub;
    delete cfg.sshTunnelConfig;
  }
  return cfg;
}

// Terapkan template Xray ke satu config V2Ray hasil parsePesan.
// Akun SSH di template Xray DISIMPAN tapi TIDAK dipakai di config
// (jangan campur sshTunnelConfig ke config V2Ray).
// Template tanpa `metode` -> jalur generik v2.8.2 (kompatibilitas
// mundur); template bermetode -> cabang per metode (v2.9.0).
async function terapkanTemplateXray(env, cfg, template, bugAkun) {
  // v2.9.1: SNI / Header Host template "[host]" -> host server akun
  // pengguna (xray_domain menulis keduanya). Resolusi di sini, sebelum
  // cabang metode/generik memakai t.sni / t.headerHost; salinan dangkal
  // saja — objek template dari KV jangan dimutasi.
  const subKey = ["vmessTunnelConfig", "vlessTunnelConfig", "trojanTunnelConfig", "shadowsocksTunnelConfig"].find((k) => cfg[k]);
  const hostAkun = subKey ? cfg[subKey].v2rayConfig?.host || "" : "";
  const sni = isiPlaceholderHost(template.xray?.sni, hostAkun);
  const headerHost = isiPlaceholderHost(template.xray?.headerHost, hostAkun);
  const tpl = (sni !== template.xray?.sni || headerHost !== template.xray?.headerHost)
    ? { ...template, xray: { ...(template.xray || {}), sni, headerHost } }
    : template;
  if (tpl.metode) return terapkanTemplateXrayMetode(env, cfg, tpl, bugAkun);
  return terapkanTemplateXrayGenerik(env, cfg, tpl, bugAkun);
}

// Terapkan template Xray bermetode (v2.9.0). Mengubah cfg di tempat.
async function terapkanTemplateXrayMetode(env, cfg, template, bugAkun) {
  const subKey = ["vmessTunnelConfig", "vlessTunnelConfig", "trojanTunnelConfig", "shadowsocksTunnelConfig"].find((k) => cfg[k]);
  if (!subKey) return cfg;
  const v2 = cfg[subKey].v2rayConfig;
  if (!v2) return cfg;
  const t = template.xray || {};
  const m = template.metode;
  const sub = cfg[subKey];

  // WC: SNI/header = bug + "." + domain — SELALU, bukan cuma bila bug
  // ber-tag wc (itu bedanya dengan aturan WC generik v2.6/v2.8.2).
  // (v2.9.5 koreksi) domain SELALU dari host akun pengguna — template
  // lama yang menyimpan xray.sni = bug diabaikan di cabang ini (kalau
  // tidak, bug == domain dan hostWildcard tidak bisa memperbaikinya).
  // hostWildcard tidak menggandakan bila bug == domain.
  if (m === "WC") {
    const hostAkun = v2.host || "";
    const target = t.targetHost || "";
    const wc = hostWildcard(target, hostAkun);
    if (!wc) return cfg;
    if (t.targetHost) v2.host = t.targetHost;
    if (t.targetPort) v2.port = t.targetPort;
    v2.wsHeaderHost = wc;
    v2.serverNameIndication = wc;
    const inj = pastikanInject(sub, wc, cfg.type);
    inj.serverNameIndication = wc;
    inj.mode = "DIRECT_SNI";
    isiPayloadTemplate(inj, t.payload, v2.host, wc);
    return cfg;
  }

  // SSL/TLS: server = domain (host+port template), TLS SNI = bug,
  // inject SNI = bug apa adanya (tanpa transformasi WC).
  if (m === "SSL_TLS") {
    const bug = t.sni || "";
    if (t.targetHost) v2.host = t.targetHost;
    if (t.targetPort) v2.port = t.targetPort;
    if (t.headerHost) v2.wsHeaderHost = t.headerHost;
    if (bug) v2.serverNameIndication = bug;
    const butuh = !!(bug || t.payload || sub.injectConfig);
    if (!butuh) return cfg;
    const inj = pastikanInject(sub, bug, cfg.type);
    inj.serverNameIndication = bug;
    inj.mode = "DIRECT_SNI";
    isiPayloadTemplate(inj, t.payload, v2.host, bug);
    return cfg;
  }

  // WC/TLS: SNI/header = bug + "." + domain; host server = domain.
  // (v2.9.5) domain fallback ke host akun; hostWildcard anti-ganda.
  if (m === "WC_TLS") {
    const hostAkun = v2.host || "";
    const bug = t.targetHost || "";
    const domain = t.sni || hostAkun || "";
    const wc = hostWildcard(bug, domain);
    if (domain) v2.host = domain;
    if (wc) {
      v2.wsHeaderHost = wc;
      v2.serverNameIndication = wc;
    }
    const butuh = !!(wc || t.payload || sub.injectConfig);
    if (!butuh) return cfg;
    const inj = pastikanInject(sub, wc, cfg.type);
    if (wc) inj.serverNameIndication = wc;
    inj.mode = "DIRECT_SNI";
    isiPayloadTemplate(inj, t.payload, v2.host, wc);
    return cfg;
  }

  // WC ONERING: SNI = "onering:" + host + ":" + bug; port default 443
  // bila target tanpa port; transport websocket.
  if (m === "WC_ONERING") {
    const bug = t.targetHost || "";
    const host = t.headerHost || "";
    const sni = bug && host ? "onering:" + host + ":" + bug : "";
    if (!sni) return cfg;
    v2.host = bug;
    v2.port = t.targetPort || 443;
    v2.wsHeaderHost = host;
    v2.serverNameIndication = sni;
    v2.transportNetwork = "Websocket";
    const inj = pastikanInject(sub, sni, cfg.type);
    inj.serverNameIndication = sni;
    inj.mode = "DIRECT_SNI";
    isiPayloadTemplate(inj, t.payload, v2.host, sni);
    return cfg;
  }

  // XRAY + PAYLOAD + PROXY / XRAY PROXY: generik + proxy. Mode
  // PROXY_SNI bila SNI template terisi, else PROXY (tanpa SNI).
  if (m === "XRAY_PAYLOAD_PROXY" || m === "XRAY_PROXY") {
    const out = await terapkanTemplateXrayGenerik(env, cfg, template, bugAkun);
    if (t.proxyHost) {
      const adaInj = !!sub.injectConfig;
      const inj = pastikanInject(sub, t.sni || "", cfg.type);
      if (!adaInj) inj.payload = ""; // payload kosong (v2.9.7) — bukan default SSH aplikasi
      inj.proxyHost = t.proxyHost;
      if (t.proxyPort) inj.proxyPort = t.proxyPort;
      if (t.sni) inj.mode = "PROXY_SNI";
      else { inj.mode = "PROXY"; inj.serverNameIndication = ""; }
      if (m === "XRAY_PROXY") inj.payload = ""; // metode ini tanpa payload (v2.9.7) — kosong, bukan default SSH
    }
    return out;
  }

  // XRAY OVER HTTP (tebakan definisi asisten — Asep tidak merinci):
  // Xray via HTTP proxy. Mode PROXY_SNI bila SNI terisi, else PROXY
  // (tanpa SNI); payload template.
  if (m === "XRAY_HTTP") {
    if (t.targetHost) v2.host = t.targetHost;
    if (t.targetPort) v2.port = t.targetPort;
    if (t.sni) v2.serverNameIndication = t.sni;
    const butuh = !!(t.proxyHost || t.sni || t.payload || sub.injectConfig);
    if (!butuh) return cfg;
    const inj = pastikanInject(sub, t.sni || "", cfg.type);
    if (t.proxyHost) {
      inj.proxyHost = t.proxyHost;
      if (t.proxyPort) inj.proxyPort = t.proxyPort;
    }
    if (t.sni) { inj.mode = "PROXY_SNI"; inj.serverNameIndication = t.sni; }
    else { inj.mode = "PROXY"; inj.serverNameIndication = ""; }
    isiPayloadTemplate(inj, t.payload, v2.host, t.sni || "");
    return cfg;
  }

  // XRAY gRPC: seperti WS (generik) tapi transport gRPC.
  if (m === "XRAY_GRPC") {
    const out = await terapkanTemplateXrayGenerik(env, cfg, template, bugAkun);
    out[subKey].v2rayConfig.transportNetwork = "gRPC";
    return out;
  }

  // WS / XRAY_PAYLOAD / XRAY_DNS = perilaku generik v2.8.2 (sudah
  // tepat: DIRECT_SNI / payload "" / DNSTT untuk SlowDNS).
  return terapkanTemplateXrayGenerik(env, cfg, template, bugAkun);
}

// Terapkan template Xray GENERIK (v2.8.2) — dipakai template lama tanpa
// `metode` dan metode yang perilakunya sama dengan generik.
// Akun SSH di template Xray DISIMPAN tapi TIDAK dipakai di config
// (jangan campur sshTunnelConfig ke config V2Ray).
async function terapkanTemplateXrayGenerik(env, cfg, template, bugAkun) {
  const subKey = ["vmessTunnelConfig", "vlessTunnelConfig", "trojanTunnelConfig", "shadowsocksTunnelConfig"].find((k) => cfg[k]);
  if (!subKey) return cfg;
  const v2 = cfg[subKey].v2rayConfig;
  if (!v2) return cfg;
  const t = template.xray || {};
  const hostAkun = v2.host; // Host server akun sebelum target template
  // menimpanya — basis WC (jalur auto pakai v2rayConfig.host).
  if (t.targetHost) v2.host = t.targetHost;
  if (t.targetPort) v2.port = t.targetPort;
  if (t.sni) v2.serverNameIndication = t.sni;
  if (t.headerHost) v2.wsHeaderHost = t.headerHost;
  // SNI inject = BUG, bukan SNI template (v2.8.2): TLS SNI
  // (v2.serverNameIndication) = server; inject SNI = bug — target
  // template (front/bug) > bug akun. Bila tidak ada bug sama sekali,
  // inject SNI jatuh ke SNI template supaya inject tidak kehilangan SNI.
  const bugAsli = t.targetHost || bugAkun || v2.serverNameIndication || null;
  const sniEfektif = await sniEfektifTemplate(env, bugAsli, t.sni || v2.serverNameIndication || hostAkun);
  const slowdns = xraySlowdnsAktif(template);
  const butuhInject = !!(sniEfektif || t.payload || slowdns);
  let inj = cfg[subKey].injectConfig;
  if (butuhInject && !inj) {
    inj = injectConfigAktif(sniEfektif || "", cfg.type, {
      dnstt: slowdns ? { udpDnsHost: t.udpDnsHost, udpDnsPort: t.udpDnsPort, serverName: t.nameServer, publicKey: t.publicKey } : undefined,
    });
    cfg[subKey].injectConfig = inj;
  }
  if (inj) {
    if (sniEfektif) inj.serverNameIndication = sniEfektif;
    // Template dipakai: payload kosong = `""` (v2.9.7, aturan v2.8.2
    // dikembalikan: omit di v2.9.5 membuat aplikasi isi ulang payload
    // default SSH-nya sendiri).
    if (t.payload) inj.payload = isiPlaceholderPayload(t.payload, v2.host, sniEfektif);
    else inj.payload = "";
    if (slowdns) {
      inj.mode = "DNSTT";
      inj.dnsttUdpDnsHost = t.udpDnsHost || "1.1.1.1";
      inj.dnsttUdpDnsPort = t.udpDnsPort || 53;
      inj.dnsttServerName = t.nameServer;
      inj.dnsttPublicKey = t.publicKey;
    }
  }
  return cfg;
}

// Terapkan template ke hasil parsePesan. Return array config yang
// cocok dengan tipe template (sudah disesuaikan); kosong bila tidak
// ada config yang cocok (template SSH + akun Xray, atau sebaliknya).
export async function terapkanTemplate(env, hasil, template) {
  const out = [];
  for (const c of hasil?.configs || []) {
    if (template.tipe === "SSH" && c.type === "SSH") {
      out.push(await terapkanTemplateSsh(env, c, template, hasil.bug));
    } else if (template.tipe === "XRAY" && ["VLESS", "VMESS", "TROJAN", "SHADOWSOCKS"].includes(c.type)) {
      out.push(await terapkanTemplateXray(env, c, template, hasil.bug));
    }
  }
  return out;
}

// Ringkasan template untuk pesan ringkasan wizard + /config.
// Hanya field yang terisi yang ditampilkan.
export function ringkasanTemplate(t) {
  if (!t) return "";
  const baris = ["🧩 <b>Template: " + escapeHtml(t.nama || "-") + "</b>"];
  baris.push("• Tipe: <b>" + (t.tipe === "SSH" ? "SSH" : "Xray / V2Ray") + "</b>");
  if (t.metode) baris.push("• Metode: <b>" + escapeHtml(labelMetode(t.tipe, t.metode)) + "</b>");
  baris.push("• Operator: " + escapeHtml(labelOperator(t.operator)) + " — " + escapeHtml(labelKategori(t.operator, t.kategori)));
  if (t.tipe === "SSH") {
    const s = t.ssh || {};
    if (s.host) baris.push("• Host: <code>" + escapeHtml(s.host) + "</code>");
    if (s.port) baris.push("• Port: <code>" + s.port + "</code>");
    if (s.payload) baris.push("• Payload: <code>" + escapeHtml(String(s.payload).slice(0, 80)) + (String(s.payload).length > 80 ? "…" : "") + "</code>");
    if (s.proxyHost) baris.push("• Proxy: <code>" + escapeHtml(s.proxyHost) + (s.proxyPort ? ":" + s.proxyPort : "") + "</code>");
    if (s.sni) baris.push("• SNI: <code>" + escapeHtml(s.sni) + "</code>");
    baris.push("• Enhanced: " + (s.enhanced ? "✅ Ya" : "❌ Tidak"));
    if (s.slowdns) {
      baris.push("• SlowDNS: ✅ Ya (Name Server: <code>" + escapeHtml(s.dnsNameServer || "") + "</code>, UDP: <code>" + escapeHtml(s.dnsUdpHost || "1.1.1.1") + ":" + (s.dnsUdpPort || 53) + "</code>)");
    } else {
      baris.push("• SlowDNS: ❌ Tidak");
    }
    if (t.metode === "SSH_UDP") baris.push("• Inject: ❌ Tidak dipakai (SSH UDP — hanya akun SSH)");
  } else {
    const x = t.xray || {};
    if (x.targetHost) baris.push("• Target: <code>" + escapeHtml(x.targetHost) + (x.targetPort ? ":" + x.targetPort : "") + "</code>");
    if (x.sni) baris.push("• SNI: <code>" + escapeHtml(x.sni) + "</code>");
    if (x.headerHost) baris.push("• Header Host: <code>" + escapeHtml(x.headerHost) + "</code>");
    if (x.payload) baris.push("• Payload: <code>" + escapeHtml(String(x.payload).slice(0, 80)) + (String(x.payload).length > 80 ? "…" : "") + "</code>");
    if (x.proxyHost) baris.push("• Proxy: <code>" + escapeHtml(x.proxyHost) + (x.proxyPort ? ":" + x.proxyPort : "") + "</code>");
    if (x.sshHost) baris.push("• Akun SSH: <code>" + escapeHtml(x.sshHost + (x.sshPort ? ":" + x.sshPort : "") + "@" + (x.sshUser || "")) + "</code> (disimpan, tidak dipakai di config Xray)");
    if (xraySlowdnsAktif(t)) {
      baris.push("• SlowDNS: ✅ Ya (Name Server: <code>" + escapeHtml(x.nameServer || "") + "</code>, UDP: <code>" + escapeHtml(x.udpDnsHost || "1.1.1.1") + ":" + (x.udpDnsPort || 53) + "</code>)");
    } else {
      baris.push("• SlowDNS: ❌ Tidak");
    }
  }
  return baris.join("\n");
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
  // Dari bahan grup: "PATCH /ssh-ws" (Host akun + Host bug) dan
  // "GET /cdn-cgi/trace + CF-RAY" (trik Cloudflare trace).
  patchws: { label: "PATCH /ssh-ws", template: "PATCH /ssh-ws HTTP/1.1[crlf]Host: [host][crlf]Host: [bug][crlf]Upgrade: websocket[crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf][crlf]" },
  cftrace: { label: "CF Trace", template: "GET /cdn-cgi/trace HTTP/1.1[crlf]Host: [bug][crlf][crlf]CF-RAY / HTTP/1.1[crlf]Host: [host][crlf]Connection: Upgrade[crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]" },
};

function keyboardMetodePayload() {
  return [
    [{ text: "WS standar", callback_data: "metode:ws" }, { text: "SSH+payload", callback_data: "metode:sshpayload" }],
    [{ text: "Enhanced", callback_data: "metode:enhanced" }, { text: "Direct", callback_data: "metode:direct" }],
    [{ text: "PATCH /ssh-ws", callback_data: "metode:patchws" }, { text: "CF Trace", callback_data: "metode:cftrace" }],
    [{ text: "✨ Otomatis", callback_data: "metode:auto" }],
    [{ text: "⬅️ Kembali ke Menu", callback_data: "menu:utama" }],
  ];
}

// Pilih metode payload otomatis dari kategori bug akun (v2.5): kalau
// kategori bug punya field metode (dari daftar Asep), pakai metode itu;
// kalau tidak ada, fallback aturan lama: edu -> enhanced, opok -> direct,
// kategori lain / bug tidak dikenal -> ws (template standar aplikasi).
export async function pilihMetodeOtomatis(env, teks) {
  try {
    const hasil = await parsePesan(teks, { env });
    if (!hasil.bug) return "ws";
    const info = await cariBugGabungan(env, hasil.bug);
    if (!info) return "ws";
    if (info.metode && PAYLOAD_METODE[info.metode]) return info.metode;
    if (info.kategori === "edu") return "enhanced";
    if (info.kategori === "opok") return "direct";
    return "ws";
  } catch { return "ws"; }
}

// Versi bot (tampil di /status). Naikkan tiap rilis fitur besar:
// v2 = database bug + /bug + /cek + admin KV; v2.3 = navigasi (tombol
// Kembali, menu 2 baris, tombol Start bawah) + rincian config + /status.
// v2.4 = pilih jenis config dulu, panel admin, /cek diperkaya (IP /
// reverse / subdomain), payload otomatis, nama file berisi jenis config.
// v2.5 = BUG_DB dibangun ulang dari daftar kiriman Asep (7 operator,
// by.U baru) + metode payload per kategori (bukan asal pilih).
// v2.5.1 = Telkomsel ilped jadi kategori sendiri (bukan edu).
// v2.6 = mode WC (wildcard) otomatis: bug bertag wc -> SNI inject =
// bug + "." + host server.
// v2.7 = Template Config (wizard admin terstruktur; SlowDNS SSH +
// Xray; akun dari pengguna saat template dipakai).
const VERSI_BOT = "v2.9.15";

const PESAN_START =
  "👋 <b>Selamat datang di Generator Config Dark Tunnel</b>\n\n" +
  "Bot ini mengubah akun VPN kamu menjadi file config <b>.dark</b> yang siap diimpor ke aplikasi Dark Tunnel — SSH, VLESS, VMess, Trojan, dan Shadowsocks, semua bisa.\n\n" +
  "<b>Cara pakai:</b>\n" +
  "1️⃣ Kirim akun kamu apa adanya — link atau teks acak, bot yang merapikannya.\n" +
  "2️⃣ Pilih template config, atau ketuk ✏️ Buat Manual untuk mengatur sendiri metodenya.\n" +
  "3️⃣ Unduh file .dark-nya, impor ke Dark Tunnel, lalu tekan Connect.\n\n" +
  "🔒 Akun dan config yang kamu buat tidak disimpan di bot.\n\n" +
  "Pilih menu di bawah untuk mulai 👇";

// Teks bantuan (/help) — v2.9.11: perintah bantuan sendiri, tidak lagi
// sekadar membuka menu utama.
const PESAN_BANTUAN =
  "❓ <b>Bantuan — Generator Config Dark Tunnel</b>\n\n" +
  "<b>Cara pakai:</b>\n" +
  "1️⃣ Kirim akun kamu — SSH (<code>host:port@user:pass</code>) atau link VLESS / VMess / Trojan / Shadowsocks. Format acak pun boleh.\n" +
  "2️⃣ Pilih template config, atau ketuk ✏️ Buat Manual untuk mengatur sendiri metodenya (bug / SNI / payload / proxy).\n" +
  "3️⃣ Unduh file .dark-nya, impor ke aplikasi Dark Tunnel, lalu tekan Connect.\n\n" +
  "<b>Perintah:</b>\n" +
  "/start — buka menu utama\n" +
  "/bug — daftar bug host per operator\n" +
  "/cek — cek domain\n" +
  "/config — template config\n" +
  "/update — info terbaru\n" +
  "/status — status bot\n\n" +
  "🔒 Akun dan config yang kamu buat tidak disimpan di bot.";

// Deskripsi bot (v2.9.11, dipasang lewat /setdeskripsi) — tampil di
// profil bot dan di hasil pencarian Telegram.
const DESKRIPSI_SINGKAT_BOT =
  "Ubah akun SSH / VLESS / VMess / Trojan jadi file config Dark Tunnel (.dark) siap impor.";
const DESKRIPSI_BOT =
  "Generator Config Dark Tunnel — ubah akun VPN kamu (SSH, VLESS, VMess, Trojan, Shadowsocks) menjadi file .dark siap impor ke aplikasi Dark Tunnel.\n\n" +
  "Cara pakai: kirim akun apa adanya, pilih template atau buat manual, unduh file .dark-nya lalu tekan Connect.\n\n" +
  "Akun & config yang dibuat tidak disimpan di bot.";

const PESAN_GRUP =
  "👋 <b>Generator Config Dark Tunnel</b>\n\n" +
  "Kirim akun SSH / VLESS / VMess / Trojan / Shadowsocks kamu, bot buatkan config Dark Tunnel-nya.\n\n" +
  "⚠️ Jangan kirim akun di grup — akun kamu bisa dilihat semua anggota. kirim lewat chat pribadi bot ini ya.";

const CARA_IMPOR =
  "📥 <b>Cara impor ke Dark Tunnel:</b>\n" +
  "1. Unduh file <code>.dark</code> di atas.\n" +
  "2. Ketuk file-nya, lalu pilih buka dengan aplikasi Dark Tunnel.\n" +
  "3. Tekan <b>Connect</b>.";

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

// Nama file .dark: "<type>-<nama> by @autosetdark_bot.dark" (type huruf
// kecil, mis. "vless-opok-tsel-1 by @autosetdark_bot.dark"). Bila nama
// sudah diawali type yang sama, jangan digandakan. Bila type kosong /
// tidak dikenal, pakai nama saja seperti dulu. Nama disanitasi: huruf
// kecil, hanya [a-z0-9_-], maks 40 karakter; bila kosong pakai "config".
// Generate DARI TEMPLATE (param ketiga terisi): nama file = nama template
// apa adanya ("<nama-template> by @autosetdark_bot.dark", tanpa prefix
// tipe) — spasi di tengah boleh, hanya karakter yang tidak aman di nama
// file (/ \ : * ? " < > | dan kontrol) yang dibuang dan spasi berlebih
// dirapikan; kosong setelah sanitasi -> fallback format lama.
const BRANDING_FILE_DARK = " by @autosetdark_bot.dark";
const JENIS_CONFIG_FILE = ["SSH", "VMESS", "VLESS", "TROJAN", "SHADOWSOCKS", "SSH_DNSTT", "OPENVPN"];
export function namaFileDark(namaConfig, type, namaTemplate) {
  const tpl = String(namaTemplate || "").replace(/[/\\:*?"<>|\x00-\x1f\x7f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (tpl) return tpl + BRANDING_FILE_DARK;
  let s = String(namaConfig || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  if (!s) s = "config";
  let prefix = "";
  const t = String(type || "").toUpperCase();
  if (JENIS_CONFIG_FILE.includes(t)) {
    const tl = t.toLowerCase();
    if (!s.startsWith(tl + "-") && s !== tl) prefix = tl + "-";
  }
  return prefix + s + BRANDING_FILE_DARK;
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
    // SlowDNS/DNSTT (v2.7): bila opts.dnstt terisi (name server +
    // public key), mode jadi DNSTT + sertakan keempat field DNSTT.
    mode: opts.dnstt ? "DNSTT" : "DIRECT_SNI",
    serverNameIndication: bug,
    payload,
  };
  if (opts.proxy) {
    inj.proxyHost = opts.proxy.host;
    inj.proxyPort = opts.proxy.port;
  }
  if (opts.dnstt) {
    inj.dnsttUdpDnsHost = opts.dnstt.udpDnsHost || "1.1.1.1";
    inj.dnsttUdpDnsPort = opts.dnstt.udpDnsPort || 53;
    inj.dnsttServerName = opts.dnstt.serverName || "";
    inj.dnsttPublicKey = opts.dnstt.publicKey || "";
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

// v2.9.1: tahap SNI/domain wizard menerima host biasa ATAU placeholder
// "[host]" (SNI ngikutin host akun pengguna saat generate).
function validSniTemplate(v) {
  const s = String(v || "").toLowerCase();
  return s === "[host]" || validHost(s);
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

// Mode WC (wildcard, v2.6 — dari bahan grup §2): host/SNI = bug + "." +
// domain server (mis. bug api24-normal.tiktokv.com + server
// sg1.server.com -> api24-normal.tiktokv.com.sg1.server.com).
// True bila note/catatan bug mengandung kata "wc" utuh.
export function dukungWildcard(note) {
  return /\bwc\b/i.test(String(note || ""));
}

// Gabung bug + host server jadi host wildcard. Bila salah satu kosong,
// kembalikan bug apa adanya. Bila bug == domain (atau domain sudah
// bentuk WC "bug.domain"), jangan gandakan — kembalikan domain apa
// adanya (v2.9.5: template WC dengan bug == domain akun, mis.
// investors.spotify.com, sebelumnya jadi investors.spotify.com.
// investors.spotify.com).
export function hostWildcard(bug, serverHost) {
  const b = String(bug || "").trim();
  const s = String(serverHost || "").trim();
  if (!b || !s) return b;
  const kecil = (x) => x.toLowerCase();
  if (kecil(b) === kecil(s)) return s;
  if (kecil(s).startsWith(kecil(b) + ".")) return s;
  return b + "." + s;
}

// Parse satu pesan teks jadi daftar TunnelConfig.
// `opts.metodePayload` = kunci template payload untuk config SSH+bug
// ("ws" default). Config Xray selalu pakai template WS standar.
// `opts.env` (opsional) = env Worker; bila ada, info bug dicari lewat
// cariBugGabungan (KV + bawaan) untuk deteksi WC; bila tidak ada,
// pakai cariBug (bawaan saja). Async karena lookup KV.
// Return {configs:[...], kurangSsh:[], adaIsi:boolean, adaLink:boolean,
//         bug:string|null, adaInject:boolean}.
export async function parsePesan(teks, opts = {}) {
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

  // Info bug (untuk metode payload + mode WC). Bila env ada, cari via
  // KV + bawaan; bila tidak, cari bawaan saja.
  let infoBug = null;
  if (bug) {
    try {
      infoBug = opts.env ? await cariBugGabungan(opts.env, bug) : cariBug(bug);
    } catch { infoBug = cariBug(bug); }
  }
  const pakaiWc = !!(infoBug && dukungWildcard(infoBug.note));

  // 4) Terapkan inject ke config Xray bila ada bug (SNI link tetap
  //    jadi TLS SNI-nya; inject terpisah di injectConfig).
  //    Mode WC: SNI inject = bug + "." + host server config itu.
  if (bug) {
    for (const c of configs) {
      const subKey = ["vmessTunnelConfig", "vlessTunnelConfig", "trojanTunnelConfig", "shadowsocksTunnelConfig"].find((k) => c[k]);
      if (subKey && !c[subKey].injectConfig) {
        const hostServer = c[subKey].v2rayConfig?.host || "";
        const bugEfektif = pakaiWc ? hostWildcard(bug, hostServer) : bug;
        c[subKey].injectConfig = injectConfigAktif(bugEfektif, c.type);
      }
    }
  }

  // 5) Config SSH (nama = username; fallback host).
  //    Mode WC: SNI/bug = bug + "." + host SSH akun itu.
  for (const a of ssh.akunList) {
    const bugSsh = ps.sniIsHost ? a.host : bug;
    const bugEfektif = (pakaiWc && bugSsh === bug) ? hostWildcard(bug, a.host) : bugSsh;
    configs.push(bangunSsh(a.username, a, bugEfektif, { metode: opts.metodePayload, proxy }));
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
  return await telegramApi(env, "sendMessage", body);
}

async function sendDocument(env, chatId, filename, content, caption, keyboard) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new File([content], filename, { type: "application/octet-stream" }));
  if (caption) form.append("caption", String(caption).slice(0, 1000));
  form.append("parse_mode", "HTML");
  if (keyboard) form.append("reply_markup", JSON.stringify({ inline_keyboard: keyboard }));
  try {
    await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendDocument", { method: "POST", body: form });
  } catch { /* kirim dokumen gagal — abaikan */ }
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

// Edit-di-tempat anti-numpuk (v2.9.2): coba edit pesan yang sama;
// bila gagal karena teksnya sama ("message is not modified") anggap
// sukses (konten sudah sesuai) dan kembalikan messageId lama; bila
// gagal karena lain (pesan hilang/dihapus) fallback kirim pesan baru
// dan kembalikan message_id barunya. Bila messageId kosong, langsung
// kirim baru. Selalu kembalikan messageId yang kini memegang konten
// (atau null bila kirim juga gagal).
async function editAtauKirim(env, chatId, messageId, text, keyboard) {
  if (messageId) {
    const body = { chat_id: chatId, message_id: messageId, text: String(text).slice(0, 4000), parse_mode: "HTML" };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    const r = await telegramApi(env, "editMessageText", body);
    if (r && r.ok) return messageId;
    if (r && !r.ok && /message is not modified/i.test(String(r.description || ""))) return messageId;
    // Edit gagal karena lain -> fallback kirim baru di bawah.
  }
  const r2 = await sendTelegram(env, chatId, text, keyboard);
  return r2?.result?.message_id || messageId || null;
}

// Hapus satu pesan bot (dipakai tombol ❌ Batal — pesan hilang, tanpa
// pesan "dibatalkan"). Semua error diabaikan diam-diam.
async function hapusTelegram(env, chatId, messageId) {
  if (!messageId) return;
  try { await telegramApi(env, "deleteMessage", { chat_id: chatId, message_id: messageId }); } catch { /* abaikan */ }
}

async function kabariAdmin(env, teks) {
  const adminId = adminChatId(env);
  if (!adminId) return;
  try { await sendTelegram(env, adminId, "⚠️ Bot Dark Tunnel: " + teks); } catch { /* abaikan */ }
}

// ================= CEK DOMAIN =================
// State sementara (per chat, di memori saja): chat sedang menunggu
// kirim domain setelah /cek atau tombol "🌐 Cek Domain".
const pendingCek = new Map();

// Bersihkan input jadi nama domain polos ("https://a.com/x?y=1" ->
// "a.com"). Alamat IP juga diterima (untuk reverse DNS). Return ""
// bila bukan domain/IP yang valid.
export function bersihkanDomain(input) {
  let s = String(input || "").trim().toLowerCase();
  const mIpPort = s.match(/^((?:\d{1,3}\.){3}\d{1,3}):\d{1,5}$/);
  if (mIpPort) return mIpPort[1];
  if (isIP(s)) return s;
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0].split("?")[0].split("#")[0];
  s = s.split(":")[0];
  s = s.replace(/\.+$/, "").trim();
  if (!/^[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}$/.test(s)) return "";
  return s;
}

// Subdomain umum yang dicek saat /cek (bukan crt.sh — pernah timeout).
const SUBDOMAIN_CEK = ["www", "mail", "api", "blog", "app", "cdn", "static", "m", "ftp", "smtp", "dev", "staging"];

// Query DNS-over-HTTPS Cloudflare. Return objek JSON atau null bila gagal.
async function dohQuery(name, type) {
  try {
    const res = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=" + type, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res || !res.ok) return null;
    return await res.json().catch(() => null);
  } catch { return null; }
}

// Ambil jawaban A (IP) dari hasil DoH.
function ipsDariDoh(j) {
  if (!j || !Array.isArray(j.Answer)) return [];
  return j.Answer.filter((a) => a && a.type === 1 && typeof a.data === "string").map((a) => a.data);
}

// Ambil hostname dari jawaban PTR DoH (atau "" bila tidak ada).
function hostnameDariPtr(j) {
  const nama = j && Array.isArray(j.Answer) && j.Answer.find((a) => a && a.type === 12 && typeof a.data === "string");
  return nama ? String(nama.data).replace(/\.+$/, "") : "";
}

// Ringkasan header untuk deteksi CDN: nama header (lowercase), via, server.
function sinyalHeader(h) {
  const nama = [];
  try { h.forEach((v, k) => { nama.push(String(k).toLowerCase()); }); } catch { /* abaikan */ }
  return {
    nama,
    via: (h.get("via") || "").toLowerCase(),
    server: (h.get("server") || "").toLowerCase(),
    ada: (awalan) => nama.some((n) => n.startsWith(awalan)),
  };
}

// Daftar provider CDN: pola hostname edge (hasil PTR) + sinyal header.
// `server` = label server yang ditampilkan bila provider ini terdeteksi.
// CATATAN (21 Nov 2026): fetch dari dalam Cloudflare Worker selalu
// ditempeli header cf-ray + server: cloudflare oleh edge Cloudflare
// pada SEMUA respons subrequest — cf-ray BUKAN bukti Cloudflare.
// Karena itu urutan deteksi: (1) hostname edge, (2) header khas
// provider (CloudFront WAJIB sebelum Cloudflare), (3) cf-ray /
// cf-cache-status → Cloudflare sebagai jalan terakhir saja.
export const DAFTAR_CDN = [
  { nama: "CloudFront", server: "CloudFront",
    host: ["cloudfront.net"],
    header: (h, s) => !!(h.get("x-amz-cf-id") || h.get("x-amz-cf-pop") || s.via.includes("cloudfront")) },
  { nama: "Fastly", server: "Fastly",
    host: ["fastly.net", "fastlylb.net"],
    header: (h, s) => !!(h.get("x-fastly-request-id") || s.ada("fastly-") || s.via.includes("fastly") || (h.get("x-served-by") || "").toLowerCase().includes("cache-")) },
  { nama: "Akamai", server: "AkamaiGHost",
    host: ["akamai.net", "akamaiedge.net", "akamaized.net", "edgesuite.net"],
    header: (h, s) => !!(s.ada("x-akamai-") || s.server === "akamaighost" || s.server.includes("akamai")) },
  { nama: "Alibaba", server: "Tengine",
    host: ["alicdn.com", "aliyuncs.com", "alibaba"],
    header: (h, s, host, pola) => !!(s.ada("x-ali-") || h.get("eagleeye-traceid") || (s.server === "tengine" && host && pola.some((p) => host.includes(p)))) },
  { nama: "Google", server: "gws",
    host: ["1e100.net", "googleusercontent.com"],
    header: (h, s) => !!(s.server === "gws" || s.server === "gse" || s.ada("x-goog-") || s.via.includes("google")) },
  { nama: "Microsoft Azure", server: "Microsoft-IIS",
    host: ["azureedge.net", "azurefd.net", "azurewebsites.net"],
    header: (h, s, host, pola) => !!(s.ada("x-azure-") || (s.server.includes("microsoft-iis") && host && pola.some((p) => host.includes(p)))) },
  { nama: "Tencent", server: "Tencent",
    host: ["tencentcdn.cn", "qcloud.com", "tencent-cloud"],
    header: (h, s) => s.ada("x-tencent-") },
  { nama: "Bunny", server: "BunnyCDN",
    host: ["b-cdn.net"],
    header: (h, s) => !!(s.server.includes("bunnycdn") || h.get("cdn-bunny")) },
  { nama: "Cloudinary", server: "Cloudinary",
    host: ["cloudinary.com"],
    header: (h, s) => s.ada("x-cld-") },
  { nama: "Cloudflare", server: "cloudflare",
    host: ["cloudflare.com"],
    header: (h) => !!h.get("cf-cache-status") },
];

// Deteksi provider CDN dari header respons + hostname edge (PTR).
// Return { cdn, server } — keduanya "" bila tidak ada sinyal yang cocok.
// `headers` boleh null (deteksi subdomain — hanya hostname PTR yang
// tersedia); bila begitu, hanya cek hostname yang jalan.
// Urutan: (1) hostname edge; (2) header khas provider; (3) cf-ray /
// cf-cache-status → Cloudflare (jalan terakhir; dari Worker cf-ray
// selalu ada, jadi ini hanya benar bila tidak ada provider lain yang
// cocok — situs origin langsung tanpa CDN bisa salah terlabel
// Cloudflare, itu keterbatasan yang diterima).
export function deteksiCDN(headers, edgeHostname) {
  const kosong = { cdn: "", server: "" };
  const host = String(edgeHostname || "").toLowerCase();
  if (host) {
    for (const p of DAFTAR_CDN) {
      if (p.host.some((pola) => host.includes(pola))) return { cdn: p.nama, server: p.server };
    }
  }
  if (!headers || typeof headers.get !== "function") return kosong;
  const s = sinyalHeader(headers);
  for (const p of DAFTAR_CDN) {
    let kena = false;
    try { kena = !!p.header(headers, s, host, p.host); } catch { kena = false; }
    if (kena) return { cdn: p.nama, server: p.server };
  }
  if (headers.get("cf-ray") || headers.get("cf-cache-status")) return { cdn: "Cloudflare", server: "cloudflare" };
  return kosong;
}

// Cek satu domain: HEAD dulu, fallback GET, timeout 8 detik per upaya.
// Ditambah: resolve IP (A), reverse DNS (PTR) untuk input IP maupun IP
// pertama hasil resolve domain, dan cek subdomain umum. Return
// {domain, ok, status, ms, cdn, server, ips, hostname, subdomains} —
// subdomains = null bila DNS gagal total; tiap subdomain
// {nama, ip, server} (server = provider CDN atau "" bila tak terdeteksi).
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
  const hasil = { domain, ok: !!res, status: res ? res.status : 0, ms, cdn: "", server: "", ips: [], hostname: "", subdomains: null };
  const headers = res ? res.headers : null;
  // DNS: resolve IP / reverse / subdomain — gagal dengan anggun
  // (bagian yang gagal dihilangkan saja, bukan error mentah).
  let dnsOk = false;
  if (isIP(domain)) {
    const parts = domain.split(".");
    if (parts.length === 4) {
      const ptr = await dohQuery(parts.reverse().join(".") + ".in-addr.arpa", "PTR");
      if (ptr) {
        dnsOk = true;
        hasil.hostname = hostnameDariPtr(ptr);
      }
    }
  } else {
    const a = await dohQuery(domain, "A");
    if (a) { dnsOk = true; hasil.ips = ipsDariDoh(a).slice(0, 3); }
    // PTR IP pertama (jalan bareng cek subdomain) → hostname edge,
    // bukti provider CDN-nya (mis. *.r.cloudfront.net).
    let ptrP = null;
    if (hasil.ips.length) {
      const ip0 = hasil.ips[0].split(".");
      if (ip0.length === 4) ptrP = dohQuery(ip0.reverse().join(".") + ".in-addr.arpa", "PTR");
    }
    const cekSub = await Promise.all(SUBDOMAIN_CEK.map(async (sub) => {
      const j = await dohQuery(sub + "." + domain, "A");
      if (j) dnsOk = true;
      const ips = ipsDariDoh(j);
      if (!ips.length) return null;
      // Provider subdomain: PTR IP pertama → hostname edge → deteksi
      // dari hostname saja (tanpa header — tidak ada fetch ke tiap
      // subdomain). PTR gagal → server "" (tetap tampil dengan IP saja).
      // Jalan paralel di dalam map yang sama, tidak menambah round-trip
      // berurutan.
      let server = "";
      const ipParts = ips[0].split(".");
      if (ipParts.length === 4) {
        const ptrSub = await dohQuery(ipParts.reverse().join(".") + ".in-addr.arpa", "PTR");
        if (ptrSub) server = deteksiCDN(null, hostnameDariPtr(ptrSub)).cdn;
      }
      return { nama: sub + "." + domain, ip: ips[0], server };
    }));
    if (ptrP) hasil.hostname = hostnameDariPtr(await ptrP);
    if (dnsOk) hasil.subdomains = cekSub.filter(Boolean);
  }
  // CDN + Server — ditentukan SETELAH hostname diketahui, karena
  // hostname edge adalah sinyal paling bisa dipercaya. Header cf-ray
  // dan server: cloudflare TIDAK dipakai sebagai bukti utama: fetch
  // dari dalam Worker selalu ditempeli keduanya oleh edge Cloudflare
  // pada semua respons (lihat deteksiCDN).
  if (headers) {
    const det = deteksiCDN(headers, hasil.hostname);
    hasil.cdn = det.cdn;
    if (det.cdn) {
      hasil.server = det.server;
    } else {
      const sv = (headers.get("server") || "").trim();
      // "cloudflare" di sini kemungkinan besar tempelan Worker, bukan
      // server asal — jangan tampilkan yang menyesatkan.
      hasil.server = sv.toLowerCase() === "cloudflare" ? "" : sv;
    }
  }
  return hasil;
}

export function formatHasilCek(r) {
  const barisIp = (r.ips && r.ips.length)
    ? "🌐 IP: " + r.ips.map((ip) => escapeHtml(ip)).join(", ") : "";
  const barisHost = r.hostname
    ? "🔁 Hostname: <code>" + escapeHtml(r.hostname) + "</code>" : "";
  // Subdomain: satu per baris, format nama/ip (Provider) — provider
  // dalam kurung bila terdeteksi, tanpa kurung bila tidak.
  const barisSub = r.subdomains
    ? (r.subdomains.length
      ? "🔎 Subdomain yang ditemukan:\n" + r.subdomains.map((s) => "• " + escapeHtml(s.nama) + "/" + escapeHtml(s.ip) + (s.server ? " (" + escapeHtml(s.server) + ")" : "")).join("\n")
      : "🔎 Subdomain: tidak ditemukan")
    : "";
  if (!r.ok) {
    return "🌐 <b>" + escapeHtml(r.domain) + "</b>\n\n" +
      "❌ Domain tidak merespons — tidak ditemukan atau tidak bisa dijangkau.\n" +
      "Coba cek lagi ejaannya, atau coba lagi nanti ya." +
      (barisIp ? "\n" + barisIp : "") + (barisHost ? "\n" + barisHost : "") + (barisSub ? "\n" + barisSub : "");
  }
  // Cabang sukses — urutan v2.7.9 (contoh Asep, ovo.id):
  // judul → status → IP/Hostname/CDN/Server → subdomain (paling akhir),
  // tiap blok dipisah satu baris kosong. Tanpa baris peringatan status.
  const info = [barisIp, barisHost,
    r.cdn ? "📡 CDN: " + r.cdn : "",
    r.server ? "🖥️ Server: " + escapeHtml(r.server) : ""].filter(Boolean).join("\n");
  const blok = ["🌐 <b>" + escapeHtml(r.domain) + "</b>",
    "✅ Merespons — HTTP " + r.status + " (" + r.ms + " ms)"];
  if (info) blok.push(info);
  if (barisSub) blok.push(barisSub);
  return blok.join("\n\n");
}

function keyboardStart(isAdmin, diGrup) {
  if (diGrup) {
    // (v2.9.13) Menu grup: cuma yang perlu di grup. Buat Config /
    // Buat Manual tetap ada tapi ketukannya dialihkan ke DM (akun
    // rahasia); Template Config tidak ditampilkan di grup; Admin
    // tidak pernah tampil di grup. (v2.9.14) Cek Domain balik ke
    // grup atas permintaan Asep.
    return [
      [{ text: "⚡ Buat Config", callback_data: "buat:config" }, { text: "✏️ Buat Manual", callback_data: "buat:manual" }],
      [{ text: "🔍 Cari Bug", callback_data: "bug:menu" }, { text: "🌐 Cek Domain", callback_data: "cek:mulai" }],
      [{ text: "🆕 Update Terbaru", callback_data: "update:lihat" }, { text: "📥 dark tunnel", url: "https://sfile.co/H26JBeTBi1o" }],
      [{ text: "🛒 Beli Akun VPN", url: "https://t.me/sandekalavpn_bot" }, { text: "👥 Gabung Grup", url: "https://t.me/sand3kala" }],
    ];
  }
  const kb = [
    [{ text: "⚡ Buat Config", callback_data: "buat:config" }, { text: "✏️ Buat Manual", callback_data: "buat:manual" }],
    [{ text: "🔍 Cari Bug", callback_data: "bug:menu" }, { text: "🌐 Cek Domain", callback_data: "cek:mulai" }],
    [{ text: "📥 dark tunnel", url: "https://sfile.co/H26JBeTBi1o" }, { text: "🆕 Update Terbaru", callback_data: "update:lihat" }],
    [{ text: "🛒 Beli Akun VPN", url: "https://t.me/sandekalavpn_bot" }, { text: "👥 Gabung Grup", url: "https://t.me/sand3kala" }],
  ];
  if (isAdmin) kb.push([{ text: "⚙️ Admin", callback_data: "admin:panel" }]);
  return kb;
}

const TOMBOL_APK = [[{ text: "📥 Download APK Dark Tunnel", url: "https://sfile.co/H26JBeTBi1o" }]];

// Tombol kembali ke menu utama — dipasang di akhir hampir semua alur
// (operator/kategori bug, pemandu buat config & cek domain, /update,
// /config, daftar bug, pilihan metode payload, pesan gagal parsing).
const TOMBOL_KEMBALI = [[{ text: "⬅️ Kembali ke Menu", callback_data: "menu:utama" }]];

// Tombol kembali ke daftar kategori operator + kembali ke menu utama
// (dipakai di pesan terakhir daftar bug). Admin juga dapat tombol
// "🗑️ Hapus Bug" untuk masuk mode hapus bug kategori itu (v2.8.0).
function keyboardKembaliBug(opKey, katKey, isAdmin) {
  const rows = [];
  if (isAdmin) rows.push([{ text: "🗑️ Hapus Bug", callback_data: "bug:hapus:" + opKey + ":" + katKey }]);
  rows.push([{ text: "⬅️ Kembali", callback_data: "bug:op:" + opKey }]);
  rows.push(...TOMBOL_KEMBALI);
  return rows;
}

// Panel admin (tombol "⚙️ Admin" di menu utama).
function keyboardAdmin() {
  return [
    [{ text: "➕ Tambah Bug", callback_data: "admin:tambahbug" }, { text: "➕ Tambah Config", callback_data: "admin:tambahconfig" }],
    [{ text: "📢 Broadcast", callback_data: "admin:broadcast" }, { text: "📊 Status", callback_data: "admin:status" }],
    ...TOMBOL_KEMBALI,
  ];
}

// ---- Keyboard wizard Template Config (v2.7) ----
function keyboardTemplateTipe() {
  return [
    [{ text: "SSH", callback_data: "tw:tipe:SSH" }, { text: "Xray / V2Ray", callback_data: "tw:tipe:XRAY" }],
    [{ text: "❌ Batal", callback_data: "admin:batal" }],
  ];
}

function keyboardTemplateMetode(tipe, manual) {
  const daftar = METODE_TEMPLATE[tipe] || [];
  const rows = baris2(daftar.map((m) => ({ text: m.label, callback_data: "tw:metode:" + m.id })));
  if (manual) {
    // (v2.9.9) Buat Manual: tanpa "Kembali ke Tipe" (tipe sudah dari
    // akun) dan Batal = "mn:batal" (bukan admin:batal).
    rows.push([{ text: "❌ Batal", callback_data: "mn:batal" }]);
    return rows;
  }
  rows.push([{ text: "⬅️ Kembali ke Tipe", callback_data: "tw:kembali:tipe" }]);
  rows.push([{ text: "❌ Batal", callback_data: "admin:batal" }]);
  return rows;
}

function keyboardTemplateOperator() {
  const ops = Object.entries(BUG_DB);
  const rows = [];
  for (let i = 0; i < ops.length; i += 2) {
    rows.push(ops.slice(i, i + 2).map(([k, v]) => ({ text: v.label, callback_data: "tw:op:" + k })));
  }
  rows.push([{ text: "⬅️ Kembali ke Metode", callback_data: "tw:kembali:metode" }]);
  rows.push([{ text: "❌ Batal", callback_data: "admin:batal" }]);
  return rows;
}

function keyboardTemplateKategori(opKey) {
  const op = BUG_DB[opKey];
  const kats = op ? Object.keys(op.kategori) : [];
  const rows = baris2(kats.map((k) => ({ text: labelKategori(opKey, k), callback_data: "tw:kat:" + k })));
  rows.push([{ text: "➕ Kategori Baru", callback_data: "tw:kat:baru" }]);
  rows.push([{ text: "⬅️ Kembali ke Operator", callback_data: "tw:kembali:op" }]);
  rows.push([{ text: "❌ Batal", callback_data: "admin:batal" }]);
  return rows;
}

// ---- Pemilih bug di wizard template (v2.7.5) ----
// Daftar host satu kategori (BUG_DB + KV BUGS, KV dulu, dedup).
// Pola sama seperti daftarBugPesanGabungan, tapi return array host
// mentah (bukan pesan teks). Kategori yang cuma ada di KV tetap jalan.
// Bug bawaan yang sudah dihapus admin tidak ikut (v2.8.0).
export async function daftarHostKategori(env, opKey, katKey) {
  const kat = BUG_DB[opKey]?.kategori?.[katKey];
  const kv = await ambilBugsKv(env);
  const kvList = (kv?.[opKey]?.[katKey] || []).filter((e) => e && e.host);
  const ada = new Set(kvList.map((e) => String(e.host).toLowerCase()));
  const dihapus = await ambilBugDihapusKv(env);
  return [
    ...kvList.map((e) => String(e.host)),
    ...(kat ? kat.hosts.filter((e) => !ada.has(e.h.toLowerCase()) && !dihapus[kunciBugDihapus(opKey, katKey, e.h)]).map((e) => e.h) : []),
  ];
}

function keyboardPilihBugOperator() {
  const ops = Object.entries(BUG_DB);
  const rows = [];
  for (let i = 0; i < ops.length; i += 2) {
    rows.push(ops.slice(i, i + 2).map(([k, v]) => ({ text: v.label, callback_data: "tw:bug:op:" + k })));
  }
  rows.push([{ text: "⬅️ Kembali", callback_data: "tw:bug:kembali" }]);
  return rows;
}

function keyboardPilihBugKategori(opKey, kvKats) {
  const op = BUG_DB[opKey];
  const katsBawaan = op ? Object.keys(op.kategori) : [];
  const semua = [...new Set([...katsBawaan, ...(kvKats || [])])].sort((a, b) => {
    const ia = URUTAN_KATEGORI.indexOf(a), ib = URUTAN_KATEGORI.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const rows = baris2(semua.map((k) => ({ text: labelKategori(opKey, k), callback_data: "tw:bug:kat:" + opKey + ":" + k })));
  rows.push([{ text: "⬅️ Ganti operator", callback_data: "tw:bug" }]);
  rows.push([{ text: "⬅️ Kembali", callback_data: "tw:bug:kembali" }]);
  return rows;
}

// Host per halaman di pemilih bug (kategori besar mis. ilped punya
// 100+ host — 1 pesan keyboard Telegram maks 100 tombol).
const PICKER_HOST_PER_HALAMAN = 20;

function keyboardPilihBugHost(st) {
  const pb = st.pilihBug;
  const per = PICKER_HOST_PER_HALAMAN;
  const totalHal = Math.max(1, Math.ceil(pb.hosts.length / per));
  const hal = Math.min(pb.page || 0, totalHal - 1);
  const awal = hal * per;
  // Callback pakai indeks + op:kat (bukan host mentah): host terpanjang
  // di BUG_DB 52 karakter, "tw:bug:host:" + host sudah tepat 64 byte
  // (batas Telegram) — host KV yang lebih panjang akan gagal. Indeks
  // selalu aman; op:kat diikutkan supaya tombol pesan lama yang sudah
  // tidak berlaku (kategori diganti) tidak salah isi.
  const rows = pb.hosts.slice(awal, awal + per).map((h, i) => ([{ text: h, callback_data: "tw:bug:host:" + pb.op + ":" + pb.kat + ":" + (awal + i) }]));
  const nav = [];
  if (hal > 0) nav.push({ text: "⬅️ Sebelumnya", callback_data: "tw:bug:hal:" + (hal - 1) });
  if (hal < totalHal - 1) nav.push({ text: "Berikutnya ➡️", callback_data: "tw:bug:hal:" + (hal + 1) });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "⬅️ Ganti kategori", callback_data: "tw:bug:op:" + pb.op }]);
  rows.push([{ text: "⬅️ Kembali", callback_data: "tw:bug:kembali" }]);
  return rows;
}

// ---- Mode hapus bug (v2.8.0, admin saja) ----
// Daftar host satu kategori sebagai tombol (20/halaman), pakai indeks
// di callback (bukan host mentah — batas 64 byte Telegram). Daftar
// dibaca ulang dari daftarHostKategori di tiap interaksi, jadi tombol
// usang tidak bisa salah hapus host lain.
// Hash pendek (djb2 -> base36) ikut di callback host & konfirmasi:
// memastikan host di indeks itu masih host yang sama seperti saat
// tombol dibuat — daftar yang bergeser (mis. admin sempat /tambahbug
// di tengah alur) tidak bisa salah hapus.
function hashHostSingkat(host) {
  let h = 5381;
  for (const c of String(host || "")) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

function keyboardHapusBug(hosts, opKey, katKey, hal) {
  const per = PICKER_HOST_PER_HALAMAN;
  const totalHal = Math.max(1, Math.ceil(hosts.length / per));
  const h = Math.min(Math.max(hal || 0, 0), totalHal - 1);
  const awal = h * per;
  const rows = hosts.slice(awal, awal + per).map((host, i) =>
    ([{ text: host, callback_data: "bug:hapus:host:" + opKey + ":" + katKey + ":" + (awal + i) + ":" + hashHostSingkat(host) }]));
  const nav = [];
  if (h > 0) nav.push({ text: "⬅️ Sebelumnya", callback_data: "bug:hapus:hal:" + opKey + ":" + katKey + ":" + (h - 1) });
  if (h < totalHal - 1) nav.push({ text: "Berikutnya ➡️", callback_data: "bug:hapus:hal:" + opKey + ":" + katKey + ":" + (h + 1) });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "⬅️ Kembali ke Daftar", callback_data: "bug:kat:" + opKey + ":" + katKey }]);
  return rows;
}

// Tampilkan (edit) pesan mode hapus untuk satu kategori. notice =
// pesan tambahan di atas judul (mis. konfirmasi hapus berhasil).
// Bila kategori sudah kosong, tampilkan pesan kosong + tombol kembali
// ke daftar kategori (bug:kat: dengan daftar kosong tidak mengirim
// apa-apa, jadi jangan arahkan ke sana).
async function tampilkanModeHapusBug(env, chatId, messageId, opKey, katKey, hal, notice) {
  const hosts = await daftarHostKategori(env, opKey, katKey);
  const totalHal = Math.max(1, Math.ceil(hosts.length / PICKER_HOST_PER_HALAMAN));
  const h = Math.min(Math.max(hal || 0, 0), totalHal - 1);
  const judul = "🗑️ <b>Hapus Bug — " + escapeHtml(labelOperator(opKey)) + " — " + escapeHtml(labelKategori(opKey, katKey)) + "</b>";
  const awalan = notice ? notice + "\n\n" : "";
  if (!hosts.length) {
    await editAtauKirim(env, chatId, messageId, awalan + judul + "\n\nKategori ini sudah tidak ada bug lagi.", [
      [{ text: "⬅️ Kembali ke Kategori", callback_data: "bug:op:" + opKey }],
      ...TOMBOL_KEMBALI,
    ]);
    return;
  }
  await editAtauKirim(env, chatId, messageId,
    awalan + judul + "\n\nKetuk host yang mau dihapus" + (totalHal > 1 ? " (halaman " + (h + 1) + "/" + totalHal + ")" : "") + ":",
    keyboardHapusBug(hosts, opKey, katKey, h));
}

// Kirim daftar pemilih bug sesuai st.pilihBug.langkah.
async function kirimPilihBug(env, chatId, st) {
  // Pemilih bug di dalam wizard template (v2.9.2): edit pesan wizard
  // yang sama (st.msgId), bukan kirim pesan baru tiap langkah picker.
  const tampil = async (teks, kb) => { st.msgId = await editAtauKirim(env, chatId, st.msgId, teks, kb); };
  const pb = st.pilihBug;
  if (!pb) return;
  if (pb.langkah === "operator") {
    await tampil("📋 <b>Pilih dari Daftar Bug</b>\n\nPilih operator:", keyboardPilihBugOperator());
  } else if (pb.langkah === "kategori") {
    const kv = await ambilBugsKv(env);
    await tampil("📋 <b>Pilih dari Daftar Bug</b> (" + labelOperator(pb.op) + ")\n\nPilih kategori:", keyboardPilihBugKategori(pb.op, Object.keys(kv[pb.op] || {})));
  } else if (pb.langkah === "host") {
    const per = PICKER_HOST_PER_HALAMAN;
    const totalHal = Math.max(1, Math.ceil(pb.hosts.length / per));
    const hal = Math.min(pb.page || 0, totalHal - 1);
    await tampil("📋 <b>Pilih dari Daftar Bug</b> (" + labelOperator(pb.op) + " — " + labelKategori(pb.op, pb.kat) + ")\n\nKetuk host yang mau dipakai" + (totalHal > 1 ? " (halaman " + (hal + 1) + "/" + totalHal + ")" : "") + ":", keyboardPilihBugHost(st));
  }
}

function keyboardTemplateYaTidak(prefix, batal) {
  return [
    [{ text: "Ya", callback_data: prefix + ":ya" }, { text: "Tidak", callback_data: prefix + ":tidak" }],
    [{ text: "❌ Batal", callback_data: batal || "admin:batal" }],
  ];
}

function keyboardTemplateSimpan() {
  return [
    [{ text: "💾 Simpan", callback_data: "tw:simpan" }],
    [{ text: "❌ Batal", callback_data: "admin:batal" }],
  ];
}

const TEKS_PANEL_ADMIN = "⚙️ <b>Menu Admin</b>\n\nPilih yang mau dilakukan:";

// Menu utama: PESAN_START + keyboard inline saja. (Tombol reply keyboard
// "▶️ Start" bawah dihapus 21 Nov 2026 atas permintaan Asep — tidak berguna.)
// Karena keyboard lama masih nempel di HP pengguna (Telegram menyimpan
// reply keyboard sampai dihapus eksplisit), /start pertama kali juga
// mengirim pesan remove_keyboard sekali per pengguna (dilacak KV KBRM).
// Menu utama: bila messageId diisi (dipicu tap tombol), EDIT pesan itu
// jadi menu (anti-numpuk, v2.9.2); bila kosong (perintah /start),
// kirim baru seperti biasa.
async function tampilkanMenuUtama(env, chatId, messageId, diGrup) {
  const teks = diGrup ? PESAN_GRUP : PESAN_START;
  const kb = keyboardStart(diGrup ? false : cekAdmin(env, chatId) === "ya", diGrup);
  if (messageId) {
    await editAtauKirim(env, chatId, messageId, teks, kb);
  } else {
    await sendTelegram(env, chatId, teks, kb);
  }
  // Di grup jangan kirim pesan hapus-keyboard (numpang di obrolan grup).
  if (!diGrup) await hapusKeyboardBawahSekali(env, chatId);
}

// ================= PEMICU KATA DI GRUP (v2.9.13, v2.9.14) =================
// Member ketik kata tertentu di grup -> bot membalas skill-nya,
// seperti bot grup profesional. HANYA di grup (DM sudah punya
// perintah & alur sendiri). Cocok bila pesan SAMA DENGAN kata kunci
// atau DIAWALI kata kunci + spasi ("bug xl", "cara buat config");
// "bugnya mati" TIDAK cocok (kata menempel). Satu pemicu dibatasi
// 1 balasan per 60 detik per grup supaya tidak spam.
// (v2.9.14) "bug" ber-argumen: polos -> marah, +operator/kategori
// -> tampilin bug-nya; "beli" -> candaan admin (buka toko);
// tambah "minta", "gak bisa"/"gabisa", "males"/"mls".
const PEMICU_GRUP = [
  { kata: ["daftar bug", "list bug", "bug"], aksi: "bug" },
  { kata: ["berapa", "berapaan", "gratis", "harga", "price"], aksi: "harga" },
  { kata: ["cara pakai", "cara buat", "caranya", "cara", "tutorial", "gimana"], aksi: "cara" },
  { kata: ["dark tunnel", "apk", "aplikasi", "download"], aksi: "apk" },
  { kata: ["beli akun", "beli vpn", "beli"], aksi: "belicanda" },
  { kata: ["order", "trial", "vpn"], aksi: "beli" },
  { kata: ["bantuan", "menu", "help"], aksi: "menu" },
  { kata: ["buat config", "buatin config", "buatin", "config"], aksi: "config" },
  { kata: ["minta"], aksi: "minta" },
  { kata: ["gak bisa", "gabisa"], aksi: "gakbisa" },
  { kata: ["males", "mls"], aksi: "males" },
];

const cooldownPemicu = new Map();
export function resetCooldownPemicu() { cooldownPemicu.clear(); }

function normalisasiPemicu(teks) {
  return String(teks || "").toLowerCase().replace(/\s+/g, " ").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
}

export function cocokPemicu(teks) {
  const normal = normalisasiPemicu(teks);
  if (!normal) return null;
  for (const p of PEMICU_GRUP) {
    for (const k of p.kata) {
      if (normal === k || normal.startsWith(k + " ")) return p.aksi;
    }
  }
  return null;
}

// Argumen setelah kata "bug" ("bug xl" -> "xl", "bug" -> "").
export function argumenBug(teks) {
  const normal = normalisasiPemicu(teks);
  for (const k of ["daftar bug", "list bug", "bug"]) {
    if (normal === k) return "";
    if (normal.startsWith(k + " ")) return normal.slice(k.length + 1);
  }
  return "";
}

// Balasan tiap pemicu grup. Return true bila dibalas.
// (v2.9.14) "bug" ber-argumen + candaan "beli" + "minta"/"gak bisa"/"males".
async function balasPemicuGrup(env, chatId, aksi, teksAsli) {
  const kunci = chatId + ":" + aksi;
  const sekarang = Date.now();
  if (cooldownPemicu.has(kunci) && sekarang - cooldownPemicu.get(kunci) < 60000) return false;
  cooldownPemicu.set(kunci, sekarang);
  const tombolDm = env.BOT_USERNAME
    ? [[{ text: "💬 Buka di Chat Pribadi", url: "https://t.me/" + env.BOT_USERNAME }]]
    : undefined;
  if (aksi === "bug") {
    const marah = "bug apa kntl? tulis yg bener!";
    const arg = argumenBug(teksAsli);
    if (!arg) { await sendTelegram(env, chatId, marah); return true; }
    const kata = arg.split(" ").filter(Boolean);
    const op1 = normalisasiOperator(kata[0]);
    if (op1 && kata.length === 1) {
      const kv = await ambilBugsKv(env);
      await sendTelegram(env, chatId, "🐛 <b>Bug " + BUG_DB[op1].label + "</b>\n\nPilih kategori:", keyboardKategoriBug(op1, Object.keys(kv[op1] || {})));
      return true;
    }
    if (op1 && kata.length >= 2) {
      const kat = normalisasiKategori(kata[1]);
      if (kat && BUG_DB[op1].kategori[kat]) { await kirimDaftarBug(env, chatId, op1, kat); return true; }
      await sendTelegram(env, chatId, marah); return true;
    }
    const kat0 = normalisasiKategori(kata[0]);
    if (kat0) {
      const ops = Object.keys(BUG_DB).filter((o) => BUG_DB[o].kategori[kat0]);
      if (ops.length === 1) { await kirimDaftarBug(env, chatId, ops[0], kat0); return true; }
      if (ops.length > 1) {
        await sendTelegram(env, chatId, "🐛 Kategori <b>" + escapeHtml(labelKategori(ops[0], kat0)) + "</b> ada di beberapa operator, pilih dulu:",
          baris2(ops.map((o) => ({ text: BUG_DB[o].label, callback_data: "bug:op:" + o }))));
        return true;
      }
    }
    await sendTelegram(env, chatId, marah);
    return true;
  }
  if (aksi === "harga") {
    await sendTelegram(env, chatId,
      "💰 <b>Bot ini GRATIS</b> — buat config Dark Tunnel nggak bayar. Kirim akunmu ke @autosetdark_bot di chat pribadi, langsung jadi file .dark.\n\n" +
      "Kalau mau beli akun VPN-nya, di @sandekalavpn_bot: 1 hari Rp1.000, 7 hari Rp5.000, 30 hari Rp10.000.",
      [[{ text: "🛒 Beli Akun VPN", url: "https://t.me/sandekalavpn_bot" }, { text: "💬 Buka Bot", url: "https://t.me/" + (env.BOT_USERNAME || "autosetdark_bot") }]]);
    return true;
  }
  if (aksi === "cara") {
    await sendTelegram(env, chatId,
      "📖 <b>Cara pakai:</b>\n" +
      "1️⃣ Buka @autosetdark_bot di chat pribadi\n" +
      "2️⃣ Kirim akunmu apa adanya (SSH / VLESS / VMess / Trojan)\n" +
      "3️⃣ Unduh file .dark-nya, impor ke Dark Tunnel, tekan Connect\n\n" +
      "🔒 Akunmu tidak disimpan.",
      tombolDm);
    return true;
  }
  if (aksi === "apk") {
    await sendTelegram(env, chatId, "📥 <b>Download aplikasi Dark Tunnel:</b>", TOMBOL_APK);
    return true;
  }
  if (aksi === "beli") {
    await sendTelegram(env, chatId,
      "🛒 Beli akun VPN / trial di @sandekalavpn_bot — 1 hari Rp1.000, 7 hari Rp5.000, 30 hari Rp10.000. Trial gratis tersedia buat pengguna baru.",
      [[{ text: "🛒 Buka @sandekalavpn_bot", url: "https://t.me/sandekalavpn_bot" }]]);
    return true;
  }
  if (aksi === "belicanda") {
    await sendTelegram(env, chatId, "admin ngntt! buka tokonya! bot jualan kok buka tutup, kaya warung aja!");
    return true;
  }
  if (aksi === "minta") {
    await sendTelegram(env, chatId, "minta-minta mulu ngntt! beli!");
    return true;
  }
  if (aksi === "gakbisa") {
    await sendTelegram(env, chatId, "belajar lah kntl! biar gak tlol!");
    return true;
  }
  if (aksi === "males") {
    await sendTelegram(env, chatId, "usaha dngo! biar gk mskin!");
    return true;
  }
  if (aksi === "menu") {
    await tampilkanMenuUtama(env, chatId, undefined, true);
    return true;
  }
  if (aksi === "config") {
    await sendTelegram(env, chatId,
      "⚡ Buat config lewat chat pribadi ya — biar akun kamu nggak kelihatan orang lain.",
      tombolDm);
    return true;
  }
  return false;
}

// Daftar kata pemicu grup (/catatan, v2.9.14).
const CATATAN_PEMICU =
  "📝 <b>Catatan — kata yang mancing bot di grup:</b>\n\n" +
  "Ketik di awal pesan, bot langsung balas:\n\n" +
  "🐛 <code>bug</code> — bot marah, tulis yang bener!\n" +
  "🐛 <code>bug &lt;operator&gt;</code> — tampilin bug operator itu (xl, telkomsel, axis, indosat, tri, byu, smartfren)\n" +
  "🐛 <code>bug &lt;kategori&gt;</code> — tampilin bug kategori itu (edu, ilped, opok, wa, game, sosmed, musik, nonton, conference, appfun)\n" +
  "💰 <code>harga</code> — bot ini GRATIS + harga akun VPN\n" +
  "📖 <code>cara</code> — cara pakai\n" +
  "📥 <code>apk</code> — link download Dark Tunnel\n" +
  "🛒 <code>beli</code> — bot ngeledek admin soal toko buka-tutup\n" +
  "🛒 <code>order</code> / <code>trial</code> / <code>vpn</code> — arahan beli akun ke @sandekalavpn_bot\n" +
  "💬 <code>menu</code> — menu grup\n" +
  "⚡ <code>config</code> — arahan ke chat pribadi\n" +
  "🙏 <code>minta</code> — bot ngomel\n" +
  "😤 <code>gak bisa</code> / <code>gabisa</code> — bot nyuruh belajar\n" +
  "😴 <code>males</code> / <code>mls</code> — bot nyuruh usaha\n\n" +
  "🌐 <code>/cek</code> / <code>/cekdomain</code> / <code>/cekrespon</code> — cek domain\n\n" +
  "Satu kata yang sama cuma dibalas sekali per 60 detik biar nggak spam.";

// Jalankan cek domain lalu kirim hasilnya (dipakai mulaiCekDomain
// + alur pendingCek di grup).
async function kirimHasilCek(env, chatId, domain) {
  let hasilCek;
  try { hasilCek = await cekDomain(domain); }
  catch { hasilCek = { domain, ok: false, status: 0, ms: 0, cdn: "", server: "", ips: [], hostname: "", subdomains: null }; }
  await sendTelegram(env, chatId, formatHasilCek(hasilCek), [
    [{ text: "🔄 Cek Lagi", callback_data: "cek:mulai" }],
    ...TOMBOL_KEMBALI,
  ]);
}

// Mulai cek domain: kalau argumen berisi domain, langsung cek;
// kalau tidak, minta domain (pendingCek). Dipakai /cek,
// /cekdomain, /cekrespon — di grup maupun DM.
async function mulaiCekDomain(env, chatId, argumen) {
  const domain = bersihkanDomain(argumen);
  if (domain) { await kirimHasilCek(env, chatId, domain); return; }
  pendingCek.set(chatId, { ts: Date.now() });
  await sendTelegram(env, chatId, "🌐 <b>Cek Domain</b>\n\nKirim domain yang mau dicek — mis. <code>edu.ruangguru.com</code>.", TOMBOL_KEMBALI);
}

// Kirim daftar bug satu kategori sebagai pesan baru (jalur pemicu grup).
async function kirimDaftarBug(env, chatId, opKey, katKey) {
  const daftar = await daftarBugPesanGabungan(env, opKey, katKey);
  if (!daftar) { await sendTelegram(env, chatId, "😕 Kategori itu tidak ada."); return; }
  for (let i = 0; i < daftar.length; i++) {
    const kb = i === daftar.length - 1 ? keyboardKembaliBug(opKey, katKey, false) : undefined;
    await sendTelegram(env, chatId, daftar[i], kb);
  }
}

// ---- Nudge sepi grup (v2.9.14) ----
// Tiap pesan grup dicatat waktu terakhirnya (KV GRUP_AKTIF:<id>,
// ditulis ulang bila sudah lewat 5 menit — hemat jatah tulis KV).
// Cron per jam memanggil cekGrupSepi: grup yang sepi > 6 jam
// dinudge sekali per masa sepi ("sepi amat ini grup! ngobrol kek!").
async function catatAktivitasGrup(env, chatId) {
  if (!env.DATA) return;
  try {
    const kunci = "GRUP_AKTIF:" + chatId;
    const lama = Number(await env.DATA.get(kunci).catch(() => null)) || 0;
    if (lama && Date.now() - lama < 5 * 60 * 1000) return;
    await env.DATA.put(kunci, String(Date.now()));
  } catch { /* abaikan */ }
}

// ---- Roast broadcast sandekala (v2.9.15) ----
// Bot reseller menulis flag ke KV DATA tiap kali broadcast buka/tutup
// sampai ke grup (ROAST_BUKA:<idGrup> / ROAST_TUTUP:<idGrup> = waktu).
// Cron (tiap 10 menit) memanggil ini: flag segar (< 30 menit) dibalas
// candaan, flag basi dibuang diam-diam. Bot tidak bisa melihat pesan
// bot lain di Telegram, jadi flag KV ini jembatannya — candaan muncul
// paling lambat 10 menit sesudah broadcast, bukan balasan ber-thread.
export async function cekRoastSandekala(env) {
  if (!env.DATA || !env.BOT_TOKEN) return;
  const sekarang = Date.now();
  for (const prefix of ["ROAST_BUKA:", "ROAST_TUTUP:"]) {
    let daftar;
    try { daftar = await env.DATA.list({ prefix }); } catch { continue; }
    for (const key of daftar.keys || []) {
      const chatId = key.name.slice(prefix.length);
      let ts = 0;
      try { ts = Number(await env.DATA.get(key.name)) || 0; } catch { /* abaikan */ }
      try { await env.DATA.delete(key.name); } catch { /* abaikan */ }
      if (!ts || sekarang - ts > 30 * 60 * 1000) continue; // basi, buang diam-diam
      const teks = prefix === "ROAST_BUKA:" ? "kemana aja lu? niat jualan gak sih?" : "wkwkwk bot kok tutup njng!";
      await sendTelegram(env, Number(chatId), teks);
    }
  }
}

export async function cekGrupSepi(env) {
  if (!env.DATA || !env.BOT_TOKEN) return;
  let daftar;
  try { daftar = await env.DATA.list({ prefix: "GRUP_AKTIF:" }); } catch { return; }
  const sekarang = Date.now();
  for (const key of daftar.keys || []) {
    const chatId = key.name.slice("GRUP_AKTIF:".length);
    let terakhir = 0;
    try { terakhir = Number(await env.DATA.get(key.name)) || 0; } catch { /* abaikan */ }
    if (!terakhir || sekarang - terakhir < 6 * 3600 * 1000) continue;
    let nudgeTerakhir = 0;
    try { nudgeTerakhir = Number(await env.DATA.get("GRUP_NUDGE:" + chatId)) || 0; } catch { /* abaikan */ }
    if (nudgeTerakhir && nudgeTerakhir >= terakhir) continue; // sudah dinudge sejak aktivitas terakhir
    await sendTelegram(env, Number(chatId), "sepi amat ini grup! ngobrol kek!");
    try { await env.DATA.put("GRUP_NUDGE:" + chatId, String(sekarang)); } catch { /* abaikan */ }
  }
}

// Hapus reply keyboard "▶️ Start" lama — sekali per pengguna (KV KBRM).
// Telegram tidak bisa menghapus reply keyboard lewat pesan inline_keyboard;
// harus pesan khusus dengan remove_keyboard. Tanpa KV: dilewati diam-diam.
async function hapusKeyboardBawahSekali(env, chatId) {
  if (!env.DATA) return;
  try {
    if (await env.DATA.get("KBRM:" + chatId)) return;
    await telegramApi(env, "sendMessage", {
      chat_id: chatId,
      text: "Tombol ▶️ Start di bawah sudah dihapus.",
      reply_markup: { remove_keyboard: true },
    });
    await env.DATA.put("KBRM:" + chatId, "1");
  } catch { /* abaikan */ }
}

// ================= HANDLER TELEGRAM =================

// Pilihan metode payload yang sedang menunggu (per chat, sementara di
// memori saja — bukan KV, tidak persisten). Isi: {teks, ts}.
const pendingMetode = new Map();

// Akun yang sedang ditunggu untuk /tambahconfig (per chat admin,
// sementara di memori saja). Isi: {op, kat, nama, ts}.
const pendingConfig = new Map();

// Template yang sedang dipakai pengguna (per chat, sementara di
// memori saja — bukan KV). Isi: {templateId, ts}. Dipakai alur
// /config -> ketuk template -> kirim akun -> generate pakai template.
const pendingTemplate = new Map();

// State admin tertunda dari tombol panel admin (per chat admin,
// sementara di memori saja). Isi: {jenis: "bug"|"config"|"broadcast"|
// "template", tahap, ...}. Untuk "template": wizard Template Config
// v2.7 — {tahap, tipe, op, kat, nama, ssh: {...}, xray: {...}, ts}.
const pendingAdmin = new Map();

async function handlePesanAkun(env, chatId, teks, opts = {}) {
  let hasil;
  try {
    hasil = await parsePesan(teks, { ...opts, env });
  } catch (e) {
    await kabariAdmin(env, "parse gagal: " + String(e && e.message || e).slice(0, 200));
    await sendTelegram(env, chatId,
      "😕 Maaf, bot gagal membaca pesan itu. Coba kirim lagi akunnya — link VLESS / VMess / Trojan / Shadowsocks, atau akun SSH (host, port, username, password).", TOMBOL_KEMBALI);
    return;
  }

  if (!hasil.configs.length) {
    // Ada jejak SSH tapi field kurang → sebut field yang hilang.
    if (hasil.adaSsh && hasil.kurangSsh.length) {
      await sendTelegram(env, chatId,
        "🔎 Akun SSH-nya belum lengkap — yang tidak ketemu: <b>" + escapeHtml(hasil.kurangSsh.join(", ")) + "</b>.\n\n" +
        "Kirim lagi dengan format <code>host:port@user:pass</code> atau <code>user:pass@host:port</code>.");
      return;
    }
    // Pesan sampah / tidak ada akun sama sekali → panduan singkat.
    await sendTelegram(env, chatId,
      "🤔 Bot tidak menemukan akun di pesan itu.\n\n" +
      "Kirim akun <b>SSH</b> atau link <b>VLESS / VMess / Trojan / Shadowsocks</b> — boleh ditempel apa adanya, bot yang rapikan.\n\n" +
      "Ketik /help untuk panduan lengkap.");
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

  // Sukses: 1 config = 1 file .dark (tanpa link teks di chat).
  // Caption tiap file: nama config + rincian + cara impor + catatan bug.
  const catatanBug = await catatanBugUntuk(env, hasil);
  for (const c of hasil.configs) {
    const rincian = ringkasanConfig(c);
    const caption = "✅ <b>Config Dark Tunnel jadi:</b> " + escapeHtml(c.type + " — " + c.name) +
      (rincian ? "\n\n" + rincian : "") + "\n\n" + CARA_IMPOR + catatanBug;
    await sendDocument(env, chatId, namaFileDark(c.name, c.type), toDarktunnelLink(c) + "\n", caption, TOMBOL_APK);
  }
}

// Simpan bug admin ke KV (upsert): bila host sudah ada di kategori itu,
// catatannya diperbarui dan ts-nya disegarkan. Lalu catat update +
// siarkan ke pengguna. Dipakai /tambahbug dan tombol "➕ Tambah Bug".
// Return {aksi: "ditambahkan"|"diupdate", terkirim} atau null bila gagal.
async function simpanBug(env, op, kat, host, catatan) {
  const bugs = await ambilBugsKv(env);
  bugs[op] = bugs[op] || {};
  bugs[op][kat] = bugs[op][kat] || [];
  const sudah = bugs[op][kat].find((e) => String(e.host || "").toLowerCase() === host);
  let aksi;
  if (sudah) {
    sudah.catatan = catatan;
    sudah.tanggal = tanggalWib();
    sudah.ts = Date.now();
    aksi = "diupdate";
  } else {
    bugs[op][kat].unshift({ host, catatan, tanggal: tanggalWib(), ts: Date.now() });
    aksi = "ditambahkan";
  }
  if (!await kvPut(env, "BUGS", bugs)) return null;
  // Host yang pernah dihapus lalu ditambah lagi harus muncul lagi:
  // bersihkan entri deleted-set-nya (bila ada).
  const dihapus = await ambilBugDihapusKv(env);
  const kunci = kunciBugDihapus(op, kat, host);
  if (dihapus[kunci]) {
    delete dihapus[kunci];
    await kvPut(env, "BUG_DELETED", dihapus);
  }
  const label = labelOperator(op) + " — " + labelKategori(op, kat);
  await catatUpdate(env, "Bug " + (aksi === "diupdate" ? "diupdate" : "baru") + ": " + host + " (" + label + ")");
  const terkirim = await siarkanUpdate(env, "🆕 Update: bug " + (aksi === "diupdate" ? "diupdate" : "baru") + " — <code>" + escapeHtml(host) + "</code> (" + label + "). Ketik /bug buat lihat daftar terbaru.");
  return { aksi, terkirim };
}

// ---- Perintah admin /tambahbug <operator> <kategori> <host> [catatan] ----
async function handleTambahBug(env, chatId, teks) {
  const args = teks.split(/\s+/).slice(1);
  const [opRaw, katRaw, hostRaw, ...catatanParts] = args;
  const op = normalisasiOperator(opRaw);
  if (!op) {
    await sendTelegram(env, chatId,
      "😕 Operator tidak dikenal. Pakai salah satu: <b>xl, axis, telkomsel, indosat, smartfren, tri, byu</b>.\n\n" +
      "Format: <code>/tambahbug &lt;operator&gt; &lt;kategori&gt; &lt;host&gt; [catatan]</code>\n" +
      "Contoh: <code>/tambahbug telkomsel opok tdwcontent.telkomsel.com</code>");
    return;
  }
  const kat = normalisasiKategori(katRaw);
  if (!kat) {
    await sendTelegram(env, chatId,
      "😕 Kategori tidak dikenal. Pakai salah satu: <b>edu, opok, wa, game, sosmed, musik, nonton, conference, appfun</b>.");
    return;
  }
  if (!hostRaw || !validBugHost(hostRaw)) {
    await sendTelegram(env, chatId,
      "😕 Host tidak valid. Isi host yang benar, mis. <code>edu.ruangguru.com</code>.");
    return;
  }
  const host = hostRaw.trim().toLowerCase();
  if (!env.DATA) {
    await sendTelegram(env, chatId, "⚠️ Fitur admin belum aktif — KV belum dipasang di Worker.");
    return;
  }
  const catatan = catatanParts.join(" ").trim();
  const hasil = await simpanBug(env, op, kat, host, catatan);
  if (!hasil) {
    await sendTelegram(env, chatId, "⚠️ Gagal menyimpan bug — coba lagi nanti ya.");
    return;
  }
  await sendTelegram(env, chatId, "✅ Bug " + hasil.aksi + ": <code>" + escapeHtml(host) + "</code> (" + labelOperator(op) + " — " + labelKategori(op, kat) + ").");
  await sendTelegram(env, chatId, "📣 Update terkirim ke " + hasil.terkirim + " pengguna.");
}

// Simpan satu TunnelConfig sebagai config contoh (upsert menurut nama):
// bila nama sudah ada, isinya diganti (id lama dipertahankan). Lalu
// kirim file .dark ke admin, catat update + siarkan. Dipakai
// /tambahconfig (teks/link darktunnel://) dan dokumen .dark.
// `hasil` (opsional) = hasil parsePesan, untuk catatan bug di caption.
// Return true bila berhasil disimpan.
async function simpanConfigContoh(env, chatId, pending, cfg, hasil) {
  const link = toDarktunnelLink(cfg);
  const configs = await ambilConfigsKv(env);
  const namaLower = String(pending.nama || "").toLowerCase();
  const idx = configs.findIndex((e) => String(e.nama || "").toLowerCase() === namaLower);
  const aksi = idx >= 0 ? "diupdate" : "ditambahkan";
  const entri = { id: idx >= 0 ? configs[idx].id : Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nama: pending.nama, operator: pending.op, kategori: pending.kat, link, tanggal: tanggalWib(), ts: Date.now() };
  if (idx >= 0) configs[idx] = entri; else configs.unshift(entri);
  if (!await kvPut(env, "CONFIGS", configs.slice(0, 20))) {
    await sendTelegram(env, chatId, "⚠️ Gagal menyimpan config — coba lagi nanti ya.");
    return false;
  }
  pendingConfig.delete(chatId);
  const sub = cfg.sshTunnelConfig || cfg.vmessTunnelConfig || cfg.vlessTunnelConfig || cfg.trojanTunnelConfig || cfg.shadowsocksTunnelConfig;
  const hasilBug = hasil || { bug: sub?.injectConfig?.serverNameIndication || null, adaInject: !!sub?.injectConfig };
  const catatanBug = await catatanBugUntuk(env, hasilBug);
  const rincian = ringkasanConfig(cfg);
  const caption = "✅ Config contoh " + aksi + ": <b>" + escapeHtml(pending.nama) + "</b> (" + labelOperator(pending.op) + " — " + labelKategori(pending.op, pending.kat) + ")." +
    (rincian ? "\n\n" + rincian : "") + "\n\n" + CARA_IMPOR + catatanBug;
  await sendDocument(env, chatId, namaFileDark(pending.nama, cfg.type), link + "\n", caption, TOMBOL_APK);
  await catatUpdate(env, "Config " + (aksi === "diupdate" ? "diupdate" : "baru") + ": " + pending.nama + " (" + labelOperator(pending.op) + " — " + labelKategori(pending.op, pending.kat) + ")");
  const terkirim = await siarkanUpdate(env, "🆕 Config " + (aksi === "diupdate" ? "diupdate" : "baru") + ": <b>" + escapeHtml(pending.nama) + "</b> (" + labelOperator(pending.op) + " — " + labelKategori(pending.op, pending.kat) + "). Ketik /config buat ambil.");
  await sendTelegram(env, chatId, "📣 Update terkirim ke " + terkirim + " pengguna.");
  return true;
}

// ---- Perintah admin /tambahconfig (dua langkah: perintah, lalu akun) ----
// Akun bisa berupa teks biasa, link darktunnel://, atau file .dark
// (dokumen ditangani handleDokumenConfig).
async function handleTambahConfigAkun(env, chatId, teks) {
  const pending = pendingConfig.get(chatId);
  if (!pending) return false;
  let hasil;
  try { hasil = await parsePesan(teks, { env }); } catch { hasil = { configs: [], kurangSsh: [], adaSsh: false }; }
  if (!hasil.configs.length) {
    let alasan = "tidak ditemukan akun di pesan itu";
    if (hasil.adaSsh && hasil.kurangSsh.length) alasan = "akun SSH belum lengkap — tidak ketemu: " + hasil.kurangSsh.join(", ");
    await sendTelegram(env, chatId, "😕 Config tidak bisa diproses: <b>" + escapeHtml(alasan) + "</b>. Kirim ulang akunnya.");
    return true; // tetap menunggu
  }
  await simpanConfigContoh(env, chatId, pending, hasil.configs[0], hasil);
  return true;
}

// ---- Dokumen .dark dari admin yang sedang ditunggu akunnya ----
// Unduh file (getFile + download), ambil baris darktunnel:// pertama,
// decode, simpan sebagai config contoh. Bila file bukan .dark / tidak
// bisa di-decode, balas ramah dan JANGAN hapus state (admin bisa kirim
// ulang). Dokumen dari non-admin atau tanpa state ditunggu diabaikan.
async function handleDokumenConfig(env, msg) {
  const chatId = msg.chat.id;
  if (cekAdmin(env, chatId) !== "ya") return;
  const pending = pendingConfig.get(chatId);
  if (!pending) return;
  const doc = msg.document || {};
  const namaFile = String(doc.file_name || "");
  const gagal = "😕 File tidak bisa dibaca — kirim file .dark hasil ekspor Dark Tunnel.";
  if (!/\.dark(\.backup)?$/i.test(namaFile) || !doc.file_id) {
    await sendTelegram(env, chatId, gagal);
    return;
  }
  let isi = "";
  try {
    const info = await telegramApi(env, "getFile", { file_id: doc.file_id });
    const path = info?.result?.file_path;
    if (!path) throw new Error("tanpa file_path");
    const res = await fetch("https://api.telegram.org/file/bot" + env.BOT_TOKEN + "/" + path, { signal: AbortSignal.timeout(15000) });
    if (!res || !res.ok) throw new Error("unduh gagal");
    isi = await res.text();
  } catch {
    await sendTelegram(env, chatId, gagal);
    return;
  }
  const baris = String(isi).split("\n").map((s) => s.trim()).find((s) => s.startsWith("darktunnel://"));
  const cfg = baris ? fromDarktunnelLink(baris) : null;
  if (!cfg) {
    await sendTelegram(env, chatId, gagal);
    return;
  }
  await simpanConfigContoh(env, chatId, pending, cfg);
}

// ================= WIZARD TEMPLATE CONFIG (v2.7) =================
// Wizard bertahap di panel admin ("➕ Tambah Config"). State di
// ---- Wizard Tambah Bug (v2.8.1) ----
// Panel admin "➕ Tambah Bug" kini wizard langkah-demi-langkah (bukan
// lagi format satu baris "operator | kategori | host | catatan"):
// operator -> kategori -> host -> catatan -> ringkasan -> simpan.
// Perintah teks /tambahbug tetap jalan seperti biasa (jalur cepat).
// pendingAdmin: {jenis: "bug", tahap, op, kat, host, catatan, ts}.
// Tahap teks (kategori_baru, host, catatan) ditangani handleBugTeks;
// tahap tombol (operator, kategori, ringkasan) di router callback "ab:".
const TOMBOL_BATAL_BUG = [[{ text: "❌ Batal", callback_data: "admin:batal" }]];

// Keyboard tahap catatan yang bisa dikosongkan: Lewati + Batal.
const TOMBOL_LEWATI_BUG = [
  [{ text: "⏭️ Lewati", callback_data: "ab:lewati" }, { text: "❌ Batal", callback_data: "admin:batal" }],
];

function keyboardBugOperator() {
  const ops = Object.entries(BUG_DB);
  const rows = [];
  for (let i = 0; i < ops.length; i += 2) {
    rows.push(ops.slice(i, i + 2).map(([k, v]) => ({ text: v.label, callback_data: "ab:op:" + k })));
  }
  rows.push([{ text: "❌ Batal", callback_data: "admin:batal" }]);
  return rows;
}

// Kategori operator itu (bawaan + yang cuma ada di KV), urutan
// URUTAN_KATEGORI seperti keyboardKategoriBug. kvKats = daftar kunci
// kategori dari KV BUGS untuk operator itu (boleh kosong).
function keyboardBugKategori(opKey, kvKats) {
  const op = BUG_DB[opKey];
  const katsBawaan = op ? Object.keys(op.kategori) : [];
  const semua = [...new Set([...katsBawaan, ...(kvKats || [])])].sort((a, b) => {
    const ia = URUTAN_KATEGORI.indexOf(a), ib = URUTAN_KATEGORI.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const rows = baris2(semua.map((k) => ({ text: labelKategori(opKey, k), callback_data: "ab:kat:" + opKey + ":" + k })));
  rows.push([{ text: "➕ Kategori Baru", callback_data: "ab:kat:baru" }]);
  rows.push([{ text: "⬅️ Ganti operator", callback_data: "ab:kembali:op" }]);
  rows.push([{ text: "❌ Batal", callback_data: "admin:batal" }]);
  return rows;
}

function keyboardBugSimpan() {
  return [
    [{ text: "💾 Simpan", callback_data: "ab:simpan" }],
    [{ text: "❌ Batal", callback_data: "admin:batal" }],
  ];
}

// Kirim prompt untuk tahap wizard Tambah Bug saat ini.
async function kirimLangkahBug(env, chatId, st) {
  // Satu pesan wizard yang diedit tiap langkah (v2.9.2): bila st.msgId
  // ada, edit pesan itu; bila tidak, kirim baru dan simpan msgId-nya.
  const tampil = async (teks, kb) => { st.msgId = await editAtauKirim(env, chatId, st.msgId, teks, kb); };
  const t = st.tahap;
  if (t === "operator") {
    await tampil("➕ <b>Tambah Bug</b>\n\nPilih operator:", keyboardBugOperator());
  } else if (t === "kategori") {
    const kv = await ambilBugsKv(env);
    await tampil("➕ <b>Tambah Bug</b> (" + labelOperator(st.op) + ")\n\nPilih kategori:", keyboardBugKategori(st.op, Object.keys(kv[st.op] || {})));
  } else if (t === "kategori_baru") {
    await tampil("🆕 <b>Kategori Baru</b>\n\nKirim nama kategori baru — mis. <code>belajar</code>.\n\nHuruf kecil, tanpa spasi (boleh angka / tanda <code>-</code>). Kategori ini cuma dipakai di bug ini.", TOMBOL_BATAL_BUG);
  } else if (t === "host") {
    await tampil("🐛 <b>Host Bug</b> (" + labelOperator(st.op) + " — " + labelKategori(st.op, st.kat) + ")\n\nKetik host bug-nya — mis. <code>edu.ruangguru.com</code> atau IP (boleh pakai port, mis. <code>1.2.3.4:8080</code>).", TOMBOL_BATAL_BUG);
  } else if (t === "catatan") {
    await tampil("📝 <b>Catatan</b> (opsional)\n\nKetik catatan — mis. <code>opok tsel</code> atau <code>ws/wc</code>.\n\nKosong = tanpa catatan. Ketuk ⏭️ Lewati untuk kosong.", TOMBOL_LEWATI_BUG);
  } else if (t === "ringkasan") {
    await tampil("🐛 <b>Cek Bug</b>\n\n• Operator: <b>" + escapeHtml(labelOperator(st.op)) + "</b>\n• Kategori: <b>" + escapeHtml(labelKategori(st.op, st.kat)) + "</b>\n• Bug: <code>" + escapeHtml(st.host) + "</code>\n• Catatan: " + (st.catatan ? escapeHtml(st.catatan) : "—") + "\n\nSimpan bug ini?", keyboardBugSimpan());
  }
}

// Tangani pesan teks untuk wizard Tambah Bug (satu tahap per pesan).
// Return true bila ditangani (state tetap / maju), false bila bukan
// tahap teks wizard bug (tahap tombol ditangani router callback "ab:").
async function handleBugTeks(env, chatId, st, teks) {
  const t = st.tahap;
  // Error validasi mengedit prompt wizard yang sama (v2.9.2) —
  // bukan kirim pesan error baru.
  const salah = async (pesan, kb) => { st.msgId = await editAtauKirim(env, chatId, st.msgId, pesan, kb || TOMBOL_BATAL_BUG); return true; };
  if (t === "kategori_baru") {
    const kat = String(teks || "").trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{0,19}$/.test(kat)) return salah("😕 Nama kategori tidak valid. Pakai huruf kecil tanpa spasi, mis. <code>belajar</code> — huruf pertama harus huruf.");
    st.kat = normalisasiKategori(kat) || kat;
    st.tahap = "host"; st.ts = Date.now();
    await kirimLangkahBug(env, chatId, st);
    return true;
  }
  if (t === "host") {
    const host = String(teks || "").trim().toLowerCase();
    if (!host || !validBugHost(host)) return salah("😕 Host tidak valid. Kirim host yang benar, mis. <code>edu.ruangguru.com</code> atau IP — boleh pakai port.");
    st.host = host;
    st.tahap = "catatan"; st.ts = Date.now();
    await kirimLangkahBug(env, chatId, st);
    return true;
  }
  if (t === "catatan") {
    st.catatan = kosongkan(teks) || "";
    st.tahap = "ringkasan"; st.ts = Date.now();
    await kirimLangkahBug(env, chatId, st);
    return true;
  }
  return false;
}

// pendingAdmin: {jenis: "template", tahap, tipe, metode, op, kat, nama,
// ssh: {...}, xray: {...}, ts}. Tiap langkah teks: jawab "lewati"
// atau "-" untuk kosong. Tombol ❌ Batal di setiap langkah.

// "lewati" / "-" / kosong -> null (field kosong).
function kosongkan(s) {
  const v = String(s || "").trim();
  if (!v || v === "-" || v.toLowerCase() === "lewati") return null;
  return v;
}

function validPortNum(n) {
  const p = Number(n);
  return Number.isInteger(p) && p >= 1 && p <= 65535;
}

// "host:port" -> {host, port} atau null bila format salah.
function parseHostPort(s) {
  const m = String(s || "").trim().match(/^(.+):(\d{1,5})$/);
  if (!m || !validHost(m[1])) return null;
  const port = Number(m[2]);
  if (!validPortNum(port)) return null;
  return { host: m[1].toLowerCase(), port };
}

const TOMBOL_BATAL_TEMPLATE = [[{ text: "❌ Batal", callback_data: "admin:batal" }]];

// Keyboard tahap teks yang bisa dikosongkan: Lewati + Batal.
const TOMBOL_LEWATI_TEMPLATE = [
  [{ text: "⏭️ Lewati", callback_data: "tw:lewati" }, { text: "❌ Batal", callback_data: "admin:batal" }],
];

// Keyboard tahap yang isinya host/bug: pilih dari daftar bug + Lewati + Batal.
const TOMBOL_PILIH_BUG_TEMPLATE = [
  [{ text: "📋 Pilih dari Daftar Bug", callback_data: "tw:bug" }],
  [{ text: "⏭️ Lewati", callback_data: "tw:lewati" }, { text: "❌ Batal", callback_data: "admin:batal" }],
];

// Keyboard tahap teks yang isinya host/bug dan WAJIB diisi (tanpa Lewati):
// pilih dari daftar bug + Batal saja.
const TOMBOL_PILIH_BUG_WAJIB_TEMPLATE = [
  [{ text: "📋 Pilih dari Daftar Bug", callback_data: "tw:bug" }],
  [{ text: "❌ Batal", callback_data: "admin:batal" }],
];

// ---- Keyboard tahap mode MANUAL (v2.9.9, pengguna biasa) ----
// Sama seperti keyboard template, tapi tombol Batal pakai "mn:batal"
// (bukan "admin:batal" yang khusus admin). Lewati / Pilih Bug tetap
// "tw:*" — handler tw: sudah mode-aware (izinkan state manual).
const TOMBOL_BATAL_MANUAL = [[{ text: "❌ Batal", callback_data: "mn:batal" }]];
const TOMBOL_LEWATI_MANUAL = [
  [{ text: "⏭️ Lewati", callback_data: "tw:lewati" }, { text: "❌ Batal", callback_data: "mn:batal" }],
];
const TOMBOL_PILIH_BUG_MANUAL = [
  [{ text: "📋 Pilih dari Daftar Bug", callback_data: "tw:bug" }],
  [{ text: "⏭️ Lewati", callback_data: "tw:lewati" }, { text: "❌ Batal", callback_data: "mn:batal" }],
];
const TOMBOL_PILIH_BUG_WAJIB_MANUAL = [
  [{ text: "📋 Pilih dari Daftar Bug", callback_data: "tw:bug" }],
  [{ text: "❌ Batal", callback_data: "mn:batal" }],
];

// Tahap teks wizard yang bisa dikosongkan (tombol Lewati tampil).
const TAHAP_LEWATI = new Set([
  "ssh_port", "ssh_payload", "ssh_proxy", "ssh_proxyport", "ssh_sni", "ssh_udphost", "ssh_udpport",
  "xray_target", "xray_sni", "xray_header", "xray_payload", "xray_ssh",
  "xray_ns", "xray_pubkey", "xray_udphost", "xray_udpport",
  "xray_domain", "xray_server", "xray_bug", "xray_proxy", "xray_proxyport",
]);

// Tahap yang isinya host/bug (tombol Pilih dari Daftar Bug tampil).
const TAHAP_PILIH_BUG = new Set(["ssh_proxy", "ssh_sni", "xray_target", "xray_sni", "xray_header", "ssh_bug", "xray_domain", "xray_server", "xray_bug", "xray_bugserver", "xray_proxy"]);

// Keyboard tahap wizard template: tahap host/bug dapat tombol Pilih dari
// Daftar Bug (+ Lewati bila bisa dikosongkan); tahap lain yang bisa
// dikosongkan dapat Lewati; tahap wajib cuma Batal.
// (v2.9.9) Mode edit: semua tahap teks bisa dilewati (= pakai nilai
// lama). Mode manual: keyboard sama tapi Batal = "mn:batal".
function keyboardTahapTemplate(t, st) {
  if (st?.mode === "manual") {
    if (TAHAP_PILIH_BUG.has(t)) return TAHAP_LEWATI.has(t) ? TOMBOL_PILIH_BUG_MANUAL : TOMBOL_PILIH_BUG_WAJIB_MANUAL;
    if (TAHAP_LEWATI.has(t) || t === "nama") return TOMBOL_LEWATI_MANUAL;
    return TOMBOL_BATAL_MANUAL;
  }
  if (st?.editId) {
    if (TAHAP_PILIH_BUG.has(t)) return TOMBOL_PILIH_BUG_TEMPLATE;
    return TOMBOL_LEWATI_TEMPLATE;
  }
  if (TAHAP_PILIH_BUG.has(t)) return TAHAP_LEWATI.has(t) ? TOMBOL_PILIH_BUG_TEMPLATE : TOMBOL_PILIH_BUG_WAJIB_TEMPLATE;
  if (TAHAP_LEWATI.has(t)) return TOMBOL_LEWATI_TEMPLATE;
  return TOMBOL_BATAL_TEMPLATE;
}

// Nilai field saat ini untuk tahap ini (mode EDIT template, v2.9.9) —
// tampil di prompt supaya admin tahu apa yang dipertahankan bila
// ketuk ⏭️ Lewati. null = field kosong; undefined = tahap tombol
// (enhanced/slowdns/ringkasan) — tanpa baris nilai.
function nilaiTahapEdit(st, t) {
  if (t === "nama") return st.nama ?? null;
  const s = st.tipe === "SSH" ? (st.ssh || {}) : (st.xray || {});
  const hostPort = (h, p) => (h ? h + (p ? ":" + p : "") : null);
  switch (t) {
    case "ssh_port": return s.port ?? null;
    case "ssh_bug": return hostPort(s.host, s.port);
    case "ssh_payload": return s.payload ?? null;
    case "ssh_proxy": return hostPort(s.proxyHost, s.proxyPort);
    case "ssh_proxyport": return s.proxyPort ?? null;
    case "ssh_sni": return s.sni ?? null;
    case "ssh_ns": return s.dnsNameServer ?? null;
    case "ssh_pubkey": return s.dnsPublicKey ?? null;
    case "ssh_udphost": return s.dnsUdpHost ?? null;
    case "ssh_udpport": return s.dnsUdpPort ?? null;
    case "xray_target": return hostPort(s.targetHost, s.targetPort);
    case "xray_domain": return s.sni ?? null;
    case "xray_server": return hostPort(s.targetHost, s.targetPort);
    case "xray_bug": return s.targetHost ?? null;
    case "xray_bugserver": return hostPort(s.targetHost, s.targetPort);
    case "xray_host": return s.headerHost ?? null;
    case "xray_sni": return s.sni ?? null;
    case "xray_header": return s.headerHost ?? null;
    case "xray_payload": return s.payload ?? null;
    case "xray_proxy": return hostPort(s.proxyHost, s.proxyPort);
    case "xray_proxyport": return s.proxyPort ?? null;
    case "xray_ssh": return s.sshHost ? (s.sshHost + (s.sshPort ? ":" + s.sshPort : "") + "@" + (s.sshUser || "") + ":***") : null;
    case "xray_ns": return s.nameServer ?? null;
    case "xray_pubkey": return s.publicKey ?? null;
    case "xray_udphost": return s.udpDnsHost ?? null;
    case "xray_udpport": return s.udpDnsPort ?? null;
    default: return undefined;
  }
}

// Kirim prompt untuk tahap wizard template saat ini.
async function kirimLangkahTemplate(env, chatId, st) {
  // Satu pesan wizard yang diedit tiap langkah (v2.9.2): bila st.msgId
  // ada, edit pesan itu; bila tidak, kirim baru dan simpan msgId-nya.
  // (v2.9.9) Mode edit: tempel baris nilai saat ini di tiap tahap teks.
  const tampil = async (teks, kb) => {
    if (st.editId) {
      const lama = nilaiTahapEdit(st, st.tahap);
      if (lama !== undefined) {
        const tampilLama = (lama === null || lama === "") ? "<i>kosong</i>" : "<code>" + escapeHtml(String(lama).slice(0, 120)) + (String(lama).length > 120 ? "…" : "") + "</code>";
        teks += "\n\nNilai saat ini: " + tampilLama + " — ketuk ⏭️ Lewati untuk tetap pakai ini, atau kirim nilai baru (ketik <code>-</code> untuk mengosongkan).";
      }
    }
    st.msgId = await editAtauKirim(env, chatId, st.msgId, teks, kb);
  };
  const t = st.tahap;
  const batal = keyboardTahapTemplate(t, st);
  if (t === "tipe") {
    await tampil("🧩 <b>Template Config Baru</b>\n\nPilih tipe config:", keyboardTemplateTipe());
  } else if (t === "metode") {
    const judul = st.mode === "manual" ? "✏️ <b>Buat Config Manual</b>" : "🧩 <b>Template Config Baru</b>";
    await tampil(judul + " (" + (st.tipe === "SSH" ? "SSH" : "Xray / V2Ray") + ")\n\nPilih metode:", keyboardTemplateMetode(st.tipe, st.mode === "manual"));
  } else if (t === "operator") {
    await tampil("🧩 <b>Template Config Baru</b> (" + (st.tipe === "SSH" ? "SSH" : "Xray / V2Ray") + ")\n\nPilih operator:", keyboardTemplateOperator());
  } else if (t === "kategori") {
    await tampil("🧩 <b>Template Config Baru</b>\n\nPilih kategori (" + labelOperator(st.op) + "):", keyboardTemplateKategori(st.op));
  } else if (t === "kategori_baru") {
    await tampil("🆕 <b>Kategori Baru</b>\n\nKirim nama kategori baru — mis. <code>belajar</code>.\n\nHuruf kecil, tanpa spasi (boleh angka / tanda <code>-</code>). Kategori ini cuma dipakai di template ini.", batal);
  } else if (t === "nama") {
    if (st.mode === "manual") {
      await tampil("✏️ <b>Buat Config Manual</b>\n\nKirim <b>nama config</b> — bebas, mis. <code>Opok Ku</code>. File jadinya <code>&lt;nama&gt; by @autosetdark_bot.dark</code>.\n\nKetuk ⏭️ Lewati untuk pakai nama akun.", batal);
    } else if (st.editId) {
      await tampil("✏️ <b>Edit Template</b>\n\nKirim <b>nama template</b> baru — mis. <code>Opok Tsel SSH 1</code>.", batal);
    } else {
      await tampil("🧩 <b>Template Config Baru</b>\n\nKirim <b>nama template</b> — mis. <code>Opok Tsel SSH 1</code>.", batal);
    }
  } else if (t === "ssh_port") {
    await tampil("🔌 <b>Port SSH</b>\n\nKirim port (angka 1-65535, mis. <code>80</code> atau <code>443</code>).\n\nKosong = pakai port dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "ssh_payload") {
    await tampil("📝 <b>Payload</b>\n\nKirim teks payload lengkap (boleh pakai <code>[host]</code> / <code>[bug]</code> / <code>[ua]</code>).\n\nKosong = pakai payload default SSH (GET ... [host] ...). Ketuk ⏭️ Lewati untuk default.", batal);
  } else if (t === "ssh_proxy") {
    await tampil("🔀 <b>Proxy</b>\n\nKirim proxy — host saja (mis. <code>proxy.contoh.com</code>, port ditanya setelahnya) atau langsung format <code>host:port</code> (boleh dari daftar bug — atau ketuk 📋 Pilih dari Daftar Bug).\n\nKosong = tanpa proxy. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "ssh_proxyport") {
    await tampil("🔀 <b>Port Proxy</b>\n\nPort proxy untuk <code>" + escapeHtml(st.ssh?.proxyHost || "") + "</code>:\n\nKirim angka 1-65535 (mis. <code>80</code>, <code>443</code>, atau <code>8080</code>).\n\nKosong = default <code>8080</code>. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "ssh_bug") {
    await tampil("🐛 <b>Bug / Host SSH</b>\n\nKirim bug format <code>host:port</code> (mis. <code>bug.contoh.com:443</code>) atau host saja — atau ketuk 📋 Pilih dari Daftar Bug.\n\nHost & port bug ini dipakai sebagai host SSH (username/password tetap dari akun pengguna).", batal);
  } else if (t === "ssh_sni") {
    await tampil("🎯 <b>SNI</b>\n\nKetik SNI manual (host, contoh: <code>edu.ruangguru.com</code>) — atau ketuk 📋 Pilih dari Daftar Bug.\n\nKetik <code>[host]</code> supaya SNI ngikutin host akun pengguna.\n\nKosong = pakai bug/SNI dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "ssh_enhanced") {
    await tampil("⚡ <b>Enhanced</b>\n\nAktifkan payload Enhanced?", keyboardTemplateYaTidak("tw:enhanced", st.mode === "manual" ? "mn:batal" : undefined));
  } else if (t === "ssh_slowdns") {
    await tampil("🐢 <b>SlowDNS / DNSTT</b>\n\nPakai SlowDNS (UDP Custom + DNSTT)?", keyboardTemplateYaTidak("tw:slowdns", st.mode === "manual" ? "mn:batal" : undefined));
  } else if (t === "ssh_ns") {
    await tampil("🐢 <b>SlowDNS — Name Server</b>\n\nKirim name server SlowDNS (host/IP, mis. <code>id1.dnsx.my.id</code>).\n\nWajib diisi untuk SlowDNS.", batal);
  } else if (t === "ssh_pubkey") {
    await tampil("🐢 <b>SlowDNS — Public Key</b>\n\nKirim public key SlowDNS (teks kunci).\n\nWajib diisi untuk SlowDNS.", batal);
  } else if (t === "ssh_udphost") {
    await tampil("🐢 <b>SlowDNS — UDP DNS Host</b>\n\nKirim UDP DNS host (mis. <code>1.1.1.1</code>).\n\nKosong = default <code>1.1.1.1</code>. Ketuk ⏭️ Lewati untuk default.", batal);
  } else if (t === "ssh_udpport") {
    await tampil("🐢 <b>SlowDNS — UDP DNS Port</b>\n\nKirim UDP DNS port (angka 1-65535, mis. <code>53</code>).\n\nKosong = default <code>53</code>. Ketuk ⏭️ Lewati untuk default.", batal);
  } else if (t === "xray_target") {
    const judul = (st.metode === "WS" || st.metode === "WC") ? "🎯 <b>Target / Bug</b>" : "🎯 <b>Target Server</b>";
    await tampil(judul + "\n\nKirim target server format <code>host:port</code> (boleh dari daftar bug — atau ketuk 📋 Pilih dari Daftar Bug).\n\nKosong = dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_domain") {
    await tampil("🌐 <b>Domain</b>\n\nKetik domain (host, contoh: <code>sg1.contoh.com</code>) — atau ketuk 📋 Pilih dari Daftar Bug.\n\nDomain ini dipakai sebagai SNI/TLS dan Header Host.\n\nKetik <code>[host]</code> supaya SNI dan Header Host ngikutin host akun pengguna.\n\nKosong = dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_server") {
    await tampil("🎯 <b>Server / Domain</b>\n\nKirim server format <code>host:port</code> (mis. <code>sg1.contoh.com:443</code>) — atau ketuk 📋 Pilih dari Daftar Bug.\n\nDipakai sebagai host server + Header Host.\n\nKosong = dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_bug") {
    await tampil("🐛 <b>Bug</b>\n\nKetik bug (host, contoh: <code>api.quipper.com</code>) — atau ketuk 📋 Pilih dari Daftar Bug.\n\nKosong = dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_bugserver") {
    await tampil("🐛 <b>Bug / Server</b>\n\nKirim bug — host saja (mis. <code>bug.contoh.com</code>, port default 443) atau format <code>host:port</code> — atau ketuk 📋 Pilih dari Daftar Bug.", batal);
  } else if (t === "xray_host") {
    await tampil("🌐 <b>Host</b>\n\nKirim host (mis. <code>www.yourdomain.com</code>).\n\nWajib diisi — dipakai di SNI (onering) dan Header Host.", batal);
  } else if (t === "xray_proxy") {
    await tampil("🔀 <b>Proxy</b>\n\nKirim proxy — host saja (mis. <code>proxy.contoh.com</code>, port ditanya setelahnya) atau langsung format <code>host:port</code> (boleh dari daftar bug — atau ketuk 📋 Pilih dari Daftar Bug).\n\nKosong = tanpa proxy. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_proxyport") {
    await tampil("🔀 <b>Port Proxy</b>\n\nPort proxy untuk <code>" + escapeHtml(st.xray?.proxyHost || "") + "</code>:\n\nKirim angka 1-65535 (mis. <code>80</code>, <code>443</code>, atau <code>8080</code>).\n\nKosong = default <code>8080</code>. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_sni") {
    await tampil("🎯 <b>Server Name / SNI</b>\n\nKetik SNI manual (host, contoh: <code>sg1.contoh.com</code>) — atau ketuk 📋 Pilih dari Daftar Bug.\n\nKetik <code>[host]</code> supaya SNI ngikutin host akun pengguna.\n\nKosong = dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_header") {
    await tampil("🎯 <b>Header Host</b>\n\nKirim header host (host, boleh dari daftar bug — atau ketuk 📋 Pilih dari Daftar Bug).\n\nKosong = dari akun pengguna. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_payload") {
    await tampil("📝 <b>Payload</b> (opsional)\n\nKirim teks payload (boleh pakai <code>[host]</code> / <code>[bug]</code> / <code>[ua]</code>).\n\nKosong = tanpa payload. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_ssh") {
    await tampil("🔑 <b>Akun SSH</b> (opsional)\n\nKirim akun SSH format <code>host:port@user:pass</code>.\n\nDisimpan di template tapi tidak dipakai di config Xray. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_ns") {
    await tampil("🐢 <b>SlowDNS — Name Server</b> (opsional)\n\nKirim name server SlowDNS (host/IP, mis. <code>id1.dnsx.my.id</code>).\n\nSlowDNS aktif bila name server + public key sama-sama terisi. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_pubkey") {
    await tampil("🐢 <b>SlowDNS — Public Key</b> (opsional)\n\nKirim public key SlowDNS (teks kunci).\n\nSlowDNS aktif bila name server + public key sama-sama terisi. Ketuk ⏭️ Lewati untuk kosong.", batal);
  } else if (t === "xray_udphost") {
    await tampil("🐢 <b>SlowDNS — UDP DNS Host</b> (opsional)\n\nKirim UDP DNS host (mis. <code>1.1.1.1</code>).\n\nKosong = default <code>1.1.1.1</code>. Ketuk ⏭️ Lewati untuk default.", batal);
  } else if (t === "xray_udpport") {
    await tampil("🐢 <b>SlowDNS — UDP DNS Port</b> (opsional)\n\nKirim UDP DNS port (angka 1-65535, mis. <code>53</code>).\n\nKosong = default <code>53</code>. Ketuk ⏭️ Lewati untuk default.", batal);
  } else if (t === "ringkasan") {
    const tpl = { nama: st.nama, operator: st.op, kategori: st.kat, tipe: st.tipe, metode: st.metode, ssh: st.ssh, xray: st.xray };
    const judul = st.editId ? "✏️ <b>Cek Edit Template</b>" : "🧩 <b>Cek Template</b>";
    await tampil(judul + "\n\n" + ringkasanTemplate(tpl) + "\n\nSimpan template ini?", keyboardTemplateSimpan());
  }
}

// Tangani pesan teks untuk wizard template (satu tahap per pesan).
// Return true bila ditangani (state tetap / maju), false bila bukan
// wizard template.
async function handleTemplateTeks(env, chatId, st, teks) {
  const t = st.tahap;
  // Pesan error validasi memakai keyboard tahap yang sama (tahap host
  // tetap bisa pilih bug / lewati dari pesan error). Error mengedit
  // prompt wizard yang sama (v2.9.2) — bukan kirim pesan error baru.
  const kbSalah = keyboardTahapTemplate(t, st);
  const salah = async (pesan) => { st.msgId = await editAtauKirim(env, chatId, st.msgId, pesan, kbSalah); return true; };
  // (v2.9.9) Mode edit: ketuk ⏭️ Lewati = pakai nilai lama (bukan
  // kosongkan). Berlaku di semua tahap teks; tahap "nama" lanjut ke
  // tahap field pertama, tahap lain ke tahap berikutnya. Ketik "-"
  // tetap mengosongkan field (kosongkan("-") -> null).
  if (st.editId && String(teks || "").trim().toLowerCase() === "lewati") {
    if (t === "nama") st.tahap = tahapPertamaTemplate(st);
    else if (t === "kategori_baru") return false;
    else st.tahap = tahapBerikutTemplate(st, t);
    st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "kategori_baru") {
    const kat = String(teks || "").trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{0,19}$/.test(kat)) return salah("😕 Nama kategori tidak valid. Pakai huruf kecil tanpa spasi, mis. <code>belajar</code> — huruf pertama harus huruf.");
    st.kat = normalisasiKategori(kat) || kat;
    st.tahap = "nama"; st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "nama") {
    // (v2.9.9) Buat Manual: nama adalah tahap TERAKHIR — setelah
    // nama (atau Lewati = pakai nama akun) config langsung dibuat,
    // tidak disimpan sebagai template.
    if (st.mode === "manual") {
      st.nama = kosongkan(teks);
      st.ts = Date.now();
      await selesaikanManual(env, chatId, st);
      return true;
    }
    const nama = String(teks || "").trim();
    if (!nama) return salah("😕 Nama template belum diisi. Kirim nama template — mis. <code>Opok Tsel SSH 1</code>.");
    st.nama = nama;
    st.tahap = tahapPertamaTemplate(st);
    st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_port") {
    const v = kosongkan(teks);
    if (v !== null && !validPortNum(v)) return salah("😕 Port tidak valid. Kirim angka 1-65535, mis. <code>80</code> —  atau ketuk ⏭️ Lewati untuk kosong.");
    st.ssh.port = v === null ? null : Number(v);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_bug") {
    const v = kosongkan(teks);
    if (v === null) return salah("😕 Bug wajib diisi untuk SSH DIRECT. Kirim <code>host:port</code>, mis. <code>bug.contoh.com:443</code> — atau ketuk 📋 Pilih dari Daftar Bug.");
    const hp = parseHostPort(v);
    if (hp) { st.ssh.host = hp.host; st.ssh.port = hp.port; }
    else if (validHost(v.toLowerCase())) { st.ssh.host = v.toLowerCase(); st.ssh.port = null; }
    else return salah("😕 Format bug salah. Pakai <code>host:port</code> atau host saja — atau ketuk 📋 Pilih dari Daftar Bug.");
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_payload") {
    st.ssh.payload = kosongkan(teks);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_proxy") {
    const v = kosongkan(teks);
    if (v === null) {
      st.ssh.proxyHost = null; st.ssh.proxyPort = null;
    } else {
      const hp = parseHostPort(v);
      if (hp) {
        // host:port lengkap -> lanjut (tahap port dilewati).
        st.ssh.proxyHost = hp.host; st.ssh.proxyPort = hp.port;
      } else if (validHost(v.toLowerCase())) {
        // Host saja (tanpa port): port ditanya di tahap berikutnya.
        st.ssh.proxyHost = v.toLowerCase(); st.ssh.proxyPort = null;
      } else {
        return salah("😕 Format proxy salah. Pakai <code>host:port</code>, mis. <code>proxy.contoh.com:8080</code> —  atau ketuk ⏭️ Lewati untuk kosong.");
      }
    }
    st.tahap = tahapBerikutTemplate(st, t);
    st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_proxyport") {
    const v = kosongkan(teks);
    if (v !== null && !validPortNum(v)) return salah("😕 Port proxy tidak valid. Kirim angka 1-65535, mis. <code>8080</code> —  atau ketuk ⏭️ Lewati untuk default.");
    st.ssh.proxyPort = v === null ? null : Number(v);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_sni") {
    const v = kosongkan(teks);
    if (v !== null && !validSniTemplate(v)) return salah("😕 SNI tidak valid. Kirim host yang benar, mis. <code>edu.ruangguru.com</code>, atau ketik <code>[host]</code> supaya SNI ngikutin host akun —  atau ketuk ⏭️ Lewati untuk kosong.");
    st.ssh.sni = v === null ? null : v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_ns") {
    const v = kosongkan(teks);
    if (v === null || !validHost(v.toLowerCase())) return salah("😕 Name Server wajib diisi untuk SlowDNS. Kirim host/IP yang benar, mis. <code>id1.dnsx.my.id</code>.");
    st.ssh.dnsNameServer = v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_pubkey") {
    const v = kosongkan(teks);
    if (v === null) return salah("😕 Public Key wajib diisi untuk SlowDNS. Kirim teks kunci SlowDNS-nya.");
    st.ssh.dnsPublicKey = String(teks || "").trim();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_udphost") {
    const v = kosongkan(teks);
    if (v !== null && !validHost(v.toLowerCase())) return salah("😕 UDP DNS Host tidak valid. Kirim host/IP yang benar, mis. <code>1.1.1.1</code> —  atau ketuk ⏭️ Lewati untuk default.");
    st.ssh.dnsUdpHost = v === null ? "1.1.1.1" : v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "ssh_udpport") {
    const v = kosongkan(teks);
    if (v !== null && !validPortNum(v)) return salah("😕 UDP DNS Port tidak valid. Kirim angka 1-65535, mis. <code>53</code> —  atau ketuk ⏭️ Lewati untuk default.");
    st.ssh.dnsUdpPort = v === null ? 53 : Number(v);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_target") {
    const v = kosongkan(teks);
    if (v !== null) {
      const hp = parseHostPort(v);
      if (!hp) return salah("😕 Format target salah. Pakai <code>host:port</code>, mis. <code>sg1.contoh.com:443</code> —  atau ketuk ⏭️ Lewati untuk kosong.");
      st.xray.targetHost = hp.host; st.xray.targetPort = hp.port;
    } else { st.xray.targetHost = null; st.xray.targetPort = null; }
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_domain") {
    const v = kosongkan(teks);
    if (v !== null && !validSniTemplate(v)) return salah("😕 Domain tidak valid. Kirim host yang benar, mis. <code>sg1.contoh.com</code>, atau ketik <code>[host]</code> supaya SNI dan Header Host ngikutin host akun —  atau ketuk ⏭️ Lewati untuk kosong.");
    st.xray.sni = v === null ? null : v.toLowerCase();
    st.xray.headerHost = st.xray.sni;
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_server") {
    const v = kosongkan(teks);
    if (v !== null) {
      const hp = parseHostPort(v);
      if (!hp) return salah("😕 Format server salah. Pakai <code>host:port</code>, mis. <code>sg1.contoh.com:443</code> —  atau ketuk ⏭️ Lewati untuk kosong.");
      st.xray.targetHost = hp.host; st.xray.targetPort = hp.port; st.xray.headerHost = hp.host;
    } else { st.xray.targetHost = null; st.xray.targetPort = null; st.xray.headerHost = null; }
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_bug") {
    const v = kosongkan(teks);
    if (v !== null && !validHost(v.toLowerCase())) return salah("😕 Bug tidak valid. Kirim host yang benar —  atau ketuk ⏭️ Lewati untuk kosong.");
    st.xray.targetHost = v === null ? null : v.toLowerCase();
    st.xray.targetPort = null;
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_bugserver") {
    const v = kosongkan(teks);
    if (v === null) return salah("😕 Bug/Server wajib diisi untuk WC ONERING. Kirim host atau <code>host:port</code> — atau ketuk 📋 Pilih dari Daftar Bug.");
    const hp = parseHostPort(v);
    if (hp) { st.xray.targetHost = hp.host; st.xray.targetPort = hp.port; }
    else if (validHost(v.toLowerCase())) { st.xray.targetHost = v.toLowerCase(); st.xray.targetPort = null; }
    else return salah("😕 Format bug salah. Pakai host atau <code>host:port</code> — atau ketuk 📋 Pilih dari Daftar Bug.");
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_host") {
    const v = kosongkan(teks);
    if (v === null || !validHost(v.toLowerCase())) return salah("😕 Host wajib diisi untuk WC ONERING. Kirim host yang benar, mis. <code>www.yourdomain.com</code>.");
    st.xray.headerHost = v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_sni") {
    const v = kosongkan(teks);
    if (v !== null && !validSniTemplate(v)) return salah("😕 SNI tidak valid. Kirim host yang benar, mis. <code>sg1.contoh.com</code>, atau ketik <code>[host]</code> supaya SNI ngikutin host akun —  atau ketuk ⏭️ Lewati untuk kosong.");
    st.xray.sni = v === null ? null : v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_header") {
    const v = kosongkan(teks);
    if (v !== null && !validHost(v.toLowerCase())) return salah("😕 Header Host tidak valid. Kirim host yang benar —  atau ketuk ⏭️ Lewati untuk kosong.");
    st.xray.headerHost = v === null ? null : v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_payload") {
    st.xray.payload = kosongkan(teks);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_proxy") {
    const v = kosongkan(teks);
    if (v === null) {
      st.xray.proxyHost = null; st.xray.proxyPort = null;
    } else {
      const hp = parseHostPort(v);
      if (hp) {
        // host:port lengkap -> lanjut (tahap port dilewati).
        st.xray.proxyHost = hp.host; st.xray.proxyPort = hp.port;
      } else if (validHost(v.toLowerCase())) {
        // Host saja (tanpa port): port ditanya di tahap berikutnya.
        st.xray.proxyHost = v.toLowerCase(); st.xray.proxyPort = null;
      } else {
        return salah("😕 Format proxy salah. Pakai <code>host:port</code>, mis. <code>proxy.contoh.com:8080</code> —  atau ketuk ⏭️ Lewati untuk kosong.");
      }
    }
    st.tahap = tahapBerikutTemplate(st, t);
    st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_proxyport") {
    const v = kosongkan(teks);
    if (v !== null && !validPortNum(v)) return salah("😕 Port proxy tidak valid. Kirim angka 1-65535, mis. <code>8080</code> —  atau ketuk ⏭️ Lewati untuk default.");
    st.xray.proxyPort = v === null ? null : Number(v);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_ssh") {
    const v = kosongkan(teks);
    if (v !== null) {
      const ssh = parseSshTeks(v);
      if (!ssh.akunList.length) return salah("😕 Format akun SSH salah. Pakai <code>host:port@user:pass</code>, mis. <code>sg1.contoh.com:22@user1:pass1</code> —  atau ketuk ⏭️ Lewati untuk kosong.");
      const a = ssh.akunList[0];
      st.xray.sshHost = a.host; st.xray.sshPort = a.port; st.xray.sshUser = a.username; st.xray.sshPass = a.password;
    } else { st.xray.sshHost = null; st.xray.sshPort = null; st.xray.sshUser = null; st.xray.sshPass = null; }
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_ns") {
    const v = kosongkan(teks);
    if (v !== null && !validHost(v.toLowerCase())) return salah("😕 Name Server tidak valid. Kirim host/IP yang benar, mis. <code>id1.dnsx.my.id</code> —  atau ketuk ⏭️ Lewati untuk kosong.");
    st.xray.nameServer = v === null ? null : v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_pubkey") {
    st.xray.publicKey = kosongkan(teks);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_udphost") {
    const v = kosongkan(teks);
    if (v !== null && !validHost(v.toLowerCase())) return salah("😕 UDP DNS Host tidak valid. Kirim host/IP yang benar, mis. <code>1.1.1.1</code> —  atau ketuk ⏭️ Lewati untuk default.");
    st.xray.udpDnsHost = v === null ? "1.1.1.1" : v.toLowerCase();
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  if (t === "xray_udpport") {
    const v = kosongkan(teks);
    if (v !== null && !validPortNum(v)) return salah("😕 UDP DNS Port tidak valid. Kirim angka 1-65535, mis. <code>53</code> —  atau ketuk ⏭️ Lewati untuk default.");
    st.xray.udpDnsPort = v === null ? 53 : Number(v);
    st.tahap = tahapBerikutTemplate(st, t); st.ts = Date.now();
    await kirimLangkahTemplate(env, chatId, st);
    return true;
  }
  return false;
}

// ================= BUAT CONFIG MANUAL (v2.9.9, pengguna biasa) =================
// Alur: tombol "✏️ Buat Manual" -> kirim akun dulu (pendingManualAkun)
// -> pilih metode (wizard yang sama, mode "manual") -> isi field ->
// nama bebas -> generate file .dark. Config TIDAK disimpan sebagai
// template. State wizard-nya numpang di pendingAdmin dengan
// mode "manual" supaya semua langkah wizard (metode, field, pemilih
// bug, enhanced, slowdns) bisa dipakai ulang; handler tw: mengizinkan
// state manual milik pengguna itu sendiri (bukan admin).
const pendingManualAkun = new Map(); // chatId -> {ts}

// Akun yang ditunggu untuk Buat Manual. Return true bila pesan
// ditangani (state akun aktif). Akun tidak valid -> tetap menunggu.
async function handleManualAkun(env, chatId, teks) {
  const st = pendingManualAkun.get(chatId);
  if (!st) return false;
  if (Date.now() - st.ts > 15 * 60 * 1000) { pendingManualAkun.delete(chatId); return false; }
  let hasil;
  try { hasil = await parsePesan(teks, { env }); } catch { hasil = { configs: [], kurangSsh: [], adaSsh: false }; }
  if (!hasil.configs.length) {
    let alasan = "tidak ditemukan akun di pesan itu";
    if (hasil.adaSsh && hasil.kurangSsh.length) alasan = "akun SSH belum lengkap — tidak ketemu: " + hasil.kurangSsh.join(", ");
    await sendTelegram(env, chatId, "😕 Buat Manual: <b>" + escapeHtml(alasan) + "</b>. Kirim ulang akunnya (SSH atau link Xray).", [[{ text: "❌ Batal", callback_data: "mn:batal" }], ...TOMBOL_KEMBALI]);
    return true; // tetap menunggu
  }
  pendingManualAkun.delete(chatId);
  // Tipe metode mengikuti akun pertama (SSH -> metode SSH, Xray ->
  // metode Xray). Akun lain dalam pesan yang sama ikut digenerate
  // bila tipenya cocok (terapkanTemplate menyaring per tipe).
  const tipe = hasil.configs[0].type === "SSH" ? "SSH" : "XRAY";
  pendingAdmin.set(chatId, {
    jenis: "template", mode: "manual", tahap: "metode", tipe, metode: null, op: null, kat: null, nama: "",
    ssh: { host: null, port: null, payload: null, proxyHost: null, proxyPort: null, sni: null, enhanced: false, slowdns: false, dnsNameServer: null, dnsPublicKey: null, dnsUdpHost: null, dnsUdpPort: null },
    xray: { targetHost: null, targetPort: null, sni: null, headerHost: null, payload: null, sshHost: null, sshPort: null, sshUser: null, sshPass: null, nameServer: null, publicKey: null, udpDnsHost: null, udpDnsPort: null, proxyHost: null, proxyPort: null },
    akun: hasil, ts: Date.now(),
  });
  await kirimLangkahTemplate(env, chatId, pendingAdmin.get(chatId));
  return true;
}

// Tahap akhir Buat Manual: generate file .dark dari akun + setting
// manual, tanpa menyimpan template. Nama bebas dari pengguna jadi
// nama file ("<nama> by @autosetdark_bot.dark"); Lewati nama = pakai
// nama akun (seperti Buat Config otomatis).
export async function selesaikanManual(env, chatId, st) {
  pendingAdmin.delete(chatId);
  const tpl = { nama: st.nama || null, operator: null, kategori: null, tipe: st.tipe, metode: st.metode, ssh: st.tipe === "SSH" ? st.ssh : null, xray: st.tipe === "XRAY" ? st.xray : null };
  let configs = [];
  try { configs = await terapkanTemplate(env, st.akun, tpl); } catch { configs = []; }
  if (!configs.length) {
    await sendTelegram(env, chatId, "😕 Config manual tidak bisa dibuat dari akun itu. Kirim akun lain, atau ketuk ⬅️ Kembali ke Menu untuk keluar.", TOMBOL_KEMBALI);
    return;
  }
  const catatanBug = await catatanBugUntuk(env, st.akun);
  for (const c of configs) {
    const rincian = ringkasanConfig(c);
    const caption = "✅ <b>Config Dark Tunnel jadi (manual" + (st.nama ? ": " + escapeHtml(st.nama) : "") + "):</b> " + escapeHtml(c.type + " — " + c.name) +
      (rincian ? "\n\n" + rincian : "") + "\n\n" + CARA_IMPOR + catatanBug;
    await sendDocument(env, chatId, namaFileDark(c.name, c.type, st.nama), toDarktunnelLink(c) + "\n", caption, TOMBOL_APK);
  }
}

// Pesan teks admin saat ada state tertunda dari tombol panel admin.
// Return true bila pesan ditangani di sini (router tidak lanjut ke
// handlePesanAkun). State kedaluwarsa (>15 menit) diabaikan.
async function handleAdminTertunda(env, chatId, teks) {
  const st = pendingAdmin.get(chatId);
  if (!st) return false;
  if (Date.now() - st.ts > 15 * 60 * 1000) { pendingAdmin.delete(chatId); return false; }
  // Wizard Template Config (v2.7): langkah teks ditangani
  // handleTemplateTeks; langkah tombol (tipe/operator/kategori/
  // enhanced/slowdns/simpan) ditangani di router callback.
  if (st.jenis === "template") {
    return await handleTemplateTeks(env, chatId, st, teks);
  }
  if (st.jenis === "bug") {
    // Wizard Tambah Bug (v2.8.1): tahap teks (kategori_baru, host,
    // catatan) ditangani handleBugTeks; tahap tombol di router "ab:".
    // Format satu baris "operator | kategori | host | catatan" dari
    // panel DIHAPUS — perintah teks /tambahbug tetap jalan.
    return await handleBugTeks(env, chatId, st, teks);
  }
  if (st.jenis === "config" && st.tahap === "nama") {
    const bagian = teks.split("|").map((s) => s.trim());
    const [opRaw, katRaw, ...namaParts] = bagian;
    const op = normalisasiOperator(opRaw);
    const kat = normalisasiKategori(katRaw);
    const nama = namaParts.join(" | ").trim();
    if (!op || !kat || !nama) {
      await sendTelegram(env, chatId,
        "😕 Format belum lengkap.\n\n" +
        "Format: <code>operator | kategori | nama</code>\n" +
        "Operator: xl, axis, telkomsel, indosat, smartfren, tri, byu. Kategori: edu, ilped, opok, wa, game, sosmed, musik, nonton, conference, appfun.\n" +
        "Contoh: <code>telkomsel | opok | Opok Tsel 1</code>");
      return true;
    }
    if (!env.DATA) {
      await sendTelegram(env, chatId, "⚠️ Fitur admin belum aktif — KV belum dipasang di Worker.");
      return true;
    }
    pendingAdmin.delete(chatId);
    pendingConfig.set(chatId, { op, kat, nama, ts: Date.now() });
    await sendTelegram(env, chatId, "📋 Config <b>" + escapeHtml(nama) + "</b> (" + labelOperator(op) + " — " + labelKategori(op, kat) + ").\n\nKirim akunnya — teks, link darktunnel://, atau file .dark.", [[{ text: "❌ Batal", callback_data: "admin:batal" }]]);
    return true;
  }
  if (st.jenis === "broadcast") {
    pendingAdmin.delete(chatId);
    const terkirim = await siarkanUpdate(env, teks);
    await sendTelegram(env, chatId, "📣 Broadcast terkirim ke " + terkirim + " pengguna.");
    return true;
  }
  return false;
}

// ---- /status: kondisi bot (DM saja; di grup diabaikan) ----
async function handleStatus(env, chatId) {
  // Bug bawaan yang sudah dihapus admin tidak dihitung (tanpa KV
  // tidak ada penghapusan, jadi 0).
  const dihapus = env.DATA ? await hitungBugDihapus(env) : 0;
  const bawaan = hitungBugBawaan() - dihapus;
  const baris = ["📊 <b>Status Bot</b>", "", "• Versi: <b>" + VERSI_BOT + "</b>"];
  if (env.DATA) {
    const pengguna = (await kvList(env, "USER:")).length;
    const tambahan = await hitungBugKv(env);
    const configs = await ambilConfigsKv(env);
    const templates = await ambilTemplatesKv(env);
    const updates = await ambilUpdatesKv(env);
    baris.push("• Pengguna tercatat: <b>" + pengguna + "</b>");
    baris.push("• Bug host: <b>" + (bawaan + tambahan) + "</b> (" + bawaan + " bawaan + " + tambahan + " tambahan)");
    baris.push("• Config contoh: <b>" + configs.length + "</b>");
    baris.push("• Template config: <b>" + templates.length + "</b>");
    baris.push("• Update terbaru: <b>" + updates.length + "</b>");
  } else {
    baris.push("• Pengguna tercatat: tidak tersedia");
    baris.push("• Bug host: <b>" + bawaan + "</b> (" + bawaan + " bawaan)");
    baris.push("• Config contoh: tidak tersedia");
    baris.push("• Update terbaru: tidak tersedia");
  }
  await sendTelegram(env, chatId, baris.join("\n"), TOMBOL_KEMBALI);
}

// ---- /update: 5 update terbaru ----
async function handleUpdate(env, chatId) {
  const arr = await ambilUpdatesKv(env);
  if (!arr.length) {
    await sendTelegram(env, chatId, "🆕 <b>Update Terbaru</b>\n\nBelum ada update.", TOMBOL_KEMBALI);
    return;
  }
  const baris = arr.slice(0, 5).map((e) => "• " + escapeHtml(e.teks) + " — " + e.tanggal);
  await sendTelegram(env, chatId, "🆕 <b>Update Terbaru</b>\n\n" + baris.join("\n"), TOMBOL_KEMBALI);
}

// ---- /config: daftar config contoh + template config per operator (v2.7) ----
// Bagian template TIDAK langsung daftar semua template: /config hanya
// menampilkan tombol per OPERATOR yang punya minimal 1 template
// (urutan BUG_DB). Ketuk operator -> daftar template operator itu.
// messageId (opsional, v2.9.2): bila diisi (dibuka dari tap tombol),
// EDIT pesan itu; bila kosong (perintah /config), kirim baru.
async function handleConfig(env, chatId, notice, messageId) {
  const arr = await ambilConfigsKv(env);
  const templates = await ambilTemplatesKv(env);
  const isAdmin = cekAdmin(env, chatId) === "ya";
  const awalan = notice ? notice + "\n\n" : "";
  if (!arr.length && !templates.length) {
    await editAtauKirim(env, chatId, messageId, awalan + "📋 <b>Config & Template</b>\n\nBelum ada config contoh atau template.", [[{ text: "📡 Template Xray (0)", callback_data: "tpl:tipe:xray" }, { text: "🔐 Template SSH (0)", callback_data: "tpl:tipe:ssh" }], ...TOMBOL_KEMBALI]);
    return;
  }
  const bagian = [];
  const keyboard = [];
  if (arr.length) {
    const daftar = arr.slice(0, 10);
    bagian.push("📋 <b>Config Contoh</b>\n\n" +
      daftar.map((e, i) => (i + 1) + ". <b>" + escapeHtml(e.nama) + "</b> (" + labelOperator(e.operator) + " — " + labelKategori(e.operator, e.kategori) + ") — " + e.tanggal).join("\n"));
    for (const e of daftar) keyboard.push([{ text: String(e.nama).slice(0, 40), callback_data: "cfg:" + e.id }]);
  }
  // (v2.9.4) Template Config dibagi dua bagian per TIPE (Xray & SSH) —
  // bukan lagi per operator. Kedua tombol selalu tampil, walau N=0.
  const nXray = templates.filter((t) => t.tipe === "XRAY").length;
  const nSsh = templates.filter((t) => t.tipe === "SSH").length;
  if (templates.length) {
    bagian.push("🧩 <b>Template Config</b>\n\nKetuk Xray atau SSH buat lihat template config-nya.");
  } else {
    bagian.push("🧩 <b>Template Config</b>\n\nBelum ada template. Admin bisa buat lewat panel admin.");
  }
  keyboard.push([{ text: "📡 Template Xray (" + nXray + ")", callback_data: "tpl:tipe:xray" }, { text: "🔐 Template SSH (" + nSsh + ")", callback_data: "tpl:tipe:ssh" }]);
  let teks = awalan + bagian.join("\n\n");
  if (arr.length) teks += "\n\nKetuk satu config buat ambil file-nya.";
  keyboard.push(...TOMBOL_KEMBALI);
  await editAtauKirim(env, chatId, messageId, teks, keyboard);
}

// ---- Daftar template config satu tipe (dari /config) ----
// notice = pesan tambahan di atas judul (misal konfirmasi hapus).
async function handleTemplateTipe(env, chatId, tipe, notice, messageId) {
  const templates = await ambilTemplatesKv(env);
  const isXray = tipe === "xray";
  const kunci = isXray ? "XRAY" : "SSH";
  const daftar = templates.filter((t) => t.tipe === kunci);
  const isAdmin = cekAdmin(env, chatId) === "ya";
  const judul = "🧩 <b>Template Config — " + (isXray ? "Xray" : "SSH") + "</b>";
  const awalan = notice ? notice + "\n\n" : "";
  if (!daftar.length) {
    await editAtauKirim(env, chatId, messageId, awalan + judul + "\n\nBelum ada template " + (isXray ? "Xray" : "SSH") + ".", [
      [{ text: "⬅️ Kembali", callback_data: "tpl:tipe:daftar" }],
      ...TOMBOL_KEMBALI,
    ]);
    return;
  }
  const daftarTampil = daftar.slice(0, 20);
  const teks = awalan + judul + "\n\n" +
    daftarTampil.map((e, i) => (i + 1) + ". <b>" + escapeHtml(e.nama) + "</b> (" + escapeHtml(labelOperator(e.operator)) + " · " + escapeHtml(labelKategori(e.operator, e.kategori)) + (e.metode ? " · " + escapeHtml(labelMetode(e.tipe, e.metode)) : "") + ") — " + e.tanggal).join("\n") +
    "\n\nKetuk satu template buat generate pakai template itu." + (isAdmin ? " (Admin: tombol ✏️ Edit / 🗑️ Hapus ada di bawah tiap nama.)" : "");
  const keyboard = [];
  for (const e of daftarTampil) {
    // (v2.9.10) Nama template SELALU satu baris penuh — tombol ✏️/🗑️
    // tidak boleh sebaris dengan nama (Telegram membagi lebar baris
    // rata ke semua tombol, nama jadi terpotong). Admin: baris ke-2
    // berisi ✏️ Edit + 🗑️ Hapus. Pengguna biasa: cuma baris nama.
    keyboard.push([{ text: "🧩 " + String(e.nama).slice(0, 60), callback_data: "tpl:pakai:" + e.id }]);
    if (isAdmin) keyboard.push([
      { text: "✏️ Edit", callback_data: "tpl:edit:" + e.id },
      { text: "🗑️ Hapus", callback_data: "tpl:del:" + e.id },
    ]);
  }
  keyboard.push([{ text: "⬅️ Kembali", callback_data: "tpl:tipe:daftar" }]);
  keyboard.push(...TOMBOL_KEMBALI);
  await editAtauKirim(env, chatId, messageId, teks, keyboard);
}

// ---- Pengguna kirim akun untuk template yang dipilih di /config ----
// Return true bila pesan ditangani (state template aktif). Bila tipe
// akun tidak cocok dengan template, balas ramah dan TETAP menunggu.
async function handlePakaiTemplate(env, chatId, teks) {
  const pending = pendingTemplate.get(chatId);
  if (!pending) return false;
  if (Date.now() - pending.ts > 15 * 60 * 1000) { pendingTemplate.delete(chatId); return false; }
  const templates = await ambilTemplatesKv(env);
  const template = templates.find((t) => t.id === pending.templateId);
  if (!template) {
    pendingTemplate.delete(chatId);
    await sendTelegram(env, chatId, "😕 Template itu sudah tidak tersedia. Ketik /config buat lihat daftar terbaru.");
    return true;
  }
  let hasil;
  try { hasil = await parsePesan(teks, { env }); } catch { hasil = { configs: [], kurangSsh: [], adaSsh: false }; }
  if (!hasil.configs.length) {
    let alasan = "tidak ditemukan akun di pesan itu";
    if (hasil.adaSsh && hasil.kurangSsh.length) alasan = "akun SSH belum lengkap — tidak ketemu: " + hasil.kurangSsh.join(", ");
    await sendTelegram(env, chatId, "😕 Template tidak bisa dipakai: <b>" + escapeHtml(alasan) + "</b>. Kirim ulang akunnya.");
    return true; // tetap menunggu
  }
  const configs = await terapkanTemplate(env, hasil, template);
  if (!configs.length) {
    const butuh = template.tipe === "SSH" ? "SSH" : "Xray (VLESS / VMess / Trojan / Shadowsocks)";
    await sendTelegram(env, chatId, "⚠️ Template <b>" + escapeHtml(template.nama) + "</b> ini untuk " + butuh + ". Kirim akun " + butuh + " ya.");
    return true; // tetap menunggu
  }
  pendingTemplate.delete(chatId);
  const catatanBug = await catatanBugUntuk(env, hasil);
  for (const c of configs) {
    const rincian = ringkasanConfig(c);
    const caption = "✅ <b>Config Dark Tunnel jadi (template: " + escapeHtml(template.nama) + "):</b> " + escapeHtml(c.type + " — " + c.name) +
      (rincian ? "\n\n" + rincian : "") + "\n\n" + CARA_IMPOR + catatanBug;
    await sendDocument(env, chatId, namaFileDark(c.name, c.type, template.nama), toDarktunnelLink(c) + "\n", caption, TOMBOL_APK);
  }
  return true;
}

async function handleTelegram(env, update) {
  const msg = update.message;
  const cb = update.callback_query;
  // Catat pengirim DM (sekali saja) untuk broadcast update.
  const chatDm = msg?.chat?.type === "private" ? msg.chat.id
    : (cb?.message?.chat?.type === "private" ? cb.message.chat.id : null);
  if (chatDm) {
    const namaDm = msg?.from?.first_name || cb?.from?.first_name || "";
    await catatPengguna(env, chatDm, namaDm);
  }
  if (cb) {
    const data = cb.data || "";
    const chatIdCb = cb.message?.chat?.id;
    const diGrupCb = cb.message?.chat?.type === "group" || cb.message?.chat?.type === "supergroup";
    // (v2.9.13) Tombol di grup: yang bikin config dialihkan ke DM
    // (akun rahasia); admin tidak ada di grup; menu / cari bug /
    // update jalan di grup (lanjut ke handler biasa di bawah).
    if (diGrupCb) {
      const namaBot = env.BOT_USERNAME ? "@" + env.BOT_USERNAME : "bot ini";
      if (data === "buat:config" || data === "buat:manual" || data === "buat:template" ||
        data.startsWith("tpl:pakai:") || data.startsWith("cfg:")) {
        await jawabAlert(env, cb.id, "Lewat chat pribadi ya — buka " + namaBot + ", biar akun kamu nggak kelihatan orang lain.");
        return;
      }
      if (data.startsWith("admin:") || data.startsWith("tw:") || data.startsWith("ab:") ||
        data.startsWith("bug:hapus:") || data.startsWith("tpl:edit:") || data.startsWith("tpl:del:")) {
        await jawabAlert(env, cb.id, "⛔ Khusus admin — lewat chat pribadi bot.");
        return;
      }
      if (data === "menu:utama") {
        await jawabCallback(env, cb.id);
        await tampilkanMenuUtama(env, chatIdCb, cb.message.message_id, true);
        return;
      }
      if (data === "bug:menu" || data.startsWith("bug:op:") ||
        data.startsWith("bug:kat:") || data === "update:lihat" || data === "cek:mulai") {
        // Lanjut ke handler biasa di bawah (chatIdCb = id grup).
      } else {
        await jawabAlert(env, cb.id, "Buka " + namaBot + " di chat pribadi ya.");
        return;
      }
    }
    if (!chatIdCb) { await jawabCallback(env, cb.id); return; }
    // Ketuk tombol menu apa pun membatalkan template yang sedang
    // dipakai bila pengguna ketuk tombol lain (kecuali alur template
    // itu sendiri). Menunggu akun Buat Manual ikut dibatalkan bila
    // pengguna ketuk tombol lain (v2.9.9).
    if (!data.startsWith("tpl:")) pendingTemplate.delete(chatIdCb);
    pendingManualAkun.delete(chatIdCb);
    // Tombol "⬅️ Kembali ke Menu" — edit pesan ini jadi menu utama.
    // (v2.9.2: lewat tampilkanMenuUtama + hapus state wizard yang
    // tertunda, supaya ketikan berikutnya tidak masuk ke wizard lama.)
    if (data === "menu:utama") {
      await jawabCallback(env, cb.id);
      pendingAdmin.delete(chatIdCb);
      pendingConfig.delete(chatIdCb);
      pendingManualAkun.delete(chatIdCb);
      await tampilkanMenuUtama(env, chatIdCb, cb.message.message_id);
      return;
    }
    // Tombol "⚡ Buat Config" di /start — langsung auto-detect, tanpa
    // pemilih jenis. (Pemilih jenis config v2.4 dihapus 21 Nov 2026
    // atas permintaan Asep; tombol "pilih:..." lama yang masih nempel
    // di pesan lama diabaikan diam-diam — tidak ada handlernya lagi.)
    if (data === "buat:config") {
      await jawabCallback(env, cb.id);
      pendingManualAkun.delete(chatIdCb);
      await sendTelegram(env, chatIdCb, "⚡ <b>Buat Config</b>\n\nKirim akun kamu — bot deteksi jenisnya otomatis.",
        [[{ text: "🧩 Template Config", callback_data: "buat:template" }, { text: "✏️ Buat Manual", callback_data: "buat:manual" }], ...TOMBOL_KEMBALI]);
      return;
    }
    // Tombol "✏️ Buat Manual" di /start (v2.9.9, pengguna biasa) —
    // satu-satunya tombol tambahan untuk alur manual: kirim akun
    // dulu, lalu pilih metode + isi field sendiri, kasih nama bebas,
    // config langsung jadi file .dark (tidak disimpan sebagai template).
    if (data === "buat:manual") {
      await jawabCallback(env, cb.id);
      pendingAdmin.delete(chatIdCb);
      pendingTemplate.delete(chatIdCb);
      pendingManualAkun.set(chatIdCb, { ts: Date.now() });
      await sendTelegram(env, chatIdCb, "✏️ <b>Buat Config Manual</b>\n\nKirim akun kamu dulu — SSH (<code>host:port@user:pass</code>) atau link Xray (VLESS / VMess / Trojan / Shadowsocks).\n\nSetelah itu kamu pilih sendiri metodenya, isi bug / SNI / payload / proxy-nya, lalu kasih nama bebas. File jadinya <code>&lt;nama&gt; by @autosetdark_bot.dark</code> — config tidak disimpan sebagai template.",
        [[{ text: "❌ Batal", callback_data: "mn:batal" }], ...TOMBOL_KEMBALI]);
      return;
    }
    // Tombol "🧩 Template Config" di alur Buat Config — buka daftar
    // config contoh + template yang sudah ada (sama seperti /config).
    // (v2.9.2: edit pesan prompt Buat Config jadi daftar.)
    if (data === "buat:template") {
      await jawabCallback(env, cb.id);
      await handleConfig(env, chatIdCb, undefined, cb.message.message_id);
      return;
    }
    // Tombol "🔍 Cari Bug" di /start — pintu masuk kedua alur /bug.
    // (v2.9.2: edit pesan menu jadi daftar operator.)
    if (data === "bug:menu") {
      await jawabCallback(env, cb.id);
      await editAtauKirim(env, chatIdCb, cb.message.message_id, "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
      return;
    }
    // Tombol "🌐 Cek Domain" di /start — minta domain, lalu cek.
    if (data === "cek:mulai") {
      await jawabCallback(env, cb.id);
      pendingCek.set(chatIdCb, { ts: Date.now() });
      await sendTelegram(env, chatIdCb, "🌐 <b>Cek Domain</b>\n\nKirim domain yang mau dicek — mis. <code>edu.ruangguru.com</code>.", TOMBOL_KEMBALI);
      return;
    }
    // Pilih metode payload untuk akun SSH+bug yang sedang menunggu.
    // "auto" dipilih otomatis dari kategori bug (edu -> enhanced,
    // opok -> direct, lainnya -> ws).
    if (data.startsWith("metode:")) {
      let key = data.slice("metode:".length);
      const pending = pendingMetode.get(chatIdCb);
      if (!pending || (key !== "auto" && !PAYLOAD_METODE[key])) {
        await jawabAlert(env, cb.id, "Pilihan sudah kedaluwarsa — kirim lagi akunnya ya.");
        return;
      }
      if (key === "auto") key = await pilihMetodeOtomatis(env, pending.teks);
      pendingMetode.delete(chatIdCb);
      await jawabCallback(env, cb.id);
      // (v2.9.2: picker diedit jadi konfirmasi ringkas — tombolnya mati,
      // tanpa pesan status baru; file .dark tetap dikirim terpisah.)
      const labelDipilih = PAYLOAD_METODE[key]?.label || key;
      await editAtauKirim(env, chatIdCb, cb.message.message_id, "🔧 Metode payload: <b>" + escapeHtml(labelDipilih) + "</b>", TOMBOL_KEMBALI);
      await handlePesanAkun(env, chatIdCb, pending.teks, { metodePayload: key });
      return;
    }
    // Tombol "🆕 Update Terbaru" di /start.
    if (data === "update:lihat") {
      await jawabCallback(env, cb.id);
      await handleUpdate(env, chatIdCb);
      return;
    }
    // Panel admin (tombol "⚙️ Admin" di menu utama) — admin saja.
    // (v2.9.2: edit pesan yang diketuk jadi panel, bukan kirim baru.)
    if (data === "admin:panel") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      await editAtauKirim(env, chatIdCb, cb.message.message_id, TEKS_PANEL_ADMIN, keyboardAdmin());
      return;
    }
    if (data === "admin:tambahbug") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      // Wizard Tambah Bug (v2.8.1): operator -> kategori -> host ->
      // catatan -> ringkasan. Perintah teks /tambahbug tetap jalan.
      // (v2.9.2: msgId = pesan panel — langkah wizard mengeditnya.)
      pendingAdmin.set(chatIdCb, { jenis: "bug", tahap: "operator", op: null, kat: null, host: "", catatan: "", ts: Date.now(), msgId: cb.message.message_id });
      await kirimLangkahBug(env, chatIdCb, pendingAdmin.get(chatIdCb));
      return;
    }
    if (data === "admin:tambahconfig") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      // Wizard Template Config (v2.7): admin isi setting template,
      // akun diambil dari pengguna saat template dipakai. Perintah teks
      // /tambahconfig (akun lengkap) tetap jalan seperti dulu.
      // (v2.9.2: msgId = pesan panel — langkah wizard mengeditnya.)
      pendingAdmin.set(chatIdCb, {
        jenis: "template", tahap: "tipe", tipe: null, metode: null, op: null, kat: null, nama: "",
        ssh: { host: null, port: null, payload: null, proxyHost: null, proxyPort: null, sni: null, enhanced: false, slowdns: false, dnsNameServer: null, dnsPublicKey: null, dnsUdpHost: null, dnsUdpPort: null },
        xray: { targetHost: null, targetPort: null, sni: null, headerHost: null, payload: null, sshHost: null, sshPort: null, sshUser: null, sshPass: null, nameServer: null, publicKey: null, udpDnsHost: null, udpDnsPort: null, proxyHost: null, proxyPort: null },
        ts: Date.now(), msgId: cb.message.message_id,
      });
      await kirimLangkahTemplate(env, chatIdCb, pendingAdmin.get(chatIdCb));
      return;
    }
    if (data === "admin:broadcast") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      pendingAdmin.set(chatIdCb, { jenis: "broadcast", ts: Date.now() });
      await sendTelegram(env, chatIdCb, "📢 <b>Broadcast</b>\n\nKirim pesan broadcast-nya — akan dikirim ke semua pengguna tercatat.", [[{ text: "❌ Batal", callback_data: "admin:batal" }]]);
      return;
    }
    if (data === "admin:status") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      await handleStatus(env, chatIdCb);
      return;
    }
    if (data === "admin:batal") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      pendingAdmin.delete(chatIdCb);
      pendingConfig.delete(chatIdCb);
      await jawabCallback(env, cb.id);
      // (v2.9.2: pesan wizard/prompt DIHAPUS — tanpa pesan "dibatalkan".)
      await hapusTelegram(env, chatIdCb, cb.message.message_id);
      return;
    }
    // Batal Buat Manual (mn:batal, v2.9.9) — pengguna biasa: hapus
    // state manual (akun yang ditunggu / wizard) + hapus pesannya.
    // Tanpa cek admin: yang dibatalkan cuma alur milik pengguna itu.
    if (data === "mn:batal") {
      pendingAdmin.delete(chatIdCb);
      pendingManualAkun.delete(chatIdCb);
      await jawabCallback(env, cb.id);
      await hapusTelegram(env, chatIdCb, cb.message.message_id);
      return;
    }
    // ---- Wizard Template Config (v2.7): langkah tombol ----
    // (v2.9.9) State manual (mode "manual", pengguna biasa) diizinkan
    // di sini: state dibuat server-side dari tombol "✏️ Buat Manual",
    // jadi pengguna cuma bisa menjalankan wizard miliknya sendiri.
    if (data.startsWith("tw:")) {
      const st = pendingAdmin.get(chatIdCb);
      const manual = !!(st && st.mode === "manual");
      if (cekAdmin(env, chatIdCb) !== "ya" && !manual) { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      if (!st || st.jenis !== "template" || Date.now() - st.ts > 15 * 60 * 1000) {
        pendingAdmin.delete(chatIdCb);
        await jawabAlert(env, cb.id, "Wizard sudah kedaluwarsa — buka lagi dari panel admin ya.");
        return;
      }
      await jawabCallback(env, cb.id);
      const aksi = data.slice("tw:".length);
      if (aksi.startsWith("tipe:")) {
        if (manual) return;
        const tipe = aksi.slice("tipe:".length);
        if (tipe !== "SSH" && tipe !== "XRAY") return;
        st.tipe = tipe; st.tahap = "metode"; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      // Pemilih METODE (v2.9.0): metode hanya berlaku untuk tipenya —
      // metode Xray tidak bisa dipilih saat tipe SSH, dan sebaliknya.
      // (v2.9.9) Mode manual: tipe sudah dari akun, habis pilih metode
      // langsung ke tahap field pertama (tanpa operator/kategori).
      if (aksi.startsWith("metode:")) {
        const id = aksi.slice("metode:".length);
        const daftar = METODE_TEMPLATE[st.tipe] || [];
        if (!daftar.some((m) => m.id === id)) return;
        st.metode = id;
        if (id === "SSH_SLOWDNS") st.ssh.slowdns = true;
        st.tahap = manual ? tahapPertamaTemplate(st) : "operator"; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi === "kembali:tipe") {
        if (manual) return;
        st.tahap = "tipe"; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi === "kembali:metode") {
        if (manual) return;
        st.tahap = "metode"; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("op:")) {
        if (manual) return;
        const op = normalisasiOperator(aksi.slice("op:".length));
        if (!op) return;
        st.op = op; st.tahap = "kategori"; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi === "kembali:op") {
        if (manual) return;
        st.tahap = "operator"; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("kat:")) {
        if (manual) return;
        // "kat:baru" harus dicek dulu — diawali "kat:" juga.
        if (aksi === "kat:baru") {
          st.tahap = "kategori_baru"; st.ts = Date.now();
          await kirimLangkahTemplate(env, chatIdCb, st);
          return;
        }
        const kat = normalisasiKategori(aksi.slice("kat:".length));
        if (!kat || !BUG_DB[st.op]?.kategori?.[kat]) return;
        st.kat = kat; st.tahap = "nama"; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      // ---- Tombol Lewati (v2.7.5): hanya untuk tahap teks yang bisa
      // dikosongkan. Tahap wajib/tombol tidak punya tombol Lewati —
      // callback nyasar (mis. tombol pesan lama) diabaikan diam-diam.
      // Pemilih bug yang sedang terbuka ikut dibatalkan.
      if (aksi === "lewati") {
        // (v2.9.9) Lewati juga berlaku di tahap wajib bila mode edit
        // (= pakai nilai lama) dan di tahap "nama" mode manual
        // (= pakai nama akun) — keyboard-nya menampilkan tombolnya.
        if (!TAHAP_LEWATI.has(st.tahap) && !st.editId && !(st.mode === "manual" && st.tahap === "nama")) return;
        delete st.pilihBug;
        st.ts = Date.now();
        await handleTemplateTeks(env, chatIdCb, st, "lewati");
        return;
      }
      // ---- Pemilih bug (v2.7.5): sub-alur di dalam wizard. st.tahap
      // tetap tahap asal; st.pilihBug menyimpan langkah + tahap asal
      // (dipakai untuk menolak tombol pesan lama yang sudah tidak
      // berlaku — mis. pengguna sudah mengetik manual lalu maju).
      if (aksi === "bug") {
        if (!TAHAP_PILIH_BUG.has(st.tahap)) return;
        st.pilihBug = { langkah: "operator", tahap: st.tahap }; st.ts = Date.now();
        await kirimPilihBug(env, chatIdCb, st);
        return;
      }
      if (aksi === "bug:kembali") {
        delete st.pilihBug; st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("bug:op:")) {
        const op = normalisasiOperator(aksi.slice("bug:op:".length));
        if (!op || !TAHAP_PILIH_BUG.has(st.tahap) || !st.pilihBug || st.tahap !== st.pilihBug.tahap) return;
        st.pilihBug = { langkah: "kategori", tahap: st.tahap, op }; st.ts = Date.now();
        await kirimPilihBug(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("bug:kat:")) {
        const parts = aksi.slice("bug:kat:".length).split(":");
        const op = parts[0]; const kat = parts[1];
        if (parts.length !== 2 || !normalisasiOperator(op) || !TAHAP_PILIH_BUG.has(st.tahap) || !st.pilihBug || st.tahap !== st.pilihBug.tahap || st.pilihBug.op !== op) return;
        const hosts = await daftarHostKategori(env, op, kat);
        if (!hosts.length) {
          // (v2.9.2: error mengedit pesan picker yang sama.)
          st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "😕 Kategori <b>" + escapeHtml(labelKategori(op, kat)) + "</b> belum ada bug-nya. Pilih kategori lain ya.", [[{ text: "⬅️ Ganti kategori", callback_data: "tw:bug:op:" + op }], [{ text: "⬅️ Kembali", callback_data: "tw:bug:kembali" }]]);
          return;
        }
        st.pilihBug = { langkah: "host", tahap: st.tahap, op, kat, hosts, page: 0 }; st.ts = Date.now();
        await kirimPilihBug(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("bug:hal:")) {
        const hal = Number(aksi.slice("bug:hal:".length));
        const pb = st.pilihBug;
        if (!TAHAP_PILIH_BUG.has(st.tahap) || !pb || pb.langkah !== "host" || st.tahap !== pb.tahap || !Number.isInteger(hal) || hal < 0) return;
        const totalHal = Math.max(1, Math.ceil(pb.hosts.length / PICKER_HOST_PER_HALAMAN));
        if (hal >= totalHal) return;
        pb.page = hal; st.ts = Date.now();
        await kirimPilihBug(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("bug:host:")) {
        const parts = aksi.slice("bug:host:".length).split(":");
        const op = parts[0]; const kat = parts[1]; const idx = Number(parts[2]);
        const pb = st.pilihBug;
        if (parts.length !== 3 || !TAHAP_PILIH_BUG.has(st.tahap) || !pb || pb.langkah !== "host" || st.tahap !== pb.tahap || pb.op !== op || pb.kat !== kat || !Number.isInteger(idx) || idx < 0 || idx >= pb.hosts.length) {
          // (v2.9.2: error mengedit pesan picker yang sama + tombol Kembali.)
          st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "😕 Pilihan itu sudah tidak berlaku — pilih lagi dari daftar terbaru ya.", [[{ text: "⬅️ Kembali", callback_data: "tw:bug:kembali" }]]);
          return;
        }
        const host = pb.hosts[idx];
        delete st.pilihBug;
        // Isi field sesuai tahap asal lalu lanjut ke tahap berikutnya
        // (sesuai urutan metode). host:port diisi host saja (port null):
        // proxy lanjut ke tahap port, target pakai port akun pengguna.
        const tahapAsal = st.tahap;
        if (tahapAsal === "ssh_sni") st.ssh.sni = host;
        else if (tahapAsal === "xray_sni") st.xray.sni = host;
        else if (tahapAsal === "xray_header") st.xray.headerHost = host;
        else if (tahapAsal === "ssh_proxy") { st.ssh.proxyHost = host; st.ssh.proxyPort = null; }
        else if (tahapAsal === "xray_target") { st.xray.targetHost = host; st.xray.targetPort = null; }
        else if (tahapAsal === "ssh_bug") { st.ssh.host = host; st.ssh.port = null; }
        else if (tahapAsal === "xray_domain") { st.xray.sni = host; st.xray.headerHost = host; }
        else if (tahapAsal === "xray_server") { st.xray.targetHost = host; st.xray.targetPort = null; st.xray.headerHost = host; }
        else if (tahapAsal === "xray_bug") { st.xray.targetHost = host; st.xray.targetPort = null; }
        else if (tahapAsal === "xray_bugserver") { st.xray.targetHost = host; st.xray.targetPort = null; }
        else if (tahapAsal === "xray_proxy") { st.xray.proxyHost = host; st.xray.proxyPort = null; }
        else return;
        st.tahap = tahapBerikutTemplate(st, tahapAsal);
        st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("enhanced:")) {
        st.ssh.enhanced = aksi.slice("enhanced:".length) === "ya";
        st.tahap = tahapBerikutTemplate(st, "ssh_enhanced"); st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("slowdns:")) {
        const ya = aksi.slice("slowdns:".length) === "ya";
        st.ssh.slowdns = ya;
        // (v2.9.9) Mode manual tidak punya ringkasan — "Tidak" lanjut
        // ke tahap nama (generate), bukan ringkasan.
        st.tahap = ya ? "ssh_ns" : (manual ? "nama" : "ringkasan"); st.ts = Date.now();
        await kirimLangkahTemplate(env, chatIdCb, st);
        return;
      }
      if (aksi === "simpan") {
        // (v2.9.9) Mode manual tidak pernah sampai sini (nama adalah
        // tahap terakhir manual, langsung generate) — tolak defensif.
        if (manual) return;
        // Mode edit: metode boleh null (template legacy tanpa metode);
        // nama/operator/kategori/tipe tetap wajib (sudah terisi dari
        // template lama).
        if (!st.nama || !st.op || !st.kat || !st.tipe || (!st.metode && !st.editId)) {
          // (v2.9.2: error mengedit pesan wizard yang sama.)
          st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "😕 Template belum lengkap — mulai lagi dari panel admin ya.", TOMBOL_KEMBALI);
          return;
        }
        // (v2.9.9) Mode edit: nama baru tidak boleh bentrok dengan
        // template LAIN (nama lama sendiri boleh dipakai lagi).
        if (st.editId) {
          const semua = await ambilTemplatesKv(env);
          const bentrok = semua.find((e) => e.id !== st.editId && String(e.nama || "").toLowerCase() === String(st.nama).toLowerCase());
          if (bentrok) {
            st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "😕 Nama <b>" + escapeHtml(st.nama) + "</b> sudah dipakai template lain. Ganti nama atau ketuk ❌ Batal.", keyboardTemplateSimpan());
            return;
          }
        }
        const tpl = { nama: st.nama, operator: st.op, kategori: st.kat, tipe: st.tipe, metode: st.metode, ssh: st.tipe === "SSH" ? st.ssh : null, xray: st.tipe === "XRAY" ? st.xray : null };
        const hasil = await simpanTemplate(env, tpl, st.editId || undefined);
        if (!hasil) {
          st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "⚠️ Gagal menyimpan template — coba lagi nanti ya.", keyboardTemplateSimpan());
          return;
        }
        pendingAdmin.delete(chatIdCb);
        // (v2.9.2: sukses mengedit pesan wizard jadi pesan sukses —
        // tombol Tambah Lagi / Kembali ke Panel, tanpa pesan baru.)
        // (v2.9.9) Mode edit: tombol kembali ke daftar tipe itu.
        const tombolSukses = st.editId
          ? [[{ text: "⬅️ Kembali ke Daftar " + (st.tipe === "SSH" ? "SSH" : "Xray"), callback_data: "tpl:tipe:" + (st.tipe === "SSH" ? "ssh" : "xray") }],
             [{ text: "⬅️ Kembali ke Panel Admin", callback_data: "admin:panel" }]]
          : [[{ text: "➕ Tambah Template Lagi", callback_data: "admin:tambahconfig" }],
             [{ text: "⬅️ Kembali ke Panel Admin", callback_data: "admin:panel" }]];
        await editAtauKirim(env, chatIdCb, st.msgId, "✅ Template " + hasil.aksi + ": <b>" + escapeHtml(hasil.entri.nama) + "</b>.\n\n" + ringkasanTemplate(hasil.entri) + "\n\nPengguna bisa pakai lewat /config.",
          tombolSukses);
        await catatUpdate(env, "Template " + (hasil.aksi === "diupdate" ? "diupdate" : "baru") + ": " + hasil.entri.nama + " (" + labelOperator(hasil.entri.operator) + " — " + labelKategori(hasil.entri.operator, hasil.entri.kategori) + ")");
        return;
      }
      return;
    }
    // ---- Wizard Tambah Bug (v2.8.1): langkah tombol ----
    // Prefix "ab:" (admin-bug) supaya tidak bentrok dengan "bug:op:"
    // (daftar bug) dan "tw:" (wizard template).
    if (data.startsWith("ab:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const st = pendingAdmin.get(chatIdCb);
      if (!st || st.jenis !== "bug" || Date.now() - st.ts > 15 * 60 * 1000) {
        pendingAdmin.delete(chatIdCb);
        await jawabAlert(env, cb.id, "Wizard sudah kedaluwarsa — buka lagi dari panel admin ya.");
        return;
      }
      await jawabCallback(env, cb.id);
      const aksi = data.slice("ab:".length);
      if (aksi.startsWith("op:")) {
        if (st.tahap !== "operator") return;
        const op = normalisasiOperator(aksi.slice("op:".length));
        if (!op) return;
        st.op = op; st.kat = null; st.tahap = "kategori"; st.ts = Date.now();
        await kirimLangkahBug(env, chatIdCb, st);
        return;
      }
      if (aksi === "kembali:op") {
        if (st.tahap !== "kategori") return;
        st.op = null; st.kat = null; st.tahap = "operator"; st.ts = Date.now();
        await kirimLangkahBug(env, chatIdCb, st);
        return;
      }
      if (aksi.startsWith("kat:")) {
        // "kat:baru" harus dicek dulu — diawali "kat:" juga.
        if (aksi === "kat:baru") {
          if (st.tahap !== "kategori") return;
          st.tahap = "kategori_baru"; st.ts = Date.now();
          await kirimLangkahBug(env, chatIdCb, st);
          return;
        }
        if (st.tahap !== "kategori") return;
        const parts = aksi.slice("kat:".length).split(":");
        const op = parts[0]; const katRaw = parts[1];
        if (parts.length !== 2 || op !== st.op) return;
        // Kategori harus ada di BUG_DB operator itu atau di KV BUGS
        // (kategori baru dari wizard sebelumnya) — selain itu tolak.
        const kv = await ambilBugsKv(env);
        const ada = !!BUG_DB[op]?.kategori?.[katRaw] || !!(kv[op] && kv[op][katRaw]);
        if (!ada) return;
        st.kat = normalisasiKategori(katRaw) || katRaw;
        st.tahap = "host"; st.ts = Date.now();
        await kirimLangkahBug(env, chatIdCb, st);
        return;
      }
      // ---- Tombol Lewati: hanya tahap catatan yang bisa dikosongkan.
      // Callback nyasar (tombol pesan lama) diabaikan diam-diam.
      if (aksi === "lewati") {
        if (st.tahap !== "catatan") return;
        st.ts = Date.now();
        await handleBugTeks(env, chatIdCb, st, "lewati");
        return;
      }
      if (aksi === "simpan") {
        if (st.tahap !== "ringkasan" || !st.op || !st.kat || !st.host) {
          // (v2.9.2: error mengedit pesan wizard yang sama.)
          st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "😕 Bug belum lengkap — mulai lagi dari panel admin ya.", keyboardBugSimpan());
          return;
        }
        if (!env.DATA) {
          st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "⚠️ Fitur admin belum aktif — KV belum dipasang di Worker.", keyboardBugSimpan());
          return;
        }
        // Jalur simpan yang sama seperti /tambahbug: KV BUGS +
        // bersihkan BUG_DELETED + catat update + broadcast.
        const hasil = await simpanBug(env, st.op, st.kat, st.host, st.catatan || "");
        if (!hasil) {
          st.msgId = await editAtauKirim(env, chatIdCb, st.msgId, "⚠️ Gagal menyimpan bug — coba lagi nanti ya.", keyboardBugSimpan());
          return;
        }
        const host = st.host, op = st.op, kat = st.kat;
        pendingAdmin.delete(chatIdCb);
        const teksSukses = hasil.aksi === "diupdate"
          ? "✅ Bug <code>" + escapeHtml(host) + "</code> diupdate di " + labelOperator(op) + " — " + labelKategori(op, kat) + "."
          : "✅ Bug <code>" + escapeHtml(host) + "</code> ditambahkan ke " + labelOperator(op) + " — " + labelKategori(op, kat) + ".";
        // (v2.9.2: sukses mengedit pesan wizard jadi pesan sukses —
        // tanpa pesan baru. Broadcast update tetap terkirim terpisah.)
        await editAtauKirim(env, chatIdCb, st.msgId, teksSukses + "\n\n📣 Update terkirim ke " + hasil.terkirim + " pengguna.",
          [[{ text: "➕ Tambah Bug Lagi", callback_data: "admin:tambahbug" }],
           [{ text: "⬅️ Kembali ke Panel Admin", callback_data: "admin:panel" }]]);
        return;
      }
      return;
    }
    // ---- Edit template (tpl:edit:<id>, v2.9.9, admin saja) ----
    // Buka wizard template dengan semua field terisi nilai lama;
    // wizard mulai di tahap "nama" (tipe/metode/operator/kategori
    // tetap). Ketuk ⏭️ Lewati di tiap tahap = pakai nilai lama.
    if (data.startsWith("tpl:edit:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const id = data.slice("tpl:edit:".length);
      const templates = await ambilTemplatesKv(env);
      const t = templates.find((e) => e.id === id);
      await jawabCallback(env, cb.id);
      if (!t) { await sendTelegram(env, chatIdCb, "😕 Template itu sudah tidak tersedia."); return; }
      const sshDef = { host: null, port: null, payload: null, proxyHost: null, proxyPort: null, sni: null, enhanced: false, slowdns: false, dnsNameServer: null, dnsPublicKey: null, dnsUdpHost: null, dnsUdpPort: null };
      const xrayDef = { targetHost: null, targetPort: null, sni: null, headerHost: null, payload: null, sshHost: null, sshPort: null, sshUser: null, sshPass: null, nameServer: null, publicKey: null, udpDnsHost: null, udpDnsPort: null, proxyHost: null, proxyPort: null };
      pendingAdmin.set(chatIdCb, {
        jenis: "template", tahap: "nama", tipe: t.tipe, metode: t.metode || null, op: t.operator, kat: t.kategori, nama: t.nama,
        ssh: { ...sshDef, ...(t.ssh || {}) }, xray: { ...xrayDef, ...(t.xray || {}) },
        editId: t.id, editNamaLama: t.nama, ts: Date.now(), msgId: cb.message.message_id,
      });
      await kirimLangkahTemplate(env, chatIdCb, pendingAdmin.get(chatIdCb));
      return;
    }
    // ---- Hapus template (tpl:del:ya:<id>) ----
    if (data.startsWith("tpl:del:ya:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const id = data.slice("tpl:del:ya:".length);
      const templates = await ambilTemplatesKv(env);
      const t = templates.find((e) => e.id === id);
      await jawabCallback(env, cb.id);
      if (!t) { await sendTelegram(env, chatIdCb, "😕 Template itu sudah tidak ada."); return; }
      const ok = await hapusTemplateKv(env, id);
      if (!ok) { await sendTelegram(env, chatIdCb, "😕 Gagal menghapus template, coba lagi nanti ya."); return; }
      // Kembali ke daftar template tipe itu (atau /config bila
      // tipenya sudah tidak punya template lagi).
      const notice = "✅ Template <b>" + escapeHtml(t.nama) + "</b> dihapus.";
      const sisa = (await ambilTemplatesKv(env)).filter((e) => e.tipe === t.tipe);
      if (sisa.length) await handleTemplateTipe(env, chatIdCb, t.tipe === "SSH" ? "ssh" : "xray", notice, cb.message.message_id);
      else await handleConfig(env, chatIdCb, notice, cb.message.message_id);
      return;
    }
    if (data.startsWith("tpl:del:batal")) {
      await jawabCallback(env, cb.id);
      const rest = data.slice("tpl:del:batal".length);
      if (rest === ":xray" || rest === ":ssh") await handleTemplateTipe(env, chatIdCb, rest.slice(1), undefined, cb.message.message_id);
      else await handleConfig(env, chatIdCb, undefined, cb.message.message_id);
      return;
    }
    if (data.startsWith("tpl:del:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const id = data.slice("tpl:del:".length);
      const templates = await ambilTemplatesKv(env);
      const t = templates.find((e) => e.id === id);
      await jawabCallback(env, cb.id);
      if (!t) { await sendTelegram(env, chatIdCb, "😕 Template itu sudah tidak ada."); return; }
      await editAtauKirim(env, chatIdCb, cb.message.message_id, "🗑️ Hapus template <b>" + escapeHtml(t.nama) + "</b>?", [
        [{ text: "✅ Ya, hapus", callback_data: "tpl:del:ya:" + id }, { text: "❌ Batal", callback_data: "tpl:del:batal:" + (t.tipe === "SSH" ? "ssh" : "xray") }],
      ]);
      return;
    }
    // ---- Kembali ke daftar tipe template (tpl:tipe:daftar) ----
    if (data === "tpl:tipe:daftar") {
      await jawabCallback(env, cb.id);
      await handleConfig(env, chatIdCb, undefined, cb.message.message_id);
      return;
    }
    // ---- Daftar template satu tipe (tpl:tipe:xray / tpl:tipe:ssh) ----
    if (data.startsWith("tpl:tipe:")) {
      const tipe = data.slice("tpl:tipe:".length);
      if (tipe !== "xray" && tipe !== "ssh") return;
      await jawabCallback(env, cb.id);
      await handleTemplateTipe(env, chatIdCb, tipe, undefined, cb.message.message_id);
      return;
    }
    // ---- Pakai template (tpl:pakai:<id>) ----
    if (data.startsWith("tpl:pakai:")) {
      const id = data.slice("tpl:pakai:".length);
      const templates = await ambilTemplatesKv(env);
      const t = templates.find((e) => e.id === id);
      await jawabCallback(env, cb.id);
      if (!t) {
        await sendTelegram(env, chatIdCb, "😕 Template itu sudah tidak tersedia. Ketik /config buat lihat daftar terbaru.");
        return;
      }
      pendingTemplate.set(chatIdCb, { templateId: id, ts: Date.now() });
      const butuh = t.tipe === "SSH" ? "akun SSH (<code>host:port@user:pass</code>)" : "link Xray (<b>VLESS / VMess / Trojan / Shadowsocks</b>)";
      // (v2.9.2: edit pesan daftar jadi prompt kirim akun.)
      await editAtauKirim(env, chatIdCb, cb.message.message_id, "🧩 <b>Template: " + escapeHtml(t.nama) + "</b>\n\n" + ringkasanTemplate(t) + "\n\nKirim " + butuh + " kamu — bot akan buatkan config pakai setting template ini.", [[{ text: "❌ Batal", callback_data: "tpl:batal" }]]);
      return;
    }
    // ---- Batal pakai template (tpl:batal) ----
    // (Harus dicek SETELAH tpl:pakai: — "tpl:batal" tidak diawali
    // "tpl:pakai:", jadi aman; dulu handler ini mati karena tertangkap
    // handler generik "tpl:" — diperbaiki di sini.)
    if (data === "tpl:batal") {
      pendingTemplate.delete(chatIdCb);
      await jawabCallback(env, cb.id);
      // (v2.9.2: pesan prompt DIHAPUS — tanpa pesan "dibatalkan".)
      await hapusTelegram(env, chatIdCb, cb.message.message_id);
      return;
    }
    // Ketuk satu config contoh dari /config -> kirim file .dark-nya.
    if (data.startsWith("cfg:")) {
      const id = data.slice("cfg:".length);
      await jawabCallback(env, cb.id);
      const arr = await ambilConfigsKv(env);
      const cfg = arr.find((e) => e.id === id);
      if (!cfg) {
        await sendTelegram(env, chatIdCb, "😕 Config itu sudah tidak tersedia. Ketik /config buat lihat daftar terbaru.");
        return;
      }
      const dec = fromDarktunnelLink(cfg.link);
      const rincian = dec ? ringkasanConfig(dec) : "";
      const caption = "📁 <b>" + escapeHtml(cfg.nama) + "</b> (" + labelOperator(cfg.operator) + " — " + labelKategori(cfg.operator, cfg.kategori) + ")" +
        (rincian ? "\n\n" + rincian : "") + "\n\n" + CARA_IMPOR;
      await sendDocument(env, chatIdCb, namaFileDark(cfg.nama, dec ? dec.type : ""), cfg.link + "\n", caption, TOMBOL_APK);
      return;
    }
    // Alur /bug: pilih operator -> pilih kategori -> daftar bug (KV + bawaan).
    if (data === "bug:back") {
      await jawabCallback(env, cb.id);
      await editAtauKirim(env, chatIdCb, cb.message.message_id,
        "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
      return;
    }
    if (data.startsWith("bug:op:")) {
      const opKey = data.slice("bug:op:".length);
      const op = BUG_DB[opKey];
      if (!op) { await jawabCallback(env, cb.id); return; }
      await jawabCallback(env, cb.id);
      const kv = await ambilBugsKv(env);
      await editAtauKirim(env, chatIdCb, cb.message.message_id,
        "🐛 <b>Bug " + op.label + "</b>\n\nPilih kategori:", keyboardKategoriBug(opKey, Object.keys(kv[opKey] || {})));
      return;
    }
    if (data.startsWith("bug:kat:")) {
      const parts = data.slice("bug:kat:".length).split(":");
      const daftar = await daftarBugPesanGabungan(env, parts[0], parts[1]);
      await jawabCallback(env, cb.id);
      if (!daftar) {
        await sendTelegram(env, chatIdCb, "😕 Kategori itu tidak ada. Ketik /bug buat mulai lagi.");
        return;
      }
      for (let i = 0; i < daftar.length; i++) {
        const kbDaftar = i === daftar.length - 1 ? keyboardKembaliBug(parts[0], parts[1], cekAdmin(env, chatIdCb) === "ya") : undefined;
        // (v2.9.2: potongan pertama mengedit pesan kategori; sisanya
        // kirim baru. v2.9.6: tiap potongan kini membawa judul + nomor
        // bagian, jadi tidak terlihat seperti daftar lepas.)
        if (i === 0) await editAtauKirim(env, chatIdCb, cb.message.message_id, daftar[i], kbDaftar);
        else await sendTelegram(env, chatIdCb, daftar[i], kbDaftar);
      }
      return;
    }
    // ---- Mode hapus bug (v2.8.0, admin saja) ----
    // Konfirmasi hapus (bug:hapus:ya:<op>:<kat>:<idx>:<hash>).
    // Hash dicek ulang: bila host di indeks itu sudah bukan host yang
    // sama (daftar bergeser), tolak — jangan sampai salah hapus.
    if (data.startsWith("bug:hapus:ya:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const parts = data.slice("bug:hapus:ya:".length).split(":");
      const [opKey, katKey, idxRaw, hash] = parts;
      const idx = Number(idxRaw);
      await jawabCallback(env, cb.id);
      const hosts = await daftarHostKategori(env, opKey, katKey);
      const host = hosts[idx];
      if (!host || hashHostSingkat(host) !== hash) {
        await tampilkanModeHapusBug(env, chatIdCb, cb.message.message_id, opKey, katKey, 0, "😕 Daftar bug sudah berubah — pilih lagi ya.");
        return;
      }
      const hasil = await hapusBugKv(env, opKey, katKey, host);
      if (!hasil) {
        await tampilkanModeHapusBug(env, chatIdCb, cb.message.message_id, opKey, katKey, 0, "😕 Bug itu sudah tidak ada di daftar.");
        return;
      }
      // Kembali ke mode hapus dengan daftar terbaru (biar admin bisa
      // hapus beberapa bug berurutan).
      await tampilkanModeHapusBug(env, chatIdCb, cb.message.message_id, opKey, katKey, 0, "✅ Bug <code>" + escapeHtml(host) + "</code> dihapus dari daftar.");
      return;
    }
    // Batal konfirmasi hapus -> kembali ke mode hapus.
    if (data.startsWith("bug:hapus:batal:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const parts = data.slice("bug:hapus:batal:".length).split(":");
      await jawabCallback(env, cb.id);
      await tampilkanModeHapusBug(env, chatIdCb, cb.message.message_id, parts[0], parts[1], 0);
      return;
    }
    // Ketuk host di mode hapus -> minta konfirmasi (hash dicek dulu
    // supaya tombol usang tidak menampilkan host yang salah).
    if (data.startsWith("bug:hapus:host:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const parts = data.slice("bug:hapus:host:".length).split(":");
      const [opKey, katKey, idxRaw, hash] = parts;
      const idx = Number(idxRaw);
      await jawabCallback(env, cb.id);
      const hosts = await daftarHostKategori(env, opKey, katKey);
      const host = hosts[idx];
      if (!host || hashHostSingkat(host) !== hash) {
        await tampilkanModeHapusBug(env, chatIdCb, cb.message.message_id, opKey, katKey, 0, "😕 Daftar bug sudah berubah — pilih lagi ya.");
        return;
      }
      await editAtauKirim(env, chatIdCb, cb.message.message_id,
        "🗑️ Hapus bug <code>" + escapeHtml(host) + "</code> dari " + escapeHtml(labelOperator(opKey)) + " — " + escapeHtml(labelKategori(opKey, katKey)) + "?",
        [
          [{ text: "✅ Ya, Hapus", callback_data: "bug:hapus:ya:" + opKey + ":" + katKey + ":" + idx + ":" + hash }, { text: "❌ Batal", callback_data: "bug:hapus:batal:" + opKey + ":" + katKey }],
        ]);
      return;
    }
    // Pindah halaman di mode hapus.
    if (data.startsWith("bug:hapus:hal:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const parts = data.slice("bug:hapus:hal:".length).split(":");
      await jawabCallback(env, cb.id);
      await tampilkanModeHapusBug(env, chatIdCb, cb.message.message_id, parts[0], parts[1], Number(parts[2]) || 0);
      return;
    }
    // Masuk mode hapus (bug:hapus:<op>:<kat>).
    if (data.startsWith("bug:hapus:")) {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      const parts = data.slice("bug:hapus:".length).split(":");
      await jawabCallback(env, cb.id);
      await tampilkanModeHapusBug(env, chatIdCb, cb.message.message_id, parts[0], parts[1], 0);
      return;
    }
    await jawabCallback(env, cb.id);
    return;
  }
  // Dokumen .dark dari admin yang sedang ditunggu akunnya (/tambahconfig
  // atau tombol "➕ Tambah Config"). Dokumen lain diabaikan diam-diam.
  if (msg && msg.document) {
    await handleDokumenConfig(env, msg);
    return;
  }
  if (!msg || !msg.text) return; // foto/stiker diabaikan diam-diam
  const chatId = msg.chat.id;
  const teks = msg.text.trim();
  const diGrup = msg.chat.type === "group" || msg.chat.type === "supergroup";

  if (diGrup) {
    // (v2.9.13, v2.9.14) Di grup bot menampilkan menu; buat config
    // dialihkan ke DM (akun rahasia); kata kunci tertentu memicu
    // balasan bot. Akun pelanggan tidak pernah diproses di grup.
    await catatAktivitasGrup(env, chatId);
    const perintah = teks.split(" ")[0].replace(/@.+$/, "");
    if (perintah === "/start" || perintah === "/menu") {
      await tampilkanMenuUtama(env, chatId, undefined, true);
    } else if (perintah === "/bug") {
      await sendTelegram(env, chatId, "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
    } else if (perintah === "/update") {
      await handleUpdate(env, chatId);
    } else if (perintah === "/cek" || perintah === "/cekdomain" || perintah === "/cekrespon") {
      // (v2.9.14) Cek Domain balik ke grup — domain bisa ditulis
      // langsung di perintah atau dikirim sesudahnya.
      const argumen = teks.split(/\s+/).slice(1).join(" ");
      await mulaiCekDomain(env, chatId, argumen);
    } else if (perintah === "/catatan") {
      await sendTelegram(env, chatId, CATATAN_PEMICU, TOMBOL_KEMBALI);
    } else if (perintah === "/config") {
      // Template Config tetap di DM.
      const tombol = env.BOT_USERNAME
        ? [[{ text: "💬 Buka di Chat Pribadi", url: "https://t.me/" + env.BOT_USERNAME }]]
        : undefined;
      await sendTelegram(env, chatId, "🧩 Template config cuma bisa di chat pribadi ya.", tombol);
    } else if (!teks.startsWith("/")) {
      // Cek domain yang tertunda: domain dicek, bukan domain diabaikan
      // diam-diam (biar obrolan grup tidak memicu balasan "bukan domain").
      if (pendingCek.has(chatId)) {
        pendingCek.delete(chatId);
        const domain = bersihkanDomain(teks);
        if (domain) await kirimHasilCek(env, chatId, domain);
      } else if (!teks.includes("://")) {
        // Kata kunci pemicu; teks ber-link (akun) diabaikan.
        const aksi = cocokPemicu(teks);
        if (aksi) await balasPemicuGrup(env, chatId, aksi, teks);
      }
    }
    return;
  }

  // Perintah apa pun (atau ketuk "▶️ Start" dari keyboard lama yang masih
  // nempel) membatalkan state admin yang tertunda — pengguna pindah alur.
  if (teks.startsWith("/") || teks === "▶️ Start") {
    pendingAdmin.delete(chatId);
    pendingTemplate.delete(chatId);
    pendingManualAkun.delete(chatId);
  }

  if (teks === "/start" || teks === "/menu" || teks === "▶️ Start" ||
      teks.startsWith("/start ") || teks.startsWith("/start@") ||
      teks.startsWith("/menu ") || teks.startsWith("/menu@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await tampilkanMenuUtama(env, chatId);
    return;
  }
  // /help (v2.9.11): teks bantuan sendiri, bukan menu utama.
  if (teks === "/help" || teks.startsWith("/help ") || teks.startsWith("/help@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await sendTelegram(env, chatId, PESAN_BANTUAN, TOMBOL_KEMBALI);
    return;
  }
  if (teks === "/bug" || teks.startsWith("/bug ") || teks.startsWith("/bug@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await sendTelegram(env, chatId,
      "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
    return;
  }
  if (teks === "/cek" || teks.startsWith("/cek ") || teks.startsWith("/cek@") ||
      teks === "/cekdomain" || teks.startsWith("/cekdomain ") || teks.startsWith("/cekdomain@") ||
      teks === "/cekrespon" || teks.startsWith("/cekrespon ") || teks.startsWith("/cekrespon@")) {
    pendingConfig.delete(chatId);
    const argumen = teks.split(/\s+/).slice(1).join(" ");
    await mulaiCekDomain(env, chatId, argumen);
    return;
  }
  if (teks === "/catatan" || teks.startsWith("/catatan ") || teks.startsWith("/catatan@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await sendTelegram(env, chatId, CATATAN_PEMICU, TOMBOL_KEMBALI);
    return;
  }
  if (teks === "/update" || teks.startsWith("/update ") || teks.startsWith("/update@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await handleUpdate(env, chatId);
    return;
  }
  if (teks === "/config" || teks.startsWith("/config ") || teks.startsWith("/config@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await handleConfig(env, chatId);
    return;
  }
  if (teks === "/status" || teks.startsWith("/status ") || teks.startsWith("/status@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await handleStatus(env, chatId);
    return;
  }
  // /setmenu (admin): pasang tombol Menu ☰ di pojok kiri bawah — isinya
  // cuma "start" untuk membuka menu bot. Dipakai sekali; BotFather
  // dikosongkan sebelumnya (21 Nov 2026) jadi tombol ☰ sempat hilang.
  if (teks === "/setmenu" || teks.startsWith("/setmenu ") || teks.startsWith("/setmenu@")) {
    if (cekAdmin(env, chatId) !== "ya") { await sendTelegram(env, chatId, "⛔ Perintah ini khusus admin."); return; }
    const r = await telegramApi(env, "setMyCommands", { commands: [{ command: "start", description: "Buka menu bot" }] });
    await sendTelegram(env, chatId, r && r.ok ? "✅ Tombol menu sudah dipasang — ketuk ☰ di pojok kiri bawah, isinya cuma <b>start</b> untuk membuka menu bot." : "😕 Gagal memasang tombol menu, coba lagi nanti ya.");
    return;
  }
  // /setdeskripsi (admin, v2.9.11): pasang deskripsi singkat + deskripsi
  // bot lewat API (tampil di profil bot & hasil pencarian Telegram).
  // Dipakai sekali; kalau teks deskripsi diubah di kode, kirim lagi.
  if (teks === "/setdeskripsi" || teks.startsWith("/setdeskripsi ") || teks.startsWith("/setdeskripsi@")) {
    if (cekAdmin(env, chatId) !== "ya") { await sendTelegram(env, chatId, "⛔ Perintah ini khusus admin."); return; }
    const r1 = await telegramApi(env, "setMyShortDescription", { short_description: DESKRIPSI_SINGKAT_BOT });
    const r2 = await telegramApi(env, "setMyDescription", { description: DESKRIPSI_BOT });
    await sendTelegram(env, chatId, r1 && r1.ok && r2 && r2.ok ? "✅ Deskripsi bot sudah dipasang — cek di profil @autosetdark_bot." : "😕 Gagal memasang deskripsi, coba lagi nanti ya.");
    return;
  }
  if (teks.startsWith("/tambahbug")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    const st = cekAdmin(env, chatId);
    if (st === "belum") { await sendTelegram(env, chatId, "⚠️ Fitur admin belum dikonfigurasi."); return; }
    if (st === "bukan") { await sendTelegram(env, chatId, "⛔ Perintah ini khusus admin."); return; }
    await handleTambahBug(env, chatId, teks);
    return;
  }
  if (teks.startsWith("/tambahconfig")) {
    pendingCek.delete(chatId);
    const st = cekAdmin(env, chatId);
    if (st === "belum") { await sendTelegram(env, chatId, "⚠️ Fitur admin belum dikonfigurasi."); return; }
    if (st === "bukan") { await sendTelegram(env, chatId, "⛔ Perintah ini khusus admin."); return; }
    if (!env.DATA) { await sendTelegram(env, chatId, "⚠️ Fitur admin belum aktif — KV belum dipasang di Worker."); return; }
    const args = teks.split(/\s+/).slice(1);
    const [opRaw, katRaw, ...namaParts] = args;
    const op = normalisasiOperator(opRaw);
    const kat = normalisasiKategori(katRaw);
    const nama = namaParts.join(" ").trim();
    if (!op || !kat || !nama) {
      await sendTelegram(env, chatId,
        "😕 Format belum lengkap.\n\n" +
        "Format: <code>/tambahconfig &lt;operator&gt; &lt;kategori&gt; &lt;nama&gt;</code>\n" +
        "Operator: xl, axis, telkomsel, indosat, smartfren, tri, byu. Kategori: edu, ilped, opok, wa, game, sosmed, musik, nonton, conference, appfun.\n" +
        "Contoh: <code>/tambahconfig telkomsel opok Opok Tsel 1</code>\n" +
        "Setelah itu kirim akunnya.");
      return;
    }
    pendingConfig.set(chatId, { op, kat, nama, ts: Date.now() });
    await sendTelegram(env, chatId, "📋 Config <b>" + escapeHtml(nama) + "</b> (" + labelOperator(op) + " — " + labelKategori(op, kat) + ").\n\nKirim akunnya (SSH/Xray, bebas format) — bot akan simpan sebagai config contoh.");
    return;
  }
  // /seedtemplate (admin, v2.9.8): masukkan template bawaan
  // (TEMPLATE_BAWAAN: 9 dikte Asep + 3 starter) ke KV. Upsert menurut
  // nama — aman diulang; template tampil di /config.
  if (teks === "/seedtemplate" || teks.startsWith("/seedtemplate ") || teks.startsWith("/seedtemplate@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    const st = cekAdmin(env, chatId);
    if (st === "belum") { await sendTelegram(env, chatId, "⚠️ Fitur admin belum dikonfigurasi."); return; }
    if (st === "bukan") { await sendTelegram(env, chatId, "⛔ Perintah ini khusus admin."); return; }
    if (!env.DATA) { await sendTelegram(env, chatId, "⚠️ Fitur admin belum aktif — KV belum dipasang di Worker."); return; }
    const hasil = await seedTemplateBawaan(env);
    const ok = hasil.filter((h) => h.ok);
    const gagal = hasil.filter((h) => !h.ok);
    if (ok.length) await catatUpdate(env, "Template bawaan ditambahkan: " + ok.length + " template (seed /seedtemplate)");
    await sendTelegram(env, chatId,
      (gagal.length ? "⚠️ " : "✅ ") + "Seed template selesai: <b>" + ok.length + " berhasil</b>" + (gagal.length ? ", <b>" + gagal.length + " gagal</b>" : "") + " dari " + hasil.length + " template bawaan.\n\n" +
      ok.map((h) => "• " + escapeHtml(h.nama) + " (" + h.aksi + ")").join("\n") +
      (gagal.length ? "\n\nGagal: " + gagal.map((h) => escapeHtml(h.nama)).join(", ") : "") +
      "\n\nLihat di /config — Template Xray & SSH.");
    return;
  }
  if (teks.startsWith("/")) { pendingCek.delete(chatId); pendingConfig.delete(chatId); return; } // perintah tak dikenal diabaikan diam-diam

  // State admin tertunda (tombol panel admin): dicek sebelum
  // handlePesanAkun, hanya untuk admin — KECUALI state manual
  // (v2.9.9, pengguna biasa menjalankan wizard Buat Manual miliknya).
  // Perintah sudah ditangani di atas (state dihapus); state kedaluwarsa
  // diabaikan di dalam handler.
  if (pendingAdmin.has(chatId)) {
    const st0 = pendingAdmin.get(chatId);
    if (cekAdmin(env, chatId) === "ya" || st0.mode === "manual") {
      if (await handleAdminTertunda(env, chatId, teks)) return;
    }
  }

  // Akun yang ditunggu untuk /tambahconfig (admin).
  if (pendingConfig.has(chatId)) {
    await handleTambahConfigAkun(env, chatId, teks);
    return;
  }

  // Akun yang ditunggu untuk template yang dipilih di /config.
  if (pendingTemplate.has(chatId)) {
    if (await handlePakaiTemplate(env, chatId, teks)) return;
  }

  // Akun yang ditunggu untuk Buat Manual (v2.9.9).
  if (pendingManualAkun.has(chatId)) {
    if (await handleManualAkun(env, chatId, teks)) return;
  }

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
    catch { hasilCek = { domain, ok: false, status: 0, ms: 0, cdn: "", server: "", ips: [], hostname: "", subdomains: null }; }
    await sendTelegram(env, chatId, formatHasilCek(hasilCek), [
      [{ text: "🔄 Cek Lagi", callback_data: "cek:mulai" }],
      ...TOMBOL_KEMBALI,
    ]);
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
  // Cron tiap 10 menit (v2.9.14, v2.9.15): nudge grup yang sepi
  // > 6 jam + nyautin broadcast buka/tutup sandekala.
  // Jadwal dipasang di workflow deploy (wrangler.toml [triggers]).
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      await cekGrupSepi(env);
      await cekRoastSandekala(env);
    })());
  },
};
