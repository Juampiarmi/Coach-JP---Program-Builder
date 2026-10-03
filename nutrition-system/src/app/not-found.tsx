import Home from './page';

/**
 * El Builder es una única pantalla: cualquier ruta bajo el basePath que el router no reconozca
 * (/nutrition/index.html, mayúsculas distintas, parámetros de PWA, etc.) renderiza la app en lugar
 * de la página 404 de Next, que en GitHub Pages aparecía con el título "Coach JP Nutrition Builder".
 */
export default function NotFound() {
  return <Home />;
}
