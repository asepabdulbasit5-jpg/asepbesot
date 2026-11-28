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
//          SSH wajib kirim `password` (Nadia: "The password field
//          is required", 22 Nov 2026) — bot membuatnya acak 10 huruf.
//          type: day | week | month
//   Auth: Authorization: Bearer <token sk_live_...>
//   Token dibuat di dashboard Nadia: API Reseller > Label
//   "SANDEKALA-BOT" > GENERATE TOKEN. Token JANGAN ditulis di
//   file ini — taruh di Secrets Worker (RESELLER_API_KEY).
//   ENDPOINT LAIN (dari screenshot Asep, 19 Nov 2026, 16:07-16:09):
//     POST /api/v1/vpn/trial           {server_id, protocol}
//          Trial gratis 30 menit (NUSA ID & CLOUDFRONT MEDIA 60 menit),
//          kuota 1 GB, limit 1 IP, zivpn tidak didukung, username/
//          password auto. KHUSUS ADMIN sejak 26 Nov 2026 — pembeli
//          tidak bisa trial lagi; sistem jatah trial (TRIAL: di KV)
//          sudah dihapus. Syarat: saldo minimal Rp15.000 (tidak
//          dipotong). Saldo Asep saat itu Rp14.691 — di bawah syarat,
//          trial bisa gagal sampai topup dulu.
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
//      Cadangan: CLOUDFRONT (CLOUDMATIKA) = 01a133f2-e422-73e9-bc1d-3d3621d704c6
//      (dulu "CLOUDFRONT (ATI)" — diganti Nadia, /ceknadia 26 Nov 2026)
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

// ---- HARGA JUAL (harga final Asep, 19 Nov 2026; diubah 26 Nov 2026) ----
// Harian sempat dihapus 19 Nov 2026, diaktifkan lagi malam harinya.
// Bulanan tetap Rp10.000 (tidak berubah 26 Nov 2026):
//   1 hari:  modal Rp267   -> jual Rp800    (untung Rp533, bersih Rp333 setelah fee Rp200)
//   7 hari:  modal Rp1.869 -> jual Rp3.300  (untung Rp1.431, bersih Rp1.231 setelah fee Rp200)
//   30 hari: modal Rp6.000 -> jual Rp10.000 (untung Rp4.000, bersih Rp3.800 setelah fee Rp200)
// Fee order Nadia Rp200/order sudah dihitung di "bersih" di atas.
// Nominal unik 10-99 ditambahkan otomatis supaya nominal tiap
// order beda (mis. 10.000 jadi 10.042).
// Pemetaan ke Nadia: 1 hari = type "day", duration 1.
//                    7 hari = type "week", duration 1.
//                    30 hari = type "month", duration 1.
const PAKET = [
  { kode: "1hari",  nama: "VPN 1 hari",  harga: 800,   durasiHari: 1,  nadiaType: "day",   nadiaDuration: 1 },
  { kode: "7hari",  nama: "VPN 7 hari",  harga: 3300,  durasiHari: 7,  nadiaType: "week",  nadiaDuration: 1 },
  { kode: "30hari", nama: "VPN 30 hari", harga: 10000, durasiHari: 30, nadiaType: "month", nadiaDuration: 1 },
];

// ---- HARGA MODAL (baseline pembanding /ceknadia, 28 Nov 2026) ----
// Hasil live /cekfield 28 Nov 2026 21:52 WIB: respons /servers Nadia
// membawa field pricing = harga modal, SAMA di semua 22 server:
// {"per_day":267,"per_week":1869,"per_month":6000}.
// Konstanta ini HANYA pembanding laporan — bot TIDAK mengubah
// harga jual otomatis (harga jual tetap Rp800/Rp3.300/Rp10.000
// di PAKET di atas; kalau modal berubah, Asep yang memutuskan).
const HARGA_MODAL = { per_day: 267, per_week: 1869, per_month: 6000 };

// Server yang bisa dipilih pembeli — SEMUA 22 server Nadia
// 28 Nov 2026 (/ceknadia): BIZNET & CLOUDFRONT BIZNET GIO KEMBALI
// di Nadia (ID sama) — dimasukkan lagi ke bot.
// 24 Nov 2026 sore (/ceknadia): SSH SELOW DNS & UDP MINI KEMBALI
// di Nadia (ID sama) — dimasukkan lagi ke bot.
// 24 Nov 2026 (/ceknadia): SSH SELOW DNS & UDP MINI dihapus
// (hilang dari Nadia).
// 20 Nov 2026 (/ceknadia): LITE & LITE PRO dihapus (hilang dari
// Nadia); SGCLOUDHOST & CLOUDFRONT NUSA diganti nama mengikuti Nadia.
// (19 Nov 2026, atas permintaan Asep). Data dari katalog
// GET /api/v1/servers 19 Nov 2026 (harga sama semua:
// Rp267/hari, Rp1.869/minggu, Rp6.000/bulan).
// Catatan: 4 server ditandai PENUH (kapasitas 100/100) — tetap
// ditampilkan sesuai permintaan, tapi order di sana kemungkinan
// ditolak Nadia; pembeli disarankan pilih yang lain.
// Server CLOUDFRONT NUSA tidak dukung VLESS.
// Alur beli: /beli -> pilih SERVER -> pilih protokol ->
// pilih durasi -> ketik username (atau "-") -> order dibuat.
// Domain per server hanya diketahui untuk SELOW — kini
// vpn14.nadiastore.web.id (tes live /ceknadia 28 Nov 2026 21:08 WIB;
// sebelumnya vip.sshvpn.web.id, dari respons trial Nadia). Domain
// lama vip.sshvpn.web.id dipertahankan di NS_PER_DOMAIN sebagai
// jaring pengaman kalau Nadia masih mengembalikannya di akun
// tertentu. Server lain belum diketahui domainnya, jadi /ceknadia
// hanya membandingkan domain yang bot tahu.
const SERVERS = [
  { kode: "slowmini",  nama: "SSH SELOW DNS & UDP MINI",      serverId: "01a1a126-b5c7-710c-953a-68e8d0ea6e98", protocols: ["ssh"], used: 162, limit: 250, domain: "vpn14.nadiastore.web.id" },
  { kode: "cloudmat",  nama: "CLOUDMATIKA",                   serverId: "019ecafe-9826-7339-8939-8c6c03daaac5", protocols: ["ssh", "vmess", "vless", "trojan"], used: 149, limit: 155 },
  { kode: "sgcloud",   nama: "SGCLOUDHOST",              serverId: "019d416c-91ab-70cf-ae93-98251456366e", protocols: ["ssh", "vmess", "vless", "trojan"], used: 124, limit: 127 },
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
  { kode: "cfnusa",    nama: "CLOUDFRONT NUSA (id)",               serverId: "01a1a348-d7fd-739c-916c-45c891ac2b4b", protocols: ["ssh", "vmess", "trojan"], used: 207, limit: 240 },
  { kode: "ikd",       nama: "CLOUDFRONT IKD",                serverId: "01a18b54-cbe9-712a-b8e0-bf418f203224", protocols: ["ssh", "vmess", "vless", "trojan"], used: 150, limit: 200 },
  { kode: "cfsepadan", nama: "CLOUDFRONT Sepadan Abadi",      serverId: "01a18a8a-63ad-7301-b8b9-a6d07492a952", protocols: ["ssh", "vmess", "vless", "trojan"], used: 177, limit: 200 },
  { kode: "media",     nama: "CLOUDFRONT MEDIA",              serverId: "019e15b0-f043-7170-a5c7-63719b4b8d45", protocols: ["ssh", "vmess", "vless", "trojan"], used: 170, limit: 200 },
  { kode: "idroot",    nama: "CLOUDFRONT IDROOT",             serverId: "01a151ad-af61-7007-a06b-0aeb5deea798", protocols: ["ssh", "vmess", "vless", "trojan"], used: 176, limit: 200 },
  { kode: "mitra",     nama: "CLOUDFRONT [MITRA]",            serverId: "01a16cd0-e727-70b4-822c-c96c0a502535", protocols: ["ssh", "vmess", "vless", "trojan"], used: 215, limit: 250 },
  { kode: "bizgio",    nama: "CLOUDFRONT BIZNET GIO",         serverId: "01a06443-8a9c-7254-b6f5-d59e4cfc3edd", protocols: ["ssh", "vmess", "vless", "trojan"], used: 199, limit: 200 },
  { kode: "binet",     nama: "CLOUDFRONT BINET NEO",          serverId: "01a11353-0afc-7193-8c02-08d3de1a50b8", protocols: ["ssh", "vmess", "vless", "trojan"], used: 85, limit: 200 },
  { kode: "ati",       nama: "CLOUDFRONT (CLOUDMATIKA)",     serverId: "01a133f2-e422-73e9-bc1d-3d3621d704c6", protocols: ["ssh", "vmess", "vless", "trojan"], used: 52, limit: 250 },
];
// Name Server SlowDNS per domain server (25 Nov 2026).
// API Nadia TIDAK mengirim nameserver di respons order — nilainya
// dari website Nadia (detail akun), beda tiap server. renderSSH
// memakai tabel ini sebagai fallback kalau respons API tidak membawa
// Name Server. Tambah entri baru ke sini kalau ada NS server lain.
// CATATAN: nsbiz.vpnstore28.my.id dicek DNS 25 Nov 2026 (Cloudflare +
// Google DoH) = NXDOMAIN, tidak resolve publik — nilai resmi Nadia
// waktu itu, tapi Asep 28 Nov 2026 ganti NS vip.sshvpn.web.id ke
// dns14.nadiastore.web.id (sama dengan vpn14, dari website Nadia).
const NS_PER_DOMAIN = {
  "vip.sshvpn.web.id": "dns14.nadiastore.web.id", // domain LAMA SELOW — dipertahankan sebagai jaring pengaman (tes live /ceknadia 28 Nov 2026: SELOW kini vpn14.nadiastore.web.id)
  "vpn14.nadiastore.web.id": "dns14.nadiastore.web.id", // domain SELOW saat ini (tes live /ceknadia 28 Nov 2026 21:08 WIB; nilai dari website Nadia)
};
// Domain legacy yang DIKECUALIKAN dari peringatan yatim di
// /ceknadia: vip.sshvpn.web.id adalah domain LAMA SELOW — sudah
// tidak dipakai server live mana pun (tes live /ceknadia 28 Nov
// 2026 21:08 WIB), tapi kuncinya SENGAJA dipertahankan di
// NS_PER_DOMAIN sebagai jaring pengaman kalau Nadia masih
// mengembalikan domain lama di akun tertentu. Tanpa pengecualian
// ini, /ceknadia akan menampilkan peringatan yatim untuk vip
// terus-menerus padahal kuncinya memang sengaja disimpan (Asep
// 28 Nov 2026 21:15 WIB: "sembunyiin peringatannya"). Pengecualian
// ini eksplisit per domain — logika yatim untuk domain lain tetap
// jalan seperti semula.
const NS_DOMAIN_LEGACY = new Set(["vip.sshvpn.web.id"]);
// Alur beli sekarang: /beli (atau tombol 🛒 Beli VPN) -> pilih
// SERVER -> pilih protokol -> pilih durasi -> ketik username sendiri
// (atau "-" untuk acak) -> order dibuat. Username dibuatkan Nadia
// kalau acak; password akun (khusus SSH) dibuat acak oleh bot dan
// dikirim ke Nadia di `password`, lalu ditampilkan ke pembeli di
// config — Nadia WAJIB minta password untuk order SSH.
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

    // ---- Callback pembayaran Duitku (otomatis, 26 Nov 2026) ----
    // POST x-www-form-urlencoded dari server Duitku ke
    // /duitku-callback (URL ini didaftarkan di proyek Duitku).
    // Dicek SEBELUM webhook Telegram supaya tidak dikira update bot.
    if (url.pathname === "/duitku-callback" && req.method === "POST") {
      return await handleDuitkuCallback(env, req);
    }

    // ---- Relay data Nadia untuk auto-sync GitHub Actions ----
    // GitHub Actions kena HTTP 403 kalau langsung memanggil API Nadia
    // (20 Nov 2026: token valid — curl dari mesin lain dapat HTTP 200 —
    // tapi runner GitHub ditolak, kemungkinan IP/Cloudflare-nya diblokir).
    // Worker ini bisa memanggil Nadia dengan normal (satu jaringan
    // Cloudflare), jadi GitHub memanggil endpoint ini sebagai perantara.
    // Kunci: header X-Relay-Secret (atau ?k=) harus sama dengan secret
    // RELAY_SECRET di Worker. Tanpa kunci yang benar -> 403.
    // Balasan: { ok, servers: [...], balance: <angka|null> }.
    // Saldo TIDAK PERNAH dikirim tanpa kunci yang benar.
    if (url.pathname === "/relay-nadia" && req.method === "GET") {
      const kunci = req.headers.get("X-Relay-Secret") || url.searchParams.get("k") || "";
      if (!env.RELAY_SECRET || kunci !== env.RELAY_SECRET)
        return new Response("no", { status: 403 });
      const live = await ambilDaftarServerLive(env);
      if (!live.list)
        return new Response(JSON.stringify({ ok: false, error: live.debug || "gagal ambil daftar server" }), { status: 502, headers: { "Content-Type": "application/json" } });
      const saldo = await ambilSaldoReseller(env);
      return new Response(JSON.stringify({ ok: true, servers: live.list, balance: saldo }), { headers: { "Content-Type": "application/json" } });
    }

    // ---- Webhook Telegram ----
    if (req.method === "POST") {
      let update;
      try { update = await req.json(); } catch { return new Response("ok"); }
      // (28 Nov 2026) Error di dalam handleTelegram tidak boleh jadi
      // 500: Telegram akan me-retry update-nya dan perintah yang sudah
      // dieksekusi sebagian (mis. /tutup) dijawab dua kali. Tetap balas
      // 200; error-nya cukup tercatat di log Cloudflare.
      try { await handleTelegram(env, update); } catch (e) { console.error("webhook error:", String(e?.message || e).slice(0, 200)); }
      return new Response("ok");
    }

    return new Response("Bot jualan SANDEKALA aktif");
  },

  // ---- Cron Trigger (v2.9.14 reseller) ----
  // Dihapus 28 Nov 2026 (perintah Asep: hapus semua broadcast
  // buka/tutup sampai ke akar) — satu-satunya tugas cron sudah
  // ikut dicabut. Jadwal cron di wrangler.toml dibiarkan (tidak
  // memanggil apa-apa), seperti autodark.
};

// ---- Hemat KV (live sejak 24 Nov 2026) ----
// Workers memakai ulang isolate yang sama untuk banyak request, jadi
// cache memori ini memangkas baca KV yang berulang tanpa ubah perilaku:
// - TOKO_BUKA: dibaca ulang tiap langkah order (sampai ~10x per order).
//   Cache 60 detik; setToko() langsung mengosongkan cache di isolate ini.
//   Isolate lain bisa telat maks. 60 detik melihat buka/tutup.
// - Bersihkan order kedaluarsa: tadinya LIST + GET semua order tiap kali
//   pembeli cek status. Sekarang maks. 1x per jam per isolate.
// - Grup yang sudah dikenal: tadinya GET KV di SETIAP pesan grup.
//   Setelah sekali dikenal, isolate ini tidak GET lagi (Set dibatasi
//   5000 entri, lalu dikosongkan & dipelajari ulang).
const cacheToko = { nilai: null, ts: 0 };
const grupDikenal = new Set();
let bersihOrderTerakhir = 0;

