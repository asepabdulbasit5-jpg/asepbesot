// ============================================================
// Bot Telegram jualan VPN (reseller) — SANDEKALA VPN
// Kerangka siap pakai di Cloudflare Workers (gratis, tanpa server)
// ------------------------------------------------------------
// STATUS 19 Nov 2026: DISAMBUNG KE NADIA VPN STORE.
//   Web: https://www.nadiavpn.web.id
//   API v2.0 Enterprise — dari screenshot dashboard Asep:
//     GET  /api/v1/user/balance
//     GET  /api/v1/servers
//     POST /api/v1/vpn/order
//          body: {server_id, protocol, type, duration, username}
//          protocol: vmess | vless | trojan | ssh | zivpn
//          type: day | week | month
//   Auth: Authorization: Bearer <token sk_live_...>
//   Token dibuat di dashboard Nadia: API Reseller > Label
//   "SANDEKALA-BOT" > GENERATE TOKEN. Token JANGAN ditulis di
//   file ini — taruh di Secrets Worker (RESELLER_API_KEY).
//   ENDPOINT LAIN (dari screenshot Asep, 19 Nov 2026, 16:07-16:09):
//     POST /api/v1/vpn/trial           {server_id, protocol}
//          Trial gratis 30 menit, kuota 1 GB, limit 1 IP, zivpn
//          tidak didukung, username/password auto. Syarat: saldo
//          minimal Rp15.000 (tidak dipotong). Saldo Asep saat itu
//          Rp14.691 — di bawah syarat, trial bisa gagal sampai
//          topup dulu.
//     POST /api/v1/vpn/renew           {account_id, type, duration}
//          Perpanjang, memotong saldo.
//     POST /api/v1/vpn/migrate         {account_id, new_server_id}
//          Pindah server, sisa masa aktif pindah, config tidak
//          berubah kecuali IP/Bug. Memotong biaya migrasi jika ada
//          (di katalog: migration_price 0).
//     POST /api/v1/vpn/change-protocol {account_id, target_protocol}
//          Ganti protokol, GRATIS. Aturan Nadia: SSH -> lain pakai
//          username SSH saja; lain -> SSH username tetap dan
//          ssh_password wajib diisi; username tidak boleh pernah
//          dipakai di protokol tujuan (termasuk akun expired).
//     GET  /api/v1/vpn/accounts        (daftar semua akun)
//     POST /api/v1/vpn/account/details {account_id}
//   PERBAIKI & HAPUS: tidak ada endpoint API-nya di screenshot
//   yang dikirim Asep. Di bot, Perbaiki = ambil detail terbaru
//   dari Nadia lalu kirim ulang config. Hapus = hapus akun dari
//   daftar bot + info bahwa penghapusan di server Nadia harus
//   lewat dashboard Layanan Aktif (tidak ada endpoint hapus API).
//
// YANG MASIH DIBUTUHKAN DARI ASEP:
//   1. SERVER_ID Nadia — SUDAH BERES 19 Nov 2026: 5 server sudah
//      ditulis langsung di daftar SERVERS di bawah (pembeli pilih
//      sendiri). Secret NADIA_SERVER_ID tinggal jadi cadangan untuk
//      order lama (sebelum ada pilihan server).
//      REKOMENDASI 19 Nov 2026 (katalog 24 server, harga sama
//      semua: Rp267/hari, Rp1.869/minggu, Rp6.000/bulan):
//        CLOUDFRONT NEOLITE PRO (ID, sisa 211/300, semua protokol,
//        CloudFront d18hybc8il36ui.cloudfront.net)
//        NADIA_SERVER_ID = 01a1ca6a-b60e-73b9-a2fa-8684c0b25d62
//      Cadangan: CLOUDFRONT (ATI) = 01a133f2-e422-73e9-bc1d-3d3621d704c6
//      Detail lengkap: files/nadia-servers-2026-11-19.md
//   2. Harga modal per akun (dari katalog server) — supaya harga
//      jual di PAKET di bawah bisa disesuaikan, jangan sampai
//      jual di bawah modal.
//   3. Pilihan otomatisasi: MacroDroid (disarankan, gratis, QRIS
//      DANA Bisnis kamu sudah ada) atau manual (/konfirmasi).
//
// CARA PAKAI (semua dari HP):
// 1. Buat bot di @BotFather, simpan tokennya.
// 2. Di dash.cloudflare.com > Workers & Pages > buat Worker baru,
//    paste SELURUH file ini, lalu Deploy.
// 3. Di halaman Worker > Settings > Variables and Secrets, tambah:
//      BOT_TOKEN        (Secret) = token dari @BotFather
//      ADMIN_CHAT_ID    (Text)   = ID Telegram kamu (dari @userinfobot)
//      PAY_SECRET       (Secret) = string acak panjang (bebas, mis.
//                                  hasil ketik acak 20 karakter)
//      RESELLER_API_URL (Text)   = https://www.nadiavpn.web.id/api/v1
//      RESELLER_API_KEY (Secret) = token Nadia (sk_live_...)
//      NADIA_SERVER_ID  (Text)   = SERVER_ID dari katalog Nadia
//                                  (GET /api/v1/servers)
//      NADIA_PROTOCOL   (Text, opsional) = vless (default) / vmess /
//                                  trojan / ssh / zivpn
//      QRIS_IMAGE_URL   (Text, opsional tapi penting) = link langsung
//                                  (Direct Link) gambar QRIS DANA Bisnis
//                                  kamu — upload dulu dari HP ke
//                                  postimages.org / imgbb, copy Direct
//                                  Link-nya. Tanpa ini bot TIDAK bisa
//                                  menampilkan gambar QR ke pembeli
//                                  (cek 19 Nov 2026: bot cuma kirim teks
//                                  "scan QRIS" tanpa gambar).
//    Lalu di Settings > Bindings, tambah KV namespace:
//      ORDERS = namespace KV baru (buat di Storage > KV dulu)
// 4. Save, lalu Redeploy.
// 5. Sambungkan webhook — buka di browser (ganti yang huruf besar):
//    https://api.telegram.org/botTOKEN_BOT/setWebhook?url=https://NAMA-WORKER.NAMA-AKUN.workers.dev
//    URL lengkapnya ada di tombol Visit / tab Overview Worker — JANGAN
//    pakai bentuk pendek https://NAMA-WORKER.workers.dev (itu 404,
//    kejadian 19 Nov 2026). Kalau balasannya {"ok":true,...} berarti tersambung.
// 6. MacroDroid (kalau pilih otomatis) — resep lengkap sudah ada di:
//    workspace/goals/cloudflare-workers-vless-proxy/files/draft-qris-otomatis.md
//    Intinya: notifikasi DANA masuk -> POST ke
//    https://NAMA-WORKER.workers.dev/pay-callback
//    dengan header X-Pay-Secret yang SAMA dengan PAY_SECRET di atas.
// 7. Tes dulu dengan topup reseller PALING KECIL: beli 1 akun lewat
//    bot, cek akunnya jalan + masa aktifnya sesuai, baru topup gede.
//    Saldo reseller biasanya TIDAK bisa ditarik lagi.
// ------------------------------------------------------------
// PENTING: jangan tulis token / API key langsung di kode ini.
// Taruh di Variables/Secrets dashboard seperti langkah 3.
// ============================================================

// ---- HARGA JUAL (harga final Asep, 19 Nov 2026) ----
// Harian sempat dihapus 19 Nov 2026, diaktifkan lagi malam harinya
// (untung bersih Rp533/akun setelah fee). Bulanan dijual Rp10.000:
//   1 hari:  modal Rp267   -> jual Rp1.000  (untung Rp733, bersih Rp533)
//   7 hari:  modal Rp1.869 -> jual Rp5.000  (untung Rp3.131)
//   30 hari: modal Rp6.000 -> jual Rp10.000 (untung Rp4.000)
// (Belum dikurangi fee order Nadia Rp200/order, kecuali harian di atas.)
// Nominal unik 10-99 ditambahkan otomatis supaya nominal tiap
// order beda (mis. 10.000 jadi 10.042).
// Pemetaan ke Nadia: 1 hari = type "day", duration 1.
//                    7 hari = type "week", duration 1.
//                    30 hari = type "month", duration 1.
const PAKET = [
  { kode: "1hari",  nama: "VPN 1 hari",  harga: 1000,  durasiHari: 1,  nadiaType: "day",   nadiaDuration: 1 },
  { kode: "7hari",  nama: "VPN 7 hari",  harga: 5000,  durasiHari: 7,  nadiaType: "week",  nadiaDuration: 1 },
  { kode: "30hari", nama: "VPN 30 hari", harga: 10000, durasiHari: 30, nadiaType: "month", nadiaDuration: 1 },
];

// Server yang bisa dipilih pembeli — SEMUA 24 server Nadia
// (19 Nov 2026, atas permintaan Asep). Data dari katalog
// GET /api/v1/servers 19 Nov 2026 (harga sama semua:
// Rp267/hari, Rp1.869/minggu, Rp6.000/bulan).
// Catatan: 4 server ditandai PENUH (kapasitas 100/100) — tetap
// ditampilkan sesuai permintaan, tapi order di sana kemungkinan
// ditolak Nadia; pembeli disarankan pilih yang lain.
// 3 server SSH SELOW hanya dukung protokol SSH — tombol protokol
// otomatis disaring per server, jadi pembeli tidak bisa salah pilih.
// Server CLOUDFRONT NUSA tidak dukung VLESS.
// Alur beli: /beli -> pilih SERVER -> pilih protokol ->
// pilih durasi -> ketik username (atau "-") -> order dibuat.
const SERVERS = [
  { kode: "slowmini",  nama: "SSH SELOW DNS & UDP MINI",      serverId: "01a1a126-b5c7-710c-953a-68e8d0ea6e98", protocols: ["ssh"], used: 162, limit: 250 },
  { kode: "slowlite",  nama: "SSH SELOW DNS & UDP LITE",      serverId: "01a1d3e1-c32a-70b6-866e-ea2c2dce9012", protocols: ["ssh"], used: 42, limit: 250 },
  { kode: "slowpro",   nama: "SSH SELOW DNS & UDP LITE PRO",  serverId: "01a1d418-8228-7366-8328-5f1cfea65311", protocols: ["ssh"], used: 76, limit: 250 },
  { kode: "cloudmat",  nama: "CLOUDMATIKA",                   serverId: "019ecafe-9826-7339-8939-8c6c03daaac5", protocols: ["ssh", "vmess", "vless", "trojan"], used: 149, limit: 155 },
  { kode: "sgcloud",   nama: "SGCLOUDHOST (SG)",              serverId: "019d416c-91ab-70cf-ae93-98251456366e", protocols: ["ssh", "vmess", "vless", "trojan"], used: 124, limit: 127 },
  { kode: "rajasa",    nama: "PT.RAJASA — PENUH",             serverId: "01a03c0a-b07a-736c-a192-a3be583503ae", protocols: ["ssh", "vmess", "vless", "trojan"], penuh: true, used: 100, limit: 100 },
  { kode: "rsa",       nama: "PT.RSA ABADI — PENUH",          serverId: "01a05b60-b5c7-71d3-a762-c6400b439b09", protocols: ["ssh", "vmess", "vless", "trojan"], penuh: true, used: 50, limit: 50 },
  { kode: "neolite",   nama: "NEO-LITE — PENUH",              serverId: "019d4b9f-7fb5-7369-8f4b-8974abd0123c", protocols: ["ssh", "vmess", "vless", "trojan"], penuh: true, used: 100, limit: 100 },
  { kode: "cloudmtk",  nama: "CLOUD-MTK",                     serverId: "019d3fd8-5c1e-734d-806e-72feec9973c5", protocols: ["ssh", "vmess", "vless", "trojan"], used: 148, limit: 150 },
  { kode: "sepadan",   nama: "PT.Sepadan Abadi",              serverId: "019d9a8a-41e9-727d-b5e7-1ea594fc04d1", protocols: ["ssh", "vmess", "vless", "trojan"], used: 97, limit: 100 },
  { kode: "biznet",    nama: "BIZNET",                        serverId: "019d3fda-3731-730b-89ad-8f171134fb93", protocols: ["ssh", "vmess", "vless", "trojan"], used: 98, limit: 100 },
  { kode: "nusaid",    nama: "NUSA ID",                       serverId: "019f173b-1a41-733e-b271-633d74e7edf3", protocols: ["ssh", "vmess", "vless", "trojan"], used: 99, limit: 100 },
  { kode: "bizid",     nama: "BIZ-ID — PENUH",                serverId: "01a19595-9428-708c-9a4f-b2a1819d714e", protocols: ["ssh", "vmess", "vless", "trojan"], penuh: true, used: 100, limit: 100 },
  { kode: "nsid",      nama: "NS-ID",                         serverId: "01a1a34d-c2f2-7387-882c-137904de7cff", protocols: ["ssh", "vmess", "vless", "trojan"], used: 59, limit: 60 },
  { kode: "neo",       nama: "CLOUDFRONT NEOLITE PRO",        serverId: "01a1ca6a-b60e-73b9-a2fa-8684c0b25d62", protocols: ["ssh", "vmess", "vless", "trojan"], used: 89, limit: 300 },
  { kode: "cfnusa",    nama: "CLOUDFRONT NUSA",               serverId: "01a1a348-d7fd-739c-916c-45c891ac2b4b", protocols: ["ssh", "vmess", "trojan"], used: 207, limit: 240 },
  { kode: "ikd",       nama: "CLOUDFRONT IKD",                serverId: "01a18b54-cbe9-712a-b8e0-bf418f203224", protocols: ["ssh", "vmess", "vless", "trojan"], used: 150, limit: 200 },
  { kode: "cfsepadan", nama: "CLOUDFRONT Sepadan Abadi",      serverId: "01a18a8a-63ad-7301-b8b9-a6d07492a952", protocols: ["ssh", "vmess", "vless", "trojan"], used: 177, limit: 200 },
  { kode: "media",     nama: "CLOUDFRONT MEDIA",              serverId: "019e15b0-f043-7170-a5c7-63719b4b8d45", protocols: ["ssh", "vmess", "vless", "trojan"], used: 170, limit: 200 },
  { kode: "idroot",    nama: "CLOUDFRONT IDROOT",             serverId: "01a151ad-af61-7007-a06b-0aeb5deea798", protocols: ["ssh", "vmess", "vless", "trojan"], used: 176, limit: 200 },
  { kode: "mitra",     nama: "CLOUDFRONT [MITRA]",            serverId: "01a16cd0-e727-70b4-822c-c96c0a502535", protocols: ["ssh", "vmess", "vless", "trojan"], used: 215, limit: 250 },
  { kode: "bizgio",    nama: "CLOUDFRONT BIZNET GIO",         serverId: "01a06443-8a9c-7254-b6f5-d59e4cfc3edd", protocols: ["ssh", "vmess", "vless", "trojan"], used: 199, limit: 200 },
  { kode: "binet",     nama: "CLOUDFRONT BINET NEO",          serverId: "01a11353-0afc-7193-8c02-08d3de1a50b8", protocols: ["ssh", "vmess", "vless", "trojan"], used: 85, limit: 200 },
  { kode: "ati",       nama: "CLOUDFRONT (ATI)",              serverId: "01a133f2-e422-73e9-bc1d-3d3621d704c6", protocols: ["ssh", "vmess", "vless", "trojan"], used: 52, limit: 250 },
];
// Alur beli sekarang: /beli (atau tombol 🛒 Beli VPN) -> pilih
// SERVER -> pilih protokol -> pilih durasi -> ketik username sendiri
// (atau "-" untuk acak) -> order dibuat. Username & password akun
// dibuatkan Nadia; pembeli tidak perlu isi password — password
// (khusus SSH) ikut terkirim bersama config dari Nadia.
const PROTOKOL = [
  { kode: "vless",  nama: "VLESS" },
  { kode: "vmess",  nama: "VMess" },
  { kode: "trojan", nama: "Trojan" },
  { kode: "ssh",    nama: "SSH" },
];
// Tombol bawah permanen (reply keyboard) — muncul terus di bawah
// kolom ketik, jadi pembeli tidak perlu ketik /start atau /beli.
// Supaya menu perintah biru juga muncul, di @BotFather jalankan
// /setcommands lalu isi:
//   start - Mulai bot SANDEKALA VPN
//   beli - Lihat paket & pesan
//   status - Cek order terakhir

