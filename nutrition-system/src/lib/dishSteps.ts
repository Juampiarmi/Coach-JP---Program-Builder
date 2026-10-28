/**
 * Preparación paso a paso de los platos del catálogo, en lenguaje simple y tono argentino.
 * Sin gramos: las cantidades exactas de cada porción las muestra el desglose de ingredientes.
 */
export const DISH_STEPS: Record<string, string[]> = {
  // ---- Desayunos, meriendas y toast bar ----
  'Avocado Toast integral': [
    'Tostá el pan integral o de semillas en tostadora o sartén seca.',
    'Pisá la palta con un tenedor, un chorrito de limón y una pizca de sal.',
    'Hacé el huevo poché (3 min en agua apenas hirviendo) o revuelto en sartén antiadherente a fuego bajo.',
    'Untá la palta sobre el pan, poné el huevo arriba y terminá con pimienta o semillas.',
  ],
  'Avocado Toast en galletas de arroz': [
    'Pisá la palta con limón y sal.',
    'Hacé el huevo poché o revuelto en sartén antiadherente.',
    'Untá las galletas de arroz con la palta y coroná con el huevo.',
  ],
  'Tostadas proteicas': [
    'Hervir el huevo 9 min, pasalo por agua fría y pelalo.',
    'Tostá el pan de masa madre o integral.',
    'Untá el queso magro, sumá el jamón cocido y el huevo en rodajas.',
  ],
  'Tostada liviana de galleta de arroz con queso y huevo': [
    'Poné las galletas con el queso en sartén tapada a fuego bajo 1 min, hasta que se derrita.',
    'Cociná el huevo a la plancha con spray antiadherente.',
    'Armá: galleta, queso y el huevo arriba.',
  ],
  'Pancake de avena, coco y huevo': [
    'Mixeá la avena, el coco, los huevos y la miel hasta que quede una pasta.',
    'Sumá el saborizante que quieras: vainilla, canela, ralladura de limón o cacao amargo.',
    'Cociná en sartén antiadherente a fuego medio 2-3 min por lado, hasta que dore.',
  ],
  'Bowl de yogur proteico con granola y frutas': [
    'Poné el yogur proteico en un bowl.',
    'Cortá la banana en rodajas o lavá los frutos rojos.',
    'Sumá la fruta y la granola arriba justo antes de comer, así queda crocante.',
  ],
  'Café con leche descremada': ['Prepará el café y completá la taza con leche descremada fría o espumada.', 'Endulzá con edulcorante si querés.'],
  'Leche chocolatada fit': ['Disolvé el cacao amargo con un poco de leche.', 'Completá con el resto de la leche y endulzá con edulcorante.'],
  'Mate cebado': ['Cebá el mate sin azúcar.', 'Si tomás muchos, contá la cafeína: ~70 mg por ronda.'],
  'Mate con tostadas integrales y queso untable': ['Cebá el mate sin azúcar.', 'Tostá las tostadas integrales.', 'Untalas con el queso untable magro.'],
  'Mate con frutos secos': ['Cebá el mate sin azúcar.', 'Serví el puñado de nueces o almendras medido aparte (no de la bolsa).'],
  'Overnight oats con banana': [
    'En un frasco mezclá la avena con el yogur proteico y la canela.',
    'Tapá y dejalo en la heladera toda la noche.',
    'A la mañana sumá la banana en rodajas y comelo frío.',
  ],
  'Licuado de banana con leche y avena': ['Poné en la licuadora la leche, la banana y la avena.', 'Licuá 30 segundos y tomalo en el momento.'],
  'Budín de avena y banana fit': [
    'Pisá la banana y mezclala con los huevos, la avena y el edulcorante.',
    'Volcá en un molde con spray antiadherente.',
    'Mandá al horno a 180 °C por 35 min, hasta que el palillo salga seco.',
    'Dejalo enfriar, cortalo en porciones y guardalo en la heladera.',
  ],
  'Omelette de claras con espinaca y queso': [
    'Batí las claras con el huevo y una pizca de sal.',
    'Salteá la espinaca 1 min en sartén antiadherente con spray.',
    'Volcá el batido, cociná a fuego medio 3-4 min y poné el queso en una mitad.',
    'Doblalo al medio y tapá 1 min para que gratine.',
  ],
  'Revuelto de huevos con tostada integral': [
    'Batí los huevos con sal y pimienta.',
    'Cocinalos en sartén con spray antiadherente a fuego bajo, revolviendo 2-3 min.',
    'Tostá el pan integral y serví todo junto.',
  ],
  'Tostado de jamón y queso en pan integral': [
    'Armá el sándwich con el pan integral, el jamón cocido y el queso.',
    'Doralo en tostadora o sartén tapada 2-3 min por lado.',
  ],
  'Panqueques de avena con dulce de leche light': [
    'Mixeá la avena con el huevo y la leche hasta que quede líquido.',
    'Cociná finitos en sartén antiadherente a fuego medio, 1 min por lado.',
    'Untalos con una cucharadita de dulce de leche light y enrollalos.',
  ],
  'Yogur con banana, avena y miel': ['Poné el yogur en un bowl.', 'Sumá la avena y la banana en rodajas.', 'Terminá con un hilo de miel.'],
  'Budín de banana y whey': [
    'Pisá la banana y mezclala con los huevos, la avena y el whey.',
    'Volcá en un molde con spray antiadherente y mandá al horno a 180 °C por 30 min.',
    'Dejalo enfriar antes de cortar.',
  ],
  'Licuado proteico de frutilla': ['Poné en la licuadora la leche, las frutillas y el whey.', 'Licuá 30 segundos con hielo si querés y tomalo en el momento.'],
  // ---- Tartas, empanadas y sfijas ----
  'Tarta de pollo y puerro': [
    'Salteá el puerro y las verduras picadas en sartén con un chorrito de oliva 5 min.',
    'Sumá el pollo cocido desmenuzado, el queso y el huevo batido, y mezclá.',
    'Forrá la tartera con la masa, volcá el relleno y mandá al horno a 180 °C por 35-40 min.',
  ],
  'Tarta de jamón, queso y huevo': [
    'Forrá la tartera con la masa.',
    'Poné el jamón y el queso en capas y volcá los huevos batidos.',
    'Mandá al horno a 180 °C por 30-35 min, hasta que dore.',
  ],
  'Tarta de atún y verduras': [
    'Salteá la cebolla y el morrón picados 5 min.',
    'Mezclá con el atún escurrido y el huevo batido.',
    'Rellená la masa y mandá al horno a 180 °C por 35-40 min.',
  ],
  'Tarta de carne magra': [
    'Sarteneá la carne picada con la cebolla 8-10 min y condimentá.',
    'Sumá el huevo duro picado y las aceitunas.',
    'Rellená la masa y mandá al horno a 180 °C por 35-40 min.',
  ],
  'Tarta de zapallitos / Pascualina': [
    'Cociná la verdura (zapallitos, espinaca o acelga) en sartén hasta que suelte el agua y escurrila bien.',
    'Mezclá con la salsa blanca liviana y el huevo batido.',
    'Rellená la masa y mandá al horno a 180 °C por 40 min.',
  ],
  'Tarta de calabaza y queso': [
    'Hervir o asar la calabaza y hacerla puré.',
    'Mezclá con la cebolla rehogada, el queso y el huevo.',
    'Rellená la masa y mandá al horno a 180 °C por 35 min.',
  ],
  'Tarta de espinaca y ricota': [
    'Cociná la espinaca 2 min, escurrila bien y picala.',
    'Mezclá con la ricota, el huevo, sal, pimienta y nuez moscada.',
    'Rellená la masa y mandá al horno a 180 °C por 35 min.',
  ],
  'Empanada de carne al horno': [
    'Sarteneá la carne cortada a cuchillo con la cebolla y condimentá con comino y pimentón.',
    'Dejá enfriar el relleno y sumá huevo duro y aceitunas.',
    'Rellená las tapas, repulgá y mandá al horno fuerte (200 °C) 15-18 min.',
  ],
  'Empanada de pollo al horno': [
    'Salteá cebolla y morrón, sumá el pollo cocido desmenuzado y condimentá.',
    'Rellená las tapas y repulgá.',
    'Mandá al horno a 200 °C por 15-18 min.',
  ],
  'Empanada de jamón y queso al horno': ['Rellená las tapas con jamón y queso.', 'Repulgá bien para que no se escape el queso.', 'Mandá al horno a 200 °C por 12-15 min.'],
  'Empanada de verdura al horno': [
    'Cociná la acelga o espinaca, escurrila y mezclala con salsa blanca liviana y huevo.',
    'Rellená las tapas y repulgá.',
    'Mandá al horno a 200 °C por 15 min.',
  ],
  'Empanada de humita al horno': [
    'Cociná el choclo con cebolla rehogada y un poco de leche hasta que espese.',
    'Dejá enfriar, rellená las tapas y repulgá.',
    'Mandá al horno a 200 °C por 15 min.',
  ],
  'Sfija / empanada árabe de carne': [
    'Mezclá la carne picada magra cruda con tomate, cebolla picada y jugo de limón.',
    'Armá las sfijas abiertas o cerradas en triángulo.',
    'Mandá al horno a 200 °C por 15 min.',
  ],
  // ---- Minutas y platos rioplatenses ----
  'Milanesa de pechuga de pollo al horno': [
    'Pasá la pechuga fileteada por huevo batido con ajo y perejil, y después por pan rallado.',
    'Ponela en una placa con spray antiadherente.',
    'Mandá al horno a 200 °C por 20 min, dándola vuelta a la mitad.',
  ],
  'Milanesa de nalga / peceto al horno': [
    'Pasá la carne por huevo batido y después por pan rallado.',
    'Ponela en placa con spray antiadherente.',
    'Mandá al horno a 200 °C por 15-18 min, vuelta a la mitad.',
  ],
  'Milanesa de merluza al horno': ['Pasá la merluza por huevo y pan rallado fino.', 'Mandá al horno en placa con spray antiadherente a 200 °C por 15-18 min.'],
  'Milanesa napolitana al horno': [
    'Hacé la milanesa al horno a 200 °C por 15 min.',
    'Sumá arriba salsa de tomate, una feta de jamón magro y el queso.',
    'Volvé al horno 3-5 min hasta que gratine.',
  ],
  'Pastel de papa táctico': [
    'Hervir las papas 20 min y hacelas puré con un poco de leche (sin manteca).',
    'Sarteneá la carne picada con cebolla y morrón 10 min; sumá el huevo duro picado.',
    'En una fuente poné la carne abajo y el puré arriba.',
    'Mandá al horno a 200 °C por 15 min para gratinar.',
  ],
  'Matambre a la pizza': [
    'Hervir o cocinar el matambre al horno hasta que esté tierno.',
    'Cubrilo con salsa de tomate y queso.',
    'Gratiná en el horno o la parrilla 5 min.',
  ],
  'Pollo a la provenzal': [
    'Picá ajo y perejil y mezclalo con un chorrito de oliva.',
    'Mandá el pollo al horno a 200 °C por 35 min (o en sartén tapada).',
    'En los últimos 5 min sumá la provenzal arriba.',
  ],
  'Guiso táctico de lentejas': [
    'Rehogá cebolla, morrón y zanahoria picados en la olla 5 min.',
    'Sumá la carne o el pollo en cubos y sellá 3 min.',
    'Agregá las lentejas, tomate triturado y caldo, y cociná 40 min a fuego bajo.',
  ],
  'Guiso fit de garbanzos': [
    'Rehogá las verduras picadas en la olla 5 min.',
    'Sumá la pechuga o carne magra en cubos y sellá.',
    'Agregá los garbanzos cocidos, tomate y caldo, y cociná 30-40 min a fuego bajo.',
  ],
  'Canelones de espinaca y ricota': [
    'Mezclá la espinaca cocida y escurrida con la ricota y el huevo.',
    'Rellená los panqueques y enrollalos.',
    'Ponelos en fuente con salsa tuco liviana y mandá al horno a 180 °C por 20 min.',
  ],
  'Canelones de carne': [
    'Sarteneá la carne picada magra con cebolla y condimentá.',
    'Rellená los panqueques y enrollalos.',
    'Cubrí con tuco liviano y mandá al horno a 180 °C por 20 min.',
  ],
  'Ensalada mixta': ['Lavá bien la lechuga y el tomate.', 'Cortá todo, sumá zanahoria rallada y cebolla.', 'Aliñá aparte con sal, limón o vinagre y el aceite medido.'],
  'Bife de cuadril a la plancha con arroz primavera y ensalada verde': [
    'Hervir el arroz 15-18 min; en los últimos 5 min sumá choclo, arvejas y zanahoria en cubitos.',
    'Poné la plancha bien caliente y cociná el bife 4-5 min por lado.',
    'Dejá reposar la carne 3 min antes de cortarla.',
    'Armá la ensalada verde y condimentala con la cucharada de oliva.',
  ],
  'Pollo al horno con papas y batatas': [
    'Cortá las papas y batatas en cubos.',
    'Ponelas en placa con el pollo, spray de oliva, sal y romero.',
    'Mandá al horno a 200 °C por 35-40 min, moviendo a la mitad.',
  ],
  'Wok de pollo y vegetales con arroz': [
    'Hervir el arroz 15-18 min.',
    'Cortá el pollo en tiras y saltealo a fuego fuerte 5 min.',
    'Sumá los vegetales en juliana y saltéa 3-4 min más, que queden crocantes.',
    'Terminá con un chorrito de salsa de soja y serví sobre el arroz.',
  ],
  'Fideos integrales con boloñesa magra': [
    'Sarteneá la carne picada magra con cebolla 8 min.',
    'Sumá la salsa de tomate y cociná 15 min a fuego bajo.',
    'Hervir los fideos 8-10 min al dente y mezclalos con la salsa.',
  ],
  'Ñoquis de papa con tuco y carne magra': [
    'Prepará el tuco: cebolla rehogada, carne magra y tomate, 15 min a fuego bajo.',
    'Hervir los ñoquis en agua con sal y sacalos apenas floten.',
    'Serví con el tuco arriba.',
  ],
  'Tortilla de papa al horno': [
    'Hervir las papas en cubos 10 min (o cocinarlas al horno).',
    'Rehogá la cebolla y mezclala con las papas y los huevos batidos.',
    'Volcá en molde con spray antiadherente y mandá al horno a 200 °C por 25 min.',
  ],
  'Merluza al horno con puré mixto': [
    'Hervir la papa y la calabaza 20 min y hacelas puré.',
    'Poné la merluza en una fuente con limón, sal y pimienta.',
    'Mandá al horno a 180 °C por 15-18 min.',
  ],
  'Arroz con pollo': [
    'Sellá el pollo en cubos en la olla con un chorrito de oliva.',
    'Sumá morrón y cebolla picados y rehogá 5 min.',
    'Agregá el arroz, las arvejas y el caldo (el doble que de arroz) y cociná 18-20 min tapado.',
  ],
  'Polenta con tuco y carne': [
    'Prepará el tuco con la carne picada magra, 15 min a fuego bajo.',
    'Hervir el agua con sal, sumá la polenta instantánea en lluvia y revolvé 5 min.',
    'Serví la polenta con el tuco arriba.',
  ],
  'Locro fit': [
    'Remojá los porotos y el maíz blanco la noche anterior.',
    'En la olla rehogá cebolla y sumá la carne magra en cubos.',
    'Agregá el zapallo, el maíz, los porotos y caldo.',
    'Cociná 2 h a fuego bajo revolviendo de vez en cuando, hasta que espese.',
  ],
  'Carbonada criolla fit': [
    'Rehogá cebolla y morrón y sumá la carne magra en cubos.',
    'Agregá zapallo, papa, batata y choclo en trozos con caldo.',
    'Cociná 40 min a fuego bajo y sumá el durazno al final.',
  ],
  'Hamburguesas caseras de lentejas con ensalada': [
    'Pisá las lentejas cocidas y mezclalas con cebolla, huevo y pan rallado.',
    'Formá los medallones y ponelos en placa con spray antiadherente.',
    'Mandá al horno a 200 °C por 20 min, vuelta a la mitad. Serví con la ensalada.',
  ],
  'Ensalada César fit con pollo': [
    'Cociná el pollo a la plancha 5-6 min por lado y cortalo en tiras.',
    'Mezclá la lechuga con los croutons y el parmesano.',
    'Hacé el aderezo con yogur, limón, ajo y mostaza, y sumalo al servir.',
  ],
  'Sándwich de lomito fit': [
    'Cociná el lomo finito a la plancha 2-3 min por lado.',
    'Hacé el huevo a la plancha.',
    'Armá el pan con lechuga, tomate, el lomo, el huevo y el queso light.',
  ],
  'Wrap integral de pollo y vegetales': [
    'Cociná el pollo en tiras a la plancha.',
    'Untá la tortilla con queso untable y sumá el pollo y los vegetales.',
    'Enrollá y dorá 1 min por lado en sartén.',
  ],
  'Albóndigas de carne magra con puré': [
    'Mezclá la carne picada con huevo, ajo, perejil y un poco de pan rallado; formá las albóndigas.',
    'Cocinalas en salsa de tomate 20 min a fuego bajo (o al horno).',
    'Hervir las papas y hacé el puré sin manteca.',
  ],
  'Revuelto gramajo fit': [
    'Cortá las papas en bastones y mandalas al horno a 200 °C por 30 min con spray de oliva.',
    'Salteá el jamón y las arvejas en sartén.',
    'Sumá los huevos batidos y las papas, y revolvé hasta que cuajen.',
  ],
  'Pollo al disco con verduras y arroz': [
    'Sellá el pollo en cubos en el disco o una sartén grande.',
    'Sumá cebolla, morrón y zanahoria y rehogá 10 min.',
    'Agregá caldo y cociná 15 min; serví con el arroz hervido.',
  ],
  'Zapallitos rellenos de carne y queso': [
    'Hervir los zapallitos 8 min, cortalos al medio y ahuecalos.',
    'Sarteneá la carne picada con cebolla y la pulpa del zapallito.',
    'Rellená, poné el queso arriba y mandá al horno a 200 °C por 15 min.',
  ],
  'Pechuga rellena de jamón y queso con puré': [
    'Abrí la pechuga como libro y rellenala con el jamón y el queso.',
    'Cerrala con palillos y mandala al horno a 200 °C por 25 min.',
    'Acompañá con puré de papa sin manteca.',
  ],
  'Pastel de batata y pollo': [
    'Hervir las batatas y hacelas puré.',
    'Salteá el pollo desmenuzado con cebolla y morrón.',
    'Armá en fuente (pollo abajo, puré arriba) y gratiná 15 min a 200 °C.',
  ],
  'Cazuela de merluza con papas': [
    'Rehogá cebolla y morrón en la cazuela.',
    'Sumá papas en rodajas finas, tomate y caldo, y cociná 15 min.',
    'Agregá la merluza en trozos y cociná 8-10 min más, tapado.',
  ],
  'Salpicón de pollo': [
    'Hervir o cociná a la plancha el pollo y desmenuzalo.',
    'Mezclá con tomate, lechuga, zanahoria rallada, choclo y huevo duro.',
    'Aliñá con limón, sal y el aceite medido. Se come frío.',
  ],
  'Bondiola al horno con puré de calabaza': [
    'Condimentá la bondiola con ajo, pimentón y mostaza.',
    'Mandá al horno a 200 °C por 30-40 min, dando vuelta a la mitad.',
    'Hervir la calabaza 15 min y hacela puré.',
  ],
  'Revuelto de zapallitos con huevo y arroz': [
    'Salteá los zapallitos y la cebolla en sartén antiadherente 8 min.',
    'Sumá los huevos batidos y revolvé hasta que cuajen.',
    'Serví con el arroz hervido.',
  ],
  'Sándwich de milanesa de pollo fit': [
    'Hacé la milanesa de pollo al horno a 200 °C por 20 min.',
    'Armá el pan con lechuga, tomate y la milanesa.',
    'Si querés, sumá mostaza o mayonesa light medida.',
  ],
  'Wrap de huevo, atún y palta': [
    'Hacé los huevos revueltos o duros.',
    'Untá la tortilla con la palta pisada.',
    'Sumá el atún escurrido y el huevo, enrollá y dorá 1 min por lado.',
  ],
  'Fideos con atún, tomate y aceitunas': [
    'Hervir los fideos 8-10 min al dente.',
    'En sartén saltéa ajo, tomate en cubos y aceitunas 3 min.',
    'Sumá el atún escurrido y los fideos, y mezclá.',
  ],
  'Pollo al limón con batatas al horno': [
    'Mariná el pollo con jugo de limón, ajo y orégano 15 min.',
    'Ponelo en placa con las batatas en cubos y spray de oliva.',
    'Mandá al horno a 200 °C por 35 min.',
  ],
  // ---- Parrilla y flex-meals ----
  'Cuadril a la parrilla con ensalada': ['Poné la carne a fuego medio y hacé vuelta y vuelta.', 'Dejala reposar 3 min antes de cortar.', 'Acompañá con ensalada o papa hervida.'],
  'Entraña a la parrilla con papa': ['Cociná la entraña a fuego fuerte 4-5 min por lado.', 'Hervir la papa 20 min o hacela al rescoldo.'],
  'Asado de tira': ['Cociná a fuego medio-bajo, primero del lado del hueso, 40-50 min.', 'Dalo vuelta una sola vez y salá al final.'],
  Molleja: ['Cociná a fuego medio 30-40 min, hasta que esté crocante por fuera.', 'Terminá con limón.'],
  Chinchulín: ['Cociná a fuego medio hasta que quede bien crocante.', 'Una porción medida, compartida.'],
  'Choripán táctico': ['Medio chorizo bien cocido a la parrilla.', 'En medio pan, con chimichurri o criolla.'],
  'Hamburguesa casera completa': [
    'Formá la hamburguesa con la carne picada y salpimentá.',
    'Cocinala a la plancha o parrilla 4 min por lado y poné el queso al final.',
    'Armá el pan con lechuga y tomate.',
  ],
  'Brochette de pollo y vegetales': [
    'Cortá el pollo, el morrón, la cebolla y el zapallito en cubos.',
    'Armá las brochettes alternando pollo y verdura.',
    'Cocinalas en parrilla o grill 12-15 min, girándolas.',
  ],
  'Provoleta medida': ['Cociná la provoleta en provoletera a fuego fuerte 5 min.', 'Orégano y ají molido arriba. Media provoleta, compartida.'],
  // ---- Clásicos dulces ----
  'Postre Vigilante': ['Cortá el queso fresco y el dulce de batata o membrillo en fetas.', 'Serví una feta de cada uno.'],
  'Flan casero light': [
    'Batí los huevos con la leche descremada, el edulcorante y la esencia de vainilla.',
    'Volcá en flanera y cociná a baño maría en el horno a 180 °C por 45 min.',
    'Dejalo enfriar en la heladera antes de desmoldar.',
  ],
  'Gelatina light con fruta': ['Prepará la gelatina sin azúcar según el envase.', 'Sumá la fruta picada y llevá a la heladera 2 h.'],
  'Arroz con leche fit': [
    'Cociná el arroz en la leche descremada a fuego bajo 30 min, revolviendo seguido.',
    'Endulzá con edulcorante y sumá cáscara de limón y canela.',
    'Serví tibio o frío.',
  ],
  'Vegetales grillados': ['Cortá zapallito, berenjena, morrón y cebolla en rodajas.', 'Grillalos en plancha bien caliente 3-4 min por lado o mandalos al horno a 200 °C por 20 min.'],
};
