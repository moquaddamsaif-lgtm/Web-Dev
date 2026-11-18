// ===== config.js : settings used by the other JS files =====
// NOTE: This is a beginner demo. Data is saved in the browser (localStorage),
// not on a server, so anyone can read it. Never use this for real passwords!

const ADMIN_EMAIL = "admin@imedhub.com";
const ADMIN_PASSWORD = "admin123";

// Names of the boxes we use inside the browser's storage
const KEY_USERS = "imedhub_users";
const KEY_CURRENT = "imedhub_current_user";
const KEY_RESOURCES = "imedhub_resources";
const KEY_ANNOUNCEMENTS = "imedhub_announcements";

// Where the payment server (backend/server.js) lives.
// - Opened via the Node server (http://localhost:3000/...)  -> same origin, no prefix needed
// - Opened via VS Code Live Server (127.0.0.1:5500) or file:// -> talk to http://localhost:3000
const IS_LOCAL_DEV = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
const API_BASE = IS_LOCAL_DEV && location.port !== "3000" ? "http://localhost:3000" : "";

// Small helpers to read / save lists in localStorage
function loadList(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}
function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// ===== Shared helpers (added) =====
const COLLEGE = { name: "IMED", address: "Your college address, City, State - PIN", phone: "+91 00000 00000", email: "admin@imedhub.com" }; // EDIT ME
const KEY_PAY = "imedhub_payments", KEY_SET = "imedhub_settings";
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function curUser() { const s = JSON.parse(localStorage.getItem(KEY_CURRENT)); if (!s) return null; if (s.role === "admin") return s; return loadList(KEY_USERS).find(u => u.email === s.email) || s; }
function isSenior(u) { return u && (u.role === "admin" || ["2nd Year", "3rd Year", "4th Year"].includes(u.year)); }
function settings() { return Object.assign({ gatewayKey: "", payLink: "", fee1: 60000, fee2: 60000, examFee: 1500 }, JSON.parse(localStorage.getItem(KEY_SET)) || {}); }
function popup(msg, type, title) {
  const o = document.createElement("div"); o.className = "overlay";
  o.innerHTML = "<div class='popup " + (type || "error") + "'><div class='pi'>" + (type === "success" ? "✅" : "⚠️") + "</div><h3>" + esc(title || (type === "success" ? "Success" : "Oops!")) + "</h3><p>" + esc(msg) + "</p><button class='btn btn-primary'>OK</button></div>";
  o.querySelector("button").onclick = () => o.remove(); document.body.appendChild(o);
}
// Minimal PDF writer (text only, no libraries). lines = array of strings
function makePDF(lines) {
  const pages = []; for (let i = 0; i < lines.length; i += 45) pages.push(lines.slice(i, i + 45)); if (!pages.length) pages.push([""]);
  const o = [];
  o[1] = "<</Type/Catalog/Pages 2 0 R>>"; o[2] = "<</Type/Pages/Kids[" + pages.map((_, i) => (4 + i * 2) + " 0 R").join(" ") + "]/Count " + pages.length + ">>"; o[3] = "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>";
  pages.forEach((p, i) => {
    const t = "BT /F1 12 Tf 50 800 Td 16 TL " + p.map(l => "(" + String(l).replace(/[^\x20-\x7e]/g, "").replace(/([()\\])/g, "\\$1") + ") '").join(" ") + " ET";
    o[4 + i * 2] = "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents " + (5 + i * 2) + " 0 R>>";
    o[5 + i * 2] = "<</Length " + t.length + ">>stream\n" + t + "\nendstream";
  });
  let out = "%PDF-1.4\n", off = [];
  for (let n = 1; n < o.length; n++) { off[n] = out.length; out += n + " 0 obj\n" + o[n] + "\nendobj\n"; }
  const x = out.length; out += "xref\n0 " + o.length + "\n0000000000 65535 f \n" + off.slice(1).map(v => String(v).padStart(10, "0") + " 00000 n \n").join("") + "trailer\n<</Size " + o.length + "/Root 1 0 R>>\nstartxref\n" + x + "\n%%EOF";
  return new Blob([out], { type: "application/pdf" });
}
function saveFile(blobOrUrl, name) {
  const a = document.createElement("a"); a.href = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
