/***************************************************************
 * E.N.A. | SMAP soil moisture for Chimayoy (2015–2025)
 * Run in the Google Earth Engine Code Editor.
 *
 * Product collections:
 *   V005: NASA/SMAP/SPL3SMP_E/005 (historical archive)
 *   V006: NASA/SMAP/SPL3SMP_E/006 (from 2023-12-04 in GEE)
 *
 * Output: monthly area means of surface soil moisture (m3/m3).
 * QA: retain AM/PM retrievals where retrieval_qual_flag == 0.
 ***************************************************************/

var START = '2015-01-01';
var END_EXCLUSIVE = '2026-01-01';

// Same approximate study rectangle used for the GPM analysis.
var chimayoy = ee.Geometry.Rectangle([
  -77.55, 0.94, -77.05, 1.44
], null, false);

Map.centerObject(chimayoy, 10);
Map.addLayer(chimayoy, {color: '00d6a3'}, 'Área de estudio - Chimayoy');

var smapV5 = ee.ImageCollection('NASA/SMAP/SPL3SMP_E/005')
  .filterDate(START, '2023-12-04')
  .filterBounds(chimayoy);

var smapV6 = ee.ImageCollection('NASA/SMAP/SPL3SMP_E/006')
  .filterDate('2023-12-04', END_EXCLUSIVE)
  .filterBounds(chimayoy);

var smap = smapV5.merge(smapV6).sort('system:time_start');

// Daily image: mean of quality-approved morning and afternoon retrievals.
function dailySoilMoisture(image) {
  var am = image.select('soil_moisture_am')
    .updateMask(image.select('retrieval_qual_flag_am').eq(0));
  var pm = image.select('soil_moisture_pm')
    .updateMask(image.select('retrieval_qual_flag_pm').eq(0));

  var daily = am.addBands(pm)
    .reduce(ee.Reducer.mean())
    .rename('soil_moisture_m3m3');

  return daily.copyProperties(image, ['system:time_start']);
}

var daily = smap.map(dailySoilMoisture);

// Build one feature per calendar month. Spatial averaging is performed
// after the monthly temporal composite, using the native 9 km pixel scale.
var monthOffsets = ee.List.sequence(0, 131);
var monthlyFeatures = ee.FeatureCollection(monthOffsets.map(function(offset) {
  var monthStart = ee.Date(START).advance(offset, 'month');
  var monthEnd = monthStart.advance(1, 'month');
  var monthImages = daily.filterDate(monthStart, monthEnd);
  var monthlyImage = monthImages.mean();

  var stats = monthlyImage.reduceRegion({
    reducer: ee.Reducer.mean().combine({
      reducer2: ee.Reducer.count(),
      sharedInputs: true
    }),
    geometry: chimayoy,
    scale: 9000,
    maxPixels: 100000,
    bestEffort: true
  });

  var dateLabel = monthStart.format('YYYY-MM');
  var sourceVersion = ee.String(ee.Algorithms.If(
    monthStart.millis().lt(ee.Date('2023-12-01').millis()), '005',
    ee.Algorithms.If(monthStart.millis().gte(ee.Date('2024-01-01').millis()), '006', '005+006')
  ));

  return ee.Feature(null, {
    month: dateLabel,
    year: monthStart.get('year'),
    month_number: monthStart.get('month'),
    soil_moisture_m3m3: stats.get('soil_moisture_m3m3_mean'),
    valid_pixels: stats.get('soil_moisture_m3m3_count'),
    daily_images: monthImages.size(),
    source_version: sourceVersion
  });
}));

print('Colecciones SMAP V005 y V006', smapV5.size(), smapV6.size());
print('Vista previa de la serie mensual', monthlyFeatures.limit(12));
print('Área de estudio', chimayoy);

Export.table.toDrive({
  collection: monthlyFeatures,
  description: 'ENA_SMAP_Chimayoy_2015_2025',
  folder: 'ENA_SMAP',
  fileNamePrefix: 'smap_chimayoy_mensual_2015_2025',
  fileFormat: 'CSV',
  selectors: [
    'month', 'year', 'month_number', 'soil_moisture_m3m3',
    'valid_pixels', 'daily_images', 'source_version'
  ]
});
