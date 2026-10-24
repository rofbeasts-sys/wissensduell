/* Gemeinsame Test-Helfer: Server auf freiem Port mit eigener (temporaerer)
 * Nutzerdatei starten, HTTP-/WebSocket-Clients, Ergebnis-Zaehlung. */
const { spawn } = require("child_process");
const http = require("http"), net = require("net"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), vm = require("vm");

let passed = 0, failed = 0;
const failures = [];
function ok(name, cond) {
  if (cond) { passed++; console.log("  OK   " + name); }
  else { failed++; failures.push(name); console.log("  FAIL " + name); }
}
function section(t) { console.log("\n== " + t + " =="); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function finish() {
  console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
  process.exit(failed ? 1 : 0);
}
function freePort() {
  return new Promise(res => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
}
async function startServer(env = {}) {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bp-test-"));
  const usersFile = path.join(dir, "users.json");
  const conversationsFile = path.join(dir, "conversations.json");
  const child = spawn("node", [path.join(__dirname, "..", "server.js")], {
    cwd: dir, env: { ...process.env, PORT: String(port), USERS_FILE: usersFile, CONVERSATIONS_FILE: conversationsFile, ...env }, stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", d => stderr += d);
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("Server startet nicht")), 8000);
    child.stdout.on("data", d => { if (d.toString().includes("läuft")) { clearTimeout(t); res(); } });
  });
  return { port, dir, usersFile, conversationsFile, child, stderr: () => stderr, alive: () => child.exitCode === null,
    stop: async () => { try { child.kill("SIGKILL"); } catch (e) {} await sleep(100); } };
}
function post(port, url, obj, headers = {}) {
  return new Promise(res => {
    const r = http.request({ port, path: url, method: "POST", headers }, x => {
      let d = ""; x.on("data", c => d += c);
      x.on("end", () => { try { res({ ...JSON.parse(d), _status: x.statusCode, _headers: x.headers }); } catch (e) { res({ raw: d, _status: x.statusCode, _headers: x.headers }); } });
    });
    r.on("error", e => res({ err: e.code }));
    r.end(typeof obj === "string" ? obj : JSON.stringify(obj));
  });
}
function get(port, url) {
  return new Promise(res => http.get({ port, path: url }, r => { r.resume(); res({ status: r.statusCode, headers: r.headers }); }).on("error", e => res({ err: e.code })));
}
function frame(obj) {
  const b = Buffer.from(typeof obj === "string" ? obj : JSON.stringify(obj));
  const m = crypto.randomBytes(4); const x = Buffer.alloc(b.length);
  for (let i = 0; i < b.length; i++) x[i] = b[i] ^ m[i % 4];
  let h;
  if (b.length < 126) h = Buffer.from([0x81, 0x80 | b.length]);
  else if (b.length < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 0x80 | 126; h.writeUInt16BE(b.length, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 0x80 | 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(b.length, 6); }
  return Buffer.concat([h, m, x]);
}
// Roher WebSocket-Client. autoPong=false simuliert eine tote Verbindung.
function wsConnect(port, { autoPong = true } = {}) {
  return new Promise(res => {
    const st = { closed: false, open: false, msgs: [], buf: Buffer.alloc(0), closeCode: null, pings: 0 };
    const s = net.connect(port, "localhost"); st.s = s;
    s.on("error", () => {}); s.on("close", () => { st.closed = true; });
    s.on("connect", () => s.write("GET / HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: " + crypto.randomBytes(16).toString("base64") + "\r\nSec-WebSocket-Version: 13\r\n\r\n"));
    s.on("data", d => {
      st.buf = Buffer.concat([st.buf, d]);
      if (!st.open) { const i = st.buf.indexOf("\r\n\r\n"); if (i < 0) return; st.buf = st.buf.subarray(i + 4); st.open = true; res(st); }
      for (;;) {
        if (st.buf.length < 2) break;
        let len = st.buf[1] & 0x7f, off = 2;
        if (len === 126) { if (st.buf.length < 4) break; len = st.buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (st.buf.length < 10) break; len = st.buf.readUInt32BE(6); off = 10; }
        if (st.buf.length < off + len) break;
        const op = st.buf[0] & 15; const pl = st.buf.subarray(off, off + len); st.buf = st.buf.subarray(off + len);
        if (op === 1) { const t = pl.toString(); st.msgs.push(t); try { const j = JSON.parse(t); (st.parsed = st.parsed || []).push(j); } catch (e) {} }
        if (op === 8) st.closeCode = pl.length >= 2 ? pl.readUInt16BE(0) : true;
        if (op === 9) { st.pings++; if (autoPong) s.write(Buffer.from([0x8a, 0x80, 1, 2, 3, 4])); }
      }
    });
    st.send = (o) => { if (!st.closed) try { s.write(frame(o)); } catch (e) {} };
    st.find = (type) => (st.parsed || []).find(m => m.type === type);
    st.last = (type) => [...(st.parsed || [])].reverse().find(m => m.type === type);
    setTimeout(() => res(st), 3000);
  });
}
// Client-Skript (public/index.html) in einer Sandbox laden (ohne Browser)
function loadClient({ fakeTime = false, fetchImpl = null, account = false, localStorageData = null } = {}) {
  // fakeTime: eigene, steuerbare Uhr (advance(ms)) statt echter Timer
  let timers = [], now = 0, nid = 1;
  const fSetInterval = (fn, ms) => { const id = nid++; timers.push({ id, fn, ms, next: now + ms, type: "i" }); return id; };
  const fSetTimeout = (fn, ms) => { const id = nid++; timers.push({ id, fn, next: now + ms, type: "t" }); return id; };
  const fClear = (id) => { timers = timers.filter(t => t.id !== id); };
  const advance = (ms) => { const end = now + ms; for (;;) { const c = timers.filter(t => t.next <= end).sort((a, b) => a.next - b.next)[0]; if (!c) break; now = c.next; if (c.type === "t") timers = timers.filter(t => t.id !== c.id); else c.next += c.ms; c.fn(); } now = end; };
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const state = { last: "", els: {} };
  const app = { get innerHTML() { return state.last; }, set innerHTML(v) { state.last = v; state.renders = (state.renders || 0) + 1; } };
  const mk = () => ({ style: {}, textContent: "", innerHTML: "", value: "", classList: { _l: [], add(c){ if(!this._l.includes(c)) this._l.push(c); }, remove(c){ this._l = this._l.filter(x=>x!==c); }, toggle(c){ this.contains(c)?this.remove(c):this.add(c); }, contains(c){ return this._l.includes(c); } }, focus() {}, disabled: false });
  // Einfache WebSocket-Attrappe fuer Client-Code, der "new WebSocket(url)"
  // aufruft (z.B. der Freunde-/Chat-Kanal). Jede Instanz landet in
  // MockWebSocket.instances - Tests loesen open/message/close manuell aus
  // (z.B. `sb.WebSocket.instances[0].onopen()`), es baut sich NIE von selbst
  // eine echte Verbindung auf.
  class MockWebSocket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; MockWebSocket.instances.push(this); }
    send(data) { this.sent.push(data); }
    close() { this.readyState = 3; if (this.onclose) this.onclose(); }
  }
  MockWebSocket.instances = [];
  const sb = {
    document: { getElementById: id => id === "app" ? app : (state.els[id] || (state.els[id] = mk())), querySelectorAll() { return []; }, addEventListener() {}, createElement() { return {}; }, title: "" },
    window: {}, navigator: { language: "de" },
    localStorage: (() => { const store = Object.assign({}, localStorageData); return { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; }, _store: store }; })(),
    fetch: fetchImpl || (async () => ({ json: async () => ({}) })), console, Achv: require("../public/achievements.js"),
    setTimeout: fakeTime ? fSetTimeout : setTimeout, clearTimeout: fakeTime ? fClear : clearTimeout,
    setInterval: fakeTime ? fSetInterval : setInterval, clearInterval: fakeTime ? fClear : clearInterval,
    location: { protocol: "https:", host: "t", href: "", search: "", pathname: "/" }, alert() {}, confirm() { return true; },
    WebSocket: MockWebSocket, URLSearchParams, history: { replaceState() {} }
  };
  vm.createContext(sb); vm.runInContext(code, sb);
  return { R: (s) => vm.runInContext(s, sb), state, sb, advance, activeIntervals: () => timers.filter(t => t.type === "i").length };
}
module.exports = { ok, section, sleep, finish, startServer, post, get, frame, wsConnect, loadClient, freePort, fs, path };
