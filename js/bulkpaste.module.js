// js/bulkpaste.module.js
(function(){
  const $  = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));
  const setVal = (sel, val) => { const el = $(sel); if (el) el.value = val; };
  const stripAccents = (s)=> (s||'').normalize("NFD").replace(/[\u0300-\u036f]/g,'');
  const norm = (s)=> stripAccents(String(s||'').toLowerCase().trim());

  const mapElemento = (v)=>{
    const k = norm(v);
    if (k.includes('fuego')) return 'Fuego';
    if (k.includes('agua')) return 'Agua';
    if (k.includes('tierra')) return 'Tierra';
    if (k.includes('viento')) return 'Viento';
    if (k.includes('luz') || k.includes('light')) return 'Luz';
    if (k.includes('oscur') || k.includes('dark')) return 'Oscuridad';
    return v;
  };
  const mapTipoSlot = (v)=>{
    const k = norm(v);
    if (k.startsWith('phy') || k.startsWith('fis') || k.includes('ataq')) return 'Físico';
    if (k.startsWith('mag')) return 'Magia';
    if (k.startsWith('def')) return 'Defensa';
    if (k.startsWith('sup') || k.includes('soporte')) return 'Soporte';
    if (k.startsWith('hea') || k.includes('cura')) return 'Curación';
    return v;
  };
  const num = (s)=> parseInt(String(s||'0').replace(/[^\d-]/g,'')) || 0;


