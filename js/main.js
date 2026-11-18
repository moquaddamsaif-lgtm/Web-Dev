// ===== main.js : runs on every page =====
// Each part below only does something if the page has that element.

// ---------- 1. Mobile menu button ----------
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
if (menuBtn) {
  menuBtn.addEventListener("click", function () {
    navLinks.classList.toggle("open");
  });
}

// ---------- 2. Highlight the link of the page you are on ----------
const currentPage = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav-links a").forEach(function (link) {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active");
  }
});

// ---------- 3. Login check: protect pages + show menu only after login ----------
const user = JSON.parse(localStorage.getItem(KEY_CURRENT));   // null if nobody is logged in

// These pages need login. If nobody is logged in, send them to the login page.
const protectedPages = ["syllabus.html", "schedule.html", "pyq.html", "downloads.html", "userdashboard.html", "admin-dashboard.html", "module.html", "fees.html", "profile.html"];
if (!user && protectedPages.includes(currentPage)) {
  alert("Please login first to open this page.");
  window.location.href = "login.html";
}

const loginBtn = document.getElementById("nav-login");
const signupBtn = document.getElementById("nav-signup");

if (user) {
  // Logged in: show the menu, hide Sign Up, change Login into Logout
  if (navLinks) {
    navLinks.classList.remove("locked");
    buildNav(user);
  }
  if (signupBtn) signupBtn.style.display = "none";
  if (loginBtn) {
    loginBtn.textContent = "Logout";
    loginBtn.href = "#";
    loginBtn.addEventListener("click", logout);
  }
} else {
  // Not logged in: no menu and no menu button
  if (menuBtn) menuBtn.style.display = "none";
}

// ---------- Menu: same links as before, grouped into dropdowns so the bar fits on one row ----------
function buildNav(u) {
  const isAdmin = u.role === "admin";
  const item = (href, label) => "<li><a href='" + href + "'>" + label + "</a></li>";
  const group = (label, items) => "<li class='has-dd'><button type='button' class='dd-toggle' aria-haspopup='true' aria-expanded='false'>" + label + " <span class='caret'>&#9662;</span></button><ul class='dd-menu'>" +
    items.map(i => item(i[0], i[1])).join("") + "</ul></li>";
  navLinks.innerHTML =
    item(isAdmin ? "admin-dashboard.html" : "userdashboard.html", isAdmin ? "Admin" : "Dashboard") +
    group("Academics", [["syllabus.html", "Syllabus"], ["schedule.html", "Timetable"], ["module.html?m=assignments", "Assignments"], ["module.html?m=attendance", "Attendance"], ["module.html?m=results", "Results"], ["module.html?m=mentor", "Mentor"]]) +
    group("Resources", [["pyq.html", "PYQ"], ["downloads.html", "Downloads"], ["module.html?m=notes", "Senior Notes"], ["module.html?m=library", "Library"]]) +
    item("module.html?m=events", "Events") +
    item("fees.html", "Fees &amp; Exam");

  // highlight the page you are on (a dropdown is highlighted when one of its pages is open)
  const here = location.pathname.split("/").pop() || "index.html";
  navLinks.querySelectorAll("a").forEach(function (a) {
    const href = a.getAttribute("href"), same = href.split("?")[0] === here && (href.indexOf("?") === -1 || href.split("?")[1] === location.search.slice(1));
    if (!same) return;
    a.classList.add("active");
    const g = a.closest(".has-dd"); if (g) g.classList.add("active");
  });

  // open / close dropdowns (hover on desktop is handled in CSS; click works everywhere)
  function closeAll(except) {
    navLinks.querySelectorAll(".has-dd.open").forEach(function (li) {
      if (li !== except) { li.classList.remove("open"); li.firstChild.setAttribute("aria-expanded", "false"); }
    });
  }
  navLinks.addEventListener("click", function (e) {
    const t = e.target.closest(".dd-toggle"); if (!t) return;
    const li = t.parentElement, willOpen = !li.classList.contains("open");
    closeAll(li); li.classList.toggle("open", willOpen); t.setAttribute("aria-expanded", String(willOpen));
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".has-dd")) closeAll(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
}
function logout(event) {
  if (event) event.preventDefault();
  localStorage.removeItem(KEY_CURRENT);
  window.location.href = "login.html";
}

// ---------- 4. Announcements (home page + user dashboard) ----------
const annBox = document.getElementById("announcement-list");
if (annBox) {
  const list = loadList(KEY_ANNOUNCEMENTS);
  if (list.length === 0) {
    annBox.innerHTML = "<li>No announcements yet.</li>";
  } else {
    annBox.innerHTML = "";
    // newest first
    list.slice().reverse().forEach(function (a) {
      annBox.innerHTML += "<li><span>" + a.title + "</span><span class='date'>" + a.date + "</span></li>";
    });
  }
}

// ---------- 5. Resource lists (pyq.html, downloads.html) ----------
// The page says which type it wants:  <div id="resource-list" data-type="pyq">
const resBox = document.getElementById("resource-list");
if (resBox) {
  const type = resBox.dataset.type;
  const items = loadList(KEY_RESOURCES).filter(function (r) { return r.type === type; });
  if (items.length === 0) {
    resBox.innerHTML = "<p class='empty-msg'>Nothing here yet. Check back soon!</p>";
  }
  items.forEach(function (r) {
    resBox.innerHTML +=
      "<div class='card resource-item'>" +
      "<div><h3>" + r.title + "</h3><p>" + r.subtitle + "</p></div>" +
      "<a class='btn btn-primary' href='" + r.link + "' target='_blank'>Open</a></div>";
  });
}

// ---------- 6. Search box for tables (syllabus + schedule) ----------
const searchBox = document.getElementById("table-search");
if (searchBox) {
  searchBox.addEventListener("input", function () {
    const text = searchBox.value.toLowerCase();
    document.querySelectorAll("tbody tr").forEach(function (row) {
      // show the row only if it contains the typed text
      row.style.display = row.textContent.toLowerCase().includes(text) ? "" : "none";
    });
  });
}

// ---------- 7. Sign up ----------
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const v = id => document.getElementById(id).value.trim();
    const email = v("email").toLowerCase();
    if (!/^[6-9]\d{9}$/.test(v("mobile"))) return popup("Enter a valid 10-digit mobile number.");
    if (document.getElementById("password").value.length < 8) return popup("Password must be at least 8 characters.");
    const users = loadList(KEY_USERS);
    if (users.some(u => u.email === email)) return popup("This email is already registered. Please login.");
    users.push({ id: "IMH" + String(new Date().getFullYear()).slice(2) + String(users.length + 1).padStart(4, "0"), name: v("name"), address: v("address"), email: email, mobile: v("mobile"), course: v("course"), year: v("year"), password: document.getElementById("password").value });
    saveList(KEY_USERS, users);
    popup("Account created! Please login.", "success", "Registered");
    setTimeout(() => window.location.href = "login.html", 1500);
  });
}