// ---- Toko buka/tutup ala warung (19 Nov 2026) ----
// Status disimpan di KV ORDERS kunci "TOKO_BUKA": "buka" / "tutup".
// Default: buka (kalau kunci belum ada). Saat TUTUP, pembeli hanya
// bisa LIHAT (menu, daftar server, status order, akun saya) — beli
// dan perpanjang diblokir dengan pesan tutup. Admin tidak
// diblokir dan bisa buka/tutup lewat tombol di menu atau perintah
// /buka dan /tutup. Pembayaran kini MANUAL: admin cek Dana lalu
// /konfirmasi ORDER_ID (MacroDroid sudah tidak dipakai).
async function tokoBuka(env) {
  if (cacheToko.nilai !== null && Date.now() - cacheToko.ts < 60000) return cacheToko.nilai;
  const v = await env.ORDERS.get("TOKO_BUKA").catch(() => null);
  const buka = v !== "tutup";
  cacheToko.nilai = buka; cacheToko.ts = Date.now();
  return buka;
}
async function setToko(env, buka) {
  cacheToko.nilai = buka; cacheToko.ts = Date.now();
  await env.ORDERS.put("TOKO_BUKA", buka ? "buka" : "tutup");
}
// ---- Debounce toggle buka/tutup (28 Nov 2026) ----
// Tombol menu:toko adalah toggle — tiap ketuk membalik status.
// Ketukan ganda (lag / jari nyasar) pernah membalik status 6x
// selang-seling dalam 2 menit.
// Aturan: perubahan status yang sukses dicatat di KV ORDERS kunci
// "TOKO_TOGGLE_TERAKHIR" (ms epoch); ketuk berikutnya dalam 30
// detik diabaikan. Perintah /buka dan /tutup juga memperbarui cap
// waktu ini saat benar-benar mengubah status.
const KUNCI_TOGGLE_TERAKHIR = "TOKO_TOGGLE_TERAKHIR";
const TOGGLE_JEDA_MS = 30000;
async function toggleTerlaluCepat(env) {
  try {
    const v = await env.ORDERS.get(KUNCI_TOGGLE_TERAKHIR).catch(() => null);
    const ts = Number(v || 0);
    return ts > 0 && Date.now() - ts < TOGGLE_JEDA_MS;
  } catch { return false; }
}
async function catatToggleToko(env) {
  try { await env.ORDERS.put(KUNCI_TOGGLE_TERAKHIR, String(Date.now())); } catch { /* abaikan */ }
}
// ---- Status menunggu admin dari tombol menu (28 Nov 2026) ----
// Tombol Broadcast/Konfirmasi di menu utama tidak bisa langsung
// jalan karena butuh teks dari admin (isi broadcast / ORDER_ID).
// Ketukan tombol menyimpan KV PENDING_BROADCAST:<chatId> /
// PENDING_KONFIRMASI:<chatId> berisi {dibuat: ms epoch}; pesan
// teks DM berikutnya dari admin dipakai sebagai isinya. Berlaku
// 10 menit — sesudah itu diabaikan + dibersihkan.
const MASA_TUNGGU_ADMIN_MS = 10 * 60 * 1000;
async function bacaTungguAdmin(env, chatId, kunci) {
  const p = await env.ORDERS.get(kunci + chatId, "json").catch(() => null);
  if (!p) return null;
  if (Date.now() - (p.dibuat || 0) > MASA_TUNGGU_ADMIN_MS) {
    await env.ORDERS.delete(kunci + chatId);
    return null;
  }
  return p;
}
function adalahAdmin(env, chatId) { return String(chatId) === String(env.ADMIN_CHAT_ID); }
const PESAN_TUTUP = "🔴 Toko lagi tutup. Lihat-lihat dulu aja, order dibuka lagi nanti ya.";
// Deskripsi bot (tampil di profil: "Apa yang dapat bot ini lakukan?").
// Dipasang lewat /setdeskripsi (admin) — Bot API setMyDescription.
// (22 Nov 2026) Harga disingkat jadi Rp10.000 / bulan.
const DESKRIPSI_BOT = "SANDEKALA VPN — Beli akun VPN VLESS, VMess, Trojan & SSH. Harga: Rp10.000 / bulan. Bayar via QRIS DANA.";

// ---- Grup: catat ID (28 Nov 2026, /broadcast manual) ----
// ID grup dicatat (GRUP:<id>) supaya /broadcast manual sampai juga
// ke grup SANDEKALA, bukan cuma ke pembeli. Siaran buka/tutup sudah
// dicabut total — pencatatan ini HANYA untuk /broadcast manual.
// Key GRUP: lama di KV (sebelum pencabutan) dibaca lagi di sini.
async function catatGrup(env, chatId) {
  if (!chatId) return;
  if (grupDikenal.has(String(chatId))) return;
  const kunci = "GRUP:" + chatId;
  const ada = await env.ORDERS.get(kunci).catch(() => null);
  if (ada) { if (grupDikenal.size > 5000) grupDikenal.clear(); grupDikenal.add(String(chatId)); return; }
  await env.ORDERS.put(kunci, "1");
  if (grupDikenal.size > 5000) grupDikenal.clear();
  grupDikenal.add(String(chatId));
}
// Null kalau daftar gagal dibaca (KV error).
async function daftarSemuaGrup(env) {
  let list;
  try { list = await env.ORDERS.list({ prefix: "GRUP:" }); } catch { return null; }
  const hasil = new Set();
  for (const key of list.keys) {
    const id = key.name.slice("GRUP:".length);
    if (id) hasil.add(id);
  }
  return hasil;
}
// ================= ALUR BELI =================

