// ===== fees.js : college fees, exam form, payment gateway, PDF receipts =====
const u = curUser() || {}, S = settings(), isAd = u.role === "admin";
const yearNo = { "1st Year": 1, "2nd Year": 2 };
function paidTotal(email, type) { return loadList(KEY_PAY).filter(p => p.email === email && p.type === type && p.status === "Paid").reduce((a, p) => a + p.amount, 0); }

// ---- Payment: Razorpay order (created on the server) -> Checkout -> server verifies signature ----
async function api(path, body) {
  let res;
  try { res = await fetch(API_BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch (e) { throw new Error("Cannot reach the payment server. Start it (open the backend folder, run: node server.js) and try again."); }
  let data = {}; try { data = await res.json(); } catch (e) { }
  if (!res.ok) throw new Error(data.error || "Payment server error (" + res.status + ").");
  return data;
}
let payBusy = false;
async function pay(amount, desc, type, extra) {
  if (payBusy) return;
  const rec = Object.assign({ id: "RCPT" + Date.now(), email: u.email, name: u.name, enrol: u.id || "-", amount: amount, desc: desc, type: type, date: new Date().toLocaleString("en-IN"), status: "Paid" }, extra || {});
  const done = (ref, status) => { rec.ref = ref; rec.status = status; const l = loadList(KEY_PAY); l.push(rec); saveList(KEY_PAY, l); if (extra && extra.after) extra.after(); popup(status === "Paid" ? "Payment of Rs." + amount + " received. Ref: " + ref : "Payment recorded. Admin will confirm it, then your receipt is available.", "success", "Payment"); render(); };
  payBusy = true;
  try {
    if (!window.Razorpay) throw new Error("Razorpay Checkout could not load. Check your internet connection and reload the page.");
    const o = await api("/api/create-order", { amount: amount, description: desc, type: type, email: u.email });
    let finished = false;
    const rz = new Razorpay({
      key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency, name: COLLEGE.name, description: desc,
      prefill: { name: u.name, email: u.email, contact: u.mobile || "" }, theme: { color: "#2563eb" },
      handler: async r => {
        finished = true;
        try { await api("/api/verify-payment", r); payBusy = false; done(r.razorpay_payment_id, "Paid"); }
        catch (e) { payBusy = false; popup(e.message + " If money was deducted, contact the admin with Payment ID: " + r.razorpay_payment_id, "error", "Could not verify payment"); }
      },
      modal: { ondismiss: () => { if (!finished) { payBusy = false; popup("Payment cancelled."); } } }
    });
    rz.on("payment.failed", r => { finished = true; payBusy = false; popup((r.error && r.error.description) || "Payment failed. Please try again.", "error", "Payment failed"); });
    rz.open();
  } catch (e) {
    payBusy = false;
    if (S.payLink) {   // fallback: admin-configured payment link
      window.open(S.payLink, "_blank");
      const ref = prompt("After paying on the page that opened, enter the Payment/UTR reference ID here:");
      if (ref) done(ref.trim(), "Pending");
    } else popup(e.message, "error", "Payment unavailable");
  }
}

function receipt(p) {
  saveFile(makePDF([COLLEGE.name + " - FEE RECEIPT", "-----------------------------------------------", "Receipt No : " + p.id, "Date       : " + p.date, "Student    : " + p.name, "Enrolment  : " + p.enrol, "Email      : " + p.email, "Paid for   : " + p.desc, "Amount     : Rs. " + p.amount, "Payment ID : " + p.ref, "Status     : " + p.status, "", "This is a computer generated receipt."]), p.id + ".pdf");
}
function examPDF(f) {
  saveFile(makePDF([COLLEGE.name + " - EXAM FORM ACKNOWLEDGEMENT", "-----------------------------------------------", "Name: " + f.name, "Enrolment: " + f.enrol, "Course / Year: " + f.course + " / " + f.year, "Semester: " + f.sem, "Mobile: " + f.mobile + "   Email: " + f.email, "Address: " + f.address, "", "Subjects:"].concat(f.subjects.map(s => "  " + s)).concat(["", "Exam fee paid: Rs. " + f.fee, "Submitted on: " + f.date])), "ExamForm_Sem" + f.sem + ".pdf");
}

function render() {
  const pays = loadList(KEY_PAY).filter(p => isAd || p.email === u.email).reverse();
  document.getElementById("pay-list").innerHTML = pays.length ? "<table><thead><tr>" + (isAd ? "<th>Student</th>" : "") + "<th>Date</th><th>For</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>" +
    pays.map(p => "<tr>" + (isAd ? "<td>" + esc(p.name) + "</td>" : "") + "<td>" + esc(p.date) + "</td><td>" + esc(p.desc) + "</td><td>Rs." + p.amount + "</td><td>" + p.status + "</td><td>" +
      (p.status === "Paid" ? "<button class='mini-btn' data-r='" + p.id + "'>⬇ Receipt PDF</button>" : isAd ? "<button class='mini-btn' data-ok='" + p.id + "'>Confirm</button>" : "") + "</td></tr>").join("") + "</tbody></table>" : "<p class='empty-msg' style='padding:18px'>No payments yet.</p>";
  if (isAd) return;
  const total = yearNo[u.year] === 2 ? S.fee2 : S.fee1, paid = paidTotal(u.email, "fees"), due = Math.max(0, total - paid);
  document.getElementById("fee-summary").innerHTML = "Yearly fee (" + esc(u.year || "-") + "): <b>Rs." + total + "</b> | Paid: <b class='ok'>Rs." + paid + "</b> | Due: <b class='" + (due ? "low" : "ok") + "'>Rs." + due + "</b>";
  document.getElementById("fee-amt").value = due; document.getElementById("fee-amt").max = due;
}
document.addEventListener("click", e => {
  const d = e.target.dataset, l = loadList(KEY_PAY);
  if (d.r) receipt(l.find(p => p.id === d.r));
  if (d.ok) { l.find(p => p.id === d.ok).status = "Paid"; saveList(KEY_PAY, l); render(); }
});

if (isAd) { document.querySelectorAll(".student-only").forEach(x => x.style.display = "none"); }
else {
  document.getElementById("fee-form").onsubmit = e => { e.preventDefault(); const a = +document.getElementById("fee-amt").value, mx = +document.getElementById("fee-amt").max;
    if (!(a >= 1) || a > mx) return popup("Enter an amount between 1 and the due amount (Rs." + mx + ")."); pay(a, "College fees " + u.year + " (" + new Date().getFullYear() + ")", "fees"); };
  // Exam form: profile auto-filled, subjects + fee auto-filled when semester is chosen
  const sem = document.getElementById("ex-sem"), v = (id, t) => document.getElementById(id).value = t || "";
  v("ex-name", u.name); v("ex-enrol", u.id); v("ex-course", u.course); v("ex-year", u.year); v("ex-mobile", u.mobile); v("ex-email", u.email); v("ex-address", u.address);
  sem.innerHTML = "<option value=''>-- choose semester --</option>" + Object.keys(SUBJECTS).map(s => "<option>" + s + "</option>").join("");
  sem.onchange = () => { const l = SUBJECTS[sem.value] || []; document.getElementById("ex-subjects").innerHTML = l.map(s => "<li>" + esc(s[0] + " - " + s[1]) + "</li>").join(""); document.getElementById("ex-fee").textContent = sem.value ? S.examFee : 0; };
  document.getElementById("exam-form").onsubmit = e => { e.preventDefault();
    if (!sem.value) return popup("Please choose a semester.");
    if (!u.mobile || !u.address) return popup("Complete your profile (mobile/address) first.");
    if (loadList("imedhub_m_exams").some(x => x.email === u.email && x.sem === sem.value)) return popup("You already submitted the exam form for this semester.");
    const f = { email: u.email, name: u.name, enrol: u.id, course: u.course, year: u.year, mobile: u.mobile, address: u.address, sem: sem.value, subjects: SUBJECTS[sem.value].map(s => s[0] + " - " + s[1]), fee: S.examFee, date: new Date().toLocaleString("en-IN") };
    pay(S.examFee, "Exam fee - Semester " + sem.value, "exam", { after: () => { const l = loadList("imedhub_m_exams"); l.push(f); saveList("imedhub_m_exams", l); examPDF(f); } }); };
}
render();
