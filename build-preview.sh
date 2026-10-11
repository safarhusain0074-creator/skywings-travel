#!/bin/bash
# Builds the Netlify Drop design-preview zip from public/ plus static-preview
# enhancements (embedded package data, API fallback). The live source in
# public/ stays clean — preview-only files are injected at build time.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD=/tmp/skywings-preview-build
OUT=~/workspace/your_files/skywings-preview-v2.zip

rm -rf "$BUILD" && mkdir -p "$BUILD"
cp -r "$ROOT/public/." "$BUILD/"

# 1) preview-data.js (embedded catalogue for static hosting)
cat > "$BUILD/assets/js/preview-data.js" << 'EOF'
/* SkyWings static-preview data (Netlify Drop design preview only). */
window.SW_PREVIEW_PACKAGES = [
  { id: 1, type: 'tour', title: 'Canada Explorer', location: 'Toronto, Niagara & Vancouver', duration: '7 Days / 6 Nights', price_pkr: 485000, active: 1,
    description: 'Return airfare, 4-star hotels with breakfast, Niagara Falls day trip, Toronto city tour, Vancouver highlights. Visa assistance included.',
    itinerary: 'Day 1-2: Toronto arrival & city tour\nDay 3: Niagara Falls day trip\nDay 4-5: Fly to Vancouver, city highlights\nDay 6: Capilano & Grouse Mountain\nDay 7: Departure', image: null },
  { id: 2, type: 'tour', title: 'Malaysia Discovery', location: 'Kuala Lumpur, Langkawi & Genting', duration: '6 Days / 5 Nights', price_pkr: 195000, active: 1,
    description: 'Return airfare, 4-star hotels, KL city tour with Batu Caves, Genting Highlands, Langkawi island day trip. Visa assistance included.',
    itinerary: 'Day 1-2: Kuala Lumpur & Batu Caves\nDay 3: Genting Highlands\nDay 4-5: Langkawi island & cable car\nDay 6: Departure', image: null },
  { id: 3, type: 'tour', title: 'Azerbaijan Highlights', location: 'Baku, Gabala & Shahdag', duration: '5 Days / 4 Nights', price_pkr: 165000, active: 1,
    description: 'Return airfare, 4-star hotel in Baku, old city & Flame Towers tour, Gabala day trip, Shahdag mountain resort. Visa assistance included.',
    itinerary: 'Day 1-2: Baku old city, Flame Towers & Caspian promenade\nDay 3: Gabala day trip\nDay 4: Shahdag mountain resort\nDay 5: Departure', image: null },
  { id: 4, type: 'tour', title: 'Dubai City Break', location: 'Dubai, UAE', duration: '4 Days / 3 Nights', price_pkr: 125000, active: 1,
    description: 'Return airfare, 4-star hotel with breakfast, city tour, desert safari with dinner, dhow cruise. Visa assistance included.',
    itinerary: 'Day 1: Arrival & marina walk\nDay 2: City tour & Burj Khalifa\nDay 3: Desert safari\nDay 4: Departure', image: null },
  { id: 5, type: 'tour', title: 'Istanbul & Cappadocia', location: 'Turkey', duration: '7 Days / 6 Nights', price_pkr: 285000, active: 1,
    description: 'Return airfare, 4-star hotels, Bosphorus cruise, hot-air balloon option, guided old-city tours. Visa assistance included.',
    itinerary: 'Day 1-3: Istanbul old city & Bosphorus\nDay 4-5: Cappadocia valleys & balloon\nDay 6: Grand Bazaar\nDay 7: Departure', image: null },
  { id: 6, type: 'umrah', title: 'Umrah Package \u2014 14 Days', location: 'Makkah & Madinah', duration: '14 Days', price_pkr: 195000, active: 1,
    description: 'Direct flights, 4-star hotels near Haram (shuttle), guided ziyarat in Makkah & Madinah, visa + transport included.',
    itinerary: 'Week 1: Makkah \u2014 Umrah & ziyarat\nWeek 2: Madinah \u2014 Rawdah & ziyarat', image: null },
  { id: 7, type: 'hotel', title: 'Hotel Margalla Hills \u2014 Islamabad', location: 'Islamabad', duration: 'Per Night', price_pkr: 12000, active: 1,
    description: 'Deluxe rooms with Margalla view, breakfast included, free WiFi & parking. 10 min from airport.', itinerary: null, image: null },
  { id: 8, type: 'hotel', title: 'Hotel Ravi View \u2014 Lahore', location: 'Lahore', duration: 'Per Night', price_pkr: 9500, active: 1,
    description: 'Executive rooms near Mall Road, breakfast included, family suites available.', itinerary: null, image: null },
  { id: 9, type: 'hotel', title: 'Hotel Sea Breeze \u2014 Karachi', location: 'Karachi', duration: 'Per Night', price_pkr: 11000, active: 1,
    description: 'Sea-view rooms at Clifton, breakfast included, 15 min from Jinnah International.', itinerary: null, image: null },
];
EOF

# 2) inject the script tag into every page (after site-config.js)
for f in "$BUILD"/*.html; do
  sed -i 's|<script src="assets/js/site-config.js"></script>|<script src="assets/js/site-config.js"></script>\n<script src="assets/js/preview-data.js"></script>|' "$f"
done

# 3) SW.api fallback for /api/packages when no backend is reachable
python3 - "$BUILD/assets/js/app.js" << 'PYEOF'
import sys
p = sys.argv[1]
src = open(p).read()
fallback = """    /* Static-preview fallback: on hosts with no backend (Netlify Drop),
       serve the package catalogue from preview-data.js instead of failing. */
    if ((!opts.method || opts.method === 'GET') && typeof path === 'string' &&
        path.indexOf('/api/packages') === 0 && window.SW_PREVIEW_PACKAGES) {
      try {
        const res = await fetch(path);
        if (res.ok) { const d = await res.json(); if (d && d.packages) return d; }
      } catch (e) { /* no backend — fall through to preview data */ }
      const single = path.match(/^\\/api\\/packages\\/(\\d+)/);
      if (single) {
        const pkg = window.SW_PREVIEW_PACKAGES.find(function (x) { return String(x.id) === single[1] && x.active; });
        if (!pkg) throw new Error('Package not found (preview)');
        return { package: pkg };
      }
      const tm = (path.split('?')[1] || '').match(/(?:^|&)type=([^&]+)/);
      const type = tm ? decodeURIComponent(tm[1]) : null;
      return { packages: window.SW_PREVIEW_PACKAGES.filter(function (x) { return x.active && (!type || x.type === type); }) };
    }
"""
marker = "async function api("
if "Static-preview fallback" not in src:
    # insert right after the api function opening line
    idx = src.find(marker)
    assert idx != -1, "api() not found"
    brace = src.find("{", idx) + 1
    src = src[:brace] + "\n" + fallback + src[brace:]
    open(p, "w").write(src)
    print("fallback injected")
else:
    print("fallback already present")
PYEOF

# 4) zip it
rm -f "$OUT"
(cd "$BUILD" && zip -qr "$OUT" .)
echo "Built: $OUT ($(du -h "$OUT" | cut -f1))"
