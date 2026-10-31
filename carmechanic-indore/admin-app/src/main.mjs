import { createClient } from "@supabase/supabase-js";
import {
  escapeHtml as e,
  money,
  paise,
  rupees,
  today,
  lineTotal,
  backendConfig,
  message,
} from "./core.mjs";
import { printInvoice } from "./print.mjs";
const app = document.querySelector("#app"),
  dialog = document.querySelector("#editor");
const settings = backendConfig(window.GW_BACKEND);
const navs = [
  ["overview", "Overview"],
  ["customers", "Customers"],
  ["bookings", "Bookings"],
  ["jobs", "Job cards"],
  ["invoices", "Invoices"],
  ["payments", "Payments"],
  ["settings", "Settings"],
];
const statuses = {
  bookings: [
    "new",
    "confirmed",
    "in_progress",
    "ready",
    "delivered",
    "cancelled",
  ],
  jobs: [
    "new",
    "inspection",
    "awaiting_approval",
    "in_progress",
    "ready",
    "delivered",
    "cancelled",
  ],
};
let client,
  user = null,
  owner = false,
  screen = "overview",
  page = 0,
  search = "",
  filter = "",
  rows = [],
  epoch = 0,
  recoveryRequested = new URLSearchParams(location.hash.slice(1)).get("type") === "recovery",
  idleTimer;
const take = 25;
const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const rpc = async (name, args = {}) => check(await client.rpc(name, args));
const select = async (table, id) =>
  check(await client.from(table).select("*").eq("id", id).single());
const badge = (status) =>
  `<span class="tag ${e(status)}">${e(String(status).replaceAll("_", " "))}</span>`;
const btn = (text, action, cls = "") =>
  `<button type="button" class="btn ${cls}" data-action="${e(action)}">${e(text)}</button>`;
const opts = (values, current) =>
  values
    .map((v) => {
      const [id, label] = Array.isArray(v)
        ? v
        : [v, String(v).replaceAll("_", " ")];
      return `<option value="${e(id)}" ${String(id) === String(current) ? "selected" : ""}>${e(label)}</option>`;
    })
    .join("");
const field = (name, label, value = "", type = "text", extra = "") =>
  `<label>${e(label)}<input name="${e(name)}" type="${e(type)}" value="${e(value)}" ${extra}></label>`;
const area = (name, label, value = "", max = 2000) =>
  `<label class="full">${e(label)}<textarea name="${e(name)}" aria-label="${e(label)}" maxlength="${max}">${e(value)}</textarea></label>`;
const dropdown = (name, label, values, current) =>
  `<label>${e(label)}<select name="${e(name)}">${opts(values, current)}</select></label>`;
const errorBox = '<div class="form-error error" role="alert"></div>';
function toast(text) {
  const node = document.querySelector("#toast");
  node.textContent = text;
  setTimeout(() => {
    if (node.textContent === text) node.textContent = "";
  }, 5000);
}
function modal(title, body, wide = false) {
  dialog.classList.toggle("wide", wide);
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${e(title)}</h2><button type="button" data-close aria-label="Close dialog">×</button></div><div class="dialog-body">${body}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
}
function formModal(
  title,
  body,
  onSave,
  wide = false,
  saveText = "Save changes",
) {
  modal(
    title,
    `<form class="fields"><fieldset class="fields">${body}${errorBox}<div class="form-actions"><button type="button" class="btn" data-cancel>Cancel</button><button class="btn primary" type="submit">${e(saveText)}</button></div></fieldset></form>`,
    wide,
  );
  const form = dialog.querySelector("form");
  form.querySelector("[data-cancel]").onclick = () => dialog.close();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const box = form.querySelector(".form-error"),
      fs = form.querySelector("fieldset");
    box.textContent = "";
    const generation = epoch,
      values = Object.fromEntries(new FormData(form));
    fs.disabled = true;
    try {
      await onSave(values, form);
      if (!owner || generation !== epoch) return;
      dialog.close();
      toast("Saved securely.");
      await render();
    } catch (err) {
      if (owner && generation === epoch) box.textContent = message(err);
    } finally {
      fs.disabled = false;
    }
  };
  return form;
}
async function update(table, row, values) {
  const result = check(
    await client
      .from(table)
      .update(values)
      .eq("id", row.id)
      .eq("version", row.version)
      .select("id"),
  );
  if (!result.length) throw new Error("Record changed. Reload before saving.");
}
async function write(table, row, values) {
  if (row?.id) return update(table, row, values);
  return check(await client.from(table).insert(values).select("id").single());
}
function lock() {
  owner = false;
  user = null;
  epoch++;
  clearTimeout(idleTimer);
  dialog.close();
  dialog.innerHTML = "";
  rows = [];
  document.querySelectorAll(".print-frame").forEach((n) => n.remove());
}
async function logout() {
  lock();
  authPage();
  await client.auth.signOut({ scope: "local" });
}
function touch() {
  if (owner) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => {
        logout();
        toast("Signed out after 20 minutes of inactivity.");
      },
      20 * 60 * 1000,
    );
  }
}
for (const event of ["pointerdown", "keydown"])
  document.addEventListener(event, touch, { passive: true });