// Order pending kedaluwarsa setelah 30 menit kalau belum dibayar.
const ORDER_TTL_MS = 30 * 60 * 1000;
// Order yang tidak dibayar dihapus otomatis setelah 24 jam (tenggang
// untuk bayar telat). Yang "gagal" (sudah bayar tapi akun gagal dibuat)
// TIDAK ikut dihapus — itu butuh konfirmasi ulang admin.
const ORDER_HAPUS_MS = 24 * 60 * 60 * 1000;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // ---- Callback pembayaran dari MacroDroid (baca notif DANA) ----
    // Body yang dikirim MacroDroid (lihat draft-qris-otomatis.md):
    // {"app":"dana","text":"[not_title] [not_text]","time":"[datetime]"}
    if (url.pathname === "/pay-callback" && req.method === "POST") {
      if (req.headers.get("X-Pay-Secret") !== env.PAY_SECRET)
        return new Response("no", { status: 403 });
      const { text = "" } = await req.json().catch(() => ({}));
      const bersih = String(text).replace(/\./g, "");
      // Ambil nominal: utamakan angka setelah kata "masuk/diterima/
      // terima/pembayaran/berhasil" (nominal pembayaran), bukan angka
      // pertama di teks — notif Dana kadang menyebut saldo dulu.
      // Contoh: "Saldo Rp50.000. Dana masuk Rp1.275" -> 1275, bukan 50000.
      const mKet = bersih.match(/(masuk|diterima|terima|pembayaran|berhasil)[^\d]{0,20}Rp\s?([\d]+)/i);
      const m = mKet || bersih.match(/Rp\s?([\d]+)/i);
      const amount = m ? parseInt(m[m.length - 1], 10) : 0;
      if (!amount) return new Response("ok"); // bukan notif pembayaran
      const order = await findPendingOrderByAmount(env, amount);
      if (!order) {
        // Jangan diam: kabari admin kalau ada uang masuk tapi tidak ada
        // order yang cocok (nominal salah / order kedaluwarsa). Hanya
        // untuk teks yang memang seperti pembayaran, supaya notif promo
        // Dana yang kebetulan berisi "Rp" tidak jadi spam.
        if (/masuk|diterima|terima|pembayaran|berhasil/i.test(String(text)) && env.ADMIN_CHAT_ID) {
          await sendTelegram(env, env.ADMIN_CHAT_ID,
            "💰 Dana masuk Rp" + amount.toLocaleString("id-ID") +
            " tapi TIDAK ADA order yang cocok.\nKemungkinan: pembeli bayar nominal salah (bukan nominal unik), atau order sudah kedaluwarsa (30 menit).\nCek mutasi Dana, lalu /konfirmasi ORDER_ID secara manual.\nNotif: " + String(text).slice(0, 200));
        }
        return new Response("ok");
      }
      await selesaikanOrder(env, order.id, order);
      return new Response("ok");
    }

    // ---- Webhook Telegram ----
    if (req.method === "POST") {
      let update;
      try { update = await req.json(); } catch { return new Response("ok"); }
      await handleTelegram(env, update);
      return new Response("ok");
    }

    return new Response("Bot jualan SANDEKALA aktif");
  },
};

// ---- Toko buka/tutup ala warung (19 Nov 2026) ----
// Status disimpan di KV ORDERS kunci "TOKO_BUKA": "buka" / "tutup".
// Default: buka (kalau kunci belum ada). Saat TUTUP, pembeli hanya
// bisa LIHAT (menu, daftar server, status order, akun saya) — beli,
// trial, dan perpanjang diblokir dengan pesan tutup. Admin tidak
// diblokir dan bisa buka/tutup lewat tombol di menu atau perintah
// /buka dan /tutup. Pembayaran kini MANUAL: admin cek Dana lalu
// /konfirmasi ORDER_ID (MacroDroid sudah tidak dipakai).
async function tokoBuka(env) {
  const v = await env.ORDERS.get("TOKO_BUKA").catch(() => null);
  return v !== "tutup";
}
async function setToko(env, buka) {
  await env.ORDERS.put("TOKO_BUKA", buka ? "buka" : "tutup");
}
function adalahAdmin(env, chatId) { return String(chatId) === String(env.ADMIN_CHAT_ID); }
const PESAN_TUTUP = "🔴 Toko lagi tutup. Lihat-lihat dulu aja, order dibuka lagi nanti ya.";
// Siarkan status buka/tutup ke semua pembeli (yang pernah order lewat
// bot). Dipanggil setiap admin buka/tutup toko — lewat tombol menu
// maupun perintah /buka dan /tutup.
async function siarkanStatusToko(env, buka) {
  await kirimBroadcast(env, env.ADMIN_CHAT_ID, buka
    ? "🟢 SANDEKALA VPN sudah BUKA!\n\nSilakan order VPN lewat bot ini. Ketik /start untuk mulai.\n\nHarga: 1 hari Rp1.000 • 7 hari Rp5.000 • 30 hari Rp10.000"
    : "🔴 SANDEKALA VPN lagi TUTUP dulu ya.\n\nOrder dibuka lagi nanti — pantau terus bot ini. Ketik /start untuk lihat menu.");
}

// ================= ALUR BELI =================

async function handleTelegram(env, update) {
  const msg = update.message;
  const cb = update.callback_query;
  if (cb) { // tombol yang diklik pembeli
    const data = String(cb.data || "");
    if (data.startsWith("penuh:")) {
      // Server penuh: tombolnya tidak bisa lanjut — kasih peringatan
      // pop-up di Telegram, lalu kembali ke daftar server.
      const server = SERVERS.find((x) => x.kode === data.slice(6));
      await jawabAlert(env, cb.id, "Server " + (server?.nama || "ini") + " penuh, pilih server lain ya.");
      return;
    }
    // Tombol di pesan navigasi yang sudah lama (>10 menit): jangan
    // edit pesan itu lagi — Telegram akan melompat ke pesan lama di
    // atas chat (membingungkan, 19 Nov 2026). Suruh buka menu baru.
    const NAV_AWAL = ["menu:", "server:", "proto:", "paket:", "tserver:", "tproto:", "srvpage:", "trypage:"];
    if (NAV_AWAL.some((aw) => data.startsWith(aw)) && cb.message?.date && Date.now() / 1000 - cb.message.date > 600) {
      await jawabAlert(env, cb.id, "Pesan ini sudah lama, ketik /start untuk buka menu baru ya.");
      return;
    }
    await jawabCallback(env, cb.id);
    if (data === "menu:utama") { await tampilkanMenuUtama(env, cb.from.id, cb.from, cb.message?.message_id); return; }
    if (data === "menu:beli") { await tampilkanDaftarServer(env, cb.from.id, "beli", 0, cb.message?.message_id); return; }
    if (data === "menu:trial") { await tampilkanDaftarServer(env, cb.from.id, "trial", 0, cb.message?.message_id); return; }
    if (data === "menu:status") { await tampilkanStatus(env, cb.from.id, cb.message?.message_id); return; }
    if (data === "menu:akun") { await tampilkanAkun(env, cb.from.id, cb.message?.message_id); return; }
    if (data === "menu:semua") { await tampilkanSemuaAkun(env, cb.from.id, cb.message?.message_id); return; }
    if (data === "menu:toko") {
      if (!adalahAdmin(env, cb.from.id)) return;
      const buka = await tokoBuka(env);
      await setToko(env, !buka);
      await tampilkanMenuUtama(env, cb.from.id, cb.from, cb.message?.message_id);
      await siarkanStatusToko(env, !buka);
      return;
    }
    if (data.startsWith("srvpage:")) { await tampilkanDaftarServer(env, cb.from.id, "beli", parseInt(data.slice(8), 10) || 0, cb.message?.message_id); return; }
    if (data.startsWith("trypage:")) { await tampilkanDaftarServer(env, cb.from.id, "trial", parseInt(data.slice(8), 10) || 0, cb.message?.message_id); return; }
    if (data.startsWith("server:")) {
      // Langkah 2: pilih protokol untuk server yang dipilih.
      // Protokol disaring per server: server SSH SELOW cuma tampil
      // SSH, CLOUDFRONT NUSA tidak tampil VLESS, sisanya semua.
      const serverKode = data.slice(7);
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      const daftar = PROTOKOL.filter((p) => (server?.protocols || ["ssh", "vmess", "vless", "trojan"]).includes(p.kode));
      const tombol = daftar.map((p) => [
        { text: p.nama, callback_data: "proto:" + serverKode + ":" + p.kode },
      ]);
      tombol.push([{ text: "🔙 Kembali ke Server", callback_data: "menu:beli" }]);
      await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Server: " + (server?.nama || serverKode) + (server?.penuh ? "\n⚠️ Server ini penuh — order bisa ditolak penyedia, sebaiknya pilih server lain." : "") + "\nPilih protokolnya:"), tombol);
      return;
    }
    if (data.startsWith("proto:")) {
      // Langkah 3: pilih durasi untuk server + protokol yang dipilih.
      const [, serverKode, proto] = data.split(":");
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      const tombol = PAKET.map((p) => [
        { text: p.nama + " — Rp" + p.harga.toLocaleString("id-ID"), callback_data: "paket:" + serverKode + ":" + proto + ":" + p.kode },
      ]);
      tombol.push([{ text: "🔙 Kembali", callback_data: "server:" + serverKode }]);
      await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Protokol: " + proto.toUpperCase() + "\nPilih durasi paketnya:"), tombol);
      return;
    }
    if (data.startsWith("paket:")) {
      // Langkah 4: simpan pilihan, minta username.
      const [, serverKode, proto, kodePaket] = data.split(":");
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      await env.ORDERS.put("pending:" + cb.from.id, JSON.stringify({ server: serverKode, protocol: proto, paket: kodePaket }));
      await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml(
        "Kamu pilih " + (SERVERS.find((x) => x.kode === serverKode)?.nama || serverKode) +
        " — " + (PROTOKOL.find((x) => x.kode === proto)?.nama || proto.toUpperCase()) +
        " — " + (PAKET.find((x) => x.kode === kodePaket)?.nama || kodePaket) + ".\n\n" +
        "Ketik username yang kamu mau (huruf/angka saja, 3-15 karakter).\n" +
        "Atau ketik - kalau mau username diacak otomatis.\n" +
        "Ketik /batal untuk membatalkan."), [[{ text: "🔙 Kembali", callback_data: "proto:" + serverKode + ":" + proto }]]);
      return;
    }
    // ---- Trial gratis: pilih server -> protokol -> langsung dibuat ----
    if (data.startsWith("tserver:")) {
      const serverKode = data.slice(8);
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      if (server?.penuh) { await jawabAlert(env, cb.id, "Server ini penuh, pilih server lain ya."); return; }
      const daftar = PROTOKOL.filter((p) => p.kode !== "zivpn" && (server?.protocols || []).includes(p.kode));
      const tombol = daftar.map((p) => [
        { text: p.nama, callback_data: "tproto:" + serverKode + ":" + p.kode },
      ]);
      tombol.push([{ text: "🔙 Kembali ke Server", callback_data: "menu:trial" }]);
      await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Trial gratis 30 menit (kuota 1 GB, 1 IP).\nServer: " + (server?.nama || serverKode) + "\nPilih protokolnya:"), tombol);
      return;
    }
    if (data.startsWith("tproto:")) {
      const [, serverKode, proto] = data.split(":");
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      const midTrial = cb.message?.message_id;
      await editHtml(env, cb.from.id, midTrial, escapeHtml("Membuat akun trial " + proto.toUpperCase() + " di " + (server?.nama || serverKode) + "..."), []);
      const hasil = await trialNadiaAccount(env, server?.serverId, proto);
      if (!hasil.ok) {
        const soalSaldo = /saldo|balance|insufficient/i.test(String(hasil.error || ""));
        const teksTrial = String(cb.from.id) === String(env.ADMIN_CHAT_ID)
          ? "Trial gagal: " + hasil.error
          : "Trial gagal: " + pesanErrorPenyedia(hasil.error) + (soalSaldo ? "\n(Syarat trial: saldo reseller minimal Rp15.000 — kemungkinan harus topup dulu.)" : "");
        await editHtml(env, cb.from.id, midTrial, escapeHtml(teksTrial), []);
        if (String(cb.from.id) !== String(env.ADMIN_CHAT_ID)) {
          await kabariAdmin(env, cb.from.id, "⚠️ Trial gagal (" + (server?.nama || serverKode) + " / " + proto.toUpperCase() + "): " + hasil.error);
        }
        return;
      }
      if (hasil.config && !hasil.config.includes("Berlaku sampai")) {
        hasil.config += "\n\nBerlaku sampai: " + formatExpired(new Date(Date.now() + 30 * 60000));
      }
      await kirimConfig(env, cb.from.id,
        "🎁 Ini config trial kamu (30 menit, kuota 1 GB):", hasil.config,
        "Kalau cocok, lanjut beli paket lewat /beli.", null, midTrial);
      return;
    }
    // ---- Konfirmasi bayar (tombol admin, ganti ketik /konfirmasi) ----
    // Dipakai di notif "Order baru", notif gagal buat akun, dan daftar
    // /semuaakun. Admin cukup ketuk — order ID sudah nempel di tombol.
    if (data.startsWith("konfirmasi:")) {
      if (!adalahAdmin(env, cb.from.id)) return;
      const orderId = data.slice("konfirmasi:".length);
      const order = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (!order) { await jawabAlert(env, cb.id, "Order tidak ditemukan."); return; }
      if (order.status === "selesai") { await jawabAlert(env, cb.id, "Order ini sudah selesai."); return; }
      await selesaikanOrder(env, orderId, order);
      await jawabAlert(env, cb.id, order.status === "selesai"
        ? "Order " + orderId + " dikonfirmasi, config dikirim ke pembeli."
        : "Order " + orderId + " gagal dibuat, cek pesan berikutnya.");
      return;
    }
    // ---- Kelola akun: Perpanjang / Pindah / Ganti / Perbaiki / Hapus ----
    if (data.startsWith("kelola:")) {
      await handleKelola(env, cb, data);
      return;
    }
    if (data.startsWith("renew:")) {
      // Pilih durasi perpanjang -> buat order bayar (kind renew).
      const [, orderId, kodePaket] = data.split(":");
      const target = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (!target) { await sendTelegram(env, cb.from.id, "Akun tidak ditemukan."); return; }
      if (String(cb.from.id) !== String(target.chatId) && String(cb.from.id) !== String(env.ADMIN_CHAT_ID)) return;
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      await buatRenewOrder(env, cb.from.id, target, kodePaket);
      return;
    }
    if (data.startsWith("mig:")) {
      // Pindah server: pilih server tujuan -> eksekusi migrasi.
      const [, orderId, serverKode] = data.split(":");
      const target = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (!target?.accountId) { await sendTelegram(env, cb.from.id, "Akun ini tidak punya ID akun tersimpan — pindah manual, hubungi admin."); return; }
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (!server || server.penuh) { await jawabAlert(env, cb.id, "Server ini penuh, pilih server lain ya."); return; }
      await sendTelegram(env, cb.from.id, "Memindahkan akun " + (target.username || "") + " ke " + server.nama + "...");
      const r = await nadiaPost(env, "/vpn/migrate", { account_id: target.accountId, new_server_id: server.serverId });
      if (!r.ok) { await kabariGagal(env, cb.from.id, "Pindah server gagal", r.error); return; }
      target.server = server.kode; target.serverNama = server.nama; target.serverId = server.serverId;
      const idBaru = cariAccountIdKetat(r.data);
      if (idBaru && String(idBaru) !== String(target.accountId)) target.accountId = idBaru;
      await env.ORDERS.put(orderId, JSON.stringify(target));
      if (r.data?.config) await kirimConfig(env, cb.from.id, "✅ Akun berhasil dipindah ke " + server.nama + ". Sisa masa aktif tetap. Config tidak berubah kecuali IP.\n\nConfig terbaru:", ambilConfigDariData(r.data));
      else await sendTelegram(env, cb.from.id, "✅ Akun berhasil dipindah ke " + server.nama + ". Sisa masa aktif tetap. Config tidak berubah kecuali IP.");
      return;
    }
    if (data.startsWith("gproto:")) {
      // Ganti protokol. Ke SSH: Nadia minta ssh_password — tanya dulu.
      const [, orderId, proto] = data.split(":");
      const target = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (!target?.accountId) { await sendTelegram(env, cb.from.id, "Akun ini tidak punya ID akun tersimpan — ganti manual, hubungi admin."); return; }
      if (proto === "ssh") {
        await env.ORDERS.put("sshpass:" + cb.from.id, JSON.stringify({ orderId }));
        await sendTelegram(env, cb.from.id, "Ganti ke SSH butuh password SSH baru. Ketik password SSH yang kamu mau (minimal 4 karakter).");
        return;
      }
      await eksekusiGantiProtokol(env, cb.from.id, target, proto, null);
      return;
    }
    if (data.startsWith("hapusya:")) {
      const orderId = data.slice(8);
      const target = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (target) {
        const daftar = await env.ORDERS.get("akun:" + target.chatId, "json").catch(() => null) || [];
        await env.ORDERS.put("akun:" + target.chatId, JSON.stringify(daftar.filter((x) => x !== orderId)));
        await env.ORDERS.delete(orderId);
      }
      await sendTelegram(env, cb.from.id, "Akun sudah dihapus dari daftar bot.\nCatatan: penghapusan di server penyedia tidak bisa lewat bot — kalau akunnya masih aktif, hapus lewat dashboard penyedia > Layanan Aktif.");
      return;
    }
    if (data.startsWith("hapusbatal:")) {
      await sendTelegram(env, cb.from.id, "Penghapusan dibatalkan.");
      return;
    }
    return;
  }
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Tombol bawah permanen = sama dengan perintahnya.
  if (text === "🛒 Beli VPN") { await tampilkanServer(env, chatId); return; }
  if (text === "📦 Status Order") { await tampilkanStatus(env, chatId); return; }
  if (text === "📋 Semua Akun") { await tampilkanSemuaAkun(env, chatId); return; }
  if (text === "/batal") {
    await env.ORDERS.delete("pending:" + chatId);
    await sendTelegram(env, chatId, "Order dibatalkan. Ketik /beli kalau mau pesan lagi.");
    return;
  }

  // Password SSH baru saat ganti protokol ke SSH.
  const sshpass = await env.ORDERS.get("sshpass:" + chatId, "json").catch(() => null);
  if (sshpass && !text.startsWith("/")) {
    if (text.length < 4) { await sendTelegram(env, chatId, "Password SSH minimal 4 karakter. Ketik lagi."); return; }
    await env.ORDERS.delete("sshpass:" + chatId);
    const target = await env.ORDERS.get(sshpass.orderId, "json").catch(() => null);
    if (!target) { await sendTelegram(env, chatId, "Akun tidak ditemukan."); return; }
    await eksekusiGantiProtokol(env, chatId, target, "ssh", text);
    return;
  }

  // Langkah 4: pembeli mengetik username (atau "-") setelah pilih paket.
  const pending = await env.ORDERS.get("pending:" + chatId, "json").catch(() => null);
  if (pending && !text.startsWith("/")) {
    let username = null;
    if (text !== "-") {
      const bersih = text.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (bersih.length < 3 || bersih.length > 15) {
        await sendTelegram(env, chatId, "Username harus 3-15 karakter (huruf/angka saja). Ketik lagi, atau ketik - untuk acak.");
        return;
      }
      username = bersih;
    }
    await env.ORDERS.delete("pending:" + chatId);
    if (!(await tokoBuka(env)) && !adalahAdmin(env, chatId)) {
      await sendTelegram(env, chatId, PESAN_TUTUP);
      return;
    }
    await buatOrder(env, chatId, pending.paket, pending.protocol, username, pending.server, msg.from);
    return;
  }

  if (text === "/start" || text === "/menu") {
    await tampilkanMenuUtama(env, chatId, msg.from, null);
    return;
  }

  if (text === "/beli") {
    await tampilkanServer(env, chatId);
    return;
  }

  if (text === "/trial") {
    await tampilkanTrialServer(env, chatId);
    return;
  }

  if (text === "/akun") {
    await tampilkanAkun(env, chatId);
    return;
  }

  if (text === "/semuaakun") {
    await tampilkanSemuaAkun(env, chatId);
    return;
  }

  if (text.startsWith("/broadcast")) {
    await kirimBroadcast(env, chatId, text.slice("/broadcast".length));
    return;
  }

  if (text === "/status") {
    await tampilkanStatus(env, chatId);
    return;
  }

  // Perintah admin: /buka dan /tutup (toko buka/tutup ala warung).
  if (text === "/buka" || text === "/tutup") {
    if (!adalahAdmin(env, chatId)) return;
    await setToko(env, text === "/buka");
    await sendTelegram(env, chatId, text === "/buka"
      ? "🟢 Toko DIBUKA. Pembeli sudah bisa order, trial, dan perpanjang lagi."
      : "🔴 Toko DITUTUP. Pembeli hanya bisa lihat-lihat (menu, daftar server, status, akun).");
    await siarkanStatusToko(env, text === "/buka");
    return;
  }

  // Perintah admin: /konfirmasi ORDER_ID (cara utama konfirmasi bayar:
  // cek Dana lalu /konfirmasi — MacroDroid sudah tidak dipakai).
  if (text.startsWith("/konfirmasi ")) {
    if (String(chatId) !== String(env.ADMIN_CHAT_ID)) return;
    const orderId = text.split(" ")[1];
    const order = await env.ORDERS.get(orderId, "json").catch(() => null);
    if (!order) { await sendTelegram(env, chatId, "Order tidak ditemukan."); return; }
    // Hanya order yang sudah "selesai" yang tidak bisa dikonfirmasi
    // ulang. Order "paid"/"gagal" (bayar masuk tapi gagal buat akun)
    // HARUS bisa dicoba lagi — sebelumnya kondisi ini memblokir
    // "paid" juga, jadi /konfirmasi kedua setelah gagal selalu
    // ditolak dengan "Order ini sudah dibayar." (cek 19 Nov 2026).
    if (order.status === "selesai") {
      await sendTelegram(env, chatId, "Order ini sudah selesai."); return;
    }
    await selesaikanOrder(env, orderId, order);
    await sendTelegram(env, chatId, "Order " + orderId + " dikonfirmasi manual.");
    return;
  }
}


