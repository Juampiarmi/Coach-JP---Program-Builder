(function(){
  function q(id){ return document.getElementById(id); }

  /* ---------- publica la altura real de la cabecera de 2 niveles en
     --hdc-h, para que el drawer "Perfil/Info" (position:fixed) arranque
     justo debajo sin importar si el nombre del atleta ocupa 1 o 2 líneas
     ni el alto real de la safe-area del dispositivo ---------- */
  function medirCabecera(){
    var hd = q('hdCompact');
    if(!hd) return;
    var h = hd.getBoundingClientRect().height;
    if(h > 0) document.documentElement.style.setProperty('--hdc-h', h + 'px');
  }

  /* ---------- FIX (28/08, rail de escritorio): publica el alto real del
     bloque de progreso (anillo, solo visible en escritorio, min-width:1024)
     en --rail-prog-h, para que .hd-dock (sticky, ver @media min-width:1024
     más abajo) sepa dónde empieza su propio "top" sin pisar el anillo de
     arriba. Mismo patrón que medirCabecera()/--hdc-h. En mobile
     .progress-bar-wrap mide 0 (display:none del anillo) — inocuo, esa
     variable no se usa fuera del media query de escritorio. ---------- */
  function medirRail(){
    var pw = document.querySelector('.progress-bar-wrap');
    if(!pw) return;
    var h = pw.getBoundingClientRect().height;
    if(h > 0) document.documentElement.style.setProperty('--rail-prog-h', h + 'px');
  }

  /* ---------- cabecera compacta: reparenta el selector de días real (misma
     instancia de DOM que renderDayTabs() ya sabe repintar, sin duplicar nada) ---------- */
  function montarCompacta(){
    var wrap = q('hdcDaysWrap');
    var tabsWrap = document.querySelector('.week-tabs-wrap');
    if(wrap && tabsWrap && tabsWrap.parentNode !== wrap){ wrap.appendChild(tabsWrap); }
    /* reconciliación (merge Concepto F + directiva de accesibilidad): el
       drawer de Perfil/Info ahora tiene DOS disparadores -- el ícono (i)
       de siempre (#hdcInfoBtn) y, además, el chip de semana
       (#weekActiveBadge, "Entrenando en: Semana X"), que ya vive fijo
       arriba del selector de días. Mismo drawer, mismo cableado, sin
       duplicar el panel. */
    var drawer = q('hdFullDrawer');
    /* .hd-wrap tiene position:relative + z-index:3 (regla vieja, ~línea 5990),
       lo que le crea su propio "stacking context" — cualquier elemento fixed
       ADENTRO de .hd-wrap queda atrapado bajo ese contexto sin importar su
       propio z-index, y pinta por DEBAJO de elementos externos con z-index
       mucho más bajo (ej. .week-selector-wrap, z-index:70). Por eso el drawer
       de Perfil se veía "transparentado" por las pills de semana al abrirlo.
       Fix: reparentarlo a <body> una sola vez, así su z-index:290 compite en
       el stacking context real de nivel documento. */
    if(drawer && drawer.parentElement !== document.body){ document.body.appendChild(drawer); }
    /* nota de reconciliación: #weekActiveBadge quedó deprecado por la
       directiva crítica "workout-first" (ver renderWeekActiveBadge(), más
       arriba) -- su wrap sigue con display:none a propósito y el chip de
       semana real es ahora .wpc-current (renderWeekSelector()), que abre
       #weekInfoModal, no este drawer. #hdcInfoBtn es el único disparador
       real de Perfil/Info. */
    var infoBtn = q('hdcInfoBtn');
    if(infoBtn && drawer && !infoBtn.dataset.hdWired){
      infoBtn.dataset.hdWired = '1';
      infoBtn.addEventListener('click', function(e){
        e.stopPropagation();
        drawer.classList.toggle('on');
      });
      document.addEventListener('click', function(e){
        if(drawer.classList.contains('on') && !e.target.closest('.hd-full-drawer') && !e.target.closest('#hdcInfoBtn')){
          drawer.classList.remove('on');
        }
      });
    }
    medirCabecera();
    medirRail();
    montarPerfil();
  }

  /* ---------- panel de perfil rediseñado (26/08): NO reimplementa nada.
     Reparenta (mueve, no clona) los controles reales que ya funcionan
     (#modeSwitch, #guideBtn, el botón de instalar que arma pwaBoton() en
     otro módulo) hacia las filas del panel nuevo, y cablea el switch de
     KG/LBS contra la misma API pública CoachUnidad.fijar() que usa el
     dock. Cero mutación de datos/Supabase: solo mueve nodos del DOM y
     lee localStorage(STORAGE_KEY) para el indicador de guardado local. ---------- */
  function montarPerfil(){
    var modeSlot = q('hdpModeSlot');
    var modeSwitch = document.getElementById('modeSwitch');
    if(modeSlot && modeSwitch && modeSwitch.parentNode !== modeSlot){ modeSlot.appendChild(modeSwitch); }

    var guideSlot = q('hdpGuideSlot');
    var guideBtn = document.getElementById('guideBtn');
    if(guideSlot && guideBtn && guideBtn.parentNode !== guideSlot){ guideSlot.appendChild(guideBtn); }
    /* directiva maestra ("Perfil"): la Guía pasa a ser una tarjeta completa interactiva */
    if(guideBtn && !guideBtn.dataset.cardOk){
      guideBtn.dataset.cardOk = '1';
      guideBtn.classList.add('gd-card-btn');
      guideBtn.innerHTML = '<span class="gcb-ic">📖</span><span class="gcb-tx"><b>MANUAL &amp; GUÍA DE ENTRENAMIENTO</b><small>(RPE/RIR, Zonas FC y Glosario)</small></span><span class="gcb-chev">›</span>';
    }

    var notaSlot = q('hdpNotaSlot');
    var notaPill = document.getElementById('notaMesoPill');
    if(notaSlot && notaPill && notaPill.parentNode !== notaSlot){ notaSlot.appendChild(notaPill); }

    var installSlot = q('hdpInstallSlot');
    var pwaWrap = document.querySelector('.pwa-wrap');
    if(installSlot && pwaWrap && pwaWrap.parentNode !== installSlot){ installSlot.appendChild(pwaWrap); }

    /* Bóveda de PRs: abre el hub de récords ya existente (window.CoachHubUI,
       montado por otro módulo) — cierra este drawer primero porque el hub
       (z-index 220) queda tapado por el drawer (z-index 290) si ambos
       quedan abiertos a la vez. */
    var prVaultBtn = q('hdpPrVaultBtn');
    /* directiva ("Bóveda de PRs Benchmark") -- en CrossFit la bóveda
       relevante es el 1RM por levantamiento madre (Snatch/Clean & Jerk/
       Back Squat/Deadlift/...), no la curva de e1RM por serie levantada
       que usa Bodybuilding -- mismo botón, destino distinto según
       disciplina. Bodybuilding sigue exactamente igual. */
    if(prVaultBtn && window.COACH_DISCIPLINA !== 'sports'){
      var ttPrs = prVaultBtn.querySelector('.tt');
      if(ttPrs) ttPrs.textContent = 'Bóveda de PRs Benchmark';
    }
    /* directiva ("3 tarjetas tácticas limpias: Perfil & Briefing Semanal,
       Bóveda de PRs Benchmark, Preferencias") -- "Ajustes y utilidades"
       pasa a llamarse "Preferencias" en CrossFit ahora que sólo le
       quedan las filas de Unidad KG/LBS, Guía e Instalar PWA (el resto
       se ocultó arriba en CSS, body.cf-disc #hdpModeSlot/#hdpFzSlot/
       #hdpQtSlot). Bodybuilding conserva el rótulo original. */
    var settingsLb = q('hdpSettingsLb');
    if(settingsLb && window.COACH_DISCIPLINA !== 'sports') settingsLb.textContent = 'Preferencias';
    if(prVaultBtn && !prVaultBtn.dataset.hdWired){
      prVaultBtn.dataset.hdWired = '1';
      prVaultBtn.addEventListener('click', function(e){
        e.stopPropagation();
        var drawer = q('hdFullDrawer');
        if(drawer) drawer.classList.remove('on');
        if(window.COACH_DISCIPLINA !== 'sports' && typeof window.jpAbrirListaPRs === 'function'){ window.jpAbrirListaPRs(); return; }
        if(window.CoachHubUI && typeof window.CoachHubUI.abrir === 'function') window.CoachHubUI.abrir();
      });
    }

    var uniToggle = q('hdpUniToggle');
    if(uniToggle && !uniToggle.dataset.hdWired){
      uniToggle.dataset.hdWired = '1';
      uniToggle.addEventListener('click', function(e){
        var b = e.target.closest('[data-u]');
        if(!b || !window.CoachUnidad) return;
        window.CoachUnidad.fijar(b.dataset.u);
      });
    }
    pintarUniPerfil();

    /* directiva ("Motor de Retroalimentación Háptica & Sonido Táctico")
       -- switch discreto en Ajustes: lee/escribe la MISMA clave
       jp_audio_muted que ya usa isAudioMuted() (playBeep, ver AUDIO más
       arriba) y el chip VOZ del Custom WOD Timer -- un solo
       interruptor real, sin duplicar estado. */
    var audioToggle = q('hdpAudioToggle');
    if(audioToggle && !audioToggle.dataset.hdWired){
      audioToggle.dataset.hdWired = '1';
      audioToggle.addEventListener('click', function(e){
        var b = e.target.closest('[data-audio]');
        if(!b) return;
        try{ localStorage.setItem('jp_audio_muted', b.dataset.audio === 'off' ? '1' : '0'); }catch(err){}
        pintarAudioPerfil();
        try{ if(window.CoachVibra) window.CoachVibra.toque(); }catch(err){}
      });
    }
    pintarAudioPerfil();

    var closeBtn = q('hdpClose');
    var drawer = q('hdFullDrawer');
    if(closeBtn && drawer && !closeBtn.dataset.hdWired){
      closeBtn.dataset.hdWired = '1';
      closeBtn.addEventListener('click', function(e){ e.stopPropagation(); drawer.classList.remove('on'); });
    }

    var badge = q('hdcProgramBadge');
    var src = document.getElementById('heroEyebrow');
    if(badge && src && src.textContent) badge.textContent = src.textContent;

    /* acordeones "elegantes" — un solo listener delegado sobre el panel
       entero, no uno por acordeón (mismo criterio de rendimiento aplicado
       en el Builder del dashboard, 8vo pedido: nada de listeners sueltos
       que se re-agreguen en cada mount()). Varios pueden quedar abiertos
       a la vez, sin exclusividad — es un panel de consulta, no un wizard. */
    var panel = q('hdpPanel');
    if(panel && !panel.dataset.hdAccWired){
      panel.dataset.hdAccWired = '1';
      panel.addEventListener('click', function(e){
        var s = e.target.closest('.hdp-acc-summary'); if(!s) return;
        var acc = s.closest('.hdp-acc'); if(!acc) return;
        acc.classList.toggle('open');
      });
    }

    pintarMesoCurva();
    pintarObjetivos();
    pintarMetodologia();
    pintarNutricion();
    pintarSync();
    pintarPago();
    pintarVigenciaPlan();
  }
  /* Chapa local: PCT_MESO (la curva de intensidad por defecto S1→S4) vive
     del lado del dashboard (fuera de TEMPLATE_HTML) porque ahí se usa para
     precomputar los kg reales de cada bloque. Acá adentro, en el documento
     exportado, no existe ese identificador — se replica el mismo array
     sólo para el badge informativo de la tarjeta de Identidad y el acordeón
     de Metodología. Si el coach cambió el % de un bloque puntual con
     "weekPct", ese bloque no se refleja acá — este badge es la curva
     ESTÁNDAR del mesociclo, no un promedio exacto de todos los bloques. */
  var PCT_CURVA = [70, 78, 85, 60];
  function escAcc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function pintarMesoCurva(){
    var el = q('hdpMesoCurve'); if(!el) return;
    var cfg = (typeof PROGRAM_CONFIG !== 'undefined') ? PROGRAM_CONFIG : {};
    if(cfg.modoSemanal){
      el.innerHTML = '<span class="hdp-curve-tag">🧩 CrossFit · modular semana a semana</span>';
      return;
    }
    var weeks = cfg.weeks || [];
    if(!weeks.length){ el.innerHTML = ''; return; }
    var curWeek = (typeof state !== 'undefined' && typeof state.currentWeek === 'number') ? state.currentWeek : 0;
    var nivel = (cfg.mesoNivel || '').toUpperCase();
    var chips = weeks.map(function(w, i){
      var pct = (PCT_CURVA[i] != null) ? (PCT_CURVA[i] + '%') : '';
      var lb = (w.short || ('S' + (i + 1))) + (pct ? ' ' + pct : '');
      return '<span class="hdp-curve-chip' + (i === curWeek ? ' cur' : '') + '">' + escAcc(lb) + '</span>';
    }).join('');
    el.innerHTML = (nivel ? '<span class="hdp-curve-lb">Mesociclo ' + escAcc(nivel) + '</span>' : '') +
      '<div class="hdp-curve-row">' + chips + '</div>';
  }
  function pintarObjetivos(){
    var box = q('hdpObjetivosBody'); if(!box) return;
    var cfg = (typeof PROGRAM_CONFIG !== 'undefined') ? PROGRAM_CONFIG : {};
    var o = cfg.objetivos || {};
    var partes = [];
    if(o.foco) partes.push('<p><span class="hdp-acc-k">🎯 Foco actual</span>' + escAcc(o.foco) + '</p>');
    if(o.compat) partes.push('<p><span class="hdp-acc-k">🔄 A tener en cuenta</span>' + escAcc(o.compat) + '</p>');
    if((o.tags||[]).length) partes.push('<p><span class="hdp-acc-k">🦴 Antecedentes</span>' + o.tags.map(escAcc).join(' · ') + '</p>');
    if((o.preferidos||[]).length) partes.push('<p><span class="hdp-acc-k">⭐ Priorizamos</span>' + o.preferidos.map(escAcc).join(' · ') + '</p>');
    /* directiva ("Regla Zero-Empty") -- sin nada cargado, el acordeón
       entero desaparece en vez de mostrar un texto de disculpa ("Tu
       coach todavía no cargó..."); el atleta nunca abre un panel para
       encontrarse con una excusa, directamente no lo ve. */
    var acc = q('hdpAccObjetivos');
    if(partes.length){
      box.innerHTML = partes.join('');
      if(acc) acc.style.display = '';
    } else {
      box.innerHTML = '';
      if(acc) acc.style.display = 'none';
    }
  }
  /* directiva ("Limpieza del Modal de Ficha Técnica / Ajustes") -- en
     CrossFit el texto de RIR/RPE (jerga de hipertrofia de Bodybuilding,
     no aplica a la prescripción de CrossFit) se reemplaza por completo:
     "ESTRATEGIA & ENFOQUE DE LA SEMANA" (p.meta.cfEstrategia, campo
     editable nuevo del Builder, ver "Athlete Tactical Profile") +
     "Briefing Metodológico del Día" (day.briefing, el MISMO texto que
     el micro-badge colapsable de la pantalla principal -- acá vive
     completo, sin recortar el scroll inicial). Bodybuilding no cambia
     un solo carácter de su sección. */
  function pintarMetodologia(){
    var box = q('hdpMetodoBody'); if(!box) return;
    var cfg = (typeof PROGRAM_CONFIG !== 'undefined') ? PROGRAM_CONFIG : {};
    var tt = q('hdpMetodoTt');
    var acc = q('hdpAccMetodo');
    if(cfg.disciplina === 'crossfit' || cfg.modoSemanal){
      if(tt) tt.textContent = 'Estrategia & Enfoque de la Semana';
      /* directiva ("Limpieza de Duplicados") -- "Briefing Metodológico
         del Día" (day.briefing) ya vive en la pantalla principal, ANTES
         del WOD, como el chip colapsable "⚡ Briefing del Coach"
         (.tactical-briefing, ver renderMain()) -- repetirlo acá adentro
         de la credencial era el mismo texto dos veces. Se retira de
         este acordeón, que ahora sólo muestra la Estrategia de la
         Semana (cfEstrategia), dato que NO vive en ningún otro lado.
         Regla "Zero-Empty": sin cfEstrategia cargada, el acordeón entero
         desaparece en vez de mostrar una disculpa. */
      if(cfg.cfEstrategia){
        box.innerHTML = '<p>' + escAcc(cfg.cfEstrategia) + '</p>';
        if(acc) acc.style.display = '';
      } else {
        box.innerHTML = '';
        if(acc) acc.style.display = 'none';
      }
      return;
    }
    if(acc) acc.style.display = '';
    var weeks = cfg.weeks || [];
    var curWeek = (typeof state !== 'undefined' && typeof state.currentWeek === 'number') ? state.currentWeek : 0;
    var html = '';
    if(cfg.nota && cfg.nota.foco){
      html += '<p>' + escAcc(cfg.nota.foco) + '</p>';
      if(cfg.nota.adaptacion) html += '<p>' + escAcc(cfg.nota.adaptacion) + '</p>';
    } else {
      html += '<p>Tu programa avanza con una periodización ondulada: cada semana sube o baja el estímulo a propósito, no al azar — la idea es acumular fatiga productiva y disiparla antes de que se vuelva improductiva.</p>';
    }
    if(weeks.length){
      html += '<div class="hdp-week-rows">' + weeks.map(function(w, i){
        var pct = (PCT_CURVA[i] != null) ? (PCT_CURVA[i] + '%') : '';
        return '<div class="hdp-wk-row' + (i === curWeek ? ' cur' : '') + '">' +
          '<span class="n">' + escAcc(w.short || ('S' + (i+1))) + '</span>' +
          '<span class="p">' + escAcc(w.phase || w.name || '') + '</span>' +
          (pct ? '<span class="pc">' + pct + '</span>' : '') +
        '</div>';
      }).join('') + '</div>';
    }
    html += '<p class="hdp-acc-note">RIR (repeticiones en reserva) y RPE (esfuerzo percibido) miden lo mismo desde dos ángulos: si tu coach pide RIR 2, cerrá cada serie sintiendo que te quedaban 2 repeticiones más en el tanque — ni una serie a fallo que no corresponde, ni una serie liviana que no estimula.</p>';
    box.innerHTML = html;
  }
  function pintarNutricion(){
    var box = q('hdpNutricionBody'); if(!box) return;
    var cfg = (typeof PROGRAM_CONFIG !== 'undefined') ? PROGRAM_CONFIG : {};
    var plan = cfg.nutriPlan;
    if(!plan || (plan.modo !== 'externo' && !plan.macros)){
      box.innerHTML = '<p class="hdp-acc-empty">ℹ️ Plan nutricional no asignado actualmente.</p>';
      return;
    }
    /* plan externo pegado por el coach: sin macros calculados, se muestra
       directo el botón a la tarjeta con el documento estructurado. */
    if(plan.modo === 'externo'){
      box.innerHTML = '<p class="hdp-acc-empty" style="padding-bottom:8px">📄 Tu coach cargó tu plan armado por un nutricionista externo.</p>' +
        '<button type="button" class="hdp-nutri-btn" id="hdpNutriOpen">📋 Ver Plan de Alimentación Completo</button>';
      var btnExt = q('hdpNutriOpen');
      if(btnExt) btnExt.addEventListener('click', function(){
        if(window.CoachNutricion) window.CoachNutricion.abrir();
      });
      return;
    }
    var m = plan.macros.entreno || {};
    var kcal = (plan.meta && plan.meta.kcal_entreno) || '';
    box.innerHTML =
      '<div class="hdp-nutri-summary">' +
        (kcal ? '<div class="hdp-nutri-kcal">' + escAcc(kcal) + '<span> kcal / día de entreno</span></div>' : '') +
        '<div class="hdp-nutri-macros">' +
          '<span><b>' + (m.prot_g||0) + 'g</b>Proteína</span>' +
          '<span><b>' + (m.carb_g||0) + 'g</b>Carbos</span>' +
          '<span><b>' + (m.gras_g||0) + 'g</b>Grasas</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="hdp-nutri-btn" id="hdpNutriOpen">📋 Ver Plan de Alimentación Completo</button>';
    var btn = q('hdpNutriOpen');
    if(btn) btn.addEventListener('click', function(){
      if(window.CoachNutricion) window.CoachNutricion.abrir();
    });
  }
  /* pedido 41 · micro-badge de vencimiento de cuota. payDue viaja como
     fecha ISO ("YYYY-MM-DD", el formato nativo de <input type=date>) en
     PROGRAM_CONFIG.payDue -- ver buildProgramConfig(ath) del lado del
     Builder, y desde directiva14 también se recalcula solo con cada
     "Registrar Pago" (ver finRegistrarPago(), fuera de TEMPLATE_HTML).
     Es siempre el payDue puntual de ESE atleta -- nunca un fallback
     estático compartido -- y si no hay ninguna fecha cargada el chip
     no inventa una: cae al estado neutro "Plan Activo" (ver más abajo). */
  function fmtFechaCortaISO(iso){
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? (m[3] + '/' + m[2]) : '';
  }
  /* directiva9 -- ahora con 3 estados (antes sólo ok/venc): "proximo" cubre
     los últimos días antes del vencimiento, con el mismo umbral (5 días)
     que ya usa el panel de cobros del coach para su propia franja de
     "próximo a vencer", por consistencia de criterio -- payDue sigue
     siendo un campo totalmente aparte de ese panel. */
  var HDP_PROXIMO_DIAS = 5;
  function estadoAbono(due){
    var corta = fmtFechaCortaISO(due);
    if(!due || !corta) return null;
    var venc = new Date(due + 'T00:00:00');
    if(isNaN(venc.getTime())) return null;
    var hoy = new Date(); hoy.setHours(0,0,0,0);
    var diffDias = Math.round((venc.getTime() - hoy.getTime()) / 86400000);
    var estado = diffDias < 0 ? 'venc' : (diffDias <= HDP_PROXIMO_DIAS ? 'proximo' : 'ok');
    return { estado: estado, corta: corta };
  }
  /* boton de pago de Mercado Pago: aparece cuando la cuota esta vencida o proxima a vencer y el coach cargo/genero el link */
  function fmtMontoPago(m, mon){
    var n = Number(m) || 0; if(!(n > 0)) return '';
    var s = (Math.round(n * 100) / 100).toLocaleString('es-AR');
    return (mon && mon !== 'ARS') ? (mon + ' ' + s) : ('$ ' + s);
  }
  function copiarTextoPago(t, listo){
    function alt(){
      try{
        var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
        document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, t.length);
        var ok = document.execCommand('copy'); ta.remove(); listo(!!ok);
      }catch(e){ listo(false); }
    }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(function(){ listo(true); }, alt); }
    else alt();
  }
  /* pago por transferencia: tarjeta con el monto exacto de la cuota, el alias de cobro y el titular, con copia al portapapeles en un toque */
  function abrirPagoAlias(cfg){
    var viejo = q('jpPagoModal'); if(viejo) viejo.remove();
    var alias = String(cfg.payAlias || '').trim(); if(!alias) return;
    var titular = String(cfg.payTitular || '').trim(), monto = fmtMontoPago(cfg.payMonto, cfg.payMoneda);
    var tel = String(cfg.coachPhone || '').replace(/\D/g, '');
    var wa = tel ? 'https://wa.me/' + tel + '?text=' + encodeURIComponent('Hola! Te envío el comprobante de la transferencia de mi cuota' + (monto ? ' (' + monto + ')' : '') + '. ' + (cfg.athleteName || '')) : '';
    var ov = document.createElement('div'); ov.id = 'jpPagoModal'; ov.className = 'jp-pm';
    ov.innerHTML = '<div class="jp-pm-card" role="dialog" aria-modal="true" aria-label="Pagar cuota por transferencia">' +
      '<button type="button" class="jp-pm-x" data-pm="x" aria-label="Cerrar">\u00d7</button>' +
      '<div class="jp-pm-k">TRANSFERENCIA BANCARIA</div>' +
      (monto ? '<div class="jp-pm-monto">' + escAcc(monto) + '</div><div class="jp-pm-sub">Monto exacto de tu cuota</div>'
             : '<div class="jp-pm-sub">Consultá el monto de tu cuota con tu coach</div>') +
      '<button type="button" class="jp-pm-alias" data-pm="copy" aria-label="Copiar alias"><span class="jp-pm-lb">ALIAS</span><b>' + escAcc(alias) + '</b></button>' +
      (titular ? '<div class="jp-pm-tit"><span>TITULAR</span>' + escAcc(titular) + '</div>' : '') +
      '<button type="button" class="jp-pm-copy" data-pm="copy">COPIAR ALIAS</button>' +
      '<div class="jp-pm-hint">Copiá el alias, abrí tu app bancaria o billetera, elegí <b>Transferir</b>, pegalo e ingresá el monto. Después enviá el comprobante a tu coach.</div>' +
      (wa ? '<a class="jp-pm-wa" href="' + escAcc(wa) + '" target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>' : '') +
      '</div>';
    document.body.appendChild(ov);
    var btn = ov.querySelector('.jp-pm-copy'), t0 = null;
    ov.addEventListener('click', function(e){
      var a = e.target.closest ? e.target.closest('[data-pm]') : null;
      if(e.target === ov || (a && a.getAttribute('data-pm') === 'x')){ ov.remove(); return; }
      if(!a || a.getAttribute('data-pm') !== 'copy') return;
      copiarTextoPago(alias, function(ok){
        try{ if(ok && navigator.vibrate) navigator.vibrate(25); }catch(e2){}
        btn.classList.toggle('ok', ok);
        btn.textContent = ok ? '\u2713 ALIAS COPIADO' : 'MANTENÉ APRETADO EL ALIAS PARA COPIARLO';
        clearTimeout(t0); t0 = setTimeout(function(){ btn.classList.remove('ok'); btn.textContent = 'COPIAR ALIAS'; }, 2400);
      });
    });
  }
  function pintarPagoCta(info, cfg){
    var alias = String(cfg.payAlias || '').trim(), box = q('jpPagoCta');
    if(!alias || !info || info.estado === 'ok'){ if(box) box.remove(); return; }
    var monto = fmtMontoPago(cfg.payMonto, cfg.payMoneda);
    if(!box){
      box = document.createElement('div'); box.id = 'jpPagoCta';
      var wrap = document.querySelector('.hd-wrap');
      if(wrap && wrap.parentNode) wrap.parentNode.insertBefore(box, wrap.nextSibling); else document.body.insertBefore(box, document.body.firstChild);
    }
    box.className = 'jp-pago-cta ' + info.estado;
    box.innerHTML = '<span class="jp-pago-msg"><i></i>' + (info.estado === 'venc' ? 'VENCIDA' : 'VENCE') + ' \u00b7 ' + escAcc(info.corta) + '</span>' +
      '<button type="button" class="jp-pago-btn" id="jpPagoBtn">\ud83d\udcb3 PAGAR CUOTA' + (monto ? ' \u00b7 ' + escAcc(monto) : '') + '</button>';
    var b = q('jpPagoBtn'); if(b) b.onclick = function(){ abrirPagoAlias(cfg); };
  }
  function pintarPago(){
    var elDrawer = q('hdpPay'), elChip = q('hdcPayChip');
    if(!elDrawer && !elChip) return;
    var cfg = (typeof PROGRAM_CONFIG !== 'undefined') ? PROGRAM_CONFIG : {};
    var info = estadoAbono(cfg.payDue || '');
    try{ pintarPagoCta(info, cfg); }catch(errPago){}
    if(!info){
      // directiva14 · sin fecha cargada para ESTE atleta puntual: nada de
      // inventar un vencimiento -- el chip de la cabecera cae a un estado
      // neutro "Plan Activo" (el drawer de Perfil/Info se deja vacío como
      // antes, no es el elemento que pide la directiva).
      if(elDrawer) elDrawer.innerHTML = '';
      /* directiva ("Refactoring maestro UI/UX Sports: unificación de badges
         de estado") -- ambos chips de la cabecera (cuota y vigencia del
         ciclo) compartían la MISMA pastilla verde genérica .hdc-pay-b:
         cuando los dos traían contenido se veían como dos pastillas
         idénticas apiladas, redundantes. Reemplazo por jerarquía propia
         (.jp-status-pill = estado primario, oro táctico cuando está al
         día; .jp-status-cycle = dato secundario, titanio apagado, sin
         pastilla) -- una sola línea compacta, nunca dos cápsulas iguales. */
      if(elChip) elChip.innerHTML = '<span class="jp-status-pill jp-status-active">\u26a1 ACTIVO</span>';
      return;
    }
    if(elDrawer){
      elDrawer.innerHTML = info.estado === 'venc'
        ? '<span class="hdp-pay-b venc">💳 Cuota vencida el ' + escAcc(info.corta) + '</span>'
        : info.estado === 'proximo'
          ? '<span class="hdp-pay-b proximo">💳 Renueva el ' + escAcc(info.corta) + '</span>'
          : '<span class="hdp-pay-b ok">💳 Plan activo · Renueva el ' + escAcc(info.corta) + '</span>';
    }
    /* micro-badge sutil junto al nombre, en la cabecera siempre visible
       (no sólo dentro del drawer Perfil/Info) -- pedido explícito de
       ubicación de la directiva. directiva14: los 3 estados con fecha
       siempre muestran el DD/MM puntual de ESE atleta -- antes "próximo"
       y "vencido" no mostraban fecha alguna en el chip. */
    if(elChip){
      elChip.innerHTML = info.estado === 'venc'
        ? '<span class="jp-status-pill jp-status-venc">\u26a1 VENCIDO ' + escAcc(info.corta) + '</span>'
        : info.estado === 'proximo'
          ? '<span class="jp-status-pill jp-status-proximo">\u26a1 VENCE ' + escAcc(info.corta) + '</span>'
          : '<span class="jp-status-pill jp-status-active">\u26a1 ACTIVO \u00b7 HASTA ' + escAcc(info.corta) + '</span>';
    }
  }
  /* directiva 13: micro-badge de vigencia/estado del plan, mismo lenguaje
     visual Luxury Stealth que el chip de cuota de arriba -- nunca un
     banner, y se queda vacío (oculto) si el coach todavía no cargó nada
     de esto (plan en borrador sin fechas de vigencia). */
  function pintarVigenciaPlan(){
    var el = q('hdcPlanChip'); if(!el) return;
    var cfg = (typeof PROGRAM_CONFIG !== 'undefined') ? PROGRAM_CONFIG : {};
    var desde = fmtFechaCortaISO(cfg.vigenciaDesde || '');
    var hasta = fmtFechaCortaISO(cfg.vigenciaHasta || '');
    if(desde && hasta){
      el.innerHTML = '<span class="jp-status-cycle">CICLO: ' + escAcc(desde) + ' - ' + escAcc(hasta) + '</span>';
    } else {
      /* el estado "Plan Activo" ya lo cubre #hdcPayChip (jp-status-pill) --
         este segundo chip queda reservado EXCLUSIVAMENTE al rango de
         fechas del ciclo, así nunca se repite el mismo texto en las dos
         pastillas de la fila (ver directiva de unificación de badges). */
      el.innerHTML = '';
    }
  }
  function pintarUniPerfil(){
    var wrap = q('hdpUniToggle');
    if(!wrap || !window.CoachUnidad) return;
    var actual = window.CoachUnidad.actual();
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-u]'), function(b){
      b.classList.toggle('on', b.dataset.u === actual);
    });
  }
  function pintarAudioPerfil(){
    var wrap = q('hdpAudioToggle');
    if(!wrap) return;
    var muted = false;
    try{ muted = localStorage.getItem('jp_audio_muted') === '1'; }catch(e){}
    var actual = muted ? 'off' : 'on';
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-audio]'), function(b){
      b.classList.toggle('on', b.dataset.audio === actual);
    });
  }
  function pintarSync(){
    var el = q('hdpSync'); if(!el) return;
    var dot = el.querySelector('.dot'), tx = el.querySelector('.tx');
    var key = (typeof STORAGE_KEY !== 'undefined') ? STORAGE_KEY : null;
    var tiene = false;
    try{ tiene = !!(key && localStorage.getItem(key)); }catch(e){}
    if(tx) tx.textContent = tiene ? 'Datos guardados en este dispositivo' : 'Sin progreso guardado todavía';
    if(dot) dot.classList.toggle('off', !tiene);
  }
  if(window.CoachUnidad && typeof window.CoachUnidad.fijar === 'function' && !window.CoachUnidad.fijar.__hdPerfil){
    var _fijarPerfil = window.CoachUnidad.fijar;
    window.CoachUnidad.fijar = function(){
      var r = _fijarPerfil.apply(this, arguments);
      pintarUniPerfil();
      return r;
    };
    window.CoachUnidad.fijar.__hdPerfil = 1;
  }

  /* ---------- dock inferior: reutiliza la API pública ya existente
     (CoachWodTimer.abrir, CoachUnidad.fijar, click proxy sobre #calcBtn)
     en vez de reimplementar calculadora / timer / unidades ---------- */
  function montarDock(){
    var calc = q('hddCalc'), timer = q('hddTimer'), uni = q('hddUni'), rdy = q('hddReadiness');
    if(calc && !calc.dataset.hdWired){
      calc.dataset.hdWired = '1';
      calc.addEventListener('click', function(){ var b = q('calcBtn'); if(b) b.click(); });
    }
    if(timer && !timer.dataset.hdWired){
      timer.dataset.hdWired = '1';
      timer.addEventListener('click', function(){
        if(window.CoachWodTimer && window.CoachWodTimer.abrir) window.CoachWodTimer.abrir();
      });
    }
    if(uni && !uni.dataset.hdWired){
      uni.dataset.hdWired = '1';
      uni.addEventListener('click', function(){
        if(!window.CoachUnidad) return;
        var actual = window.CoachUnidad.actual();
        window.CoachUnidad.fijar(actual === 'lb' ? 'kg' : 'lb');
      });
    }
    if(rdy && !rdy.dataset.hdWired){
      rdy.dataset.hdWired = '1';
      rdy.addEventListener('click', function(){
        var card = q('readinessCard');
        if(card){
          /* pedido 41: la tarjeta ahora arranca colapsada -- el acceso
             del dock la abre directo, no solo la muestra cerrada */
          card.open = true;
          card.scrollIntoView({ behavior:'smooth', block:'start' });
          card.classList.add('block-flash');
          setTimeout(function(){ card.classList.remove('block-flash'); }, 900);
        }
      });
    }
    pintarDockUni();
    actualizarDock();
  }
  /* ---------- oculta el dock inferior por completo mientras hay un modal,
     el Custom Timer a pantalla completa, la Story Card o el drawer de
     Perfil abiertos encima — así nunca tapa sus botones de acción (antes
     el dock, con z-index 260, quedaba por encima del Custom Timer, que
     usa z-index 240). Reactivo vía MutationObserver: no hace falta tocar
     cada función que abre/cierra esas capas, solo mirar sus clases. ---------- */
  function actualizarDock(){
    var dock = q('hdDock'); if(!dock) return;
    var tapado = !!(
      document.querySelector('.cwt-wrap.on') ||
      document.querySelector('.modal-overlay.open') ||
      document.querySelector('.hd-full-drawer.on') ||
      document.querySelector('.story-wrap.on')
    );
    dock.classList.toggle('is-hidden', tapado);
  }
  if(!window.__hdDockObs){
    window.__hdDockObs = new MutationObserver(function(){ actualizarDock(); });
    window.__hdDockObs.observe(document.body, { attributes:true, attributeFilter:['class'], subtree:true });
  }
  /* dock plegable (Stealth Pro): el boton flotante abre/cierra las herramientas; tocar fuera o elegir una las cierra */
  document.addEventListener('click', function(e){
    var dk = document.getElementById('hdDock'); if(!dk) return;
    var fab = e.target && e.target.closest ? e.target.closest('#hddFab') : null;
    if(fab){ var ab = !dk.classList.contains('open'); dk.classList.toggle('open', ab); fab.setAttribute('aria-expanded', ab ? 'true' : 'false'); return; }
    if(dk.classList.contains('open')){ dk.classList.remove('open'); var f2 = document.getElementById('hddFab'); if(f2) f2.setAttribute('aria-expanded', 'false'); }
  });
  (function(){
    var yPrev = window.pageYOffset || 0, acum = 0;
    window.addEventListener('scroll', function(){
      var dk = document.getElementById('hdDock'); if(!dk) return;
      var y = window.pageYOffset || 0, dy = y - yPrev; yPrev = y;
      if((dy > 0) !== (acum > 0)) acum = 0;
      acum += dy;
      if(y < 80 || acum < -24) dk.classList.remove('is-away');
      else if(acum > 40 && !dk.classList.contains('open')) dk.classList.add('is-away');
    }, { passive: true });
  })();
  function pintarDockUni(){
    var tx = q('hddUniTx'), uni = q('hddUni');
    if(!tx || !window.CoachUnidad) return;
    var actual = window.CoachUnidad.actual();
    tx.textContent = actual === 'lb' ? 'LBS' : 'KG';
    if(uni) uni.classList.toggle('on', actual === 'lb');
  }
  if(window.CoachUnidad && typeof window.CoachUnidad.fijar === 'function' && !window.CoachUnidad.fijar.__hdDock){
    var _fijar = window.CoachUnidad.fijar;
    window.CoachUnidad.fijar = function(){
      var r = _fijar.apply(this, arguments);
      pintarDockUni();
      return r;
    };
    window.CoachUnidad.fijar.__hdDock = 1;
  }

  /* ---------- auto-colapso por bloque completo (FIX pedido 37) ----------
     ANTES: "acordeón inteligente" al estilo un-solo-bloque-abierto — dejaba
     expandido ÚNICAMENTE el primer bloque incompleto de la lista y
     colapsaba TODOS los demás en cada evento "change", sin importar cuál era el
     bloque real que el alumno estaba tildando. Si un bloque temprano
     (típicamente la entrada en calor, que no tiene .set-check) nunca
     llegaba a "completo", ese bloque se quedaba con el foco para siempre
     y el resto — incluida la tarjeta que el alumno tenía abierta en ese
     momento — se cerraba de golpe apenas tildaba una serie cualquiera.
     Bug reportado: "cada vez que tilda una serie, el bloque entero se
     cierra" + el HUD de descanso disparándose sobre una tarjeta que
     acababa de colapsarse.
     AHORA: cada bloque decide su propio colapso de forma independiente y
     nunca por el estado de otro. Un bloque se colapsa SOLO si él mismo
     quedó marcado como hecho — jamás por tildar una serie suelta, y
     jamás como efecto colateral de otro bloque. Un bloque incompleto no
     se toca acá: sigue exactamente como estaba (abierto si el alumno lo
     tenía abierto).
     REFINAMIENTO (pedido 38): "marcado como hecho" (isBlockDone) ya no
     se infiere de tener todas las .set-check tildadas — eso disparaba
     el mismo colapso apenas se cerraba la última serie, exactamente lo
     que el coach pidió eliminar. isBlockDone() ahora solo se vuelve
     true cuando el alumno tilda a mano la casilla del header
     (.block-done-cb, ver marcarCompleto() línea ~10046) — así que el
     chevron manual (header click, línea ~5146) y esa casilla explícita
     son las ÚNICAS formas de colapsar un bloque. */
  function bloqueCompleto(weekIdx, dayId, blockId, blockEl){
    return typeof isBlockDone === 'function' && isBlockDone(weekIdx, dayId, blockId);
  }
  function refrescarAcordeon(target){
    var main = q('mainContent');
    var day = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
    if(!main || !day) return;
    var weekIdx = (typeof state !== 'undefined') ? state.currentWeek : 0;
    var blockEls = target ? [target] : main.querySelectorAll('.blocks-stack > .block');
    Array.prototype.forEach.call(blockEls, function(el){
      var bid = el.dataset.blockId; if(!bid) return;
      var completo = bloqueCompleto(weekIdx, day.id, bid, el);
      el.classList.toggle('block-current', !completo);
      if(completo) el.classList.add('collapsed');
      /* un bloque incompleto NUNCA se toca: no se le agrega ni se le
         quita 'collapsed' acá — así jamás se cierra solo mientras el
         alumno todavía tiene series pendientes en él. */
    });
  }
  document.addEventListener('change', function(e){
    var t = e.target;
    if(t && t.closest && (t.closest('.set-check') || (t.classList && t.classList.contains('block-done-cb')))){
      /* se refresca SOLO el bloque tocado, nunca el resto de la lista */
      var bl = t.closest('.block');
      setTimeout(function(){ refrescarAcordeon(bl); }, 30);
    }
  });

  /* ---------- degradé de scroll en selectores de día/fase (28/08) ----------
     mide scrollLeft real contra scrollWidth y prende/apaga .can-scroll-l/
     .can-scroll-r (el degradé lo pinta el CSS de arriba, ~línea 17236).
     Se re-mide en cada mount()/renderMain porque el contenido de estas filas
     cambia con la rutina (más o menos días/semanas), no solo con el resize. */
  function medirFadeScroll(el){
    if(!el) return;
    var max = el.scrollWidth - el.clientWidth;
    /* con scroll-snap-type activo el reposo "sin scrollear" a veces no cae
       exacto en scrollLeft:0 (padding/snap del primer ítem) — se guarda la
       primera medición como línea base real de "inicio" en vez de asumir 0,
       para no mostrar el degradé izquierdo cuando en realidad no hay nada
       más para scrollear de ese lado. */
    if(el.dataset.restL === undefined) el.dataset.restL = String(el.scrollLeft);
    var restL = parseFloat(el.dataset.restL) || 0;
    el.classList.toggle('can-scroll-l', el.scrollLeft > restL + 4);
    el.classList.toggle('can-scroll-r', max > 4 && el.scrollLeft < max - 4);
  }
  function wireFadeScroll(el){
    if(!el || el.dataset.fadeWired) return;
    el.dataset.fadeWired = '1';
    el.addEventListener('scroll', function(){ medirFadeScroll(el); }, { passive:true });
  }
  function montarFadeScroll(){
    var tabs = document.querySelector('.week-tabs'), sel = document.querySelector('.week-selector');
    wireFadeScroll(tabs); wireFadeScroll(sel);
    medirFadeScroll(tabs); medirFadeScroll(sel);
  }
  window.addEventListener('resize', montarFadeScroll, { passive:true });

  function mount(){
    montarCompacta();
    montarDock();
    refrescarAcordeon();
    montarFadeScroll();
    [300, 900, 1800].forEach(function(ms){
      setTimeout(function(){ montarCompacta(); montarDock(); refrescarAcordeon(); montarFadeScroll(); }, ms);
    });
    if(typeof window.renderMain === 'function' && !window.renderMain.__hdCompact){
      var _rm = window.renderMain;
      window.renderMain = function(){
        var r = _rm.apply(this, arguments);
        setTimeout(function(){ montarCompacta(); pintarDockUni(); refrescarAcordeon(); montarFadeScroll(); }, 40);
        return r;
      };
      window.renderMain.__hdCompact = 1;
    }
  }

  window.addEventListener('resize', medirCabecera, { passive:true });
  window.addEventListener('resize', medirRail, { passive:true });
  window.addEventListener('orientationchange', function(){ setTimeout(medirCabecera, 60); setTimeout(medirRail, 60); });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
