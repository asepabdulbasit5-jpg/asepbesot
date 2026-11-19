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
// Nominal unik 100-999 ditambahkan otomatis supaya nominal tiap
// order beda (mis. 10.000 jadi 10.137).
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
      const m = String(text).replace(/\./g, "").match(/Rp\s?([\d]+)/i);
      const amount = m ? parseInt(m[1], 10) : 0;
      if (!amount) return new Response("ok"); // bukan notif pembayaran
      const order = await findPendingOrderByAmount(env, amount);
      if (!order) return new Response("ok"); // tidak ada order cocok
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
    await jawabCallback(env, cb.id);
    if (data === "menu:utama") { await tampilkanMenuUtama(env, cb.from.id, cb.from, cb.message?.message_id); return; }
    if (data === "menu:beli") { await tampilkanDaftarServer(env, cb.from.id, "beli", 0, cb.message?.message_id); return; }
    if (data === "menu:trial") { await tampilkanDaftarServer(env, cb.from.id, "trial", 0, cb.message?.message_id); return; }
    if (data === "menu:status") { await tampilkanStatus(env, cb.from.id); return; }
    if (data === "menu:akun") { await tampilkanAkun(env, cb.from.id); return; }
    if (data === "menu:semua") { await tampilkanSemuaAkun(env, cb.from.id); return; }
    if (data.startsWith("srvpage:")) { await tampilkanDaftarServer(env, cb.from.id, "beli", parseInt(data.slice(8), 10) || 0, cb.message?.message_id); return; }
    if (data.startsWith("trypage:")) { await tampilkanDaftarServer(env, cb.from.id, "trial", parseInt(data.slice(8), 10) || 0, cb.message?.message_id); return; }
    if (data.startsWith("server:")) {
      // Langkah 2: pilih protokol untuk server yang dipilih.
      // Protokol disaring per server: server SSH SELOW cuma tampil
      // SSH, CLOUDFRONT NUSA tidak tampil VLESS, sisanya semua.
      const serverKode = data.slice(7);
      const server = SERVERS.find((x) => x.kode === serverKode);
      const daftar = PROTOKOL.filter((p) => (server?.protocols || ["ssh", "vmess", "vless", "trojan"]).includes(p.kode));
      const tombol = daftar.map((p) => [
        { text: p.nama, callback_data: "proto:" + serverKode + ":" + p.kode },
      ]);
      await sendTelegram(env, cb.from.id, "Server: " + (server?.nama || serverKode) + (server?.penuh ? "\n⚠️ Server ini penuh — order bisa ditolak penyedia, sebaiknya pilih server lain." : "") + "\nPilih protokolnya:", tombol);
      return;
    }
    if (data.startsWith("proto:")) {
      // Langkah 3: pilih durasi untuk server + protokol yang dipilih.
      const [, serverKode, proto] = data.split(":");
      const tombol = PAKET.map((p) => [
        { text: p.nama + " — Rp" + p.harga.toLocaleString("id-ID"), callback_data: "paket:" + serverKode + ":" + proto + ":" + p.kode },
      ]);
      await sendTelegram(env, cb.from.id, "Protokol: " + proto.toUpperCase() + "\nPilih durasi paketnya:", tombol);
      return;
    }
    if (data.startsWith("paket:")) {
      // Langkah 4: simpan pilihan, minta username.
      const [, serverKode, proto, kodePaket] = data.split(":");
      await env.ORDERS.put("pending:" + cb.from.id, JSON.stringify({ server: serverKode, protocol: proto, paket: kodePaket }));
      await sendTelegram(env, cb.from.id,
        "Kamu pilih " + (SERVERS.find((x) => x.kode === serverKode)?.nama || serverKode) +
        " — " + (PROTOKOL.find((x) => x.kode === proto)?.nama || proto.toUpperCase()) +
        " — " + (PAKET.find((x) => x.kode === kodePaket)?.nama || kodePaket) + ".\n\n" +
        "Ketik username yang kamu mau (huruf/angka saja, 3-15 karakter).\n" +
        "Atau ketik - kalau mau username diacak otomatis.\n" +
        "Ketik /batal untuk membatalkan.");
      return;
    }
    // ---- Trial gratis: pilih server -> protokol -> langsung dibuat ----
    if (data.startsWith("tserver:")) {
      const serverKode = data.slice(8);
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (server?.penuh) { await jawabAlert(env, cb.id, "Server ini penuh, pilih server lain ya."); return; }
      const daftar = PROTOKOL.filter((p) => p.kode !== "zivpn" && (server?.protocols || []).includes(p.kode));
      const tombol = daftar.map((p) => [
        { text: p.nama, callback_data: "tproto:" + serverKode + ":" + p.kode },
      ]);
      await sendTelegram(env, cb.from.id, "Trial gratis 30 menit (kuota 1 GB, 1 IP).\nServer: " + (server?.nama || serverKode) + "\nPilih protokolnya:", tombol);
      return;
    }
    if (data.startsWith("tproto:")) {
      const [, serverKode, proto] = data.split(":");
      const server = SERVERS.find((x) => x.kode === serverKode);
      await sendTelegram(env, cb.from.id, "Membuat akun trial " + proto.toUpperCase() + " di " + (server?.nama || serverKode) + "...");
      const hasil = await trialNadiaAccount(env, server?.serverId, proto);
      if (!hasil.ok) {
        await sendTelegram(env, cb.from.id, "Trial gagal: " + hasil.error + "\n(Syarat trial: saldo reseller minimal Rp15.000. Saldo Asep terakhir Rp14.691 — kemungkinan harus topup dulu.)");
        return;
      }
      await sendTelegram(env, cb.from.id,
        "🎁 Ini config trial kamu (30 menit, kuota 1 GB):\n\n" + hasil.config +
        "\n\nKalau cocok, lanjut beli paket lewat /beli.");
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
      if (!r.ok) { await sendTelegram(env, cb.from.id, "Pindah server gagal: " + r.error); return; }
      target.server = server.kode; target.serverNama = server.nama; target.serverId = server.serverId;
      await env.ORDERS.put(orderId, JSON.stringify(target));
      await sendTelegram(env, cb.from.id, "✅ Akun berhasil dipindah ke " + server.nama + ". Sisa masa aktif tetap. Config tidak berubah kecuali IP." + (r.data?.config ? "\n\nConfig terbaru:\n" + ambilConfigDariData(r.data) : ""));
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

  // Perintah admin: /konfirmasi ORDER_ID (cadangan kalau MacroDroid telat)
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
  const baris = [GARIS_PANEL, "          MENU UTAMA", GARIS_PANEL, "INFORMASI PELANGGAN",
    "ID        : " + chatId,
    "USERNAME  : " + (from?.username ? "@" + from.username : "—"),
    "ROLE      : " + (isAdmin ? "admin" : "member"),
    "TOTAL VPN : " + daftar.length + " AKUN"];
  if (saldo !== null) baris.push("SALDO VPN : Rp" + saldo.toLocaleString("id-ID"));
  baris.push(GARIS_PANEL, "SERVER TERSEDIA: " + tersedia + " / " + SERVERS.length + " SERVERS", GARIS_PANEL, "OWNER: SANDEKALA VPN", GARIS_PANEL);
  if (isAdmin) baris.push("ADMIN: /semuaakun • /broadcast PESAN • /konfirmasi ORDER_ID", GARIS_PANEL);
  const html = "<pre>" + escapeHtml(baris.join("\n")) + "</pre>";
  const tombol = [
    [{ text: "🛒 Beli VPN", callback_data: "menu:beli" }],
    [{ text: "🎁 Trial Gratis", callback_data: "menu:trial" }, { text: "📦 Status Order", callback_data: "menu:status" }],
    [{ text: "👤 Akun Saya", callback_data: "menu:akun" }],
  ];
  if (isAdmin) tombol.push([{ text: "📋 Semua Akun", callback_data: "menu:semua" }]);
  if (messageId) { await editHtml(env, chatId, messageId, html, tombol); return; }
  // Kirim menu + hapus keyboard bawah lama supaya tampilannya seperti
  // bot panel (hanya tombol inline). Pesan dikirim dulu dengan
  // remove_keyboard, lalu tombol inline dipasang lewat edit.
  const j = await telegramApi(env, "sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", reply_markup: { remove_keyboard: true } });
  const mid = j?.result?.message_id;
  if (mid) await editReplyMarkup(env, chatId, mid, tombol);
  else await sendHtml(env, chatId, html, tombol);
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
  const tombol = [];
  for (let i = 0; i < daftar.length; i += 2) {
    tombol.push(daftar.slice(i, i + 2).map((s) => {
      const st = statusServer(s, live);
      if (mode === "trial") return { text: s.nama.replace(" — PENUH", ""), callback_data: "tserver:" + s.kode };
      return { text: labelServer(s, live), callback_data: (st.penuh ? "penuh:" : "server:") + s.kode };
    }));
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
  const html = "<pre>" + escapeHtml(teksDaftarServer(daftar, live, judul, halaman, totalHalaman)) + "</pre>";
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

async function tampilkanStatus(env, chatId) {
  const order = await orderTerakhir(env, chatId);
  await sendTelegram(env, chatId, order
    ? "Order " + order.id + ": " + order.status +
      (order.status === "menunggu bayar"
        ? "\nBayar Rp" + order.nominalUnik.toLocaleString("id-ID") +
          " ke QRIS DANA Bisnis (gambar QR sudah dikirim bersama order)."
        : "")
    : "Belum ada order dari kamu.");
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
    const tombol = PAKET.map((p) => [
      { text: p.nama + " — Rp" + p.harga.toLocaleString("id-ID"), callback_data: "renew:" + orderId + ":" + p.kode },
    ]);
    await sendTelegram(env, chatId, "Perpanjang akun " + (target.username || "") + " (" + (target.namaPaket || "") + "). Pilih durasi tambahan:", tombol);
    return;
  }
  if (aksi === "pindah") {
    const liveMig = await ambilStatusServerLive(env);
    const tombol = SERVERS.filter((s) => !statusServer(s, liveMig).penuh && s.kode !== target.server).map((s) => [
      { text: labelServer(s, liveMig), callback_data: "mig:" + orderId + ":" + s.kode },
    ]);
    await sendTelegram(env, chatId, "Pindah server akun " + (target.username || "") + ". Sisa masa aktif ikut pindah. Pilih server tujuan:", tombol);
    return;
  }
  if (aksi === "ganti") {
    const daftar = PROTOKOL.filter((p) => p.kode !== (target.protocol || "").toLowerCase());
    const tombol = daftar.map((p) => [
      { text: p.nama, callback_data: "gproto:" + orderId + ":" + p.kode },
    ]);
    await sendTelegram(env, chatId, "Ganti protokol akun " + (target.username || "") + " (sekarang: " + (target.protocol || "?").toUpperCase() + "). Gratis. Pilih protokol baru:", tombol);
    return;
  }
  if (aksi === "perbaiki") {
    if (!target.accountId) { await sendTelegram(env, chatId, "Akun ini tidak punya ID akun tersimpan — perbaiki manual, hubungi admin."); return; }
    await sendTelegram(env, chatId, "Mengambil data terbaru akun " + (target.username || "") + " dari penyedia...");
    const r = await nadiaPost(env, "/vpn/account/details", { account_id: target.accountId });
    if (!r.ok) { await sendTelegram(env, chatId, "Perbaiki akun gagal: " + r.error); return; }
    const cfg = ambilConfigDariData(r.data);
    target.config = cfg;
    await env.ORDERS.put(orderId, JSON.stringify(target));
    await sendTelegram(env, chatId, "🛠️ Ini config terbaru akun " + (target.username || "") + ":\n\n" + cfg);
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
  const kodeUnik = 100 + Math.floor(Math.random() * 900);
  const nominalUnik = paket.harga + kodeUnik;
  const orderId = "ORD-" + Date.now().toString(36).toUpperCase();
  const order = {
    id: orderId, chatId, pembeli: target.pembeli || null,
    kind: "renew", targetOrderId: target.id,
    accountId: target.accountId, username: target.username,
    paket: paket.kode, namaPaket: paket.nama,
    protocol: target.protocol,
    harga: paket.harga, nominalUnik, status: "menunggu bayar",
    createdAt: Date.now(),
  };
  await env.ORDERS.put(orderId, JSON.stringify(order));
  await env.ORDERS.put("last:" + chatId, orderId);
  await kabariAdmin(env, chatId,
    "🔄 Order perpanjang baru " + orderId + " (menunggu bayar)\n" +
    "Pembeli: " + (target.pembeli || ("ID " + chatId)) + " — akun " + (target.username || "") +
    " — tambah " + paket.nama + " — bayar Rp" + nominalUnik.toLocaleString("id-ID") + "\n" +
    "Berlaku 30 menit. Kalau tidak ada kabar bayar masuk, cek Dana / /semuaakun lalu /konfirmasi " + orderId + ".");
  await sendTelegram(env, chatId,
    "Order perpanjang " + orderId + " dibuat.\n\n" +
    "Akun: " + (target.username || "") + " — tambah " + paket.nama + " — Rp" + paket.harga.toLocaleString("id-ID") + "\n" +
    "Bayar (nominal unik, JANGAN dibulatkan): Rp" + nominalUnik.toLocaleString("id-ID") + "\n\n" +
    "Scan QRIS DANA Bisnis SANDEKALA dengan nominal di atas. Begitu pembayaran masuk, masa aktif langsung bertambah.");
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
  if (!r.ok) { await sendTelegram(env, chatId, "Ganti protokol gagal: " + r.error); return; }
  target.protocol = proto;
  if (r.data?.config) target.config = ambilConfigDariData(r.data);
  await env.ORDERS.put(target.id, JSON.stringify(target));
  await sendTelegram(env, chatId, "✅ Protokol akun " + (target.username || "") + " sekarang " + proto.toUpperCase() + ". Masa aktif tetap." + (target.config ? "\n\nConfig terbaru:\n" + target.config : ""));
}

async function tampilkanTrialServer(env, chatId, halaman, messageId) {
  await tampilkanDaftarServer(env, chatId, "trial", halaman || 0, messageId || null);
}

// ---- /semuaakun (ADMIN saja): daftar semua order yang lewat bot ----
// Diambil dari KV (prefix ORD-), terbaru dulu, maks. 30 baris.
// Hanya order yang dibuat lewat bot; akun trial TIDAK tercatat di sini
// (trial langsung dibuat tanpa order), dan akun yang dibuat manual di
// dashboard penyedia juga tidak ada di sini — cek Layanan Aktif.
async function tampilkanSemuaAkun(env, chatId) {
  if (String(chatId) !== String(env.ADMIN_CHAT_ID)) return;
  const list = await env.ORDERS.list({ prefix: "ORD-" });
  const orders = [];
  for (const key of list.keys) {
    const o = await env.ORDERS.get(key.name, "json").catch(() => null);
    if (o) orders.push(o);
  }
  if (!orders.length) { await sendTelegram(env, chatId, "Belum ada order lewat bot."); return; }
  orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const total = orders.length;
  const tampil = orders.slice(0, 30);
  const baris = tampil.map((o) => {
    let status = o.status || "?";
    if (status === "menunggu bayar" && o.createdAt && Date.now() - o.createdAt > ORDER_TTL_MS) status = "menunggu bayar (kedaluwarsa)";
    const tgl = o.createdAt ? new Date(o.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "?";
    return "• " + (o.username || "?") +
      (o.kind === "renew" ? " (perpanjang)" : "") +
      " — " + (o.pembeli || ("ID " + (o.chatId || "?"))) +
      "\n  " + (o.namaPaket || o.paket || "?") + " — " + (o.protocol || "?").toUpperCase() +
      " — " + (o.serverNama || o.server || "?") +
      "\n  " + status + " — Rp" + (o.nominalUnik || o.harga || 0).toLocaleString("id-ID") +
      " — " + tgl + " — " + o.id;
  });
  let teks = "📋 Semua order lewat bot (" + total + "):\n\n" + baris.join("\n\n");
  if (total > 30) teks += "\n\nMenampilkan 30 terbaru dari " + total + " order.";
  // Kirim per potongan supaya tidak kepotong limit Telegram.
  for (let i = 0; i < teks.length; i += 3500) {
    await sendTelegram(env, chatId, teks.slice(i, i + 3500));
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

async function tampilkanAkun(env, chatId) {
  const daftar = await daftarAkunUser(env, chatId);
  if (!daftar.length) { await sendTelegram(env, chatId, "Kamu belum punya akun aktif di bot ini. Ketik /beli untuk pesan, atau /trial untuk coba gratis."); return; }
  for (const o of daftar) {
    await sendTelegram(env, chatId,
      "Akun: " + (o.username || "?") + "\n" +
      "Paket: " + (o.namaPaket || "?") + " — " + (o.protocol || "?").toUpperCase() + "\n" +
      "Server: " + (o.serverNama || o.server || "?") + "\n" +
      "Order: " + o.id,
      tombolKelola(o.id));
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
async function kabariAdmin(env, chatIdPembeli, teks) {
  if (!env.ADMIN_CHAT_ID || String(env.ADMIN_CHAT_ID) === String(chatIdPembeli)) return;
  await sendTelegram(env, env.ADMIN_CHAT_ID, teks);
}

async function buatOrder(env, chatId, kodePaket, protocol, customUsername, serverKode, from) {
  const paket = PAKET.find((p) => p.kode === kodePaket);
  if (!paket) return;
  const proto = (protocol || env.NADIA_PROTOCOL || "vless").toLowerCase();
  const server = SERVERS.find((x) => x.kode === serverKode) || SERVERS[0];
  // Username: pakai ketikan pembeli, kalau "-" / kosong diacak otomatis.
  const username = customUsername ||
    ("sdk" + Date.now().toString(36).toLowerCase() + Math.floor(Math.random() * 90 + 10)).slice(0, 20);
  // Nominal unik: harga + kode 100-999 supaya tidak ketukar antar pembeli.
  const kodeUnik = 100 + Math.floor(Math.random() * 900);
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
    "Bayar (nominal unik, JANGAN dibulatkan): " +
    "Rp" + nominalUnik.toLocaleString("id-ID") + "\n\n" +
    "Scan QRIS DANA Bisnis SANDEKALA dengan nominal di atas. " +
    "Begitu pembayaran masuk, config langsung dikirim ke sini otomatis.\n" +
    "Order ini berlaku 30 menit.");
  await kabariAdmin(env, chatId,
    "🛒 Order baru " + orderId + " (menunggu bayar)\n" +
    "Pembeli: " + (order.pembeli || ("ID " + chatId)) + "\n" +
    "Paket: " + paket.nama + " — " + proto.toUpperCase() + " — " + server.nama + "\n" +
    "Username: " + username + " — bayar Rp" + nominalUnik.toLocaleString("id-ID") + "\n" +
    "Berlaku 30 menit. Kalau tidak ada kabar bayar masuk, cek Dana / /semuaakun lalu /konfirmasi " + orderId + ".");
  // Gambar QRIS: kirim fotonya kalau QRIS_IMAGE_URL sudah diisi di
  // Secrets Worker. Kalau belum diisi, jujur ke pembeli supaya dia
  // tidak menunggu gambar yang tidak akan datang.
  if (env.QRIS_IMAGE_URL) {
    await sendPhoto(env, chatId, env.QRIS_IMAGE_URL,
      "QRIS DANA Bisnis SANDEKALA — bayar Rp" + nominalUnik.toLocaleString("id-ID") +
      " (nominal unik, jangan dibulatkan). Order " + orderId);
  } else {
    await sendTelegram(env, chatId,
      "Catatan: gambar QRIS belum dipasang di bot ini — minta gambar QRIS ke admin dulu, lalu bayar nominal unik di atas.");
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
      "\nCek saldo/API reseller, lalu /konfirmasi " + orderId +
      " setelah diperbaiki — atau refund manual ke pembeli.");
    await sendTelegram(env, order.chatId,
      "Pembayaranmu sudah masuk, tapi pembuatan akun lagi gangguan. " +
      "Admin sudah dikabari, config akan dikirim secepatnya. " +
      "Order: " + orderId);
    return;
  }
  order.status = "selesai";
  if (order.kind === "renew") {
    // Perpanjang: perbarui order akun lama (nama paket + config baru
    // kalau Nadia mengembalikan config baru).
    const target = await env.ORDERS.get(order.targetOrderId, "json").catch(() => null);
    if (target) {
      target.namaPaket = order.namaPaket;
      if (hasil.config) target.config = hasil.config;
      await env.ORDERS.put(order.targetOrderId, JSON.stringify(target));
    }
    await env.ORDERS.put(orderId, JSON.stringify(order));
    await kabariAdmin(env, order.chatId,
      "✅ Perpanjang berhasil: " + orderId + "\n" +
      "Pembeli: " + (order.pembeli || ("ID " + order.chatId)) + " — akun " + (order.username || "") +
      " — " + order.namaPaket + " — Rp" + order.nominalUnik.toLocaleString("id-ID") + " sudah masuk.");
    await sendTelegram(env, order.chatId,
      "✅ Akun " + (order.username || "") + " berhasil diperpanjang (" + order.namaPaket + ")." +
      (hasil.config ? "\n\nConfig terbaru:\n" + hasil.config : ""));
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
  await sendTelegram(env, order.chatId,
    "✅ Pembayaran diterima! Ini config " + order.namaPaket + " kamu:\n\n" +
    hasil.config + "\n\nMasa aktif mulai hari ini. Selamat memakai!",
    tombolKelola(orderId));
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
    // beberapa tempat umum.
    const accountId = d.account_id || d.accountId || d.id || d.uuid ||
      d.account?.id || d.account?.account_id || null;
    const config = d.config || d.link || d.vless || d.vmess || d.trojan || d.url ||
      (d.username ? ("Username: " + d.username + (d.password ? "\nPassword: " + d.password : "") + (d.server ? "\nServer: " + d.server : "") + (d.port ? "\nPort: " + d.port : "")) : null) ||
      JSON.stringify(d).slice(0, 1500);
    return { ok: true, config: "Username: " + username + "\n" + config, accountId };
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

function ambilConfigDariData(d) {
  return d.config || d.link || d.vless || d.vmess || d.trojan || d.url ||
    (d.username ? ("Username: " + d.username + (d.password ? "\nPassword: " + d.password : "") + (d.server ? "\nServer: " + d.server : "") + (d.port ? "\nPort: " + d.port : "")) : null) ||
    JSON.stringify(d).slice(0, 1500);
}

// Perpanjang akun: POST /vpn/renew {account_id, type, duration}
async function renewNadiaAccount(env, order) {
  const paket = PAKET.find((p) => p.kode === order.paket) || PAKET[0];
  if (!order.accountId) return { ok: false, error: "Akun ini tidak punya ID akun tersimpan (dibuat sebelum fitur kelola akun) — perpanjang manual, hubungi admin." };
  const r = await nadiaPost(env, "/vpn/renew", { account_id: order.accountId, type: paket.nadiaType, duration: paket.nadiaDuration });
  if (!r.ok) return r;
  return { ok: true, config: ambilConfigDariData(r.data) };
}

// Trial gratis: POST /vpn/trial {server_id, protocol} — 30 menit,
// kuota 1 GB, 1 IP, zivpn tidak didukung, saldo minimal Rp15.000.
async function trialNadiaAccount(env, serverId, protocol) {
  const r = await nadiaPost(env, "/vpn/trial", { server_id: serverId, protocol });
  if (!r.ok) return r;
  const d = r.data;
  const accountId = d.account_id || d.accountId || d.id || d.uuid || null;
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
  const j = await telegramApi(env, "editMessageText", body);
  if (!j?.ok) await sendHtml(env, chatId, html, keyboard);
}
async function editReplyMarkup(env, chatId, messageId, keyboard) {
  await telegramApi(env, "editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } });
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