async function handleTelegram(env, update) {
  const msg = update.message;
  const cb = update.callback_query;
  if (cb) { // tombol yang diklik pembeli
    const data = String(cb.data || "");
    // Tombol yang diklik di grup: arahkan ke DM, jangan proses apa pun.
    if (cb.message?.chat?.type === "group" || cb.message?.chat?.type === "supergroup") {
      await jawabAlert(env, cb.id, "Order lewat chat pribadi ya — buka @sandekalavpn_bot, biar config kamu nggak kelihatan orang lain.");
      return;
    }
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
    // KECUALI menu:toko (28 Nov 2026): tombol Buka/Tutup Toko adalah
    // AKSI, bukan navigasi — dan nempel di pesan menu yang biasanya
    // sudah berjam-jam lamanya saat diketuk. Kalau ikut diblokir,
    // ketukan tidak mengubah apa-apa (padahal status di menu
    // kelihatan sudah berubah dari ketukan sebelumnya).
    const NAV_AWAL = ["menu:", "server:", "proto:", "paket:", "tserver:", "tproto:", "srvpage:", "trypage:"];
    if (data !== "menu:toko" && NAV_AWAL.some((aw) => data.startsWith(aw)) && cb.message?.date && Date.now() / 1000 - cb.message.date > 600) {
      await jawabAlert(env, cb.id, "Pesan ini sudah lama, ketik /start untuk buka menu baru ya.");
      return;
    }
    await jawabCallback(env, cb.id);
    if (data === "menu:utama") { await tampilkanMenuUtama(env, cb.from.id, cb.from, cb.message?.message_id); return; }
    if (data === "menu:beli") { await tampilkanDaftarServer(env, cb.from.id, "beli", 0, cb.message?.message_id); return; }
    if (data === "menu:trial") {
      // Trial KHUSUS ADMIN (26 Nov 2026): pembeli tidak bisa trial
      // lagi — tombolnya juga disembunyikan di menu non-admin.
      // Tombol trial lama di riwayat chat tetap dijawab di sini.
      if (!adalahAdmin(env, cb.from.id)) {
        await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Maaf, trial sudah tidak tersedia."), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]]);
        return;
      }
      await tampilkanDaftarServer(env, cb.from.id, "trial", 0, cb.message?.message_id);
      return;
    }
    if (data === "menu:status") { await tampilkanStatus(env, cb.from.id, cb.message?.message_id); return; }
    if (data === "menu:akun") { await tampilkanAkun(env, cb.from.id, cb.message?.message_id); return; }
    if (data === "menu:semua") { await tampilkanSemuaAkun(env, cb.from.id, cb.message?.message_id); return; }
    if (data === "menu:ceknadia") { await tampilkanCekNadia(env, cb.from.id, cb.message?.message_id); return; }
    if (data === "menu:cekfield") { await tampilkanCekField(env, cb.from.id); return; }
    if (data === "menu:broadcast") {
      // Tombol Broadcast: minta isi pesan dulu (28 Nov 2026).
      if (!adalahAdmin(env, cb.from.id)) return;
      await env.ORDERS.put("PENDING_BROADCAST:" + cb.from.id, JSON.stringify({ dibuat: Date.now() }));
      await env.ORDERS.delete("PENDING_KONFIRMASI:" + cb.from.id);
      await sendTelegram(env, cb.from.id, "Ketik pesan broadcast-nya (atau /batal buat batalin):");
      return;
    }
    if (data === "menu:konfirmasi") {
      // Tombol Konfirmasi: minta ORDER_ID dulu (28 Nov 2026).
      if (!adalahAdmin(env, cb.from.id)) return;
      await env.ORDERS.put("PENDING_KONFIRMASI:" + cb.from.id, JSON.stringify({ dibuat: Date.now() }));
      await env.ORDERS.delete("PENDING_BROADCAST:" + cb.from.id);
      await sendTelegram(env, cb.from.id, "Ketik ORDER_ID-nya (atau /batal buat batalin):");
      return;
    }
    if (data === "menu:toko") {
      if (!adalahAdmin(env, cb.from.id)) return;
      if (await toggleTerlaluCepat(env)) { await jawabAlert(env, cb.id, "Baru saja diubah, tunggu sebentar ya."); return; }
      const buka = await tokoBuka(env);
      await setToko(env, !buka);
      await catatToggleToko(env);
      // Refresh menu gagal tidak boleh menggagalkan apa-apa —
      // status toko sudah kebalik.
      try { await tampilkanMenuUtama(env, cb.from.id, cb.from, cb.message?.message_id); } catch { /* abaikan */ }
      return;
    }
    if (data.startsWith("srvpage:")) { await tampilkanDaftarServer(env, cb.from.id, "beli", parseInt(data.slice(8), 10) || 0, cb.message?.message_id); return; }
    if (data.startsWith("trypage:")) {
      if (!adalahAdmin(env, cb.from.id)) {
        await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Maaf, trial sudah tidak tersedia."), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]]);
        return;
      }
      await tampilkanDaftarServer(env, cb.from.id, "trial", parseInt(data.slice(8), 10) || 0, cb.message?.message_id); return;
    }
    if (data.startsWith("server:")) {
      // Langkah 2: pilih protokol untuk server yang dipilih.
      // Protokol disaring per server: CLOUDFRONT NUSA tidak tampil
      // VLESS, sisanya semua.
      const serverKode = data.slice(7);
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      const daftar = PROTOKOL.filter((p) => (server?.protocols || ["ssh", "vmess", "vless", "trojan"]).includes(p.kode));
      const tombol = daftar.map((p) => [
        { text: p.nama, callback_data: "proto:" + serverKode + ":" + p.kode, style: "primary" },
      ]);
      tombol.push([{ text: "🔙 Kembali ke Server", callback_data: "menu:beli", style: "danger" }]);
      await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Server: " + (server?.nama || serverKode) + (server?.penuh ? "\n⚠️ Server ini penuh — order bisa ditolak penyedia, sebaiknya pilih server lain." : "") + "\nPilih protokolnya:"), tombol);
      return;
    }
    if (data.startsWith("proto:")) {
      // Langkah 3: pilih durasi untuk server + protokol yang dipilih.
      const [, serverKode, proto] = data.split(":");
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      const tombol = PAKET.map((p) => [
        { text: p.nama + " — Rp" + p.harga.toLocaleString("id-ID"), callback_data: "paket:" + serverKode + ":" + proto + ":" + p.kode, style: "primary" },
      ]);
      tombol.push([{ text: "🔙 Kembali", callback_data: "server:" + serverKode, style: "danger" }]);
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
        "Ketik username yang kamu mau (huruf/angka saja, maksimal 15 karakter).\n" +
        "Atau ketik - kalau mau username diacak otomatis.\n" +
        "Kalau kurang dari 4 huruf atau sudah dipakai, bot tambahkan karakter acak.\n" +
        (proto === "ssh" ? "Setelah itu, ketik password SSH yang kamu mau.\n" : "") +
        "Ketik /batal untuk membatalkan."), [[{ text: "🔙 Kembali", callback_data: "proto:" + serverKode + ":" + proto, style: "danger" }]]);
      return;
    }
    // ---- Trial gratis (KHUSUS ADMIN, 26 Nov 2026): pilih server -> protokol -> langsung dibuat ----
    if (data.startsWith("tserver:")) {
      const serverKode = data.slice(8);
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (!adalahAdmin(env, cb.from.id)) {
        await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Maaf, trial sudah tidak tersedia."), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]]);
        return;
      }
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      if (server?.penuh) { await jawabAlert(env, cb.id, "Server ini penuh, pilih server lain ya."); return; }
      const daftar = PROTOKOL.filter((p) => p.kode !== "zivpn" && (server?.protocols || []).includes(p.kode));
      const tombol = daftar.map((p) => [
        { text: p.nama, callback_data: "tproto:" + serverKode + ":" + p.kode, style: "primary" },
      ]);
      tombol.push([{ text: "🔙 Kembali ke Server", callback_data: "menu:trial", style: "danger" }]);
      await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Trial gratis " + durasiTrialMenit(serverKode) + " menit (kuota 1 GB, 1 IP)." + "\nServer: " + (server?.nama || serverKode) + "\nPilih protokolnya:"), tombol);
      return;
    }
    if (data.startsWith("tproto:")) {
      const [, serverKode, proto] = data.split(":");
      const server = SERVERS.find((x) => x.kode === serverKode);
      if (!adalahAdmin(env, cb.from.id)) {
        await editHtml(env, cb.from.id, cb.message?.message_id, escapeHtml("Maaf, trial sudah tidak tersedia."), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]]);
        return;
      }
      if (!(await tokoBuka(env)) && !adalahAdmin(env, cb.from.id)) { await jawabAlert(env, cb.id, PESAN_TUTUP); return; }
      const midTrial = cb.message?.message_id;
      await editHtml(env, cb.from.id, midTrial, escapeHtml("Membuat akun trial " + proto.toUpperCase() + " di " + (server?.nama || serverKode) + "..."), []);
      const hasil = await trialNadiaAccount(env, server?.serverId, proto);
      if (!hasil.ok) {
        // Hanya admin yang sampai sini — dia lihat error mentahnya.
        await editHtml(env, cb.from.id, midTrial, escapeHtml("Trial gagal: " + hasil.error), []);
        return;
      }
      const menitTrial = durasiTrialMenit(serverKode);
      if (hasil.config && !hasil.config.includes("Berlaku sampai")) {
        hasil.config += "\n\nBerlaku sampai: " + formatExpired(new Date(Date.now() + menitTrial * 60000));
      }
      await kirimConfig(env, cb.from.id,
        "🎁 Ini config trial kamu (" + menitTrial + " menit, kuota 1 GB):", hasil.config,
        "Kalau cocok, lanjut beli paket lewat /beli.", [[{ text: "🛒 Beli VPN", callback_data: "menu:beli", style: "success" }]], midTrial);
      // Trial berhasil: kabari admin (calon pembeli — bisa di-follow-up).
      // Trial admin sendiri tidak dikabari (kabariAdmin skip).
      await kabariAdmin(env, cb.from.id,
        "🎁 Trial baru — " + (namaPembeli(cb.from) || ("ID " + cb.from.id)) + " (" + (server?.nama || serverKode) + " / " + proto.toUpperCase() + ", " + menitTrial + " menit).",
        tombolChatPembeli(cb.from.id));
      return;
    }
    // ---- Konfirmasi bayar 2 langkah (28 Nov 2026) ----
    // Dipakai di notif "Order baru", notif gagal buat akun, dan daftar
    // /semuaakun. Ketuk pertama cuma menampilkan ringkasan order +
    // tombol Ya/Batal — akun baru dibuat setelah admin mengetuk Ya,
    // supaya ketukan nyasar tidak bikin akun gratis.
    // konfirmasi: tampilkan prompt; konfirmasiYa: eksekusi;
    // konfirmasiBatal: batalkan. /konfirmasi ORDER_ID (ketik) tetap
    // 1 langkah — admin mengetiknya dengan sengaja.
    // Prompt dari notif order diedit di tempat (pesan notifnya jadi
    // prompt, jadi tombol konfirmasi lama hilang); prompt dari daftar
    // /semuaakun dikirim sebagai pesan baru supaya daftarnya utuh.
    if (data.startsWith("konfirmasi:")) {
      if (!adalahAdmin(env, cb.from.id)) return;
      const orderId = data.slice("konfirmasi:".length);
      const order = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (!order) { await jawabAlert(env, cb.id, "Order tidak ditemukan."); return; }
      if (order.status === "selesai") { await jawabAlert(env, cb.id, "Order ini sudah selesai."); return; }
      const asal = cb.message?.text || "";
      const dariNotif = asal.includes("Order baru " + orderId) || asal.includes("Order perpanjang baru " + orderId) || asal.includes("Order " + orderId + " SUDAH DIBAYAR");
      const midAsal = cb.message?.message_id || 0;
      const jenis = dariNotif ? "notif" : "list";
      const ringkas = "Konfirmasi pembayaran order ini?\n\n" +
        "Order: " + orderId + "\n" +
        "Pembeli: " + (order.pembeli || ("ID " + (order.chatId || "?"))) + "\n" +
        "Paket: " + (order.namaPaket || order.paket || "?") + " — " + (order.protocol || "?").toUpperCase() + " — " + (order.serverNama || order.server || "?") + "\n" +
        "Bayar: Rp" + (order.nominalUnik || order.harga || 0).toLocaleString("id-ID") + "\n\n" +
        "Pastikan uang sudah masuk Dana sebelum mengetuk Ya.";
      const tombolYaBatal = [
        [{ text: "✅ Ya, konfirmasi", callback_data: "konfirmasiYa:" + orderId + ":" + midAsal + ":" + jenis, style: "success" }],
        [{ text: "❌ Batal", callback_data: "konfirmasiBatal:" + orderId + ":" + midAsal + ":" + jenis, style: "danger" }],
      ];
      if (dariNotif && midAsal) await editHtml(env, cb.from.id, midAsal, escapeHtml(ringkas), tombolYaBatal);
      else await sendHtml(env, cb.from.id, escapeHtml(ringkas), tombolYaBatal);
      return;
    }
    if (data.startsWith("konfirmasiYa:")) {
      if (!adalahAdmin(env, cb.from.id)) return;
      const bagian = data.split(":");
      const orderId = bagian[1] || "";
      const midAsal = parseInt(bagian[2] || "0", 10) || null;
      const jenis = bagian[3] || "list";
      const order = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (!order) { await jawabAlert(env, cb.id, "Order tidak ditemukan."); return; }
      if (order.status === "selesai") { await jawabAlert(env, cb.id, "Order ini sudah selesai."); return; }
      await selesaikanOrder(env, orderId, order);
      if (order.status === "selesai") {
        // Sukses: tombol konfirmasi di pesan asal hilang — ganti
        // pesan prompt dengan catatan selesai (tanpa tombol).
        if (cb.message?.message_id) await editHtml(env, cb.from.id, cb.message.message_id, escapeHtml("✅ Sudah dikonfirmasi — Order " + orderId + ", config dikirim ke pembeli."), []);
        // Prompt dari daftar /semuaakun: render ulang daftarnya
        // supaya tombol order ini hilang dari daftar.
        if (jenis === "list" && midAsal) await tampilkanSemuaAkun(env, cb.from.id, midAsal);
        await jawabAlert(env, cb.id, "Order " + orderId + " dikonfirmasi, config dikirim ke pembeli.");
      } else {
        await jawabAlert(env, cb.id, "Order " + orderId + " gagal dibuat, cek pesan berikutnya.");
      }
      return;
    }
    if (data.startsWith("konfirmasiBatal:")) {
      if (!adalahAdmin(env, cb.from.id)) return;
      const bagian = data.split(":");
      const orderId = bagian[1] || "";
      const jenis = bagian[3] || "list";
      const order = await env.ORDERS.get(orderId, "json").catch(() => null);
      if (cb.message?.message_id) {
        const catatan = jenis === "notif" && order
          ? "❌ Konfirmasi dibatalkan — Order " + orderId + " (" + (order.pembeli || ("ID " + (order.chatId || "?"))) + ", " + (order.namaPaket || order.paket || "?") + ", Rp" + (order.nominalUnik || order.harga || 0).toLocaleString("id-ID") + ") masih menunggu bayar. Cek di /semuaakun."
          : "❌ Konfirmasi order " + orderId + " dibatalkan.";
        await editHtml(env, cb.from.id, cb.message.message_id, escapeHtml(catatan), []);
      }
      await jawabAlert(env, cb.id, "Dibatalkan.");
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
      if (akunExpired(target)) { await sendTelegram(env, cb.from.id, "Akun " + (target.username || "") + " sudah expired — tidak bisa diperpanjang. Beli akun baru lewat /beli ya."); return; }
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
        await sendTelegram(env, cb.from.id, "Ganti ke SSH butuh password SSH baru. Ketik password SSH yang kamu mau. Kalau kurang dari 4 karakter, bot tambahkan karakter acak.");
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

  // Mode grup: di grup bot jadi etalase (22 Nov 2026).
  // Perintah yang dilayani: /start, /menu, /harga (boleh pakai
  // @sandekalavpn_bot di belakangnya; @bot lain diabaikan, 22 Nov
  // 2026). Pesan biasa diabaikan — jualan tetap di DM supaya config
  // pembeli tidak bocor ke semua anggota grup.
  const diGrup = msg.chat.type === "group" || msg.chat.type === "supergroup";
  if (diGrup) {
    // (22 Nov 2026) Catat grup, lalu layani perintah etalase
    // (/start, /menu, /harga). Pencatatan grup dikembalikan
    // 28 Nov 2026 HANYA untuk /broadcast manual (siaran buka/tutup
    // tetap dicabut total).
    await catatGrup(env, chatId);
    const tokenPerintah = text.split(" ")[0];
    const mention = tokenPerintah.match(/^\/\S+@([A-Za-z0-9_]+)/);
    // (22 Nov 2026) Perintah yang ditujukan ke bot lain
    // (mis. /start@autosetdark_bot) diabaikan — biar cuma satu bot
    // yang jawab di grup. Tanpa @mention atau @sandekalavpn_bot
    // tetap dilayani.
    if (mention && mention[1].toLowerCase() !== "sandekalavpn_bot") return;
    const perintah = tokenPerintah.replace(/@.+$/, "");
    if (perintah === "/start" || perintah === "/menu" || perintah === "/harga") {
      await tampilkanPromoGrup(env, chatId);
    } else if (perintah === "/trial") {
      // Trial KHUSUS ADMIN (26 Nov 2026) — dan trial tidak jalan di
      // grup supaya config tidak bocor ke anggota: admin diarahkan
      // ke chat pribadi, non-admin ditolak singkat.
      if (adalahAdmin(env, msg.from.id)) {
        await sendTelegram(env, chatId, "Trial khusus admin — ketik /trial di chat pribadi ya.");
      } else {
        await sendTelegram(env, chatId, "Maaf, trial sudah tidak tersedia.");
      }
    }
    return;
  }

  // Tombol bawah permanen = sama dengan perintahnya.
  if (text === "🛒 Beli VPN") { await tampilkanServer(env, chatId); return; }
  if (text === "📦 Status Order") { await tampilkanStatus(env, chatId); return; }
  if (text === "📋 Semua Akun") { await tampilkanSemuaAkun(env, chatId); return; }
  if (text === "/batal") {
    // (28 Nov 2026) Batalkan juga status menunggu admin
    // (Broadcast/Konfirmasi dari tombol menu).
    const tungguBc = await env.ORDERS.get("PENDING_BROADCAST:" + chatId, "json").catch(() => null);
    const tungguKonf = await env.ORDERS.get("PENDING_KONFIRMASI:" + chatId, "json").catch(() => null);
    const pendingOrder = await env.ORDERS.get("pending:" + chatId, "json").catch(() => null);
    const pendingPassAda = await env.ORDERS.get("pendingPass:" + chatId, "json").catch(() => null);
    await env.ORDERS.delete("PENDING_BROADCAST:" + chatId);
    await env.ORDERS.delete("PENDING_KONFIRMASI:" + chatId);
    await env.ORDERS.delete("pending:" + chatId);
    await env.ORDERS.delete("pendingPass:" + chatId);
    if (tungguBc || tungguKonf) {
      await sendTelegram(env, chatId, "Dibatalkan.");
    } else if (pendingOrder || pendingPassAda) {
      await sendTelegram(env, chatId, "Order dibatalkan. Ketik /beli kalau mau pesan lagi.");
    } else if (adalahAdmin(env, chatId)) {
      await sendTelegram(env, chatId, "Tidak ada yang dibatalkan.");
    } else {
      await sendTelegram(env, chatId, "Order dibatalkan. Ketik /beli kalau mau pesan lagi.");
    }
    return;
  }

  // (28 Nov 2026) Status menunggu admin dari tombol Broadcast /
  // Konfirmasi di menu utama — hanya admin, hanya DM (grup sudah
  // kembali di atas). Pesan teks biasa (bukan perintah) dipakai
  // sebagai isi broadcast / ORDER_ID konfirmasi. Perintah lain
  // ("/...") membatalkan penantian lalu diproses seperti biasa.
  if (adalahAdmin(env, chatId)) {
    const pb = await bacaTungguAdmin(env, chatId, "PENDING_BROADCAST:");
    const pk = await bacaTungguAdmin(env, chatId, "PENDING_KONFIRMASI:");
    if (text.startsWith("/")) {
      if (pb) await env.ORDERS.delete("PENDING_BROADCAST:" + chatId);
      if (pk) await env.ORDERS.delete("PENDING_KONFIRMASI:" + chatId);
    } else if (pb) {
      await env.ORDERS.delete("PENDING_BROADCAST:" + chatId);
      await kirimBroadcast(env, chatId, text);
      return;
    } else if (pk) {
      await env.ORDERS.delete("PENDING_KONFIRMASI:" + chatId);
      await konfirmasiOrderId(env, chatId, text.split(" ")[0]);
      return;
    }
  }

  // Password SSH baru saat ganti protokol ke SSH — kalau kurang dari
  // 4 karakter, bot tambahkan karakter acak (disamakan dengan alur
  // order, 22 Nov 2026) dan pembeli dikabari password akhirnya.
  const sshpass = await env.ORDERS.get("sshpass:" + chatId, "json").catch(() => null);
  if (sshpass && !text.startsWith("/")) {
    let pass = text;
    if (pass.length < 4) {
      pass = pass + acakHuruf(4 - pass.length);
      await sendTelegram(env, chatId, "Password yang kamu ketik kurang dari 4 karakter, jadi bot menambahkan karakter acak. Password SSH kamu: " + pass);
    }
    await env.ORDERS.delete("sshpass:" + chatId);
    const target = await env.ORDERS.get(sshpass.orderId, "json").catch(() => null);
    if (!target) { await sendTelegram(env, chatId, "Akun tidak ditemukan."); return; }
    await eksekusiGantiProtokol(env, chatId, target, "ssh", pass);
    return;
  }

  // Langkah 4b (SSH saja): pembeli mengetik password SSH sendiri
  // (22 Nov 2026) — password apa adanya. Kalau kurang dari 4 karakter,
  // bot tambahkan karakter acak supaya order tetap jalan (biar cepat),
  // dan pembeli dikabari password akhirnya.
  const pendingPass = await env.ORDERS.get("pendingPass:" + chatId, "json").catch(() => null);
  if (pendingPass && !text.startsWith("/")) {
    let pass = text;
    if (pass.length < 4) {
      pass = pass + acakHuruf(4 - pass.length);
      await sendTelegram(env, chatId, "Password yang kamu ketik kurang dari 4 karakter, jadi bot menambahkan karakter acak. Password SSH kamu: " + pass);
    }
    await env.ORDERS.delete("pendingPass:" + chatId);
    if (!(await tokoBuka(env)) && !adalahAdmin(env, chatId)) {
      await sendTelegram(env, chatId, PESAN_TUTUP);
      return;
    }
    await buatOrder(env, chatId, pendingPass.paket, pendingPass.protocol, pendingPass.username, pendingPass.server, msg.from, pass);
    return;
  }

  // Langkah 4: pembeli mengetik username (atau "-") setelah pilih paket.
  // Username kurang dari 4 huruf atau bentrok: bot tambahkan karakter
  // acak (22 Nov 2026) supaya order tetap jalan — pembeli dikabari
  // nama akhirnya. Yang ditolak cuma username lebih dari 15 karakter.
  const pending = await env.ORDERS.get("pending:" + chatId, "json").catch(() => null);
  if (pending && !text.startsWith("/")) {
    let username = null;
    let catatanUsername = "";
    if (text !== "-") {
      const bersih = text.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (bersih.length > 15) {
        await sendTelegram(env, chatId, "Username maksimal 15 karakter (huruf/angka saja). Ketik lagi, atau ketik - untuk acak.");
        return;
      }
      username = bersih;
      if (username.length < 4) {
        username = username + acakHuruf(4 - username.length);
        catatanUsername = "kurang";
      }
      if (await usernameDipakai(env, username)) {
        username = tambahAcak(username);
        catatanUsername = "dipakai";
      }
    }
    await env.ORDERS.delete("pending:" + chatId);
    if (!(await tokoBuka(env)) && !adalahAdmin(env, chatId)) {
      await sendTelegram(env, chatId, PESAN_TUTUP);
      return;
    }
    // SSH: password diketik pembeli sendiri — minta dulu, order baru
    // dibuat setelah password masuk.
    if ((pending.protocol || "").toLowerCase() === "ssh") {
      await env.ORDERS.put("pendingPass:" + chatId, JSON.stringify({ server: pending.server, protocol: pending.protocol, paket: pending.paket, username }));
      const infoUsername = catatanUsername === "kurang"
        ? " (yang kamu ketik kurang dari 4 huruf, ditambah karakter acak)"
        : catatanUsername === "dipakai"
          ? " (nama itu sudah dipakai, ditambah karakter acak)"
          : "";
      await sendTelegram(env, chatId, "Username: " + (username || "acak otomatis") + infoUsername + "\n\nKetik password SSH yang kamu mau. Kalau kurang dari 4 karakter, bot tambahkan karakter acak.\nKetik /batal untuk membatalkan.");
      return;
    }
    if (catatanUsername) {
      await sendTelegram(env, chatId, catatanUsername === "kurang"
        ? "Username yang kamu ketik kurang dari 4 huruf, jadi bot menambahkan karakter acak. Username kamu: " + username
        : "Username yang kamu ketik sudah dipakai, jadi bot menambahkan karakter acak. Username kamu: " + username);
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
    // Trial KHUSUS ADMIN (26 Nov 2026) — cek pengirim, bukan chat.
    if (!adalahAdmin(env, msg.from.id)) {
      await sendTelegram(env, chatId, "Maaf, trial sudah tidak tersedia.");
      return;
    }
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

  if (text === "/ceknadia") {
    await tampilkanCekNadia(env, chatId);
    return;
  }

  if (text === "/cekfield") {
    await tampilkanCekField(env, chatId);
    return;
  }

  // Perintah admin: /cekduitku [ORDER_ID] — diagnosa Duitku (26 Nov 2026).
  // READ-ONLY: tidak memanggil API Duitku, tidak mengubah order, tidak
  // mengirim pesan ke pembeli. Menjawab kenapa order tidak dapat link
  // "Bayar via Duitku": fitur nonaktif (env kosong di Worker) atau
  // createInvoice ditolak (error mentah tersimpan di order.duitkuError).
  if (text === "/cekduitku" || text.startsWith("/cekduitku ")) {
    if (!adalahAdmin(env, chatId)) {
      await sendTelegram(env, chatId, "Perintah ini hanya untuk admin.");
      return;
    }
    const arg = text.slice("/cekduitku".length).trim();
    let order = null;
    if (arg) {
      order = await env.ORDERS.get(arg, "json").catch(() => null);
    } else {
      order = await orderTerakhir(env, chatId);
    }
    if (!order) {
      await sendTelegram(env, chatId, arg ? "Order " + arg + " tidak ditemukan." : "Belum ada order terakhir.");
      return;
    }
    const aktif = duitkuAktif(env);
    const baris = [
      "🔍 Cek Duitku — " + order.id,
      "Status: " + order.status,
      "Nominal: Rp" + Number(order.nominalUnik || 0).toLocaleString("id-ID"),
      "Duitku: " + (aktif ? "AKTIF" : "NONAKTIF (env DUITKU_MERCHANT_CODE / DUITKU_API_KEY kosong)"),
    ];
    if (order.duitkuReference) baris.push("Reference: " + order.duitkuReference);
    if (order.duitkuPaymentUrl) baris.push("Payment URL: " + order.duitkuPaymentUrl);
    if (order.duitkuError) baris.push("Error: " + order.duitkuError);
    if (!order.duitkuReference && !order.duitkuPaymentUrl && !order.duitkuError) {
      baris.push(aktif ? "Belum ada invoice Duitku untuk order ini." : "Invoice tidak dibuat karena fitur nonaktif.");
    }
    await sendTelegram(env, chatId, baris.join("\n"));
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

  if (text === "/harga") {
    const buka = await tokoBuka(env);
    await sendTelegram(env, chatId,
      "💰 Harga SANDEKALA VPN\n\n1 hari — Rp800\n7 hari — Rp3.300\n30 hari — Rp10.000" +
      (adalahAdmin(env, msg.from.id) ? "\n\n🎁 Trial gratis 30 menit (kuota 1 GB)." : "") +
      "\nTOKO: " + (buka ? "🟢 BUKA" : "🔴 TUTUP"),
      [[{ text: "🛒 Beli VPN", callback_data: "menu:beli", style: "success" }]]);
    return;
  }

  // Perintah admin: /buka dan /tutup (toko buka/tutup ala warung).
  // Kalau toko sudah dalam status yang diminta, cukup beri tahu
  // admin (28 Nov 2026).
  if (text === "/buka" || text === "/tutup") {
    if (!adalahAdmin(env, chatId)) return;
    const mauBuka = text === "/buka";
    if ((await tokoBuka(env)) === mauBuka) {
      await sendTelegram(env, chatId, mauBuka ? "Toko sudah buka." : "Toko sudah tutup.");
      return;
    }
    await setToko(env, mauBuka);
    await catatToggleToko(env);
    await sendTelegram(env, chatId, mauBuka
      ? "🟢 Toko DIBUKA. Pembeli sudah bisa order dan perpanjang lagi."
      : "🔴 Toko DITUTUP. Pembeli hanya bisa lihat-lihat (menu, daftar server, status, akun).");
    return;
  }

  // Perintah admin: /setdeskripsi — pasang deskripsi bot (tampil di
  // profil: "Apa yang dapat bot ini lakukan?") lewat setMyDescription.
  // Dipakai sekali setelah deploy; kalau teks deskripsi diubah di kode,
  // kirim lagi.
  if (text === "/setdeskripsi") {
    if (!adalahAdmin(env, chatId)) return;
    const r = await telegramApi(env, "setMyDescription", { description: DESKRIPSI_BOT });
    await sendTelegram(env, chatId, r && r.ok ? "✅ Deskripsi bot sudah dipasang — cek di profil @sandekalavpn_bot." : "😕 Gagal memasang deskripsi, coba lagi nanti ya.");
    return;
  }

  // Perintah admin: /konfirmasi ORDER_ID (cara utama konfirmasi bayar:
  // cek Dana lalu /konfirmasi — MacroDroid sudah tidak dipakai).
  if (text.startsWith("/konfirmasi ")) {
    await konfirmasiOrderId(env, chatId, text.split(" ")[1]);
    return;
  }
}


// ---- STATUS SERVER (live dari GET /servers, fallback snapshot 19 Nov) ----
// Tombol server menampilkan slot kosong, mis. "CLOUDMATIKA — sisa 6"
// (warna tombol = status: hijau slot banyak, biru sisa ≤ 10, merah PENUH).
// Live: GET {RESELLER_API_URL}/servers (Bearer sama) — cocokkan per
// server_id, baca used/limit/is_full. Kalau gagal (API mati dsb.),
// pakai used/limit snapshot 19 Nov 2026 di daftar SERVERS di atas.
// Ambil daftar server mentah dari API penyedia (GET /servers).
// Return: { list, debug, raw } — list: array objek server apa adanya
// (null kalau gagal), debug: alasan gagal (untuk admin saja),
// raw: JSON level atas apa adanya (untuk /cekfield).
async function ambilDaftarServerLive(env) {
  const fail = (debug) => ({ list: null, debug, raw: null });
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
    return { list: arr, debug: "", raw: j };
  } catch (e) { return fail("fetch error: " + String(e && e.message || e).slice(0, 120)); }
}

// Status slot live per server — dipakai daftar server & menu.
// Return: { map, debug } — map: serverId -> {used, limit, penuh}.
async function ambilStatusServerLive(env) {
  const { list, debug } = await ambilDaftarServerLive(env);
  if (!list) return { map: null, debug };
  const map = {};
  for (const x of list) {
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
  // Label tombol daftar server TANPA emoji status (27 Nov 2026):
  // status slot kini ditunjukkan WARNA tombol (styleServer) — hijau
  // slot banyak, biru sisa ≤ 10, merah PENUH. Teks "sisa N" dan
  // "— PENUH" tetap dipertahankan sebagai informasi.
  const nama = s.nama.replace(" — PENUH", "");
  const st = statusServer(s, live);
  if (st.penuh) return nama + " — PENUH";
  if (st.sisa !== null) return nama + " — sisa " + st.sisa;
  return nama;
}

// Warna tombol daftar server mengikuti status slot (27 Nov 2026).
// Telegram tidak punya tombol kuning — slot sedikit (dulu 🟡) jadi
// biru (primary). Dipakai tombolDaftarServer + daftar Pindah Server.
function styleServer(s, live) {
  const st = statusServer(s, live);
  if (st.penuh) return "danger";
  if (st.sisa !== null && st.sisa <= 10) return "primary";
  return "success";
}

// Langkah 1 beli: pilih server dulu (semua 22 server Nadia).
// Server penuh tampil tapi TIDAK bisa diklik untuk lanjut —
// tombolnya pakai callback "penuh:" yang cuma menampilkan
// peringatan pop-up "server penuh, pilih server lain".
// ================= TAMPILAN ALA PANEL (gaya bot panel, isi tetap SANDEKALA) ====
// /start & /menu -> kotak MENU UTAMA (monospace) + tombol inline hijau.
// Daftar server -> teks ringkas (legenda warna + baris harga sekali +
// pagination Page 1/2, footer - SANDEKALAVPN - tebal); nama + sisa slot
// ada di tombol, bukan di teks (27 Nov 2026).
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

// Mode grup: di grup bot hanya jadi etalase — info singkat + tombol
// ke DM. Jualan (beli/config) HANYA di chat pribadi supaya
// config pembeli tidak bocor ke semua anggota grup.
async function tampilkanPromoGrup(env, chatId) {
  const buka = await tokoBuka(env);
  const teks =
    "🛡️ SANDEKALA VPN\n\n" +
    "Harga: Rp10.000 / bulan\n" +
    "TOKO: " + (buka ? "🟢 BUKA" : "🔴 TUTUP") + "\n\n" +
    "Order lewat chat pribadi ya — klik tombol di bawah.";
  await sendTelegram(env, chatId, teks,
    [[{ text: "🛒 Order di Chat Pribadi", url: "https://t.me/sandekalavpn_bot", style: "primary" }]]);
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
  baris.push(GARIS_PANEL, "SERVER TERSEDIA: " + tersedia + " / " + SERVERS.length + " SERVERS", "TOKO: " + (buka ? "🟢 BUKA" : "🔴 TUTUP"), GARIS_PANEL, "Admin: @Asepbesot", GARIS_PANEL);
  if (isAdmin) baris.push("ADMIN: /semuaakun • /broadcast PESAN • /konfirmasi ORDER_ID • /buka • /tutup • /ceknadia • /cekfield", GARIS_PANEL);
  const html = baris.map((x) => (x === "MENU UTAMA" || x === "INFORMASI PELANGGAN") ? "<b>" + escapeHtml(x) + "</b>" : escapeHtml(x)).join("\n");
  const tombol = [
    [{ text: "🛒 Beli VPN", callback_data: "menu:beli", style: "success" }],
    [{ text: "📦 Status Order", callback_data: "menu:status", style: "primary" }],
    [{ text: "👤 Akun Saya", callback_data: "menu:akun", style: "primary" }],
  ];
  // Tombol trial HANYA untuk admin (26 Nov 2026) — pembeli tidak
  // bisa trial lagi, jadi tombolnya disembunyikan dari menu mereka.
  if (isAdmin) tombol[1] = [{ text: "🎁 Trial Gratis", callback_data: "menu:trial", style: "primary" }, { text: "📦 Status Order", callback_data: "menu:status", style: "primary" }];
  // Tombol admin (28 Nov 2026): baris 1 tiga tombol (Semua Akun,
  // Cek Nadia, Cek Field), baris 2 dua tombol (Broadcast,
  // Konfirmasi), toggle toko sendirian di baris paling bawah.
  if (isAdmin) tombol.push([
    { text: "📋 Semua Akun", callback_data: "menu:semua", style: "primary" },
    { text: "🔍 Cek Nadia", callback_data: "menu:ceknadia", style: "primary" },
    { text: "🔍 Cek Field", callback_data: "menu:cekfield", style: "primary" },
  ]);
  if (isAdmin) tombol.push([
    { text: "📣 Broadcast", callback_data: "menu:broadcast", style: "primary" },
    { text: "✅ Konfirmasi", callback_data: "menu:konfirmasi", style: "primary" },
  ]);
  if (isAdmin) tombol.push([{ text: buka ? "🔴 Tutup Toko" : "🟢 Buka Toko", callback_data: "menu:toko", style: "primary" }]);
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

function teksDaftarServer(judul, halaman, totalHalaman, tampilkanHarga) {
  // Teks ringkas (27 Nov 2026, perintah Asep): blok per-server dihapus —
  // nama + sisa slot sudah terwakili tombol (warna = status slot).
  // Baris harga cuma mode beli; mode trial tidak (trial gratis).
  // Footer SANDEKALAVPN di-bold — jadi <b> dikeluarkan literal, judul
  // di-escape sendiri; pemanggil JANGAN escapeHtml lagi hasilnya.
  const barisHarga = tampilkanHarga
    ? "\n💵 Harga: 1 hari Rp800 • 7 hari Rp3.300 • 30 hari Rp10.000\n" + GARIS_PANEL
    : "";
  return escapeHtml(judul) + "\n" + GARIS_PANEL + barisHarga +
    "\nHalaman " + (halaman + 1) + "/" + totalHalaman + "\n" + GARIS_PANEL + "\n- <b>SANDEKALAVPN</b> -\n" + GARIS_PANEL;
}

function tombolDaftarServer(daftar, live, mode, halaman, totalHalaman) {
  // Satu tombol per baris (lebar penuh): sebelumnya 2 kolom, nama server
  // yang panjang kepotong dan tanda kapasitas (dulu 🟢/🟡 sisa X,
  // kini warna tombol) tidak
  // kelihatan (19 Nov 2026). Ukuran huruf tombol tidak bisa diubah —
  // itu diatur Telegram — jadi solusinya tombolnya dilebarkan.
  const tombol = [];
  for (const s of daftar) {
    const st = statusServer(s, live);
    if (mode === "trial") tombol.push([{ text: s.nama.replace(" — PENUH", ""), callback_data: "tserver:" + s.kode, style: styleServer(s, live) }]);
    else tombol.push([{ text: labelServer(s, live), callback_data: (st.penuh ? "penuh:" : "server:") + s.kode, style: styleServer(s, live) }]);
  }
  const nav = [];
  const kunci = mode === "trial" ? "trypage:" : "srvpage:";
  if (halaman > 0) nav.push({ text: "⬅️ Prev", callback_data: kunci + (halaman - 1), style: "primary" });
  if (halaman < totalHalaman - 1) nav.push({ text: "Next ➡️", callback_data: kunci + (halaman + 1), style: "primary" });
  if (nav.length) tombol.push(nav);
  tombol.push([{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]);
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
    ? "🎁 Trial gratis 30 menit (kuota 1 GB, 1 IP)."
    : "Pilih servernya:\n🟢 Hijau: tersedia  •  🔵 Biru: hampir penuh (sisa ≤ 10 slot)  •  🔴 Merah: PENUH tidak bisa dipilih\nAngka = slot kosong" + (live.map ? " (status terbaru)." : " (status per 19 Nov — gagal ambil status terbaru).");
  // Teks biasa (bukan <pre>) supaya tidak muncul tombol SALIN KODE
  // bawaan Telegram — sama seperti menu (permintaan Asep 19 Nov 2026).
  // teksDaftarServer sudah meng-escape judul sendiri + mengeluarkan
  // <b> footer literal — jangan escapeHtml lagi di sini.
  const html = teksDaftarServer(judul, halaman, totalHalaman, mode === "beli");
  const tombol = tombolDaftarServer(daftar, live, mode, halaman, totalHalaman);
  if (messageId) await editHtml(env, chatId, messageId, html, tombol);
  else await sendHtml(env, chatId, html, tombol);
}

async function tampilkanServer(env, chatId, halaman, messageId) {
  await tampilkanDaftarServer(env, chatId, "beli", halaman || 0, messageId || null);
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
  if (messageId) await editHtml(env, chatId, messageId, escapeHtml(teks), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]]);
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
    if (akunExpired(target)) {
      await sendTelegram(env, chatId, "Akun " + (target.username || "") + " sudah expired — tidak bisa diperpanjang. Beli akun baru lewat /beli ya.");
      return;
    }
    const tombol = PAKET.map((p) => [
      { text: p.nama + " — Rp" + p.harga.toLocaleString("id-ID"), callback_data: "renew:" + orderId + ":" + p.kode, style: "primary" },
    ]);
    tombol.push([{ text: "🔙 Kembali ke Akun", callback_data: "menu:akun", style: "danger" }]);
    await sendTelegram(env, chatId, "Perpanjang akun " + (target.username || "") + " (" + (target.namaPaket || "") + "). Pilih durasi tambahan:", tombol);
    return;
  }
  if (aksi === "pindah") {
    const liveMig = await ambilStatusServerLive(env);
    const tombol = SERVERS.filter((s) => !statusServer(s, liveMig).penuh && s.kode !== target.server).map((s) => [
      { text: labelServer(s, liveMig), callback_data: "mig:" + orderId + ":" + s.kode, style: styleServer(s, liveMig) },
    ]);
    tombol.push([{ text: "🔙 Kembali ke Akun", callback_data: "menu:akun", style: "danger" }]);
    await sendTelegram(env, chatId, "Pindah server akun " + (target.username || "") + ". Sisa masa aktif ikut pindah. Pilih server tujuan:", tombol);
    return;
  }
  if (aksi === "ganti") {
    const daftar = PROTOKOL.filter((p) => p.kode !== (target.protocol || "").toLowerCase());
    const tombol = daftar.map((p) => [
      { text: p.nama, callback_data: "gproto:" + orderId + ":" + p.kode, style: "primary" },
    ]);
    tombol.push([{ text: "🔙 Kembali ke Akun", callback_data: "menu:akun", style: "danger" }]);
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
      [{ text: "✅ Ya, hapus", callback_data: "hapusya:" + orderId, style: "danger" }],
      [{ text: "❌ Batal", callback_data: "hapusbatal:" + orderId, style: "danger" }],
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
    [[{ text: "✅ Konfirmasi Pembayaran", callback_data: "konfirmasi:" + orderId, style: "success" }],
     tombolChatPembeli(chatId)]);
  await sendTelegram(env, chatId,
    "Order perpanjang " + orderId + " dibuat.\n\n" +
    "Akun: " + (target.username || "") + " — tambah " + paket.nama + " — Rp" + paket.harga.toLocaleString("id-ID") + "\n" +
    "TOLONG BAYAR SESUAI NOMINAL HARGA YANG TERTERA: Rp" + nominalUnik.toLocaleString("id-ID") + "\n\n" +
    "Scan QRIS DANA Bisnis SANDEKALA dengan nominal di atas. Setelah bayar, admin akan cek pembayaranmu lalu masa aktif bertambah.");
  if (env.QRIS_IMAGE_URL) {
    await sendPhoto(env, chatId, env.QRIS_IMAGE_URL,
      "QRIS DANA Bisnis SANDEKALA — bayar Rp" + nominalUnik.toLocaleString("id-ID") + ". Order " + orderId);
  }
  // Duitku (26 Nov 2026): link bayar otomatis sebagai TAMBAHAN —
  // gagal / nonaktif = diam, bayar manual di atas tetap jalan.
  await kirimLinkBayarDuitku(env, order);
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
  // Config baru cuma dipakai kalau Nadia benar-benar mengembalikannya.
  // Kalau change-protocol tidak mengembalikan config, ambil lewat
  // details (jalur yang sama dipakai Perbaiki Akun) — pembeli harus
  // dapat akun SSH-nya, bukan config lama. Kalau details juga tidak
  // memberi config, kirim pesan sukses + password baru (SSH) saja,
  // JANGAN config lama (22 Nov 2026).
  let configBaru = null;
  if (r.data?.config) {
    configBaru = ambilConfigDariData(r.data);
  } else {
    const det = await nadiaPost(env, "/vpn/account/details", { account_id: target.accountId });
    if (det.ok && det.data?.config) configBaru = ambilConfigDariData(det.data);
  }
  if (configBaru) {
    // SSH: pastikan password yang dikirim ke Nadia ikut tampil di
    // config — kalau respons Nadia tidak menyebutkannya, pembeli tidak
    // akan tahu password barunya (apalagi kalau ditambal acak).
    if (proto === "ssh" && sshPassword && !configBaru.includes("Password")) {
      configBaru += "\nPassword: " + sshPassword;
    }
    target.config = configBaru;
  }
  await env.ORDERS.put(target.id, JSON.stringify(target));
  if (configBaru) await kirimConfig(env, chatId, "✅ Protokol akun " + (target.username || "") + " sekarang " + proto.toUpperCase() + ". Masa aktif tetap.\n\nConfig terbaru:", configBaru);
  else await sendTelegram(env, chatId, "✅ Protokol akun " + (target.username || "") + " sekarang " + proto.toUpperCase() + ". Masa aktif tetap." + (proto === "ssh" && sshPassword ? "\nPassword SSH baru kamu: " + sshPassword : ""));
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
  // Hemat KV: LIST + GET semua order tadinya jalan tiap kali pembeli cek
  // status. Order kedaluarsa baru dihapus setelah 24 jam, jadi bersih-bersih
  // 1x per jam per isolate sudah cukup.
  if (Date.now() - bersihOrderTerakhir < 3600 * 1000) return 0;
  bersihOrderTerakhir = Date.now();
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

// Bandingkan daftar server live dari penyedia dengan daftar di bot.
// Dipakai /ceknadia. Kembalikan peta live
// plus daftar perubahan (baru / hilang / ganti nama / ganti protokol).
function bandingkanServerLive(list) {
  const liveById = new Map();
  for (const x of list) {
    const id = x.server_id || x.id || x.uuid;
    if (id) liveById.set(String(id), x);
  }
  const namaLive = (x) => String(x.name || x.nama || x.server_name || x.domain || "?").replace(/\s+/g, " ").trim();
  // Domain live per server — bentuk respons /servers tidak
  // didokumentasikan Nadia; ambil dari field yang paling mungkin
  // (domain/host/hostname/server_domain, atau object server.*).
  // IP mentah ditolak (bukan domain). Kembalikan null kalau tidak ada.
  const domainLive = (x) => {
    const srv = x.server && typeof x.server === "object" ? x.server : null;
    const cand = [x.domain, x.host, x.hostname, x.server_domain, x.server_host, srv?.domain, srv?.host, x.address];
    for (const v of cand) {
      if (typeof v !== "string" || !v.trim()) continue;
      const d = v.trim().toLowerCase().split(":")[0];
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) continue; // IP, bukan domain
      if (d.includes(".")) return d;
    }
    return null;
  };
  const protoLive = (x) => {
    const p = x.protocols || x.protocol || x.supported_protocols || [];
    if (typeof p === "string") return p.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
    if (Array.isArray(p)) return p.map((v) => String(v).toLowerCase());
    return [];
  };
  const baru = [], hilang = [], gantiNama = [], gantiProto = [], gantiDomain = [];
  for (const [id, x] of liveById) {
    const b = SERVERS.find((s) => String(s.serverId) === id);
    if (!b) { baru.push(x); continue; }
    const namaBot = b.nama.replace(" — PENUH", "").replace(/\s+/g, " ").trim();
    if (namaLive(x) !== "?" && namaLive(x) !== namaBot) gantiNama.push({ bot: b, live: namaLive(x) });
    const pl = protoLive(x).slice().sort().join(",");
    const pb = (b.protocols || []).slice().sort().join(",");
    if (pl && pl !== pb) gantiProto.push({ bot: b, live: protoLive(x) });
    // Domain: hanya dibandingkan kalau bot tahu domain lama server
    // itu (b.domain) DAN live membawa domain. Beda → laporkan.
    const dl = domainLive(x);
    if (dl && b.domain && dl !== String(b.domain).toLowerCase()) gantiDomain.push({ bot: b, lama: b.domain, baru: dl });
  }
  for (const s of SERVERS) {
    if (!liveById.has(String(s.serverId))) hilang.push(s);
  }
  // Domain di tabel NS yang sudah tidak muncul di daftar live —
  // sinyal tabel NS ketinggalan (mis. domain server diganti Nadia
  // padahal bot tidak tahu domain lamanya). Hanya dicek kalau
  // SEMUA server live membawa domain; kalau respons tidak membawa
  // domain (sebagian/tidak sama sekali), diam saja — bukan sinyal.
  // Domain yang sudah dilaporkan sebagai "lama" di gantiDomain
  // tidak dilaporkan lagi di sini, begitu juga domain legacy di
  // NS_DOMAIN_LEGACY (sengaja dipertahankan sebagai jaring
  // pengaman, jadi tidak pernah diperingatkan sebagai yatim).
  const domainNsYatim = [];
  const semuaAdaDomain = liveById.size > 0 && [...liveById.values()].every((x) => domainLive(x));
  if (semuaAdaDomain) {
    const liveDomains = new Set([...liveById.values()].map((x) => domainLive(x)));
    const sudahDilaporkan = new Set(gantiDomain.map((g) => String(g.lama).toLowerCase()));
    for (const d of Object.keys(NS_PER_DOMAIN)) {
      if (NS_DOMAIN_LEGACY.has(d.toLowerCase())) continue; // kunci legacy — sengaja dipertahankan
      if (!liveDomains.has(d.toLowerCase()) && !sudahDilaporkan.has(d.toLowerCase())) domainNsYatim.push(d);
    }
  }
  return { liveById, baru, hilang, gantiNama, gantiProto, gantiDomain, domainNsYatim, namaLive, protoLive, domainLive };
}

// /ceknadia (admin saja): bandingkan daftar server live dari
// penyedia dengan daftar di bot. Lapor server baru, server hilang,
// nama berubah, protokol berubah, domain berubah (28 Nov 2026 —
// domain penting karena tabel NS_PER_DOMAIN dikunci per domain),
// dan harga modal berubah (28 Nov 2026 — hasil live /cekfield:
// field pricing di /servers = harga modal).
async function tampilkanCekNadia(env, chatId, messageId) {
  if (!adalahAdmin(env, chatId)) return;
  const kirim = async (teks) => {
    if (messageId) await editHtml(env, chatId, messageId, escapeHtml(teks), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]]);
    else await sendTelegram(env, chatId, teks);
  };
  const { list, debug } = await ambilDaftarServerLive(env);
  if (!list) { await kirim("❌ Gagal ambil daftar server dari penyedia: " + debug); return; }
  const { liveById, baru, hilang, gantiNama, gantiProto, gantiDomain, domainNsYatim, namaLive, protoLive, domainLive } = bandingkanServerLive(list);
  // Harga modal: bandingkan field pricing tiap server live dengan
  // baseline HARGA_MODAL. Getter toleran: kunci yang dikenali
  // per_day/per_week/per_month (bentuk live) atau "1"/"7"/"30"
  // (bentuk lain yang mungkin). Bentuk yang tidak dikenali atau
  // angka yang bukan bilangan -> dilaporkan mentah, tanpa crash.
  const fmtRp = (n) => Number(n).toLocaleString("id-ID");
  const ringkasHarga = (v) => {
    let s;
    try { s = typeof v === "string" ? v : JSON.stringify(v); } catch { s = String(v); }
    if (s === undefined || s === null) s = "?";
    return s.length > 80 ? s.slice(0, 80) + "…" : s;
  };
  const keAngka = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
    return NaN;
  };
  const ambilPricing = (x) => {
    const p = x && x.pricing;
    if (p === undefined || p === null) return null; // tidak ada info harga
    if (typeof p !== "object" || Array.isArray(p)) return { aneh: p };
    const ambil = (...kunci) => {
      for (const k of kunci) if (p[k] !== undefined && p[k] !== null) return p[k];
      return undefined;
    };
    const d = ambil("per_day", "per_1day", "1", "day", "daily");
    const w = ambil("per_week", "per_1week", "7", "week", "weekly");
    const m = ambil("per_month", "per_1month", "30", "month", "monthly");
    if (d === undefined && w === undefined && m === undefined) return { aneh: p };
    return { per_day: d, per_week: w, per_month: m };
  };
  const namaServerLive = (x) => String(x.name || x.nama || x.server_id || x.id || "?").replace(/\s+/g, " ").trim();
  const bedaHarga = [], tanpaHarga = [], anehHarga = [];
  for (const x of list) {
    const pr = ambilPricing(x);
    const nama = namaServerLive(x);
    if (pr === null) { tanpaHarga.push(nama); continue; }
    if (pr.aneh !== undefined) { anehHarga.push({ nama, mentah: pr.aneh }); continue; }
    if (pr.per_day === undefined || pr.per_week === undefined || pr.per_month === undefined) { anehHarga.push({ nama, mentah: x.pricing }); continue; }
    const nDay = keAngka(pr.per_day), nWeek = keAngka(pr.per_week), nMonth = keAngka(pr.per_month);
    if (!Number.isFinite(nDay) || !Number.isFinite(nWeek) || !Number.isFinite(nMonth)) { anehHarga.push({ nama, mentah: x.pricing }); continue; }
    const berubah = [];
    if (nDay !== HARGA_MODAL.per_day) berubah.push("per_day " + fmtRp(HARGA_MODAL.per_day) + " → " + fmtRp(nDay));
    if (nWeek !== HARGA_MODAL.per_week) berubah.push("per_week " + fmtRp(HARGA_MODAL.per_week) + " → " + fmtRp(nWeek));
    if (nMonth !== HARGA_MODAL.per_month) berubah.push("per_month " + fmtRp(HARGA_MODAL.per_month) + " → " + fmtRp(nMonth));
    if (berubah.length) bedaHarga.push({ nama, berubah });
  }
  const baris = ["🔍 Cek Nadia — daftar server live vs bot", "Live: " + liveById.size + " server • Bot: " + SERVERS.length + " server", ""];
  if (!baru.length && !hilang.length && !gantiNama.length && !gantiProto.length && !gantiDomain.length && !domainNsYatim.length && !bedaHarga.length && !anehHarga.length) {
    baris.push("✅ Semua sama — tidak ada perubahan.");
  } else {
    if (baru.length) {
      baris.push("🆕 BARU di Nadia (belum ada di bot):");
      for (const x of baru) baris.push("• " + namaLive(x) + (domainLive(x) ? " — domain: " + domainLive(x) : "") + " — protokol: " + (protoLive(x).join(", ") || "?") + " — ID: " + (x.server_id || x.id || "?"));
    }
    if (hilang.length) {
      baris.push("🗑️ HILANG dari Nadia (masih ada di bot):");
      for (const s of hilang) baris.push("• " + s.nama);
    }
    if (gantiNama.length) {
      baris.push("✏️ NAMA BERUBAH:");
      for (const g of gantiNama) baris.push("• Bot: " + g.bot.nama + " → Nadia: " + g.live);
    }
    if (gantiProto.length) {
      baris.push("🔀 PROTOKOL BERUBAH:");
      for (const g of gantiProto) baris.push("• " + g.bot.nama + ": bot [" + (g.bot.protocols || []).join(", ") + "] → Nadia [" + g.live.join(", ") + "]");
    }
    if (gantiDomain.length) {
      baris.push("🌐 DOMAIN BERUBAH:");
      for (const g of gantiDomain) baris.push("• " + g.bot.nama + ": " + g.lama + " → " + g.baru + " (cek tabel NS)");
    }
    if (domainNsYatim.length) {
      baris.push("⚠️ DOMAIN DI TABEL NS TIDAK ADA LAGI DI NADIA:");
      for (const d of domainNsYatim) baris.push("• " + d + " (cek tabel NS_PER_DOMAIN)");
    }
  }
  // Seksi harga modal — selalu tampil, sesudah seksi domain.
  baris.push("", "💰 HARGA MODAL:");
  if (!bedaHarga.length && !anehHarga.length && !tanpaHarga.length) {
    baris.push("✅ Sama semua (" + fmtRp(HARGA_MODAL.per_day) + "/" + fmtRp(HARGA_MODAL.per_week) + "/" + fmtRp(HARGA_MODAL.per_month) + ")");
  } else {
    for (const b of bedaHarga) baris.push("• " + b.nama + ": " + b.berubah.join(", "));
    for (const a of anehHarga) baris.push("• " + a.nama + ": pricing aneh: " + ringkasHarga(a.mentah));
    if (tanpaHarga.length === list.length) baris.push("• Tidak ada info harga di semua " + list.length + " server (API tidak mengirim pricing)");
    else for (const n of tanpaHarga) baris.push("• " + n + ": tidak ada info harga");
  }
  baris.push("", "Catatan: harga modal diambil dari field pricing di /servers Nadia; harga jual tidak berubah otomatis.");
  let teks = baris.join("\n");
  if (teks.length > 3900) teks = teks.slice(0, 3900);
  await kirim(teks);
}

