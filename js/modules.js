// ===== modules.js : one generic page (module.html?m=notes) for many features =====
const me = curUser(), isAdmin = me.role === "admin";
const q = new URLSearchParams(location.search).get("m") || "notes";
const students = () => loadList(KEY_USERS).map(u => [u.email, u.name + " (" + u.email + ")"]);
const T = (n, l, t, o) => ({ n, l, t: t || "text", o });
const ST = T("student", "Student", "select", students);
const MODS = {
  notes: { title: "Senior Notes", icon: "📝", desc: "Seniors upload notes (PDF) and everyone can download them.", add: () => isSenior(me), scope: "all",
    f: [T("title", "Title"), T("subject", "Subject"), T("file", "Upload PDF (max 2 MB)", "file"), T("text", "...or type notes (saved as PDF)", "textarea")] },
  assignments: { title: "Assignments", icon: "📚", desc: "Assignments posted by faculty.", add: () => isAdmin, scope: "all",
    f: [T("title", "Title"), T("subject", "Subject"), T("due", "Due date", "date"), T("details", "Details", "textarea"), T("link", "Link (optional)", "url")] },
  attendance: { title: "Attendance", icon: "🗓️", desc: "Your attendance, subject-wise (75% needed).", add: () => isAdmin, scope: "own",
    f: [ST, T("subject", "Subject"), T("date", "Date", "date"), T("status", "Status", "select", ["Present", "Absent"])] },
  events: { title: "College Events", icon: "🎉", desc: "Events scheduled for the year.", add: () => isAdmin, scope: "all", sort: "date",
    f: [T("title", "Event"), T("date", "Date", "date"), T("details", "Details", "textarea")] },
  library: { title: "Library", icon: "📖", desc: "Books issued to you (fine Rs.2/day after due date).", add: () => isAdmin, scope: "own",
    f: [ST, T("book", "Book title"), T("issued", "Issue date", "date"), T("due", "Due date", "date"), T("status", "Status", "select", ["Issued", "Returned"])] },
  mentor: { title: "Mentor", icon: "🧑‍🏫", desc: "Your assigned mentor and their remarks.", add: () => isAdmin, scope: "own",
    f: [ST, T("mentor", "Mentor name"), T("contact", "Mentor email / phone"), T("remarks", "Remarks", "textarea")] },
  results: { title: "Results", icon: "🎓", desc: "Subject marks (pass mark 40).", add: () => isAdmin, scope: "own",
    f: [ST, T("year", "Academic year (e.g. 2025-26)"), T("semester", "Semester"), T("subject", "Subject"), T("marks", "Marks /100", "number")] },
  feedback: { title: "Feedback", icon: "💬", desc: "Tell us how we can improve.", add: () => !isAdmin, scope: "own",
    f: [T("category", "Category", "select", ["Academics", "Library", "Fees", "Website", "Other"]), T("rating", "Rating", "select", ["5", "4", "3", "2", "1"]), T("message", "Message", "textarea")] },
  contact: { title: "Contact Messages", icon: "✉️", desc: "Messages from the Contact Us page.", add: () => false, scope: "all", adminOnly: true, f: [T("name", "Name"), T("email", "Email"), T("message", "Message")] }
};
const M = MODS[q];
const KEY = "imedhub_m_" + q;
if (!M || (M.adminOnly && !isAdmin)) location.href = "userdashboard.html";
document.getElementById("m-title").innerHTML = M.icon + " " + M.title;
document.getElementById("m-desc").textContent = M.desc;
document.title = "IMEDHUB | " + M.title;
const nameOf = e => (loadList(KEY_USERS).find(u => u.email === e) || {}).name || e;

function fieldHTML(f) {
  let o = typeof f.o === "function" ? f.o() : f.o || [];
  const id = "f_" + f.n, r = f.t === "file" ? "" : " required";
  if (f.t === "select") return "<label>" + f.l + "</label><select id='" + id + "' required>" + o.map(x => Array.isArray(x) ? "<option value='" + esc(x[0]) + "'>" + esc(x[1]) + "</option>" : "<option>" + esc(x) + "</option>").join("") + "</select>";
  if (f.t === "textarea") return "<label>" + f.l + "</label><textarea id='" + id + "'" + (q === "notes" || q === "mentor" || q === "events" ? "" : r) + "></textarea>";
  return "<label>" + f.l + "</label><input id='" + id + "' type='" + f.t + "'" + (f.t === "file" ? " accept='application/pdf'" : (["link", "details"].includes(f.n) || f.n === "contact" ? "" : r)) + ">";
}
const box = document.getElementById("m-form");
if (M.add()) {
  box.innerHTML = "<h3>Add new</h3><div class='form-grid'>" + M.f.map(fieldHTML).join("<div></div>") + "</div><button class='btn btn-primary form-btn'>Save</button>";
  box.onsubmit = async function (e) {
    e.preventDefault();
    const rec = { id: Date.now(), by: me.email, byName: me.name, on: new Date().toISOString().slice(0, 10) };
    for (const f of M.f) {
      const el = document.getElementById("f_" + f.n);
      if (f.t === "file") {
        if (!el.files[0]) continue;
        if (el.files[0].size > 2097152) return popup("File is larger than 2 MB.");
        rec.data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(el.files[0]); });
      } else rec[f.n] = el.value.trim();
    }
    if (q === "notes" && !rec.data && !rec.text) return popup("Upload a PDF or type some notes.");
    if (M.scope === "own" && !isAdmin) rec.student = me.email;
    try { const l = loadList(KEY); l.push(rec); saveList(KEY, l); } catch (err) { return popup("Storage is full. Try a smaller file."); }
    box.reset(); popup("Saved!", "success"); draw();
  };
} else box.style.display = "none";

