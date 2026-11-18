// ===== admin.js : only for admin-dashboard.html =====

// Only the admin may stay on this page
const adminUser = JSON.parse(localStorage.getItem(KEY_CURRENT));
// (main.js already sends people who are not logged in to the login page)
if (adminUser && adminUser.role !== "admin") {
  alert("Admins only. Please login as admin.");
  window.location.href = "login.html";
}

// ---------- Add a resource ----------
document.getElementById("resource-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const list = loadList(KEY_RESOURCES);
  list.push({
    type: document.getElementById("res-type").value,
    title: document.getElementById("res-title").value,
    subtitle: document.getElementById("res-subtitle").value,
    link: document.getElementById("res-link").value
  });
  saveList(KEY_RESOURCES, list);
  this.reset();
  showMsg("res-msg", "Resource added!");
  showLists();
});

// ---------- Add an announcement ----------
document.getElementById("announcement-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const list = loadList(KEY_ANNOUNCEMENTS);
  list.push({
    title: document.getElementById("ann-title").value,
    date: document.getElementById("ann-date").value
  });
  saveList(KEY_ANNOUNCEMENTS, list);
  this.reset();
  showMsg("ann-msg", "Announcement posted!");
  showLists();
});

function showMsg(id, text) {
  const p = document.getElementById(id);
  p.textContent = text;
  p.className = "form-msg success";
}

// ---------- Show saved items with a delete button ----------
function showLists() {
  fillList("resource-items", KEY_RESOURCES, function (r) { return "[" + r.type + "] " + r.title; });
  fillList("announcement-items", KEY_ANNOUNCEMENTS, function (a) { return a.title + " (" + a.date + ")"; });
}

function fillList(boxId, key, makeText) {
  const box = document.getElementById(boxId);
  const list = loadList(key);
  box.innerHTML = list.length ? "" : "<li>Nothing added yet.</li>";
  list.forEach(function (item, index) {
    box.innerHTML += "<li><span>" + makeText(item) + "</span>" +
      "<button class='delete-btn' data-key='" + key + "' data-index='" + index + "'>Delete</button></li>";
  });
}

// One click listener handles every delete button
document.addEventListener("click", function (event) {
  if (event.target.classList.contains("delete-btn")) {
    const key = event.target.dataset.key;
    const list = loadList(key);
    list.splice(Number(event.target.dataset.index), 1); // remove 1 item
    saveList(key, list);
    showLists();
  }
});

showLists();

// ---------- Users: view all details, edit, delete ----------
function showUsers() {
  const l = loadList(KEY_USERS); document.getElementById("u-count").textContent = l.length;
  document.getElementById("user-table").innerHTML = "<table><thead><tr><th>Enrol</th><th>Name</th><th>Email</th><th>Mobile</th><th>Course</th><th>Year</th><th>Address</th><th>Fees paid</th><th></th></tr></thead><tbody>" +
    l.map((u, i) => "<tr><td>" + esc(u.id) + "</td><td>" + esc(u.name) + "</td><td>" + esc(u.email) + "</td><td>" + esc(u.mobile) + "</td><td>" + esc(u.course) + "</td><td>" + esc(u.year) + "</td><td>" + esc(u.address) + "</td><td>Rs." + loadList(KEY_PAY).filter(p => p.email === u.email && p.status === "Paid").reduce((a, p) => a + p.amount, 0) + "</td><td><button class='mini-btn' data-edit='" + i + "'>Edit</button><button class='delete-btn' data-udel='" + i + "'>Delete</button></td></tr>").join("") + "</tbody></table>";
  const ex = loadList("imedhub_m_exams");
  document.getElementById("exam-table").innerHTML = ex.length ? "<table><thead><tr><th>Name</th><th>Enrol</th><th>Semester</th><th>Fee</th><th>Date</th></tr></thead><tbody>" + ex.map(x => "<tr><td>" + esc(x.name) + "</td><td>" + esc(x.enrol) + "</td><td>" + esc(x.sem) + "</td><td>Rs." + x.fee + "</td><td>" + esc(x.date) + "</td></tr>").join("") + "</tbody></table>" : "<p class='empty-msg' style='padding:14px'>No exam forms yet.</p>";
}
document.addEventListener("click", function (e) {
  const d = e.target.dataset, l = loadList(KEY_USERS);
  if (d.udel !== undefined && confirm("Delete this user permanently?")) { l.splice(+d.udel, 1); saveList(KEY_USERS, l); showUsers(); }
  if (d.edit !== undefined) {
    const u = l[+d.edit];
    ["name", "mobile", "course", "year", "address"].forEach(k => { const v = prompt("Edit " + k + ":", u[k] || ""); if (v !== null && v.trim()) u[k] = v.trim(); });
    const pw = prompt("New password (leave empty to keep):", ""); if (pw && pw.length >= 8) u.password = pw;
    saveList(KEY_USERS, l); showUsers(); popup("User updated.", "success");
  }
});
const S0 = settings();
[["s-link", "payLink"], ["s-f1", "fee1"], ["s-f2", "fee2"], ["s-ex", "examFee"]].forEach(p => document.getElementById(p[0]).value = S0[p[1]]);
document.getElementById("set-form").addEventListener("submit", function (e) {
  e.preventDefault(); const g = id => document.getElementById(id).value.trim();
  localStorage.setItem(KEY_SET, JSON.stringify({ payLink: g("s-link"), fee1: +g("s-f1"), fee2: +g("s-f2"), examFee: +g("s-ex") })); popup("Settings saved.", "success");
});
showUsers();