// /cekfield (admin saja, DM saja — pola sama seperti /ceknadia):
// probe struktur respons /servers — melihat apakah Nadia membawa
// angka latensi/uptime/status node seperti di dashboard Nadia
// (28 Nov 2026). Tampilan polos sejak 28 Nov 2026 (perintah Asep:
// "tampilannya bikin pusing"): harga modal Rp, trial, migrasi,
// CloudFront, aktif — tanpa JSON mentah, tanpa nama field Inggris
// di bagian utama; daftar field mentah pindah ke paling bawah.
// Tidak pernah menampilkan token, saldo, atau data akun. Satu
// pesan, maks ~4000 karakter.
async function tampilkanCekField(env, chatId) {
  if (!adalahAdmin(env, chatId)) return;
  const { list, debug, raw } = await ambilDaftarServerLive(env);
  if (!list) { await sendTelegram(env, chatId, "❌ Gagal ambil daftar server dari penyedia: " + debug); return; }
  if (!list.length) { await sendTelegram(env, chatId, "🔍 Cek Field — respons /servers Nadia\nServer: 0\n\nRespons berisi 0 server."); return; }
  // Format baru (28 Nov 2026, perintah Asep: "tampilannya bikin
  // pusing"): bahasa polos, tanpa JSON mentah, tanpa nama field
  // Inggris di bagian utama. Isi data TETAP — hanya cara
  // menampilkannya yang berubah. Logika pengambilan data (getter
  // toleran, deteksi sama/beda antar server, sembunyikan nilai
  // sensitif, cap 3900 karakter) tetap seperti semula.
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const keAngka = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
    return NaN;
  };
  const ringkas = (v, maks) => {
    let s;
    try { s = (typeof v === "string") ? v : JSON.stringify(v); } catch { s = String(v); }
    if (s === undefined || s === null) s = "?";
    return s.length > maks ? s.slice(0, maks) + "…" : s;
  };
  const potongNilai = (v) => ringkas(v, 80);
  const namaServer = (x) => String(x.name || x.server_id || x.id || "?");
  // Harga {day, week, month} dari pricing, kunci toleran
  // (per_day/per_week/per_month atau "1"/"7"/"30"). null kalau
  // tidak ada / tidak terbaca.
  const ambilHarga = (x) => {
    const p = x && x.pricing;
    if (p === undefined || p === null || typeof p !== "object" || Array.isArray(p)) return null;
    const ambil = (...kunci) => { for (const k of kunci) if (p[k] !== undefined && p[k] !== null) return p[k]; return undefined; };
    const d = keAngka(ambil("per_day", "per_1day", "1", "day", "daily"));
    const w = keAngka(ambil("per_week", "per_1week", "7", "week", "weekly"));
    const m = keAngka(ambil("per_month", "per_1month", "30", "month", "monthly"));
    if (!Number.isFinite(d) || !Number.isFinite(w) || !Number.isFinite(m)) return null;
    return { day: d, week: w, month: m };
  };
  // Server contoh: SELOW bila ada, kalau tidak server pertama.
  const contoh = list.find((x) => String(x.name || "").includes("SELOW")) || list[0];
  const kunciContoh = Object.keys(contoh);

  const baris = ["🔍 Cek Field — respons /servers Nadia", "Server: " + list.length, ""];

  // 💰 Harga modal.
  const triple = (h) => rp(h.day) + " / " + rp(h.week) + " / " + rp(h.month);
  const varianHarga = new Map(); // "d/w/m" -> harga
  let tanpaHarga = 0, mentahAneh = null;
  for (const x of list) {
    const h = ambilHarga(x);
    if (!h) {
      if (x.pricing === undefined || x.pricing === null) tanpaHarga++;
      else if (mentahAneh === null) mentahAneh = x.pricing;
      continue;
    }
    const k = h.day + "/" + h.week + "/" + h.month;
    if (!varianHarga.has(k)) varianHarga.set(k, h);
  }
  if (!varianHarga.size) {
    baris.push("💰 Harga modal: " + (mentahAneh !== null ? "(tidak terbaca: " + ringkas(mentahAneh, 80) + ")" : "(tidak ada)"));
  } else {
    const hargaUtama = ambilHarga(contoh) || varianHarga.values().next().value;
    let jmlUtama = 0;
    for (const x of list) {
      const h = ambilHarga(x);
      if (h && h.day === hargaUtama.day && h.week === hargaUtama.week && h.month === hargaUtama.month) jmlUtama++;
    }
    if (varianHarga.size === 1) {
      let s = "💰 Harga modal: " + triple(hargaUtama) + " (sama di semua " + jmlUtama + " server)";
      if (tanpaHarga) s += " — " + tanpaHarga + " server tanpa harga";
      baris.push(s);
    } else {
      baris.push("💰 Harga modal: " + triple(hargaUtama));
      const beda = [];
      for (const x of list) {
        const h = ambilHarga(x);
        if (h && (h.day !== hargaUtama.day || h.week !== hargaUtama.week || h.month !== hargaUtama.month)) beda.push({ nama: namaServer(x), harga: h });
      }
      for (const b of beda.slice(0, 3)) baris.push("• " + b.nama + ": " + triple(b.harga));
      if (beda.length > 3) baris.push("(+" + (beda.length - 3) + " server lain beda)");
    }
  }

  // 🎁 Trial.
  const teksDurasi = (v) => {
    if (v === undefined || v === null) return null;
    const n = keAngka(v);
    return Number.isFinite(n) ? n + " menit" : String(v);
  };
  const teksTrial = (x) => {
    if (x.trial_enabled === false) return "mati";
    if (x.trial_enabled !== true) return null;
    const d = teksDurasi(x.trial_duration);
    return d ? "nyala, " + d : "nyala";
  };
  let trialUtama = teksTrial(contoh);
  if (trialUtama === null) for (const x of list) { const t = teksTrial(x); if (t !== null) { trialUtama = t; break; } }
  const varianTrial = new Map(); // teks varian -> nama server pertama
  for (const x of list) {
    const t = teksTrial(x);
    if (t === null || t === trialUtama) continue;
    if (!varianTrial.has(t)) varianTrial.set(t, namaServer(x));
  }
  let sTrial = "🎁 Trial: " + (trialUtama === null ? "(tidak ada)" : trialUtama);
  if (varianTrial.size) {
    const sebut = [...varianTrial.entries()].slice(0, 2).map(([t, n]) => n + ": " + t.replace(/^nyala, /, ""));
    sTrial += " (" + sebut.join("; ") + (varianTrial.size > 2 ? "; +" + (varianTrial.size - 2) + " varian lain" : "") + ")";
  }
  baris.push(sTrial);

  // 🔀 Pindah server.
  let teksMigrasi;
  if (contoh.migration_enabled === false) teksMigrasi = "mati";
  else if (contoh.migration_enabled === true) {
    const h = keAngka(contoh.migration_price);
    teksMigrasi = "nyala" + (Number.isFinite(h) ? ", " + (h > 0 ? rp(h) : "gratis") : "");
  } else teksMigrasi = "(tidak ada)";
  baris.push("🔀 Pindah server: " + teksMigrasi);

  // 🌐 Domain CloudFront.
  const cf = contoh.domain_cloudfront;
  baris.push("🌐 Domain CloudFront: " + (cf === undefined || cf === null || cf === "" ? "kosong" : ringkas(cf, 80)));

  // ✅ Server aktif.
  if (contoh.is_active === true) baris.push("✅ Server aktif");
  else if (contoh.is_active === false) baris.push("❌ Server tidak aktif");
  else baris.push("Server aktif: (tidak ada)");

  // Latensi/uptime — cari di level atas dan di semua entri server
  // (nama unik, nilai pertama yang ketemu). Nilai field yang
  // namanya sensitif tidak ditampilkan. status level atas yang
  // boolean cuma penanda API berhasil, bukan status node — tidak
  // dihitung (data live 21:52 WIB: status: true di level atas).
  baris.push("");
  const POLA = /latency|latensi|ping|uptime|status|health|slow|down/i;
  const SENSITIF = /token|key|secret|password|saldo|balance/i;
  const ketemu = [];
  const catat = (kunci, nilai, levelAtas) => {
    if (!POLA.test(kunci)) return;
    if (levelAtas && kunci === "status" && typeof nilai === "boolean") return;
    if (ketemu.some((k) => k.kunci === kunci)) return;
    ketemu.push({ kunci, tampil: SENSITIF.test(kunci) ? "(nilai disembunyikan)" : potongNilai(nilai) });
  };
  const kunciAtas = (raw && typeof raw === "object" && !Array.isArray(raw)) ? Object.keys(raw) : [];
  for (const k of kunciAtas) catat(k, raw[k], true);
  for (const x of list) for (const k of Object.keys(x)) catat(k, x[k], false);
  if (ketemu.length) baris.push("Latensi/uptime: " + ketemu.map((k) => k.kunci + ": " + k.tampil).join(", "));
  else baris.push("Latensi/uptime: tidak ada di API");

  // Daftar field server contoh — paling bawah, tanpa nama server.
  baris.push("", "Field yang ada: " + (kunciContoh.length ? kunciContoh.join(", ") : "(tidak ada)"));
  let teks = baris.join("\n");
  if (teks.length > 3900) teks = teks.slice(0, 3900);
  await sendTelegram(env, chatId, teks);
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
  const tombolKembali = [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]];
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
  const tombolKonfirmasi = butuhKonfirmasi.map((o) => [{ text: "✅ Konfirmasi " + o.id, callback_data: "konfirmasi:" + o.id, style: "success" }]);
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

