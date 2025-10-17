// Renderizado básico para index/personaje/admin
import {
  listPersonajes, getPersonajeBySlug, upsertPersonaje, uploadImage,
  signIn, signOut, currentUser,
  listHabilidades, saveHabilidad, deleteHabilidad,
  slugify
} from './api.js';

// Helpers DOM
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ===========================
   THEME toggle
=========================== */
export function initTheme(){
  const btn = $('#themeBtn'); if (!btn) return;
  const root = document.documentElement;
  const saved = localStorage.getItem('theme') || 'light';
  root.setAttribute('data-bs-theme', saved);
  btn.onclick = ()=>{
    const now = root.getAttribute('data-bs-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-bs-theme', now);
    localStorage.setItem('theme', now);
  };
}

/* ===========================
   INDEX: filtros + grid + paginación
=========================== */
export function initIndex(){
  const q = $('#q'), fElem = $('#fElemento'), fRol = $('#fRol'), orden = $('#orden');
  const grid = $('#grid'), pag = $('#paginacion');
  if (!grid) return;

  let state = { page:1, pageSize:12 };

  const card = (r)=>`
    <div class="col">
      <article class="card card-personaje h-100 shadow-sm">
        <img src="${r.portada_url||''}" alt="${r.nombre}" loading="lazy">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h2 class="h6 m-0">${r.nombre}</h2>
            <span class="badge badge-${(r.elemento||'').toLowerCase()}">${r.elemento||''}</span>
          </div>
          <p class="text-body-secondary small mb-2">
            ${r.rareza||''} ${r.rol? '• '+r.rol:''} • ${new Date(r.actualizado_en).toLocaleDateString()}
          </p>
          <a class="stretched-link" href="./Personajes.html?slug=${encodeURIComponent(r.slug)}">Ver ficha</a>
        </div>
      </article>
    </div>`;

  const renderPag = (total)=>{
    const pages = Math.max(1, Math.ceil(total/state.pageSize));
    pag.innerHTML = '';
    const li = (p, label=p, active=p===state.page)=>(
      `<li class="page-item ${active?'active':''}">
         <a class="page-link" href="#" data-p="${p}">${label}</a>
       </li>`
    );
    const items = [];
    items.push(li(Math.max(1,state.page-1), '«'));
    for (let i=1;i<=pages && i<=6;i++) items.push(li(i));
    items.push(li(Math.min(pages,state.page+1), '»'));
    pag.innerHTML = items.join('');
    pag.querySelectorAll('a').forEach(a=>a.onclick=(e)=>{
      e.preventDefault(); state.page = parseInt(a.dataset.p); apply();
    });
  };

  const apply = async ()=>{
    const { rows, total } = await listPersonajes({
      q:q?.value.trim()||'',
      elemento:fElem?.value||'',
      rol:fRol?.value||'',
      order:orden?.value||'recientes',
      page:state.page, pageSize:state.pageSize
    });
    grid.innerHTML = rows.map(card).join('');
    renderPag(total);
  };

  [q,fElem,fRol,orden].forEach(el=>el?.addEventListener('input', ()=>{ state.page=1; apply(); }));
  apply();
}

