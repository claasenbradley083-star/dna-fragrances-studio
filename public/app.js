import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const $ = (id) => document.getElementById(id);
const configReady = window.DNA_SUPABASE_URL?.startsWith("https://")
  && !window.DNA_SUPABASE_URL.includes("PASTE_")
  && window.DNA_SUPABASE_ANON_KEY
  && !window.DNA_SUPABASE_ANON_KEY.includes("PASTE_");
let supabase = null;
let currentUser = null;

const today = new Date().toLocaleDateString("en-CA");
$("saleDate").value = today;
$("expenseDate").value = today;

function msg(id, text, error=false) {
  const el = $(id);
  if (el) { el.textContent = text; el.classList.toggle("error", error); }
}
function money(v) {
  return new Intl.NumberFormat("en-ZA", { style:"currency", currency:"ZAR" }).format(Number(v || 0));
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function showLoggedIn(user) {
  currentUser = user;
  $("authPanel").classList.add("hidden");
  $("appPanel").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  $("signedInAs").textContent = `Aangemeld as ${user.email}`;
  loadAll();
}
function showLoggedOut() {
  currentUser = null;
  $("authPanel").classList.remove("hidden");
  $("appPanel").classList.add("hidden");
  $("signOutBtn").classList.add("hidden");
}
if (!configReady) {
  $("configNotice").classList.remove("hidden");
  msg("authMessage", "Voltooi eers public/config.js met jou Supabase Project URL en publishable/anon key.", true);
} else {
  $("configNotice").classList.add("hidden");
  supabase = createClient(window.DNA_SUPABASE_URL, window.DNA_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) msg("authMessage", error.message, true);
    if (data.session?.user) showLoggedIn(data.session.user);
  });
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabase) return;
  msg("authMessage", "Besig om aan te meld…");
  const { error } = await supabase.auth.signInWithPassword({
    email: $("email").value.trim(), password: $("password").value
  });
  msg("authMessage", error ? error.message : "Aanmelding suksesvol.", !!error);
});
$("signOutBtn").addEventListener("click", async () => {
  if (supabase) await supabase.auth.signOut();
  showLoggedOut();
});
$("refreshBtn").addEventListener("click", loadAll);

document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
  $(`${btn.dataset.tab}Panel`).classList.remove("hidden");
}));