// ---- Konfirmasi manual ORDER_ID (ADMIN saja) ----
// Dipakai perintah teks /konfirmasi dan tombol Konfirmasi di menu
// (28 Nov 2026). Hanya order yang sudah "selesai" yang tidak bisa
// dikonfirmasi ulang. Order "paid"/"gagal" (bayar masuk tapi gagal
// buat akun) HARUS bisa dicoba lagi — sebelumnya kondisi ini
// memblokir "paid" juga, jadi /konfirmasi kedua setelah gagal
// selalu ditolak dengan "Order ini sudah dibayar." (cek 19 Nov 2026).
async function konfirmasiOrderId(env, chatId, orderId) {
  if (String(chatId) !== String(env.ADMIN_CHAT_ID)) return;
  orderId = String(orderId || "").trim();
  const order = orderId ? await env.ORDERS.get(orderId, "json").catch(() => null) : null;
  if (!order) { await sendTelegram(env, chatId, "Order tidak ditemukan."); return; }
  if (order.status === "selesai") {
    await sendTelegram(env, chatId, "Order ini sudah selesai."); return;
  }
  await selesaikanOrder(env, orderId, order);
  await sendTelegram(env, chatId, "Order " + orderId + " dikonfirmasi manual.");
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
  // (28 Nov 2026) /broadcast manual juga ke grup tercatat
  // (GRUP:<id>) — pesan yang sama, tanpa auto-hapus.
  const grup = await daftarSemuaGrup(env);
  const daftarGrup = grup || new Set();
  if (!tujuan.size && !daftarGrup.size) { await sendTelegram(env, chatId, "Belum ada pembeli yang tercatat di bot, broadcast batal."); return; }
  await sendTelegram(env, chatId, "📣 Mengirim broadcast ke " + tujuan.size + " pembeli" + (daftarGrup.size ? " dan " + daftarGrup.size + " grup" : "") + "...");
  let ok = 0, gagal = 0, okGrup = 0;
  for (const id of tujuan) {
    const j = await telegramApi(env, "sendMessage", { chat_id: Number(id), text: teks.slice(0, 4000) });
    if (j?.ok) ok++; else gagal++;
  }
  for (const id of daftarGrup) {
    const j = await telegramApi(env, "sendMessage", { chat_id: Number(id), text: teks.slice(0, 4000) });
    if (j?.ok) okGrup++; else gagal++;
  }
  await sendTelegram(env, chatId, "📣 Broadcast selesai: terkirim ke " + ok + " pembeli" + (okGrup ? " dan " + okGrup + " grup" : "") + ".");
}