function parseBlocks(raw){
  const text = String(raw||'').replace(/\r/g,'');
  const hasFences = text.includes('```');

  // ---- Camino 1: con fences (``` ... ```)
  if (hasFences){
    const lines = text.split('\n');
    const out = [];
    let inCode = false, buf = [], lastLabel = '';

    const flush = ()=>{
      const val = buf.join('\n').trim();
      if (lastLabel && val) out.push({ label: lastLabel, value: val });
      buf = [];
    };

    for (let ln of lines){
      const t = ln.trim();
      const fence = t.startsWith('```');
      if (fence){ inCode = !inCode; if(!inCode) flush(); continue; }
      if (inCode){ buf.push(ln); }
      else {
        if (!t) continue;
        // limpia **negritas**, backticks, ":" y espacios raros
        const label = t.replace(/[*_`]/g,'').replace(/\s*:\s*$/,'').trim();
        if (label) lastLabel = label;
      }
    }
    return out;
  }

  // ---- Camino 2: sin fences (tolerante a espacios y líneas en blanco)
  const out = [];
  const lines = text.split('\n');

  const clean = s => s.replace(/[*_`]/g,'').replace(/\s*:\s*$/,'').trim();
  const isLabel = (s)=>{
    const k = clean(s).toLowerCase();
    // lista de etiquetas que aceptamos (para evitar confundir valores con labels)
    return [
      'elemento','raza','rol','voz','voz (japonesa)','descripcion',
      'hp','hp lb','atk','atk lb','def','def lb',
      'slots','slots mlb',
      'skill nombre','skill efecto',
      'arts nombre','arts efecto',
      'true arts nombre','true arts efecto',
      'super arts nombre','super arts efecto',
      'pasiva nombre','pasiva efecto'
    ].includes(k);
  };

  let i = 0;
  while (i < lines.length){
    // salta vacías
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) break;

    // si la línea es etiqueta válida
    if (isLabel(lines[i])){
      const label = clean(lines[i]); i++;

      // salta vacías entre etiqueta y valor
      while (i < lines.length && !lines[i].trim()) i++;

      // acumula valor hasta la siguiente etiqueta o fin
      const buf = [];
      while (i < lines.length){
        const line = lines[i];
        // si detectamos otra etiqueta (permitiendo espacios arriba)
        if (isLabel(line)) break;
        // detenemos solo si son >2 líneas vacías seguidas para no cortar descripciones largas
        buf.push(line);
        i++;
        // no rompemos por línea en blanco simple; el valor puede tener párrafos
        // la próxima iteración decidirá si es label
      }
      const value = buf.join('\n').trim();
      if (value) out.push({ label, value });
      continue;
    }
    // si no es etiqueta, avanza
    i++;
  }
  return out;
}


  function applyFichaToForm(pairs){
    const dict = {};
    for (const {label,value} of pairs) dict[norm(label)] = value.trim();

    if ($('#p_elemento') && dict['elemento']) $('#p_elemento').value = mapElemento(dict['elemento']);
    if ($('#p_raza')     && dict['raza'])     $('#p_raza').value     = dict['raza'];
    if ($('#p_rol')      && dict['rol'])      $('#p_rol').value      = dict['rol'];
    if ($('#p_voz')      && (dict['voz'] || dict['voz (japonesa)'])) $('#p_voz').value = dict['voz'] || dict['voz (japonesa)'];
    if ($('#p_descripcion') && dict['descripcion']) $('#p_descripcion').value = dict['descripcion'];

    if ($('#p_hp')   && dict['hp'])    $('#p_hp').value   = num(dict['hp']);
    if ($('#p_atk')  && dict['atk'])   $('#p_atk').value  = num(dict['atk']);
    if ($('#p_def')  && dict['def'])   $('#p_def').value  = num(dict['def']);
    if ($('#p_tas_hp')  && dict['hp lb'])  $('#p_tas_hp').value  = num(dict['hp lb']);
    if ($('#p_tas_atk') && dict['atk lb']) $('#p_tas_atk').value = num(dict['atk lb']);
    if ($('#p_tas_def') && dict['def lb']) $('#p_tas_def').value = num(dict['def lb']);

    if (dict['slots']){
      const raw = dict['slots'].replace(/\s+/g,'').replace(/[–—]/g,'-');
      const parts = raw.split('-').filter(Boolean);
      const t1 = (parts[0]||'').split('/')[0], t2 = (parts[1]||'').split('/')[0];
      const p3 = (parts[2]||''); const [t3a,t3b] = p3.includes('/') ? p3.split('/') : [p3,''];
      setVal('#slot1_tipo',  mapTipoSlot(t1 || 'Físico'));
      setVal('#slot2_tipo',  mapTipoSlot(t2 || 'Magia'));
      setVal('#slot3_tipoA', mapTipoSlot(t3a || 'Soporte'));
      setVal('#slot3_tipoB', t3b ? mapTipoSlot(t3b) : '');
    }
    if (dict['slots mlb']){
      const m = dict['slots mlb'].match(/(\d+)\D+(\d+)\D+(\d+)/);
      if (m){
        setVal('#slot1_nivel', parseInt(m[1],10) || 5);
        setVal('#slot2_nivel', parseInt(m[2],10) || 5);
        setVal('#slot3_nivel', parseInt(m[3],10) || 4);
      }
    }
  }

  function parseHabs(pairs){
    const out = [], tmp = {};
    const typeKey = (lbl)=>{
      const k = norm(lbl);
      if (k.startsWith('skill')) return 'Skill';
      if (k==='arts' || k.startsWith('arts ')) return 'Arts';
      if (k.startsWith('true arts')) return 'True Arts';
      if (k.startsWith('super arts')) return 'Super Arts';
      if (k.startsWith('pasiva')) return 'Passive';
      if (k.startsWith('phantom')) return 'Phantom Bullet';
      if (k.startsWith('cross')) return 'Cross Arts';
      if (k.startsWith('liberation')) return 'Liberation Skill';
      if (k.startsWith('mega')) return 'Mega Arts';
      if (k.startsWith('dream')) return 'Dream Awakening';
      return null;
    };
    const fieldKey = (lbl)=>{
      const k = norm(lbl);
      if (k.endsWith('nombre')) return 'nombre';
      if (k.endsWith('efecto')) return 'descripcion';
      return null;
    };
    for (const {label,value} of pairs){
      const t = typeKey(label), f = fieldKey(label);
      if (!t || !f) continue;
      tmp[t] = tmp[t] || {};
      tmp[t][f] = (value||'').trim();
      if (t!=='Passive' && tmp[t].nombre && tmp[t].descripcion){
        out.push({tipo:t, nombre:tmp[t].nombre, descripcion:tmp[t].descripcion});
        tmp[t] = {};
      }
      if (t==='Passive' && f==='descripcion' && tmp[t].nombre){
        out.push({tipo:'Passive', nombre:tmp[t].nombre, descripcion:value.trim()});
        tmp[t] = {};
      }
    }
    const orderOf = (t)=> ({'Skill':1,'Arts':10,'True Arts':20,'Super Arts':30}[t] ?? 100);
    return out.map((h,i)=> ({...h, orden: orderOf(h.tipo)+(h.tipo==='Passive'?(100+i):0)}));
  }

  async function saveFichaFromForm(){
    const slug = new URLSearchParams(location.search).get('slug') || $('#p_slug')?.value?.trim();
    if (!slug){ alert('Primero define/guarda el slug.'); return; }
    const slots = [
      { tipo: $('#slot1_tipo')?.value, nivel: parseInt($('#slot1_nivel')?.value||'0') },
      { tipo: $('#slot2_tipo')?.value, nivel: parseInt($('#slot2_nivel')?.value||'0') }
    ];
    const t3a = $('#slot3_tipoA')?.value||''; const t3b = $('#slot3_tipoB')?.value?.trim();
    slots.push({ tipo: t3b ? [t3a,t3b] : t3a, nivel: parseInt($('#slot3_nivel')?.value||'0') });

    const payload = {
      slug,
      nombre: $('#p_nombre')?.value?.trim() || '',
      elemento: $('#p_elemento')?.value || '',
      rol: $('#p_rol')?.value || '',
      rareza: $('#p_rareza')?.value || '',
      descripcion: $('#p_descripcion')?.value?.trim() || '',
      raza: $('#p_raza')?.value || '',
      voz: $('#p_voz')?.value || '',
      portada_url: $('#p_portada_url')?.value || '',
      stats:{
        hp: num($('#p_hp')?.value), atk: num($('#p_atk')?.value), def: num($('#p_def')?.value),
        tas_hp: num($('#p_tas_hp')?.value), tas_atk: num($('#p_tas_atk')?.value), tas_def: num($('#p_tas_def')?.value)
      },
      slots
    };
    if (window.upsertPersonaje) await window.upsertPersonaje(payload);
    else alert('upsertPersonaje no disponible; solo se llenó el formulario.');
  }

  async function saveHabilidades(habs){
    const slug = new URLSearchParams(location.search).get('slug') || $('#p_slug')?.value?.trim();
    if (!slug){ alert('Primero guarda la ficha (slug).'); return; }
    if (!window.saveHabilidad){ alert('saveHabilidad no disponible; no se guardaron.'); return; }
    for (const h of habs) await window.saveHabilidad({tipo:h.tipo, nombre:h.nombre, descripcion:h.descripcion, orden:h.orden});
    if (window.listHabilidades){
      const rows = await window.listHabilidades(slug);
      const list = $('#listHabilidades');
      if (list){
        list.innerHTML = rows.map(h=>`
          <tr><td>${h.tipo}</td><td>${h.nombre}</td><td>${h.descripcion||''}</td><td>${h.orden||0}</td>
          <td class="text-end"></td></tr>`).join('');
      }
    }
  }

  function wire(){
    const tFicha = $('#bulkFicha'), tHabs = $('#bulkHabs');
    const btnFP = $('#bulkFichaBtn'), btnFS = $('#bulkFichaGuardarBtn');
    const btnHP = $('#bulkHabsBtn'), btnHS = $('#bulkHabsGuardarBtn');
    if (!tFicha || !tHabs) return;

    btnFP?.addEventListener('click', ()=>{
      const pairs = parseBlocks(tFicha.value);
      applyFichaToForm(pairs);
      alert('Ficha pegada en el formulario.');
      tFicha.value = '';
    });
    btnFS?.addEventListener('click', async ()=>{
      const pairs = parseBlocks(tFicha.value);
      applyFichaToForm(pairs);
      await saveFichaFromForm();
      alert('Ficha parseada y guardada.');
      tFicha.value = '';
    });
    btnHP?.addEventListener('click', ()=>{
      const pairs = parseBlocks(tHabs.value);
      const habs = parseHabs(pairs);
      const list = document.getElementById('listHabilidades');
      if (list){
        list.innerHTML = habs.map(h=>`
          <tr><td>${h.tipo}</td><td>${h.nombre}</td><td>${h.descripcion}</td><td>${h.orden}</td>
          <td class="text-end"><span class="text-body-secondary small">previsualización</span></td></tr>`).join('');
          tHabs.value='';
      }
      
    });
    btnHS?.addEventListener('click', async ()=>{
      const pairs = parseBlocks(tHabs.value);
      const habs = parseHabs(pairs);
      await saveHabilidades(habs);
      alert('Habilidades parseadas y guardadas.');
      tHabs.value = '';

    });
  }

  // espera que exista el DOM del admin
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, {once:true});
  } else {
    wire();
  }
})();
