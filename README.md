# E.N.A. — Exploración, Naturaleza y Análisis

Plataforma web de investigación ambiental para el entorno del Centro Ambiental Chimayoy, Pasto, Nariño, Colombia. La versión 11 corrige la traducción integral EN/ES, mejora la experiencia visual y funcional: portada con acercamiento cartográfico mundial a Chimayoy, mapas con base cartográfica y polígono GeoJSON, galería fotográfica ampliada, ilustración conceptual de UAV, semáforo interactivo, filtros temporales, centro de descargas, resultados descriptivos calculados desde las series y selector de idioma EN/ES con traducción de encabezados, rótulos, metadatos, navegación y controles. Integra series procesadas de GPM IMERG, MODIS NDVI/EVI, MODIS LST y NASA POWER; incorpora la geometría catastral de referencia y conserva las fuentes originales utilizadas para producir los archivos web.

## Ejecutar localmente

La web utiliza `fetch()` para leer los archivos JSON y GeoJSON. Debe abrirse desde un servidor HTTP local, no mediante doble clic en `index.html`. Las rutas de datos se resuelven ahora desde la ubicación de `assets/ena-interacciones.js`, para que funcionen también cuando el sitio se publique dentro de una subcarpeta.

```bash
cd ENA_web
python -m http.server 8000
```

Abrir `http://localhost:8000`.

## Datos conectados

| Variable | Fuente / producto | Frecuencia | Registros disponibles | Tratamiento |
|---|---|---:|---:|---|
| Precipitación acumulada | GPM IMERG 3IMERGM V07B | Mensual | 68 meses; 63 válidos y 5 faltantes | Se usa `precipitation_mm_month` del CSV auditado; no se rellena ningún mes. |
| Precipitación regional | GPM IMERG V07B, cuadrícula 5×5 | Mensual | 25 puntos × 69 fechas (1.725 registros) | Se conserva el campo original `precipitation` en mm/h. Se visualizan los centros de las celdas en el mapa regional. |
| NDVI | MODIS Terra MOD13Q1.061 | 16 días | 63 fechas válidas | Factor 0,0001; solo píxeles con Pixel Reliability = 0. Promedio ponderado por área de intersección píxel–polígono. |
| EVI | MODIS Terra MOD13Q1.061 | 16 días | 63 fechas válidas | Factor 0,0001; solo píxeles con Pixel Reliability = 0. Promedio ponderado por área de intersección píxel–polígono. |
| LST diurna | MODIS Terra MOD11A2.061 | 8 días | 97 fechas válidas | QC obligatorio bits 0–1 = 00; escala 0,02 y conversión a °C. |
| LST nocturna | MODIS Terra MOD11A2.061 | 8 días | 59 fechas válidas | QC obligatorio bits 0–1 = 00; escala 0,02 y conversión a °C. Cobertura menor por ausencia de archivos QC coincidentes. |
| Contexto meteorológico | NASA POWER Point Monthly | Mensual | 132 meses por parámetro, 2015–2025 | T2M, T2M_MAX, T2M_MIN, RH2M, PRECTOTCORR, WS10M y ALLSKY_SFC_SW_DWN. No representa una estación local. |
| Humedad del suelo (superficial, zona radicular y perfil) | NASA POWER / MERRA-2 · GWETTOP, GWETROOT y GWETPROF | Mensual | 132 registros por indicador, 2015–2025 | Fracciones adimensionales de humedad/saturación. Son estimaciones regionales modeladas/asimiladas; no son contenido volumétrico (m³/m³), mediciones in situ ni datos SMAP. |

Los detalles por producto, cobertura, estado y limitaciones están en `data/manifest.json`.

## Delimitación y escala espacial

La geometría incluida (`data/processed/chimayoy_cadastral_reference.geojson`) es un polígono catastral de referencia de aproximadamente 49,10 ha. No se presenta como certificación del perímetro institucional del Centro Ambiental Chimayoy. El punto 1,2624081° N, −77,2850228° O es un punto de referencia y no se afirma que sea el centroide del polígono.

La estadística zonal MODIS se calculó transformando la geometría a la proyección sinusoidal del producto y ponderando cada píxel por su área de intersección. Debido al tamaño de píxel, MOD11A2 (1 km) debe interpretarse como contexto térmico regional. GPM (0,1°) y NASA POWER también tienen escala regional.

## Componentes complementarios

- **SMAP SPL4SMGP.008:** la extracción de AppEEARS continúa en procesamiento. No se incorpora a las series hasta contar con archivos descargados y validados. No se generan valores ficticios.
- **Dron / UAV:** el subsistema se presenta como flujo conceptual de captura RGB, procesamiento visual, detección y evaluación. La animación de vuelo es ilustrativa; no representa un vuelo real ni sustituye la integración virtual de la aplicación de dron que entregará el equipo.

## Archivos principales