// ---- Status expired akun (20 Nov 2026) ----
// Akun yang sudah lewat tanggal "Berlaku sampai" tidak bisa
// diperpanjang lagi (sinkron sama Nadia — akun expired tidak bisa
// di-renew di sisi penyedia). Di daftar /akun, akun expired diberi
// label "⏰ EXPIRED" dan tombol Perpanjang disembunyikan.
const BULAN_ID = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5, jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11 };

// Parse tanggal dari teks "Berlaku sampai: 20 Nov 2026, 23:42 WIB"
// (atau "Expires: ...") -> timestamp ms. Jam dianggap WIB (UTC+7).
// Kembalikan null kalau tidak bisa diparse.
function parseExpiredDariConfig(config) {
  if (!config || typeof config !== "string") return null;
  const m = config.match(/(?:Berlaku sampai|Expires)\s*:?\s*(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/i);
  if (!m) return null;
  const bln = BULAN_ID[m[2].toLowerCase().slice(0, 3)];
  if (bln === undefined) return null;
  return Date.UTC(+m[3], bln, +m[1], +m[4] - 7, +m[5]);
}

// true kalau akun sudah expired (lewat tanggal Berlaku sampai).
// Kalau tanggal exp tidak bisa dibaca dari config, anggap BELUM
// expired (jangan blokir perpanjang hanya karena data tidak lengkap).
function akunExpired(order) {
  const exp = parseExpiredDariConfig(order?.config);
  if (exp === null) return false;
  return exp <= Date.now();
}

async function tampilkanAkun(env, chatId, messageId) {
  const daftar = await daftarAkunUser(env, chatId);
  if (!daftar.length) {
    const teks = "Kamu belum punya akun aktif di bot ini. Ketik /beli untuk pesan.";
    if (messageId) await editHtml(env, chatId, messageId, escapeHtml(teks), [[{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]]);
    else await sendTelegram(env, chatId, teks);
    return;
  }
  for (let i = 0; i < daftar.length; i++) {
    const o = daftar[i];
    const expired = akunExpired(o);
    const teks =
      "Akun: " + (o.username || "?") + (expired ? " ⏰ EXPIRED" : "") + "\n" +
      "Paket: " + (o.namaPaket || "?") + " — " + (o.protocol || "?").toUpperCase() + "\n" +
      "Server: " + (o.serverNama || o.server || "?") + "\n" +
      "Order: " + o.id + (expired ? "\nAkun ini sudah habis masa aktifnya — tidak bisa diperpanjang, beli akun baru lewat /beli." : "");
    const tombol = tombolKelola(o.id, !expired);
    if (i === daftar.length - 1) tombol.push([{ text: "🔙 Kembali ke Menu", callback_data: "menu:utama", style: "danger" }]);
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


// Tombol "Chat Pembeli" di semua notif order ke admin — satu ketuk
// langsung buka chat pembeli (pakai ID Telegram, jadi jalan walau
// pembeli tidak punya @username). Dipakai di notif order baru,
// gagal buat akun, terjual, dan perpanjang berhasil.
function tombolChatPembeli(chatIdPembeli) {
  return [{ text: "💬 Chat Pembeli", url: "tg://user?id=" + chatIdPembeli, style: "primary" }];
}

// Kabari admin kalau ada order baru / penjualan berhasil.
// Dipakai supaya admin tetap tahu walau MacroDroid gagal baca notif
// Dana — admin bisa cek Dana lalu /konfirmasi manual.
// isHtml: teks mengandung tag HTML (<b> dst) — kirim lewat sendHtml
// (parse_mode HTML) supaya tag-nya dirender tebal, bukan tampil mentah.
// sendTelegram TIDAK memakai parse_mode, jadi <b> lewat jalur itu
// cuma jadi teks biasa. Dipakai notif "Order baru" + "Terjual"
// (28 Nov 2026); notif lain tetap teks polos.
async function kabariAdmin(env, chatIdPembeli, teks, tombol, isHtml) {
  if (!env.ADMIN_CHAT_ID || String(env.ADMIN_CHAT_ID) === String(chatIdPembeli)) return;
  if (isHtml) await sendHtml(env, env.ADMIN_CHAT_ID, teks, tombol);
  else await sendTelegram(env, env.ADMIN_CHAT_ID, teks, tombol);
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

// ---- Duitku (payment gateway, SANDBOX — 26 Nov 2026) ----
// Mode Pop (halaman bayar milik Duitku): bot cuma membuat invoice
// lalu mengirim paymentUrl ke pembeli; pembeli memilih metode bayar
// di halaman Duitku (QRIS, VA, e-wallet, retail). Bayar manual via
// QRIS DANA tetap jalan sebagai fallback — invoice Duitku hanya
// TAMBAHAN, bukan pengganti. Kalau createInvoice gagal / env tidak
// ada, order tetap jalan manual (jangan gagalkan order).
// Docs resmi (docs.duitku.com/pop/en/, dibaca 26 Nov 2026):
// - createInvoice: POST {sandbox https://api-sandbox.duitku.com |
//   prod https://api-prod.duitku.com}/api/merchant/createInvoice,
//   header x-duitku-signature = HMAC_SHA256(merchantCode+timestamp,
//   apiKey), x-duitku-timestamp (ms), x-duitku-merchantcode.
//   Respons: paymentUrl, reference, statusCode "00".
// - Callback: POST x-www-form-urlencoded ke callbackUrl;
//   signature = HMAC_SHA256(merchantCode+amount+merchantOrderId,
//   apiKey); resultCode "00" = sukses.
// - Changelog Apr 2026: MD5 / SHA256-polos sudah OBSOLETE —
//   yang berlaku sekarang HMAC-SHA256 di semua titik.
// Env (Secrets/vars Worker):
//   DUITKU_MERCHANT_CODE (vars, bukan rahasia — mis. DSxxxxx)
//   DUITKU_API_KEY       (Secret — jangan taruh di [vars])
//   DUITKU_SANDBOX       (vars, "1" = sandbox, "0" = production)
// Kalau DUITKU_MERCHANT_CODE / DUITKU_API_KEY tidak ada, fitur
// Duitku nonaktif diam-diam — order tetap jalan manual.
const DUITKU_CALLBACK_URL = "https://sandekala.radencitraksih.workers.dev/duitku-callback";
const DUITKU_RETURN_URL = "https://t.me/sandekalavpn_bot";
// Masa berlaku invoice Duitku (menit) — disamakan dengan ORDER_TTL_MS
// (30 menit). Docs menyebut contoh 5/10/60 — verifikasi di sandbox
// apakah 30 diterima; kalau createInvoice ditolak, order tetap jalan
// manual (fallback).
const DUITKU_EXPIRY_MENIT = 30;

function duitkuAktif(env) {
  return Boolean(env.DUITKU_MERCHANT_CODE && env.DUITKU_API_KEY);
}

function duitkuBaseUrl(env) {
  return (env.DUITKU_SANDBOX === "0" || env.DUITKU_SANDBOX === "false")
    ? "https://api-prod.duitku.com"
    : "https://api-sandbox.duitku.com";
}

// HMAC-SHA256 -> hex lowercase (WebCrypto; ada di Workers & Node 19+).
async function hmacSha256Hex(key, message) {
  const k = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Bandingkan dua string tanpa bocor lewat waktu (hindari early-exit).
function samakanString(a, b) {
  const x = String(a || ""), y = String(b || "");
  if (x.length !== y.length) return false;
  let beda = 0;
  for (let i = 0; i < x.length; i++) beda |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return beda === 0;
}

// Buat invoice Duitku untuk sebuah order. Kembalikan
// { paymentUrl, reference } kalau berhasil, null kalau gagal /
// fitur nonaktif — pemanggil TIDAK BOLEH menggagalkan order
// kalau ini null (bayar manual tetap jalan).
// Pemetaan merchantOrderId <-> order: merchantOrderId = ID order
// (ORD-...) — jadi callback tinggal GET order itu dari KV, tanpa
// tabel pemetaan tambahan.
async function buatInvoiceDuitku(env, order) {
  if (!duitkuAktif(env)) return null;
  const merchantCode = env.DUITKU_MERCHANT_CODE;
  const timestamp = String(Date.now());
  try {
    const signature = await hmacSha256Hex(env.DUITKU_API_KEY, merchantCode + timestamp);
    const r = await fetch(duitkuBaseUrl(env) + "/api/merchant/createInvoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-duitku-signature": signature,
        "x-duitku-timestamp": timestamp,
        "x-duitku-merchantcode": merchantCode,
      },
      body: JSON.stringify({
        paymentAmount: order.nominalUnik,
        merchantOrderId: order.id,
        productDetails: "SANDEKALA " + (order.namaPaket || "VPN"),
        additionalParam: "",
        merchantUserInfo: String(order.chatId || ""),
        // QRIS SAJA (keputusan Asep 26 Nov 2026): "SP" = kanal QRIS
        // ShopeePay. QR-nya QRIS biasa, jadi bisa dibayar pakai
        // DANA/GoPay/OVO/e-wallet apa pun; fee 0,7%. Mengunci ke
        // satu kanal supaya pembeli tidak bisa memilih VA (fee flat
        // Rp3.000–5.000 bisa bikin paket 30 hari rugi) atau kartu
        // kredit/e-wallet lain. "" = pembeli bebas pilih (dulu).
        paymentMethod: "SP",
        customerVaName: order.pembeli || "Pembeli SANDEKALA",
        // Bot Telegram tidak mengumpulkan email pembeli; Duitku
        // mewajibkan kolom email, jadi kirim alamat sintetis per
        // pembeli (format valid, tidak dipakai untuk kirim apa pun).
        email: "tg" + String(order.chatId || "0") + "@sandekala.eu.cc",
        phoneNumber: "",
        itemDetails: [{ name: order.namaPaket || "VPN", price: order.nominalUnik, quantity: 1 }],
        callbackUrl: DUITKU_CALLBACK_URL,
        returnUrl: DUITKU_RETURN_URL,
        expiryPeriod: DUITKU_EXPIRY_MENIT,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.statusCode !== "00" || !j.paymentUrl) {
      order.duitkuError = "createInvoice: HTTP " + r.status + " " + (j.statusMessage || "");
      await env.ORDERS.put(order.id, JSON.stringify(order));
      return null;
    }
    return { paymentUrl: j.paymentUrl, reference: j.reference || null };
  } catch (e) {
    order.duitkuError = "createInvoice: " + String((e && e.message) || e);
    await env.ORDERS.put(order.id, JSON.stringify(order)).catch(() => {});
    return null;
  }
}

// Kirim link bayar Duitku ke pembeli + simpan referensinya di order.
// Dipanggil SETELAH pesan bayar manual terkirim, supaya kalau
// invoice gagal, pembeli tetap bisa bayar manual.
// Tombol HANYA tampil di mode PRODUKSI (26 Nov 2026): di sandbox
// pembeli beneran tidak bisa bayar (cuma kartu tes/simulasi), jadi
// sembunyikan supaya tidak membingungkan. Kalau mau tes sandbox
// lagi lewat bot, balik gate ini sementara.
async function kirimLinkBayarDuitku(env, order) {
  if (env.DUITKU_SANDBOX !== "0" && env.DUITKU_SANDBOX !== "false") return;
  const inv = await buatInvoiceDuitku(env, order);
  if (!inv) return;
  order.duitkuReference = inv.reference;
  order.duitkuPaymentUrl = inv.paymentUrl;
  await env.ORDERS.put(order.id, JSON.stringify(order));
  await sendTelegram(env, order.chatId,
    "💳 Atau bayar otomatis lewat Duitku (bisa QRIS, VA bank, e-wallet, retail):\n" +
    inv.paymentUrl + "\n" +
    "Nominal sama: Rp" + order.nominalUnik.toLocaleString("id-ID") + ". " +
    "Setelah bayar di halaman Duitku, config langsung dikirim otomatis ke sini — tidak perlu tunggu admin.\n" +
    "Link berlaku 30 menit, sama seperti order ini.",
    [[{ text: "💳 Bayar via Duitku", url: inv.paymentUrl, style: "success" }]]);
}

// Callback Duitku: POST form ke /duitku-callback.
// Selalu balas HTTP 200 ("SUCCESS") supaya Duitku tidak retry —
// kecuali request-nya bukan POST (bukan callback). Order yang tidak
// valid / signature salah / amount tidak cocok / resultCode bukan
// "00" / order sudah selesai → diabaikan diam-diam (tetap 200).
// Hanya order "menunggu bayar" yang diproses, dan fulfillment-nya
// SAMA PERSIS dengan konfirmasi manual (selesaikanOrder).
async function handleDuitkuCallback(env, req) {
  try {
    if (!duitkuAktif(env)) return new Response("SUCCESS");
    const ct = req.headers.get("Content-Type") || "";
    let p = {};
    if (ct.includes("application/json")) {
      p = await req.json().catch(() => ({}));
    } else {
      const teks = await req.text().catch(() => "");
      p = Object.fromEntries(new URLSearchParams(teks));
    }
    const merchantCode = String(p.merchantCode || "");
    const amount = String(p.amount || "");
    const merchantOrderId = String(p.merchantOrderId || "");
    const signature = String(p.signature || "");
    const resultCode = String(p.resultCode || "");
    if (!merchantCode || !amount || !merchantOrderId || !signature) return new Response("SUCCESS");
    if (merchantCode !== env.DUITKU_MERCHANT_CODE) return new Response("SUCCESS");
    const hitung = await hmacSha256Hex(env.DUITKU_API_KEY, merchantCode + amount + merchantOrderId);
    if (!samakanString(hitung, signature.toLowerCase())) return new Response("SUCCESS");
    const order = await env.ORDERS.get(merchantOrderId, "json").catch(() => null);
    if (!order) return new Response("SUCCESS");
    if (Number(amount) !== Number(order.nominalUnik)) return new Response("SUCCESS");
    if (resultCode !== "00") return new Response("SUCCESS");
    if (order.status !== "menunggu bayar") return new Response("SUCCESS");
    order.duitkuReferencePaid = String(p.reference || "");
    order.bayarVia = "duitku";
    await env.ORDERS.put(order.id, JSON.stringify(order));
    await selesaikanOrder(env, order.id, order);
    return new Response("SUCCESS");
  } catch {
    return new Response("SUCCESS");
  }
}

async function buatOrder(env, chatId, kodePaket, protocol, customUsername, serverKode, from, sshPassword) {
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
    // Password SSH ketikan pembeli (SSH saja; protokol lain null).
    // Dipakai createResellerAccount + Konfirmasi Ulang.
    password: sshPassword || null,
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
    (proto === "ssh" && sshPassword ? "Password SSH: " + sshPassword + "\n" : "") +
    "TOLONG BAYAR SESUAI NOMINAL HARGA YANG TERTERA: " +
    "Rp" + nominalUnik.toLocaleString("id-ID") + "\n\n" +
    "Scan QRIS DANA Bisnis SANDEKALA dengan nominal di atas. " +
    "Setelah bayar, admin akan cek pembayaranmu lalu config dikirim ke sini.\n" +
    "Order ini berlaku 30 menit.");
  await kabariAdmin(env, chatId,
    "🛒 Order baru <b>" + orderId + "</b> (menunggu bayar)\n" +
    "Pembeli: <b>" + escapeHtml(order.pembeli || ("ID " + chatId)) + "</b>\n" +
    "Paket: " + paket.nama + " — " + proto.toUpperCase() + " — " + server.nama + "\n" +
    "Username: <b>" + escapeHtml(username) + "</b> — bayar <b>Rp" + nominalUnik.toLocaleString("id-ID") + "</b>\n" +
    "Berlaku 30 menit. Kalau uang sudah masuk Dana, ketuk tombol Konfirmasi di bawah.",
    [[{ text: "✅ Konfirmasi Pembayaran", callback_data: "konfirmasi:" + orderId, style: "success" }],
     tombolChatPembeli(chatId)], true);
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
  // Duitku (26 Nov 2026): link bayar otomatis sebagai TAMBAHAN —
  // gagal / nonaktif = diam, bayar manual di atas tetap jalan.
  await kirimLinkBayarDuitku(env, order);
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
      [[{ text: "🔄 Konfirmasi Ulang", callback_data: "konfirmasi:" + orderId, style: "success" }],
       tombolChatPembeli(order.chatId)]);
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
      " — " + order.namaPaket + " — Rp" + order.nominalUnik.toLocaleString("id-ID") + " sudah masuk.",
      [tombolChatPembeli(order.chatId)]);
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
    "✅ Terjual: <b>" + orderId + "</b>\n" +
    "Pembeli: <b>" + escapeHtml(order.pembeli || ("ID " + order.chatId)) + "</b>\n" +
    "Akun: <b>" + escapeHtml(order.username || "") + "</b> — " + order.namaPaket + " — " + (order.protocol || "?").toUpperCase() +
    " — " + (order.serverNama || order.server || "?") + "\n" +
    "<b>Rp" + order.nominalUnik.toLocaleString("id-ID") + "</b> sudah masuk, config sudah dikirim ke pembeli.",
    [tombolChatPembeli(order.chatId)], true);
  await kirimConfig(env, order.chatId,
    "✅ Pembayaran diterima! Ini config " + order.namaPaket + " kamu:", hasil.config,
    "Masa aktif mulai hari ini. Selamat memakai!");
}

// (22 Nov 2026) Handoff ke @autosetdark_bot: simpan akun pembeli di KV
// DATA (dipakai bersama autodark) supaya tombol "⚡ Buat Config" bisa
// membuka autodark dengan akun yang sudah menunggu — pembeli tinggal
// ketuk Start, file .dark langsung dibuat, tanpa salin-tempel. Berlaku
// 24 jam, sekali pakai (autodark menghapus begitu dibaca). Tanpa DATA
// (atau gagal simpan), tombol tetap tampil sebagai link biasa ke
// autodark — pembeli tempel akunnya manual. Satu tombol Telegram cuma
// bisa satu aksi (buka link ATAU salin teks), jadi salin otomatis +
// buka sekaligus tidak bisa — handoff ini gantinya.
async function simpanHandoffBuatConfig(env, chatId, teksConfig) {
  if (!env.DATA || !teksConfig) return null;
  // (22 Nov 2026) Akun Xray punya 5 link (TLS, NONE, GRPC, UPTLS,
  // UPNTLS) — semuanya akun yang SAMA (UUID + server sama). Kalau
  // kelimanya disimpan, autodark mengirim 5 file .dark dengan nama
  // yang sama persis — pembeli bingung. Jadi handoff cuma menyimpan
  // SATU link (yang pertama = TLS, varian utama) supaya pembeli
  // dapat 1 file. Varian lain tetap ada di pesan config — tinggal
  // disalin manual kalau perlu. Akun SSH (tanpa link) disimpan utuh.
  let akun = teksConfig;
  const link = teksConfig.match(/^(?:vless|vmess|trojan|ss):\/\/\S+/m);
  if (link) akun = link[0];
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  try {
    await env.DATA.put("HANDOFF:" + id, JSON.stringify({ chatId, config: akun, ts: Date.now() }), { expirationTtl: 86400 });
    return id;
  } catch { return null; }
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
  // (22 Nov 2026) Tombol "Buat Config" di bawah config: buka
  // @autosetdark_bot dengan akun yang sudah menunggu di KV (handoff).
  const idHandoff = await simpanHandoffBuatConfig(env, chatId, teksConfig);
  const urlBuat = idHandoff ? "https://t.me/autosetdark_bot?start=dark_" + idHandoff : "https://t.me/autosetdark_bot";
  const keyboardAkhir = keyboard ? [...keyboard, [{ text: "⚡ Buat Config", url: urlBuat, style: "success" }]] : [[{ text: "⚡ Buat Config", url: urlBuat, style: "success" }]];
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
      // Header Xray disamain kaya SSH (27 Nov 2026): baris polos
      // "SANDEKALAVPN" dari susunInfoAkun jadi tebal + emoji di sini
      // — config tersimpan tetap polos, yang di-bold hanya output
      // terkirim (kalau tag-nya ditaruh di susunInfoAkun, baris ini
      // jatuh ke escapeHtml di bawah dan tampil sebagai teks tag).
      if (t === "SANDEKALAVPN") return "<b>😈 SANDEKALAVPN 😈</b>";
      const m = t.match(/^([^:]+):\s*(.+)$/);
      if (m) return escapeHtml(m[1]) + ": <code>" + escapeHtml(m[2]) + "</code>";
      return escapeHtml(b);
    }).join("\n").trim();
  } else {
    isi = "<pre>" + escapeHtml(teksConfig || "") + "</pre>";
  }
  const html = escapeHtml(pembuka) + "\n\n" + isi + (penutup ? "\n\n" + escapeHtml(penutup) : "");
  if (messageId) await editHtml(env, chatId, messageId, html, keyboardAkhir);
  else await sendHtml(env, chatId, html, keyboardAkhir);
}