async function list(table, order="created_at") {
  const { data, error } = await supabase.from(table).select("*").order(order, { ascending:false });
  if (error) throw error;
  return data || [];
}
async function loadAll() {
  if (!supabase || !currentUser) return;
  msg("appMessage", "Laai data…");
  try {
    const [products, suppliers, sales, expenses] = await Promise.all([
      list("products"), list("suppliers"), list("sales", "sale_date"), list("expenses", "expense_date")
    ]);
    $("productCount").textContent = products.length;
    $("supplierCount").textContent = suppliers.length;
    $("salesCount").textContent = sales.length;
    $("expenseCount").textContent = expenses.length;
    renderProducts(products); renderSuppliers(suppliers); renderSales(sales); renderExpenses(expenses);
    msg("appMessage", "Data is op datum.");
  } catch (error) {
    msg("appMessage", `Kon nie data laai nie: ${error.message}. Kontroleer dat die SQL-skrip uitgevoer is en RLS-beleide aktief is.`, true);
  }
}
function renderProducts(rows) {
  $("productsTable").innerHTML = rows.length ? rows.map(r => `<tr>
    <td>${esc(r.name)}${r.fragrance ? `<small>${esc(r.fragrance)}</small>` : ""}</td><td>${esc(r.size_ml ?? "—")} ml</td><td>${esc(r.grade || "—")}</td>
    <td>${money(r.unit_cost)}</td><td>${money(r.sale_price)}</td><td>${money(Number(r.sale_price||0)-Number(r.unit_cost||0))}</td><td>${esc(r.stock_qty ?? 0)}</td>
    <td><button class="danger small" data-delete="products" data-id="${r.id}">Verwyder</button></td></tr>`).join("") : `<tr><td colspan="8">Nog geen produkte nie.</td></tr>`;
}
function renderSuppliers(rows) {
  $("suppliersTable").innerHTML = rows.length ? rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.contact_name||"—")}</td><td>${esc(r.email||"—")}</td><td>${esc(r.phone||"—")}</td><td>${esc(r.notes||"—")}</td><td><button class="danger small" data-delete="suppliers" data-id="${r.id}">Verwyder</button></td></tr>`).join("") : `<tr><td colspan="6">Nog geen verskaffers nie.</td></tr>`;
}
function renderSales(rows) {
  $("salesTable").innerHTML = rows.length ? rows.map(r => `<tr><td>${esc(r.sale_date)}</td><td>${esc(r.customer_name||"—")}</td><td>${esc(r.description)}</td><td>${esc(r.quantity)}</td><td>${money(r.total_amount)}</td><td>${esc(r.status||"Nuuts")}</td><td><button class="danger small" data-delete="sales" data-id="${r.id}">Verwyder</button></td></tr>`).join("") : `<tr><td colspan="7">Nog geen verkope nie.</td></tr>`;
}
function renderExpenses(rows) {
  $("expensesTable").innerHTML = rows.length ? rows.map(r => `<tr><td>${esc(r.expense_date)}</td><td>${esc(r.category)}</td><td>${esc(r.description||"—")}</td><td>${money(r.amount)}</td><td><button class="danger small" data-delete="expenses" data-id="${r.id}">Verwyder</button></td></tr>`).join("") : `<tr><td colspan="5">Nog geen uitgawes nie.</td></tr>`;
}
async function insertRow(table, payload, messageId) {
  if (!supabase || !currentUser) return;
  const { error } = await supabase.from(table).insert({ ...payload, user_id: currentUser.id });
  if (error) { msg(messageId, error.message, true); return; }
  msg(messageId, "Gestoor.");
  await loadAll();
}
$("productForm").addEventListener("submit", async e => {
  e.preventDefault();
  await insertRow("products", {
    name:$("productName").value.trim(), fragrance:$("productBrand").value.trim()||null,
    size_ml:Number($("productSize").value||0), grade:$("productGrade").value,
    unit_cost:Number($("productCost").value||0), sale_price:Number($("productPrice").value||0),
    stock_qty:Number($("productStock").value||0), notes:$("productNotes").value.trim()||null
  }, "productMessage");
  if (!$("productMessage").classList.contains("error")) e.target.reset();
  $("productSize").value="50"; $("productCost").value="0"; $("productPrice").value="0"; $("productStock").value="0";
});
$("supplierForm").addEventListener("submit", async e => {
  e.preventDefault();
  await insertRow("suppliers", { name:$("supplierName").value.trim(), contact_name:$("supplierContact").value.trim()||null,
    email:$("supplierEmail").value.trim()||null, phone:$("supplierPhone").value.trim()||null, notes:$("supplierNotes").value.trim()||null }, "supplierMessage");
  if (!$("supplierMessage").classList.contains("error")) e.target.reset();
});
$("saleForm").addEventListener("submit", async e => {
  e.preventDefault();
  await insertRow("sales", { sale_date:$("saleDate").value, customer_name:$("saleCustomer").value.trim()||null,
    description:$("saleDescription").value.trim(), quantity:Number($("saleQty").value), total_amount:Number($("saleTotal").value),
    status:$("saleStatus").value }, "saleMessage");
  if (!$("saleMessage").classList.contains("error")) { e.target.reset(); $("saleDate").value=today; $("saleQty").value="1"; }
});
$("expenseForm").addEventListener("submit", async e => {
  e.preventDefault();
  await insertRow("expenses", { expense_date:$("expenseDate").value, category:$("expenseCategory").value.trim(),
    description:$("expenseDescription").value.trim()||null, amount:Number($("expenseAmount").value) }, "expenseMessage");
  if (!$("expenseMessage").classList.contains("error")) { e.target.reset(); $("expenseDate").value=today; }
});
document.addEventListener("click", async e => {
  const btn = e.target.closest("[data-delete]");
  if (!btn || !supabase) return;
  if (!confirm("Is jy seker jy wil hierdie rekord permanent verwyder?")) return;
  const { error } = await supabase.from(btn.dataset.delete).delete().eq("id", btn.dataset.id);
  if (error) msg("appMessage", error.message, true); else await loadAll();
});
