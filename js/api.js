// === api.js (GitHub Pages + móvil robusto) ===

// 1) Ruta universal a /data (absoluta en Pages, relativa en local)
const DATA_PATH = location.hostname.endsWith('github.io')
  ? 'https://maourimuru23-dev.github.io/gs-wiki-esp/data'
  : './data';

// 2) Romper caché en móvil (iOS/Android cachean ES modules y fetch agresivamente)
const NO_CACHE = `?_=${Date.now()}`;

export const TOKEN = "token-secreto-maou";
export const slugify = (s) => s
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

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
  const url = `${DATA_PATH}/personajes.json${NO_CACHE}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo obtener personajes.json (${res.status})`);
  const all = await res.json();

  let rows = Array.isArray(all) ? all.slice() : [];

  if (q) rows = rows.filter(r => (r.nombre || "").toLowerCase().includes(q.toLowerCase()));
  if (elemento) rows = rows.filter(r => r.elemento === elemento);
  if (rol) rows = rows.filter(r => (r.rol || "").toLowerCase() === rol.toLowerCase());

  if (order === "nombre") rows.sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||""));
  else if (order === "rareza") rows.sort((a,b)=>(a.rareza||"").localeCompare(b.rareza||""));
  else rows.sort((a,b)=> new Date(b.actualizado_en||0) - new Date(a.actualizado_en||0));

  const total = rows.length;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  return { rows: rows.slice(from, to), total };
}

// -----------------------------------------------------
// DETALLE DE PERSONAJE
// -----------------------------------------------------
export async function getPersonajeBySlug(slug) {
  const url = `${DATA_PATH}/personajes.json${NO_CACHE}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("personajes.json no encontrado");
  const all = await res.json();
  const p = all.find(r => r.slug === slug);
  if (!p) throw new Error("Personaje no encontrado");
  return p;
}

// -----------------------------------------------------
// HABILIDADES
// -----------------------------------------------------
export async function listHabilidades(slug) {
  const url = `${DATA_PATH}/habilidades.json${NO_CACHE}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudieron cargar habilidades.json");
  const all = await res.json();
  return all[slug] || [];
}

// -----------------------------------------------------
// Funciones demo (sin backend en Pages)
// -----------------------------------------------------
export async function upsertPersonaje(p){ console.log("upsert demo", p); return p; }
export async function uploadImage(f){ return null; }
export async function saveHabilidad(h){ console.log("save hab demo", h); return h; }
export async function deleteHabilidad(id){ console.log("delete hab demo", id); return true; }
export async function signIn(email){ localStorage.setItem("demo_user", email); return { data:{ user:{ email } } }; }
export async function signOut(){ localStorage.removeItem("demo_user"); }
export async function currentUser(){ const u = localStorage.getItem("demo_user"); return u ? { email:u } : null; }