// Tombol kelola akun (pembeli & admin): Perpanjang, Pindah Server,
// Ganti Protokol, Perbaiki Akun, Hapus.
function tombolKelola(orderId, tampilkanPerpanjang = true) {
  const tombol = [];
  if (tampilkanPerpanjang) tombol.push([{ text: "🔄 Perpanjang", callback_data: "kelola:perpanjang:" + orderId, style: "success" }]);
  tombol.push(
    [{ text: "🔀 Pindah Server", callback_data: "kelola:pindah:" + orderId, style: "success" }],
    [{ text: "🔁 Ganti Protokol", callback_data: "kelola:ganti:" + orderId, style: "success" }],
    [{ text: "🛠️ Perbaiki Akun", callback_data: "kelola:perbaiki:" + orderId, style: "success" }],
    [{ text: "🗑️ Hapus", callback_data: "kelola:hapus:" + orderId, style: "danger" }],
  );
  return tombol;
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
// Karakter acak (huruf/angka kecil) sebanyak n — untuk menambal
// username/password yang kurang panjang atau bentrok.
function acakHuruf(n) {
  return (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, n);
}

// Username + 3 karakter acak (tetap maks. 15 karakter) — dipakai
// kalau username bentrok dengan yang sudah ada di Nadia.
function tambahAcak(nama) {
  const dasar = String(nama || "user");
  const acak = acakHuruf(3);
  return (dasar + acak).length > 15 ? dasar.slice(0, 12) + acak : dasar + acak;
}

// Cek apakah username sudah dipakai di akun Nadia (GET /vpn/accounts
// — daftar akun milik reseller ini). Kalau API gagal, jangan blokir:
// kembalikan false supaya order tetap jalan dan Nadia yang menilai.
// Catatan: daftar ini cuma akun reseller sendiri — username yang
// dipakai reseller lain di server yang sama tidak ketahuan di sini;
// bentrok seperti itu ditangkap retry di createResellerAccount.
async function usernameDipakai(env, username) {
  const cari = String(username || "").toLowerCase();
  if (!cari) return false;
  const r = await nadiaGet(env, "/vpn/accounts");
  if (!r.ok) return false;
  const daftar = Array.isArray(r.data) ? r.data : (r.data?.accounts || r.data?.data || r.data?.list || []);
  if (!Array.isArray(daftar)) return false;
  return daftar.some((a) => a && String(a.username || a.user || "").toLowerCase() === cari);
}

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
  let username = order.username ||
    ("sdk" + order.id.replace(/[^A-Za-z0-9]/g, "").toLowerCase() + Math.floor(Math.random() * 90 + 10)).slice(0, 20);
  // SSH: Nadia WAJIB minta `password` di /vpn/order (22 Nov 2026:
  // order SSH gagal "The password field is required" karena bot
  // tidak pernah mengirimnya). Pakai password ketikan pembeli
  // (order baru); order lama sebelum fitur ini tidak punya password
  // tersimpan — buatkan acak 10 karakter supaya Konfirmasi Ulang
  // tetap bisa jalan. Protokol lain dibuatkan otomatis oleh Nadia.
  // Password yang dipakai ditampilkan ke pembeli lewat config
  // (ditambahkan kalau respons Nadia tidak menyebutkannya), supaya
  // akun SSH bisa langsung dipakai.
  const sshPassword = protocol === "ssh"
    ? (order.password || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 10))
    : null;
  let d = null;
  try {
    for (let percobaan = 0; percobaan < 2; percobaan++) {
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
          ...(sshPassword ? { password: sshPassword } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.success !== false) { d = j.data || j; break; }
      const msg = j.message || j.error || (r.ok ? "order ditolak" : ("HTTP " + r.status));
      // Username bentrok yang tidak ketahuan di cek awal (mis. dipakai
      // reseller lain di server yang sama): tambah karakter acak dan
      // coba sekali lagi — order tetap jalan tanpa campur tangan admin.
      if (percobaan === 0 && /username/i.test(msg) && /(taken|already|duplikat|sudah dipakai|already exists)/i.test(msg)) {
        username = tambahAcak(username);
        order.username = username;
        continue;
      }
      return { ok: false, error: "Penyedia: " + msg + (!r.ok ? " (saldo / server / token — cek dashboard penyedia)" : "") };
    }
    if (!d) return { ok: false, error: "Penyedia: order ditolak" };
    // account_id Nadia (UUID akun) — simpan untuk renew/migrate/
    // change-protocol/details. Letaknya bisa beda-beda, cari di
    // beberapa tempat umum (termasuk di dalam `account` / `data`).
    const accountId = cariAccountId(d);
    const hasil = ambilConfigDariData(d);
    // Tambah baris Username kalau hasil parse belum menyebutnya
    // (mis. kalau config berupa link vless:// saja). renderSSH
    // menulis "Username : " (spasi sebelum titik dua), jadi cek
    // kedua bentuk — kalau tidak, config SSH ketambahan baris
    // "Username: ..." nyempil di atas header (27 Nov 2026).
    let config = (hasil.includes("Username:") || hasil.includes("Username :")) ? hasil : "Username: " + username + "\n" + hasil;
    // SSH: pastikan password yang dikirim ke Nadia ikut tampil di
    // config — kalau respons Nadia tidak menyebutkannya, pembeli
    // tidak akan tahu password akunnya.
    if (sshPassword && !config.includes("Password")) config += "\nPassword: " + sshPassword;
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

// Ringkas grid Port ("WS TLS : 443, 8443\nWS NON-TLS : 80, 8080\n...")
// jadi satu baris dengan urutan tetap: OPENSSH (port pertama saja)
// + WS TLS + WS NON-TLS + SLOWDNS + UDP CUSTOM. Dipakai format
// ringkas SANDEKALAVPN (22 Nov 2026).
function portSingkat(grid) {
  if (!grid) return null;
  const URUT = ["OPENSSH", "WS TLS", "WS NON-TLS", "SLOWDNS", "UDP CUSTOM"];
  const perLabel = new Map();
  let cocok = false;
  for (const barisPort of String(grid).split("\n")) {
    const m = barisPort.match(/^(.+?)\s*:\s*(.*)$/);
    if (!m) continue;
    const label = m[1].trim().toUpperCase();
    if (!URUT.includes(label)) continue;
    cocok = true;
    const vals = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    if (vals.length) perLabel.set(label, vals);
  }
  if (!cocok) return String(grid).trim() || null; // bukan grid — tampil apa adanya
  const nilai = [];
  for (const label of URUT) {
    const vals = perLabel.get(label);
    if (!vals) continue;
    nilai.push(...(label === "OPENSSH" ? [vals[0]] : vals));
  }
  return nilai.length ? nilai.join(", ") : null;
}

// Render config SSH FORMAT RINGKAS SANDEKALAVPN (22 Nov 2026, spek
// Asep): header <b>😈 SANDEKALAVPN 😈</b> (tebal + emoji, 27 Nov 2026,
// mockup editan Asep), Informasi Akun (Username/Password),
// Domain & Koneksi (Domain/Server/Pubkey/Name Server/DNS + satu baris Port),
// Name Server dari API kalau ada, kalau tidak dari tabel NS_PER_DOMAIN,
// Format Account (WS/TLS port pertama saja). Tanpa seksi Payload,
// Squid/OpenVPN/SNI/Path, dan tanpa Masa Aktif (Berlaku sampai /
// Sisa waktu ditempel sebagai baris biasa oleh ambilConfigDariData
// atau handler trial (admin). Berlaku untuk SEMUA config SSH: trial
// (admin), order, perpanjang, perbaiki, pindah server, ganti protokol.
function renderSSH(entri, o) {
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
  ]);
  const serverVal = peta.get("Server") || null;
  const domain = peta.get("Host / Domain") || (serverVal && !/^\d+\.\d+\.\d+\.\d+$/.test(serverVal) ? serverVal : null);
  const koneksi = [];
  if (domain) koneksi.push(baris("Domain", domain));
  if (serverVal) koneksi.push(baris("Server", serverVal));
  if (peta.has("Public Key")) koneksi.push(baris("Pubkey", peta.get("Public Key")));
  // Name Server: tabel NS_PER_DOMAIN menang kalau domain dikenal
  // (28 Nov 2026: NS lama yang sudah tersimpan di config — mis.
  // nsbiz — harus kalah dari tabel terbaru Asep, kalau tidak
  // Perbaiki tidak pernah memperbarui NS). Kalau domain tidak ada
  // di tabel, pakai NS dari config/API kalau ada.
  if (domain && NS_PER_DOMAIN[domain]) koneksi.push(baris("Name Server", NS_PER_DOMAIN[domain]));
  else if (peta.has("Name Server")) koneksi.push(baris("Name Server", peta.get("Name Server")));
  if (domain) koneksi.push(baris("DNS", domain));
  const portLine = portSingkat(peta.get("Port"));
  if (portLine) koneksi.push((koneksi.length ? "\n" : "") + baris("Port", portLine));
  tambah("Domain & Koneksi", koneksi);
  const user = peta.get("Username"), pass = peta.get("Password");
  const portUtama = (v) => (v === null || v === undefined || v === "" ? null : String(v).split(",")[0].trim() || null);
  // Port dari nilai WS/TLS lama ("domain:port@user:pass") — dipakai
  // kalau object port tidak membawa ws_tls/ws_http (28 Nov 2026,
  // Perbaiki: Port tersimpan cuma teks datar, kunci port hilang).
  const portDariNilai = (v) => { const m = String(v || "").match(/:(\d+)@/); return m ? m[1] : null; };
  let wsPort = portUtama(portPertama(o, ["ws_http", "none", "ws", "wsnontls"]));
  let tlsPort = portUtama(portPertama(o, ["ws_tls", "tls"]));
  const wsLama = peta.get("WS"), tlsLama = peta.get("TLS");
  if (!wsPort && wsLama) wsPort = portDariNilai(wsLama);
  if (!tlsPort && tlsLama) tlsPort = portDariNilai(tlsLama);
  // Fallback (28 Nov 2026, Perbaiki): config tersimpan yang sudah
  // terlanjur kehilangan WS/TLS (Perbaiki sebelum perbaikan 3590cbb)
  // tetap dapat Format Account — format order selalu WS :80 /
  // TLS :443 (port pertama saja); ambil dari daftar Port datar.
  if ((!wsPort && !wsLama) || (!tlsPort && !tlsLama)) {
    const daftarPort = String(peta.get("Port") || "").split(",").map((s) => s.trim());
    if (!wsPort && !wsLama && daftarPort.includes("80")) wsPort = "80";
    if (!tlsPort && !tlsLama && daftarPort.includes("443")) tlsPort = "443";
  }
  if (domain && user && pass && (wsPort || tlsPort || wsLama || tlsLama)) {
    const fmt = [];
    if (wsPort) fmt.push("WS :\n" + kode(domain + ":" + wsPort + "@" + user + ":" + pass));
    else if (wsLama) fmt.push("WS :\n" + kode(wsLama));
    if (tlsPort) fmt.push("TLS :\n" + kode(domain + ":" + tlsPort + "@" + user + ":" + pass));
    else if (tlsLama) fmt.push("TLS :\n" + kode(tlsLama));
    tambah("Format Account", fmt);
  }
  return "<b>😈 SANDEKALAVPN 😈</b>\n\n" + seksi.join("\n\n");
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
    // Format ringkas SANDEKALAVPN (22 Nov 2026): semua port jadi satu
    // baris, urutan ikut grid (WS TLS → WS NON-TLS → ANY → ...).
    const portSatuBaris = portTeksInfo.split("\n").map((b) => {
      const m = b.match(/^.+?:\s*(.*)$/);
      return m ? m[1].trim() : b.trim();
    }).filter(Boolean).join(", ");
    if (portSatuBaris) baris.push("Port: " + portSatuBaris);
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
    // Spasi kosong sebelum blok exp (28 Nov 2026): pisahkan info
    // akun (Port/Limit) dari "Berlaku sampai"/"Sisa waktu".
    if (baris.length) baris.push("");
    cetak("Berlaku sampai", formatExpired(exp));
    cetak("Sisa waktu", sisaWaktu(exp));
  }
  // Format ringkas SANDEKALAVPN (22 Nov 2026): header di semua config
  // Xray, sama seperti config SSH. Spasi kosong setelah header
  // (28 Nov 2026): Username langsung di bawah baris kosong.
  if (baris.length) baris.unshift("SANDEKALAVPN", "");
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
    if (iExp >= 0) {
      // Sisipkan sebelum baris kosong pemisah blok exp (kalau ada),
      // supaya spasi tetap tepat sebelum "Berlaku sampai".
      let iSisip = iExp;
      if (hasil.slice(0, iExp).endsWith("\n\n")) iSisip = iExp - 1;
      hasil = hasil.slice(0, iSisip) + limitLama + "\n" + hasil.slice(iSisip);
    }
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
    // Format ringkas SANDEKALAVPN (22 Nov 2026): seksi Payload
    // WebSocket tidak lagi ditampilkan di config SSH.
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

