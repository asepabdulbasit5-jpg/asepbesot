// SANDEKALA VLESS — Cloudflare Worker proxy VLESS-over-WebSocket pribadi.
// Versi baru yang disederhanakan dari proyek lama besot.eu.cc (bukan restore).
// HANYA proxy VLESS + status teks. Tanpa signup, panel admin, KV, rate limit,
// sponsor gate, atau halaman HTML. UUID diambil dari env var `UUID` (Asep)
// dan `UUID2` (istri) — keduanya diterima, jadi masing-masing punya UUID sendiri.
// UDP (0x02) hanya untuk DNS port 53, dijawab lewat DoH (lihat DOH_ENDPOINT).
// Deploy: wrangler / GitHub Actions, worker name `sandekala-vless`.
//
// TIDAK ADA self-fetch (`return fetch(req)`) di file ini — pola itu yang
// menyebabkan error 522 di proyek lama.

import { connect } from 'cloudflare:sockets';

const STATUS_TEXT = 'SANDEKALA VLESS aktif';

// Endpoint DNS-over-HTTPS untuk jalur UDP (port 53) — konstanta, bukan env.
const DOH_ENDPOINT = 'https://1.1.1.1/dns-query';

// Ubah 16 byte UUID jadi string bentuk xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.
function uuidBytesKeString(b) {
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function formatIpv6(b) {
  const parts = [];
  for (let i = 0; i < 16; i += 2) parts.push(((b[i] << 8) | b[i + 1]).toString(16));
  return parts.join(':');
}

// UUID dikenali bila sama dengan UUID (Asep) atau UUID2 (istri).
function uuidDikenali(env, uuidReq) {
  const u = String(uuidReq || '').toLowerCase();
  return (env.UUID && u === String(env.UUID).toLowerCase())
    || (env.UUID2 && u === String(env.UUID2).toLowerCase());
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgrade = request.headers.get('Upgrade');

    // Bukan upgrade WebSocket: hanya status teks di path `/`.
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      if (url.pathname === '/') {
        return new Response(STATUS_TEXT, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }
      return new Response('Not found', { status: 404 });
    }

    // Upgrade WebSocket hanya di path `/`.
    if (url.pathname !== '/') return new Response('Not found', { status: 404 });

    // Tanpa UUID di env, semua koneksi ditolak.
    if (!env.UUID && !env.UUID2) return new Response('UUID tidak dikonfigurasi', { status: 500 });

    const [client, server] = new WebSocketPair();
    server.accept();
    tanganiVless(server, env).catch(() => {
      try { server.close(); } catch { /* sudah tertutup */ }
    });
    return new Response(null, { status: 101, webSocket: client });
  },
};

