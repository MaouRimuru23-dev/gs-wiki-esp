// === api.js (GitHub Pages + móvil robusto) ===

// 1) Ruta universal a /data (absoluta en Pages, relativa en local)
const DATA_PATH = location.hostname.endsWith('github.io')
  ? 'https://maourimuru23-dev.github.io/gs-wiki-esp/data'
  : './data';

// 2) Romper caché en móvil (iOS/Android cachean ES modules y fetch agresivamente)
const NO_CACHE = `?_=${Date.now()}`;
// ==== Overlay local para PERSONAJES ====
const LS_PJS = 'gs_personajes_overrides';
const _readPjs = () => { try { return JSON.parse(localStorage.getItem(LS_PJS) || '[]'); } catch { return []; } };
const _writePjs = (arr) => localStorage.setItem(LS_PJS, JSON.stringify(arr));
const _mergePersonajes = (base, overlays) => {
  const map = new Map();
  (base || []).forEach(p => map.set(p.slug, p));
  (overlays || []).forEach(p => map.set(p.slug, { ...(map.get(p.slug)||{}), ...p }));
  return Array.from(map.values());
};
// Overlay local para habilidades durante pruebas en Pages
const LS_HABS = 'gs_habs_overrides';
const _readHabs = () => {
  try { return JSON.parse(localStorage.getItem(LS_HABS) || '{}'); }
  catch { return {}; }
};
const _writeHabs = (obj) => localStorage.setItem(LS_HABS, JSON.stringify(obj));
const IS_LOCAL_API = location.hostname === '127.0.0.1' || location.hostname === 'localhost';

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
export async function listPersonajes({ q="", elemento="", rol="", order="recientes", page=1, pageSize=12 }){
  let rows = [];
  if (IS_LOCAL_API) {
    const res = await fetch('/api/personajes', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo obtener /api/personajes');
    const all = await res.json();
    rows = Array.isArray(all) ? all : [];
  } else {
    const url = `${DATA_PATH}/personajes.json${NO_CACHE}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`No se pudo obtener personajes.json (${res.status})`);
    const all = await res.json();
    rows = _mergePersonajes(Array.isArray(all) ? all : [], _readPjs());
  }

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
  if (IS_LOCAL_API) {
    const res = await fetch(`/api/personajes/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Personaje no encontrado');
    return await res.json();
  } else {
    const url = `${DATA_PATH}/personajes.json${NO_CACHE}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('personajes.json no encontrado');
    const all = await res.json();
    const merged = _mergePersonajes(Array.isArray(all) ? all : [], _readPjs());
    const p = merged.find(r => r.slug === slug);
    if (!p) throw new Error('Personaje no encontrado');
    return p;
  }
}

// -----------------------------------------------------
// HABILIDADES
// -----------------------------------------------------
export async function listHabilidades(slug) {
  if (IS_LOCAL_API) {
    const res = await fetch(`/api/habilidades/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const lista = await res.json();
    return Array.isArray(lista) ? lista.sort((a,b)=>(a.orden||0)-(b.orden||0)) : [];
  } else {
    const url = `${DATA_PATH}/habilidades.json${NO_CACHE}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudieron cargar habilidades.json');
    const all = await res.json();
    const base = all[slug] || [];
    const overlay = _readHabs()[slug] || [];
    const map = new Map();
    [...base, ...overlay].forEach(h => {
      const key = (h.id != null) ? `id:${h.id}` : `${(h.tipo||'').toLowerCase()}|${h.nombre||''}`;
      map.set(key, h);
    });
    return Array.from(map.values()).sort((a,b)=>(a.orden||0)-(b.orden||0));
  }
}

// -----------------------------------------------------
// Funciones demo (sin backend en Pages)
// -----------------------------------------------------
export async function upsertPersonaje(p){
  if (IS_LOCAL_API) {
    const res = await fetch('/api/personajes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ADMIN-TOKEN': TOKEN
      },
      body: JSON.stringify(p)
    });
    if (!res.ok) throw new Error('No se pudo guardar el personaje');
    return await res.json();
  }

  // Pages (sin backend): overlay local
  const obj = { ...p, actualizado_en: new Date().toISOString() };
  const arr = _readPjs();
  const i = arr.findIndex(x => x.slug === obj.slug);
  if (i >= 0) arr[i] = { ...arr[i], ...obj };
  else arr.push(obj);
  _writePjs(arr);
  console.log('upsert (overlay LS):', obj);
  return obj;
}


export async function uploadImage(f){ return null; }
export async function signIn(email){ localStorage.setItem("demo_user", email); return { data:{ user:{ email } } }; }
export async function signOut(){ localStorage.removeItem("demo_user"); }
export async function currentUser(){ const u = localStorage.getItem("demo_user"); return u ? { email:u } : null; }
export async function saveHabilidad(h){
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) throw new Error('No hay slug activo en la URL');

  if (IS_LOCAL_API) {
    const res = await fetch(`/api/habilidades/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ADMIN-TOKEN': TOKEN
      },
      body: JSON.stringify(h)
    });
    if (!res.ok) throw new Error('No se pudo guardar habilidad');
    return await res.json();
  }

  // Pages (overlay LS)
  const all = _readHabs();
  const arr = all[slug] || [];
  const out = h.id ? { ...h } : { ...h, id: Date.now() };
  const i = arr.findIndex(x => x.id === out.id);
  if (i >= 0) arr[i] = out; else arr.push(out);
  all[slug] = arr;
  _writeHabs(all);
  return out;
}

export async function deleteHabilidad(id){
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) return false;

  if (IS_LOCAL_API) {
    const res = await fetch(`/api/habilidades/${encodeURIComponent(slug)}/${id}`, {
      method: 'DELETE',
      headers: { 'X-ADMIN-TOKEN': TOKEN }
    });
    if (!res.ok) throw new Error('No se pudo borrar habilidad');
    return await res.json();
  }

  // Pages (overlay LS)
  const all = _readHabs();
  all[slug] = (all[slug]||[]).filter(x => x.id !== id);
  _writeHabs(all);
  return true;
}
