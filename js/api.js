// === api.js (modo Flask demo, sin base de datos) ===
// Lee datos desde los endpoints del servidor local (app.py)

export const slugify = (s) => s
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

export const TOKEN = "token-secreto-maou";

// -----------------------------------------------------
// PERSONAJES
// -----------------------------------------------------
export async function listPersonajes({
  q = "",
  elemento = "",
  rol = "",
  order = "recientes",
  page = 1,
  pageSize = 12
}) {
  const res = await fetch("/api/personajes");
  if (!res.ok) throw new Error("No se pudo obtener la lista de personajes");
  const all = await res.json();

  let rows = Array.isArray(all) ? all.slice() : [];

  // Filtros
  if (q)
    rows = rows.filter((r) =>
      (r.nombre || "").toLowerCase().includes(q.toLowerCase())
    );
  if (elemento) rows = rows.filter((r) => r.elemento === elemento);
  if (rol)
    rows = rows.filter(
      (r) => (r.rol || "").toLowerCase() === rol.toLowerCase()
    );

  // Orden
  if (order === "nombre")
    rows.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  else if (order === "rareza")
    rows.sort((a, b) => (a.rareza || "").localeCompare(b.rareza || ""));
  else
    rows.sort(
      (a, b) =>
        new Date(b.actualizado_en || 0) - new Date(a.actualizado_en || 0)
    );

  const total = rows.length;
  const from = (page - 1) * pageSize,
    to = from + pageSize;
  return { rows: rows.slice(from, to), total };
}

// -----------------------------------------------------
// DETALLE DE PERSONAJE
// -----------------------------------------------------
export async function getPersonajeBySlug(slug) {
  const res = await fetch(`/api/personajes/${slug}`);
  if (!res.ok) throw new Error("Personaje no encontrado");
  return res.json();
}

// -----------------------------------------------------
// HABILIDADES (por slug)
// -----------------------------------------------------
export async function listHabilidades(slug) {
  const res = await fetch(`/api/habilidades/${slug}`);
  if (!res.ok) throw new Error("No se pudieron cargar las habilidades");
  return res.json();
}

// -----------------------------------------------------
// Funciones que todavía dependen de Supabase (placeholder)
// -----------------------------------------------------
export async function upsertPersonaje(payload) {
  const res = await fetch("/api/personajes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ADMIN-TOKEN": TOKEN,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadImage(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // base64 temporal
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function saveHabilidad(h) {
  const slug = new URLSearchParams(location.search).get("slug");
  const res = await fetch(`/api/habilidades/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ADMIN-TOKEN": TOKEN,
    },
    body: JSON.stringify(h),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function deleteHabilidad(id) {
  const slug = new URLSearchParams(location.search).get("slug");
  const res = await fetch(`/api/habilidades/${encodeURIComponent(slug)}/${id}`, {
    method: "DELETE",
    headers: { "X-ADMIN-TOKEN": TOKEN },
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// -----------------------------------------------------
// AUTENTICACIÓN DEMO (solo muestra/oculta interfaz)
// -----------------------------------------------------
export async function signIn(email, password) {
  localStorage.setItem("demo_user", JSON.stringify({ email }));
  return { data: { user: { email } } };
}

export async function signOut() {
  localStorage.removeItem("demo_user");
}

export async function currentUser() {
  const u = JSON.parse(localStorage.getItem("demo_user") || "null");
  return u ? { email: u.email } : null;
}
