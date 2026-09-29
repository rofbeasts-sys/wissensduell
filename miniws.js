/**
 * Minimaler WebSocket-Server (RFC 6455) ausschließlich mit Node-Bordmitteln.
 * Bewusst schlank gehalten für dieses Projekt (Text-Frames, kurze JSON-
 * Nachrichten) – kein externes npm-Paket nötig, damit der Host den Server
 * ohne "npm install" direkt mit "node server.js" starten kann.
 */
const crypto = require("crypto");
const EventEmitter = require("events");

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
// Groessenlimit pro Nachricht: unsere JSON-Nachrichten sind winzig. Groesseres
// ist Missbrauch (Speicher-DoS) -> Verbindung wird mit Code 1009 beendet.
const MAX_PAYLOAD = 64 * 1024;

class MiniSocket extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.readyState = 1; // OPEN
    this._buffer = Buffer.alloc(0);
    this._closeEmitted = false;
    this.lastSeen = Date.now(); // Zeitpunkt des letzten Lebenszeichens (jedes eingehende Datenpaket)
    socket.on("data", (chunk) => this._onData(chunk));
    // Gegenseite hat einfach aufgelegt (FIN ohne Close-Frame, z.B. Tab/App
    // hart beendet): Der HTTP-Server haelt solche Sockets halb-offen, dann kam
    // nie ein "close" - der Spieler blieb bis zum naechsten Ping "verbunden".
    socket.on("end", () => { this.readyState = 3; try { socket.end(); } catch (e) { /* ignore */ } this._emitCloseOnce(); });
    socket.on("close", () => { this.readyState = 3; this._emitCloseOnce(); });
    socket.on("error", () => { this.readyState = 3; this._emitCloseOnce(); });
  }

  // "close" nur EINMAL melden (Close-Frame UND Socket-Ende loesten es vorher doppelt aus)
  _emitCloseOnce() {
    if (this._closeEmitted) return;
    this._closeEmitted = true;
    this.emit("close");
  }

  // Protokollverstoss / zu grosse Nachricht: Close 1009 senden, Verbindung kappen.
  _fail(code) {
    this._buffer = Buffer.alloc(0);
    this.readyState = 3;
    try {
      const b = Buffer.alloc(2); b.writeUInt16BE(code, 0);
      this._sendFrame(b, 0x8);
    } catch (e) { /* ignore */ }
    try { this.socket.destroy(); } catch (e) { /* ignore */ }
    this._emitCloseOnce();
  }

  _onData(chunk) {
    this.lastSeen = Date.now();
    this._buffer = Buffer.concat([this._buffer, chunk]);
    for (;;) {
      const frame = this._tryParseFrame(this._buffer);
      if (!frame) break;
      if (frame.tooBig) { this._fail(1009); return; }
      this._buffer = this._buffer.subarray(frame.total);

      if (frame.opcode === 0x8) { // Close-Frame
        this.readyState = 3;
        try { this.socket.end(); } catch (e) { /* ignore */ }
        this._emitCloseOnce();
        return;
      } else if (frame.opcode === 0x1 || frame.opcode === 0x2) { // Text/Binary
        this.emit("message", frame.payload);
      } else if (frame.opcode === 0x9) { // Ping -> Pong
        this._sendFrame(frame.raw, 0xA);
      }
    }
  }

  _tryParseFrame(buf) {
    if (buf.length < 2) return null;
    const b0 = buf[0], b1 = buf[1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (buf.length < 4) return null;
      len = buf.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (buf.length < 10) return null;
      if (buf.readUInt32BE(2) !== 0) return { tooBig: true }; // obere 32 Bit gesetzt = riesig
      len = buf.readUInt32BE(6);
      offset = 10;
    }
    // Gleich am Header pruefen - NICHT erst warten, bis "len" Bytes angekommen sind
    if (len > MAX_PAYLOAD) return { tooBig: true };
    let maskKey = null;
    if (masked) {
      if (buf.length < offset + 4) return null;
      maskKey = buf.subarray(offset, offset + 4);
      offset += 4;
    }
    if (buf.length < offset + len) return null;
    let raw = buf.subarray(offset, offset + len);
    if (masked) {
      const unmasked = Buffer.alloc(len);
      for (let i = 0; i < len; i++) unmasked[i] = raw[i] ^ maskKey[i % 4];
      raw = unmasked;
    }
    return { opcode, payload: raw.toString("utf8"), raw, total: offset + len };
  }

  send(str) {
    if (this.readyState !== 1) return;
    this._sendFrame(Buffer.from(str, "utf8"), 0x1);
  }

  _sendFrame(payloadBuf, opcode) {
    const len = payloadBuf.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeUInt32BE(0, 2);
      header.writeUInt32BE(len, 6);
    }
    try { this.socket.write(Buffer.concat([header, payloadBuf])); } catch (e) { /* ignore */ }
  }

  ping() { this._sendFrame(Buffer.alloc(0), 0x9); }

  // Hart beenden (ohne Abschiedsgruss) - fuer tote Verbindungen.
  terminate() {
    this.readyState = 3;
    try { this.socket.destroy(); } catch (e) { /* ignore */ }
    this._emitCloseOnce();
  }

  close() {
    try { this._sendFrame(Buffer.alloc(0), 0x8); } catch (e) { /* ignore */ }
    try { this.socket.end(); } catch (e) { /* ignore */ }
    this.readyState = 3;
  }
}
MiniSocket.prototype.OPEN = 1;

class MiniWSServer extends EventEmitter {
  constructor({ server }) {
    super();
    server.on("upgrade", (req, socket) => {
      if ((req.headers["upgrade"] || "").toLowerCase() !== "websocket") { socket.destroy(); return; }
      const key = req.headers["sec-websocket-key"];
      if (!key) { socket.destroy(); return; }
      const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
      );
      const ws = new MiniSocket(socket);
      this.emit("connection", ws, req);
    });
  }
}

module.exports = { WebSocketServer: MiniWSServer };