- `data/processed/*.json`: series listas para la interfaz.
- `data/manifest.json`: catálogo de productos, coberturas y limitaciones.
- `data/processed/chimayoy_cadastral_reference.geojson`: geometría catastral de referencia.
- `data/source/`: CSV originales y archivos ZIP originales de MODIS para trazabilidad.
- `docs/ENA_Investigacion_Chimayoy_APA7.docx`: documento de investigación.
- `docs/ENA_Auditoria_inicial_datos.xlsx`: auditoría inicial recibida.

## Interfaz y consulta

La navegación incluye un selector de idioma inglés/español. El explorador permite consultar toda la serie disponible, un año, un mes del año seleccionado o un intervalo de años. Los archivos se descargan desde el centro de descargas; no se ofrece carga de CSV por parte del visitante. Los mapas utilizan cartografía base CARTO basada en OpenStreetMap y dibujan el polígono GeoJSON de referencia. La portada inicia en una vista mundial y realiza un acercamiento animado a Chimayoy.

Los resultados presentan estadísticas descriptivas calculadas desde las series locales: número de observaciones, promedio, mínimo, máximo y cobertura temporal. No se presentan como pruebas de tendencia ni de significancia.

## Criterios de interpretación

Los gráficos presentan estadística descriptiva, climatología mensual y anomalías calculadas con respecto al promedio de cada mes dentro del periodo seleccionado por el usuario. Esto no constituye una prueba de tendencia ni de significancia. Antes de publicar conclusiones se deben evaluar la continuidad temporal, estacionalidad, autocorrelación, cobertura y calidad de cada producto; los periodos de referencia deben declararse explícitamente.

## Fuentes

- GPM IMERG V07: https://gpm.nasa.gov/data/imerg
- MOD13Q1.061: https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/MOD13Q1/
- MOD11A2.061: https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/MOD11A2/
- NASA POWER: https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/
- SMAP SPL4SMGP: https://nsidc.org/data/spl4smgp

La interfaz permite consultar también la cuadrícula regional GPM 5×5 seleccionando uno de sus 25 centros de celda; los puntos se muestran sobre el mapa de contexto. La serie principal de precipitación mensual usa el valor agregado procesado para el polígono/celda intersectante y mantiene los cinco meses faltantes como vacíos.


### Cartografía base (v8)

Los mapas utilizan teselas públicas de OpenStreetMap (`tile.openstreetmap.org`) y muestran la atribución correspondiente. No requieren una API key de CARTO. Se necesita conexión a Internet para cargar las teselas.


## Version 12 — complete bilingual interface

- The interface now starts in English and the EN/ES selector applies a page-wide translation pass.
- Added coverage for methodology text, small captions, map labels, risk labels, metadata, chart placeholders, data filters, download links and accessibility labels.
- The Spanish source strings are preserved and restored when switching back to ES.
- Dynamic chart and data-explorer messages continue to use the selected language.


## Reparación de idioma y restauración de métricas (v14)

- Se corrigió el guardado/restauración de atributos `aria-label`, `alt` y `title` durante el cambio de idioma. La versión anterior intentaba usar una clave con guion dentro de `dataset`, lo que interrumpía `setLanguage()`.
- Se conserva la lógica de `render()`, `register()` y `updateResultCards()` de la versión 9.
- Se conservan los ocho archivos de datos procesados de la versión 13, verificados contra los de la versión 9.
- Se actualizó el identificador de caché del script a `v=15`.


## V15 · Ajustes solicitados de mapa y equipo

- Se ajustó únicamente la altura del mapa del explorador para que ocupe el espacio vertical de su tarjeta en pantallas de escritorio; en móvil conserva una altura compacta.
- Se incorporó la sección del equipo con los tres retratos proporcionados y los datos académicos suministrados.
- Se añadieron las traducciones de los datos del equipo al inglés y su restauración al español mediante el selector existente.
- Se añadió una recalculación del tamaño de Leaflet al terminar de cargar la página para evitar que el mapa se pinte parcialmente tras el ajuste de diseño.
- No se modificaron los datos, las métricas, las gráficas, las fuentes, ni el contenido de las demás secciones.


## Integración de indicadores de humedad (v16)

Se incorporan desde `chimayoy_nasa_real_2015_2025.csv` tres series mensuales: `GWETTOP` (capa superficial, 0–5 cm), `GWETROOT` (zona radicular, 0–100 cm) y `GWETPROF` (perfil del suelo). Cada indicador contiene 132 registros entre enero de 2015 y diciembre de 2025. Los valores se conservan en su escala original como fracciones adimensionales (1), sin convertirlos a m³/m³ ni a porcentaje.

La humedad relativa `RH2M` también aparece en el CSV, pero ya está conectada en el explorador mediante la serie NASA POWER existente; no se agrega una segunda serie duplicada. Los indicadores `GWET*` corresponden a humedad/saturación del suelo del sistema MERRA-2 y no a la extracción SMAP SPL4SMGP.008, que permanece identificada por separado como pendiente.

El archivo `data/processed/humidity_indicators.json` alimenta las tres series del explorador, sus gráficos, resumen estadístico descriptivo, tabla y tarjetas de resultados. El CSV de origen se conserva en `data/source/chimayoy_nasa_real_2015_2025.csv`.
