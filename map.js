// Initialize the OpenLayers map
var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        //center: ol.proj.fromLonLat([-71.180763, -41.100015]), // Change to a known start location
        center: ol.proj.fromLonLat([-98.5795, 39.8283]),
        zoom: 5
    })
});

//var kmlSource = new ol.source.Vector({
//    url: 'data/test.kml',
//    format: new ol.format.KML()
//});
//var kmlLayer = new ol.layer.Vector({
//    source: kmlSource
//});
//map.addLayer(kmlLayer);

var gpxSource = new ol.source.Vector({
    url: 'data/full-at.gpx',
    format: new ol.format.GPX()
});
var gpxLayer = new ol.layer.Vector({
    source: gpxSource,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#ff0000',
            width: 3
        })
    })
});
map.addLayer(gpxLayer);

gpxSource.on('error', function (evt) {
    console.error("Error loading GPX file:", evt);
});


gpxSource.once('change', function () {
    console.log("GPX State:", gpxSource.getState());
    console.log("Number of features:", gpxSource.getFeatures().length);
    if (gpxSource.getFeatures().length === 0) {
        alert("No features found in GPX. Check file structure or OpenLayers compatibility.");
    }
    map.getView().fit(gpxSource.getExtent(), { duration: 1000, padding: [50, 50, 50, 50] });
});

// Debug: Check if KML loads
//kmlSource.once('change', function () {
//    console.log("KML State:", kmlSource.getState());
//    console.log("Number of features:", kmlSource.getFeatures().length);
//    
//    if (kmlSource.getFeatures().length === 0) {
//        alert("No features found in KML. Check file structure or OpenLayers compatibility.");
//    } else {
//        var extent = kmlSource.getExtent();
//        map.getView().fit(extent, { duration: 1000, padding: [50, 50, 50, 50] });
//    }
//});