// Parse teks config jadi entri [{label, nilai}] + object port.
// Dipakai normalisasiKeSeksi + gabungConfig (28 Nov 2026). WS/TLS
// nilainya di baris berikut labelnya (seperti Port) — tanpa ini,
// Format Account dari config tersimpan hilang saat dinormalisasi.
function uraiEntri(teks) {
  if (!teks || typeof teks !== "string") return { entri: [], portObj: null };
  const PETA_LABEL = { "Domain": "Host / Domain", "Ns-Domain": "Name Server", "Pubkey": "Public Key", "Expires": "Berlaku sampai", "IP Limit": "Limit Device" };
  const LABEL = new Set(["Username", "Password", "UUID", "Server", "Host / Domain", "Domain", "Port", "Squid Proxy", "HTTP Custom", "OpenVPN", "Name Server", "Ns-Domain", "Public Key", "Pubkey", "DNS", "Limit Device", "Limit IP & Kuota", "Kuota", "IP Limit", "SNI", "Path", "Berlaku sampai", "Expires", "Sisa waktu", "WS", "TLS"]);
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
    // Nilai di baris berikut (Port multi-baris, WS/TLS hasil renderSSH).
    if ((label === "Port" || label === "WS" || label === "TLS") && nilai === "") {
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
  return { entri, portObj };
}

// Ubah config SSH lama (format datar, atau campuran seksi + baris
// datar hasil gabungan versi lama) menjadi format seksi yang bersih
// seperti renderSSH. Ini yang bikin Perbaiki tidak lagi menempelkan
// baris-baris datar (blob Port, "HTTP Custom ...@user:pass") di bawah
// seksi-seksi yang baru. VLESS / config tanpa Password dikembalikan
// apa adanya.
function normalisasiKeSeksi(teks) {
  if (!teks || typeof teks !== "string") return teks;
  const { entri, portObj } = uraiEntri(teks);
  if (!entri.some((e) => e.label === "Password")) return teks;
  return renderSSH(entri, { port: portObj });
}

// Pisahkan baris "Berlaku sampai"/"Sisa waktu" dari teks config.
// Dipakai gabungConfig (28 Nov 2026): exp bukan bagian seksi —
// kalau ikut digabung per seksi, keduanya nyangkut di isi seksi
// Format Account dan sisi lama (lebih panjang) bisa menang atas
// exp baru. Yang baru menang, yang lama jadi fallback.
function pisahBarisExp(teks) {
  const exp = [], sisa = [];
  const baris = String(teks ?? "").split("\n").filter((b) => {
    const t = b.trim();
    if (/^Berlaku sampai\s*:/.test(t)) { exp.push(t); return false; }
    if (/^Sisa waktu\s*:/.test(t)) { sisa.push(t); return false; }
    return true;
  });
  return { teks: baris.join("\n").trim(), exp: exp[0] || null, sisa: sisa[0] || null };
}

// Gabung config baru yang datar (details minim, tanpa Password) ke
// config lama yang berseksi (28 Nov 2026): nilai baru menimpa nilai
// lama per label, sisanya dipertahankan — supaya Perbaiki dengan
// details minim tidak membuang config lengkap yang tersimpan.
// Port datar ("22") tidak menimpa Port lengkap; exp diurus terpisah
// oleh pisahBarisExp di gabungConfig.
function gabungEntriKeSeksi(configBaru, configLama) {
  const baru = uraiEntri(configBaru);
  const lama = uraiEntri(configLama);
  const peta = new Map(lama.entri.map((e) => [e.label, e]));
  for (const e of baru.entri) {
    if (e.label === "Port" && !baru.portObj) continue;
    if (e.label === "Berlaku sampai" || e.label === "Sisa waktu") continue;
    peta.set(e.label, e);
  }
  const portObj = baru.portObj || lama.portObj;
  return renderSSH([...peta.values()], { port: portObj });
}

function gabungConfig(configBaru, configLama) {
  if (!configLama || typeof configLama !== "string") return configBaru;
  if (!configBaru || typeof configBaru !== "string") return configLama;
  // (28 Nov 2026) Exp dipisah dulu kalau salah satu sisi berseksi
  // SSH (ada baris Password) — config Xray/flat tidak disentuh,
  // supaya penempatan exp-nya tidak berubah.
  const baruSeksi = /^Password\s*:/m.test(configBaru);
  const lamaSeksi = /^Password\s*:/m.test(configLama);
  let expBaru = null, sisaBaru = null, expLama = null, sisaLama = null;
  if (baruSeksi || lamaSeksi) {
    const pBaru = pisahBarisExp(configBaru);
    const pLama = pisahBarisExp(configLama);
    configBaru = pBaru.teks;
    configLama = pLama.teks;
    expBaru = pBaru.exp; sisaBaru = pBaru.sisa;
    expLama = pLama.exp; sisaLama = pLama.sisa;
  }
  // Rapikan dulu kedua sisi ke format seksi yang sama — config lama
  // bisa masih format datar / campuran (hasil gabungan versi lama),
  // dan baris-baris datar itu tidak boleh lolos ke hasil akhir.
  configBaru = normalisasiKeSeksi(configBaru);
  configLama = normalisasiKeSeksi(configLama);
  let hasil;
  // Config SSH baru berbentuk seksi ("◆ ...") — gabung per seksi supaya
  // baris kaya (grid Port, Pubkey, payload) tidak hilang dan tidak
  // nyasar ke seksi yang salah.
  if (configBaru.includes("◆ ") && configLama.includes("◆ ")) hasil = gabungConfigSeksi(configBaru, configLama);
  else if (!configBaru.includes("◆ ") && configLama.includes("◆ ")) hasil = gabungEntriKeSeksi(configBaru, configLama);
  else {
  hasil = configBaru;
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
  }
  // (28 Nov 2026) Tempel lagi exp yang dipisah di atas — yang baru
  // menang, yang lama jadi fallback. Penempatan sama seperti config
  // order: spasi kosong sebelum "Berlaku sampai".
  if (baruSeksi || lamaSeksi) {
    const expMenang = expBaru || expLama;
    const sisaMenang = expBaru ? sisaBaru : sisaLama;
    if (expMenang) {
      hasil = hasil.trim() + "\n\n" + expMenang;
      if (sisaMenang) hasil += "\n" + sisaMenang;
    }
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

// Durasi trial menurut aturan Nadia: 60 menit untuk NUSA ID &
// CLOUDFRONT MEDIA, 30 menit untuk server lain. (zivpn tidak
// didukung trial — sudah difilter di daftar protokol trial.)
function durasiTrialMenit(serverKode) {
  return (serverKode === "nusaid" || serverKode === "media") ? 60 : 30;
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
      // (28 Nov 2026) Timeout 15 detik: satu fetch yang macet tidak
      // boleh menahan handler selamanya (webhook tidak selesai,
      // Telegram me-retry perintah).
      signal: AbortSignal.timeout(15000),
    });
    return await r.json().catch(() => null);
  } catch (e) { return null; }
}
async function sendHtml(env, chatId, html, keyboard) {
  const body = { chat_id: chatId, text: String(html).slice(0, 4000), parse_mode: "HTML", link_preview_options: { is_disabled: true } };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  const j = await telegramApi(env, "sendMessage", body);
  return j?.result?.message_id || null;
}
async function editHtml(env, chatId, messageId, html, keyboard) {
  if (!messageId) return sendHtml(env, chatId, html, keyboard);
  const body = { chat_id: chatId, message_id: messageId, text: String(html).slice(0, 4000), parse_mode: "HTML", link_preview_options: { is_disabled: true } };
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
  const body = { chat_id: chatId, text: String(text).slice(0, 4000), link_preview_options: { is_disabled: true } };
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