// ---------- 8. Login ----------
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem(KEY_CURRENT, JSON.stringify({ name: "Admin", email: email, role: "admin" }));
      return window.location.href = "admin-dashboard.html";
    }
    const found = loadList(KEY_USERS).find(u => u.email === email && u.password === password);
    if (!found) return popup("Wrong email or password. Please check your credentials and try again.");
    localStorage.setItem(KEY_CURRENT, JSON.stringify({ name: found.name, email: found.email, role: "student" }));
    window.location.href = "userdashboard.html";
  });
}

// ---------- 8b. Forgot password (verifies email + registered mobile) ----------
const forgotForm = document.getElementById("forgot-form");
if (forgotForm) forgotForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const users = loadList(KEY_USERS), email = document.getElementById("email").value.trim().toLowerCase(), pw = document.getElementById("password").value;
  const u = users.find(x => x.email === email && x.mobile === document.getElementById("mobile").value.trim());
  if (!u) return popup("Email and registered mobile number do not match any account.");
  if (pw.length < 8) return popup("New password must be at least 8 characters.");
  u.password = pw; saveList(KEY_USERS, users); popup("Password changed. Please login.", "success");
  setTimeout(() => window.location.href = "login.html", 1500);
});

// ---------- 8c. Contact us ----------
const contactForm = document.getElementById("contact-form");
if (contactForm) contactForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const l = loadList("imedhub_m_contact"); const g = id => document.getElementById(id).value.trim();
  l.push({ id: Date.now(), name: g("name"), email: g("email"), message: g("message"), date: new Date().toISOString().slice(0, 10) });
  saveList("imedhub_m_contact", l); contactForm.reset(); popup("Thanks! We will get back to you soon.", "success", "Message sent");
});

// ---------- 9. Student dashboard: protect page + show name ----------
const welcomeName = document.getElementById("welcome-name");
if (welcomeName) {
  if (!user) {
    window.location.href = "login.html"; // not logged in -> go to login
  } else {
    welcomeName.textContent = user.name;
    if (user.role === "admin") window.location.href = "admin-dashboard.html";
  }
}

// ---------- 10. Footer year ----------
const yearSpan = document.getElementById("year");
if (yearSpan) yearSpan.textContent = new Date().getFullYear();


// ---------- 11. Home page: change the buttons if the user is already logged in ----------
const heroButtons = document.getElementById("hero-buttons");
if (heroButtons && user) {
  const page = user.role === "admin" ? "admin-dashboard.html" : "userdashboard.html";
  heroButtons.innerHTML = "<a href='" + page + "' class='btn btn-primary'>Go to my Dashboard</a>";
  document.getElementById("login-notice").style.display = "none";
}
// highlight the current menu link again (because Dashboard link was added after step 2)
document.querySelectorAll(".nav-links a").forEach(function (link) {
  if (link.getAttribute("href") === currentPage) link.classList.add("active");
});