/* ===========================
   PERSONAJE: carga por slug y render
=========================== */
export async function initPersonaje(){
  const cont = document.querySelector('#detalle-personaje'); if (!cont) return;
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug){ location.href = './index.html'; return; }

  try{
    const p = await getPersonajeBySlug(slug);
    const habs = p.habilidades || (await listHabilidades(p.slug) || []);

    // Particionamos habilidades
    const by = t => habs.find(h => (h.tipo||'').toLowerCase() === t.toLowerCase());
    // Agrupar habilidades por tipo sin limitar
    const grupos = {};
    for (const h of habs) {
      const tipo = (h.tipo || 'Extra').trim();
      if (!grupos[tipo]) grupos[tipo] = [];
      grupos[tipo].push(h);
    }
    
    // Detectar la Skill principal
    const SKILL = grupos['Skill']?.[0] || null;
    
    // Todos los demás tipos excepto Skill → carrusel
    const OTRAS = Object.entries(grupos)
      .filter(([t]) => t !== 'Skill' && t !== 'Passive')
      .map(([tipo, arr]) => ({ tipo, hab: arr[0] }));
    

    const slots = p.slots || [];            // [{tipo:'Físico',nivel:5}, ...]
    const stats = p.stats || {};            // {hp, atk, def, tas_hp, ...}
    const pasivas = p.pasivas || [];        // ["texto...", ...]

    // --- helpers de slots ---
    const norm = s => (s||'').toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"");

    const slotHtml = (s, idx) => {
      const tipos = Array.isArray(s.tipo) ? s.tipo : [s.tipo];
      const first = tipos[0] || '—';
      const claseTipo = {
        'fisico':'ataque', 'ataque':'ataque',
        'magia':'magia',
        'defensa':'defensa',
        'soporte':'soporte','support':'soporte',
        'curacion':'curacion','healer':'curacion'
      }[norm(first)] || 'soporte';

      return `<span class="slot-pill slot-${claseTipo}"
                data-slot-idx="${idx}"
                data-tipos='${JSON.stringify(tipos)}'
                data-nivel="${s.nivel||0}">
                ${first} Lv${s.nivel||0}
              </span>`;
    };


    cont.innerHTML = `
      <header class="personaje-header mb-3">
        <h1 class="h3 mb-1">${p.nombre}
          <span class="badge badge-${(p.elemento||'').toLowerCase()} ms-1">${p.elemento||''}</span>
        </h1>
        <div class="d-flex flex-wrap gap-2 text-body-secondary small">
          ${p.raza ? `<span class="badge-chip badge-race">Raza: ${p.raza}</span>`:''}
          ${p.rol ? `<span class="badge-chip badge-role">Rol: ${p.rol}</span>`:''}
          ${p.rareza ? `<span class="badge-chip badge-rare">Rareza: ${p.rareza}</span>`:''}
          ${p.voz ? `<span class="badge-chip badge-voice">Voz: ${p.voz}</span>`:''}
          <span class="ms-auto">Actualizado: ${new Date(p.actualizado_en||Date.now()).toLocaleString()}</span>
        </div>
      </header>

      <div class="row g-3 align-items-start">
        <!-- Stats (izquierda) -->
        <div class="col-lg-3">
          <div class="card"><div class="card-body">
            <h2 class="h6 mb-3">Stats</h2>
            <table class="table table-sm mb-0">
              <tbody class="small">
                <tr><th>HP</th><td>${stats.hp ?? '-'}</td><td class="text-body-secondary">+${stats.tas_hp ?? 0}</td></tr>
                <tr><th>ATK</th><td>${stats.atk ?? '-'}</td><td class="text-body-secondary">+${stats.tas_atk ?? 0}</td></tr>
                <tr><th>DEF</th><td>${stats.def ?? '-'}</td><td class="text-body-secondary">+${stats.tas_def ?? 0}</td></tr>
              </tbody>
            </table>
          </div></div>
        </div>

        <!-- Arte central -->
        <div class="col-lg-6">
          <div class="card"><div class="card-body">
            <div class="personaje-arte"><img src="${p.portada_url||''}" alt="${p.nombre}"></div>
          </div></div>

          <!-- Slots (sobre las skills) -->
          <div class="card mt-3"><div class="card-body py-2">
            <div class="d-flex align-items-center justify-content-between">
              <h2 class="h6 m-0">Slots</h2>
              ${p.true_weapon ? `<small class="text-body-secondary">True Wpn: ${p.true_weapon}</small>`:''}
            </div>
            <div class="slots-strip mt-2" id="slotsStrip">
              ${slots.length
                ? slots.map((s,i)=>slotHtml(s,i)).join('')
                : '<span class="text-body-secondary small">Sin datos</span>'}
            </div>
            <small class="text-body-secondary">EL CAMBIO DE SLOT SOLO ES EN PERSONAJES ASCEND EN LIMIT BREAK 7</small>
          </div></div>

          <!-- Carrusel de ARTS -->
          <div class="card ability-card mt-3">
          <div class="card-body ability-carousel">
            <div id="artsCarousel" class="carousel slide" data-bs-ride="false">
              ${OTRAS.length ? `
              <div class="carousel-indicators">
                ${OTRAS.map((_,i)=>`
                  <button type="button"
                          data-bs-target="#artsCarousel"
                          data-bs-slide-to="${i}"
                          ${i===0?'class="active" aria-current="true"':''}
                          aria-label="Slide ${i+1}"></button>`).join('')}
              </div>
              <div class="carousel-inner">
                ${OTRAS.map(({tipo, hab},i)=>{
                  const tnorm = tipo.toLowerCase();
                  const clase =
                    tnorm.includes('true') ? 'ability-true' :
                    tnorm.includes('super') ? 'ability-super' :
                    tnorm.includes('cross') ? 'ability-cross' :
                    tnorm.includes('phantom') ? 'ability-phantom' :
                    tnorm.includes('liberation') ? 'ability-liberation' :
                    tnorm.includes('mega') ? 'ability-mega' :
                    'ability-arts';
                  return `
                    <div class="carousel-item ${i===0?'active':''}">
                      <div class="ability-card ${clase} p-2">
                        <div class="ability-title">${tipo} — ${hab.nombre}</div>
                        <div class="text-body">${hab.descripcion||''}</div>
                      </div>
                    </div>`;
                }).join('')}
              </div>
            
              <button class="carousel-control-prev" type="button" data-bs-target="#artsCarousel" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Anterior</span>
              </button>
              <button class="carousel-control-next" type="button" data-bs-target="#artsCarousel" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Siguiente</span>
              </button>
              ` : `<div class="text-body-secondary small px-3 pb-2">Sin habilidades adicionales registradas.</div>`}
            </div>
          </div>
        </div>

          <!-- SKILL fija abajo de habilidades -->
          <div class="skill-stick mt-3">
            <div class="card skill-card my-3">
              <div class="card-body">
                <div class="d-flex align-items-start justify-content-between">
                  <div>
                    <div class="ability-title mb-1">${SKILL? `Skill — ${SKILL.nombre}` : 'Skill'}</div>
                    <div class="text-body">
                      ${SKILL?.descripcion || 'Sin datos'}
                      <div class="ability-bars animate-fill">
                          ${SKILL?.ct ? `
                            <div class="ability-bar bar-ct">
                              <div class="ability-bar-fill" style="width:${Math.min(SKILL.ct*5,100)}%"></div>
                            </div>
                            <small class="text-info">CT ${SKILL.ct}s</small>
                          ` : ''}
                          ${SKILL?.break ? `
                            <div class="ability-bar bar-break">
                              <div class="ability-bar-fill" style="width:${Math.min(SKILL.break/10,100)}%"></div>
                            </div>
                            <small class="text-warning">Break ${SKILL.break}</small>
                          ` : ''}
                        </div> 
                    </div>
                  </div>
                  <span class="badge bg-secondary-subtle text-body small">Siempre abajo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pasivas (derecha) -->
        <div class="col-lg-3">
          <div class="card"><div class="card-body">
            <h2 class="h6">Pasivas</h2>
            ${pasivas.length ? `
              <div class="list-group list-group-flush">
                ${pasivas.map((txt,i)=>`
                  <a class="list-group-item list-group-item-action passive-item" data-bs-toggle="collapse" href="#passive${i}">
                    <i class="bi bi-caret-right-fill me-1"></i> ${txt.split(':')[0]}
                  </a>
                  <div class="collapse text-body-secondary small px-3 pb-2" id="passive${i}">
                    ${txt.includes(':') ? txt.split(':').slice(1).join(':').trim() : txt}
                  </div>
                `).join('')}
              </div>
            ` : `<div class="text-body-secondary">Sin pasivas.</div>`}
          </div></div>
        </div>
      </div>

      <!-- Descripción completa (como Fandom) -->
      ${p.descripcion ? `
      <div class="card mt-3"><div class="card-body">
        <h2 class="h5">Descripción</h2>
        <p class="mb-0">${(p.descripcion||'').replace(/\n/g,'<br>')}</p>
      </div></div>`:''}
    `;

    // Swipe en móvil para el carrusel
    const car = document.getElementById('artsCarousel');
    if (car){
      let startX=0; const bs = bootstrap.Carousel.getOrCreateInstance(car);
      car.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX, {passive:true});
      car.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].screenX - startX;
        if (Math.abs(dx) > 40){ dx<0 ? bs.next() : bs.prev(); }
      }, {passive:true});
    }
    // Alternancia automática para slots con dos tipos (Ascend) — ya con norm en scope
{
  const strip = document.getElementById('slotsStrip');
  strip?.querySelectorAll('.slot-pill').forEach(pill=>{
    const tipos = JSON.parse(pill.dataset.tipos || '[]');
    if (tipos.length <= 1) return;
    let i = 0;
    const nivel = pill.dataset.nivel || '';
    const setTipo = (t) => {
      const key = {
        'fisico':'ataque','ataque':'ataque',
        'magia':'magia','defensa':'defensa',
        'soporte':'soporte','support':'soporte',
        'curacion':'curacion','healer':'curacion'
      }[norm(t)] || 'soporte';
      // quita solo las clases de color y conserva la base
      pill.classList.remove('slot-ataque','slot-magia','slot-defensa','slot-soporte','slot-curacion');
      pill.classList.add('slot-pill', 'slot-' + key);
      pill.textContent = `${t} Lv${nivel}`;
    };
    // arranca mostrando el primero y rota cada 3s
    setTipo(tipos[0]);
    setInterval(()=>{ i = (i+1)%tipos.length; setTipo(tipos[i]); }, 3000);
  });
}
  }catch(err){
    cont.innerHTML = `<div class="alert alert-danger">${err.message||err}</div>`;
  }
}

