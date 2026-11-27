/* ============================================================
   CASOS · v38: selectores de semana y día centrados con «SEMANA» completo; escudo amarillo en la Story Card.
   Adaptador v30 (runner.html), casos nuevos: semanaCentrada y escudoStory.
   (Las repeticiones centradas y los tips plegables se verifican en v37.hdr.01 y v37.tips.01.)
   ============================================================ */
window.JP_PARSER_CASES = window.JP_PARSER_CASES.concat([

  { id: 'v38.sem.01', area: 'Header · SEMANA / DÍA', fn: 'v30', input: { caso: 'semanaCentrada' },
    expect: { semanaCompleta: true, sinRecorte: true, sinSolaparse: true, contenidoCentrado: true, barraCentrada: true, mismoAlto: true }, modo: 'subset',
    nota: 'El selector de semana dice «SEMANA 1» (también en su menú), sin recortarse ni pisar al de día; el texto y la flecha de cada botón quedan centrados y la barra centrada, con el alto de 40 px y el margen izquierdo del escudo' },
  { id: 'v38.esc.01', area: 'Story Card · escudo', fn: 'v30', input: { caso: 'escudoStory' },
    expect: { hayEscudo: true, amarillo: true, noNaranja: true, rayoOscuro: true }, modo: 'subset',
    nota: 'El escudo de Coach JP de la Story Card (vista previa y exportación HD usan el mismo dibujo) es amarillo dorado con el rayo oscuro, igual al del encabezado; ya no naranja' }
]);
