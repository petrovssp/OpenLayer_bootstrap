// =========================
// BASE LAYERS
// =========================
const osm = new ol.layer.Tile({
    source: new ol.source.OSM(),
    visible: true
});

const googleSat = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
    }),
    visible: false
});

// =========================
// WMS LAYERS
// =========================
const wmsUrl = "hhttps://geos.ssp-bg.com/geoserver/Bulgaria/wms";

const wmsLayers = {
    "Oblasti": new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: wmsUrl,
            params: { LAYERS: "Bulgaria:Oblasti", TILED: true },
            serverType: "geoserver"
        }),
        visible: true
    }),
    "Munisipalities": new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: wmsUrl,
            params: { LAYERS: "Bulgaria:Munisipalities", TILED: true },
            serverType: "geoserver"
        }),
        visible: true
    }),
    "Settlement": new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: wmsUrl,
            params: { LAYERS: "Bulgaria:Settlement", TILED: true },
            serverType: "geoserver"
        }),
        visible: true
    }),
    "Reki": new ol.layer.Tile({
        source: new ol.source.TileWMS({
            url: wmsUrl,
            params: { LAYERS: "Bulgaria:Reki", TILED: true },
            serverType: "geoserver"
        }),
        visible: true
    })
};

// =========================
// MAP INITIALIZATION
// =========================
const map = new ol.Map({
    target: 'map',
    layers: [osm, googleSat, ...Object.values(wmsLayers)],
    view: new ol.View({
        center: ol.proj.fromLonLat([25.5, 42.7]),
        zoom: 7
    })
});

// =========================
// BASE LAYER SWITCHER
// =========================
document.querySelectorAll('.base-layer').forEach(radio => {
    radio.addEventListener('change', function () {
        osm.setVisible(this.value === "osm");
        googleSat.setVisible(this.value === "google");
    });
});

// =========================
// WMS LAYER SWITCHER + OPACITY SLIDERS
// =========================
Object.keys(wmsLayers).forEach(name => {
    const checkbox = document.querySelector(`input[value="${name}"]`);

    // Create opacity slider
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.1;
    slider.value = 1;
    slider.id = name + "_opacity";
    slider.className = "opacity-slider";
    slider.style.display = "block"; // visible by default

    checkbox.parentNode.appendChild(slider);

    // Slider event
    slider.addEventListener("input", function () {
        wmsLayers[name].setOpacity(parseFloat(this.value));
    });
});

// Checkbox events
document.querySelectorAll('.wms-layer').forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        const layer = wmsLayers[this.value];
        layer.setVisible(this.checked);

        const slider = document.getElementById(this.value + "_opacity");
        slider.style.display = this.checked ? "block" : "none";

        updateLegend();
    });
});

// =========================
// LEGEND PANEL
// =========================
const legendPanel = document.getElementById("legendPanel");
const legendToggle = document.getElementById("legendToggle");
const legendContent = document.getElementById("legendContent");
const legendScroll = document.getElementById("legendScroll");

// Expand / Collapse Legend inside sidebar
legendToggle.addEventListener("click", () => {
    const isCollapsed = legendPanel.classList.contains("collapsed");

    if (isCollapsed) {
        legendPanel.classList.remove("collapsed");
        legendPanel.classList.add("expanded");
        legendToggle.textContent = "Legend ▲";
    } else {
        legendPanel.classList.remove("expanded");
        legendPanel.classList.add("collapsed");
        legendToggle.textContent = "Legend ▼";
    }
});


// Scroll slider controls legend content
legendScroll.addEventListener("input", () => {
    const maxScroll = legendContent.scrollHeight - legendContent.clientHeight;
    const scrollPos = (legendScroll.value / 100) * maxScroll;
    legendContent.scrollTop = scrollPos;
});

// Update legend dynamically
function updateLegend() {
    legendContent.innerHTML = "";

    Object.keys(wmsLayers).forEach(name => {
        if (wmsLayers[name].getVisible()) {
            const label = document.createElement("div");
            label.innerHTML = `<strong>${name}</strong>`;

            const img = document.createElement("img");
            img.src = `${wmsUrl}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=Bulgaria:${name}`;
            img.style.width = "100px";

            legendContent.appendChild(label);
            legendContent.appendChild(img);
        }
    });

    legendScroll.value = 0;
    legendContent.scrollTop = 0;
}

// Initial legend load
updateLegend();

// =========================
// FEATURE INFO POPUP
// =========================
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

const overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: { duration: 250 }
});

map.addOverlay(overlay);

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

// Map click handler
map.on('singleclick', function (evt) {
    overlay.setPosition(undefined);

    const viewResolution = map.getView().getResolution();

    Object.keys(wmsLayers).forEach(name => {
        const layer = wmsLayers[name];
        if (!layer.getVisible()) return;

        const url = layer.getSource().getFeatureInfoUrl(
            evt.coordinate,
            viewResolution,
            'EPSG:3857',
            { INFO_FORMAT: 'application/json' }
        );

        if (url) {
            fetch(url)
                .then(r => r.json())
                .then(json => {
                    if (json.features.length > 0) {
                        const props = json.features[0].properties;
                        let html = `<h6>${name}</h6><table class="table table-sm">`;

                        Object.keys(props).forEach(k => {
                            html += `<tr><td>${k}</td><td>${props[k]}</td></tr>`;
                        });

                        html += "</table>";

                        content.innerHTML = html;
                        overlay.setPosition(evt.coordinate);
                    }
                });
        }
    });
});