/* ===========================
   ADMIN: login + formulario personaje + habilidades
=========================== */

export function initAdmin(){
  const loginBox = $('#loginBox'); const form = $('#formPersonaje');
  const formHab = $('#formHabilidad'); const listHab = $('#listHabilidades');
  const inputs = {
      nombre: $('#p_nombre'),
      elemento: $('#p_elemento'),
      rol: $('#p_rol'),
      rareza: $('#p_rareza'),
      desc: $('#p_descripcion'),
      file: $('#p_portada'),
      slug: $('#p_slug'),
      raza: $('#p_raza'),
      voz: $('#p_voz'),
      hp: $('#p_hp'), atk: $('#p_atk'), def: $('#p_def'),
      tas_hp: $('#p_tas_hp'), tas_atk: $('#p_tas_atk'), tas_def: $('#p_tas_def'),
      slot1_tipo: $('#slot1_tipo'), slot1_nivel: $('#slot1_nivel'),
      slot2_tipo: $('#slot2_tipo'), slot2_nivel: $('#slot2_nivel'),
      slot3_tipoA: $('#slot3_tipoA'), slot3_tipoB: $('#slot3_tipoB'),
      slot3_nivel: $('#slot3_nivel')
    };


  const showAuthUI = async ()=>{
    const user = await currentUser();
    loginBox.classList.toggle('d-none', !!user);
    form.classList.toggle('d-none', !user);
    $('#logoutBtn').classList.toggle('d-none', !user);
  };

  $('#loginBtn')?.addEventListener('click', async ()=>{
    const email = $('#email').value.trim(); const pass = $('#pass').value;
    const { error } = await signIn(email, pass); if (error) return alert(error.message);
    await showAuthUI();
  });
  $('#logoutBtn')?.addEventListener('click', async ()=>{ await signOut(); await showAuthUI(); });

  inputs.nombre?.addEventListener('input', ()=>{
    if (!inputs.slug.value) inputs.slug.value = slugify(inputs.nombre.value);
  });

  form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    // usa SOLO la URL de Cloudinary
    const portadaUrl = ($('#p_portada_url')?.value || '').trim();

    // stats
    const stats = {
      hp: parseInt(inputs.hp.value||'0'),
      atk: parseInt(inputs.atk.value||'0'),
      def: parseInt(inputs.def.value||'0'),
      tas_hp: parseInt(inputs.tas_hp.value||'0'),
      tas_atk: parseInt(inputs.tas_atk.value||'0'),
      tas_def: parseInt(inputs.tas_def.value||'0')
    };

    // slots
    const slots = [
      { tipo: inputs.slot1_tipo.value, nivel: parseInt(inputs.slot1_nivel.value||'0') },
      { tipo: inputs.slot2_tipo.value, nivel: parseInt(inputs.slot2_nivel.value||'0') }
    ];
    const s3A = inputs.slot3_tipoA.value;
    const s3B = (inputs.slot3_tipoB.value||'').trim();
    slots.push({ tipo: s3B ? [s3A, s3B] : s3A, nivel: parseInt(inputs.slot3_nivel.value||'0') });

    // payload final
    const slug = (inputs.slug.value || slugify(inputs.nombre.value));
    const payload = {
      slug,
      nombre: inputs.nombre.value.trim(),
      elemento: inputs.elemento.value,
      rol: inputs.rol.value.trim(),
      rareza: inputs.rareza.value.trim(),
      descripcion: inputs.desc.value.trim(),
      raza: inputs.raza.value.trim(),
      voz: inputs.voz.value.trim(),
      portada_url: portadaUrl,  // ← AQUÍ usamos la URL pegada
      stats, slots
    };

    const p = await upsertPersonaje(payload);

    alert('Guardado: '+p.nombre);
    history.replaceState({}, '', `?slug=${encodeURIComponent(p.slug)}`);
    $('#adminSlug').textContent = p.slug;
    await loadPersonajeForEdit();
    await reloadHabs();
  }catch(err){ alert(err.message||err); }
});

  formHab?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const slug = new URLSearchParams(location.search).get('slug'); if (!slug) return alert('Primero guarda el personaje');
    const p = await getPersonajeBySlug(slug);
    const h = {
      id: $('#h_id').value? parseInt($('#h_id').value): undefined,
      personaje_id: p.id,
      tipo: $('#h_tipo').value,
      nombre: $('#h_nombre').value.trim(),
      descripcion: $('#h_desc').value.trim(),
      orden: parseInt($('#h_orden').value||'0')
    };
    const saved = await saveHabilidad(h);
    $('#h_id').value = saved.id;
    await reloadHabs();
    e.target.reset();
    $('#h_id').value = ''; 
  });

  async function reloadHabs(){
    const slug = new URLSearchParams(location.search).get('slug'); if (!slug) return;
    const p = await getPersonajeBySlug(slug);
    const habs = await listHabilidades(p.slug);
    listHab.innerHTML = habs.map(h=>`
      <tr>
        <td>${h.tipo}</td><td>${h.nombre}</td><td>${h.descripcion||''}</td><td>${h.orden||0}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-id="${h.id}">Borrar</button></td>
      </tr>`).join('');
    listHab.querySelectorAll('button').forEach(b=>{
      b.onclick = async ()=>{
        await deleteHabilidad(parseInt(b.dataset.id));
        await reloadHabs();
      };
    });
  }
