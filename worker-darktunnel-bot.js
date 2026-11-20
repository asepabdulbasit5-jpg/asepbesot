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
// Dirapikan dari hidden_files/bahan-grup.md: duplikat dihapus. Entri bisa
// berupa hostname maupun alamat IP — bug IP tetap ditampilkan (koreksi
// 21 Nov 2026: hilangnya bug IP dari daftar adalah masalah, bukan perintah
// hapus). Format entri: "host" atau "host|catatan".
// Bug bisa mati sewaktu-waktu — daftar ini referensi, bukan jaminan.
function daftarBug(...items) {
  return items.map((s) => {
    const i = s.indexOf("|");
    return i >= 0 ? { h: s.slice(0, i), n: s.slice(i + 1) } : { h: s };
  });
}

export const BUG_DB = {
  xl: { label: "XL", kategori: {
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
      "auth.zellify.app", "app.parentaiapp.com", "www.ruangguru.com",
      "162.159.140.147", "104.18.3.2", "104.18.2.2", "104.17.72.206",
      "104.17.3.81", "104.17.74.206", "188.114.97.3", "188.114.96.3",
      "104.16.143.237", "104.16.142.237", "172.66.152.99") },
    opok: { label: "Opok", hosts: daftarBug(
      "static.ovo.id|cf", "pub-static.pmang.com|cf", "xl.co.id", "ovo.id",
      "gopay.co.id", "chat.xl.co.id", "pilih.xl.co.id",
      "wp-assets.ovo.id|cf", "livinapp.onelink.me|cf", "auth.xlcyberscan.xl.co.id|cf",
      "assets.web.q4inc.com|cf", "asphalt.gojek.com|cf", "bpd.m.dana.id", "dana.onelink.me",
      "three.co.uk", "baidu.com",
      "13.249.231.12", "13.249.231.14", "13.249.231.31", "13.249.231.42",
      "13.249.231.43", "13.249.231.51", "13.249.231.71", "13.249.231.72",
      "13.249.231.97", "13.249.231.99", "13.249.231.85", "13.249.231.84",
      "13.249.251.81", "13.35.202.97", "18.161.49.87", "18.244.51.92",
      "13.35.202.3", "13.35.202.129", "104.19.168.112", "108.138.141.61",
      "108.138.141.90", "108.157.254.16", "54.192.164.97", "54.192.164.129",
      "3.168.203.26") },
    wa: { label: "WA", hosts: daftarBug(
      "listen.noice.id|wc/sni", "creators.noice.id|wc", "academy.noice.id",
      "cf-prod-cdn.noice.id", "cdn.noiceid.cc", "go.noice.id", "www.noice.id",
      "fonts.googleapis.com|sni", "googleads.g.doubleclick.net", "line.me",
      "media.fcgk35-1.fna.whatsapp.net", "c.whatsapp.net", "v.whatsaap.net",
      "wbbb65a4c1kqkoav7b-gm3temzxg43tgojr.snr.whatsapp.net",
      "31.13.67.51", "104.22.3.25", "104.18.214.235", "104.18.147.61",
      "104.18.42.238", "104.16.51.111") },
    game: { label: "Game", hosts: daftarBug(
      "dl.cvs.freefiremobile.com|ws/wc", "www.freefiremobile.com|sni", "poe.garena.com|sni",
      "cdn.aihelp.net|ws", "play.mobilelegends.com", "m.mobilelegends.com|sni",
      "go.appsflyer.com", "df.game.naver.com", "ava.game.naver.com",
      "redstone.game.naver.com|cf", "sogood.linefriends.com", "bcmsuporte.garena.com|ws",
      "m.freefiremobile.com|sni", "suporte.garena.com|sni", "akmpicture.youngjoygame.com|sni",
      "mediacf.gameloft.com", "cdn.appsflyer.com|cf", "cftxvid.vod.nimo.tv",
      "ir.huya.com", "dev.appsflyer.com", "www.pubgmobile.com|sni",
      "104.16.241.118", "162.159.140.159", "104.16.16.243") },
    sosmed: { label: "Sosmed", hosts: daftarBug(
      "api24-normal-alisg.tiktokv.com|ws/wc", "api24-normal.tiktokv.com",
      "api24-normal-useast1a.tiktokv.com", "apac-marketing.tiktok.com", "v27.tiktokcdn.com",
      "api2.musical.ly", "m-va.tiktokv.com", "www.tiktok.com|sni", "frontier.tiktokv.com",
      "log.tiktokv.com", "mon16-normal-alisg.tiktokv.com", "search16-normal.tiktokv.com",
      "search22-normal.tiktokv.com", "tnc0-normal-alisg.tiktokv.com",
      "safety-enforcement.tiktok.com|sni", "static.cdninstagram.com", "graph.instagram.com",
      "live-upload.instagram.com", "opensource.fb.com", "graph.facobook.com", "status.fb.com",
      "investor.fb.com", "investor.atmeta.com", "go2.facebookinc.com",
      "172.66.1.232", "162.159.141.236", "104.18.19.183",
      "162.159.130.11", "162.159.129.11") },
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
      "blog.sushiroll.co.id", "go2.webtoons.com", "zaintest.vuclip.com",
      "162.159.140.147", "172.66.0.145", "76.223.54.146", "3.33.139.32",
      "185.93.1.245", "44.230.85.241", "52.117.52.70", "13.248.169.48",
      "104.20.25.114",
      "104.21.58.186", "172.67.206.64", "104.21.235.171", "172.67.192.40",
      "104.21.73.208", "104.21.235.172", "162.159.128.7", "104.18.225.52",
      "172.67.213.134") },
    conference: { label: "Conference", hosts: daftarBug(
      "support.zoom.us|wc", "zoomcares.zoom.us", "cdn-cf.zoom.us", "beta.zoom.us",
      "kiwisuccess.zoom.us", "gomarketplacecontent-cf.zoom.us", "meetings.googleapis.com",
      "mobilemaps.googleapis.com", "tellafriendreceiver.whatsapp.net", "go.medallia.com",
      "youtubei.googleapis.com", "git.ajax.googleapis.com", "m.ajax.googleapis.com",
      "maps.googleapis.com", "web.whatsapp.com", "blog.webex.com", "api.webex.com",
      "caic.zoom.us", "170.114.46.0") },
  } },
  axis: { label: "Axis", kategori: {
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
      "auth.zellify.app", "app.parentaiapp.com", "www.ruangguru.com",
      "162.159.140.147", "104.18.3.2", "104.18.2.2", "104.17.72.206",
      "104.17.3.81", "104.17.74.206", "188.114.97.3", "188.114.96.3",
      "104.16.143.237", "104.16.142.237", "172.66.152.99") },
    opok: { label: "Opok", hosts: daftarBug(
      "static.ovo.id|cf", "pub-static.pmang.com|cf", "ovo.id",
      "arjuna.axis.co.id", "gopay.co.id",
      "wp-assets.ovo.id|cf", "livinapp.onelink.me|cf",
      "assets.web.q4inc.com|cf", "asphalt.gojek.com|cf", "bpd.m.dana.id", "dana.onelink.me",
      "staging.games.axis.co.id|ws", "go.axis.co.id", "www.axis.co.id",
      "kuota.axis.co.id", "three.co.uk", "baidu.com",
      "13.249.231.12", "13.249.231.14", "13.249.231.31", "13.249.231.42",
      "13.249.231.43", "13.249.231.51", "13.249.231.71", "13.249.231.72",
      "13.249.231.97", "13.249.231.99", "13.249.231.85", "13.249.231.84",
      "13.249.251.81", "13.35.202.97", "18.161.49.87", "18.244.51.92",
      "13.35.202.3", "13.35.202.129", "104.19.168.112", "108.138.141.61",
      "108.138.141.90", "108.157.254.16", "54.192.164.97", "54.192.164.129",
      "3.168.203.26") },
    wa: { label: "WA", hosts: daftarBug(
      "listen.noice.id|wc/sni", "creators.noice.id|wc", "academy.noice.id",
      "cf-prod-cdn.noice.id", "cdn.noiceid.cc", "go.noice.id", "www.noice.id",
      "fonts.googleapis.com|sni", "googleads.g.doubleclick.net", "line.me",
      "media.fcgk35-1.fna.whatsapp.net", "c.whatsapp.net", "v.whatsaap.net",
      "wbbb65a4c1kqkoav7b-gm3temzxg43tgojr.snr.whatsapp.net",
      "31.13.67.51", "104.22.3.25", "104.18.214.235", "104.18.147.61",
      "104.18.42.238", "104.16.51.111") },
    game: { label: "Game", hosts: daftarBug(
      "dl.cvs.freefiremobile.com|ws/wc", "www.freefiremobile.com|sni", "poe.garena.com|sni",
      "cdn.aihelp.net|ws", "play.mobilelegends.com", "m.mobilelegends.com|sni",
      "go.appsflyer.com", "df.game.naver.com", "ava.game.naver.com",
      "redstone.game.naver.com|cf", "sogood.linefriends.com", "bcmsuporte.garena.com|ws",
      "m.freefiremobile.com|sni", "suporte.garena.com|sni", "akmpicture.youngjoygame.com|sni",
      "mediacf.gameloft.com", "cdn.appsflyer.com|cf", "cftxvid.vod.nimo.tv",
      "ir.huya.com", "dev.appsflyer.com", "www.pubgmobile.com|sni",
      "104.16.241.118", "162.159.140.159", "104.16.16.243") },
    sosmed: { label: "Sosmed", hosts: daftarBug(
      "api24-normal-alisg.tiktokv.com|ws/wc", "api24-normal.tiktokv.com",
      "api24-normal-useast1a.tiktokv.com", "apac-marketing.tiktok.com", "v27.tiktokcdn.com",
      "api2.musical.ly", "m-va.tiktokv.com", "www.tiktok.com|sni", "frontier.tiktokv.com",
      "log.tiktokv.com", "mon16-normal-alisg.tiktokv.com", "search16-normal.tiktokv.com",
      "search22-normal.tiktokv.com", "tnc0-normal-alisg.tiktokv.com",
      "safety-enforcement.tiktok.com|sni", "static.cdninstagram.com", "graph.instagram.com",
      "live-upload.instagram.com", "opensource.fb.com", "graph.facobook.com", "status.fb.com",
      "investor.fb.com", "investor.atmeta.com", "go2.facebookinc.com",
      "172.66.1.232", "162.159.141.236", "104.18.19.183",
      "162.159.130.11", "162.159.129.11") },
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
      "blog.sushiroll.co.id", "go2.webtoons.com", "zaintest.vuclip.com",
      "162.159.140.147", "172.66.0.145", "76.223.54.146", "3.33.139.32",
      "185.93.1.245", "44.230.85.241", "52.117.52.70", "13.248.169.48",
      "104.20.25.114",
      "104.21.58.186", "172.67.206.64", "104.21.235.171", "172.67.192.40",
      "104.21.73.208", "104.21.235.172", "162.159.128.7", "104.18.225.52",
      "172.67.213.134") },
    conference: { label: "Conference", hosts: daftarBug(
      "support.zoom.us|wc", "zoomcares.zoom.us", "cdn-cf.zoom.us", "beta.zoom.us",
      "kiwisuccess.zoom.us", "gomarketplacecontent-cf.zoom.us", "meetings.googleapis.com",
      "mobilemaps.googleapis.com", "tellafriendreceiver.whatsapp.net", "go.medallia.com",
      "youtubei.googleapis.com", "git.ajax.googleapis.com", "m.ajax.googleapis.com",
      "maps.googleapis.com", "web.whatsapp.com", "blog.webex.com", "api.webex.com",
      "caic.zoom.us", "170.114.46.0") },
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
      "cdnlecture.kelaspintar.id", "cdn.kelaspintar.id",
      "74.125.68.100", "142.91.102.190", "104.18.17.214", "188.114.97.2",
      "162.159.134.42", "104.20.28.42", "104.18.9.196", "104.18.8.196",
      "172.66.152.99", "172.67.74.70", "170.114.45.6", "104.26.3.86",
      "104.18.25.139", "104.18.24.139") },
    opok: { label: "Opok", hosts: daftarBug(
      "tdwcontent.telkomsel.com|cf", "12342835.monterey.org", "login.gopay.co.id",
      "static.ovo.id|cf", "ngage.telkomsel.com|cf", "tma-api.telkomsel.com|cf",
      "mta-sts.insurance.gopay.co.id", "goplatform.gojekapi.com", "api.myorbit.id",
      "cdn.linkaja.com|cf", "app.gopay.co.id", "space.byu.id", "blog.acer.com",
      "account.kompas.com", "activity.kompas.com", "ads2.kompas.com", "ads3.kompas.com",
      "amp.kompas.com", "www.kompas.com",
      "104.18.17.214", "15.232.198.233", "15.232.29.104", "108.138.141.79",
      "18.161.49.111", "18.161.49.41", "18.161.49.87", "18.161.49.116",
      "162.159.128.79", "54.192.164.25", "65.8.76.45", "65.8.76.7",
      "162.159.138.78", "162.159.138.79") },
    game: { label: "Game", hosts: daftarBug(
      "i.nimo.tv", "ir.huya.com", "cf-vod.nimo.tv", "images.rbxcdn.com",
      "18.64.37.89") },
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
      "api.webex.com", "141.193.213.20") },
    opok: { label: "Opok", hosts: daftarBug(
      "myim3api1.ioh.co.id", "static.ovo.id|cf", "myim3.ioh.co.id",
      "myim3asset.ioh.co.id", "myim3-he1.ioh.co.id", "myim3-he.indosatooredoo.com",
      "bimatri.ioh.co.id", "three.co.uk", "baidu.com",
      "104.18.21.18", "198.19.1.179", "34.54.192.69", "198.18.0.22") },
    conference: { label: "Conference", hosts: daftarBug(
      "caic.zoom.us", "api.webex.com", "meet.google.com", "teams.live.com") },
  } },
  smartfren: { label: "Smartfren", kategori: {
    opok: { label: "Opok", hosts: daftarBug(
      "static.ovo.id|cf", "web.web.whatsapp.com|sni", "api.ovo.id",
      "cuplikan.freshchat.com|cf", "onelinksmartscript.appsflyer.com|cf",
      "www.northlink.co.za", "104.21.52.82") },
    nonton: { label: "Nonton", hosts: daftarBug("s.ytimg.com") },
  } },
  // Tri (3) — dari bahan grup §9.2 Opok ("MODE BOLAK BALIK") + kiriman Asep
  // 21 Nov 2026: opok (bimatri, three, static.ovo.id, baidu.com, IP) dan
  // sosmed (TikTok: api24-normal, apac-marketing, IP). Payload opok =
  // template SSH+payload; payload sosmed = template Direct (bug TikTok).
  tri: { label: "Tri (3)", kategori: {
    opok: { label: "Opok", hosts: daftarBug(
      "bimatri.ioh.co.id", "three.co.uk", "static.ovo.id|cf", "baidu.com",
      "104.117.252.101", "23.73.192.165", "104.18.6.170", "104.21.22.52") },
    sosmed: { label: "Sosmed", hosts: daftarBug(
      "api24-normal.tiktokv.com", "apac-marketing.tiktok.com", "162.159.141.236") },
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
  // Entri berupa IP tetap ditampilkan seperti host biasa.
  const hosts = kat.hosts;
  const judul = "🐛 <b>Bug " + op.label + " — " + kat.label + "</b> (" + hosts.length + " host)\n\n";
  const baris = hosts.map((e) => "• <code>" + e.h + "</code>" + (e.n ? " (" + e.n + ")" : ""));
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
  const rows = semua.map((k) => ([{ text: labelKategori(opKey, k), callback_data: "bug:kat:" + opKey + ":" + k }]));
  rows.push([{ text: "⬅️ Ganti operator", callback_data: "bug:back" }]);
  rows.push(...TOMBOL_KEMBALI);
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
const OPERATOR_ADMIN = { xl: "XL", axis: "Axis", telkomsel: "Telkomsel", indosat: "Indosat", smartfren: "Smartfren", tri: "Tri (3)" };
const URUTAN_KATEGORI = ["edu", "opok", "wa", "game", "sosmed", "musik", "nonton", "conference"];

export function normalisasiOperator(op) {
  const k = String(op || "").toLowerCase();
  return OPERATOR_ADMIN[k] ? k : null;
}

export function normalisasiKategori(kat) {
  const k = String(kat || "").toLowerCase();
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

// Status admin: "ya" | "bukan" | "belum" (ADMIN_CHAT_ID tidak diset).
function cekAdmin(env, chatId) {
  if (!env.ADMIN_CHAT_ID) return "belum";
  return String(chatId) === String(env.ADMIN_CHAT_ID) ? "ya" : "bukan";
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

// Cari bug di KV dulu, lalu database bawaan. Return seperti cariBug().
export async function cariBugGabungan(env, host) {
  const h = String(host || "").toLowerCase();
  if (!h) return null;
  const kv = await ambilBugsKv(env);
  for (const [opKey, kats] of Object.entries(kv)) {
    for (const [katKey, arr] of Object.entries(kats || {})) {
      for (const e of arr || []) {
        if (String(e.host || "").toLowerCase() === h) {
          return { operator: opKey, operatorLabel: labelOperator(opKey), kategori: katKey, kategoriLabel: labelKategori(opKey, katKey), note: e.catatan || "" };
        }
      }
    }
  }
  return cariBug(host);
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
  const baru = (e) => e.ts && Date.now() - e.ts < 7 * 86400 * 1000;
  const barisKv = kvList.map((e) =>
    "• <code>" + escapeHtml(e.host) + "</code>" +
    (e.catatan ? " (" + escapeHtml(e.catatan) + ")" : "") +
    (baru(e) ? " 🆕" : ""));
  const barisBawaan = kat
    ? kat.hosts.filter((e) => !ada.has(e.h.toLowerCase())).map((e) =>
      "• <code>" + e.h + "</code>" + (e.n ? " (" + e.n + ")" : ""))
    : [];
  const semua = [...barisKv, ...barisBawaan];
  const judul = "🐛 <b>Bug " + (op?.label || labelOperator(opKey)) + " — " + (kat?.label || labelKategori(opKey, katKey)) + "</b> (" + semua.length + " host)\n\n";
  const pesan = [];
  for (let i = 0; i < semua.length; i += 30) {
    const akhir = i + 30 >= semua.length;
    pesan.push((i === 0 ? judul : "") + semua.slice(i, i + 30).join("\n") +
      (akhir ? "\n\n⚠️ Bug bisa mati sewaktu-waktu — coba satu-satu ya." : ""));
  }
  return pesan;
}

// ---- Config contoh admin (KV key CONFIGS, array maks 20, terbaru dulu) ----
async function ambilConfigsKv(env) {
  const d = await kvGet(env, "CONFIGS");
  return Array.isArray(d) ? d : [];
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
  const adminId = env.ADMIN_CHAT_ID ? String(env.ADMIN_CHAT_ID) : null;
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
  if (!hasil.adaInject) {
    return "\n\n💡 Belum ada bug/SNI — kalau butuh, ketik /bug buat lihat daftar bug host.";
  }
  return "";
}

// Ringkasan terformat dari satu TunnelConfig untuk caption hasil generate
// (pola @XHMTunBot — pengguna bisa memverifikasi isi config sebelum impor).
// TIDAK menampilkan password, UUID, atau kredensial lain.
export function ringkasanConfig(c) {
  if (!c || typeof c !== "object") return "";
  const sub = c.sshTunnelConfig || c.vmessTunnelConfig || c.vlessTunnelConfig || c.trojanTunnelConfig || c.shadowsocksTunnelConfig;
  const ssh = sub?.sshConfig;
  const v2 = sub?.v2rayConfig;
  const host = ssh?.host || v2?.host || "";
  const port = ssh?.port || v2?.port || "";
  const inj = sub?.injectConfig;
  const baris = ["📋 <b>Rincian Config</b>"];
  baris.push("• Protokol: <b>" + escapeHtml(c.type || "-") + "</b>");
  if (host) baris.push("• Server: <code>" + escapeHtml(host) + "</code>" + (port ? ":<code>" + escapeHtml(String(port)) + "</code>" : ""));
  if (ssh?.username) baris.push("• Username: <code>" + escapeHtml(ssh.username) + "</code>");
  const sni = inj?.serverNameIndication || v2?.serverNameIndication || "";
  if (sni) baris.push("• SNI/Bug: <code>" + escapeHtml(sni) + "</code>");
  baris.push("• Inject: " + (inj ? "✅ ON (" + escapeHtml(inj.mode || "DIRECT_SNI") + ")" : "❌ OFF"));
  if (v2) {
    const trans = v2.transportNetwork ? String(v2.transportNetwork) : "";
    const tls = v2.tls === true ? "Aktif" : v2.tls === false ? "Mati" : "";
    if (trans || tls) baris.push("• Transport: " + escapeHtml(trans || "-") + (tls ? " · TLS: " + tls : ""));
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

// Pilih metode payload otomatis dari kategori bug akun (aturan dari
// bahan grup): bug kategori edu -> enhanced, opok -> direct,
// kategori lain / bug tidak dikenal -> ws (template standar aplikasi).
async function pilihMetodeOtomatis(env, teks) {
  try {
    const hasil = parsePesan(teks);
    if (!hasil.bug) return "ws";
    const info = await cariBugGabungan(env, hasil.bug);
    if (!info) return "ws";
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
const VERSI_BOT = "v2.4";

const PESAN_START =
  "👋 <b>Generator Config Dark Tunnel</b>\n\n" +
  "Kirim akun kamu apa adanya — bot akan buatkan config Dark Tunnel-nya.";

const PESAN_GRUP =
  "👋 <b>Generator Config Dark Tunnel</b>\n\n" +
  "Kirim akun SSH / VLESS / VMess / Trojan / Shadowsocks kamu, bot buatkan config Dark Tunnel-nya.\n\n" +
  "⚠️ Jangan kirim akun di grup — akun kamu bisa dilihat semua anggota. Order lewat chat pribadi bot ini ya.";

const CARA_IMPOR =
  "📥 <b>Cara impor ke Dark Tunnel:</b>\n" +
  "1. Unduh file <code>.dark</code> di atas.\n" +
  "2. Klik config di atas, buka dengan aplikasi Dark Tunnel.\n" +
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
const JENIS_CONFIG_FILE = ["SSH", "VMESS", "VLESS", "TROJAN", "SHADOWSOCKS", "SSH_DNSTT", "OPENVPN"];
export function namaFileDark(namaConfig, type) {
  let s = String(namaConfig || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  if (!s) s = "config";
  let prefix = "";
  const t = String(type || "").toUpperCase();
  if (JENIS_CONFIG_FILE.includes(t)) {
    const tl = t.toLowerCase();
    if (!s.startsWith(tl + "-") && s !== tl) prefix = tl + "-";
  }
  return prefix + s + " by @autosetdark_bot.dark";
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

// Cek satu domain: HEAD dulu, fallback GET, timeout 8 detik per upaya.
// Ditambah: resolve IP (A), reverse DNS bila input IP (PTR), dan cek
// subdomain umum. Return {domain, ok, status, ms, cdn, server, ips,
// hostname, subdomains} — subdomains = null bila DNS gagal total.
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
  if (res) {
    const h = res.headers;
    const cfRay = h.get("cf-ray");
    const amzCf = h.get("x-amz-cf-id") || h.get("x-amz-cf-pop");
    const via = (h.get("via") || "").toLowerCase();
    if (cfRay) hasil.cdn = "Cloudflare";
    else if (amzCf || via.includes("cloudfront")) hasil.cdn = "CloudFront";
    hasil.server = h.get("server") || "";
  }
  // DNS: resolve IP / reverse / subdomain — gagal dengan anggun
  // (bagian yang gagal dihilangkan saja, bukan error mentah).
  let dnsOk = false;
  if (isIP(domain)) {
    const parts = domain.split(".");
    if (parts.length === 4) {
      const ptr = await dohQuery(parts.reverse().join(".") + ".in-addr.arpa", "PTR");
      if (ptr) {
        dnsOk = true;
        const nama = (ptr.Answer || []).find((a) => a && a.type === 12 && typeof a.data === "string");
        if (nama) hasil.hostname = String(nama.data).replace(/\.+$/, "");
      }
    }
  } else {
    const a = await dohQuery(domain, "A");
    if (a) { dnsOk = true; hasil.ips = ipsDariDoh(a).slice(0, 3); }
    const cekSub = await Promise.all(SUBDOMAIN_CEK.map(async (sub) => {
      const j = await dohQuery(sub + "." + domain, "A");
      if (j) dnsOk = true;
      const ips = ipsDariDoh(j);
      return ips.length ? { nama: sub + "." + domain, ip: ips[0] } : null;
    }));
    if (dnsOk) hasil.subdomains = cekSub.filter(Boolean);
  }
  return hasil;
}

export function formatHasilCek(r) {
  const barisIp = (r.ips && r.ips.length)
    ? "\n🌐 IP: " + r.ips.map((ip) => escapeHtml(ip)).join(", ") : "";
  const barisHost = r.hostname
    ? "\n🔁 Hostname: <code>" + escapeHtml(r.hostname) + "</code>" : "";
  const barisSub = r.subdomains
    ? (r.subdomains.length
      ? "\n🔎 Subdomain yang ditemukan: " + r.subdomains.map((s) => escapeHtml(s.nama) + " (" + escapeHtml(s.ip) + ")").join(", ")
      : "\n🔎 Subdomain: tidak ditemukan")
    : "";
  if (!r.ok) {
    return "🌐 <b>" + escapeHtml(r.domain) + "</b>\n\n" +
      "❌ Domain tidak merespons — tidak ditemukan atau tidak bisa dijangkau.\n" +
      "Coba cek lagi ejaannya, atau coba lagi nanti ya." +
      barisIp + barisHost + barisSub;
  }
  let teks = "🌐 <b>" + escapeHtml(r.domain) + "</b>\n\n" +
    "✅ Merespons — HTTP " + r.status + " (" + r.ms + " ms)";
  if (r.status >= 400) teks += "\n⚠️ Domain merespons, tapi mengembalikan status " + r.status + " (akses dibatasi / halaman tidak ada).";
  teks += barisIp + barisHost + barisSub;
  if (r.cdn) teks += "\n📡 CDN: " + r.cdn;
  if (r.server) teks += "\n🖥️ Server: " + escapeHtml(r.server);
  return teks;
}

function keyboardStart(isAdmin) {
  const kb = [
    [{ text: "⚡ Buat Config", callback_data: "buat:config" }],
    [{ text: "🔍 Cari Bug", callback_data: "bug:menu" }, { text: "🌐 Cek Domain", callback_data: "cek:mulai" }],
    [{ text: "dark tunnel", url: "https://sfile.co/H26JBeTBi1o" }, { text: "🆕 Update Terbaru", callback_data: "update:lihat" }],
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
// (dipakai di pesan terakhir daftar bug).
function keyboardKembaliBug(opKey) {
  return [
    [{ text: "⬅️ Kembali", callback_data: "bug:op:" + opKey }],
    ...TOMBOL_KEMBALI,
  ];
}

// Pilihan jenis config di tombol "⚡ Buat Config": 5 jenis (2 per
// baris, kecuali yang terakhir), lalu Otomatis, lalu Kembali.
function keyboardPilihJenis() {
  return [
    [{ text: "SSH", callback_data: "pilih:SSH" }, { text: "VLESS", callback_data: "pilih:VLESS" }],
    [{ text: "VMess", callback_data: "pilih:VMESS" }, { text: "Trojan", callback_data: "pilih:TROJAN" }],
    [{ text: "Shadowsocks", callback_data: "pilih:SHADOWSOCKS" }],
    [{ text: "🔄 Otomatis (deteksi sendiri)", callback_data: "pilih:AUTO" }],
    ...TOMBOL_KEMBALI,
  ];
}

// Panel admin (tombol "⚙️ Admin" di menu utama).
function keyboardAdmin() {
  return [
    [{ text: "➕ Tambah Bug", callback_data: "admin:tambahbug" }, { text: "➕ Tambah Config", callback_data: "admin:tambahconfig" }],
    [{ text: "📢 Broadcast", callback_data: "admin:broadcast" }, { text: "📊 Status", callback_data: "admin:status" }],
    ...TOMBOL_KEMBALI,
  ];
}

const TEKS_PANEL_ADMIN = "⚙️ <b>Menu Admin</b>\n\nPilih yang mau dilakukan:";

// Tombol "▶️ Start" bawah (reply keyboard Telegram, TIDAK permanen —
// pengguna bisa menyembunyikannya lewat ikon keyboard; /start akan
// memunculkannya lagi). Sekali muncul, pengguna cukup ketuk Start di
// bawah — tanpa ketik /start dan tanpa tombol Menu ☰ (daftar perintah
// BotFather sengaja dikosongkan). Satu pesan hanya boleh punya SATU
// reply_markup, jadi tombol bawah ini dikirim lewat pesan terpisah,
// bukan bersama inline_keyboard menu utama.
const KEYBOARD_START = { keyboard: [[{ text: "▶️ Start" }]], resize_keyboard: true };

// Kirim pesan dengan reply keyboard "▶️ Start" (tanpa inline keyboard).
async function sendKeyboardBawah(env, chatId, text) {
  return await telegramApi(env, "sendMessage", {
    chat_id: chatId,
    text: String(text),
    parse_mode: "HTML",
    reply_markup: KEYBOARD_START,
  });
}

// Menu utama: PESAN_START + keyboard inline, lalu kirim pesan tombol
// bawah "▶️ Start" setiap kali (tanpa pelacakan KV — supaya tombol yang
// disembunyikan pengguna bisa dimunculkan lagi lewat /start). Isi pesan
// pembawa keyboard hanya "▶️" (Telegram butuh teks pada pesan).
async function tampilkanMenuUtama(env, chatId) {
  await sendTelegram(env, chatId, PESAN_START, keyboardStart(cekAdmin(env, chatId) === "ya"));
  await sendKeyboardBawah(env, chatId, "▶️");
}

// ================= HANDLER TELEGRAM =================

// Pilihan metode payload yang sedang menunggu (per chat, sementara di
// memori saja — bukan KV, tidak persisten). Isi: {teks, ts}.
const pendingMetode = new Map();

// Akun yang sedang ditunggu untuk /tambahconfig (per chat admin,
// sementara di memori saja). Isi: {op, kat, nama, ts}.
const pendingConfig = new Map();

// Pilihan jenis config yang sedang menunggu (per chat, sementara di
// memori saja — bukan KV). Isi: {type, ts}. Dipakai alur "⚡ Buat
// Config": pengguna memilih jenis dulu, baru kirim akun.
const pendingPilih = new Map();

// Ambil pilihan yang masih berlaku (kedaluwarsa 15 menit) atau null.
function ambilPilihan(chatId) {
  const p = pendingPilih.get(chatId);
  if (!p) return null;
  if (Date.now() - p.ts > 15 * 60 * 1000) { pendingPilih.delete(chatId); return null; }
  return p.type;
}

// State admin tertunda dari tombol panel admin (per chat admin,
// sementara di memori saja). Isi: {jenis: "bug"|"config"|"broadcast",
// tahap: "nama" (untuk config), ts}.
const pendingAdmin = new Map();

async function handlePesanAkun(env, chatId, teks, opts = {}) {
  let hasil;
  try {
    hasil = parsePesan(teks, opts);
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
      "Ketik /start untuk lihat panduan lengkap.");
    return;
  }

  // Pilihan jenis config (tombol "⚡ Buat Config"): jenis hasil parsing
  // harus SAMA dengan pilihan. Bila tidak sama, JANGAN generate — beri
  // tahu pengguna dan PERTAHANKAN pilihan (dia bisa kirim akun yang
  // benar). Tanpa pilihan (tempel akun langsung) = deteksi otomatis.
  const pilihan = ambilPilihan(chatId);
  if (pilihan && pilihan !== "AUTO") {
    const salah = [...new Set(hasil.configs.map((c) => c.type))].filter((t) => t !== pilihan);
    if (salah.length) {
      await sendTelegram(env, chatId,
        "⚠️ Belum bisa buat config <b>" + pilihan + "</b> dari akun <b>" + escapeHtml(salah.join(", ")) + "</b> yang kamu kirim. Kirim akun <b>" + pilihan + "</b>, atau ketuk Kembali lalu pilih jenis lain.", TOMBOL_KEMBALI);
      return;
    }
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
  // File terkirim — pilihan jenis config selesai dipakai.
  pendingPilih.delete(chatId);
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
      "😕 Operator tidak dikenal. Pakai salah satu: <b>xl, axis, telkomsel, indosat, smartfren, tri</b>.\n\n" +
      "Format: <code>/tambahbug &lt;operator&gt; &lt;kategori&gt; &lt;host&gt; [catatan]</code>\n" +
      "Contoh: <code>/tambahbug telkomsel opok tdwcontent.telkomsel.com</code>");
    return;
  }
  const kat = normalisasiKategori(katRaw);
  if (!kat) {
    await sendTelegram(env, chatId,
      "😕 Kategori tidak dikenal. Pakai salah satu: <b>edu, opok, wa, game, sosmed, musik, nonton, conference</b>.");
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
  try { hasil = parsePesan(teks); } catch { hasil = { configs: [], kurangSsh: [], adaSsh: false }; }
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

// Pesan teks admin saat ada state tertunda dari tombol panel admin.
// Return true bila pesan ditangani di sini (router tidak lanjut ke
// handlePesanAkun). State kedaluwarsa (>15 menit) diabaikan.
async function handleAdminTertunda(env, chatId, teks) {
  const st = pendingAdmin.get(chatId);
  if (!st) return false;
  if (Date.now() - st.ts > 15 * 60 * 1000) { pendingAdmin.delete(chatId); return false; }
  if (st.jenis === "bug") {
    const bagian = teks.split("|").map((s) => s.trim());
    const [opRaw, katRaw, hostRaw, ...catatanParts] = bagian;
    const op = normalisasiOperator(opRaw);
    if (!op) {
      await sendTelegram(env, chatId, "😕 Operator tidak dikenal. Pakai salah satu: <b>xl, axis, telkomsel, indosat, smartfren, tri</b>.");
      return true;
    }
    const kat = normalisasiKategori(katRaw);
    if (!kat) {
      await sendTelegram(env, chatId, "😕 Kategori tidak dikenal. Pakai salah satu: <b>edu, opok, wa, game, sosmed, musik, nonton, conference</b>.");
      return true;
    }
    if (!hostRaw || !validBugHost(hostRaw)) {
      await sendTelegram(env, chatId, "😕 Host tidak valid. Isi host yang benar, mis. <code>edu.ruangguru.com</code>.");
      return true;
    }
    const host = hostRaw.toLowerCase();
    if (!env.DATA) {
      await sendTelegram(env, chatId, "⚠️ Fitur admin belum aktif — KV belum dipasang di Worker.");
      return true;
    }
    const catatan = catatanParts.join(" | ").trim();
    const hasil = await simpanBug(env, op, kat, host, catatan);
    if (!hasil) {
      await sendTelegram(env, chatId, "⚠️ Gagal menyimpan bug — coba lagi nanti ya.");
      return true;
    }
    pendingAdmin.delete(chatId);
    await sendTelegram(env, chatId, "✅ Bug " + hasil.aksi + ": <code>" + escapeHtml(host) + "</code> (" + labelOperator(op) + " — " + labelKategori(op, kat) + ").");
    await sendTelegram(env, chatId, "📣 Update terkirim ke " + hasil.terkirim + " pengguna.");
    return true;
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
        "Operator: xl, telkomsel, indosat, smartfren, tri. Kategori: edu, opok, wa, game, sosmed, musik, nonton, conference.\n" +
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
  const bawaan = hitungBugBawaan();
  const baris = ["📊 <b>Status Bot</b>", "", "• Versi: <b>" + VERSI_BOT + "</b>"];
  if (env.DATA) {
    const pengguna = (await kvList(env, "USER:")).length;
    const tambahan = await hitungBugKv(env);
    const configs = await ambilConfigsKv(env);
    const updates = await ambilUpdatesKv(env);
    baris.push("• Pengguna tercatat: <b>" + pengguna + "</b>");
    baris.push("• Bug host: <b>" + (bawaan + tambahan) + "</b> (" + bawaan + " bawaan + " + tambahan + " tambahan)");
    baris.push("• Config contoh: <b>" + configs.length + "</b>");
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

// ---- /config: daftar config contoh ----
async function handleConfig(env, chatId) {
  const arr = await ambilConfigsKv(env);
  if (!arr.length) {
    await sendTelegram(env, chatId, "📋 <b>Config Contoh</b>\n\nBelum ada config contoh.", TOMBOL_KEMBALI);
    return;
  }
  const daftar = arr.slice(0, 10);
  const teks = "📋 <b>Config Contoh</b>\n\n" +
    daftar.map((e, i) => (i + 1) + ". <b>" + escapeHtml(e.nama) + "</b> (" + labelOperator(e.operator) + " — " + labelKategori(e.operator, e.kategori) + ") — " + e.tanggal).join("\n") +
    "\n\nKetuk satu config buat ambil file-nya.";
  const keyboard = daftar.map((e) => ([{ text: String(e.nama).slice(0, 40), callback_data: "cfg:" + e.id }]));
  keyboard.push(...TOMBOL_KEMBALI);
  await sendTelegram(env, chatId, teks, keyboard);
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
    // Tombol di grup diarahkan ke DM.
    if (diGrupCb) {
      const namaBot = env.BOT_USERNAME ? "@" + env.BOT_USERNAME : "bot ini";
      await jawabAlert(env, cb.id, "Kirim akun lewat chat pribadi ya — buka " + namaBot + ", biar akun kamu nggak kelihatan orang lain.");
      return;
    }
    if (!chatIdCb) { await jawabCallback(env, cb.id); return; }
    // Ketuk tombol menu apa pun membatalkan pilihan jenis config yang
    // tertunda — kecuali memilih metode payload (pilihan harus tetap
    // hidup sampai file config terkirim).
    if (!data.startsWith("metode:")) pendingPilih.delete(chatIdCb);
    // Tombol "⬅️ Kembali ke Menu" — edit pesan ini jadi menu utama.
    if (data === "menu:utama") {
      await jawabCallback(env, cb.id);
      try {
        await editTelegram(env, chatIdCb, cb.message.message_id, PESAN_START, keyboardStart(cekAdmin(env, chatIdCb) === "ya"));
      } catch {
        await sendTelegram(env, chatIdCb, PESAN_START, keyboardStart(cekAdmin(env, chatIdCb) === "ya"));
      }
      return;
    }
    // Tombol "⚡ Buat Config" di /start — pilih dulu jenis config.
    if (data === "buat:config") {
      await jawabCallback(env, cb.id);
      await sendTelegram(env, chatIdCb, "⚡ <b>Buat Config</b>\n\nPilih jenis config yang mau dibuat:", keyboardPilihJenis());
      return;
    }
    // Pilih jenis config — simpan pilihan, lalu minta akunnya.
    if (data.startsWith("pilih:")) {
      const type = data.slice("pilih:".length);
      const label = { SSH: "SSH", VLESS: "VLESS", VMESS: "VMess", TROJAN: "Trojan", SHADOWSOCKS: "Shadowsocks" }[type];
      if (!label && type !== "AUTO") { await jawabCallback(env, cb.id); return; }
      pendingPilih.set(chatIdCb, { type, ts: Date.now() });
      await jawabCallback(env, cb.id);
      const prompt = type === "AUTO"
        ? "Kirim akun kamu — bot deteksi jenisnya otomatis."
        : "Kirim akun " + label + " kamu — link atau teks, bebas format apa pun.";
      await sendTelegram(env, chatIdCb, prompt, TOMBOL_KEMBALI);
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
    if (data === "admin:panel") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      await sendTelegram(env, chatIdCb, TEKS_PANEL_ADMIN, keyboardAdmin());
      return;
    }
    if (data === "admin:tambahbug") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      pendingAdmin.set(chatIdCb, { jenis: "bug", ts: Date.now() });
      await sendTelegram(env, chatIdCb, "➕ <b>Tambah Bug</b>\n\nKirim bug dengan format:\n<code>operator | kategori | host | catatan</code>\n\nCatatan boleh kosong. Contoh: <code>telkomsel | opok | bug.contoh.com | opok tsel</code>", [[{ text: "❌ Batal", callback_data: "admin:batal" }]]);
      return;
    }
    if (data === "admin:tambahconfig") {
      if (cekAdmin(env, chatIdCb) !== "ya") { await jawabAlert(env, cb.id, "⛔ Perintah ini khusus admin."); return; }
      await jawabCallback(env, cb.id);
      pendingAdmin.set(chatIdCb, { jenis: "config", tahap: "nama", ts: Date.now() });
      await sendTelegram(env, chatIdCb, "➕ <b>Tambah Config</b>\n\nKirim dengan format:\n<code>operator | kategori | nama</code>\n\nContoh: <code>telkomsel | opok | Opok Tsel 1</code>", [[{ text: "❌ Batal", callback_data: "admin:batal" }]]);
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
      try {
        await editTelegram(env, chatIdCb, cb.message.message_id, TEKS_PANEL_ADMIN, keyboardAdmin());
      } catch {
        await sendTelegram(env, chatIdCb, TEKS_PANEL_ADMIN, keyboardAdmin());
      }
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
      await editTelegram(env, chatIdCb, cb.message.message_id,
        "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
      return;
    }
    if (data.startsWith("bug:op:")) {
      const opKey = data.slice("bug:op:".length);
      const op = BUG_DB[opKey];
      if (!op) { await jawabCallback(env, cb.id); return; }
      await jawabCallback(env, cb.id);
      const kv = await ambilBugsKv(env);
      await editTelegram(env, chatIdCb, cb.message.message_id,
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
        await sendTelegram(env, chatIdCb, daftar[i], i === daftar.length - 1 ? keyboardKembaliBug(parts[0]) : undefined);
      }
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

  // Perintah apa pun (atau ketuk "▶️ Start") membatalkan pilihan jenis
  // config & state admin yang tertunda — pengguna pindah alur.
  if (teks.startsWith("/") || teks === "▶️ Start") {
    pendingAdmin.delete(chatId);
    pendingPilih.delete(chatId);
  }

  if (teks === "/start" || teks === "/menu" || teks === "/help" || teks === "▶️ Start" ||
      teks.startsWith("/start ") || teks.startsWith("/start@") ||
      teks.startsWith("/menu ") || teks.startsWith("/menu@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await tampilkanMenuUtama(env, chatId);
    return;
  }
  if (teks === "/bug" || teks.startsWith("/bug ") || teks.startsWith("/bug@")) {
    pendingCek.delete(chatId);
    pendingConfig.delete(chatId);
    await sendTelegram(env, chatId,
      "🐛 <b>Daftar Bug Host</b>\n\nPilih operator dulu:", keyboardOperatorBug());
    return;
  }
  if (teks === "/cek" || teks.startsWith("/cek ") || teks.startsWith("/cek@")) {
    pendingConfig.delete(chatId);
    pendingCek.set(chatId, { ts: Date.now() });
    await sendTelegram(env, chatId, "🌐 <b>Cek Domain</b>\n\nKirim domain yang mau dicek — mis. <code>edu.ruangguru.com</code>.", TOMBOL_KEMBALI);
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
        "Operator: xl, telkomsel, indosat, smartfren, tri. Kategori: edu, opok, wa, game, sosmed, musik, nonton, conference.\n" +
        "Contoh: <code>/tambahconfig telkomsel opok Opok Tsel 1</code>\n" +
        "Setelah itu kirim akunnya.");
      return;
    }
    pendingConfig.set(chatId, { op, kat, nama, ts: Date.now() });
    await sendTelegram(env, chatId, "📋 Config <b>" + escapeHtml(nama) + "</b> (" + labelOperator(op) + " — " + labelKategori(op, kat) + ").\n\nKirim akunnya (SSH/Xray, bebas format) — bot akan simpan sebagai config contoh.");
    return;
  }
  if (teks.startsWith("/")) { pendingCek.delete(chatId); pendingConfig.delete(chatId); return; } // perintah tak dikenal diabaikan diam-diam

  // State admin tertunda (tombol panel admin): dicek sebelum
  // handlePesanAkun, hanya untuk admin. Perintah sudah ditangani di
  // atas (state dihapus); state kedaluwarsa diabaikan di dalam handler.
  if (cekAdmin(env, chatId) === "ya" && pendingAdmin.has(chatId)) {
    if (await handleAdminTertunda(env, chatId, teks)) return;
  }

  // Akun yang ditunggu untuk /tambahconfig (admin).
  if (pendingConfig.has(chatId)) {
    await handleTambahConfigAkun(env, chatId, teks);
    return;
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
};