function fine(r) { const d = Math.floor((new Date() - new Date(r.due)) / 864e5); return r.status === "Issued" && d > 0 ? d * 2 : 0; }
function draw() {
  let l = loadList(KEY);
  if (M.scope === "own" && !isAdmin) l = l.filter(r => r.student === me.email || (!r.student && r.by === me.email));
  if (M.sort) l.sort((a, b) => a[M.sort] > b[M.sort] ? 1 : -1); else l.reverse();
  const cols = M.f.filter(f => !["file", "textarea"].includes(f.t) || ["details", "remarks", "message"].includes(f.n));
  let html = "<table><thead><tr>" + (M.scope === "own" && isAdmin ? "<th>Student</th>" : "") + cols.filter(f => f.n !== "student").map(f => "<th>" + f.l.split("(")[0] + "</th>").join("") + (q === "notes" ? "<th>By</th>" : "") + (q === "library" ? "<th>Fine</th>" : "") + "<th>Action</th></tr></thead><tbody>";
  l.forEach(r => {
    html += "<tr>" + (M.scope === "own" && isAdmin ? "<td>" + esc(nameOf(r.student)) + "</td>" : "") + cols.filter(f => f.n !== "student").map(f => "<td>" + (f.t === "url" && r[f.n] ? "<a href='" + esc(r[f.n]) + "' target='_blank' rel='noopener'>Open</a>" : esc(r[f.n])) + "</td>").join("") +
      (q === "notes" ? "<td>" + esc(r.byName) + "</td>" : "") + (q === "library" ? "<td>Rs." + fine(r) + "</td>" : "") + "<td>" +
      (q === "notes" ? "<button class='mini-btn' data-dl='" + r.id + "'>⬇ PDF</button>" : "") +
      (isAdmin || r.by === me.email ? "<button class='delete-btn' data-del='" + r.id + "'>Delete</button>" : "") + "</td></tr>";
  });
  document.getElementById("m-list").innerHTML = l.length ? html + "</tbody></table>" : "<p class='empty-msg' style='padding:18px'>Nothing here yet.</p>";
  extras(l);
}
function extras(l) {
  const x = document.getElementById("m-extra"); let h = "";
  if (q === "attendance") {
    const s = {}; l.forEach(r => { const k = (isAdmin ? nameOf(r.student) + " - " : "") + r.subject; s[k] = s[k] || [0, 0]; s[k][1]++; if (r.status === "Present") s[k][0]++; });
    h = "<h3>Summary</h3><div class='card-grid'>" + Object.keys(s).map(k => { const p = Math.round(100 * s[k][0] / s[k][1]); return "<div class='card'><b>" + esc(k) + "</b><div class='stat " + (p < 75 ? "low" : "ok") + "'>" + p + "%</div>" + s[k][0] + "/" + s[k][1] + " classes</div>"; }).join("") + "</div>";
  }
  if (q === "results" && isAdmin) {
    const y = {}; l.forEach(r => { const a = y[r.year] = y[r.year] || { n: 0, sum: 0, pass: 0, s: {} }; const m = +r.marks; a.n++; a.sum += m; if (m >= 40) a.pass++; (a.s[r.subject] = a.s[r.subject] || []).push(m); });
    h = "<h3>Yearly result analytics</h3>" + Object.keys(y).sort().map(k => { const a = y[k]; return "<div class='card' style='margin-bottom:14px'><b>" + esc(k) + "</b> — " + a.n + " results, average <b>" + (a.sum / a.n).toFixed(1) + "</b>, pass rate <b>" + Math.round(100 * a.pass / a.n) + "%</b>" +
      Object.keys(a.s).map(s => { const av = a.s[s].reduce((p, c) => p + c, 0) / a.s[s].length; return "<div style='display:flex;gap:10px;align-items:center;margin-top:6px'><span style='width:200px'>" + esc(s) + "</span><div class='bar' style='width:" + av + "%'></div><span>" + av.toFixed(1) + "</span></div>"; }).join("") + "</div>"; }).join("");
  }
  if (q === "results" && !isAdmin && l.length) h = "<p>Average: <b>" + (l.reduce((p, r) => p + +r.marks, 0) / l.length).toFixed(1) + "</b></p>";
  x.innerHTML = h;
}
document.addEventListener("click", function (e) {
  const d = e.target.dataset;
  if (d.del && confirm("Delete this entry?")) { saveList(KEY, loadList(KEY).filter(r => r.id != d.del)); draw(); }
  if (d.dl) { const r = loadList(KEY).find(x => x.id == d.dl); const n = (r.title || "notes").replace(/\W+/g, "_") + ".pdf";
    r.data ? saveFile(r.data, n) : saveFile(makePDF([r.title, "Subject: " + r.subject, "By: " + r.byName + "  (" + r.on + ")", ""].concat(r.text.split("\n"))), n); }
});
draw();