function fillPersonajeForm(p){
  if (!p) return;
  // básicos
  inputs.nombre.value = p.nombre || '';
  inputs.slug.value = p.slug || '';
  inputs.elemento.value = p.elemento || '';
  inputs.rol.value = p.rol || '';
  inputs.rareza.value = p.rareza || '';
  inputs.desc.value = p.descripcion || '';
  inputs.raza.value = p.raza || '';
  inputs.voz.value  = p.voz || '';

  // stats
  const st = p.stats || {};
  inputs.hp.value = st.hp || 0;
  inputs.atk.value = st.atk || 0;
  inputs.def.value = st.def || 0;
  inputs.tas_hp.value = st.tas_hp || 0;
  inputs.tas_atk.value = st.tas_atk || 0;
  inputs.tas_def.value = st.tas_def || 0;

  // slots
  const sl = p.slots || [];
  if (sl[0]){
    const t0 = Array.isArray(sl[0].tipo) ? sl[0].tipo[0] : sl[0].tipo;
    inputs.slot1_tipo.value = t0 || '';
    inputs.slot1_nivel.value = sl[0].nivel || 0;
  }
  if (sl[1]){
    const t1 = Array.isArray(sl[1].tipo) ? sl[1].tipo[0] : sl[1].tipo;
    inputs.slot2_tipo.value = t1 || '';
    inputs.slot2_nivel.value = sl[1].nivel || 0;
  }
  if (sl[2]){
    const tipos3 = Array.isArray(sl[2].tipo) ? sl[2].tipo : [sl[2].tipo];
    inputs.slot3_tipoA.value = tipos3[0] || '';
    inputs.slot3_tipoB.value = tipos3[1] || '';
    inputs.slot3_nivel.value = sl[2].nivel || 0;
  }

  // etiqueta de slug visible (si la tienes)
  const lbl = $('#adminSlug');
  if (lbl) lbl.textContent = p.slug || '';
  // URL de portada + preview
const urlInput = document.getElementById('p_portada_url');
const urlPrev  = document.getElementById('p_portada_prev');
if (urlInput) urlInput.value = p.portada_url || '';
if (urlPrev) {
  if (p.portada_url) { urlPrev.src = p.portada_url; urlPrev.style.display = 'block'; }
  else { urlPrev.src = ''; urlPrev.style.display = 'none'; }
}

}

async function loadPersonajeForEdit(){
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) return;
  const p = await getPersonajeBySlug(slug);
  fillPersonajeForm(p);
}

  // init
  showAuthUI();
  loadPersonajeForEdit().then(()=> reloadHabs());
}