async function tanganiVless(ws, env) {
  let remote = null;        // Socket Cloudflare (connect)
  let remoteWriter = null;  // WritableStreamDefaultWriter
  let headerParsed = false;
  let tertutup = false;
  let mode = null;          // 'tcp' | 'udp' (diisi saat header ter-parse)
  let udpSisa = new Uint8Array(0); // sisa frame DNS yang belum lengkap
  let udpAntre = [];        // antre query DNS lengkap (Uint8Array)
  let udpProses = false;    // drainer antre sedang jalan

  function tutupSemua() {
    if (tertutup) return;
    tertutup = true;
    try { remoteWriter?.releaseLock(); } catch { /* abaikan */ }
    try { remote?.close(); } catch { /* abaikan */ }
    try { ws.close(); } catch { /* abaikan */ }
  }

  // Tanya satu query DNS mentah ke DoH, kembalikan jawaban mentah.
  async function tanyaDoh(query) {
    const res = await fetch(DOH_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: query,
    });
    if (!res.ok) throw new Error('DoH gagal: HTTP ' + res.status);
    return new Uint8Array(await res.arrayBuffer());
  }

  // Tarik frame [len 2 byte][query] yang lengkap dari data baru.
  // Frame yang terbelah antar pesan WS menunggu di udpSisa.
  function tarikFrameDns(data) {
    const gabung = new Uint8Array(udpSisa.length + data.length);
    gabung.set(udpSisa, 0);
    gabung.set(data, udpSisa.length);
    udpSisa = gabung;
    while (udpSisa.length >= 2) {
      const len = (udpSisa[0] << 8) | udpSisa[1];
      if (len === 0) { udpSisa = udpSisa.slice(2); continue; }
      if (udpSisa.length < 2 + len) break;
      udpAntre.push(udpSisa.slice(2, 2 + len));
      udpSisa = udpSisa.slice(2 + len);
    }
  }

  // Kuras antre query DNS satu per satu (urut) lewat DoH, kirim tiap
  // jawaban sebagai [len 2 byte][jawaban]. 2 byte respons VLESS
  // [0x00, 0x00] sudah dikirim saat header ter-parse, jadi di sini
  // hanya prefix panjang + jawaban. Gagal DoH -> tutup koneksi.
  async function prosesAntreDns() {
    if (udpProses) return;
    udpProses = true;
    try {
      while (udpAntre.length && !tertutup) {
        const query = udpAntre.shift();
        const jawaban = await tanyaDoh(query);
        const balasan = new Uint8Array(2 + jawaban.length);
        balasan[0] = (jawaban.length >> 8) & 0xff;
        balasan[1] = jawaban.length & 0xff;
        balasan.set(jawaban, 2);
        ws.send(balasan);
      }
    } catch {
      tutupSemua();
    } finally {
      udpProses = false;
    }
  }

  // Pompa remote -> client sampai stream habis / error.
  async function pompaRemoteKeClient() {
    try {
      const reader = remote.readable.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) ws.send(value);
      }
    } catch { /* sambungan putus: tutup */ } finally {
      tutupSemua();
    }
  }

  ws.addEventListener('message', async (event) => {
    if (tertutup) return;
    try {
      const raw = event.data;
      const data = raw instanceof ArrayBuffer
        ? new Uint8Array(raw)
        : typeof raw === 'string'
          ? new TextEncoder().encode(raw)
          : new Uint8Array(await raw.arrayBuffer());

      if (!headerParsed) {
        // --- Parse header VLESS ---
        // [version:1][uuid:16][addonLen:1][addon][command:1][port:2][atyp:1][address]
        if (data.length < 19) throw new Error('header VLESS terlalu pendek');
        const uuidReq = uuidBytesKeString(data.slice(1, 17));
        if (!uuidDikenali(env, uuidReq)) {
          throw new Error('UUID tidak cocok');
        }
        const addonLen = data[17];
        let off = 18 + addonLen;
        if (data.length < off + 4) throw new Error('header VLESS terlalu pendek');
        const command = data[off];
        if (command !== 0x01 && command !== 0x02) {
          throw new Error('command tidak dikenal (hanya TCP 0x01 / UDP 0x02)');
        }
        const port = (data[off + 1] << 8) | data[off + 2];
        if (command === 0x02 && port !== 53) {
          throw new Error('UDP hanya untuk DNS (port 53)');
        }
        const atyp = data[off + 3];
        off += 4;

        let hostname;
        if (atyp === 0x01) { // IPv4
          if (data.length < off + 4) throw new Error('header VLESS terlalu pendek');
          hostname = [...data.slice(off, off + 4)].join('.');
          off += 4;
        } else if (atyp === 0x02) { // Domain
          const len = data[off];
          off += 1;
          if (data.length < off + len) throw new Error('header VLESS terlalu pendek');
          hostname = new TextDecoder().decode(data.slice(off, off + len));
          off += len;
        } else if (atyp === 0x03) { // IPv6
          if (data.length < off + 16) throw new Error('header VLESS terlalu pendek');
          hostname = formatIpv6(data.slice(off, off + 16));
          off += 16;
        } else {
          throw new Error('address type tidak dikenal');
        }

        if (command === 0x02) {
          // --- Jalur UDP/DNS: tanpa connect(), target diabaikan ---
          mode = 'udp';
          headerParsed = true;

          // Balas 2 byte respons VLESS: [version 0x00][addon length 0x00].
          ws.send(new Uint8Array([0x00, 0x00]));

          // Teruskan sisa payload dari pesan pertama (kalau ada).
          if (data.length > off) {
            tarikFrameDns(data.slice(off));
            void prosesAntreDns();
          }
          return;
        }

        // --- Sambungkan ke target (TCP) ---
        remote = await connect({ hostname, port });
        mode = 'tcp';
        headerParsed = true;

        // Balas 2 byte respons VLESS: [version 0x00][addon length 0x00].
        ws.send(new Uint8Array([0x00, 0x00]));

        // Teruskan sisa payload dari pesan pertama (kalau ada).
        if (data.length > off) {
          remoteWriter = remote.writable.getWriter();
          await remoteWriter.write(data.slice(off));
        }
        pompaRemoteKeClient();
      } else if (mode === 'udp') {
        // --- Frame DNS (bisa terbelah antar pesan) ---
        tarikFrameDns(data);
        void prosesAntreDns();
      } else {
        // --- Relay client -> remote (TCP) ---
        if (!remoteWriter) remoteWriter = remote.writable.getWriter();
        await remoteWriter.write(data);
      }
    } catch {
      tutupSemua();
    }
  });

  ws.addEventListener('close', tutupSemua);
  ws.addEventListener('error', tutupSemua);
}
