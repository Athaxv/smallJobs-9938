import { categoryEmoji } from "@template/web/categories";

export const DEFAULT_LAT = 19.076;
export const DEFAULT_LNG = 72.8777;

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
  selected?: boolean;
}

export interface BuildMapHtmlOptions {
  userLat: number;
  userLng: number;
  markers?: MapMarker[];
  selectedId?: string | null;
  routePolyline?: [number, number][];
  routeDestination?: { lat: number; lng: number; emoji?: string };
}

export function buildMapHtml(options: BuildMapHtmlOptions): string {
  const {
    userLat,
    userLng,
    markers = [],
    selectedId = null,
    routePolyline = [],
    routeDestination,
  } = options;

  const markerData = markers.map((m) => ({
    ...m,
    selected: m.id === selectedId || m.selected,
  }));

  const routeCoords = routePolyline.length > 0
    ? JSON.stringify(routePolyline)
    : "[]";

  const destLat = routeDestination?.lat ?? userLat;
  const destLng = routeDestination?.lng ?? userLng;
  const destEmoji = routeDestination?.emoji ?? "📍";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; background:#e8e8e8; }
  .marker-pin {
    width:38px; height:38px; border-radius:50%;
    background:#fff; border:2px solid #e0e0e0;
    display:flex; align-items:center; justify-content:center;
    font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.15);
    cursor:pointer; transition:transform 0.15s;
  }
  .marker-pin.selected {
    border:2.5px solid #1a1a1a; background:#f5f5f5;
    transform:scale(1.2);
  }
  .dest-pin {
    width:44px; height:44px; border-radius:50%;
    background:#1a1a1a; border:3px solid #fff;
    display:flex; align-items:center; justify-content:center;
    font-size:20px; box-shadow:0 4px 12px rgba(0,0,0,0.25);
  }
  .leaflet-control-zoom { display:none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl:false, attributionControl:false })
    .setView([${userLat}, ${userLng}], 14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom:19
  }).addTo(map);

  var markers = ${JSON.stringify(markerData)};
  markers.forEach(function(m) {
    var icon = L.divIcon({
      html: '<div class="marker-pin' + (m.selected ? ' selected' : '') + '">' + m.emoji + '</div>',
      iconSize:[38,38], iconAnchor:[19,19], className:''
    });
    L.marker([m.lat, m.lng], {icon:icon})
      .addTo(map)
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerPress',id:m.id}));
      });
  });

  var routeCoords = ${routeCoords};
  if (routeCoords.length > 0) {
    L.polyline(routeCoords, { color:'#1a1a1a', weight:5, opacity:0.85, lineCap:'round', lineJoin:'round' }).addTo(map);
    var bounds = L.latLngBounds(routeCoords);
    map.fitBounds(bounds, { padding:[48,48] });
  }

  var hasRouteDest = ${routeDestination ? "true" : "false"};
  if (hasRouteDest) {
    var destIcon = L.divIcon({
      html: '<div class="dest-pin">${destEmoji}</div>',
      iconSize:[44,44], iconAnchor:[22,22], className:''
    });
    L.marker([${destLat}, ${destLng}], {icon:destIcon, zIndexOffset:1000}).addTo(map);
  }

  if (${userLat !== DEFAULT_LAT}) {
    window.userMarker = L.circleMarker([${userLat}, ${userLng}], {
      radius:9, fillColor:'#2563EB', fillOpacity:1, color:'#fff', weight:3
    }).addTo(map).bindTooltip('You', { permanent:false, direction:'top' });
    window.updateUserLocation = function(lat, lng) {
      if (window.userMarker) window.userMarker.setLatLng([lat, lng]);
    };
  }

  document.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'recenter') map.setView([msg.lat, msg.lng], 14);
      if (msg.type === 'focusPost') map.setView([msg.lat, msg.lng], 16);
      if (msg.type === 'updateUser' && window.updateUserLocation) window.updateUserLocation(msg.lat, msg.lng);
    } catch(ex) {}
  });
  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'recenter') map.setView([msg.lat, msg.lng], 14);
      if (msg.type === 'focusPost') map.setView([msg.lat, msg.lng], 16);
      if (msg.type === 'updateUser' && window.updateUserLocation) window.updateUserLocation(msg.lat, msg.lng);
    } catch(ex) {}
  });
</script>
</body>
</html>`;
}
