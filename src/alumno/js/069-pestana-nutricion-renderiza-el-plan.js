/* =========================================================
   PESTAÑA NUTRICIÓN · renderiza el plan estructurado publicado
========================================================= */
(function(){
  var PLAN = (typeof PROGRAM_CONFIG !== 'undefined' && PROGRAM_CONFIG.nutriPlan) || null;
  var KL = 'coachjp_nutrilog_v1';
  var swap = {};   /* intercambios elegidos por el alumno, por comida/ítem */

  /* 29no pedido (30/08) -- Plan Nutricional Semanal de 7 días. Todo lo de
     acá abajo es aditivo: si PLAN no trae "semanal", planActivo() devuelve
     PLAN tal cual y el resto del módulo se comporta exactamente como antes
     (un plan viejo de un solo día sigue funcionando para siempre, sin
     ningún cambio de comportamiento ni de dato guardado). */
  var DIAS_SEMANA_NUT = ['lun','mar','mie','jue','vie','sab','dom'];
  var DIAS_LB_NUT = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' };
  var DIAS_CORTO_NUT = { lun:'LUN', mar:'MAR', mie:'MIÉ', jue:'JUE', vie:'VIE', sab:'SÁB', dom:'DOM' };
  var DIAS_POR_JSGETDAY = ['dom','lun','mar','mie','jue','vie','sab'];
  function hoyDiaSemana(){ return DIAS_POR_JSGETDAY[new Date().getDay()]; }
  var nutriState = { diaSel: null, shopOpen: false };

  /* directiva de implementación (2026-09) -- Lista de compras semanal (vista
     del alumno/a). Misma lógica de consolidación que el exportador del Coach
     (módulo "NUTRICIÓN PERSONALIZADA · VARIANTE B" del lado del Builder):
     se duplica acá porque TEMPLATE_HTML se compila como documento aparte y
     no comparte scope de JS con el Builder -- mismo patrón ya usado en este
     archivo para otros pares de utilidades espejadas (ej. NUTRI_DISCLAIMER /
     NUTRI_DISCLAIMER_TXT). Cualquier cambio de criterio (agrupación, cortes,
     factores de cocción→crudo) debe replicarse en ambos lados. */
  var GRUPO_COMPRA_NUT = {
    'Pechuga de pollo':          'Pechuga/Suprema de pollo',
    'Suprema de pollo':          'Pechuga/Suprema de pollo',
    'Nalga':                     'Carne vacuna magra (nalga/bola de lomo/cuadrada/cuadril/peceto)',
    'Bola de lomo':              'Carne vacuna magra (nalga/bola de lomo/cuadrada/cuadril/peceto)',
    'Cuadrada':                  'Carne vacuna magra (nalga/bola de lomo/cuadrada/cuadril/peceto)',
    'Cuadril':                   'Carne vacuna magra (nalga/bola de lomo/cuadrada/cuadril/peceto)',
    'Peceto (carne magra)':      'Carne vacuna magra (nalga/bola de lomo/cuadrada/cuadril/peceto)',
    'Solomillo de cerdo':        'Cerdo (solomillo/carré)',
    'Carré de cerdo':            'Cerdo (solomillo/carré)',
    'Huevo entero':              'Huevos'
  };
  var UNIDADES_COMPRA_NUT = { 'Huevo entero': 50, 'Banana': 120, 'Manzana': 150 };
  var CONVERSION_COMPRA_NUT = {
    'Arroz cocido':                1 / 2.5,
    'Arroz integral cocido':       1 / 2.4,
    'Fideos de sémola cocidos':    1 / 2.2,
    'Polenta cocida':              1 / 4.5
  };
  function formatoGramosNut(g){
    return g >= 1000 ? (Math.round(g / 100) / 10) + ' kg' : (Math.max(10, Math.round(g / 10) * 10)) + ' g';
  }
  function listaDeComprasSemanalNut(plan){
    if(!plan || !plan.semanal || !plan.dias) return [];
    var gramosPorGrupo = {}, unidadesPorGrupo = {};
    Object.keys(plan.dias).forEach(function(dk){
      var dia = plan.dias[dk];
      if(!dia || !dia.comidas) return;
      dia.comidas.forEach(function(c){
        (c.items || []).forEach(function(it){
          if(!it.alimento || !it.gramos) return;
          var nombre = it.alimento;
          var grupo = GRUPO_COMPRA_NUT[nombre] || nombre;
          if(UNIDADES_COMPRA_NUT[nombre]){
            unidadesPorGrupo[grupo] = (unidadesPorGrupo[grupo] || 0) + it.gramos / UNIDADES_COMPRA_NUT[nombre];
          } else {
            var factor = CONVERSION_COMPRA_NUT[nombre] || 1;
            gramosPorGrupo[grupo] = (gramosPorGrupo[grupo] || 0) + it.gramos * factor;
          }
        });
      });
    });
    var out = [];
    Object.keys(unidadesPorGrupo).forEach(function(g){
      out.push({ grupo:g, orden: unidadesPorGrupo[g] * 50, texto: Math.round(unidadesPorGrupo[g]) + ' unidades' });
    });
    Object.keys(gramosPorGrupo).forEach(function(g){
      out.push({ grupo:g, orden: gramosPorGrupo[g], texto: formatoGramosNut(gramosPorGrupo[g]) });
    });
    out.sort(function(a, b){ return b.orden - a.orden; });
    return out;
  }

  /* el "día activo" para leer macros/comidas: si el plan es semanal, el día
     elegido con las píldoras LUN..DOM (por defecto, hoy); si es un plan
     viejo de un solo día, el PLAN entero -- así el resto de esta función no
     necesita saber qué forma tiene el plan. */
  function planActivo(){
    if(!PLAN) return null;
    if(PLAN.semanal){
      if(!nutriState.diaSel) nutriState.diaSel = hoyDiaSemana();
      return (PLAN.dias && PLAN.dias[nutriState.diaSel]) || null;
    }
    return PLAN;
  }
  /* ¿el día que se está mostrando es el día real de hoy? El registro de
     "comida hecha"/intercambios siempre es el de hoy real (hoyISO(), sin
     tocar) -- al navegar otro día de la semana se muestra en modo vista
     previa, sin tildes ni intercambios, para no mezclar el registro de un
     día con el menú de otro. */
  function esHoySeleccionado(){
    return !PLAN || !PLAN.semanal || nutriState.diaSel === hoyDiaSemana();
  }

  function hoyISO(){ var d = new Date(); return d.toISOString().slice(0,10); }
  function log(){ try{ return JSON.parse(localStorage.getItem(KL) || '{}') || {}; }catch(e){ return {}; } }
  function guardarLog(o){ try{ localStorage.setItem(KL, JSON.stringify(o)); }catch(e){} }
  function delDia(){
    var o = log(), k = hoyISO();
    if(!o[k]) o[k] = { comidas:{}, swap:{}, opcion:{} };
    /* 10mo pedido (26/08): días guardados antes de que existiera "opcionB" no
       tienen esta clave — se completa acá para no romper lecturas viejas. */
    if(!o[k].opcion) o[k].opcion = {};
    return o[k];
  }

  function esDiaEntreno(){
    if(PLAN && PLAN.semanal){
      var tipo = (PLAN.cicloCarb && PLAN.cicloCarb[nutriState.diaSel || hoyDiaSemana()]) || 'entreno';
      return tipo === 'entreno';
    }
    try{
      var d = (typeof getCurrentDay === 'function') ? getCurrentDay() : null;
      return !!(d && (d.blocks || []).length);
    }catch(e){ return true; }
  }

  function totalElegido(c, d){
    /* 10mo pedido (26/08): si el alumno eligió "B" (preparación elaborada) para
       esta comida hoy, y el plan trae opcionB, se cuenta ese total — si no,
       la opción A de siempre. Así el resumen del día refleja lo que realmente
       se preparó, no siempre la opción por defecto. */
    return (d.opcion[c.n] === 'B' && c.opcionB && c.opcionB.total) ? c.opcionB.total : c.total;
  }

  function sumaDelDia(){
    var d = delDia(), tot = { prot:0, carb:0, gras:0, kcal:0 };
    if(!esHoySeleccionado()) return tot;   /* el registro de "hecho" es siempre el de hoy real */
    var activaSuma = planActivo();
    ((activaSuma && activaSuma.comidas) || []).forEach(function(c){
      if(!d.comidas[c.n]) return;
      var t = totalElegido(c, d);
      tot.prot += (t && t.prot) || 0;
      tot.carb += (t && t.carb) || 0;
      tot.gras += (t && t.gras) || 0;
      tot.kcal += (t && t.kcal) || 0;
    });
    return tot;
  }

  function barra(cls, rot, hecho, meta, unidad){
    var pct = meta ? Math.min(100, Math.round(hecho / meta * 100)) : 0;
    return '<div class="nu-bar ' + cls + '"><div class="lb"><span>' + rot + '</span>' +
      '<b>' + hecho + ' / ' + meta + ' ' + unidad + '</b></div>' +
      '<div class="tr"><div class="fi" style="width:' + pct + '%"></div></div></div>';
  }

  /* 10/09 -- mapea el texto libre "evidencia" (calculado del lado del
     Builder) a un grado A/B/C estilo ISSN para el badge. Todo lo que hoy
     computa suplementosDe() cae en "alta" -> A; queda B/C como fallback
     razonable para si en el futuro se agrega un supl con evidencia menor. */
  function gradoEvidencia(txt){
    var t = String(txt || '').toLowerCase();
    if(t.indexOf('alta') >= 0) return 'A';
    if(t.indexOf('media') >= 0 || t.indexOf('moderada') >= 0) return 'B';
    if(t.indexOf('baja') >= 0 || t.indexOf('limitada') >= 0) return 'C';
    return 'B';
  }
  /* directiva de refactor (2026-09): importador de dieta externa -- si el
     coach pegó el plan armado por un nutricionista externo (PLAN.modo ===
     'externo'), se muestra tal cual estructurado en tarjetas por comida,
     sin pasar por el calculador de macros ni por ninguna de las funciones
     de abajo (log de comidas, intercambios, barras, etc.) que asumen un
     plan con .comidas/.macros -- rama 100% aparte y aditiva. */
  function parrafosPlanExterno(texto){
    var bloques = String(texto || '').replace(/\\r\\n/g, '\\n').split(/\\n\\s*\\n+/);
    var out = [];
    bloques.forEach(function(b){
      var lineas = b.split('\\n').map(function(l){ return l.trim(); }).filter(Boolean);
      if(!lineas.length) return;
      var esTitulo = lineas[0].length <= 42 && !/[.:,]$/.test(lineas[0]) && lineas.length > 1;
      out.push({ titulo: esTitulo ? lineas[0].replace(/:$/, '') : '', cuerpo: esTitulo ? lineas.slice(1) : lineas });
    });
    return out;
  }
  function renderPlanExterno(cont){
    var txt = (PLAN.externo && PLAN.externo.texto) || '';
    var bloques = parrafosPlanExterno(txt);
    cont.innerHTML =
      '<div class="nu-ext-banner">📄 Plan cargado por tu coach a partir del plan armado por tu nutricionista.</div>' +
      bloques.map(function(b){
        return '<div class="nu-ext-card">' +
          (b.titulo ? '<div class="nu-ext-h">' + esc(b.titulo) + '</div>' : '') +
          '<div class="nu-ext-b">' + b.cuerpo.map(function(l){ return '<p>' + esc(l) + '</p>'; }).join('') + '</div>' +
        '</div>';
      }).join('') +
      '<div class="nu-legal">' + esc(PLAN.disclaimer || NUTRI_DISCLAIMER_TXT) + '</div>';
  }
  function render(){
    var cont = document.getElementById('jpNutBody'); if(!cont) return;
    if(!PLAN){
      cont.innerHTML = '<div class="nu-vacio">Tu coach todavía no publicó un plan nutricional.<br>' +
        'Mientras tanto, cada día tiene su tarjeta de nutrición de la sesión.</div>';
      return;
    }
    if(PLAN.modo === 'externo'){ renderPlanExterno(cont); return; }
    var activa = planActivo();
    var ent = esDiaEntreno();
    var m = (PLAN.macros && (ent ? PLAN.macros.entreno : PLAN.macros.descanso)) || {};
    var kcal = ent ? (PLAN.meta || {}).kcal_entreno : (PLAN.meta || {}).kcal_descanso;
    var s = sumaDelDia(), d = delDia();
    var hoy = esHoySeleccionado();

    /* directiva9 -- preserva qué comidas estaban abiertas antes de este
       re-render (ej: tras tocar el swap ⇄) para que el acordeón no se
       colapse solo; si no había ninguna abierta (carga inicial) se deja
       en manos de la lógica de "abrir la más cercana a la hora actual"
       de más abajo, sin cambiar ese comportamiento. */
    var abiertasPrevias = {};
    cont.querySelectorAll('details.nu-meal[open]').forEach(function(dt){
      if(dt.dataset && dt.dataset.mn) abiertasPrevias[dt.dataset.mn] = true;
    });
    var huboAbiertasPrevias = Object.keys(abiertasPrevias).length > 0;

    var html = '';
    /* 29no pedido (30/08): fila de píldoras LUN..DOM -- sólo si el plan es
       semanal; un plan viejo de un solo día no la muestra, cero cambio
       visual para atletas con planes ya generados. */
    if(PLAN.semanal){
      html += '<div class="nu-dia-pills">' + DIAS_SEMANA_NUT.map(function(dk){
        var activo = dk === nutriState.diaSel;
        var esHoyPill = dk === hoyDiaSemana();
        return '<button type="button" class="nu-dia-pill' + (activo ? ' on' : '') + '" data-nudia="' + dk + '">' +
          DIAS_CORTO_NUT[dk] + (esHoyPill ? '<b>HOY</b>' : '') + '</button>';
      }).join('') + '</div>';
    }

    html += '<div class="nu-card">' +
      '<div class="nu-h">' + (hoy ? 'Hoy' : (DIAS_LB_NUT[nutriState.diaSel] || 'Vista previa')) +
        '<span class="tag">' + (ent ? 'día de entreno' : 'día de descanso') + ' · ' + (kcal || '—') + ' kcal</span></div>' +
      (hoy
        ? barra('p', 'Proteína', s.prot, m.prot_g || 0, 'g') +
          barra('',  'Carbohidrato', s.carb, m.carb_g || 0, 'g') +
          barra('g', 'Grasa', s.gras, m.gras_g || 0, 'g') +
          (m.agua_ml ? barra('a', 'Agua', 0, Math.round(m.agua_ml / 100) / 10, 'L') : '') +
          /* 10/09 -- electrolitos: referencia junto a la meta de hidratación,
             sin barra de progreso propia (no hay forma de "tildar" sodio). */
          (m.sodio_mg ? '<div class="nu-electro">🧂 Electrolitos: apuntá a reponer ~<b>' + m.sodio_mg +
            ' mg</b> de sodio a lo largo del día (más si la sesión es larga o hay mucho calor).</div>' : '')
        : '<div class="nu-preview-macros">Objetivo de ese día: <b>' + (m.prot_g || 0) + 'g</b> proteína · <b>' +
          (m.carb_g || 0) + 'g</b> carbohidrato · <b>' + (m.gras_g || 0) + 'g</b> grasa</div>') +
      '</div>';

    var comidaLibre = PLAN.semanal ? PLAN.comidaLibre : null;

    html += ((activa && activa.comidas) || []).map(function(c, ci){
      var hecha = hoy && !!d.comidas[c.n];
      var abierta = !!abiertasPrevias[c.n];
      /* 10mo pedido (26/08): si la comida trae "opcionB" (preparación elaborada,
         schema aditivo), se muestra un selector de 2 pestañas — la elegida hoy
         queda guardada en d.opcion[c.n] ('A' por defecto, no hace falta setearla).
         Las claves de intercambio ("data-swap") de la opción B llevan el
         infijo "_B_" para no pisar los índices de la opción A.
         29no pedido (30/08): al navegar un día que NO es hoy, siempre se
         muestra la opción A y sin swap/tick -- el registro de "hecho" y de
         intercambios es siempre el de hoy real, no correspondería mezclarlo
         con el menú de otro día de la semana. */
      var tieneB = hoy && !!(c.opcionB && (c.opcionB.items || []).length);
      var elegidaB = tieneB && d.opcion[c.n] === 'B';
      var activaOpt = elegidaB ? c.opcionB : c;
      var itemsActivos = activaOpt.items || [];
      var keyPref = c.n + (elegidaB ? '_B_' : '_');
      var kcalActiva = (activaOpt.total && activaOpt.total.kcal) || 0;
      var esLibre = !!(comidaLibre && comidaLibre.dia === nutriState.diaSel && comidaLibre.comida === c.n);
      return '<details class="nu-meal' + (hecha ? ' hecha' : '') + (esLibre ? ' libre' : '') + '"' + (abierta ? ' open' : '') + ' data-mn="' + c.n + '">' +
        '<summary>' +
          '<span class="mn">' + c.n + ' · ' + esc(activaOpt.nombre || c.nombre) + '</span>' +
          '<span class="mh">' + esc(c.hora_sug || '') + '</span>' +
          '<span class="mk">' + kcalActiva + ' kcal</span>' +
          (hoy ? '<span class="tick" data-tick="' + c.n + '">' + (hecha ? '✓' : '') + '</span>' : '') +
        '</summary>' +
        '<div class="cuerpo">' +
          (esLibre ? '<div class="nu-libre-tag">[ COMIDA LIBRE SUGERIDA · CONTROLADA ]</div>' +
            '<div class="nu-libre-guia">Priorizá una fuente de proteína magra antes de esta comida · disfrutala sin culpa y sin atracón, comé despacio · reforzá la hidratación después.</div>' : '') +
          (tieneB ? '<div class="nu-opt-seg">' +
            '<button type="button" class="nu-opt' + (elegidaB ? '' : ' on') + '" data-opt="' + c.n + '|A">⚡ ' + esc(c.nombre) + '</button>' +
            '<button type="button" class="nu-opt' + (elegidaB ? ' on' : '') + '" data-opt="' + c.n + '|B">🍳 ' + esc(c.opcionB.nombre) + '</button>' +
          '</div>' : '') +
          itemsActivos.map(function(it, ii){
            var key = keyPref + ii;
            var alt = hoy ? d.swap[key] : null;
            var nombre = alt ? alt.alimento : it.alimento;
            var gramos = alt ? alt.gramos : it.gramos;
            return '<div class="nu-it' + (alt ? ' cambiado' : '') + '">' +
              '<span class="al">' + esc(nombre) + '</span>' +
              '<span class="gr">' + gramos + ' g</span>' +
              (hoy && (it.intercambios || []).length
                ? '<button class="sw" data-swap="' + key + '" title="Cambiar por un equivalente">⇄</button>' : '') +
              '</div>';
          }).join('') +
        '</div></details>';
    }).join('');

    /* 10/09 -- Peri-Entreno como 3 micro-tarjetas tácticas (Pre/Intra/Post):
       timing + macros en tabular-nums + opciones de alimentos reales, ya
       resueltas del lado del Builder (opcionesPeriFase(), misma base ALIM
       de siempre) -- acá solo se renderiza lo que vino calculado. "opciones"
       puede faltar en planes viejos: se omite esa fila sin romper nada. */
    var pe = (activa || {}).peri_entreno;
    if(pe && ent){
      var FASES_PERI = [
        { k:'pre', ic:'⚡', lb:'Pre-Entreno' },
        { k:'intra', ic:'💧', lb:'Intra-Entreno' },
        { k:'post', ic:'🔋', lb:'Post-Entreno' }
      ];
      html += '<div class="nu-card"><div class="nu-h">Alrededor del entrenamiento</div><div class="nu-peri-grid">' +
        FASES_PERI.map(function(fase){
          var x = pe[fase.k]; if(!x) return '';
          var partesMacro = [];
          if(x.carb_g) partesMacro.push(x.carb_g + 'g carb');
          if(x.prot_g) partesMacro.push(x.prot_g + 'g prot');
          var opciones = (x.opciones || []).length ?
            '<div class="nu-peri-op">' + x.opciones.map(function(o){ return '<span>' + esc(o) + '</span>'; }).join('') + '</div>' : '';
          return '<div class="nu-peri-card">' +
            '<div class="nu-peri-tit"><span>' + fase.ic + '</span>' + fase.lb + '</div>' +
            '<div class="nu-peri-cuando">' + esc(x.cuando || '') + '</div>' +
            (partesMacro.length ? '<div class="nu-peri-macro">' + partesMacro.join(' · ') + '</div>' : '') +
            '<div class="nu-peri-txt">' + esc(x.texto || '') + '</div>' +
            opciones +
          '</div>';
        }).join('') + '</div></div>';
    }
    /* 10/09 -- suplementos con badge de grado de evidencia (A/B/C). El dato
       "evidencia" ya lo calcula suplementosDe() del lado del Builder --
       antes se descartaba al renderizar, ahora se muestra junto a "nota". */
    if((PLAN.suplementos || []).length){
      html += '<div class="nu-card"><div class="nu-h">Suplementos</div>' +
        PLAN.suplementos.map(function(x){
          var g = gradoEvidencia(x.evidencia);
          return '<div class="nu-supl-row">' +
            '<span class="nu-ev-badge nu-ev-' + g.toLowerCase() + '">' + g + '</span>' +
            '<div class="nu-supl-tx"><b>' + esc(x.nombre) + '</b> — ' + esc(x.dosis || '') + ' · ' + esc(x.momento || '') +
              (x.nota ? '<div class="nu-supl-nota">' + esc(x.nota) + '</div>' : '') +
            '</div></div>';
        }).join('') + '</div>';
    }
    /* directiva de implementación (2026-09) -- Lista de compras semanal,
       vista del alumno/a (ítem 5 de la consultoría). Sólo aplica a un plan
       semanal (7 días estructurados); un plan viejo de un solo día no la
       muestra. El resultado se recalcula en cada render() en base a
       nutriState.shopOpen, para sobrevivir a un re-render por cambio de
       día sin perder el estado abierto/cerrado. */
    if(PLAN.semanal){
      var listaCompras = nutriState.shopOpen ? listaDeComprasSemanalNut(PLAN) : null;
      html += '<div class="nu-card"><div class="nu-h">Lista de compras semanal</div>' +
        '<button type="button" class="nu-shop-btn" data-nutshop="1">🛒 ' +
          (nutriState.shopOpen ? 'Ocultar lista de compras' : 'Ver Lista de Compras Semanal') + '</button>' +
        '<div class="nu-shop-hint">Suma los 7 días de tu plan, agrupados por alimento.</div>' +
        (listaCompras ? (
          listaCompras.length
            ? '<div class="nu-shop-list">' + listaCompras.map(function(it){
                return '<div class="nu-shop-row"><span class="g">' + esc(it.grupo) + '</span><span class="q">' + esc(it.texto) + '</span></div>';
              }).join('') + '</div>' +
              '<button type="button" class="nu-shop-copy" data-nutshopcopy="1">📋 Copiar para WhatsApp</button>' +
              '<span class="nu-shop-ok" id="nuShopOk"></span>'
            : '<div class="nu-shop-hint">Todavía no hay comidas cargadas en ningún día de tu plan.</div>'
        ) : '') +
      '</div>';
    }
    html += '<div class="nu-legal">' + esc(PLAN.disclaimer || NUTRI_DISCLAIMER_TXT) + '</div>';
    cont.innerHTML = html;

    if(hoy && !huboAbiertasPrevias){
      /* abre la comida más cercana a la hora actual -- sólo tiene sentido
         cuando se está viendo el día real de hoy, no al navegar otros días.
         directiva9: sólo en la carga "en frío" (nada abierto todavía);
         si el atleta ya tenía una comida abierta (por ej. tras un swap),
         no la pisamos ni saltamos el scroll. */
      var ahora = new Date().getHours() * 60 + new Date().getMinutes();
      var mejor = null, dif = 1e9;
      ((activa && activa.comidas) || []).forEach(function(c){
        var hm = String(c.hora_sug || '').split(':');
        if(hm.length !== 2) return;
        var t = parseInt(hm[0], 10) * 60 + parseInt(hm[1], 10);
        var dd = Math.abs(t - ahora);
        if(dd < dif && !delDia().comidas[c.n]){ dif = dd; mejor = c.n; }
      });
      if(mejor != null){
        var el = cont.querySelector('.nu-meal[data-mn="' + mejor + '"]');
        if(el) el.open = true;
      }
    }
  }

  function esc(t){ return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function abrir(){ var p = document.getElementById('jpNut'); if(!p) return; render(); p.classList.add('on'); }
  function cerrar(){ var p = document.getElementById('jpNut'); if(p) p.classList.remove('on'); }
  window.CoachNutricion = { abrir: abrir, cerrar: cerrar, hay: function(){ return !!PLAN; } };

  function montar(){
    /* directiva de emergencia (rediseño F): la nutrición se va a desarrollar
       en una app aparte -- el botón flotante 🥗 y el panel #jpNut quedan
       desconectados del DOM del alumno. El resto del módulo (window.CoachNutricion,
       lectura de PROGRAM_CONFIG.nutriPlan, etc.) se deja intacto y sin usar,
       por si se reconecta más adelante -- no se borra código ni datos. */
    return;
    if(document.getElementById('jpNut')) return;
    var btn = document.createElement('button');
    btn.id = 'jpNutBtn'; btn.type = 'button'; btn.innerHTML = '🥗';
    btn.setAttribute('aria-label', 'Abrir nutrición');
    btn.addEventListener('click', abrir);
    document.body.appendChild(btn);
    if(PLAN) btn.classList.add('on');

    var p = document.createElement('div');
    p.id = 'jpNut';
    p.innerHTML =
      '<div class="nu-top">' +
        '<button class="nu-x" type="button" id="jpNutX">✕</button>' +
        '<div class="nu-seg" style="max-width:320px">' +
          '<button type="button" id="jpNutIrEnt">🏋️ Entrenamiento</button>' +
          '<button type="button" class="on">🥗 Nutrición</button>' +
        '</div>' +
      '</div>' +
      '<div class="nu-b" id="jpNutBody"></div>';
    document.body.appendChild(p);
    document.getElementById('jpNutX').addEventListener('click', cerrar);
    document.getElementById('jpNutIrEnt').addEventListener('click', cerrar);

    document.getElementById('jpNutBody').addEventListener('click', function(e){
      /* 29no pedido (30/08): píldora LUN..DOM del plan semanal */
      var nd = e.target.closest('[data-nudia]');
      if(nd){
        e.preventDefault(); e.stopPropagation();
        nutriState.diaSel = nd.dataset.nudia;
        render();
        return;
      }
      var t = e.target.closest('[data-tick]');
      if(t){
        e.preventDefault(); e.stopPropagation();
        var n = parseInt(t.dataset.tick, 10);
        var o = log(), k = hoyISO();
        if(!o[k]) o[k] = { comidas:{}, swap:{}, opcion:{} };
        if(o[k].comidas[n]) delete o[k].comidas[n]; else o[k].comidas[n] = Date.now();
        guardarLog(o);
        if(window.CoachVibra) CoachVibra.toque();
        render();
        return;
      }
      /* 10mo pedido (26/08): botón de pestaña Opción A / Opción B — solo cambia
         cuál preparación está activa hoy para esa comida, no toca "hecha". */
      var op = e.target.closest('[data-opt]');
      if(op){
        e.preventDefault(); e.stopPropagation();
        var partsOp = op.dataset.opt.split('|'), mn = partsOp[0], cual = partsOp[1];
        var oo = log(), kOp = hoyISO();
        if(!oo[kOp]) oo[kOp] = { comidas:{}, swap:{}, opcion:{} };
        if(!oo[kOp].opcion) oo[kOp].opcion = {};
        if(cual === 'A') delete oo[kOp].opcion[mn]; else oo[kOp].opcion[mn] = 'B';
        guardarLog(oo);
        if(window.CoachVibra) CoachVibra.toque();
        render();
        return;
      }
      var sw = e.target.closest('[data-swap]');
      if(sw){
        e.preventDefault(); e.stopPropagation();
        var key = sw.dataset.swap;
        /* la clave lleva infijo "_B_" cuando el ítem pertenece a la opción B
           (ver render()) — se separa antes de partir por "_" para no romper
           el parseo del número de comida / índice de ítem. */
        var esB = key.indexOf('_B_') >= 0;
        var part = esB ? key.split('_B_') : key.split('_');
        var activaSwap = planActivo();
        var comida = ((activaSwap && activaSwap.comidas) || []).filter(function(c){ return String(c.n) === part[0]; })[0];
        if(!comida) return;
        var listaItems = esB ? ((comida.opcionB && comida.opcionB.items) || []) : (comida.items || []);
        var item = listaItems[parseInt(part[1], 10)];
        if(!item || !(item.intercambios || []).length) return;
        var o = log(), kk = hoyISO();
        if(!o[kk]) o[kk] = { comidas:{}, swap:{}, opcion:{} };
        var actual = o[kk].swap[key];
        var opciones = [{ alimento:item.alimento, gramos:item.gramos }].concat(item.intercambios);
        var idx = 0;
        opciones.forEach(function(x, i){ if(actual && x.alimento === actual.alimento) idx = i; });
        var sig = opciones[(idx + 1) % opciones.length];
        if(sig.alimento === item.alimento) delete o[kk].swap[key];
        else o[kk].swap[key] = sig;
        guardarLog(o);
        if(window.CoachVibra) CoachVibra.toque();
        render();
        return;
      }
      /* directiva de implementación (2026-09) -- Lista de compras semanal */
      var shopBtn = e.target.closest('[data-nutshop]');
      if(shopBtn){
        e.preventDefault(); e.stopPropagation();
        nutriState.shopOpen = !nutriState.shopOpen;
        render();
        return;
      }
      var shopCopy = e.target.closest('[data-nutshopcopy]');
      if(shopCopy){
        e.preventDefault(); e.stopPropagation();
        var itemsCompra = listaDeComprasSemanalNut(PLAN);
        var textoCompra = '🛒 Lista de compras semanal\\n\\n' +
          itemsCompra.map(function(it){ return '• ' + it.grupo + ': ' + it.texto; }).join('\\n');
        var okEl = document.getElementById('nuShopOk');
        function marcarShopOk(){ if(okEl) okEl.textContent = '✅ Copiado'; }
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(textoCompra).then(marcarShopOk).catch(function(){
            if(okEl) okEl.textContent = '⚠️ No se pudo copiar';
          });
        } else if(okEl){ okEl.textContent = '⚠️ Copiado no disponible en este navegador'; }
        return;
      }
    });

    /* también desde el menú de herramientas, si existe */
    try{
      var pop = document.getElementById('toolsPop') || document.querySelector('.tools-pop');
      if(pop && PLAN && !document.getElementById('jpNutTool')){
        var b2 = document.createElement('button');
        b2.id = 'jpNutTool'; b2.type = 'button'; b2.innerHTML = '🥗 Nutrición';
        b2.addEventListener('click', function(){ pop.classList.remove('on'); abrir(); });
        pop.appendChild(b2);
      }
    }catch(e){}
  }

  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(montar, 700); });
  else setTimeout(montar, 700);
  [1600, 3200].forEach(function(ms){ setTimeout(montar, ms); });
})();
