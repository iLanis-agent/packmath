/* PackMath engine - ultralight pack weight auditor. Pure logic, no DOM. */
(function (root) {
  'use strict';

  var CLASSES = ['carried', 'worn', 'consumable'];
  var CATEGORIES = ['pack', 'shelter', 'sleep', 'cook', 'clothing', 'water', 'food', 'safety', 'other'];

  /* Reference weights (grams) for the "big three" plus common categories.
     An item classed 'carried' above benchmark gets flagged. */
  var BENCHMARKS = {
    pack: 900,        // a light 50-65L pack
    shelter: 1100,    // tent or tarp + poles per person
    sleep: 900,       // bag/quilt + pad combined per item is harsh, so per item
    cook: 300,
    clothing: 400,
    water: 0,         // water judged by volume elsewhere
    food: 0,
    safety: 500,
    other: 300
  };

  var BASE_BANDS = [
    { max: 4500, label: 'ultralight' },
    { max: 9000, label: 'lightweight' },
    { max: 13600, label: 'traditional' },
    { max: Infinity, label: 'heavy' }
  ];

  var PCT_BANDS = [
    { max: 10, label: 'easy carry' },
    { max: 20, label: 'manageable' },
    { max: 30, label: 'working hard' },
    { max: Infinity, label: 'too heavy' }
  ];

  function bandFor(value, bands) {
    for (var i = 0; i < bands.length; i++) {
      if (value < bands[i].max) return bands[i].label;
    }
    return bands[bands.length - 1].label;
  }

  function normItem(raw, idx) {
    if (!raw || typeof raw !== 'object') throw new Error('Item ' + (idx + 1) + ' is not an object');
    var name = String(raw.name == null ? '' : raw.name).trim();
    if (!name) throw new Error('Item ' + (idx + 1) + ' needs a name');
    var grams = Number(raw.grams);
    if (!isFinite(grams) || grams <= 0) throw new Error('"' + name + '" needs a weight in grams above 0');
    if (grams > 50000) throw new Error('"' + name + '" at ' + grams + ' g - that is over 50 kg, check the number');
    var cls = String(raw.cls || 'carried').toLowerCase();
    if (CLASSES.indexOf(cls) < 0) throw new Error('"' + name + '" class must be carried, worn or consumable');
    var cat = String(raw.category || 'other').toLowerCase();
    if (CATEGORIES.indexOf(cat) < 0) throw new Error('"' + name + '" has unknown category "' + cat + '"');
    return { name: name, grams: Math.round(grams), cls: cls, category: cat };
  }

  function analyze(input) {
    if (!input || typeof input !== 'object') throw new Error('No input');
    var itemsRaw = input.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) throw new Error('Add at least one item');
    var bodyKg = Number(input.bodyKg);
    if (!isFinite(bodyKg) || bodyKg < 30 || bodyKg > 200) throw new Error('Body weight must be between 30 and 200 kg');
    var waterL = input.waterL == null || input.waterL === '' ? 0 : Number(input.waterL);
    if (!isFinite(waterL) || waterL < 0 || waterL > 8) throw new Error('Water must be 0-8 litres');

    var items = itemsRaw.map(normItem);
    var carriedG = 0, wornG = 0, consumableG = 0;
    var byCat = {};
    CATEGORIES.forEach(function (c) { byCat[c] = 0; });
    items.forEach(function (it) {
      if (it.cls === 'carried') carriedG += it.grams;
      else if (it.cls === 'worn') wornG += it.grams;
      else consumableG += it.grams;
      if (it.cls === 'carried') byCat[it.category] += it.grams;
    });
    var waterG = Math.round(waterL * 1000);
    consumableG += waterG;

    var baseG = carriedG;                      // base weight: everything carried except consumables
    var totalPackG = carriedG + consumableG;   // what your back actually feels at trailhead
    var skinOutG = totalPackG + wornG;         // everything that is not the ground

    var pctBody = totalPackG / (bodyKg * 1000) * 100;

    var over = items.filter(function (it) {
      return it.cls === 'carried' && BENCHMARKS[it.category] > 0 && it.grams > BENCHMARKS[it.category];
    }).map(function (it) {
      return { name: it.name, grams: it.grams, category: it.category, benchmark: BENCHMARKS[it.category], overBy: it.grams - BENCHMARKS[it.category] };
    }).sort(function (a, b) { return b.overBy - a.overBy; });

    var heaviest = items.slice().sort(function (a, b) { return b.grams - a.grams; }).slice(0, 3)
      .map(function (it) { return { name: it.name, grams: it.grams, cls: it.cls }; });

    var catRows = CATEGORIES.map(function (c) { return { category: c, grams: byCat[c] }; })
      .filter(function (r) { return r.grams > 0; })
      .sort(function (a, b) { return b.grams - a.grams; });
    var maxCat = catRows.length ? catRows[0].grams : 0;
    catRows.forEach(function (r) { r.pct = Math.round(r.grams / carriedG * 1000) / 10; r.bar = maxCat ? r.grams / maxCat : 0; });

    var baseVerdict = bandFor(baseG, BASE_BANDS);
    var pctVerdict = bandFor(pctBody, PCT_BANDS);

    var verdict = 'Base weight ' + (baseG / 1000).toFixed(1) + ' kg puts you in ' + baseVerdict + ' territory. ' +
      'At the trailhead your back carries ' + (totalPackG / 1000).toFixed(1) + ' kg - ' +
      (Math.round(pctBody * 10) / 10) + '% of your body weight, which reads "' + pctVerdict + '".';
    if (over.length) {
      verdict += ' Biggest fix: your ' + over[0].name + ' is ' + over[0].overBy + ' g over the ' + over[0].category + ' benchmark.';
    } else {
      verdict += ' Nothing is over its category benchmark - the grams are hiding in the count, not any single item.';
    }

    return {
      itemCount: items.length,
      baseG: baseG,
      consumableG: consumableG,
      waterG: waterG,
      wornG: wornG,
      totalPackG: totalPackG,
      skinOutG: skinOutG,
      pctBody: Math.round(pctBody * 10) / 10,
      baseVerdict: baseVerdict,
      pctVerdict: pctVerdict,
      overBenchmark: over,
      heaviest: heaviest,
      categories: catRows,
      verdict: verdict
    };
  }

  var api = { analyze: analyze, CLASSES: CLASSES, CATEGORIES: CATEGORIES, BENCHMARKS: BENCHMARKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PackMathEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