// ---- STATUS SERVER (live dari GET /servers, fallback snapshot 19 Nov) ----
// Tombol server menampilkan slot kosong, mis. "CLOUDMATIKA 🟡 sisa 6".
// Live: GET {RESELLER_API_URL}/servers (Bearer sama) — cocokkan per
// server_id, baca used/limit/is_full. Kalau gagal (API mati dsb.),
// pakai used/limit snapshot 19 Nov 2026 di daftar SERVERS di atas.
async function ambilStatusServerLive(env) {
  // Return: { map, debug } — map: serverId -> {used, limit, penuh}.
  // debug: string pendek soal kenapa gagal (untuk admin saja).
  const fail = (debug) => ({ map: null, debug });
  try {
    const base = (env.RESELLER_API_URL || "https://www.nadiavpn.web.id/api/v1").replace(/\/$/, "");
    if (!env.RESELLER_API_KEY) return fail("RESELLER_API_KEY kosong");
    const r = await fetch(base + "/servers", {
      headers: { "Authorization": "Bearer " + env.RESELLER_API_KEY, "Accept": "application/json" },
    });
    const teks = await r.text();
    let j = null;
    try { j = JSON.parse(teks); } catch (e) { /* bukan JSON */ }
    if (!r.ok) return fail("HTTP " + r.status + ": " + teks.slice(0, 120));
    if (!j) return fail("balasan bukan JSON: " + teks.slice(0, 120));
    // Cari array server di mana saja: langsung, j.data, j.data.servers,
    // j.servers, atau bersarang lebih dalam.
    let arr = null;
    const cari = (o, dalam) => {
      if (arr || dalam > 3) return;
      if (Array.isArray(o)) {
        if (o.length && typeof o[0] === "object" && (o[0].server_id || o[0].id)) arr = o;
        return;
      }
      if (o && typeof o === "object") for (const v of Object.values(o)) cari(v, dalam + 1);
    };
    cari(j, 0);
    if (!arr) return fail("tidak ada array server di balasan: " + teks.slice(0, 120));
    const map = {};
    for (const x of arr) {
      const id = x.server_id || x.id || x.uuid;
      if (!id) continue;
      const ambilAngka = (...kunci) => {
        for (const k of kunci) if (typeof x[k] === "number") return x[k];
        return null;
      };
      const used = ambilAngka("used", "used_count", "user_count", "users", "active_users", "total_users", "count", "occupied", "terpakai");
      const limit = ambilAngka("limit", "max", "max_users", "max_user", "capacity", "total", "slots", "quota", "limit_user");
      map[id] = {
        used, limit,
        penuh: !!(x.is_full || x.full || x.penuh || x.isFull),
      };
    }
    return { map, debug: "" };
  } catch (e) { return fail("fetch error: " + String(e && e.message || e).slice(0, 120)); }
}
function statusServer(s, live) {
  const l = live && live.map ? live.map[s.serverId] : null;
  const used = l?.used ?? s.used ?? null;
  const limit = l?.limit ?? s.limit ?? null;
  const penuh = l?.penuh ?? s.penuh ?? false;
  const sisa = (used !== null && limit !== null) ? limit - used : null;
  return { used, limit, penuh: penuh || (sisa !== null && sisa <= 0), sisa };
}
function labelServer(s, live) {
  const nama = s.nama.replace(" — PENUH", "");
  const st = statusServer(s, live);
  if (st.penuh) return "❌ " + nama + " — PENUH";
  if (st.sisa !== null) return nama + (st.sisa <= 10 ? " 🟡 sisa " + st.sisa : " 🟢 sisa " + st.sisa);
  return nama;
}

// Langkah 1 beli: pilih server dulu (semua 24 server Nadia).
// Server penuh tampil tapi TIDAK bisa diklik untuk lanjut —
// tombolnya pakai callback "penuh:" yang cuma menampilkan
// peringatan pop-up "server penuh, pilih server lain".
// ================= TAMPILAN ALA PANEL (gaya bot panel, isi tetap SANDEKALA) ====
// /start & /menu -> kotak MENU UTAMA (monospace) + tombol inline hijau.
// Daftar server -> kotak per server + pagination Page 1/2, footer -SANDEKALA-.
// Yang ditampilkan HANYA data asli bot ini: ID/username Telegram, jumlah
// akun pembeli di bot, status slot live, harga jual SANDEKALA, saldo
// reseller (khusus admin, live dari GET /user/balance). Tidak ada angka
// karangan (tanpa saldo PPOB / bonus topup / progres penjualan toko lain).
const GARIS_PANEL = "——————————————————";
const SERVER_PER_HALAMAN = 12;