// Clear private DOM before navigation can enter the browser's back/forward cache.
window.addEventListener("pagehide", () => {
  if (owner) {
    lock();
    authPage();
    client.auth.signOut({ scope: "local" });
  }
});
function authPage(note = "") {
  app.innerHTML = `<main class="auth-wrap"><section class="auth-brand"><a href="../index.html" aria-label="Garagewala website"><img src="../assets/img/garagewala-logo.png" alt="Garagewala"></a><p class="eyebrow">GARAGEWALA · OWNER WORKSPACE</p><h1>Less paperwork.<br><span>More good work.</span></h1><p>Customers, workshop jobs and billing, together in your private workspace.</p><div class="actions"><span class="private-badge">Owner access only</span></div></section><section class="auth-card"><p class="eyebrow">Your workshop, organised</p><h2>${settings ? "Welcome back." : "Your workspace is ready to connect."}</h2><p class="muted">${settings ? "Sign in with your owner account." : "Connect your own Supabase project to activate private customer records and billing."}</p>${settings ? `<form id="login" class="fields">${field("email", "Email address", "", "email", 'required autocomplete="username" maxlength="180"')}${field("password", "Password", "", "password", 'required autocomplete="current-password" minlength="8" maxlength="128"')}${errorBox}<button class="btn primary">Sign in →</button><button class="btn" type="button" id="reset">Forgot password?</button></form>` : `<div class="setup"><strong>Setup required</strong><p>No customer data is stored until the backend is connected. The setup guide in the GitHub repository explains the database, owner account and public connection settings.</p><p class="small">Use <code>docs/ADMIN_SETUP.md</code>. Never place a secret or service-role key in website files.</p></div>`}<p class="small muted">${e(note || "Sessions stay in this tab’s memory. Closing or reloading the tab requires signing in again.")}</p><div class="actions"><a class="btn" href="../index.html">← Back to website</a></div></section></main>`;
  if (!settings) return;
  const f = app.querySelector("#login");
  f.onsubmit = async (event) => {
    event.preventDefault();
    const b = f.querySelector("button"),
      box = f.querySelector(".form-error");
    b.disabled = true;
    box.textContent = "";
    try {
      const data = new FormData(f);
      check(
        await client.auth.signInWithPassword({
          email: data.get("email").trim(),
          password: data.get("password"),
        }),
      );
      f.reset();
    } catch (err) {
      box.textContent = message(err);
    } finally {
      b.disabled = false;
    }
  };
  app.querySelector("#reset").onclick = async () => {
    const email = f.elements.email.value.trim();
    const box = f.querySelector(".form-error");
    if (!email) {
      box.textContent = "Enter your email address first.";
      return;
    }
    const b = app.querySelector("#reset");
    b.disabled = true;
    try {
      check(
        await client.auth.resetPasswordForEmail(email, {
          redirectTo: new URL("./", location.href).href,
        }),
      );
      box.textContent =
        "If this address has an eligible account, a password reset email will arrive. Check spam too.";
    } catch (err) {
      box.textContent = message(err);
    } finally {
      b.disabled = false;
    }
  };
}
function shell() {
  app.innerHTML = `<div class="layout"><aside class="sidebar"><a class="brand" href="../index.html"><img src="../assets/img/garagewala-logo.png" alt=""><div><strong>GARAGE<span>WALA</span></strong><small>OWNER WORKSPACE</small></div></a><nav aria-label="Admin navigation">${navs.map(([id, label], i) => `<button class="nav-btn ${screen === id ? "active" : ""}" data-nav="${id}"><b aria-hidden="true">0${i + 1}</b>${label}</button>`).join("")}</nav><div class="side-bottom"><p>${e(user?.email)}<br>Private session · 20 min idle lock</p><a href="../index.html">↗ View public website</a><button class="btn dark" id="logout">Sign out</button></div></aside><main class="workspace"><div class="topbar"><span>GARAGEWALA / ${e(navs.find(([id]) => id === screen)?.[1])}</span><span class="private-badge">● Private workspace</span><span>${e(today())} · IST</span></div><div class="content" id="content"><div class="loading" role="status">Loading…</div></div></main></div>`;
  app.querySelectorAll("[data-nav]").forEach(
    (b) =>
      (b.onclick = () => {
        screen = b.dataset.nav;
        page = 0;
        search = "";
        filter = "";
        render();
      }),
  );
  app.querySelector("#logout").onclick = logout;
}
async function render() {
  if (!owner) return;
  const generation = ++epoch;
  shell();
  const content = app.querySelector("#content");
  try {
    if (screen === "overview") {
      const s = await rpc("admin_summary");
      if (!owner || generation !== epoch) return;
      content.innerHTML = `<div class="page-head"><div><p class="eyebrow">A clear view of your garage</p><h1>Let’s get to work.</h1><p>Your workshop at a glance. Figures follow Indian Standard Time.</p></div>${btn("↻ Refresh", "refresh")}</div><div class="stats">${[
        ["New enquiries", s.new_bookings],
        ["Open job cards", s.active_jobs],
        ["Active customers", s.customers],
        ["Collected today", money(s.collected_today)],
        ["Collected this month", money(s.collected_month)],
        ["Outstanding bills", money(s.outstanding)],
      ]
        .map(
          ([label, value], i) =>
            `<div class="stat ${i === 0 || i === 5 ? "orange" : ""}"><div class="label">${label}</div><strong>${e(value)}</strong></div>`,
        )
        .join(
          "",
        )}</div><div class="split"><section class="panel"><p class="eyebrow">Start here</p><h2>Keep every job moving.</h2><p class="muted small">Add an enquiry, track customer approval, then turn completed work into an invoice.</p><div class="quick-links">${btn("+ Add enquiry", "new:bookings", "primary")}${btn("+ Add customer", "new:customers")}${btn("+ Create job card", "new:jobs")}${btn("+ Draft invoice", "new:invoices")}</div></section><section class="panel"><p class="eyebrow">Good to know</p><h2>One place for the details.</h2><div class="callout">Website bookings arrive here only after the booking backend is enabled. Record phone and WhatsApp enquiries manually.</div><p class="small muted" style="margin-top:1rem">Collections count recorded payments. Outstanding bills exclude drafts and voided invoices.</p></section></div>`;
    } else if (screen === "settings") {
      const profile = await select("garage_profile", true);
      if (!owner || generation !== epoch) return;
      settingsPage(content, profile);
    } else await listPage(content, generation);
    if (!owner || generation !== epoch) return;
    content
      .querySelectorAll("[data-action]")
      .forEach((b) => (b.onclick = () => action(b.dataset.action)));
  } catch (err) {
    if (owner && generation === epoch)
      content.innerHTML = `<div class="error" role="alert">${e(message(err))}</div><button class="btn" data-retry>Try again</button>`;
    content.querySelector("[data-retry]")?.addEventListener("click", render);
  }
}
async function listPage(content, generation) {
  const table = {
    customers: "admin_customers",
    bookings: "admin_bookings",
    jobs: "admin_jobs",
    invoices: "admin_invoices",
    payments: "admin_payments",
  }[screen];
  let query = client
    .from(table)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * take, page * take + take - 1);
  if (search)
    query = query.ilike(
      "search_text",
      `%${search.replace(/[\\%_]/g, "\\$&")}%`,
    );
  if (filter) {
    if (screen === "customers")
      query = query.eq("archived", filter === "archived");
    else if (screen === "payments")
      query =
        filter === "active"
          ? query.is("voided_at", null)
          : query.not("voided_at", "is", null);
    else query = query.eq("status", filter);
  }
  const result = await query;
  check(result);
  if (!owner || generation !== epoch) return;
  rows = result.data;
  const name = navs.find(([id]) => id === screen)[1],
    count = result.count || 0;
  const filters =
    screen === "customers"
      ? [
          ["active", "Active"],
          ["archived", "Archived"],
        ]
      : screen === "payments"
        ? [
            ["active", "Active"],
            ["reversed", "Reversed"],
          ]
        : screen === "invoices"
          ? ["draft", "issued", "void"]
          : statuses[screen];
  const descriptions = {
    customers: "Contact details, vehicles and service history.",
    bookings:
      "Website requests and enquiries you enter from calls or WhatsApp.",
    jobs: "Tasks, customer approval and private job attachments.",
    invoices: "Create drafts, issue bills and save a printable PDF.",
    payments: "Manual payment records and corrections. No bank connection.",
  };
  content.innerHTML = `<div class="page-head"><div><p class="eyebrow">Your workshop records</p><h1>${name}</h1><p>${descriptions[screen]}</p></div>${screen === "payments" ? "" : btn("+ " + { customers: "Add customer", bookings: "Add enquiry", jobs: "Create job card", invoices: "Draft invoice" }[screen], `new:${screen}`, "primary")}</div><form class="toolbar" id="search-form"><input aria-label="Search records" name="search" placeholder="Search name, mobile or reference…" value="${e(search)}" maxlength="100"><select name="filter" aria-label="Filter records">${opts([["", "All records"], ...filters], filter)}</select><button class="btn" type="submit">Search</button>${btn("↻", "refresh")}</form><div class="table-wrap">${rows.length ? tableHtml() : `<div class="empty"><strong>${search || filter ? "No matching records." : "Your records will appear here."}</strong>${search || filter ? "Try another search or filter." : "Start by adding a customer or enquiry."}</div>`}</div><div class="pager"><span>${count ? `${page * take + 1}–${Math.min((page + 1) * take, count)} of ${count}` : "0 records"}</span><div class="actions"><button class="btn" data-action="prev" ${page === 0 ? "disabled" : ""}>← Previous</button><button class="btn" data-action="next" ${(page + 1) * take >= count ? "disabled" : ""}>Next →</button></div></div>`;
  content.querySelector("#search-form").onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    search = data.get("search").trim();
    filter = data.get("filter");
    page = 0;
    render();
  };
}
function tableHtml() {
  const headings = {
    customers: ["Customer", "Mobile", "Vehicles", "Status", ""],
    bookings: ["Enquiry", "Customer / vehicle", "Preferred date", "Status", ""],
    jobs: ["Job card", "Customer / vehicle", "Approval", "Status", ""],
    invoices: ["Invoice", "Customer", "Amount / due", "Status", ""],
    payments: ["Payment", "Invoice / customer", "Amount", "Status", ""],
  }[screen];
  return `<table><thead><tr>${headings.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => {
      let cells;
      if (screen === "customers")
        cells = [
          `<strong>${e(r.name)}</strong>`,
          e(r.mobile),
          e(r.vehicle_count),
          badge(r.archived ? "archived" : "active"),
          btn("Open", `customer:${r.id}`),
        ];
      if (screen === "bookings")
        cells = [
          `<strong>${e(r.reference)}</strong><span class="sub">${e(r.source)}</span>`,
          `<strong>${e(r.name)}</strong><span class="sub">${e(r.mobile)} · ${e(r.make)} ${e(r.model)}</span>`,
          `${e(r.preferred_date || "To confirm")}<span class="sub">${e(r.preferred_time)}</span>`,
          badge(r.status),
          btn("Open", `booking:${r.id}`),
        ];
      if (screen === "jobs")
        cells = [
          `<strong>${e(r.reference)}</strong>`,
          `<strong>${e(r.customer_name)}</strong><span class="sub">${e(r.registration || r.model || r.mobile)}</span>`,
          badge(r.approval),
          badge(r.status),
          btn("Open", `job:${r.id}`),
        ];
      if (screen === "invoices")
        cells = [
          `<strong>${e(r.number || "Draft")}</strong><span class="sub">${e(r.issue_date)}</span>`,
          `<strong>${e(r.customer_name)}</strong><span class="sub">${e(r.registration || r.mobile)}</span>`,
          `${money(r.total_paise)}<span class="sub">Due ${money(r.due_paise)}</span>`,
          badge(r.status),
          btn("Open", `invoice:${r.id}`),
        ];
      if (screen === "payments")
        cells = [
          `${e(r.paid_on)}<span class="sub">${e(r.method)} ${e(r.reference)}</span>`,
          `<strong>${e(r.invoice_number)}</strong><span class="sub">${e(r.customer_name)}</span>`,
          money(r.amount_paise),
          badge(r.voided_at ? "reversed" : "active"),
          r.voided_at
            ? `<small>${e(r.void_reason)}</small>`
            : btn("Correct entry", `reverse:${r.id}`),
        ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("")}</tbody></table>`;
}
async function action(value) {
  if (!owner) return;
  const [kind, id] = value.split(":");
  try {
    if (kind === "refresh") return render();
    if (kind === "prev") {
      page--;
      return render();
    }
    if (kind === "next") {
      page++;
      return render();
    }
    if (kind === "new")
      return {
        customers: () => editCustomer(),
        bookings: () => editBooking(),
        jobs: () => editJob(),
        invoices: () => editInvoice(),
      }[id]();
    if (kind === "customer") return await customerDetail(id);
    if (kind === "booking") return await bookingDetail(id);
    if (kind === "job") return await jobDetail(id);
    if (kind === "invoice") return await invoiceDetail(id);
    if (kind === "reverse")
      return reasonForm(
        "Correct payment entry",
        "This reverses the ledger entry. It does not send a refund or move money.",
        (reason) => rpc("reverse_payment", { p_id: id, p_reason: reason }),
      );
  } catch (err) {
    if (owner) toast(message(err));
  }
}
function editCustomer(row = {}) {
  formModal(
    row.id ? "Edit customer" : "Add customer",
    `<div class="grid">${field("name", "Customer name", row.name, "text", 'required minlength="2" maxlength="120" autocomplete="name"')}${field("mobile", "Mobile number", row.mobile, "tel", 'required pattern="[6-9][0-9]{9}" maxlength="10" inputmode="numeric"')}${field("email", "Email (optional)", row.email, "email", 'maxlength="180"')}${field("state_code", "State code (MP = 23)", row.state_code || "23", "text", 'required pattern="(0[1-9]|[12][0-9]|3[0-8])" maxlength="2"')}${field("gstin", "Customer GSTIN (optional)", row.gstin, "text", 'maxlength="15" pattern="[0-9A-Z]{15}"')}${area("address", "Billing address", row.address, 600)}${area("notes", "Private notes", row.notes)}<label class="check"><input type="checkbox" name="archived" ${row.archived ? "checked" : ""}>Archive customer</label></div>`,
    async (data) =>
      write("customers", row, {
        ...data,
        name: data.name.trim(),
        mobile: data.mobile.trim(),
        gstin: data.gstin.trim() || null,
        archived: data.archived === "on",
      }),
  );
}
async function customerDetail(id) {
  const generation = epoch;
  const [c, vehicles, jobs, invoices] = await Promise.all([
    select("customers", id),
    client
      .from("vehicles")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("admin_jobs")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("admin_invoices")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  [vehicles, jobs, invoices].forEach(check);
  if (!owner || generation !== epoch) return;
  modal(
    c.name,
    `<div class="actions"><a class="btn" href="tel:+91${e(c.mobile)}">Call ${e(c.mobile)}</a><a class="btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/91${e(c.mobile)}">WhatsApp</a>${btn("Edit customer", "edit")}${btn("+ Add vehicle", "vehicle")}</div><p class="small muted" style="margin-top:1rem">${e(c.address || "No billing address added.")}<br>${e(c.email)} ${c.gstin ? `· GSTIN ${e(c.gstin)}` : ""}</p><p class="small">${e(c.notes)}</p><h3 class="detail-title">Vehicles</h3><ul class="detail-list">${vehicles.data.map((v) => `<li><span>${e(v.make)} ${e(v.model)} · ${e(v.registration || "Registration pending")}</span>${btn("Edit", `vehicle:${v.id}`)}</li>`).join("") || "<li>No vehicles yet.</li>"}</ul><h3 class="detail-title">Recent job cards (latest 20)</h3><ul class="detail-list">${jobs.data.map((j) => `<li><span>${e(j.reference)} · ${e(j.status.replaceAll("_", " "))}</span>${btn("Open", `job:${j.id}`)}</li>`).join("") || "<li>No jobs yet.</li>"}</ul><h3 class="detail-title">Recent invoices (latest 20)</h3><ul class="detail-list">${invoices.data.map((i) => `<li><span>${e(i.number || "Draft")} · ${money(i.total_paise)} · ${e(i.status)}</span>${btn("Open", `invoice:${i.id}`)}</li>`).join("") || "<li>No invoices yet.</li>"}</ul>`,
  );
  dialog.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onclick = () => {
        const [a, v] = b.dataset.action.split(":");
        if (a === "edit") editCustomer(c);
        else if (a === "vehicle")
          editVehicle(
            c,
            vehicles.data.find((x) => x.id === v),
          );
        else action(b.dataset.action);
      }),
  );
}
function editVehicle(customer, row = {}) {
  formModal(
    "Vehicle · " + customer.name,
    `<div class="grid">${field("make", "Brand", row.make, "text", 'maxlength="60"')}${field("model", "Model", row.model, "text", 'required maxlength="80"')}${field("registration", "Registration (optional)", row.registration, "text", 'maxlength="20" pattern="[A-Z0-9 -]{3,20}"')}${field("year", "Year (optional)", row.year, "number", 'min="1950" max="2100"')}${dropdown("fuel", "Fuel", ["petrol", "diesel", "cng", "electric", "hybrid", "other"], row.fuel || "other")}${area("notes", "Vehicle notes", row.notes, 1000)}</div>`,
    (data) =>
      write("vehicles", row, {
        ...data,
        customer_id: customer.id,
        registration: data.registration.trim().toUpperCase() || null,
        year: data.year ? Number(data.year) : null,
      }),
  );
}
function bookingFields(row) {
  return `<div class="grid">${field("name", "Customer name", row.name, "text", 'required minlength="2" maxlength="120"')}${field("mobile", "Mobile number", row.mobile, "tel", 'required pattern="[6-9][0-9]{9}" maxlength="10"')}${field("make", "Brand", row.make, "text", 'maxlength="60"')}${field("model", "Car model", row.model, "text", 'required maxlength="80"')}${field("registration", "Registration (optional)", row.registration, "text", 'maxlength="20" pattern="[A-Z0-9 -]{3,20}"')}${dropdown("source", "Enquiry source", ["call", "whatsapp", "walk_in"], row.source || "call")}${dropdown("contact_method", "Preferred contact", ["call", "whatsapp"], row.contact_method || "whatsapp")}${field("preferred_date", "Preferred date", row.preferred_date, "date")}${field("preferred_time", "Preferred time", row.preferred_time, "text", 'maxlength="60"')}${dropdown("status", "Status", statuses.bookings, row.status || "new")}${area("services", "Requested services · one per line", (row.services || []).join("\n"), 2000)}${area("notes", "Enquiry notes", row.notes, 3000)}</div>`;
}
function editBooking(row = {}) {
  formModal(
    row.id ? "Edit enquiry" : "Add enquiry",
    bookingFields(row),
    (data) =>
      write("bookings", row, {
        ...data,
        source: row.source === "website" ? "website" : data.source,
        registration: data.registration.trim().toUpperCase() || null,
        preferred_date: data.preferred_date || null,
        services: data.services
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
  );
}
async function bookingDetail(id) {
  const generation = epoch,
    b = await select("admin_bookings", id);
  if (!owner || generation !== epoch) return;
  modal(
    b.reference,
    `<div class="actions">${badge(b.status)}${btn("Edit enquiry", "edit")}${btn(b.job_id ? "Open job card" : "Create job card", "convert", "primary")}</div><h3 class="detail-title">Customer & vehicle</h3><p><strong>${e(b.name)}</strong> · ${e(b.mobile)}<br>${e(b.make)} ${e(b.model)} · ${e(b.registration || "Registration pending")}</p><p class="small muted">${e(b.source)} enquiry · Contact by ${e(b.contact_method)} · ${e(b.preferred_date || "Date to confirm")} ${e(b.preferred_time)}</p><h3 class="detail-title">Requested services</h3><p>${b.services.map(e).join(", ") || "To confirm"}</p><p class="small">${e(b.notes)}</p>${b.pickup ? `<div class="notice">Pickup requested: ${e(b.address)} · ${e(b.pin)}</div>` : ""}${b.estimate_text ? `<p class="small muted">Customer estimate: ${e(b.estimate_text)}. Confirm pricing before work.</p>` : ""}${errorBox}`,
  );
  dialog.querySelector("[data-action=edit]").onclick = () => editBooking(b);
  dialog.querySelector("[data-action=convert]").onclick = async (event) => {
    event.target.disabled = true;
    try {
      const jid = b.job_id || (await rpc("booking_to_job", { p_booking: id }));
      await jobDetail(jid);
    } catch (err) {
      dialog.querySelector(".form-error").textContent = message(err);
      event.target.disabled = false;
    }
  };
}
async function customerPicker(form, current, vehicle) {
  const input = form.querySelector("[data-customer-search]"),
    selectNode = form.elements.customer_id,
    vehicleNode = form.elements.vehicle_id;
  let ticket = 0,
    timer;
  const loadVehicles = async (id, selected = "") => {
    const n = ++ticket;
    const result = id
      ? check(
          await client
            .from("vehicles")
            .select("*")
            .eq("customer_id", id)
            .order("created_at", { ascending: false })
            .limit(100),
        )
      : [];
    if (!owner || n !== ticket) return;
    vehicleNode.innerHTML = opts(
      [
        ["", "No vehicle selected"],
        ...result.map((v) => [
          v.id,
          `${v.make} ${v.model} · ${v.registration || "No registration"}`,
        ]),
      ],
      selected,
    );
  };
  const loadCustomers = async (text = "") => {
    let query = client
      .from("admin_customers")
      .select("id,name,mobile")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(20);
    if (text)
      query = query.ilike(
        "search_text",
        `%${text.replace(/[\\%_]/g, "\\$&")}%`,
      );
    const result = check(await query);
    if (!owner || !form.isConnected) return;
    selectNode.innerHTML = opts(
      [
        ["", "Select a customer"],
        ...result.map((c) => [c.id, `${c.name} · ${c.mobile}`]),
      ],
      current,
    );
    if (current && !result.some((c) => c.id === current)) {
      const c = await select("customers", current);
      const option = new Option(`${c.name} · ${c.mobile}`, c.id, true, true);
      selectNode.add(option);
    }
  };
  try {
    await loadCustomers();
    await loadVehicles(current, vehicle);
  } catch (err) {
    form.querySelector(".form-error").textContent = message(err);
  }
  input.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(
      () =>
        loadCustomers(input.value.trim()).catch((err) => toast(message(err))),
      250,
    );
  };
  selectNode.onchange = () => {
    current = selectNode.value;
    loadVehicles(current).catch((err) => toast(message(err)));
  };
}
const pickerHtml = () =>
  `<label class="picker full">Find customer<input type="search" data-customer-search placeholder="Search name, mobile or registration" maxlength="100"><small>Shows up to 20 matches. Search to find older customers.</small></label><label>Customer<select name="customer_id" required><option value="">Select a customer</option></select></label><label>Vehicle<select name="vehicle_id"><option value="">No vehicle selected</option></select></label>`;
function editJob(row = {}) {
  const form = formModal(
    row.id ? "Edit job card" : "Create job card",
    `<div class="grid">${pickerHtml()}${dropdown("status", "Work status", statuses.jobs, row.status || "new")}${dropdown("approval", "Customer approval", ["pending", "approved", "declined"], row.approval || "pending")}${field("quote", "Approved / proposed quote (₹)", row.quote_paise == null ? "" : rupees(row.quote_paise), "number", 'min="0" max="100000000" step="0.01"')}${field("target_date", "Target date", row.target_date, "date")}${area("approval_note", "Approval details · date, call/message reference", row.approval_note, 1000)}${area("services", "Services · one per line", (row.services || []).join("\n"), 2000)}${area("notes", "Inspection & work notes", row.notes, 5000)}</div><div><h3 class="detail-title">Work checklist</h3><div class="tasks"></div>${btn("+ Add task", "task")}</div><div class="notice">Only mark approval after the customer agrees. Approval is required before work status becomes “in progress”.</div>`,
    (data, f) => {
      const tasks = [...f.querySelectorAll(".task-row")].map((n) => ({
        description: n.querySelector("[type=text]").value.trim(),
        done: n.querySelector("[type=checkbox]").checked,
      }));
      const { quote, ...values } = data;
      return write("jobs", row, {
        ...values,
        vehicle_id: data.vehicle_id || null,
        quote_paise: quote === "" ? null : paise(quote),
        target_date: data.target_date || null,
        services: data.services
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        tasks,
      });
    },
  );
  function addTask(t = {}) {
    const div = document.createElement("div");
    div.className = "task-row";
    div.innerHTML = `<input type="checkbox" aria-label="Task completed" ${t.done ? "checked" : ""}><input type="text" aria-label="Task description" required maxlength="200" value="${e(t.description)}"><button type="button" aria-label="Remove task">×</button>`;
    div.querySelector("button").onclick = () => div.remove();
    form.querySelector(".tasks").append(div);
  }
  (row.tasks || []).forEach(addTask);
  form.querySelector("[data-action=task]").onclick = () => {
    if (form.querySelectorAll(".task-row").length < 50) addTask();
  };
  customerPicker(form, row.customer_id, row.vehicle_id);
}
async function jobDetail(id) {
  const generation = epoch,
    [j, files] = await Promise.all([
      select("admin_jobs", id),
      client
        .from("job_files")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: false }),
    ]);
  check(files);
  if (!owner || generation !== epoch) return;
  modal(
    j.reference,
    `<div class="actions">${badge(j.status)}${badge(j.approval)}${btn("Edit job", "edit")}${btn("Draft invoice", "bill", "primary")}</div><h3 class="detail-title">Customer & vehicle</h3><p><strong>${e(j.customer_name)}</strong> · ${e(j.mobile)}<br>${e(j.make)} ${e(j.model)} · ${e(j.registration || "No registration")}</p><p class="small">${j.services.map(e).join(", ")}</p><div class="notice">Quote: ${j.quote_paise == null ? "Not entered" : money(j.quote_paise)} · Approval: ${e(j.approval)}<br>${e(j.approval_note || "No approval details recorded.")}</div><h3 class="detail-title">Work checklist</h3><ul class="detail-list">${j.tasks.map((t) => `<li>${t.done ? "✓" : "○"} ${e(t.description)}</li>`).join("") || "<li>No tasks added.</li>"}</ul><h3 class="detail-title">Inspection & work notes</h3><p class="small" style="white-space:pre-wrap">${e(j.notes || "No notes.")}</p><h3 class="detail-title">Private job files</h3><ul class="file-list">${files.data.map((f) => `<li><span>${e(f.label)} <small>(${Math.ceil(f.bytes / 1024)} KB)</small></span>${btn("Download", `file:${f.id}`)}</li>`).join("") || '<li class="small muted">No files yet.</li>'}</ul><label>Add private photo or PDF (max 4 MB)<input type="file" id="upload" accept="image/jpeg,image/png,image/webp,application/pdf"></label>${errorBox}`,
  );
  dialog.querySelector("[data-action=edit]").onclick = () => editJob(j);
  dialog.querySelector("[data-action=bill]").onclick = () =>
    editInvoice({
      customer_id: j.customer_id,
      vehicle_id: j.vehicle_id,
      job_id: j.id,
    });
  dialog.querySelectorAll('[data-action^="file:"]').forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        try {
          const f = files.data.find(
            (f) => f.id === b.dataset.action.split(":")[1],
          );
          const blob = check(
            await client.storage
              .from("garagewala-private")
              .download(f.object_path),
          );
          if (!owner) return;
          const url = URL.createObjectURL(blob),
            a = document.createElement("a");
          a.href = url;
          a.download = f.label;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
          toast(message(err));
        } finally {
          b.disabled = false;
        }
      }),
  );
  dialog.querySelector("#upload").onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const types = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf",
      },
      box = dialog.querySelector(".form-error");
    if (!types[file.type] || file.size < 1 || file.size > 4194304) {
      box.textContent = "Choose a JPEG, PNG, WebP or PDF of up to 4 MB.";
      return;
    }
    event.target.disabled = true;
    const path = `${id}/${crypto.randomUUID()}.${types[file.type]}`;
    try {
      check(
        await client.storage
          .from("garagewala-private")
          .upload(path, file, { contentType: file.type, upsert: false }),
      );
      try {
        check(
          await client
            .from("job_files")
            .insert({
              job_id: id,
              object_path: path,
              label: file.name.slice(0, 160),
              mime: file.type,
              bytes: file.size,
            }),
        );
      } catch (err) {
        await client.storage.from("garagewala-private").remove([path]);
        throw err;
      }
      if (owner) {
        toast("Private file uploaded.");
        await jobDetail(id);
      }
    } catch (err) {
      if (owner) box.textContent = message(err);
    } finally {
      event.target.disabled = false;
    }
  };
}
function editInvoice(row = {}, items = []) {
  const form = formModal(
    row.id ? "Edit draft invoice" : "Draft invoice",
    `<div class="grid">${pickerHtml()}${field("issue_date", "Invoice date", row.issue_date || today(), "date", "required")}${field("due_date", "Due date (optional)", row.due_date, "date")}${dropdown(
      "tax_mode",
      "Tax mode",
      [
        ["none", "No GST"],
        ["cgst_sgst", "CGST + SGST"],
        ["igst", "IGST"],
      ],
      row.tax_mode || "none",
    )}${field("supply_state", "Place of supply · state code", row.supply_state || "23", "text", 'required pattern="(0[1-9]|[12][0-9]|3[0-8])" maxlength="2"')}</div><div class="notice">GST is available only after your registered GSTIN is added in Settings. Enter the correct HSN/SAC and applicable rate for each taxable item.</div><div class="invoice-lines"></div><div class="actions">${btn("+ Add item", "add-line")}</div><div class="totals"><small>Preview · server checks the final amount</small><strong data-total>${money(0)}</strong></div>${area("notes", "Invoice notes", row.notes)}`,
    async (data, f) => {
      await rpc("save_invoice", {
        p_id: row.id || null,
        p_version: row.version || null,
        p_data: {
          ...data,
          vehicle_id: data.vehicle_id || null,
          job_id: row.job_id || null,
        },
        p_items: readLines(f),
      });
    },
    true,
    "Save draft",
  );
  customerPicker(form, row.customer_id, row.vehicle_id);
  const addLine = (item = {}) => {
    const div = document.createElement("div");
    div.className = "invoice-line";
    div.innerHTML = `<label class="description">Item / labour description<input data-item="description" required maxlength="200" value="${e(item.description)}"></label><label>HSN / SAC<input data-item="hsn_sac" maxlength="8" pattern="[0-9]{4,8}" value="${e(item.hsn_sac)}"></label><label>Qty<input data-item="quantity" type="number" required min="0.001" max="1000" step="0.001" value="${e(item.quantity || "1")}"></label><label>Rate (₹)<input data-item="price" type="number" required min="0" max="10000000" step="0.01" value="${rupees(item.unit_price_paise)}"></label><label>Discount (₹)<input data-item="discount" type="number" required min="0" step="0.01" value="${rupees(item.discount_paise)}"></label><label>GST<select data-item="tax_bps">${opts(
      [
        [0, "0%"],
        [500, "5%"],
        [1200, "12%"],
        [1800, "18%"],
        [2800, "28%"],
      ],
      item.tax_bps || 0,
    )}</select></label><button type="button" class="remove" aria-label="Remove invoice item">×</button>`;
    div.querySelector(".remove").onclick = () => {
      div.remove();
      preview();
    };
    form.querySelector(".invoice-lines").append(div);
  };
  const preview = () => {
    try {
      const total = readLines(form).reduce(
        (sum, item) => sum + lineTotal(item, form.elements.tax_mode.value),
        0,
      );
      form.querySelector("[data-total]").textContent = money(total);
    } catch (err) {
      form.querySelector("[data-total]").textContent = "Check amounts";
    }
  };
  (items.length ? items : [{}]).forEach(addLine);
  preview();
  form.addEventListener("input", preview);
  form.querySelector("[data-action=add-line]").onclick = () => {
    if (form.querySelectorAll(".invoice-line").length < 50) addLine();
    preview();
  };
}
function readLines(form) {
  return [...form.querySelectorAll(".invoice-line")].map((div) => {
    const val = (name) => div.querySelector(`[data-item="${name}"]`).value;
    return {
      description: val("description").trim(),
      hsn_sac: val("hsn_sac"),
      quantity: val("quantity"),
      unit_price_paise: paise(val("price")),
      discount_paise: paise(val("discount")),
      tax_bps: Number(val("tax_bps")),
    };
  });
}
async function invoiceDetail(id) {
  const generation = epoch,
    [i, items, payments] = await Promise.all([
      select("admin_invoices", id),
      client
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id)
        .order("position"),
      client
        .from("payments")
        .select("*")
        .eq("invoice_id", id)
        .order("created_at", { ascending: false }),
    ]);
  check(items);
  check(payments);
  if (!owner || generation !== epoch) return;
  modal(
    i.number || "Draft invoice",
    `<div class="actions">${badge(i.status)}${i.status === "draft" ? `${btn("Edit draft", "edit")}${btn("Issue invoice", "issue", "primary")}` : btn("Print / Save PDF", "print")}${i.status === "issued" && i.due_paise > 0 ? btn("+ Record payment", "pay", "primary") : ""}${i.status === "issued" ? btn("Void invoice", "void", "danger") : ""}</div><h3 class="detail-title">Billed to</h3><p><strong>${e(i.buyer_snapshot?.name || i.customer_name)}</strong><br>${e(i.buyer_snapshot?.address || "Billing address is checked when issuing.")}<br>${e(i.number ? i.buyer_snapshot?.mobile : i.mobile)}</p><div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Discount</th><th>Total</th></tr></thead><tbody>${items.data.map((l) => `<tr><td>${e(l.description)}<span class="sub">${e(l.hsn_sac)} ${l.tax_bps ? `GST ${l.tax_bps / 100}%` : ""}</span></td><td>${e(l.quantity)}</td><td>${money(l.unit_price_paise)}</td><td>${money(l.discount_paise)}</td><td>${money(l.total_paise)}</td></tr>`).join("")}</tbody></table></div><div class="totals"><span>Subtotal ${money(i.subtotal_paise)} · Discount ${money(i.discount_paise)}<br><small>CGST ${money(i.cgst_paise)} · SGST ${money(i.sgst_paise)} · IGST ${money(i.igst_paise)}</small></span><strong>${money(i.total_paise)}</strong></div>${i.status === "issued" ? `<div class="notice">Paid ${money(i.paid_paise)} · Balance ${money(i.due_paise)} · Due date ${e(i.due_date || "Not set")}</div>` : ""}${i.status === "void" ? `<div class="error">Voided: ${e(i.void_reason)}</div>` : ""}<p class="small">${e(i.notes)}</p><h3 class="detail-title">Payment history</h3><ul class="detail-list">${payments.data.map((p) => `<li><span>${e(p.paid_on)} · ${e(p.method)} · ${money(p.amount_paise)}</span>${badge(p.voided_at ? "reversed" : "active")}</li>`).join("") || "<li>No payments recorded.</li>"}</ul>${errorBox}`,
    true,
  );
  dialog.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onclick = async () => {
        const a = b.dataset.action;
        if (a === "edit") return editInvoice(i, items.data);
        if (a === "print") return printInvoice(i, items.data, payments.data);
        if (a === "pay") return paymentForm(i);
        if (a === "void")
          return reasonForm(
            "Void invoice",
            "Use this for an incorrect invoice with no active payments. The invoice number stays in your records.",
            (reason) => rpc("void_invoice", { p_id: id, p_reason: reason }),
          );
        if (a === "issue") {
          if (
            !confirm(
              "Issue this invoice? Its number, customer details and amounts will be fixed.",
            )
          )
            return;
          b.disabled = true;
          try {
            await rpc("issue_invoice", { p_id: id, p_version: i.version });
            toast("Invoice issued.");
            await invoiceDetail(id);
          } catch (err) {
            if (owner)
              dialog.querySelector(".form-error").textContent = message(err);
            b.disabled = false;
          }
        }
      }),
  );
}
function paymentForm(i) {
  let signature = "",
    request;
  formModal(
    "Record payment",
    `<div class="notice">${e(i.number)} · ${e(i.customer_name)} · Balance ${money(i.due_paise)}<br>Enter a payment you have actually received. This does not charge the customer.</div><div class="grid">${field("amount", "Received amount (₹)", rupees(i.due_paise), "number", `required min="0.01" max="${rupees(i.due_paise)}" step="0.01"`)}${dropdown("method", "Payment method", ["cash", "upi", "bank", "card", "other"], "cash")}${field("paid_on", "Received on", today(), "date", `required max="${today()}"`)}${field("reference", "Transaction reference (optional)", "", "text", 'maxlength="160"')}${area("note", "Payment notes", "", 1000)}</div>`,
    async (data) => {
      const next = JSON.stringify(data);
      if (signature !== next) {
        signature = next;
        request = crypto.randomUUID();
      }
      await rpc("record_payment", {
        p_invoice: i.id,
        p_request: request,
        p_amount: paise(data.amount),
        p_method: data.method,
        p_reference: data.reference,
        p_date: data.paid_on,
        p_note: data.note,
      });
    },
    false,
    "Record received payment",
  );
}
function reasonForm(title, note, save) {
  formModal(
    title,
    `<div class="notice">${e(note)}</div>${area("reason", "Reason (required)")}`,
    (data) => {
      if (data.reason.trim().length < 5)
        throw new Error("Enter a reason of at least five characters.");
      return save(data.reason.trim());
    },
    false,
    title,
  );
}
function settingsPage(content, p) {
  const workshopAddress = window.GW_WORKSHOP?.addressText || "";
  const workshopAddressCard = workshopAddress
    ? `<div class="notice full"><strong>Workshop address</strong><p>${e(workshopAddress)}</p><button type="button" class="btn" data-use-workshop-address>Use workshop address</button><p class="small">Copy this into the billing field, then check your billing details and save.</p></div>`
    : "";
  content.innerHTML = `<div class="page-head"><div><p class="eyebrow">Invoice identity</p><h1>Garage settings</h1><p>Use your legal billing details. These are separate from public website content.</p></div></div><section class="panel"><form class="fields" id="profile"><fieldset class="fields"><div class="grid">${field("invoice_name", "Invoice / business name", p.invoice_name, "text", 'required minlength="2" maxlength="120"')}${field("phone", "Business mobile", p.phone, "tel", 'required pattern="[6-9][0-9]{9}" maxlength="10"')}${area("address", "Full legal billing address", p.address, 600)}${workshopAddressCard}${field("state_code", "State code (MP = 23)", p.state_code, "text", 'required pattern="(0[1-9]|[12][0-9]|3[0-8])" maxlength="2"')}${field("gstin", "GSTIN · registered business only", p.gstin, "text", 'maxlength="15" pattern="[0-9A-Z]{15}"')}${field("invoice_prefix", "Invoice prefix", p.invoice_prefix, "text", 'required pattern="[A-Z0-9-]{1,8}" maxlength="8"')}${area("invoice_footer", "Invoice footer", p.invoice_footer, 500)}<label class="check full"><input type="checkbox" name="billing_ready" ${p.billing_ready ? "checked" : ""}>I have checked the billing name, address and tax registration details.</label></div><div class="notice">Leave GSTIN empty if you are not GST registered. No GST is the default. Invoice numbers follow the Indian financial year; issued details are saved as a snapshot.</div>${errorBox}<div class="form-actions"><button class="btn primary">Save settings</button></div></fieldset></form></section><section class="panel"><h2>Privacy & access</h2><p class="small muted">Only accounts listed as owners in the database can access records. There is no public sign-up. Your session is kept in memory and signs out after 20 minutes of inactivity. Reloading requires a fresh login.</p><p class="small muted">Use Supabase’s dashboard to manage owners and exports. Follow the backup and account recovery steps in the setup guide.</p></section>`;
  const form = content.querySelector("#profile");
  content.querySelector("[data-use-workshop-address]")?.addEventListener("click", () => {
    form.elements.address.value = workshopAddress;
    form.elements.billing_ready.checked = false;
    form.elements.address.focus();
  });
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form)),
      fs = form.querySelector("fieldset");
    fs.disabled = true;
    try {
      await update("garage_profile", p, {
        ...data,
        gstin: data.gstin.trim() || null,
        billing_ready: data.billing_ready === "on",
      });
      if (owner) {
        toast("Invoice settings saved.");
        await render();
      }
    } catch (err) {
      form.querySelector(".form-error").textContent = message(err);
    } finally {
      fs.disabled = false;
    }
  };
}
async function authenticate(session, recovery = false) {
  if (!session) {
    lock();
    authPage();
    return;
  }
  const generation = ++epoch;
  user = session.user;
  try {
    const allowed = await rpc("admin_access");
    if (generation !== epoch) return;
    if (!allowed) {
      await client.auth.signOut({ scope: "local" });
      lock();
      authPage(
        "This account does not have owner access. Contact the project owner.",
      );
      return;
    }
    owner = true;
    touch();
    if (recovery) {
      shell();
      formModal(
        "Set a new password",
        `${field("password", "New password", "", "password", 'required minlength="12" maxlength="128" autocomplete="new-password"')}${field("confirm", "Confirm password", "", "password", 'required minlength="12" maxlength="128" autocomplete="new-password"')}`,
        async (data) => {
          if (data.password !== data.confirm)
            throw new Error("Passwords do not match.");
          check(await client.auth.updateUser({ password: data.password }));
          recoveryRequested = false;
        },
      );
    } else await render();
  } catch (err) {
    if (generation === epoch) {
      lock();
      authPage(message(err));
    }
  }
}
if (!settings) authPage();
else {
  client = createClient(settings.url, settings.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          referrerPolicy: "no-referrer",
        }),
    },
  });
  authPage();
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      lock();
      authPage();
    } else if (
      event === "SIGNED_IN" ||
      event === "PASSWORD_RECOVERY" ||
      event === "INITIAL_SESSION"
    ) {
      setTimeout(() => authenticate(session, event === "PASSWORD_RECOVERY" || recoveryRequested), 0);
    } else if (event === "TOKEN_REFRESHED" && !session) {
      lock();
      authPage("Your session expired.");
    }
  });
}
