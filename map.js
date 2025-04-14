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

var kmlSource = new ol.source.Vector({
    url: 'data/drewAT.kml',
    format: new ol.format.KML({
        extractStyles: false
    })
});
var kmlLayer = new ol.layer.Vector({
    source: kmlSource,
    style: function (feature) {
        var geometry = feature.getGeometry();
        const coord = geometry.getCoordinates();

        // Suppress blue marker for the first coordinate
        if (firstCoord && ol.coordinate.equals(coord, firstCoord)) {
            return null; // Don't style it — we'll use the custom marker
        }
        
        // Check if the feature is a point (waypoint)
        if (geometry instanceof ol.geom.Point) {
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 4,  // Size of the dot
                    fill: new ol.style.Fill({ color: 'blue' }),  // Dot color
                    stroke: new ol.style.Stroke({ color: 'white', width: 1 }) // Optional outline
                })
            });
        }
        
        // Check if the feature is a LineString (track path)
        if (geometry instanceof ol.geom.LineString) {
            return new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',  // Line color
                    width: 2  // Line thickness
                })
            });
        }
    }
});
map.addLayer(kmlLayer);

let firstCoord = null
kmlSource.once('change', function () {
    
    if (kmlSource.getFeatures().length === 0) {
        alert("No features found in KML. Check file structure or OpenLayers compatibility.");
    } else {
        var extent = kmlSource.getExtent();
        map.getView().fit(extent, { duration: 1000, padding: [50, 50, 50, 50] });
    }

    const features = kmlSource.getFeatures();
    for (let i = 0; i < features.length; i++) {
        const geom = features[i].getGeometry();
        if (geom instanceof ol.geom.LineString) {
            firstCoord = geom.getCoordinates()[0];
            break;
        }
    }

    // Add a "start" marker from KML track
    var kmlFeatures = kmlSource.getFeatures();
    for (var i = 0; i < kmlFeatures.length; i++) {
        var geom = kmlFeatures[i].getGeometry();
        if (geom instanceof ol.geom.LineString) {
            var coords = geom.getCoordinates();
            var startCoord = coords[0];

            // Tooltip overlay
            var markerEl = document.createElement('div');
            markerEl.className = 'start-marker';
            markerEl.innerHTML = `
                <div class="sign">START</div>
                <div class="post"></div>
            `;
            markerEl.setAttribute('data-bs-toggle', 'tooltip');
            markerEl.setAttribute('data-bs-placement', 'top');
            markerEl.setAttribute('title', 'Drew started here!');
            
            document.body.appendChild(markerEl);
            new bootstrap.Tooltip(markerEl);  // Initialize Bootstrap tooltip
            
            // Create an OpenLayers overlay with this DOM element
            const bootstrapOverlay = new ol.Overlay({
                element: markerEl,
                positioning: 'bottom-center',
                stopEvent: false
            });
            bootstrapOverlay.setPosition(startCoord);
            map.addOverlay(bootstrapOverlay);
            
            // Activate Bootstrap tooltips
            var tooltip = new bootstrap.Tooltip(markerEl);  // Requires Bootstrap 5
    
            break; // only add one marker for the first LineString
        }
    }
});


// function to process LineString and extract elevation
function processLineString(lineString, elevations, distances, totalDistance, totalGain, totalLoss, lastElevation) {
    var coords = lineString.getCoordinates();

    for (var i = 0; i < coords.length; i++) {
        var coord = coords[i];
        var lonLat = ol.proj.toLonLat(coord);

        var elevation = coord[2]; // Extract elevation (Z coordinate)
        if (isNaN(elevation)) elevation = 0; // Ensure no NaN values

        elevations.push(elevation);

        if (lastElevation !== null) {
            var diff = elevation - lastElevation;
            if (diff > 0) {
                totalGain += diff;
            } else {
                totalLoss += Math.abs(diff);
            }
        }
        lastElevation = elevation;

        if (i > 0) {
            var prevCoord = ol.proj.toLonLat(coords[i - 1]);
            var distance = haversineDistance(prevCoord, lonLat);
            totalDistance += distance;
        }
        distances.push(totalDistance.toFixed(2)); // Store cumulative distance
    }

    return {totalDistance, totalGain, totalLoss};
}

// Function to extract elevation data
function extractElevationData(gpxSource) {
    var elevations = [];
    var distances = [];
    var totalDistance = 0;
    var totalGain = 0;
    var totalLoss = 0;
    var lastElevation = null;

    gpxSource.getFeatures().forEach((feature) => {
        var geom = feature.getGeometry();

        if (geom instanceof ol.geom.LineString) {
            total = processLineString(geom, elevations, distances, totalDistance, totalGain, totalLoss, lastElevation);
            totalDistance = total.totalDistance;
            totalGain = total.totalGain;
            totalLoss = total.totalLoss;
        } else if (geom instanceof ol.geom.MultiLineString) {
            geom.getLineStrings().forEach((lineString) => {
                total = processLineString(lineString, elevations, distances, totalDistance, totalGain, totalLoss, lastElevation);
                totalDistance = total.totalDistance;
                totalGain = total.totalGain;
                totalLoss = total.totalLoss;
            });
        }
    });

    console.log("Total Distance:", totalDistance.toFixed(2), "km");
    console.log("Total Gain:", totalGain.toFixed(2), "m");
    console.log("Total Loss:", totalLoss.toFixed(2), "m");

    document.getElementById('totalDistance').textContent = totalDistance.toFixed(2) + " km";
    document.getElementById('elevationGain').textContent = totalGain.toFixed(2) + " m";
    document.getElementById('elevationLoss').textContent = totalLoss.toFixed(2) + " m";
    
    return { distances, elevations };
}


// Haversine formula to calculate distance
function haversineDistance(coord1, coord2) {
    var R = 6371; // Earth's radius in km
    var dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    var dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    var lat1 = coord1[1] * Math.PI / 180;
    var lat2 = coord2[1] * Math.PI / 180;

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Create Elevation Chart using Chart.js
function createElevationChart(distances, elevations) {
    var ctx = document.getElementById('elevationChart');//.getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: distances,
            datasets: [{
                label: 'Elevation (m)',
                data: elevations,
                borderColor: 'blue',
                borderWidth: 1,
                fill: false,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow resizing
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { 
                    display: true, 
                    title: { display: true, text: 'Distance (km)' },
                },
                y: { 
                    display: true, 
                    title: { display: true, text: 'Elevation (m)' } 
                }
            }
        }
    });
}

gpxSource.once('change', function () {
    console.log("GPX State:", gpxSource.getState());
    console.log("Number of features:", gpxSource.getFeatures().length);
    if (gpxSource.getFeatures().length === 0) {
        alert("No features found in GPX. Check file structure or OpenLayers compatibility.");
    }
    map.getView().fit(gpxSource.getExtent(), { duration: 1000, padding: [50, 50, 50, 50] });

    var elevationData = extractElevationData(gpxSource);
    createElevationChart(elevationData.distances, elevationData.elevations);
});