async function ambilSaldoReseller(env) {
  try {
    const base = (env.RESELLER_API_URL || "https://www.nadiavpn.web.id/api/v1").replace(/\/$/, "");
    if (!env.RESELLER_API_KEY) return null;
    const r = await fetch(base + "/user/balance", {
      headers: { "Authorization": "Bearer " + env.RESELLER_API_KEY, "Accept": "application/json" },
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) return null;
    const d = j.data || j;
    const cari = (o) => {
      if (!o || typeof o !== "object") return null;
      for (const k of ["balance", "saldo", "amount", "total"]) {
        if (typeof o[k] === "number") return o[k];
        if (typeof o[k] === "string" && /^\d+(\.\d+)?$/.test(o[k])) return parseFloat(o[k]);
      }
      return null;
    };
    return cari(d) ?? cari(j);
  } catch (e) { return null; }
}

async function tampilkanMenuUtama(env, chatId, from, messageId) {
  const isAdmin = String(chatId) === String(env.ADMIN_CHAT_ID);
  const daftar = await daftarAkunUser(env, chatId);
  const live = await ambilStatusServerLive(env);
  const tersedia = SERVERS.filter((x) => !statusServer(x, live).penuh).length;
  const saldo = isAdmin ? await ambilSaldoReseller(env) : null;
  const buka = await tokoBuka(env);
  // Teks biasa (bukan <pre>): <pre> memunculkan tombol SALIN KODE
  // bawaan Telegram di bawah menu — Asep minta dihilangkan di menu
  // (19 Nov 2026). <pre> hanya dipakai saat mengirim config akun.
  const baris = [GARIS_PANEL, "MENU UTAMA", GARIS_PANEL, "INFORMASI PELANGGAN",
    "ID: " + chatId,
    "USERNAME: " + (from?.username ? "@" + from.username : "—"),
    "ROLE: " + (isAdmin ? "admin" : "member"),
    "TOTAL VPN: " + daftar.length + " AKUN"];
  if (saldo !== null) baris.push("SALDO VPN: Rp" + saldo.toLocaleString("id-ID"));
  baris.push(GARIS_PANEL, "SERVER TERSEDIA: " + tersedia + " / " + SERVERS.length + " SERVERS", "TOKO: " + (buka ? "🟢 BUKA" : "🔴 TUTUP"), GARIS_PANEL, "OWNER: @Asepbesot", GARIS_PANEL);
  if (isAdmin) baris.push("ADMIN: /semuaakun • /broadcast PESAN • /konfirmasi ORDER_ID • /buka • /tutup", GARIS_PANEL);
  const html = baris.map((x) => (x === "MENU UTAMA" || x === "INFORMASI PELANGGAN") ? "<b>" + escapeHtml(x) + "</b>" : (x === "OWNER: @Asepbesot" ? 'OWNER: <a href="https://t.me/Asepbesot">@Asepbesot</a>' : escapeHtml(x))).join("\n");
  const tombol = [
    [{ text: "🛒 Beli VPN", callback_data: "menu:beli" }],
    [{ text: "🎁 Trial Gratis", callback_data: "menu:trial" }, { text: "📦 Status Order", callback_data: "menu:status" }],
    [{ text: "👤 Akun Saya", callback_data: "menu:akun" }],
  ];
  if (isAdmin) tombol.push([{ text: "📋 Semua Akun", callback_data: "menu:semua" }]);
  if (isAdmin) tombol.push([{ text: buka ? "🔴 Tutup Toko" : "🟢 Buka Toko", callback_data: "menu:toko" }]);
  if (messageId) { await editHtml(env, chatId, messageId, html, tombol); return; }
  // Kirim menu + hapus keyboard bawah lama supaya tampilannya seperti
  // bot panel (hanya tombol inline).
  // BUG 19 Nov 2026 (tes akun kedua): editMessageReplyMarkup untuk
  // menempel tombol ke pesan yang baru dikirim GAGAL TERUS (bukan
  // cuma kadang) — perbaikan pertama (retry + kirim ulang) memang
  // memunculkan tombol, tapi jadi ada 2 pesan menu. Perbaikan final:
  // jangan pakai editMessageReplyMarkup sama sekali. Kirim dulu pesan
  // placeholder dengan remove_keyboard, lalu ubah pesan ITU menjadi
  // menu lengkap + tombol lewat editMessageText (editHtml) — jalur
  // yang sama dengan navigasi menu, yang selama ini selalu berhasil.
  const j = await telegramApi(env, "sendMessage", { chat_id: chatId, text: "⏳ Memuat menu...", reply_markup: { remove_keyboard: true } });
  const mid = j?.result?.message_id;
  if (mid) {
    // Jeda sebentar: edit yang dilakukan persis setelah kirim kadang
    // gagal karena Telegram belum selesai memproses pesan barunya
    // (placeholder "⏳ Memuat menu..." jadi nyangkut, 19 Nov 2026).
    await new Promise((res) => setTimeout(res, 600));
    await editHtml(env, chatId, mid, html, tombol);
  } else await sendHtml(env, chatId, html, tombol);
}

function teksDaftarServer(daftar, live, judul, halaman, totalHalaman) {
  const bagian = daftar.map((s) => {
    const st = statusServer(s, live);
    const nama = s.nama.replace(" — PENUH", "");
    const pakai = (st.used !== null && st.limit !== null) ? st.used + "/" + st.limit : "?";
    return "🔰 Nama Server: " + nama +
      "\n💵 Harga: 1 hari Rp1.000 • 7 hari Rp5.000 • 30 hari Rp10.000" +
      "\n🧮 Total Akun Dibuat: " + pakai + (st.sisa !== null ? " (sisa " + st.sisa + ")" : "") +
      (st.penuh ? "\n❌ PENUH" : "") +
      "\n" + GARIS_PANEL;
  });
  return judul + "\n" + GARIS_PANEL + "\n" + bagian.join("\n") +
    "\nPage " + (halaman + 1) + "/" + totalHalaman + " displayed\n" + GARIS_PANEL + "\n-SANDEKALA-\n" + GARIS_PANEL;
}

function tombolDaftarServer(daftar, live, mode, halaman, totalHalaman) {
  // Satu tombol per baris (lebar penuh): sebelumnya 2 kolom, nama server
  // yang panjang kepotong dan tanda kapasitas (🟢/🟡 sisa X) tidak
  // kelihatan (19 Nov 2026). Ukuran huruf tombol tidak bisa diubah —
  // itu diatur Telegram — jadi solusinya tombolnya dilebarkan.
  const tombol = [];
  for (const s of daftar) {
    const st = statusServer(s, live);
    if (mode === "trial") tombol.push([{ text: s.nama.replace(" — PENUH", ""), callback_data: "tserver:" + s.kode }]);
    else tombol.push([{ text: labelServer(s, live), callback_data: (st.penuh ? "penuh:" : "server:") + s.kode }]);
  }
  const nav = [];
  const kunci = mode === "trial" ? "trypage:" : "srvpage:";
  if (halaman > 0) nav.push({ text: "⬅️ Prev", callback_data: kunci + (halaman - 1) });
  if (halaman < totalHalaman - 1) nav.push({ text: "Next ➡️", callback_data: kunci + (halaman + 1) });
  if (nav.length) tombol.push(nav);
  tombol.push([{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama" }]);
  return tombol;
}

async function tampilkanDaftarServer(env, chatId, mode, halaman, messageId) {
  const live = await ambilStatusServerLive(env);
  if (!live.map && env.ADMIN_CHAT_ID && mode === "beli" && halaman === 0) {
    await sendTelegram(env, env.ADMIN_CHAT_ID, "⚠️ Status server live gagal: " + (live.debug || "?") + "\nAngka di /beli pakai snapshot 19 Nov.");
  }
  const semua = mode === "trial" ? SERVERS.filter((x) => !statusServer(x, live).penuh) : SERVERS;
  const totalHalaman = Math.max(1, Math.ceil(semua.length / SERVER_PER_HALAMAN));
  halaman = Math.min(Math.max(0, halaman || 0), totalHalaman - 1);
  const daftar = semua.slice(halaman * SERVER_PER_HALAMAN, (halaman + 1) * SERVER_PER_HALAMAN);
  const judul = mode === "trial"
    ? "🎁 Trial gratis 30 menit (kuota 1 GB, 1 IP).\nSyarat: saldo reseller minimal Rp15.000 (tidak dipotong)."
    : "Pilih servernya:\n🟢 Tersedia  •  🟡 Hampir penuh (sisa ≤ 10 slot)  •  ❌ PENUH tidak bisa dipilih\nAngka = slot kosong" + (live.map ? " (status terbaru)." : " (status per 19 Nov — gagal ambil status terbaru).");
  // Teks biasa (bukan <pre>) supaya tidak muncul tombol SALIN KODE
  // bawaan Telegram — sama seperti menu (permintaan Asep 19 Nov 2026).
  const html = escapeHtml(teksDaftarServer(daftar, live, judul, halaman, totalHalaman));
  const tombol = tombolDaftarServer(daftar, live, mode, halaman, totalHalaman);
  if (messageId) await editHtml(env, chatId, messageId, html, tombol);
  else await sendHtml(env, chatId, html, tombol);
}

async function tampilkanServer(env, chatId, halaman, messageId) {
  await tampilkanDaftarServer(env, chatId, "beli", halaman || 0, messageId || null);
}

// Langkah 2 beli: pilih protokol dulu.
async function tampilkanProtokol(env, chatId) {
  const tombol = PROTOKOL.map((p) => [
    { text: p.nama, callback_data: "proto:" + p.kode },
  ]);
  await sendTelegram(env, chatId, "Pilih protokolnya:", tombol);
}

async function tampilkanStatus(env, chatId, messageId) {
  await bersihkanOrderKedaluarsa(env);
  const order = await orderTerakhir(env, chatId);
  const teks = order
    ? "Order " + order.id + ": " + order.status +
      (order.status === "menunggu bayar"
        ? "\nBayar Rp" + order.nominalUnik.toLocaleString("id-ID") +
          " ke QRIS DANA Bisnis (gambar QR sudah dikirim bersama order)."
        : "")
    : "Belum ada order dari kamu.";
  // Dari tombol menu: ubah pesan menu jadi status (ada tombol kembali).
  // Dari perintah teks (/status): kirim pesan baru seperti biasa.
  if (messageId) await editHtml(env, chatId, messageId, escapeHtml(teks), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama" }]]);
  else await sendTelegram(env, chatId, teks);
}

// ---- Kelola akun (tombol di bawah config / di /akun) ----
async function handleKelola(env, cb, data) {
  const [, aksi, orderId] = data.split(":");
  const chatId = cb.from.id;
  const target = await env.ORDERS.get(orderId, "json").catch(() => null);
  if (!target) { await sendTelegram(env, chatId, "Akun tidak ditemukan."); return; }
  // Pembeli pemilik akun atau admin boleh kelola.
  if (String(chatId) !== String(target.chatId) && String(chatId) !== String(env.ADMIN_CHAT_ID)) return;
  if (aksi === "perpanjang") {
    if (!(await tokoBuka(env)) && !adalahAdmin(env, chatId)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
    const tombol = PAKET.map((p) => [
      { text: p.nama + " — Rp" + p.harga.toLocaleString("id-ID"), callback_data: "renew:" + orderId + ":" + p.kode },
    ]);
    tombol.push([{ text: "🔙 Kembali ke Akun", callback_data: "menu:akun" }]);
    await sendTelegram(env, chatId, "Perpanjang akun " + (target.username || "") + " (" + (target.namaPaket || "") + "). Pilih durasi tambahan:", tombol);
    return;
  }
  if (aksi === "pindah") {
    const liveMig = await ambilStatusServerLive(env);
    const tombol = SERVERS.filter((s) => !statusServer(s, liveMig).penuh && s.kode !== target.server).map((s) => [
      { text: labelServer(s, liveMig), callback_data: "mig:" + orderId + ":" + s.kode },
    ]);
    tombol.push([{ text: "🔙 Kembali ke Akun", callback_data: "menu:akun" }]);
    await sendTelegram(env, chatId, "Pindah server akun " + (target.username || "") + ". Sisa masa aktif ikut pindah. Pilih server tujuan:", tombol);
    return;
  }
  if (aksi === "ganti") {
    const daftar = PROTOKOL.filter((p) => p.kode !== (target.protocol || "").toLowerCase());
    const tombol = daftar.map((p) => [
      { text: p.nama, callback_data: "gproto:" + orderId + ":" + p.kode },
    ]);
    tombol.push([{ text: "🔙 Kembali ke Akun", callback_data: "menu:akun" }]);
    await sendTelegram(env, chatId, "Ganti protokol akun " + (target.username || "") + " (sekarang: " + (target.protocol || "?").toUpperCase() + "). Gratis. Pilih protokol baru:", tombol);
    return;
  }
  if (aksi === "perbaiki") {
    if (!target.accountId) { await sendTelegram(env, chatId, "Akun ini tidak punya ID akun tersimpan — perbaiki manual, hubungi admin."); return; }
    await sendTelegram(env, chatId, "Mengambil data terbaru akun " + (target.username || "") + " dari penyedia...");
    let r = await nadiaPost(env, "/vpn/account/details", { account_id: target.accountId });
    if (!r.ok) {
      // ID tersimpan bisa jadi sudah basi (mis. Ganti Protokol membuat
      // akun baru dengan ID baru di sisi penyedia). Cari ID terbaru dari
      // daftar akun, simpan, lalu coba details sekali lagi.
      const idBaru = await pulihkanAccountId(env, target);
      if (idBaru && String(idBaru) !== String(target.accountId)) {
        target.accountId = idBaru;
        await env.ORDERS.put(orderId, JSON.stringify(target));
        r = await nadiaPost(env, "/vpn/account/details", { account_id: idBaru });
      }
    }
    if (!r.ok) { await kabariGagal(env, chatId, "Perbaiki akun gagal", r.error); return; }
    const cfg = gabungConfig(ambilConfigDariData(r.data), target.config);
    target.config = cfg;
    await env.ORDERS.put(orderId, JSON.stringify(target));
    await kirimConfig(env, chatId, "🛠️ Ini config terbaru akun " + (target.username || "") + ":", cfg);
    return;
  }
  if (aksi === "hapus") {
    await sendTelegram(env, chatId, "Yakin hapus akun " + (target.username || "") + " (" + (target.namaPaket || "") + ") dari daftar bot?", [
      [{ text: "✅ Ya, hapus", callback_data: "hapusya:" + orderId }],
      [{ text: "❌ Batal", callback_data: "hapusbatal:" + orderId }],
    ]);
    return;
  }
}

// Buat order bayar untuk perpanjang (kind renew, harga jual sama).
async function buatRenewOrder(env, chatId, target, kodePaket) {
  const paket = PAKET.find((p) => p.kode === kodePaket);
  if (!paket) return;
  const kodeUnik = 10 + Math.floor(Math.random() * 90);
  const nominalUnik = paket.harga + kodeUnik;
  const orderId = "ORD-" + Date.now().toString(36).toUpperCase();
  const order = {
    id: orderId, chatId, pembeli: target.pembeli || null,
    kind: "renew", targetOrderId: target.id,
    accountId: target.accountId, username: target.username,
    paket: paket.kode, namaPaket: paket.nama,
    protocol: target.protocol,
    serverNama: target.serverNama || target.server || null,
    server: target.server || null,
    harga: paket.harga, nominalUnik, status: "menunggu bayar",
    createdAt: Date.now(),
  };
  await env.ORDERS.put(orderId, JSON.stringify(order));
  await env.ORDERS.put("last:" + chatId, orderId);
  await kabariAdmin(env, chatId,
    "🔄 Order perpanjang baru " + orderId + " (menunggu bayar)\n" +
    "Pembeli: " + (target.pembeli || ("ID " + chatId)) + " — akun " + (target.username || "") +
    " — tambah " + paket.nama + " — bayar Rp" + nominalUnik.toLocaleString("id-ID") + "\n" +
    "Berlaku 30 menit. Kalau uang sudah masuk Dana, ketuk tombol Konfirmasi di bawah.",
    [[{ text: "✅ Konfirmasi Pembayaran", callback_data: "konfirmasi:" + orderId }]]);
  await sendTelegram(env, chatId,
    "Order perpanjang " + orderId + " dibuat.\n\n" +
    "Akun: " + (target.username || "") + " — tambah " + paket.nama + " — Rp" + paket.harga.toLocaleString("id-ID") + "\n" +
    "TOLONG BAYAR SESUAI NOMINAL HARGA YANG TERTERA: Rp" + nominalUnik.toLocaleString("id-ID") + "\n\n" +
    "Scan QRIS DANA Bisnis SANDEKALA dengan nominal di atas. Setelah bayar, admin akan cek pembayaranmu lalu masa aktif bertambah.");
  if (env.QRIS_IMAGE_URL) {
    await sendPhoto(env, chatId, env.QRIS_IMAGE_URL,
      "QRIS DANA Bisnis SANDEKALA — bayar Rp" + nominalUnik.toLocaleString("id-ID") + ". Order " + orderId);
  }
}

// Ganti protokol via Nadia. Ke SSH: sertakan ssh_password yang diketik.
async function eksekusiGantiProtokol(env, chatId, target, proto, sshPassword) {
  const body = { account_id: target.accountId, target_protocol: proto };
  if (proto === "ssh" && sshPassword) body.ssh_password = sshPassword;
  await sendTelegram(env, chatId, "Mengganti protokol akun " + (target.username || "") + " ke " + proto.toUpperCase() + "...");
  const r = await nadiaPost(env, "/vpn/change-protocol", body);
  if (!r.ok) { await kabariGagal(env, chatId, "Ganti protokol gagal", r.error); return; }
  target.protocol = proto;
  const idBaru = cariAccountIdKetat(r.data);
  if (idBaru && String(idBaru) !== String(target.accountId)) target.accountId = idBaru;
  if (r.data?.config) target.config = ambilConfigDariData(r.data);
  await env.ORDERS.put(target.id, JSON.stringify(target));
  if (target.config) await kirimConfig(env, chatId, "✅ Protokol akun " + (target.username || "") + " sekarang " + proto.toUpperCase() + ". Masa aktif tetap.\n\nConfig terbaru:", target.config);
  else await sendTelegram(env, chatId, "✅ Protokol akun " + (target.username || "") + " sekarang " + proto.toUpperCase() + ". Masa aktif tetap.");
}

async function tampilkanTrialServer(env, chatId, halaman, messageId) {
  await tampilkanDaftarServer(env, chatId, "trial", halaman || 0, messageId || null);
}

// ---- /semuaakun (ADMIN saja): daftar semua order yang lewat bot ----
// Diambil dari KV (prefix ORD-), terbaru dulu, maks. 30 baris.
// Hanya order yang dibuat lewat bot; akun trial TIDAK tercatat di sini
// (trial langsung dibuat tanpa order), dan akun yang dibuat manual di
// dashboard penyedia juga tidak ada di sini — cek Layanan Aktif.
// Hapus order yang tidak dibayar dan sudah lewat 24 jam dari KV.
// Dipanggil malas (lazy) tiap kali daftar order dibuka — Worker tidak
// punya jadwal sendiri, jadi pembersihan jalan saat ada yang melihat
// daftar. Mengembalikan jumlah yang dihapus.
async function bersihkanOrderKedaluarsa(env) {
  const list = await env.ORDERS.list({ prefix: "ORD-" });
  let dihapus = 0;
  const batas = Date.now() - ORDER_HAPUS_MS;
  for (const key of list.keys) {
    const o = await env.ORDERS.get(key.name, "json").catch(() => null);
    if (o && o.status === "menunggu bayar" && o.createdAt && o.createdAt < batas) {
      await env.ORDERS.delete(key.name);
      dihapus++;
    }
  }
  return dihapus;
}

async function tampilkanSemuaAkun(env, chatId, messageId) {
  if (String(chatId) !== String(env.ADMIN_CHAT_ID)) return;
  const dihapus = await bersihkanOrderKedaluarsa(env);
  const list = await env.ORDERS.list({ prefix: "ORD-" });
  const orders = [];
  for (const key of list.keys) {
    const o = await env.ORDERS.get(key.name, "json").catch(() => null);
    if (o) orders.push(o);
  }
  const tombolKembali = [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama" }]];
  if (!orders.length) {
    if (messageId) await editHtml(env, chatId, messageId, escapeHtml("Belum ada order lewat bot."), tombolKembali);
    else await sendTelegram(env, chatId, "Belum ada order lewat bot.");
    return;
  }
  orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const total = orders.length;
  const tampil = orders.slice(0, 30);
  // Order perpanjang tidak menyimpan nama server sendiri — ambil dari
  // order asalnya supaya tidak tampil "?".
  const perId = new Map(orders.map((o) => [o.id, o]));
  const serverOrder = (o) => {
    if (o.serverNama || o.server) return o.serverNama || o.server;
    if (o.kind === "renew" && o.targetOrderId) {
      const asal = perId.get(o.targetOrderId);
      if (asal) return asal.serverNama || asal.server || null;
    }
    return null;
  };
  // Tombol konfirmasi untuk order yang masih menunggu bayar / gagal
  // (maks 10, terbaru dulu) — admin tinggal ketuk, tanpa ketik ID.
  const butuhKonfirmasi = tampil.filter((o) => o.status === "menunggu bayar" || o.status === "gagal").slice(0, 10);
  const tombolKonfirmasi = butuhKonfirmasi.map((o) => [{ text: "✅ Konfirmasi " + o.id, callback_data: "konfirmasi:" + o.id }]);
  const baris = tampil.map((o) => {
    let status = o.status || "?";
    if (status === "menunggu bayar" && o.createdAt && Date.now() - o.createdAt > ORDER_TTL_MS) status = "menunggu bayar (kedaluwarsa)";
    const tgl = o.createdAt ? new Date(o.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "?";
    return "• " + (o.username || "?") +
      (o.kind === "renew" ? " (perpanjang)" : "") +
      " — " + (o.pembeli || ("ID " + (o.chatId || "?"))) +
      "\n  " + (o.namaPaket || o.paket || "?") + " — " + (o.protocol || "?").toUpperCase() +
      " — " + (serverOrder(o) || "?") +
      "\n  " + status + " — Rp" + (o.nominalUnik || o.harga || 0).toLocaleString("id-ID") +
      " — " + tgl + " — " + o.id;
  });
  let teks = "📋 Semua order lewat bot (" + total + "):\n\n" + baris.join("\n\n");
  if (total > 30) teks += "\n\nMenampilkan 30 terbaru dari " + total + " order.";
  if (dihapus > 0) teks += "\n\n🧹 " + dihapus + " order kedaluwarsa (>24 jam) dihapus otomatis.";
  // Kirim per potongan supaya tidak kepotong limit Telegram.
  // Potongan pertama menggantikan pesan menu (kalau dari tombol),
  // tombol kembali ada di potongan terakhir.
  const tombolAkhir = tombolKonfirmasi.concat(tombolKembali);
  for (let i = 0; i < teks.length; i += 3500) {
    const potong = teks.slice(i, i + 3500);
    const terakhir = i + 3500 >= teks.length;
    if (messageId && i === 0) await editHtml(env, chatId, messageId, escapeHtml(potong), terakhir ? tombolAkhir : []);
    else await sendTelegram(env, chatId, potong, terakhir ? tombolAkhir : undefined);
  }
}

// ---- /broadcast PESAN (ADMIN saja) ----
// Kirim pesan ke semua pembeli yang pernah order lewat bot (chatId
// diambil dari order ORD-* di KV, unik, tanpa admin sendiri).
// Batas: hanya pembeli yang tercatat di order bot; pengguna trial
// saja (tanpa order) tidak ikut karena chatId-nya tidak disimpan.
// Gagal kirim (mis. pembeli blokir bot) dihitung, tidak menggagalkan
// yang lain.
async function kirimBroadcast(env, chatId, teks) {
  if (String(chatId) !== String(env.ADMIN_CHAT_ID)) return;
  teks = String(teks || "").trim();
  if (!teks) {
    await sendTelegram(env, chatId, "Cara pakai: /broadcast ISI PESAN\nContoh: /broadcast Promo minggu ini: VPN 30 hari cuma Rp10.000!");
    return;
  }
  const list = await env.ORDERS.list({ prefix: "ORD-" });
  const tujuan = new Set();
  for (const key of list.keys) {
    const o = await env.ORDERS.get(key.name, "json").catch(() => null);
    if (o?.chatId && String(o.chatId) !== String(env.ADMIN_CHAT_ID)) tujuan.add(String(o.chatId));
  }
  if (!tujuan.size) { await sendTelegram(env, chatId, "Belum ada pembeli yang tercatat di bot, broadcast batal."); return; }
  await sendTelegram(env, chatId, "📣 Mengirim broadcast ke " + tujuan.size + " pembeli...");
  let ok = 0, gagal = 0;
  for (const id of tujuan) {
    const j = await telegramApi(env, "sendMessage", { chat_id: Number(id), text: teks.slice(0, 4000) });
    if (j?.ok) ok++; else gagal++;
  }
  await sendTelegram(env, chatId, "📣 Broadcast selesai: terkirim ke " + ok + " pembeli" + (gagal ? ", gagal ke " + gagal + " (kemungkinan blokir bot)." : "."));
}

async function tampilkanAkun(env, chatId, messageId) {
  const daftar = await daftarAkunUser(env, chatId);
  if (!daftar.length) {
    const teks = "Kamu belum punya akun aktif di bot ini. Ketik /beli untuk pesan, atau /trial untuk coba gratis.";
    if (messageId) await editHtml(env, chatId, messageId, escapeHtml(teks), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama" }]]);
    else await sendTelegram(env, chatId, teks);
    return;
  }
  for (let i = 0; i < daftar.length; i++) {
    const o = daftar[i];
    const teks =
      "Akun: " + (o.username || "?") + "\n" +
      "Paket: " + (o.namaPaket || "?") + " — " + (o.protocol || "?").toUpperCase() + "\n" +
      "Server: " + (o.serverNama || o.server || "?") + "\n" +
      "Order: " + o.id;
    const tombol = tombolKelola(o.id);
    if (i === daftar.length - 1) tombol.push([{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama" }]);
    if (messageId && i === 0) await editHtml(env, chatId, messageId, escapeHtml(teks), tombol);
    else await sendTelegram(env, chatId, teks, tombol);
  }
}

function namaPembeli(from) {
  if (!from) return null;
  const nama = [from.first_name, from.last_name].filter(Boolean).join(" ") || null;
  const user = from.username ? "@" + from.username : null;
  return [nama, user].filter(Boolean).join(" ") || null;
}


// Kabari admin kalau ada order baru / penjualan berhasil.
// Dipakai supaya admin tetap tahu walau MacroDroid gagal baca notif
// Dana — admin bisa cek Dana lalu /konfirmasi manual.
async function kabariAdmin(env, chatIdPembeli, teks, tombol) {
  if (!env.ADMIN_CHAT_ID || String(env.ADMIN_CHAT_ID) === String(chatIdPembeli)) return;
  await sendTelegram(env, env.ADMIN_CHAT_ID, teks, tombol);
}

// Terjemahkan error mentah dari API penyedia jadi bahasa yang dimengerti
// pembeli. Error mentah (sering berupa dump SQL) tetap dikirim ke admin
// supaya bisa dilaporkan ke penyedia — pembeli jangan dikasih lihat itu.
function pesanErrorPenyedia(error) {
  const e = String(error || "");
  if (/SQLSTATE|Column not found|Unknown column|database|mysql|SQL:/i.test(e)) {
    return "Server penyedia lagi gangguan (database-nya error). Coba lagi nanti ya — admin sudah dikabari.";
  }
  if (/tidak bisa hubungi|Failed to fetch|network|timeout|ECONN/i.test(e)) {
    return "Tidak bisa hubungi server penyedia. Coba lagi sebentar lagi ya.";
  }
  if (/saldo|balance|insufficient/i.test(e)) {
    return "Saldo reseller admin kurang. Hubungi admin ya.";
  }
  return e.length > 200 ? e.slice(0, 200) + "…" : e;
}

// Kirim pesan gagal: admin lihat error mentah (butuh buat lapor ke
// penyedia), pembeli biasa lihat versi yang dimengerti + admin dikabari
// error mentahnya.
async function kabariGagal(env, chatId, judul, error) {
  // Error mentah penyedia (mis. dump SQL) bisa sangat panjang — potong
  // jadi maks. 500 karakter supaya chat admin tetap enak dibaca; inti
  // diagnosanya (jenis error + kolom/tabel) ada di awal pesan.
  const mentah = String(error || "");
  const ringkas = mentah.length > 500 ? mentah.slice(0, 500) + "\u2026 (dipotong)" : mentah;
  if (String(chatId) === String(env.ADMIN_CHAT_ID)) {
    await sendTelegram(env, chatId, judul + ": " + ringkas);
  } else {
    await sendTelegram(env, chatId, judul + ": " + pesanErrorPenyedia(error));
    // judul sudah mengandung kata "gagal" — jangan ditambah lagi.
    await kabariAdmin(env, chatId, "⚠️ " + judul + ": " + ringkas);
  }
}

async function buatOrder(env, chatId, kodePaket, protocol, customUsername, serverKode, from) {
  const paket = PAKET.find((p) => p.kode === kodePaket);
  if (!paket) return;
  const proto = (protocol || env.NADIA_PROTOCOL || "vless").toLowerCase();
  const server = SERVERS.find((x) => x.kode === serverKode) || SERVERS[0];
  // Username: pakai ketikan pembeli, kalau "-" / kosong diacak otomatis.
  const username = customUsername ||
    ("sdk" + Date.now().toString(36).toLowerCase() + Math.floor(Math.random() * 90 + 10)).slice(0, 20);
  // Nominal unik: harga + kode 10-99 (maks +Rp99) supaya tidak
  // ketukar antar pembeli — sengaja kecil biar tidak memberatkan
  // pembeli, terutama paket 1 hari (19 Nov 2026).
  const kodeUnik = 10 + Math.floor(Math.random() * 90);
  const nominalUnik = paket.harga + kodeUnik;
  const orderId = "ORD-" + Date.now().toString(36).toUpperCase();
  const order = {
    id: orderId, chatId, pembeli: namaPembeli(from),
    paket: paket.kode, namaPaket: paket.nama,
    protocol: proto, username, server: server.kode, serverNama: server.nama,
    serverId: server.serverId,
    harga: paket.harga, nominalUnik, status: "menunggu bayar",
    createdAt: Date.now(),
  };
  await env.ORDERS.put(orderId, JSON.stringify(order));
  await env.ORDERS.put("last:" + chatId, orderId);
  await sendTelegram(env, chatId,
    "Order " + orderId + " dibuat.\n\n" +
    paket.nama + " — Rp" + paket.harga.toLocaleString("id-ID") + "\n" +
    "Server: " + server.nama + "\n" +
    "Protokol: " + proto.toUpperCase() + "\n" +
    "Username: " + username + "\n" +
    "TOLONG BAYAR SESUAI NOMINAL HARGA YANG TERTERA: " +
    "Rp" + nominalUnik.toLocaleString("id-ID") + "\n\n" +
    "Scan QRIS DANA Bisnis SANDEKALA dengan nominal di atas. " +
    "Setelah bayar, admin akan cek pembayaranmu lalu config dikirim ke sini.\n" +
    "Order ini berlaku 30 menit.");
  await kabariAdmin(env, chatId,
    "🛒 Order baru " + orderId + " (menunggu bayar)\n" +
    "Pembeli: " + (order.pembeli || ("ID " + chatId)) + "\n" +
    "Paket: " + paket.nama + " — " + proto.toUpperCase() + " — " + server.nama + "\n" +
    "Username: " + username + " — bayar Rp" + nominalUnik.toLocaleString("id-ID") + "\n" +
    "Berlaku 30 menit. Kalau uang sudah masuk Dana, ketuk tombol Konfirmasi di bawah.",
    [[{ text: "✅ Konfirmasi Pembayaran", callback_data: "konfirmasi:" + orderId }]]);
  // Gambar QRIS: kirim fotonya kalau QRIS_IMAGE_URL sudah diisi di
  // Secrets Worker. Kalau belum diisi, jujur ke pembeli supaya dia
  // tidak menunggu gambar yang tidak akan datang.
  if (env.QRIS_IMAGE_URL) {
    await sendPhoto(env, chatId, env.QRIS_IMAGE_URL,
      "QRIS DANA Bisnis SANDEKALA — bayar Rp" + nominalUnik.toLocaleString("id-ID") +
      " (TOLONG BAYAR SESUAI NOMINAL HARGA YANG TERTERA). Order " + orderId);
  } else {
    await sendTelegram(env, chatId,
      "Catatan: gambar QRIS belum dipasang di bot ini — minta gambar QRIS ke admin dulu, lalu bayar sesuai nominal harga yang tertera di atas.");
  }
}

// Cari order pending dengan nominal yang sama (dari notif DANA).
async function findPendingOrderByAmount(env, amount) {
  const list = await env.ORDERS.list({ prefix: "ORD-" });
  for (const key of list.keys) {
    const order = await env.ORDERS.get(key.name, "json").catch(() => null);
    if (!order || order.status !== "menunggu bayar") continue;
    if (Date.now() - order.createdAt > ORDER_TTL_MS) continue;
    if (order.nominalUnik === amount) return order;
  }
  return null;
}

async function orderTerakhir(env, chatId) {
  const id = await env.ORDERS.get("last:" + chatId).catch(() => null);
  if (!id) return null;
  return env.ORDERS.get(id, "json").catch(() => null);
}

// Order dibayar -> buat akun / perpanjang di reseller -> kirim config.
// kind "renew": order ini perpanjangan akun lama (order.targetOrderId),
// jadi yang dipanggil endpoint /vpn/renew, bukan /vpn/order.
async function selesaikanOrder(env, orderId, order) {
  order.status = "paid";
  order.paidAt = Date.now();
  await env.ORDERS.put(orderId, JSON.stringify(order));
  const hasil = order.kind === "renew"
    ? await renewNadiaAccount(env, order)
    : await createResellerAccount(env, order);
  if (!hasil.ok) {
    // GAGAL buat akun: tandai "gagal" (bukan "paid") supaya
    // /konfirmasi bisa dipakai lagi untuk coba ulang setelah
    // masalah diperbaiki, dan callback MacroDroid tidak
    // memproses order ini dua kali.
    order.status = "gagal";
    order.error = hasil.error;
    await env.ORDERS.put(orderId, JSON.stringify(order));
    // GAGAL buat akun: jangan diam — kabari Asep supaya bisa tindak lanjut.
    await sendTelegram(env, env.ADMIN_CHAT_ID,
      "⚠️ Order " + orderId + " SUDAH DIBAYAR Rp" +
      order.nominalUnik.toLocaleString("id-ID") +
      " tapi gagal buat akun reseller: " + hasil.error +
      "\nCek saldo/API reseller, lalu ketuk tombol Konfirmasi Ulang di bawah setelah diperbaiki — atau refund manual ke pembeli.",
      [[{ text: "🔄 Konfirmasi Ulang", callback_data: "konfirmasi:" + orderId }]]);
    await sendTelegram(env, order.chatId,
      "Pembayaranmu sudah masuk, tapi pembuatan akun lagi gangguan. " +
      "Admin sudah dikabari, config akan dikirim secepatnya. " +
      "Order: " + orderId);
    return;
  }
  // Kalau API tidak mengembalikan tanggal exp, hitung dari durasi paket
  // supaya pembeli tetap tahu masa aktifnya.
  if (hasil.config && !hasil.config.includes("Berlaku sampai")) {
    const paket = PAKET.find((p) => p.kode === order.paket) || PAKET[0];
    const hari = paket.nadiaType === "week" ? 7 * paket.nadiaDuration : paket.nadiaType === "month" ? 30 * paket.nadiaDuration : paket.nadiaDuration;
    const dasar = order.kind === "renew" ? Date.now() : (order.createdAt || Date.now());
    hasil.config += "\n\nBerlaku sampai: " + formatExpired(new Date(dasar + hari * 86400000));
  }
  order.status = "selesai";
  if (order.kind === "renew") {
    // Perpanjang: perbarui order akun lama (nama paket + config).
    // Respons renew biasanya TIDAK membawa link (config tidak berubah,
    // hanya masa aktif bertambah) — jadi pakai config lama yang
    // tersimpan supaya pembeli tetap dapat link lengkapnya, cuma
    // tanggal exp-nya diperbarui dari respons renew.
    const target = await env.ORDERS.get(order.targetOrderId, "json").catch(() => null);
    let configKirim = hasil.config;
    if (target) {
      target.namaPaket = order.namaPaket;
      if (hasil.accountId && String(hasil.accountId) !== String(target.accountId)) target.accountId = String(hasil.accountId);
      if (hasil.config) {
        const adaLink = /^(vless|vmess|trojan|ss):\/\//im.test(hasil.config);
        target.config = adaLink || !target.config ? hasil.config : perbaruiExpDiConfig(target.config, hasil.config);
        configKirim = target.config;
      }
      await env.ORDERS.put(order.targetOrderId, JSON.stringify(target));
    }
    await env.ORDERS.put(orderId, JSON.stringify(order));
    await kabariAdmin(env, order.chatId,
      "✅ Perpanjang berhasil: " + orderId + "\n" +
      "Pembeli: " + (order.pembeli || ("ID " + order.chatId)) + " — akun " + (order.username || "") +
      " — " + order.namaPaket + " — Rp" + order.nominalUnik.toLocaleString("id-ID") + " sudah masuk.");
    if (configKirim) await kirimConfig(env, order.chatId,
      "✅ Akun " + (order.username || "") + " berhasil diperpanjang (" + order.namaPaket + ").\n\nConfig terbaru:", configKirim);
    else await sendTelegram(env, order.chatId,
      "✅ Akun " + (order.username || "") + " berhasil diperpanjang (" + order.namaPaket + ").");
    return;
  }
  // Akun baru: simpan account_id Nadia (UUID) — WAJIB untuk
  // Perpanjang / Pindah Server / Ganti Protokol / Perbaiki.
  if (hasil.accountId) order.accountId = hasil.accountId;
  if (hasil.config) order.config = hasil.config;
  await env.ORDERS.put(orderId, JSON.stringify(order));
  await tambahkanAkunUser(env, order.chatId, orderId);
  await kabariAdmin(env, order.chatId,
    "✅ Terjual: " + orderId + "\n" +
    "Pembeli: " + (order.pembeli || ("ID " + order.chatId)) + "\n" +
    "Akun: " + (order.username || "") + " — " + order.namaPaket + " — " + (order.protocol || "?").toUpperCase() +
    " — " + (order.serverNama || order.server || "?") + "\n" +
    "Rp" + order.nominalUnik.toLocaleString("id-ID") + " sudah masuk, config sudah dikirim ke pembeli.");
  await kirimConfig(env, order.chatId,
    "✅ Pembayaran diterima! Ini config " + order.namaPaket + " kamu:", hasil.config,
    "Masa aktif mulai hari ini. Selamat memakai!", tombolKelola(orderId));
}

// Kirim config akun ke pembeli dalam blok <pre> supaya Telegram
// menampilkan tombol SALIN KODE — pembeli tinggal tap untuk menyalin
// link/config ke v2rayNG. Hanya dipakai untuk config akun, bukan
// untuk menu/daftar server (di sana <pre> dihapus atas permintaan
// Asep 19 Nov 2026 karena tombol SALIN KODE mengganggu).
async function kirimConfig(env, chatId, pembuka, config, penutup, keyboard, messageId) {
  // Pengaman terakhir: kalau config masih berupa object (parser luput),
  // ubah dulu jadi teks — jangan sampai "[object Object]" kekirim lagi.
  const teksConfig = typeof config === "string" ? config : ubahConfigJadiTeks(config);
  let isi;
  if (teksConfig.includes("◆ ")) {
    // Config SSH berbentuk seksi — nilainya sudah dibungkus <code>
    // oleh renderSSH (ketuk nilai = langsung menyalin), jadi kirim
    // apa adanya tanpa <pre> (kalau dibungkus <pre>, <code>-nya mati
    // dan yang bisa disalin cuma seluruh blok sekaligus).
    isi = teksConfig;
  } else if (/^(vless|vmess|trojan|ss):\/\//im.test(teksConfig)) {
    // Beberapa link: tiap link dapat blok <pre> sendiri supaya tombol
    // SALIN KODE-nya per link; nilai info akun (Username, UUID, exp)
    // dibungkus <code> supaya bisa diketuk untuk menyalin.
    isi = teksConfig.split("\n").map((b) => {
      const t = b.trim();
      if (/^(vless|vmess|trojan|ss):\/\//i.test(t)) return "<pre>" + escapeHtml(t) + "</pre>";
      if (t === "") return "";
      const m = t.match(/^([^:]+):\s*(.+)$/);
      if (m) return escapeHtml(m[1]) + ": <code>" + escapeHtml(m[2]) + "</code>";
      return escapeHtml(b);
    }).join("\n").trim();
  } else {
    isi = "<pre>" + escapeHtml(teksConfig || "") + "</pre>";
  }
  const html = escapeHtml(pembuka) + "\n\n" + isi + (penutup ? "\n\n" + escapeHtml(penutup) : "");
  if (messageId) await editHtml(env, chatId, messageId, html, keyboard);
  else await sendHtml(env, chatId, html, keyboard);
}

// Tombol kelola akun (pembeli & admin): Perpanjang, Pindah Server,
// Ganti Protokol, Perbaiki Akun, Hapus.
function tombolKelola(orderId) {
  return [
    [{ text: "🔄 Perpanjang", callback_data: "kelola:perpanjang:" + orderId }],
    [{ text: "🔀 Pindah Server", callback_data: "kelola:pindah:" + orderId }],
    [{ text: "🔁 Ganti Protokol", callback_data: "kelola:ganti:" + orderId }],
    [{ text: "🛠️ Perbaiki Akun", callback_data: "kelola:perbaiki:" + orderId }],
    [{ text: "🗑️ Hapus", callback_data: "kelola:hapus:" + orderId }],
  ];
}

async function tambahkanAkunUser(env, chatId, orderId) {
  const daftar = await env.ORDERS.get("akun:" + chatId, "json").catch(() => null) || [];
  if (!daftar.includes(orderId)) daftar.push(orderId);
  await env.ORDERS.put("akun:" + chatId, JSON.stringify(daftar));
}

async function daftarAkunUser(env, chatId) {
  const daftar = await env.ORDERS.get("akun:" + chatId, "json").catch(() => null) || [];
  const hasil = [];
  for (const id of daftar) {
    const o = await env.ORDERS.get(id, "json").catch(() => null);
    if (o && o.status === "selesai") hasil.push(o);
  }
  return hasil;
}

// ================= API RESELLER — NADIA VPN STORE =================
// Endpoint (dari screenshot dashboard Asep, 19 Nov 2026):
//   POST {RESELLER_API_URL}/vpn/order
//   Header: Authorization: Bearer <RESELLER_API_KEY>
//           Accept: application/json
//           Content-Type: application/json
//   Body: {"server_id","protocol","type","duration","username"}
// Balasan sukses Nadia belum pernah dilihat langsung (belum ada
// contoh respons di screenshot), jadi fungsi ini membaca respons
// secara fleksibel: cari config/link di beberapa tempat umum
// (data.config, data.link, data.vless, dll). Kalau tidak ada,
// kirim isi data apa adanya supaya pembeli/admin tetap bisa pakai.
async function createResellerAccount(env, order) {
  const base = (env.RESELLER_API_URL || "https://www.nadiavpn.web.id/api/v1").replace(/\/$/, "");
  if (!env.RESELLER_API_KEY) {
    return { ok: false, error: "API penyedia belum disetel (RESELLER_API_KEY kosong)." };
  }
  // Server: pakai pilihan pembeli di order; kalau order lama (sebelum
  // ada pilihan server), fallback ke NADIA_SERVER_ID di Secrets.
  const serverId = order.serverId || env.NADIA_SERVER_ID;
  if (!serverId) {
    return { ok: false, error: "Server belum dipilih." };
  }
  const paket = PAKET.find((p) => p.kode === order.paket) || PAKET[0];
  const protocol = (order.protocol || env.NADIA_PROTOCOL || "vless").toLowerCase();
  const username = order.username ||
    ("sdk" + order.id.replace(/[^A-Za-z0-9]/g, "").toLowerCase() + Math.floor(Math.random() * 90 + 10)).slice(0, 20);
  try {
    const r = await fetch(base + "/vpn/order", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.RESELLER_API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        server_id: serverId,
        protocol,
        type: paket.nadiaType,
        duration: paket.nadiaDuration,
        username,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j.message || j.error || ("HTTP " + r.status);
      return { ok: false, error: "Penyedia: " + msg + " (saldo / server / token — cek dashboard penyedia)" };
    }
    if (j.success === false) {
      return { ok: false, error: "Penyedia: " + (j.message || j.error || "order ditolak") };
    }
    const d = j.data || j;
    // account_id Nadia (UUID akun) — simpan untuk renew/migrate/
    // change-protocol/details. Letaknya bisa beda-beda, cari di
    // beberapa tempat umum (termasuk di dalam `account` / `data`).
    const accountId = cariAccountId(d);
    const hasil = ambilConfigDariData(d);
    // Tambah baris Username kalau hasil parse belum menyebutnya
    // (mis. kalau config berupa link vless:// saja).
    const config = hasil.includes("Username:") ? hasil : "Username: " + username + "\n" + hasil;
    return { ok: true, config, accountId };
  } catch (e) {
    return { ok: false, error: "Tidak bisa hubungi API penyedia." };
  }
}

// ---- Panggilan generik ke API Nadia (POST JSON + Bearer) ----
async function nadiaPost(env, path, body) {
  const base = (env.RESELLER_API_URL || "https://www.nadiavpn.web.id/api/v1").replace(/\/$/, "");
  if (!env.RESELLER_API_KEY) return { ok: false, error: "RESELLER_API_KEY belum diisi." };
  try {
    const r = await fetch(base + path, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.RESELLER_API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: "Penyedia: " + (j.message || j.error || ("HTTP " + r.status)) };
    if (j.success === false) return { ok: false, error: "Penyedia: " + (j.message || j.error || "ditolak") };
    return { ok: true, data: j.data || j };
  } catch (e) {
    return { ok: false, error: "Tidak bisa hubungi API penyedia." };
  }
}

// ---- Panggilan generik ke API Nadia (GET JSON + Bearer) ----
async function nadiaGet(env, path) {
  const base = (env.RESELLER_API_URL || "https://www.nadiavpn.web.id/api/v1").replace(/\/$/, "");
  if (!env.RESELLER_API_KEY) return { ok: false, error: "RESELLER_API_KEY belum diisi." };
  try {
    const r = await fetch(base + path, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + env.RESELLER_API_KEY,
        "Accept": "application/json",
      },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: "Penyedia: " + (j.message || j.error || ("HTTP " + r.status)) };
    if (j.success === false) return { ok: false, error: "Penyedia: " + (j.message || j.error || "ditolak") };
    return { ok: true, data: j.data || j };
  } catch (e) {
    return { ok: false, error: "Tidak bisa hubungi API penyedia." };
  }
}

// Cari account_id Nadia secara KETAT — hanya kunci `account_id` /
// `accountId` (rekursif ke dalam `account`/`data`/`config`). Sengaja
// TIDAK memakai `id` / `uuid`: `uuid` itu UUID akun VPN-nya (bukan ID
// akun Nadia) dan `id` bisa jadi ID order — kalau salah satu dari itu
// tersimpan sebagai accountId, semua panggilan details/renew/migrate
// akan ditolak penyedia dengan "account id is invalid".
function cariAccountIdKetat(d) {
  if (!d || typeof d !== "object") return null;
  const langsung = d.account_id ?? d.accountId ?? null;
  if (typeof langsung === "string" && langsung) return langsung;
  if (typeof langsung === "number") return String(langsung);
  for (const k of ["account", "data", "config"]) {
    const v = cariAccountIdKetat(d[k]);
    if (v) return v;
  }
  return null;
}

// Pulihkan account_id yang sudah basi: ambil daftar akun dari penyedia
// (GET /vpn/accounts), cocokkan username, kembalikan ID terbarunya.
// Dipakai Perbaiki Akun kalau details ditolak "account id is invalid"
// — mis. karena Ganti Protokol membuat akun baru dengan ID baru di
// sisi penyedia, sementara bot masih menyimpan ID lama.
async function pulihkanAccountId(env, target) {
  const r = await nadiaGet(env, "/vpn/accounts");
  if (!r.ok) return null;
  const daftar = Array.isArray(r.data) ? r.data : (r.data?.accounts || r.data?.data || r.data?.list || []);
  if (!Array.isArray(daftar)) return null;
  const uname = String(target.username || "").toLowerCase();
  if (!uname) return null;
  const ketemu = daftar.find((a) => a && String(a.username || a.user || "").toLowerCase() === uname);
  if (!ketemu) return null;
  // Di daftar akun, `id` itu ID akun itu sendiri (bukan order) — aman.
  // `uuid` tetap tidak dipakai (itu UUID VPN, bukan ID akun Nadia).
  const id = ketemu.account_id ?? ketemu.accountId ?? ketemu.id ?? null;
  return id ? String(id) : null;
}

// Format object Port jadi grid yang rapih & tanpa duplikat.
// Respons ganti-protokol SSH (20 Nov 2026) mengembalikan ~20 kunci port
// dengan nilai yang sama berulang (ws_tls == tls, ws_http == none,
// openvpn_tcp == ovpntcp, badvpn == udpgw, ...) — kalau dirender mentah
// jadi satu baris raksasa yang tidak enak dibaca. Di sini nilai yang
// sama digabung (label pertama yang dipakai), hasilnya grid seperti di
// web Nadia (WS TLS, WS NON-TLS, ANY, OPENSSH, DROPBEAR, ...).
function formatPort(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "object") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  // Kunci dinormalisasi (huruf kecil, tanpa spasi/garis bawah) supaya
  // tahan terhadap dua bentuk kunci yang beredar: "ws_tls" (respons API)
  // maupun "WS TLS" (hasil parse ulang dari grid yang sudah dirender).
  const LABEL = {
    wstls: "WS TLS", tls: "WS TLS", wshttp: "WS NON-TLS", none: "WS NON-TLS",
    any: "ANY", openssh: "OPENSSH", ssh: "SSH", dropbear: "DROPBEAR",
    squid: "SQUID", proxy: "SQUID", badvpn: "UDPGW", udpgw: "UDPGW",
    openvpntcp: "OVPN TCP", ovpntcp: "OVPN TCP", openvpnudp: "OVPN UDP", ovpnudp: "OVPN UDP",
    slowdns: "SLOWDNS", udpcustom: "UDP CUSTOM", sshohp: "SSH OHP", ovpnohp: "OVPN OHP",
  };
  const perNilai = new Map();
  for (const [k, val] of Object.entries(v)) {
    const nilai = Array.isArray(val) ? val.join(", ") : (typeof val === "object" ? JSON.stringify(val) : String(val)).trim();
    if (!nilai) continue;
    if (perNilai.has(nilai)) continue; // duplikat nilai — tampil sekali saja
    const label = LABEL[String(k).toLowerCase().replace(/[^a-z0-9]/g, "")] || String(k).toUpperCase();
    perNilai.set(nilai, label + " : " + nilai);
  }
  if (!perNilai.size) return null;
  return [...perNilai.values()].join("\n");
}

// Cari domain/host akun — bisa di root, di dalam `config`/`data`/
// `account`, atau di dalam object `server` (respons details memakai
// server: {server_id, name, domain}). Dipakai untuk template payload
// WebSocket SSH.
function cariDomain(d) {
  if (!d || typeof d !== "object") return null;
  const langsung = cariField(d, ["domain", "hostname", "host_domain", "host"]);
  if (langsung) return langsung;
  const srv = (d.server && typeof d.server === "object") ? d.server : ((d.host && typeof d.host === "object") ? d.host : null);
  if (srv && (srv.domain || srv.host)) return srv.domain || srv.host;
  for (const k of ["config", "data", "account"]) {
    const v = cariDomain(d[k]);
    if (v) return v;
  }
  return null;
}

// Port pertama untuk sebuah kunci port (mis. ws_http -> 80,
// ws_tls -> 443). Dipakai untuk seksi "Format Account" (format
// host:port@user:pass ala bot referensi).
function portPertama(d, kunciList) {
  const raw = d?.port ?? d?.config?.port ?? d?.data?.port ?? d?.account?.port ?? null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const norm = {};
  for (const [k, v] of Object.entries(raw)) norm[String(k).toLowerCase().replace(/[^a-z0-9]/g, "")] = v;
  for (const k of kunciList) {
    const v = norm[String(k).toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (Array.isArray(v) && v.length) return String(v[0]);
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return null;
}

// Satu seksi "Payload WebSocket" (template standar Nadia, host diisi
// dari domain akun). Dipakai renderSSH dan sebagai fallback di
// ambilConfigDariData.
// Satu seksi "Payload WebSocket" — tiap baris GET dibungkus <code>
// supaya pembeli bisa mengetuknya untuk langsung menyalin (Telegram
// menyalin isi <code> saat diketuk).
function bagianPayload(domain) {
  const garis = "────────────────────";
  const item = (judul, get) => judul + " :\n<code>" + escapeHtml(get) + "</code>";
  return "◆ Payload WebSocket\n" + garis + "\n" +
    item("TLS", "GET /worryfree/ssh HTTP/1.1[crlf]Host: " + domain + "[crlf]Upgrade: websocket[crlf][crlf]") + "\n\n" +
    item("NON-TLS", "GET /worryfree/ssh HTTP/1.1[crlf]Host: " + domain + "[crlf]Upgrade: websocket[crlf][crlf]") + "\n\n" +
    item("CDN", "GET / HTTP/1.1[crlf]Host: [host_port][crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]") + "\n\n" +
    item("WITH PATH", "GET /worryfree/ssh HTTP/1.1[crlf]Host: BUG[crlf]User-Agent: [ua][crlf]Upgrade: websocket[crlf][crlf]");
}

// Render config SSH rapih per seksi ala bot referensi (Informasi Akun /
// Domain & Koneksi / Format Account / Payload WebSocket / Masa Aktif),
// dalam satu blok <pre> supaya rata. `entri` = [{label, nilai}] dari
// susunBaris; `o` = object respons mentah (untuk port pertama).
function renderSSH(entri, o) {
  // Setiap NILAI dibungkus <code> — di Telegram, mengetuk <code>
  // langsung menyalin isinya (username, password, domain, port,
  // pubkey, format account, payload). Label & garis pemisah tetap
  // teks biasa. Nilai di-escape dulu supaya aman di HTML.
  const peta = new Map(entri.map((e) => [e.label, e.nilai]));
  const garis = "────────────────────";
  const seksi = [];
  const kode = (v) => "<code>" + escapeHtml(String(v)) + "</code>";
  const baris = (label, v) => label + " : " + kode(v);
  const tambah = (judul, daftar) => {
    const isi = daftar.filter((b) => b !== null && b !== undefined && b !== "");
    if (isi.length) seksi.push("◆ " + judul + "\n" + garis + "\n" + isi.join("\n"));
  };
  tambah("Informasi Akun", [
    peta.has("Username") ? baris("Username", peta.get("Username")) : null,
    peta.has("Password") ? baris("Password", peta.get("Password")) : null,
    peta.has("UUID") ? baris("UUID", peta.get("UUID")) : null,
  ]);
  const serverVal = peta.get("Server") || null;
  const domain = peta.get("Host / Domain") || (serverVal && !/^\d+\.\d+\.\d+\.\d+$/.test(serverVal) ? serverVal : null);
  const koneksi = [];
  if (domain) koneksi.push(baris("Domain", domain));
  if (serverVal) koneksi.push(baris("Server", serverVal));
  if (peta.has("Name Server")) koneksi.push(baris("Ns-Domain", peta.get("Name Server")));
  if (peta.has("Public Key")) koneksi.push(baris("Pubkey", peta.get("Public Key")));
  if (domain) koneksi.push(baris("DNS", domain));
  if (peta.has("Squid Proxy")) koneksi.push(baris("Squid Proxy", peta.get("Squid Proxy")));
  if (peta.has("HTTP Custom")) koneksi.push(baris("HTTP Custom", peta.get("HTTP Custom")));
  if (peta.has("OpenVPN")) koneksi.push(baris("OpenVPN", peta.get("OpenVPN")));
  if (peta.has("SNI")) koneksi.push(baris("SNI", peta.get("SNI")));
  if (peta.has("Path")) koneksi.push(baris("Path", peta.get("Path")));
  if (peta.has("Port")) {
    const grid = peta.get("Port");
    if (grid.includes("\n")) {
      const gridKode = grid.split("\n").map((l) => {
        const m = l.match(/^(.+?)\s*:\s*(.*)$/);
        return m ? m[1].trim() + " : " + kode(m[2].trim()) : escapeHtml(l);
      }).join("\n");
      koneksi.push("Port :\n" + gridKode);
    } else {
      koneksi.push(baris("Port", grid));
    }
  }
  tambah("Domain & Koneksi", koneksi);
  const user = peta.get("Username"), pass = peta.get("Password");
  const wsPort = portPertama(o, ["ws_http", "none", "ws", "wsnontls"]);
  const tlsPort = portPertama(o, ["ws_tls", "tls"]);
  if (domain && user && pass && (wsPort || tlsPort)) {
    const fmt = [];
    if (wsPort) fmt.push("WS :\n" + kode(domain + ":" + wsPort + "@" + user + ":" + pass));
    if (tlsPort) fmt.push("TLS :\n" + kode(domain + ":" + tlsPort + "@" + user + ":" + pass));
    tambah("Format Account", fmt);
  }
  if (domain) seksi.push(bagianPayload(domain));
  const lim = peta.get("Limit Device");
  tambah("Masa Aktif", [
    peta.has("Berlaku sampai") ? baris("Expires", peta.get("Berlaku sampai")) : null,
    peta.has("Sisa waktu") ? baris("Sisa waktu", peta.get("Sisa waktu")) : null,
    lim ? baris("IP Limit", String(lim).replace(/ IP$/, "") + " Device") : null,
    peta.has("Limit IP & Kuota") ? baris("IP Limit", peta.get("Limit IP & Kuota")) : null,
    peta.has("Kuota") ? baris("Kuota", peta.get("Kuota")) : null,
  ]);
  return seksi.join("\n\n");
}

// Ubah nilai config apa pun (string / object) jadi teks yang bisa
// dikirim ke pembeli. Nadia ternyata mengembalikan `config` sebagai
// OBJECT (bukan string/link) — kalau object itu langsung ditempel ke
// string, hasilnya "[object Object]" (kejadian 19 Nov 2026, order
// ORD-MWNS0YGB: akun sudah jadi di web Nadia tapi config yang sampai
// ke pembeli cuma "Username: testlagi\n[object Object]").
function ubahConfigJadiTeks(x) {
  if (typeof x === "string") return x;
  if (x && typeof x === "object") {
    // 1) Cari link config (vless://, vmess://, trojan://, ss://)
    // atau isi field config/link — rekursif sampai 2 level ke dalam.
    const cariLink = (o, dalam) => {
      if (typeof o === "string") return /^(vless|vmess|trojan|ss):\/\//i.test(o) ? o : null;
      if (!o || typeof o !== "object" || dalam > 2) return null;
      for (const k of ["config", "link", "vless", "vmess", "trojan", "url", "ss"]) {
        if (typeof o[k] === "string" && o[k]) return o[k];
      }
      for (const k of Object.keys(o)) {
        const v = cariLink(o[k], dalam + 1);
        if (v) return v;
      }
      return null;
    };
    const link = cariLink(x, 0);
    if (link) return link;
    // 2) Tidak ada link: susun baris-baris dari field yang dikenal.
    const susunBaris = (o) => {
      if (!o || typeof o !== "object") return [];
      // Nilai bisa berupa object (mis. Port berisi beberapa port:
      // {ssh: 22, ssl: 443, ws: 80}) — tampilkan isinya, jangan
      // sampai jadi "[object Object]" (kejadian 20 Nov 2026, ganti
      // protokol ke SSH: "Port: [object Object]").
      const nilaiTeks = (v) => {
        if (v === undefined || v === null || v === "") return null;
        if (typeof v === "object") {
          if (Array.isArray(v)) {
            const isi = v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
            return isi || null;
          }
          const entri = Object.entries(v).map(([k, val]) => k + ": " + (typeof val === "object" ? JSON.stringify(val) : String(val)));
          return entri.length ? entri.join(", ") : null;
        }
        return v;
      };
      const ambil = (kunci) => {
        for (const k of kunci) {
          const v = nilaiTeks(o[k]);
          if (v !== null) return v;
        }
        return null;
      };
      const baris = [];
      const cetak = (label, v) => { if (v !== null && v !== undefined && v !== "") baris.push({ label, nilai: String(v) }); };
      cetak("Username", ambil(["username", "user", "name"]));
      cetak("Password", ambil(["password", "pass"]));
      cetak("UUID", ambil(["uuid"]));
      // `server` bisa berupa OBJECT {server_id, name, domain}
      // (respons details 20 Nov 2026) — ambil nama & domainnya, jangan
      // tampilkan server_id internalnya.
      const srvObj = (o.server && typeof o.server === "object" && !Array.isArray(o.server)) ? o.server
        : ((o.host && typeof o.host === "object" && !Array.isArray(o.host)) ? o.host : null);
      const serverVal = srvObj ? (srvObj.name || srvObj.domain || null) : ambil(["server", "host", "address", "ip"]);
      cetak("Server", serverVal);
      const domainVal = (srvObj && (srvObj.domain || srvObj.host)) || ambil(["domain", "hostname", "host_domain", "host"]);
      if (domainVal && String(domainVal) !== String(serverVal)) cetak("Host / Domain", domainVal);
      const portTeks = formatPort(o.port ?? o.ports ?? null);
      if (portTeks !== null) baris.push({ label: "Port", nilai: portTeks });
      cetak("Squid Proxy", ambil(["squid", "proxy", "http_proxy", "squid_proxy"]));
      // HTTP Custom dari API bentuknya "host:1-65535@user:pass" — bagian
      // @user:pass sudah ada di baris Username/Password di atas, jadi
      // tampilkan host:port-nya saja supaya rapih.
      const hcRaw = ambil(["http_custom", "httpcustom"]);
      if (hcRaw !== null) {
        const hcBersih = String(hcRaw).includes("@") ? String(hcRaw).split("@")[0] : hcRaw;
        cetak("HTTP Custom", hcBersih);
      }
      cetak("OpenVPN", ambil(["ovpn", "openvpn", "ovpn_url", "openvpn_url", "config_url", "ovpn_config"]));
      cetak("Name Server", ambil(["nameserver", "name_server", "ns", "dns_server", "dns", "nameservers", "slowdns", "ns_server"]));
      cetak("Public Key", ambil(["public_key", "pubkey", "publickey"]));
      const limitIp = ambil(["limit_ip", "ip_limit", "max_ip", "max_devices", "device_limit", "max_device", "devices", "limit"]);
      const kuota = ambil(["quota", "kuota", "data_quota", "quota_limit", "limit_quota"]);
      if (limitIp !== null && kuota !== null) {
        baris.push({ label: "Limit IP & Kuota", nilai: limitIp + " Dev / " + (/unlimit/i.test(String(kuota)) ? "Unli" : String(kuota)) });
      } else if (limitIp !== null) {
        baris.push({ label: "Limit Device", nilai: limitIp + " IP" });
      } else if (kuota !== null) {
        baris.push({ label: "Kuota", nilai: (/unlimit/i.test(String(kuota)) ? "Unli" : String(kuota)) });
      }
      cetak("SNI", ambil(["sni", "server_name"]));
      cetak("Path", ambil(["path"]));
      const expRaw = ambil(["expired_at", "expires_at", "expired", "expiry"]);
      if (expRaw) {
        baris.push({ label: "Berlaku sampai", nilai: formatExpired(expRaw) });
        const sisa = sisaWaktu(expRaw);
        if (sisa) baris.push({ label: "Sisa waktu", nilai: sisa });
      }
      return baris;
    };
    let entri = susunBaris(x);
    if (!entri.length && x.account && typeof x.account === "object") entri = susunBaris(x.account);
    if (entri.length) {
      // SSH (punya Password): render rapih per seksi; yang lain tetap
      // daftar baris biasa.
      if (entri.some((e) => e.label === "Password")) return renderSSH(entri, x);
      return entri.map((e) => (e.nilai.includes("\n") ? e.label + ":\n" + e.nilai : e.label + ": " + e.nilai)).join("\n");
    }
    // 3) Terakhir: JSON mentah supaya info tidak hilang.
    return JSON.stringify(x).slice(0, 1500);
  }
  return String(x ?? "");
}

// Kumpulkan SEMUA link config (vless://, vmess://, trojan://, ss://)
// yang ada di respons API — rekursif, tanpa duplikat. Web Nadia
// menampilkan banyak varian (TLS, NONE, GRPC, UPTLS, UPNTLS + versi
// CloudFront); bot sekarang mengirim semuanya, bukan cuma satu.
function kumpulkanLink(x, dalam = 0, hasil = new Set()) {
  if (typeof x === "string") {
    if (/^(vless|vmess|trojan|ss):\/\//i.test(x.trim())) hasil.add(x.trim());
    return hasil;
  }
  if (!x || typeof x !== "object" || dalam > 3) return hasil;
  for (const k of Object.keys(x)) kumpulkanLink(x[k], dalam + 1, hasil);
  return hasil;
}

// Label varian dari isi link-nya sendiri (seperti label di web Nadia).
function labelLink(link) {
  const m = link.match(/^(vless|vmess|trojan|ss):\/\//i);
  const scheme = m ? m[1].toLowerCase() : "";
  if (scheme === "vmess") return "VMESS";
  if (scheme === "ss") return "SS";
  try {
    const u = new URL(link);
    const p = u.searchParams;
    const type = (p.get("type") || "ws").toLowerCase();
    const sec = (p.get("security") || "").toLowerCase();
    const cf = u.hostname.includes("cloudfront.net");
    let l;
    if (scheme === "trojan") l = sec === "tls" ? "TROJAN TLS" : "TROJAN";
    else if (type === "grpc") l = "GRPC";
    else if (type === "httpupgrade") l = sec === "tls" ? "UPTLS" : "UPNTLS";
    else if (sec === "tls") l = "TLS";
    else if (sec === "none") l = "NONE";
    else l = type.toUpperCase();
    return cf ? "CF " + l : l;
  } catch (e) {
    return scheme.toUpperCase() || "CONFIG";
  }
}

// Urutan seperti di web: varian langsung dulu (TLS, NONE, GRPC,
// UPTLS, UPNTLS), baru versi CloudFront dengan urutan yang sama.
function urutkanLink(links) {
  const rank = (l) => {
    const lab = labelLink(l);
    const kunci = lab.replace(/^CF /, "");
    const dasar = { "TLS": 0, "NONE": 1, "GRPC": 2, "UPTLS": 3, "UPNTLS": 4, "TROJAN TLS": 0, "TROJAN": 1, "VMESS": 0, "SS": 0 };
    return (lab.startsWith("CF ") ? 10 : 0) + (dasar[kunci] ?? 5);
  };
  return links.slice().sort((a, b) => rank(a) - rank(b));
}

// Cari nilai field (string/angka) di respons, termasuk di dalam
// `account` / `data` / `config` (respons tiap endpoint beda-beda).
function cariField(d, kunci, dalam = 0) {
  if (!d || typeof d !== "object" || dalam > 2) return null;
  for (const k of kunci) {
    const v = d[k];
    if (v !== undefined && v !== null && v !== "" && typeof v !== "object") return v;
  }
  for (const k of ["account", "data", "config"]) {
    const v = cariField(d[k], kunci, dalam + 1);
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

// Cari tanggal expired di respons (nama field-nya bisa macam-macam).
function cariExpired(d, dalam = 0) {
  if (!d || typeof d !== "object" || dalam > 2) return null;
  for (const k of ["expired_at", "expires_at", "expired", "expiry", "expire_at", "end_date", "valid_until", "endAt"]) {
    if (d[k] !== undefined && d[k] !== null && d[k] !== "") return d[k];
  }
  for (const k of ["account", "data"]) {
    const v = cariExpired(d[k], dalam + 1);
    if (v) return v;
  }
  return null;
}

function parseTanggal(v) {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === "string") {
    const t = v.trim();
    // Tanpa info zona waktu (mis. "2026-11-21 23:42:00") — API Nadia
    // mengembalikan jam WIB; anggap WIB (UTC+7), bukan UTC.
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +(m[6] || 0)));
    }
    const d = new Date(t.replace(" ", "T"));
    if (!isNaN(d)) return d;
  }
  return null;
}

// "2026-11-20T16:42:00Z" -> "20 Nov 2026, 23:42 WIB"
function formatExpired(v) {
  const d = parseTanggal(v);
  if (!d) return String(v);
  return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(".", ":") + " WIB";
}

function sisaWaktu(v) {
  const d = parseTanggal(v);
  if (!d) return null;
  const ms = d - Date.now();
  if (ms <= 0) return "habis";
  const jam = Math.floor(ms / 3600000);
  const menit = Math.floor((ms % 3600000) / 60000);
  if (jam >= 24) return Math.floor(jam / 24) + " hari " + (jam % 24) + " jam";
  return jam + " jam " + menit + " menit";
}

// Info akun ala kartu di web Nadia: username, UUID, server, domain
// CloudFront, ISP, lokasi, limit IP & kuota, tanggal exp + sisa waktu.
// Hanya baris yang datanya ada di respons yang ditampilkan; UUID &
// server diambil dari link config kalau field-nya tidak ada.
function susunInfoAkun(d, links) {
  const baris = [];
  const cetak = (label, v) => { if (v !== null && v !== undefined && v !== "") baris.push(label + ": " + v); };
  let uuid = null;
  let namaServer = cariField(d, ["server", "host", "domain", "address"]);
  let cfDomain = cariField(d, ["cloudfront", "cf_domain", "cf", "cloudfront_domain"]);
  let username = cariField(d, ["username", "user"]);
  if (links && links.length) {
    for (const l of links) {
      try {
        const u = new URL(l);
        if (!uuid && u.username) uuid = u.username;
        if (!username && u.hash) username = u.hash.slice(1);
        if (!namaServer && !u.hostname.includes("cloudfront.net")) namaServer = u.hostname;
        if (!cfDomain && u.hostname.includes("cloudfront.net")) cfDomain = u.hostname;
      } catch (e) { /* abaikan link yang tidak bisa diurai */ }
      if (uuid && username && namaServer && cfDomain) break;
    }
  }
  if (!uuid) uuid = cariField(d, ["uuid"]);
  cetak("Username", username);
  cetak("UUID", uuid);
  cetak("Server", namaServer);
  cetak("Domain CloudFront", cfDomain);
  cetak("ISP Server", cariField(d, ["isp", "isp_server", "provider"]));
  cetak("Lokasi", cariField(d, ["location", "lokasi", "city", "kota"]));
  const limitIp = cariField(d, ["limit_ip", "ip_limit", "max_ip", "max_devices", "device_limit", "max_device", "devices", "limit"]);
  const kuota = cariField(d, ["quota", "kuota", "data_quota", "quota_limit", "limit_quota"]);
  const portRawInfo = d.port ?? d.ports ?? d.config?.port ?? d.data?.port ?? d.account?.port ?? null;
  const portTeksInfo = formatPort(portRawInfo);
  if (portTeksInfo !== null) {
    if (portTeksInfo.includes("\n")) baris.push("Port:\n" + portTeksInfo);
    else baris.push("Port: " + portTeksInfo);
  }
  if (limitIp !== null && kuota !== null) {
    const k = /unlimit/i.test(String(kuota)) ? "Unli" : String(kuota);
    baris.push("Limit IP & Kuota: " + limitIp + " Dev / " + k);
  } else if (limitIp !== null) {
    baris.push("Limit Device: " + limitIp + " IP");
  } else if (kuota !== null) {
    baris.push("Kuota: " + (/unlimit/i.test(String(kuota)) ? "Unli" : String(kuota)));
  }
  const exp = cariExpired(d);
  if (exp) {
    cetak("Berlaku sampai", formatExpired(exp));
    cetak("Sisa waktu", sisaWaktu(exp));
  }
  return baris.join("\n");
}

// Ambil baris "Berlaku sampai" + "Sisa waktu" dari config baru, lalu
// ganti baris yang sama di config lama (dipakai saat renew: link tidak
// berubah, hanya tanggal exp yang bertambah).
function perbaruiExpDiConfig(configLama, configBaru) {
  const ambilBaris = (teks, label) => {
    const i = teks.indexOf(label + ":");
    if (i < 0) return null;
    const akhir = teks.indexOf("\n", i);
    return teks.slice(i, akhir < 0 ? teks.length : akhir);
  };
  const gantiBaris = (teks, label, barisBaru) => {
    const i = teks.indexOf(label + ":");
    if (i < 0) return null;
    const akhir = teks.indexOf("\n", i);
    return teks.slice(0, i) + barisBaru + teks.slice(akhir < 0 ? teks.length : akhir);
  };
  const expBaru = ambilBaris(configBaru, "Berlaku sampai");
  if (!expBaru) return configLama;
  let hasil = gantiBaris(configLama, "Berlaku sampai", expBaru);
  if (hasil === null) hasil = configLama + "\n\n" + expBaru;
  const sisaBaru = ambilBaris(configBaru, "Sisa waktu");
  if (sisaBaru) {
    const ganti = gantiBaris(hasil, "Sisa waktu", sisaBaru);
    hasil = ganti === null ? hasil + "\n" + sisaBaru : ganti;
  }
  // Pertahankan baris "Limit IP & Kuota" dari config lama kalau respons
  // baru tidak membawanya (respons renew tidak menyertakan limit).
  const limitLama = ambilBaris(configLama, "Limit IP & Kuota");
  if (limitLama && !hasil.includes("Limit IP & Kuota")) {
    const iExp = hasil.indexOf("Berlaku sampai:");
    if (iExp >= 0) hasil = hasil.slice(0, iExp) + limitLama + "\n" + hasil.slice(iExp);
    else hasil += "\n\n" + limitLama;
  }
  return hasil;
}

function ambilConfigDariData(d) {
  if (!d || typeof d !== "object") return String(d ?? "");
  const links = urutkanLink([...kumpulkanLink(d)]);
  let teks;
  if (links.length) {
    const info = susunInfoAkun(d, links);
    const daftar = links.map((l) => "— " + labelLink(l) + " —\n" + l).join("\n\n");
    teks = info ? info + "\n\n" + daftar : daftar;
  } else {
    teks = ubahConfigJadiTeks(d.config || d.link || d.vless || d.vmess || d.trojan || d.url || d);
    // SSH: template payload WebSocket (HTTP Custom) ala web Nadia —
    // host diisi dari domain akun ini; kalau domain tidak diketahui,
    // payload tidak ditampilkan (jangan ditebak).
    // Respons bisa bersarang (field-field akun di dalam `config`) —
    // cari domain & password sampai ke dalam, supaya payload tidak
    // hilang hanya karena field-nya tidak di root (kejadian 20 Nov
    // 2026: config SSH hasil ganti protokol tidak menampilkan payload).
    const domainPayload = cariDomain(d);
    const adaPassword = !!cariField(d, ["password", "pass"]);
    if (adaPassword && domainPayload && !teks.includes("Payload")) {
      teks += "\n\n" + bagianPayload(domainPayload);
    }
  }
  const exp = cariExpired(d);
  if (exp && !teks.includes("Berlaku sampai") && !teks.includes("Expires :")) {
    teks += "\n\nBerlaku sampai: " + formatExpired(exp);
    const sisa = sisaWaktu(exp);
    if (sisa) teks += "\nSisa waktu: " + sisa;
  }
  return teks;
}

// Gabungkan config baru (biasanya dari endpoint details yang
// responsnya minim) dengan config lama yang tersimpan: baris info yang
// tidak dikirim details (Port, Public Key, Name Server, Limit, Squid,
// OpenVPN, payload) dipertahankan dari config lama. Tanpa ini, Perbaiki
// Akun justru MENGHAPUS data kaya yang didapat waktu order/ganti
// protokol (kejadian 20 Nov 2026: config SSH lengkap jadi tinggal
// Username/Password/Server/exp setelah Perbaiki).
// Kembalikan teks Port (blob lama "ws_tls: 443, 8443, ws_http: ..." atau
// grid "WS TLS : 443, 8443\n...") menjadi object port, supaya bisa
// diformat ulang dengan formatPort.
function parsePortBlob(nilai) {
  if (!nilai) return null;
  const obj = {};
  const tokens = String(nilai).replace(/\n/g, ",").split(",").map((t) => t.trim()).filter(Boolean);
  let kunci = null;
  for (const tok of tokens) {
    const m = tok.match(/^([A-Za-z][A-Za-z0-9 _-]*?)\s*:\s*(.*)$/);
    if (m) {
      kunci = m[1].trim();
      obj[kunci] = obj[kunci] || [];
      if (m[2] !== "") obj[kunci].push(m[2]);
    } else if (kunci) {
      obj[kunci].push(tok);
    }
  }
  const hasil = {};
  for (const [k, v] of Object.entries(obj)) hasil[k] = v.length === 1 ? v[0] : v;
  return Object.keys(hasil).length ? hasil : null;
}

// Ubah config SSH lama (format datar, atau campuran seksi + baris
// datar hasil gabungan versi lama) menjadi format seksi yang bersih
// seperti renderSSH. Ini yang bikin Perbaiki tidak lagi menempelkan
// baris-baris datar (blob Port, "HTTP Custom ...@user:pass") di bawah
// seksi-seksi yang baru. VLESS / config tanpa Password dikembalikan
// apa adanya.
function normalisasiKeSeksi(teks) {
  if (!teks || typeof teks !== "string") return teks;
  const PETA_LABEL = { "Domain": "Host / Domain", "Ns-Domain": "Name Server", "Pubkey": "Public Key", "Expires": "Berlaku sampai", "IP Limit": "Limit Device" };
  const LABEL = new Set(["Username", "Password", "UUID", "Server", "Host / Domain", "Domain", "Port", "Squid Proxy", "HTTP Custom", "OpenVPN", "Name Server", "Ns-Domain", "Public Key", "Pubkey", "DNS", "Limit Device", "Limit IP & Kuota", "Kuota", "IP Limit", "SNI", "Path", "Berlaku sampai", "Expires", "Sisa waktu"]);
  const bersih = (v) => String(v).replace(/<\/?code>/g, "");
  const garis = teks.split("\n");
  const entri = [];
  const sudah = new Set();
  let portObj = null;
  let i = 0;
  while (i < garis.length) {
    const g = garis[i];
    const m = g.match(/^([^:]+?)\s*:\s*(.*)$/);
    if (!m || !LABEL.has(m[1].trim())) { i++; continue; }
    let label = m[1].trim();
    let nilai = bersih(m[2]).trim();
    if (label === "Port" && nilai === "") {
      const lanjutan = [];
      let j = i + 1;
      while (j < garis.length && garis[j].trim() !== "" && !garis[j].startsWith("◆ ")) {
        const mm = garis[j].match(/^([^:]+?)\s*:\s*(.*)$/);
        if (mm && LABEL.has(mm[1].trim())) break;
        lanjutan.push(bersih(garis[j]).trim());
        j++;
      }
      nilai = lanjutan.join("\n");
      i = j;
    } else {
      i++;
    }
    if (label === "DNS") continue; // duplikat domain, sudah ada di Host / Domain
    if (PETA_LABEL[label]) label = PETA_LABEL[label];
    if (sudah.has(label)) continue;
    sudah.add(label);
    if (label === "Port") {
      portObj = parsePortBlob(nilai);
      const grid = portObj ? formatPort(portObj) : null;
      entri.push({ label: "Port", nilai: grid || nilai });
      continue;
    }
    if (label === "HTTP Custom" && nilai.includes("@")) nilai = nilai.split("@")[0];
    if (label === "Limit Device") nilai = nilai.replace(/\s*(Device|IP)$/, "");
    entri.push({ label, nilai });
  }
  if (!entri.some((e) => e.label === "Password")) return teks;
  return renderSSH(entri, { port: portObj });
}

function gabungConfig(configBaru, configLama) {
  if (!configLama || typeof configLama !== "string") return configBaru;
  if (!configBaru || typeof configBaru !== "string") return configLama;
  // Rapikan dulu kedua sisi ke format seksi yang sama — config lama
  // bisa masih format datar / campuran (hasil gabungan versi lama),
  // dan baris-baris datar itu tidak boleh lolos ke hasil akhir.
  configBaru = normalisasiKeSeksi(configBaru);
  configLama = normalisasiKeSeksi(configLama);
  // Config SSH baru berbentuk seksi ("◆ ...") — gabung per seksi supaya
  // baris kaya (grid Port, Pubkey, payload) tidak hilang dan tidak
  // nyasar ke seksi yang salah.
  if (configBaru.includes("◆ ") && configLama.includes("◆ ")) return gabungConfigSeksi(configBaru, configLama);
  let hasil = configBaru;
  const LABEL_INFO = ["Port", "Public Key", "Name Server", "Limit Device", "Limit IP & Kuota", "Kuota", "Host / Domain", "Squid Proxy", "HTTP Custom", "OpenVPN", "SNI", "Path"];
  const adaLabel = (teks, label) => teks.includes(label + ":") || teks.includes(label + " :");
  const ambilBaris = (teks, label) => {
    for (const g of teks.split("\n")) {
      if (g.startsWith(label + ":") || g.startsWith(label + " :")) return g;
    }
    return null;
  };
  const cariAnchor = (teks) => {
    for (const a of ["◆ Masa Aktif", "Berlaku sampai:", "Berlaku sampai :"]) {
      const i = teks.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };
  for (const label of LABEL_INFO) {
    if (adaLabel(hasil, label)) continue;
    const barisLama = ambilBaris(configLama, label);
    if (!barisLama) continue;
    const iAnchor = cariAnchor(hasil);
    if (iAnchor >= 0) hasil = hasil.slice(0, iAnchor) + barisLama + "\n" + hasil.slice(iAnchor);
    else hasil += "\n" + barisLama;
  }
  // Link lama dipertahankan kalau config baru tidak membawa link.
  if (!/^(vless|vmess|trojan|ss):\/\//im.test(hasil)) {
    const linkLama = configLama.split("\n").filter((b) => /^(vless|vmess|trojan|ss):\/\//i.test(b.trim()));
    if (linkLama.length) hasil += "\n\n" + linkLama.join("\n");
  }
  // Payload lama dipertahankan kalau config baru tidak membawanya.
  if (!hasil.includes("Payload WebSocket") && configLama.includes("Payload WebSocket")) {
    const iPay = configLama.indexOf("◆ Payload WebSocket");
    const awal = iPay >= 0 ? iPay : configLama.indexOf("Payload WebSocket");
    hasil += "\n\n" + configLama.slice(awal).trim();
  }
  return hasil;
}

// Gabung dua config SSH berbentuk seksi: tiap seksi diambil dari yang
// lebih lengkap; "Masa Aktif" selalu dari yang baru (exp terbaru),
// kecuali baris Limit yang dipertahankan dari lama kalau tidak ada.
function gabungConfigSeksi(configBaru, configLama) {
  const pecah = (teks) => {
    const bagian = [];
    let cur = null;
    for (const baris of teks.split("\n")) {
      if (baris.startsWith("◆ ")) {
        cur = { judul: baris, isi: [] };
        bagian.push(cur);
      } else if (cur) cur.isi.push(baris);
      else if (baris.trim()) bagian.push({ judul: null, isi: [baris] });
    }
    return bagian;
  };
  const baru = pecah(configBaru), lama = pecah(configLama);
  const cari = (arr, judul) => arr.find((b) => b.judul === judul);
  const hitung = (arr) => arr.filter((x) => x.trim()).length;
  const hasil = [];
  // Urutan seksi baku — seksi yang hanya ada di config lama (mis.
  // Format Account) harus kembali ke tempatnya, bukan nyangkut di akhir.
  const URUTAN = [null, "◆ Informasi Akun", "◆ Domain & Koneksi", "◆ Format Account", "◆ Payload WebSocket", "◆ Masa Aktif"];
  const urutan = [...URUTAN, ...[...new Set([...baru.map((b) => b.judul), ...lama.map((b) => b.judul)])].filter((j) => !URUTAN.includes(j))];
  for (const judul of urutan) {
    const b = cari(baru, judul), l = cari(lama, judul);
    if (!b) { if (l) hasil.push(l); continue; }
    if (!l) { hasil.push(b); continue; }
    if (judul && judul.includes("Masa Aktif")) {
      const isi = [...b.isi];
      for (const baris of l.isi) {
        const t = baris.trim();
        if (/^(IP Limit|Limit|Kuota)/.test(t) && !isi.some((x) => x.trim().startsWith(t.split(":")[0].trim()))) isi.push(baris);
      }
      hasil.push({ judul, isi });
      continue;
    }
    hasil.push(hitung(l.isi) > hitung(b.isi) ? l : b);
  }
  // trim() per seksi supaya baris kosong pemisah antar seksi tidak
  // berlipat ganda, tapi baris kosong DI DALAM seksi (mis. antar item
  // payload) tetap dipertahankan.
  return hasil.map((b) => (b.judul ? b.judul + "\n" + b.isi.join("\n") : b.isi.join("\n")).trim()).join("\n\n").trim();
}

// Cari account_id Nadia — letaknya bisa di root, di dalam `account`,
// atau di dalam `data` (respons tiap endpoint beda-beda).
function cariAccountId(d) {
  if (!d || typeof d !== "object") return null;
  const langsung = d.account_id ?? d.accountId ?? d.id ?? d.uuid ?? null;
  if (typeof langsung === "string" && langsung) return langsung;
  if (typeof langsung === "number") return String(langsung);
  for (const k of ["account", "data"]) {
    const v = cariAccountId(d[k]);
    if (v) return v;
  }
  return null;
}

// Perpanjang akun: POST /vpn/renew {account_id, type, duration}
async function renewNadiaAccount(env, order) {
  const paket = PAKET.find((p) => p.kode === order.paket) || PAKET[0];
  if (!order.accountId) return { ok: false, error: "Akun ini tidak punya ID akun tersimpan (dibuat sebelum fitur kelola akun) — perpanjang manual, hubungi admin." };
  const r = await nadiaPost(env, "/vpn/renew", { account_id: order.accountId, type: paket.nadiaType, duration: paket.nadiaDuration });
  if (!r.ok) return r;
  return { ok: true, config: ambilConfigDariData(r.data), accountId: cariAccountIdKetat(r.data) };
}

// Trial gratis: POST /vpn/trial {server_id, protocol} — 30 menit,
// kuota 1 GB, 1 IP, zivpn tidak didukung, saldo minimal Rp15.000.
async function trialNadiaAccount(env, serverId, protocol) {
  const r = await nadiaPost(env, "/vpn/trial", { server_id: serverId, protocol });
  if (!r.ok) return r;
  const d = r.data;
  const accountId = cariAccountId(d);
  return { ok: true, config: ambilConfigDariData(d), accountId };
}

// (Opsional, untuk tes dari dashboard Worker) cek saldo Nadia:
//   GET {RESELLER_API_URL}/user/balance — Bearer token yang sama.

// ================= PENGIRIM TELEGRAM =================

async function sendPhoto(env, chatId, photoUrl, caption) {
  await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendPhoto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: String(caption || "").slice(0, 1000) }),
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
async function telegramApi(env, method, body) {
  try {
    const r = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/" + method, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return await r.json().catch(() => null);
  } catch (e) { return null; }
}
async function sendHtml(env, chatId, html, keyboard) {
  const body = { chat_id: chatId, text: String(html).slice(0, 4000), parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  const j = await telegramApi(env, "sendMessage", body);
  return j?.result?.message_id || null;
}
async function editHtml(env, chatId, messageId, html, keyboard) {
  if (!messageId) return sendHtml(env, chatId, html, keyboard);
  const body = { chat_id: chatId, message_id: messageId, text: String(html).slice(0, 4000), parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  let j = await telegramApi(env, "editMessageText", body);
  if (!j?.ok) {
    // Pesan yang baru dikirim kadang belum bisa diedit (Telegram belum
    // selesai memprosesnya) — coba sekali lagi setelah jeda.
    await new Promise((res) => setTimeout(res, 600));
    j = await telegramApi(env, "editMessageText", body);
  }
  if (!j?.ok) {
    // Tetap gagal: kirim pesan baru, lalu hapus pesan lama supaya
    // tidak tertinggal pesan nyangkut (mis. "⏳ Memuat menu...").
    await sendHtml(env, chatId, html, keyboard);
    await telegramApi(env, "deleteMessage", { chat_id: chatId, message_id: messageId });
  }
}
async function editReplyMarkup(env, chatId, messageId, keyboard) {
  return await telegramApi(env, "editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } });
}

async function sendTelegram(env, chatId, text, keyboard) {
  const body = { chat_id: chatId, text: String(text).slice(0, 4000) };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function jawabCallback(env, callbackQueryId) {
  await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/answerCallbackQuery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

// Jawab tombol dengan peringatan pop-up (untuk server penuh).
async function jawabAlert(env, callbackQueryId, text) {
  await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/answerCallbackQuery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: String(text).slice(0, 200), show_alert: true }),
  });
}
