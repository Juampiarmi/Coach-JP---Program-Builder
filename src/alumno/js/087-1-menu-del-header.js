(function(){
  'use strict';
  if(window.__jpUxFinal) return; window.__jpUxFinal = 1;
  var D = document;
  function $(s, r){ return (r || D).querySelector(s); }
  function $$(s, r){ return [].slice.call((r || D).querySelectorAll(s)); }
  function esSb(){ return !!(D.body && D.body.classList.contains('jp-mission') && !D.body.classList.contains('cf-disc')); }
  function esCf(){ return !!(D.body && D.body.classList.contains('cf-disc')); }
  function lsKey(){ try{ return (typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'coachjp') + '_wu'; }catch(e){ return 'coachjp_wu'; } }
  function wuLoad(){ try{ return JSON.parse(localStorage.getItem(lsKey()) || '{}') || {}; }catch(e){ return {}; } }
  function wuSave(m){ try{ localStorage.setItem(lsKey(), JSON.stringify(m)); }catch(e){} }

  /* ---------- 1 · menú del header ---------- */
  var NIVEL_FZ = { n: 'Normal', g: 'Grande', x: 'Extra' };
  function cerrarMenu(){
    var m = $('#jpUxMenu'), bg = $('#jpUxMenuBg'), b = $('#jpUxMenuBtn');
    if(m) m.remove(); if(bg) bg.remove(); if(b) b.setAttribute('aria-expanded', 'false');
  }
  function abrirMenu(){
    cerrarMenu();
    var top = $('#hdCompact .hdc-top'); if(!top) return;
    var hist = $('.jp-hist-btn', top), fz = $('#hdcFzBtn'), info = $('#hdcInfoBtn');
    var bg = D.createElement('div'); bg.id = 'jpUxMenuBg'; bg.className = 'jp-ux-menu-bg';
    var m = D.createElement('div'); m.id = 'jpUxMenu'; m.className = 'jp-ux-menu'; m.setAttribute('role', 'menu');
    var h = '';
    if(hist) h += '<button type="button" role="menuitem" data-uxm="hist"><span class="jp-ux-mi">&#128200;</span><span>' + (esCf() ? 'PRs y 1RM' : 'Historial y marcas') + '</span></button>';
    if(fz) h += '<button type="button" role="menuitem" data-uxm="fz"><span class="jp-ux-mi">Aa</span><span>Tama&ntilde;o de letra</span><span class="jp-ux-mv">' + (NIVEL_FZ[fz.getAttribute('data-fz-lvl')] || 'Normal').toUpperCase() + '</span></button>';
    if(info) h += '<button type="button" role="menuitem" data-uxm="info"><span class="jp-ux-mi">&#128450;&#65039;</span><span>Perfil, credencial y archivos</span></button>';
    m.innerHTML = h;
    D.body.appendChild(bg); D.body.appendChild(m);
    var b = $('#jpUxMenuBtn'); if(b) b.setAttribute('aria-expanded', 'true');
  }
  function montarMenu(){
    var top = $('#hdCompact .hdc-top'); if(!top || $('#jpUxMenuBtn', top)) return;
    if(!$('.jp-hist-btn', top) && !$('#hdcFzBtn', top) && !$('#hdcInfoBtn', top)) return;
    var b = D.createElement('button'); b.type = 'button'; b.id = 'jpUxMenuBtn'; b.className = 'jp-ux-menu-btn';
    b.setAttribute('aria-label', 'Menú'); b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>';
    top.appendChild(b);
  }
  D.addEventListener('click', function(e){
    var t = e.target; if(!t || !t.closest) return;
    if(t.closest('#jpUxMenuBtn')){ e.preventDefault(); if($('#jpUxMenu')) cerrarMenu(); else abrirMenu(); return; }
    if(t.closest('#jpUxMenuBg')){ cerrarMenu(); return; }
    var it = t.closest('#jpUxMenu [data-uxm]'); if(!it) return;
    var k = it.getAttribute('data-uxm'), top = $('#hdCompact .hdc-top');
    if(k === 'fz'){
      var fz = $('#hdcFzBtn'); if(fz){ fz.click(); var v = it.querySelector('.jp-ux-mv'); if(v) v.textContent = (NIVEL_FZ[fz.getAttribute('data-fz-lvl')] || 'Normal').toUpperCase(); }
      return;
    }
    cerrarMenu();
    var el = k === 'hist' ? (top && $('.jp-hist-btn', top)) : $('#hdcInfoBtn');
    if(el) el.click();
  });
  D.addEventListener('keydown', function(e){ if(e.key === 'Escape') cerrarMenu(); });

  /* ---------- 2 · activación: mini-checklist ---------- */
  function bloqueId(el){ var b = el.closest ? el.closest('.block') : null; return b ? (b.getAttribute('data-block-id') || '') : ''; }
  /* Sports: lineas de activacion; CrossFit: filas de movimiento de la pizarra (sin "Despues", formato ni descansos) */
  function filasActivacion(det){
    return $$('.jp-sb-plain-warmup, .jp-cf-rows > .jp-cf-row', det).filter(function(f){
      return !f.classList.contains('jp-cf-badge') && !f.classList.contains('jp-cf-rest-row') && !f.querySelector('.jp-cf-rest');
    });
  }
  function wuClave(row){
    var det = row.closest('.jp-warm-acc'), filas = det ? filasActivacion(det) : [];
    return [state.currentWeek, state.currentDay, bloqueId(row), filas.indexOf(row)].join('|');
  }
  function wuProgreso(det){
    var filas = filasActivacion(det), n = filas.filter(function(f){ return f.classList.contains('jp-ux-on'); }).length;
    var p = $('.jp-ux-wu-prog', det); if(p) p.textContent = n + '/' + filas.length;
    det.classList.toggle('jp-ux-wu-ok', filas.length > 0 && n === filas.length);
    return { n: n, total: filas.length };
  }
  function mejorarActivacion(root){
    $$('.jp-warm-acc', root).forEach(function(det){
      if(det.getAttribute('data-uxwu')) return;
      var filas = filasActivacion(det); if(!filas.length) return;
      det.setAttribute('data-uxwu', '1');
      /* el rotulo cuenta solo los ejercicios reales */
      var lbl = $('.jp-warm-lb', det);
      if(lbl){ var tw = D.createTreeWalker(lbl, NodeFilter.SHOW_TEXT, null), tn; while((tn = tw.nextNode())){ if(/\d+\s+EJERCICIOS?/.test(tn.nodeValue)){ tn.nodeValue = tn.nodeValue.replace(/\d+\s+EJERCICIOS?/, filas.length + (filas.length === 1 ? ' EJERCICIO' : ' EJERCICIOS')); break; } } }
      if(esCf()) return;     /* CrossFit: el calentamiento es una guia de flujo, sin casillas por linea */
      var hecho = wuLoad();
      var sm = $('summary', det);
      if(sm && !$('.jp-ux-wu-prog', sm)){ var p = D.createElement('span'); p.className = 'jp-ux-wu-prog'; var ch = $('.jp-warm-chev', sm); if(ch) sm.insertBefore(p, ch); else sm.appendChild(p); }
      filas.forEach(function(f){
        f.classList.add('jp-ux-wu-row'); f.setAttribute('role', 'checkbox'); f.setAttribute('tabindex', '0');
        var ck = D.createElement('span'); ck.className = 'jp-ux-ck'; ck.setAttribute('aria-hidden', 'true'); ck.textContent = '✓';
        f.insertBefore(ck, f.firstChild);
        var on = !!hecho[wuClave(f)];
        f.classList.toggle('jp-ux-on', on); f.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      wuProgreso(det);
    });
  }
  function alternarActivacion(row){
    var m = wuLoad(), k = wuClave(row), on = !row.classList.contains('jp-ux-on');
    row.classList.toggle('jp-ux-on', on); row.setAttribute('aria-checked', on ? 'true' : 'false');
    if(on) m[k] = 1; else delete m[k];
    wuSave(m);
    try{ if('vibrate' in navigator) navigator.vibrate(on ? 12 : 6); }catch(e){}
    var det = row.closest('.jp-warm-acc'), pr = det ? wuProgreso(det) : null;
    if(on && pr && pr.n === pr.total && det.open){ setTimeout(function(){ if(det.classList.contains('jp-ux-wu-ok')) det.open = false; }, 650); }
  }
  D.addEventListener('click', function(e){
    var r = e.target && e.target.closest ? e.target.closest('.jp-ux-wu-row') : null; if(!r || e.target.closest('.jp-ux-vid')) return;
    e.preventDefault(); alternarActivacion(r);
  });
  D.addEventListener('keydown', function(e){
    if(e.key !== ' ' && e.key !== 'Enter') return;
    var r = e.target && e.target.closest ? e.target.closest('.jp-ux-wu-row') : null; if(!r) return;
    e.preventDefault(); alternarActivacion(r);
  });

  /* ---------- 3 · videos en línea junto a cada ejercicio ---------- */
  var STOP = { de:1, con:1, en:1, la:1, el:1, los:1, las:1, a:1, y:1, al:1, del:1, the:1, with:1, on:1, and:1, of:1, un:1, una:1, por:1 };
  function toks(s){
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
      .filter(function(w){ return w && !STOP[w]; }).map(function(w){ if(w.length > 3) return w.replace(/(?:es|s)$/, ''); return (w.length === 3 && /[^s]s$/.test(w)) ? w.slice(0, 2) : w; });
  }
  function cobertura(a, b){
    if(!a.length) return 0; var set = {}; b.forEach(function(w){ set[w] = 1; });
    var n = 0; a.forEach(function(w){ if(set[w]) n++; }); return n / a.length;
  }
  function videosEnLinea(root){
    $$('.jp-sb-board', root).forEach(function(bd){
      var cards = $$('.jp-sb-vid-card', bd).filter(function(c){ return !c.classList.contains('jp-ux-gone'); });
      if(!cards.length) return;
      var nombres = $$('.jp-sb-ex-nombre, .jp-sb-subex-tit, .jp-sb-subex-nombre, .jp-sb-plain-nombre', bd).filter(function(n){ return !n.parentNode.querySelector('.jp-ux-vid'); });
      if(!nombres.length) return;
      var pares = [];
      cards.forEach(function(c, ci){
        var nm = $('.jp-sb-vid-nombre', c), a = toks(nm ? nm.textContent : '');
        nombres.forEach(function(n, ni){ var s = cobertura(a, toks(n.textContent)); if(s >= 0.6) pares.push({ s: s, ci: ci, ni: ni }); });
      });
      pares.sort(function(x, y){ return y.s - x.s; });
      var usadoC = {}, usadoN = {};
      pares.forEach(function(p){
        if(usadoC[p.ci] || usadoN[p.ni]) return; usadoC[p.ci] = 1; usadoN[p.ni] = 1;
        var c = cards[p.ci], n = nombres[p.ni], head = n.parentNode;
        var yt = c.getAttribute('data-yt'), q = c.getAttribute('data-vsearch');
        var nm = $('.jp-sb-vid-nombre', c), etq = nm ? nm.textContent.trim() : 'ejercicio';
        var bt = D.createElement('button'); bt.type = 'button'; bt.className = 'jp-ux-vid' + (yt ? '' : ' jp-ver-busca');
        if(yt) bt.setAttribute('data-yt', yt); else bt.setAttribute('data-vsearch', q || etq);
        bt.setAttribute('aria-label', 'Ver técnica de ' + etq.replace(/"/g, ''));
        bt.innerHTML = (yt ? '<span class="jp-ux-vth" style="background-image:url(https://img.youtube.com/vi/' + yt + '/mqdefault.jpg)"></span>' : '') + '<span class="jp-ux-vp">&#9654;&#65038;</span>';
        head.classList.add('jp-ux-has-vid'); head.appendChild(bt);
        c.classList.add('jp-ux-gone');
      });
      var quedan = $$('.jp-sb-vid-card', bd).filter(function(c){ return !c.classList.contains('jp-ux-gone'); }).length;
      if(!quedan){ $$('.jp-sb-vid-cards, .jp-sb-vid-title', bd).forEach(function(x){ x.classList.add('jp-ux-gone'); }); }
    });
  }

  /* CrossFit: todos los videos del bloque en una bandeja colapsable al pie de la tarjeta ("Videos Técnicos") */
  function videosEnLineaCf(root){
    $$('.jp-cfboard', root).forEach(function(bd){
      var vids = $('.jp-cf-vids', bd);
      if(!vids || vids.getAttribute('data-uxtray')) return;
      var cards = $('.jp-cf-vid-cards', vids), n = cards ? $$('.jp-cf-vid-card', cards).length : 0;
      vids.setAttribute('data-uxtray', '1');
      if(!n) return;
      var det = D.createElement('details'); det.className = 'jp-ux-vtray';
      det.innerHTML = '<summary><span>Videos Técnicos</span><em>' + n + '</em><i>▾</i></summary>';
      det.appendChild(cards);
      vids.classList.add('jp-ux-oculto');
      var done = $(':scope > .jp-done-btn', bd);
      if(done) bd.insertBefore(det, done); else bd.appendChild(det);
    });
  }

  /* ---------- 4 · pautas y tips: acordeón por sección ---------- */
  function mejorarPautas(root){
    $$('.jp-details-content', root).forEach(function(c){
      if(c.getAttribute('data-uxacc')) return;
      var ps = $$(':scope > .jp-sb-pauta', c); if(!ps.length) return;
      c.setAttribute('data-uxacc', '1');
      if(ps.length < 2) return;
      ps.forEach(function(p, i){
        var lb = $(':scope > .jp-sb-pauta-lb', p); if(!lb) return;
        p.classList.add('jp-ux-acc');
        var ch = D.createElement('span'); ch.className = 'jp-ux-chev'; ch.textContent = '▾'; lb.appendChild(ch);
        lb.setAttribute('role', 'button'); lb.setAttribute('tabindex', '0');
        if(i > 0) p.classList.add('jp-ux-shut');
      });
    });
  }
  function mejorarPautasCf(root){
    $$('.jp-cf-acc', root).forEach(function(acc){
      if(acc.getAttribute('data-uxacc')) return;
      var rs = $$(':scope > .jp-cf-accrow', acc); if(!rs.length) return;
      acc.setAttribute('data-uxacc', '1');
      if(rs.length < 2) return;
      /* abierto: lo primero que sirve en pista (objetivo, o el foco si no hay objetivo); el resto, a un toque */
      var abierto = 0;
      rs.forEach(function(r, i){ var l = $(':scope > .lb', r); if(l && /OBJETIVO/i.test(l.textContent)) abierto = i; });
      rs.forEach(function(r, i){
        var lb = $(':scope > .lb', r); if(!lb) return;
        r.classList.add('jp-ux-acc');
        var ch = D.createElement('span'); ch.className = 'jp-ux-chev'; ch.textContent = '▾'; lb.appendChild(ch);
        lb.setAttribute('role', 'button'); lb.setAttribute('tabindex', '0');
        if(i !== abierto) r.classList.add('jp-ux-shut');
      });
    });
  }
  function alternarPauta(lb){
    var p = lb.closest('.jp-ux-acc'); if(!p) return;
    p.classList.toggle('jp-ux-shut');
  }
  D.addEventListener('click', function(e){ var lb = e.target && e.target.closest ? e.target.closest('.jp-sb-pauta.jp-ux-acc > .jp-sb-pauta-lb, .jp-cf-accrow.jp-ux-acc > .lb') : null; if(lb){ e.preventDefault(); alternarPauta(lb); } });
  D.addEventListener('keydown', function(e){
    if(e.key !== ' ' && e.key !== 'Enter') return;
    var lb = e.target && e.target.closest ? e.target.closest('.jp-sb-pauta.jp-ux-acc > .jp-sb-pauta-lb, .jp-cf-accrow.jp-ux-acc > .lb') : null; if(lb){ e.preventDefault(); alternarPauta(lb); }
  });

  /* ---------- 5 · memoria del atleta: ultima marca de cada WOD y ultima carga ---------- */
  function ultimaMarca(skey){
    var p = String(skey).split('|'), w = parseInt(p[0], 10); if(!(w > 0)) return null;
    for(var pw = w - 1; pw >= 0; pw--){
      var v = state.scores && state.scores[pw + '|' + p[1] + '|' + p[2]];
      if(v && String(v).trim()) return { w: pw, v: String(v).trim() };
    }
    return null;
  }
  function partesMarca(txt){
    var nivel = (/\[(DEVELOPMENT|ADVANCED|RX|ELITE|SCALED)\]\s*$/i.exec(txt) || [])[1] || '', base = String(txt).replace(/\s*\[(?:DEVELOPMENT|ADVANCED|RX|ELITE|SCALED)\]\s*$/i, '').trim(), m;
    if((m = /^CAP\s*\+\s*(\d+)/i.exec(base))) return { cap: true, a: '', b: m[1], nivel: nivel, base: base };
    if((m = /^(\d+)\s*:\s*(\d+)/.exec(base))) return { a: m[1], b: m[2], nivel: nivel, base: base };
    if((m = /^(\d+)\s*\+\s*(\d+)/.exec(base))) return { a: m[1], b: m[2], nivel: nivel, base: base };
    if((m = /^(\d+)\s*rondas?(?:\s*·\s*([\d.,]+)\s*kg)?/i.exec(base))) return { a: m[1], b: m[2] || '', nivel: nivel, base: base };
    return { free: true, a: '', b: '', nivel: nivel, base: base };
  }
  function memoriaScore(root){
    $$('.jp-cfboard .wod-score[data-jp]', root).forEach(function(box){
      if(box.getAttribute('data-uxprev')) return;
      var inp = $('.wod-score-in', box); if(!inp) return;
      var u = ultimaMarca(inp.getAttribute('data-skey')); box.setAttribute('data-uxprev', '1');
      if(!u) return;
      var pm = partesMarca(u.v), ui = $('.jp-sc-ui', box); if(!ui) return;
      var A = $('.jp-sc-a', ui), B = $('.jp-sc-b', ui), F = $('.jp-sc-free', ui);
      /* los casilleros vacios muestran la marca anterior como referencia */
      if(A && !A.value && pm.a) A.placeholder = pm.a;
      if(B && !B.value && pm.b && !pm.cap) B.placeholder = pm.b;
      var bt = D.createElement('button'); bt.type = 'button'; bt.className = 'jp-ux-prev';
      bt.setAttribute('data-uxu', JSON.stringify({ p: pm }));
      bt.innerHTML = '<span class="jp-ux-prev-k">ÚLTIMA VEZ · SEM ' + (u.w + 1) + '</span><b>' + u.v.replace(/</g, '&lt;') + '</b><span class="jp-ux-prev-a">↺ REPETIR</span>';
      box.insertBefore(bt, ui);
    });
    $$('.jp-icr', root).forEach(function(det){
      if(det.getAttribute('data-uxprev')) return; det.setAttribute('data-uxprev', '1');
      var bd = det.closest('.jp-cfboard'); if(!bd) return;
      var w = state.currentWeek, bid = bd.getAttribute('data-wodb'), o = {};
      try{ o = JSON.parse(localStorage.getItem('coachjp_cf_carga_v1') || '{}') || {}; }catch(e){}
      for(var pw = w - 1; pw >= 0; pw--){
        var g = o[pw + '|' + bid]; if(!g || (!g.kg && !g.rondas)) continue;
        var ik = $('input[data-k="kg"]', det), ir = $('input[data-k="rondas"]', det);
        if(ik && !ik.value && g.kg) ik.placeholder = g.kg;
        if(ir && !ir.value && g.rondas) ir.placeholder = g.rondas;
        break;
      }
    });
  }
  D.addEventListener('click', function(e){
    var bt = e.target && e.target.closest ? e.target.closest('.jp-ux-prev') : null; if(!bt) return;
    e.preventDefault(); e.stopPropagation();
    var box = bt.closest('.wod-score'), ui = box && $('.jp-sc-ui', box), pm = null;
    try{ pm = JSON.parse(bt.getAttribute('data-uxu')).p; }catch(er){}
    if(!ui || !pm) return;
    var A = $('.jp-sc-a', ui), B = $('.jp-sc-b', ui), F = $('.jp-sc-free', ui);
    function poner(el, v){ if(!el) return; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
    if(pm.cap){ var cb = $('[data-fin="cap"]', ui); if(cb) cb.click(); poner(B, pm.b); }
    else if(pm.free) poner(F, pm.base);
    else { var ok = $('[data-fin="ok"]', ui); if(ok) ok.click(); poner(A, pm.a); poner(B, pm.b); }
    if(pm.nivel){ var rx = $('[data-rx="' + pm.nivel.toUpperCase() + '"]', ui); if(rx && !rx.classList.contains('on')) rx.click(); }
    bt.classList.add('jp-ux-prev-ok');
  });

  /* ---------- CrossFit · estructura de la pizarra: tipografía, intervalos, unilaterales, estructuras largas, metadatos ---------- */
  function esFilaEj(r){
    return !!$(':scope > .jp-cf-rn', r) && !r.classList.contains('jp-cf-header') && !r.classList.contains('jp-cf-badge') && !r.classList.contains('jp-cf-rest-row') && !r.classList.contains('jp-cf-closing');
  }
  function ladoDe(txt){
    var t = String(txt || '').trim(), m = /\b(derech[oa]|izquierd[oa]|right|left)\b/i.exec(t);
    if(m) return /^(?:derech|right)/i.test(m[1]) ? 'D' : 'I';
    m = /\(\s*([RLDI])\s*\)\s*$/.exec(t);
    if(m) return /[RD]/.test(m[1].toUpperCase()) ? 'D' : 'I';
    return '';
  }
  function limpiarLado(rn){
    var tw = D.createTreeWalker(rn, NodeFilter.SHOW_TEXT, null), n;
    while((n = tw.nextNode())){
      var v = n.nodeValue.replace(/\s*\(\s*[RLDI]\s*\)\s*$/, '').replace(/\s*\b(?:derech[oa]|izquierd[oa]|right|left)\b\s*/ig, ' ').replace(/\s{2,}/g, ' ');
      if(v !== n.nodeValue) n.nodeValue = v;
    }
  }
  /* "Min 4: REST" con el mismo cuerpo y escala que los demás minutos del EMOM */
  function restEnEmom(cont){
    $$(':scope > .jp-cf-badge', cont).forEach(function(r){
      var m = /^\s*min(?:ute)?s?\s*(\d+)\s*[:.\-]\s*(rest|descanso)/i.exec(r.textContent);
      if(!m) return;
      r.className = 'jp-cf-row jp-cf-cell jp-ux-resto';
      r.innerHTML = '<span class="jp-cf-rn"><span class="jp-cf-min">[ MIN ' + m[1] + ' ]</span>' + (/rest/i.test(m[2]) ? 'REST' : 'DESCANSO') + '</span>';
    });
  }
  /* "Time cap: 25 min" es un dato del WOD (ya va en el resumen), no un movimiento */
  function capComoDato(cont){
    $$(':scope > .jp-cf-row', cont).forEach(function(r){
      var rn = $(':scope > .jp-cf-rn', r);
      if(rn && /^\s*(?:time\s*cap|cap)\b/i.test(rn.textContent)) r.classList.add('jp-cf-badge');
    });
  }
  /* un AMRAP mide trabajo continuo por tiempo: nunca lleva una etiqueta de rondas fijas */
  function amrapSinRondas(bd, cont){
    var cab = ($('.jp-cf-fmtbadge', bd) || {}).textContent || '', hdr = $$(':scope > .jp-cf-header', cont).map(function(x){ return x.textContent; }).join(' ');
    if(!/AMRAP/i.test(cab + ' ' + hdr)) return;
    $$(':scope > .cf-format-badge, :scope > .jp-cf-header', cont).forEach(function(x){
      if(/^\W*\d+\s*(?:rounds?|rondas?|sets?|series)\b/i.test(x.textContent.trim())){ x.classList.add('jp-ux-oculto'); }
    });
    bd.classList.add('jp-ux-amrap');
  }
  function unilateral(cont){
    var filas = $$(':scope > .jp-cf-row', cont).filter(esFilaEj), der = [], izq = [];
    filas.forEach(function(r){ var l = ladoDe($(':scope > .jp-cf-rn', r).textContent); if(l === 'D') der.push(r); else if(l === 'I') izq.push(r); });
    if(!der.length || !izq.length) return false;
    var primero = (der[0].compareDocumentPosition(izq[0]) & 4) ? der[0] : izq[0];
    var marca = D.createComment('lados'); cont.insertBefore(marca, primero);
    var frag = D.createDocumentFragment();
    function seccion(txt, cls, arr){
      var h = D.createElement('div'); h.className = 'jp-ux-lado ' + cls; h.innerHTML = '<span>' + txt + '</span><em>' + arr.length + (arr.length === 1 ? ' movimiento' : ' movimientos') + '</em>';
      frag.appendChild(h);
      arr.forEach(function(r, k){ limpiarLado($(':scope > .jp-cf-rn', r)); if(r.hasAttribute('data-est')) r.setAttribute('data-est', 'E' + (k + 1)); frag.appendChild(r); });
    }
    seccion('LADO DERECHO', 'jp-ux-lado-d', der);
    seccion('LADO IZQUIERDO', 'jp-ux-lado-i', izq);
    cont.insertBefore(frag, marca); marca.remove();
    cont.classList.add('jp-ux-unilateral');
    return true;
  }
  var RX_SEQ_G = /\d{1,3}(?:\s*[-\u2013]\s*\d{1,3}){2,}/;
  function ladderEl(seq){
    var nums = String(seq).split(/\s*[-\u2013]\s*/).map(Number), e = D.createElement('div');
    e.className = 'jp-ux-ladder';
    var n = nums.length > 8 ? '<b>' + nums[0] + '</b><i>\u2192</i><b>' + nums[nums.length - 1] + '</b>' : nums.map(function(x){ return '<b>' + x + '</b>'; }).join('<i>\u2013</i>');
    e.innerHTML = '<span class="k">ESCALERA</span><span class="n">' + n + '</span><span class="u">REPS</span>';
    return e;
  }
  function escalera(cont){
    if(cont.getAttribute('data-uxesc')) return;
    var bd = cont.closest('.jp-cfboard') || cont.parentNode, fm = $('.jp-cf-fmtbadge', bd), seq = '', m;
    /* 1 · la secuencia que ya viene en el titulo del formato ("FOR TIME · 27-21-15-9") sale de ahi y pasa a la linea de escalera */
    if(fm && (m = RX_SEQ_G.exec(fm.textContent))){
      seq = m[0].replace(/\s+/g, '');
      fm.textContent = fm.textContent.replace(/\s*[\u00b7\-\u2013]\s*\d{1,3}(?:\s*[-\u2013]\s*\d{1,3}){2,}/, '');
    }
    /* 2 · filas que traen la secuencia por delante ("27-21-15-9 WALL BALLS"): si es la misma en todas, se levanta una sola vez */
    var filas = $$(':scope > .jp-cf-row', cont).filter(function(r){ var rn = $(':scope > .jp-cf-rn', r); return rn && /^\s*\d{1,3}(?:\s*[-\u2013]\s*\d{1,3}){2,}(?:\s|$)/.test(rn.textContent); });
    if(filas.length){
      var seqs = filas.map(function(r){ return (/^\s*(\d{1,3}(?:\s*[-\u2013]\s*\d{1,3}){2,})/.exec($(':scope > .jp-cf-rn', r).textContent) || [''])[1].replace(/\s+/g, ''); });
      if(seqs.every(function(x){ return x === seqs[0]; }) && (!seq || seq === seqs[0])){
        seq = seqs[0];
        filas.forEach(function(r){
          var rn = $(':scope > .jp-cf-rn', r);
          rn.innerHTML = rn.innerHTML.replace(/^\s*(?:<span[^>]*>)?\s*\d{1,3}(?:\s*[-\u2013]\s*\d{1,3}){2,}\s*(?:<\/span>)?\s*/, '');
        });
      }
    }
    cont.setAttribute('data-uxesc', '1');
    if(!seq) return;
    cont.parentNode.insertBefore(ladderEl(seq), cont);
  }
  function cargasUnicas(root){
    $$('.jp-cfboard', root).forEach(function(bd){
      if(bd.getAttribute('data-uxcg')) return;
      var chips = $('.jp-cf-chips', bd); if(!chips) return;
      var rows = $$('.jp-cf-rows .jp-cf-load', bd);
      bd.setAttribute('data-uxcg', '1');
      if(!rows.length) return;
      var vals = rows.map(function(e){ return String(e.textContent).toLowerCase().replace(/[\s()]/g, '').replace(/,.*$/, ''); });
      var distintas = vals.filter(function(v, i){ return vals.indexOf(v) === i; });
      if(distintas.length === 1 && rows.length >= 2) rows.forEach(function(e){ e.classList.add('jp-ux-dup'); });
      else chips.classList.add('jp-ux-dup');
    });
  }
  /* indices de secuencia: numeros tabulares (01, 02...) en lugar de puntos; solo en listas cortas y sin etiquetas propias */
  function indicesCf(root){
    $$('.jp-cfboard .jp-cf-rows', root).forEach(function(cont){
      $$(':scope > .jp-cf-row[data-est]', cont).forEach(function(r){ var m = /^E(\d+)$/.exec(r.getAttribute('data-est')); if(m) r.setAttribute('data-idx', (m[1].length < 2 ? '0' : '') + m[1]); });
      if(cont.getAttribute('data-uxidx')) return;
      cont.setAttribute('data-uxidx', '1');
      if(cont.classList.contains('jp-ux-larga') || cont.classList.contains('jp-ux-unilateral') || $(':scope > .jp-cf-row[data-est]', cont)) return;
      var items = $$(':scope > .jp-cf-row', cont).filter(function(r){
        return $(':scope > .jp-cf-rn', r) && !r.classList.contains('jp-cf-cell') && !/jp-cf-(?:header|badge|closing|rest-row|scheme|interval|notecard)|jp-ux-(?:tc|oculto)/.test(r.className);
      });
      var max = cont.closest('.jp-ux-flujo') ? 14 : 6;
      if(items.length < 2 || items.length > max) return;
      cont.classList.add('jp-ux-idx'); items.forEach(function(r){ r.classList.add('jp-ux-it'); });
    });
  }
  var RX_ESTRUCT = /^\W*(?:every|emom|e\d+mom|amrap|for\s*time|chipper|tabata|\d+(?:\s*[-–]\s*\d+)?\s*(?:sets?|quality\s*(?:sets?|rounds?)|rounds?|rondas?|series|supersets?)\b|(?:superset|supersets|alternating|alternando)\b|min(?:ute)?s?\s*\d)/i;
  /* toda la metadata del bloque (estructura, rondas, time cap, regla de descanso) en UNA cabecera; sin parches sueltos ni textos repetidos */
  function metaWod(bd, cont){
    if($('.jp-ux-cab', bd)) return;
    var id = bd.getAttribute('data-wodb'), blk = null;
    try{ var dia = DAYS.filter(function(x){ return x.id === state.currentDay; })[0]; blk = ((dia && dia.blocks) || []).filter(function(b){ return b.id === id; })[0]; }catch(e){}
    var cat = blk ? blk.category : '';
    if(cat !== 'metcon' && cat !== 'strength' && cat !== 'accessory' && cat !== 'cardio' && cat !== 'endurance') return;
    var fmt = String(blk.boardFmt || '').toLowerCase().replace(/[^a-z]/g, ''), fm = $('.jp-cf-fmtbadge', bd);
    var amrap = /amrap/.test(fmt) || /AMRAP/i.test((fm ? fm.textContent : '') + ' ' + $$(':scope > .jp-cf-header', cont).map(function(h){ return h.textContent; }).join(' '));
    /* estructura: la primera linea de encabezado de formato */
    var hRow = null;
    $$(':scope > .jp-cf-header, :scope > .cf-format-badge', cont).forEach(function(h){ if(!hRow && RX_ESTRUCT.test(h.textContent.replace(/[⚡⏱️]/g, '').trim())) hRow = h; });
    var head = hRow ? hRow.textContent.replace(/[⚡⏱️]\uFE0F?/g, '').replace(/:\s*$/, '').replace(/\s+/g, ' ').trim() : '';
    if(hRow) hRow.classList.add('jp-ux-oculto');
    if(fm){ /* el formato grande ya dice la estructura: los encabezados repetidos sobran */
      $$(':scope > .jp-cf-header', cont).forEach(function(h){ if(/^\W*(?:amrap|emom|e\d+mom|for\s*time|chipper|tabata)\b/i.test(h.textContent.trim())) h.classList.add('jp-ux-oculto'); });
      head = '';
    }
    var txt = $$(':scope > .jp-cf-row, :scope > .cf-format-badge, :scope > .jp-cf-closing', cont).map(function(x){ return x.textContent.replace(/\s+/g, ' '); }).join(' | ');
    var fmtTxt = head + ' ' + (fm ? fm.textContent : ''), items = [], m;
    /* rondas (nunca en un AMRAP) */
    var ron = (blk && parseInt(blk.cfRondas, 10)) || 0;
    if(!ron && !amrap){ m = /(\d+)\s*(?:rounds?|rondas)\b/i.exec(txt) || /\bx\s*(\d+)\s*(?:sets?|series)\b/i.exec(txt) || /(?:^|\|)\s*\W*(\d+)\s*sets\b/i.exec(txt); if(m) ron = parseInt(m[1], 10) || 0; }
    if(ron > 1 && !amrap && !/\b\d+\s*(?:sets?|rounds?|rondas?|series)\b|\bx\s*\d/i.test(fmtTxt)) items.push('RONDAS ' + ron);
    /* regla de descanso */
    var rest = '', ocultarRest = false;
    if(blk && blk.cfRest) rest = blk.cfRest === '1:1' ? '1:1 · IGUAL AL TRABAJO' : (blk.cfRest === 'libre' ? 'LIBRE' : blk.cfRest);
    else if(/(?:rest|descanso)[^|]{0,24}1\s*:\s*1|1\s*:\s*1\s*(?:rest|work|descanso|trabajo)|rest\s*=\s*work|descanso\s*igual/i.test(txt)) rest = '1:1 · IGUAL AL TRABAJO';
    else { m = /(?:^|\|)\s*\W*(?:rest|descanso)\s*(?:de|:)?\s*(\d+:\d{2}|\d+\s*(?:s|seg|min))\s*(?:\||$)/i.exec(txt); if(m){ rest = m[1].toUpperCase(); ocultarRest = true; } }
    if(rest){ items.push('DESCANSO ' + rest); $$(':scope > .jp-cf-closing.jp-cf-restbar', cont).forEach(function(r){ if(ocultarRest || /rest|descanso/i.test(r.textContent)) r.classList.add('jp-ux-oculto'); }); }
    /* time cap */
    if(!$('.jp-cf-capline .cap', bd) && !fm){
      m = /time\s*cap\s*[:\-]?\s*(\d{1,2}(?::\d{2})?)/i.exec(txt) || (/^(?:fortime|chipper)$/.test(fmt) && blk.cfParam ? /(\d{1,2}(?::\d{2})?)/.exec(blk.cfParam) : null);
      if(m) items.push('TIME CAP ' + m[1] + (/^\d+$/.test(m[1]) ? ' MIN' : ''));
    }
    var capVisto = !!$('.jp-cf-capline .cap', bd) || items.some(function(t){ return /^TIME CAP/.test(t); });
    if(capVisto) $$(':scope > .jp-cf-badge', cont).forEach(function(r){ if(/^\s*(?:time\s*cap|cap)\b/i.test(r.textContent)) r.classList.add('jp-ux-oculto'); });
    if(!head && !items.length) return;
    var cab = D.createElement('div'); cab.className = 'jp-ux-cab';
    cab.innerHTML = (head ? '<b>' + head.toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</b>' : '') + items.map(function(t){ return '<span' + (/^TIME CAP/.test(t) ? ' class="jp-ux-tc"' : '') + '>' + t + '</span>'; }).join('');
    var ancla = $('.jp-cf-capline', bd) || fm;
    if(ancla && ancla.parentNode === cont.parentNode) ancla.parentNode.insertBefore(cab, ancla.nextSibling); else cont.parentNode.insertBefore(cab, cont);
  }
  function normalizarCf(root){
    $$('.jp-cfboard', root).forEach(function(bd){
      if(bd.getAttribute('data-uxcf')) return;
      var cont = $('.jp-cf-rows', bd); if(!cont) return;
      bd.setAttribute('data-uxcf', '1');
      restEnEmom(cont);
      capComoDato(cont);
      amrapSinRondas(bd, cont);
      var uni = false;
      try{ uni = unilateral(cont); }catch(e1){ console.warn('ux unilateral', e1); }
      escalera(cont);
      try{ ajustarTexto(cont); }catch(e3){ console.warn('ux texto', e3); }
      if(!uni && $$(':scope > .jp-cf-row', cont).filter(esFilaEj).length >= 7) cont.classList.add('jp-ux-larga');
      if(bd.classList.contains('jp-cf-fase-warmup')) bd.classList.add('jp-ux-flujo');
      try{ metaWod(bd, cont); }catch(e2){}
    });
  }

  /* texto largo: los modificadores entre paréntesis van en una sub-línea con sangría fija y el texto nunca pasa por debajo del badge [ MIN n ] */
  function ajustarTexto(cont){
    $$(':scope > .jp-cf-row', cont).forEach(function(r){
      var rn = $(':scope > .jp-cf-rn', r); if(!rn || rn.getAttribute('data-uxtxt')) return;
      rn.setAttribute('data-uxtxt', '1');
      var min = $(':scope > .jp-cf-min', rn), mods = [], tw = D.createTreeWalker(rn, NodeFilter.SHOW_TEXT, null), n, nodos = [];
      while((n = tw.nextNode())) nodos.push(n);
      nodos.forEach(function(t){
        if(t.parentNode.closest('.jp-cf-side, .jp-cf-min')) return;
        var v = t.nodeValue.replace(/\s*\(([^()]{3,})\)/g, function(all, inner){ mods.push(inner.trim()); return ''; });
        if(v !== t.nodeValue) t.nodeValue = v;
      });
      var txt = D.createElement('span'); txt.className = 'jp-ux-txt';
      [].slice.call(rn.childNodes).filter(function(c){ return c !== min; }).forEach(function(c){ txt.appendChild(c); });
      if(mods.length){ var md = D.createElement('span'); md.className = 'jp-ux-mod'; md.textContent = '(' + mods.join(') (') + ')'; txt.appendChild(md); }
      var rv = $(':scope > .jp-cf-rv', r); if(rv) txt.appendChild(rv);   /* la carga (@ 80%, 9/6kg) queda alineada con el texto */
      rn.appendChild(txt);
    });
  }
  /* un solo registro post-WOD: score + carga + rondas dentro de la misma caja (sin tarjetas sueltas) */
  function fusionarScore(root){
    $$('.jp-cfboard', root).forEach(function(bd){
      var sc = $('.wod-score', bd); if(!sc || !$('.jp-sc-ui', sc)) return;
      sc.classList.add('jp-ux-score');
      var ic = $('.jp-icr', bd), er = $('.jp-er', bd);
      if(ic && !sc.contains(ic)){ ic.open = true; ic.classList.add('jp-ux-in'); sc.appendChild(ic); }
      if(er && !sc.contains(er)){ er.classList.add('jp-ux-in'); sc.appendChild(er); }
    });
  }
  /* briefing del coach: directivas en bloques espaciados y el cool-down aislado con su subtítulo */
  function briefingJerarquia(root){
    $$('.tactical-briefing .tb-body', root).forEach(function(b){
      if(b.getAttribute('data-uxbr')) return;
      var t = String(b.textContent || '').replace(/\r/g, '').trim(); if(!t) return;
      b.setAttribute('data-uxbr', '1');
      function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
      function bloque(p){
        var m = /^\W*(?:\d+\s*[).\-]\s*)?([^:.\n]{3,48}):\s+([\s\S]+)$/.exec(p);
        return m ? '<div class="jp-ux-bp"><b>' + esc(m[1]) + '</b><span>' + esc(m[2]) + '</span></div>' : '<div class="jp-ux-bp"><span>' + esc(p) + '</span></div>';
      }
      var partes = t.split(/\n+/).map(function(s){ return s.trim(); }).filter(Boolean), pri = [], cool = [];
      partes.forEach(function(p){ if(/^\W*(?:cool[\s-]*down|enfriamiento|vuelta a la calma)\b/i.test(p)) cool.push(p.replace(/^\W*(?:cool[\s-]*down|enfriamiento|vuelta a la calma)\s*[:\-–]?\s*/i, '')); else pri.push(p); });
      b.innerHTML = pri.map(bloque).join('') + (cool.length ? '<div class="jp-ux-br-sub">COOL-DOWN</div>' + cool.map(function(p){ return '<div class="jp-ux-bp"><span>' + esc(p) + '</span></div>'; }).join('') : '');
    });
  }

  /* ---------- 6 · sugerencia de carga: progresión entre semanas y marca real ---------- */
  function nrm2(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\([^)]*\)/g, ' ').replace(/^[a-f]\d{1,2}[.):\-]\s*/, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function rangoReps(txt){
    var m = String(txt || '').match(/(\d+)\s*[-–]\s*(\d+)/);
    if(m) return { min: +m[1], max: +m[2] };
    m = String(txt || '').match(/\d+/);
    return m ? { min: +m[0], max: +m[0] } : null;
  }
  function rirNum(txt){
    var a = String(txt || '').match(/\d+(?:[.,]\d+)?/g); if(!a) return null;
    var v = a.map(function(x){ return parseFloat(x.replace(',', '.')); });
    return v.reduce(function(s, x){ return s + x; }, 0) / v.length;
  }
  function redondear(kg, paso){ paso = paso || 2.5; return Math.round(kg / paso) * paso; }
  function fmtKg(n){ return String(Math.round(n * 100) / 100).replace('.', ','); }
  function carga(w, d, b, idx, set){ try{ return getLoad(getLoadKey(w, d, b, idx, set)) || {}; }catch(e){ return {}; } }
  /* id de cada ejercicio de la rutina (dia|bloque|indice) -> nombre */
  var mapaNom = null;
  function mapaNombres(){
    if(mapaNom) return mapaNom;
    mapaNom = {};
    try{
      DAYS.forEach(function(day){
        (day.blocks || []).forEach(function(b){
          if(!b.sportsPizarra || typeof window.parsearPizarraSB !== 'function') return;
          var lin = itemsDeSemana(b, 0).filter(function(l){ return l != null && String(l).trim(); });
          window.parsearPizarraSB(lin, { titulo: b.title }).forEach(function(en, idx){
            if(en.tipo === 'simple') mapaNom[day.id + '|' + b.id + '|e' + idx] = en.titulo;
            else if(en.tipo === 'biserie') (en.subs || []).forEach(function(s, si){ mapaNom[day.id + '|' + b.id + '|b' + idx + 's' + si] = s.nombre; });
          });
        });
      });
    }catch(e){}
    return mapaNom;
  }
  /* mejor 1RM estimado REAL del alumno para un ejercicio: series tildadas en cualquier semana + marcas guardadas por él (no las del coach) */
  function e1rmReal(nombre){
    var objetivo = nrm2(nombre), mejor = 0, mapa = mapaNombres();
    if(!objetivo) return 0;
    try{
      Object.keys(state.loads || {}).forEach(function(k){
        var p = k.split('|'); if(p.length < 5) return;
        var nm = mapa[p[1] + '|' + p[2] + '|' + p[3]]; if(!nm || nrm2(nm) !== objetivo) return;
        var l = state.loads[k] || {}; if(!l.done) return;
        var kg = parseFloat(l.kg), rp = parseFloat(l.reps);
        if(kg > 0 && rp > 0) mejor = Math.max(mejor, kg * (1 + Math.min(rp, 12) / 30));
      });
    }catch(e){}
    try{
      var hub = (window.CoachPRHub && window.CoachPRHub.datos) ? window.CoachPRHub.datos() : null;
      Object.keys((hub && hub.marcas) || {}).forEach(function(ex){
        var n2 = nrm2(ex); if(!n2 || (n2 !== objetivo && n2.indexOf(objetivo) < 0 && objetivo.indexOf(n2) < 0)) return;
        Object.keys(hub.marcas[ex]).forEach(function(r){
          var m = hub.marcas[ex][r]; if(!m || m.origen === 'coach') return;
          var kg = parseFloat(m.kg), rp = parseInt(r, 10) || 1;
          if(kg > 0) mejor = Math.max(mejor, kg * (1 + Math.min(rp, 12) / 30));
        });
      });
    }catch(e2){}
    return mejor;
  }
  /* ---------- registro previo de un ejercicio (enlace entre semanas) ----------
     Antes la referencia se buscaba SOLO por posición exacta (semana|día|bloque|ejercicio|serie): si el coach regeneraba un bloque, reordenaba ejercicios o reasignaba
     la plantilla entre semana, la clave de la Semana 2 ya no coincidía con la que el alumno había usado en la Semana 1 y no había ninguna carga sugerida.
     Ahora se busca primero por posición y, si no hay nada, por NOMBRE del ejercicio (cada serie registrada guarda el nombre en l.ex), así el registro siempre se encuentra. */
  /* semanas donde buscar, en orden de prioridad: la Semana 1 manda (base de la progresión); después la anterior más cercana */
  function ordenSemanas(w){
    var orden = [], pw;
    if(w > 0) orden.push(0);
    for(pw = w - 1; pw >= 1; pw--) orden.push(pw);
    return orden;
  }
  /* una serie cuenta como registro si tiene kilos (las reps pueden faltar) y no fue desmarcada a propósito (done === false) */
  function serieValida(l){
    var kg = parseFloat(l && l.kg), rp = parseFloat(l && l.reps);
    return (kg > 0 && l.done !== false) ? { kg: kg, reps: rp > 0 ? rp : 0 } : null;
  }
  function nombreDeCarga(k, l){
    if(l && l.ex) return l.ex;
    var p = String(k).split('|');
    return mapaNombres()[p[1] + '|' + p[2] + '|' + p[3]] || '';
  }
  function elegirRef(sets, setN){
    var mismo = sets.filter(function(x){ return x.s === setN; })[0];
    var mejor = sets.reduce(function(a, x){ return (x.kg * (1 + x.reps / 30) > a.kg * (1 + a.reps / 30)) ? x : a; }, sets[0]);
    return mismo || mejor;
  }
  /* registro de UNA semana: por posición exacta y, si no hay, por nombre del ejercicio */
  function registroSemana(c, e, setN, pw){
    var sets = [], s;
    for(s = 1; s <= 12; s++){
      var v = serieValida(carga(pw, c.d, c.b, e.idx, s));
      if(v) sets.push({ s: s, kg: v.kg, reps: v.reps });
    }
    if(sets.length) return { w: pw, ref: elegirRef(sets, setN), sets: sets, clave: { w: pw, d: c.d, b: c.b, idx: e.idx }, porNombre: false };
    var obj = nrm2(e.nombre); if(!obj) return null;
    var grupos = {};
    Object.keys(state.loads || {}).forEach(function(k){
      var p = k.split('|'); if(p.length < 5 || parseInt(p[0], 10) !== pw) return;
      var n = parseInt(p[4], 10); if(!(n >= 1)) return;                         /* las micro-series de Myo-Reps ('m1'...) no son series de trabajo */
      var l = state.loads[k] || {}, v2 = serieValida(l); if(!v2) return;
      if(nrm2(nombreDeCarga(k, l)) !== obj) return;
      var gk = p[1] + '|' + p[2] + '|' + p[3];
      var g = grupos[gk] = grupos[gk] || { d: p[1], b: p[2], idx: p[3], sets: [], ts: 0 };
      g.sets.push({ s: n, kg: v2.kg, reps: v2.reps }); g.ts = Math.max(g.ts, l.ts || 0);
    });
    var lista = Object.keys(grupos).map(function(k2){ return grupos[k2]; });
    if(!lista.length) return null;
    /* el mismo día primero; si no, el registro más reciente */
    lista.sort(function(a, b){ return ((b.d === c.d) - (a.d === c.d)) || (b.ts - a.ts); });
    var g0 = lista[0];
    return { w: pw, ref: elegirRef(g0.sets, setN), sets: g0.sets, clave: { w: pw, d: g0.d, b: g0.b, idx: g0.idx }, porNombre: true };
  }
  /* la Semana 1 es la base estricta: se busca primero ahí; si esa serie no tiene marca, la semana anterior más cercana. Solo series completadas (done !== false) */
  function ultimoRegistro(c, e, setN){
    var orden = ordenSemanas(c.w);
    for(var q = 0; q < orden.length; q++){
      var r = registroSemana(c, e, setN, orden[q]);
      if(r) return r;
    }
    return null;
  }
  /* RIR que el alumno marcó para ese ejercicio de esa semana (chips de la tarjeta) o, en bloques clásicos, el RIR de hoy del bloque. null = no lo marcó */
  function rirRegistrado(clave){
    try{
      var v = (state.rirEx || {})[clave.w + '|' + clave.d + '|' + clave.b + '|' + clave.idx];
      if(typeof v !== 'number') v = (state.rir || {})[clave.w + '|' + clave.d + '|' + clave.b];
      return typeof v === 'number' ? v : null;
    }catch(e){ return null; }
  }
  /* doble progresión pura (sin DOM): ref = lo hecho la semana de referencia; rr = rango de reps; rirReg = RIR marcado por el alumno o null. Devuelve { kg, sube, motivo } */
  function progresion(ref, rr, rirReg, fac){
    var llego = ref.reps >= rr.max, holgado = (rirReg == null) || rirReg >= 1;
    if(llego && holgado){
      var kgN = Math.max(redondear(ref.kg * (fac || 1.025)), ref.kg + 2.5);
      return { kg: kgN, sube: true, motivo: 'tope' };
    }
    return { kg: ref.kg, sube: false, motivo: llego ? 'fallo' : 'rango' };
  }
  window.jpProgresionCarga = progresion;
  /* devuelve { kg, pre, origen, txt } — pre = se escribe en el casillero para confirmar con un toque */
  window.jpSugerirCarga = function(c, e, setN){
    try{
      var rr = rangoReps(e.reps), meta = (typeof WEEKS_META !== 'undefined' && WEEKS_META[c.w]) || {}, deload = !!meta.deload;
      var rir = rirNum(e.rir);
      if(rir == null){ var mr = /RIR\s*(\d+)/i.exec(meta.rpe || ''); rir = mr ? +mr[1] : 2; }
      var ult = ultimoRegistro(c, e, setN || 1);
      if(ult && !deload){
        var ref = ult.ref, previo = 'S' + (ult.w + 1) + ': ' + fmtKg(ref.kg) + ' kg' + (ref.reps ? ' × ' + ref.reps : '');
        if(!rr || !(ref.reps > 0)) return { kg: ref.kg, pre: !!rr, origen: rr ? 'progresion' : 'ultima', txt: 'Última vez · SEM ' + (ult.w + 1) + ' · ' + fmtKg(ref.kg) + ' kg' + (ref.reps ? ' × ' + ref.reps : '') };
        var rirReg = rirRegistrado(ult.clave), nota = '', pr;
        if(ult.w === 0 && c.w >= 1){
          /* Semanas 2, 3 y siguientes: la sobrecarga sale de lo registrado en la Semana 1 (S2 sube si en S1 llegaste al tope de reps con RIR de sobra; S3 sube más) */
          var llego = ref.reps >= rr.max, holgado = (rirReg == null || rirReg >= 1);
          var fac = c.w === 1 ? ((llego && holgado) ? 1.025 : 1) : ((llego && holgado) ? 1.05 : (rirReg === 0 ? 1 : 1.025));
          pr = fac === 1 ? { kg: ref.kg, sube: false, motivo: (llego && !holgado) ? 'fallo' : 'rango' } : { kg: Math.max(redondear(ref.kg * fac), ref.kg + 2.5), sube: true, motivo: 'tope' };
          /* ...pero nunca por debajo de lo que el alumno YA hizo en la semana inmediatamente anterior, ni por encima de lo que no pudo completar ahí */
          if(c.w >= 2){
            var prev = registroSemana(c, e, setN || 1, c.w - 1);
            if(prev && prev.ref.reps > 0){
              var pk = prev.ref.kg, sem = 'S' + (prev.w + 1);
              if(prev.ref.reps < rr.min){
                if(pr.kg > pk){ pr = { kg: pk, sube: false, motivo: 'rango' }; nota = ' · en ' + sem + ' no llegaste a ' + rr.min + ' reps con ' + fmtKg(pk) + ' kg: mantené'; }
              } else {
                var pp = progresion(prev.ref, rr, rirRegistrado(prev.clave), 1.025);
                if(pp.kg > pr.kg){ pr = { kg: pp.kg, sube: pp.sube, motivo: pp.motivo }; nota = ' · sobre lo que hiciste en ' + sem + ' (' + fmtKg(pk) + ' kg × ' + prev.ref.reps + ')'; }
                else if(pk > pr.kg){ pr = { kg: pk, sube: false, motivo: 'rango' }; nota = ' · no menos que lo que ya hiciste en ' + sem; }
              }
            }
          }
        } else {
          pr = progresion(ref, rr, rirReg, 1.025);
        }
        if(!pr.sube) return { kg: pr.kg, pre: true, origen: 'progresion', txt: 'Sugerido S' + (c.w + 1) + ' · mantené ' + fmtKg(pr.kg) + ' kg y buscá ' + rr.max + ' reps' + (pr.motivo === 'fallo' ? ' (marcaste RIR 0: sumá reservas antes de subir)' : '') + ' (' + previo + ')' + nota };
        return { kg: pr.kg, pre: true, origen: 'progresion', txt: 'Sugerido S' + (c.w + 1) + ' · ' + fmtKg(pr.kg) + ' kg (+' + fmtKg(Math.max(0, pr.kg - ref.kg)) + ')' + (ref.reps >= rr.max ? ' · llegaste a ' + ref.reps + ' reps' + (rirReg != null ? ' con RIR ' + rirReg : '') : '') + ' (' + previo + ')' + nota };
      }
      /* descarga: ~85% de la carga de la Semana 1 (va antes de la marca real, que ignoraría la base de la semana) */
      if(ult && deload){
        var kgD0 = redondear(ult.ref.kg * 0.85);
        return { kg: kgD0, pre: true, origen: 'descarga', txt: 'Descarga · ~85% de tu base de S' + (ult.w + 1) + ' (' + fmtKg(ult.ref.kg) + ' kg)' };
      }
      var real = e1rmReal(e.nombre);
      if(real > 0 && rr){
        var rm = (rr.min + rr.max) / 2, kg2 = redondear(real / (1 + (rm + rir) / 30));
        if(kg2 > 0) return { kg: kg2, pre: true, origen: 'real', txt: 'Según tu marca real · 1RM est. ' + fmtKg(Math.round(real)) + ' kg → ' + fmtKg(kg2) + ' kg para ' + e.reps + ' reps a RIR ' + (e.rir || rir) };
      }
      var mc = String(e.carga || '').match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:kgs?)?\s*$/i);
      if(mc) return { kg: parseFloat(mc[1].replace(',', '.')), pre: true, origen: 'coach', txt: 'Carga pautada · tocá ✓ para confirmar' };
      if(rr || e.rir) return { kg: 0, pre: false, origen: 'rir', txt: 'Sin carga previa · elegí un peso con RIR ' + (e.rir || rir) + ' (RPE ' + (10 - Math.round(rir)) + ')' };
    }catch(err){ console.warn('sugerir carga', err); }
    return null;
  };
  /* para los módulos de la tarjeta (referencia "Sem N: kg × reps"): mismo registro previo, también por nombre */
  window.jpRegistroPrevio = function(c, e, setN){ try{ return ultimoRegistro(c, e, setN || 1); }catch(err){ return null; } };
  /* ejercicio de una fila nativa: lo reconstruye del bloque de ESA semana */
  var cacheMeta = {};
  function metaEjercicio(w, dayId, blockId, idx){
    var ck = w + '|' + blockId;
    if(!cacheMeta[ck]){
      cacheMeta[ck] = {};
      try{
        var day = DAYS.filter(function(x){ return x.id === dayId; })[0], b = ((day && day.blocks) || []).filter(function(x){ return x.id === blockId; })[0];
        if(b && b.sportsPizarra && typeof window.parsearPizarraSB === 'function'){
          var lin = itemsDeSemana(b, w).filter(function(l){ return l != null && String(l).trim(); });
          window.parsearPizarraSB(lin, { titulo: b.title }).forEach(function(en, i){
            if(en.tipo === 'simple') cacheMeta[ck]['e' + i] = { idx: 'e' + i, nombre: en.titulo, sets: en.sets || 1, reps: en.reps || '', rir: String(en.rir || ''), carga: en.carga || '' };
            else if(en.tipo === 'biserie') (en.subs || []).forEach(function(sb, si){ cacheMeta[ck]['b' + i + 's' + si] = { idx: 'b' + i + 's' + si, nombre: sb.nombre, sets: en.rondas || 3, reps: sb.reps || '', rir: String(sb.rir != null ? sb.rir : (en.rir || '')), carga: sb.carga || '' }; });
          });
        }
      }catch(e){}
    }
    return cacheMeta[ck][idx] || null;
  }
  function sugerirFilas(root){
    $$('.jp-set-tracker-native', root).forEach(function(tr){
      if(tr.getAttribute('data-uxsug')) return;
      var fila = $('.jp-set-row-native[data-set-key]', tr); if(!fila) return;
      var p = fila.getAttribute('data-set-key').split('|'); if(p.length < 5) return;
      var w = parseInt(p[0], 10) || 0, e = metaEjercicio(w, p[1], p[2], p[3]); if(!e) return;
      tr.setAttribute('data-uxsug', '1');
      var primera = null;
      $$('.jp-set-row-native[data-set-key]', tr).forEach(function(r){
        var q = r.getAttribute('data-set-key').split('|'), n = parseInt(q[4], 10) || 1;
        var inp = $('.jp-val-primary', r); if(!inp || inp.value) return;
        var sg = window.jpSugerirCarga({ w: w, d: p[1], b: p[2] }, e, n);
        if(!sg) return;
        if(!primera) primera = sg;
        if(sg.kg > 0 && sg.origen !== 'ultima' && sg.origen !== 'coach') inp.placeholder = String(Math.round(sg.kg * 100) / 100);
      });
      if(primera && primera.txt && primera.origen !== 'coach' && !$('.jp-ux-sug', tr.parentNode)){
        var s = D.createElement('div'); s.className = 'jp-ux-sug jp-ux-sug-' + primera.origen; s.textContent = primera.txt;
        tr.parentNode.insertBefore(s, tr);
      }
    });
  }
  /* filas con referencia/insignia: dos líneas (nunca superpuestas); el resto, una sola línea compacta */
  function clasificarFilas(root){
    $$('.jp-set-row-native', root).forEach(function(r){
      var multi = !!r.querySelector('.jp-set-ref, .jp-sb-set-badge') || (($('.jp-set-pill', r) || {}).textContent || '').length > 9;
      r.classList.toggle('jp-ux-multi', multi); r.classList.toggle('jp-ux-simple', !multi);
    });
  }

  /* ---------- 7 · contador de bloques completados, en vivo ---------- */
  function actualizarContador(){
    var p = $('.day-view.active .jp-resumen-ses p'); if(!p || !/bloques completados/.test(p.textContent)) return;
    var bl = $$('.day-view.active .blocks-stack > .block'); if(!bl.length) return;
    var hechos = bl.filter(function(b){
      var id = b.getAttribute('data-block-id'), cb = $('.block-done-cb', b);
      try{ if(isBlockDone(state.currentWeek, state.currentDay, id)) return true; }catch(e){}
      return !!(cb && cb.checked);
    }).length;
    var txt = hechos + ' / ' + bl.length + ' bloques completados';
    if(p.textContent !== txt) p.textContent = txt;
  }
  D.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('.jp-done-btn, .jp-done-line, .block-check, .block-done-cb, #dayCompleteBtn, .jp-close-cta, .jp-cd-box')){
      setTimeout(actualizarContador, 120); setTimeout(actualizarContador, 500);
    }
  }, true);
  ['setBlockDone', 'setDayDone'].forEach(function(nombre){
    try{
      var orig = window[nombre];
      if(typeof orig === 'function' && !orig.__ux){
        window[nombre] = function(){ var r = orig.apply(this, arguments); setTimeout(actualizarContador, 30); return r; };
        window[nombre].__ux = 1;
      }
    }catch(e){}
  });

  /* ---------- 8 · Historial: buscador de ejercicios de la semana activa ---------- */
  function ejerciciosSemana(){
    var w = (typeof state !== 'undefined' && state.currentWeek) || 0, out = [], vistos = {};
    function limpio(n){ return String(n || '').replace(/^[A-Fa-f]\d{1,2}[.):\-]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+[x×]\s*$/i, '').trim(); }
    function valido(n){ n = String(n || '').trim(); if(!n || /^(?:d[ií]a|day)\s*\d+/i.test(n) || /^\d+\s*(?:sets?|series?|rondas?|x|×)/i.test(n) || /^(?:rest|tempo|rir|nota)\b/i.test(n)) return false; return n.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4; }
    function sumar(nombre, day, di, b, exIdx){
      if(!valido(nombre)) return;
      var nm = limpio(nombre), k = nrm2(nm); if(!k) return;
      if(vistos[k]){ if(vistos[k].dias.indexOf(di + 1) < 0) vistos[k].dias.push(di + 1); return; }
      vistos[k] = { nombre: nm, dias: [di + 1], dayId: day.id, id: day.id + '|' + b.id + '|' + exIdx };
      out.push(vistos[k]);
    }
    try{
      DAYS.forEach(function(day, di){
        (day.blocks || []).forEach(function(b){
          if(esCf()){
            if((b.category !== 'strength' && b.category !== 'accessory') || typeof window.jpCfListaEjercicios !== 'function') return;
            window.jpCfListaEjercicios(itemsDeSemana(b, w).filter(Boolean)).forEach(function(x, i){ sumar(x.nombre, day, di, b, 'cf' + i); });
            return;
          }
          if(!b.sportsPizarra || typeof window.parsearPizarraSB !== 'function') return;
          var lin = itemsDeSemana(b, w).filter(function(l){ return l != null && String(l).trim(); });
          window.parsearPizarraSB(lin, { titulo: b.title }).forEach(function(en, idx){
            if(en.tipo === 'simple' && en.sets) sumar(en.titulo, day, di, b, 'e' + idx);
            else if(en.tipo === 'biserie') (en.subs || []).forEach(function(s, si){ sumar(s.nombre, day, di, b, 'b' + idx + 's' + si); });
          });
        });
      });
    }catch(e){}
    return out;
  }
  function crearBuscador(input, alElegir, estricto){
    if(!input || input.getAttribute('data-uxcb')) return;
    input.setAttribute('data-uxcb', '1');
    input.setAttribute('autocomplete', 'off');
    var caja = D.createElement('div'); caja.className = 'jp-ux-cb';
    input.parentNode.insertBefore(caja, input); caja.appendChild(input);
    var lista = D.createElement('div'); lista.className = 'jp-ux-cb-list'; lista.setAttribute('role', 'listbox'); caja.appendChild(lista);
    var vacio = D.createElement('div'); vacio.className = 'jp-ux-cb-msg'; vacio.hidden = true; caja.appendChild(vacio);
    function pintar(){
      var q = nrm2(input.value), toks = q ? q.split(' ') : [], todos = ejerciciosSemana();
      var res = todos.filter(function(x){ var n = nrm2(x.nombre); return toks.every(function(t){ return n.indexOf(t) >= 0; }); });
      lista.innerHTML = res.length ? res.map(function(x, i){
        return '<button type="button" role="option" data-i="' + i + '"><span>' + x.nombre.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span><em>' + x.dias.map(function(n){ return 'D' + n; }).join(' · ') + '</em></button>';
      }).join('') : '<div class="jp-ux-cb-nada">' + (todos.length ? 'Ningún ejercicio de esta semana coincide' : 'Esta semana no tiene ejercicios cargados') + '</div>';
      lista._res = res; caja.classList.add('abierta');
    }
    input.addEventListener('focus', pintar);
    input.addEventListener('input', function(){ input.removeAttribute('data-pick'); vacio.hidden = true; pintar(); });
    lista.addEventListener('mousedown', function(e){ e.preventDefault(); });
    lista.addEventListener('click', function(e){
      var b = e.target.closest('button[data-i]'); if(!b) return;
      var x = lista._res[+b.getAttribute('data-i')]; if(!x) return;
      input.value = x.nombre; input.setAttribute('data-pick', x.nombre); caja.classList.remove('abierta'); vacio.hidden = true;
      if(alElegir) alElegir(x);
    });
    D.addEventListener('click', function(e){ if(!caja.contains(e.target)) caja.classList.remove('abierta'); });
    input._uxValida = function(){
      if(!estricto) return true;
      var todos = ejerciciosSemana(); if(!todos.length) return true;
      var q = nrm2(input.value);
      var ok = !!q && todos.some(function(x){ return nrm2(x.nombre) === q; });
      vacio.hidden = ok; vacio.textContent = 'Elegí un ejercicio de la lista: solo aparecen los de tu semana activa.';
      return ok;
    };
  }
  function montarHistorial(){
    var ex = $('#phEx');
    if(ex && !ex.getAttribute('data-uxcb')){
      ex.placeholder = 'Buscar ejercicio de tu semana…';
      crearBuscador(ex, function(){ var kg = $('#phKg'); if(kg) setTimeout(function(){ kg.focus(); }, 30); }, true);
    }
    var prog = $('#phPaneProg'), sel = $('#phProgSel');
    if(prog && sel && !$('#phProgQ')){
      var q = D.createElement('input'); q.type = 'text'; q.id = 'phProgQ'; q.className = 'ph-sel jp-ux-q'; q.placeholder = 'Buscar ejercicio de tu semana…'; q.setAttribute('aria-label', 'Buscar ejercicio');
      sel.parentNode.insertBefore(q, sel);
      crearBuscador(q, function(x){
        var pill = $('#phDays [data-phday="' + x.dayId + '"]'); if(pill) pill.click();
        setTimeout(function(){ sel.value = x.id; sel.dispatchEvent(new Event('change', { bubbles: true })); q.value = ''; }, 30);
      }, false);
    }
  }
  /* guardar a mano solo con un ejercicio de la lista */
  D.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('#phSave') : null; if(!b) return;
    var ex = $('#phEx'); if(ex && ex._uxValida && !ex._uxValida()){ e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* ---------- orquestación ---------- */
  var tm = 0;
  function pasada(){
    tm = 0;
    if(!esSb() && !esCf()) return;
    try{ montarMenu(); }catch(e){ console.warn('ux menu', e); }
    var raiz = $('#mainContent') || D.body;
    try{ mejorarActivacion(raiz); }catch(e1){ console.warn('ux activacion', e1); }
    try{ if(esCf()){ normalizarCf(raiz); indicesCf(raiz); cargasUnicas(raiz); $$('.jp-cfboard .jp-cf-row', raiz).forEach(function(r){ if(!r.classList.contains('jp-ux-tc') && /^\W*time\s*cap\b/i.test(r.textContent)) r.classList.add('jp-ux-tc'); }); videosEnLineaCf(raiz); mejorarPautasCf(raiz); memoriaScore(raiz); fusionarScore(raiz); } else { videosEnLinea(raiz); mejorarPautas(raiz); } }catch(e2){ console.warn('ux contenido', e2); }
    try{ if(esSb()){ clasificarFilas(raiz); sugerirFilas(raiz); actualizarContador(); } montarHistorial(); briefingJerarquia(raiz); }catch(e4){ console.warn('ux registro', e4); }
  }
  function programar(){ if(tm) return; tm = setTimeout(pasada, 90); }
  /* cabecera: el alto publicado en --hdc-h sigue al alto REAL (nombre en 2 lineas, fuente que carga tarde, escala de texto), nunca queda viejo */
  function medirHdr(){
    var hd = D.getElementById('hdCompact'); if(!hd) return;
    var h = hd.getBoundingClientRect().height;
    if(h > 0) D.documentElement.style.setProperty('--hdc-h', Math.ceil(h) + 'px');
  }
  function vigilarHdr(){
    var hd = D.getElementById('hdCompact'); if(!hd || hd.getAttribute('data-uxhdr')) return;
    hd.setAttribute('data-uxhdr', '1');
    try{ if(window.ResizeObserver) new ResizeObserver(medirHdr).observe(hd); }catch(e){}
    try{ if(D.fonts && D.fonts.ready) D.fonts.ready.then(medirHdr); }catch(e2){}
    window.addEventListener('resize', medirHdr, { passive: true });
    window.addEventListener('orientationchange', function(){ setTimeout(medirHdr, 80); });
    window.addEventListener('load', medirHdr);
    [300, 1200, 2500].forEach(function(ms){ setTimeout(medirHdr, ms); });
    medirHdr();
  }
  function iniciar(){
    vigilarHdr();
    pasada();
    try{ new MutationObserver(programar).observe(D.body, { childList: true, subtree: true }); }catch(e){}
  }
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
