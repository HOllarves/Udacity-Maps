// Foursquare's API key
const FOUR_SQ_CLIENT_ID = "OZVT545TTMVYBYDSVSTVXMA1ND1YNEF4B2HSUR4R41XOHBHO";

// Google Maps styles
var styles = [
    {
        featureType: 'water',
        stylers: [
            { color: '#19cfd6' }
        ]
    }, {
        featureType: 'administrative',
        elementType: 'labels.text.stroke',
        stylers: [
            { color: '#ffffff' },
            { weight: 6 }
        ]
    }, {
        featureType: 'administrative',
        elementType: 'labels.text.fill',
        stylers: [
            { color: '#1fbba6' }
        ]
    }, {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [
            { color: '#efe9e4' },
            { lightness: -40 }
        ]
    }, {
        featureType: 'transit.station',
        stylers: [
            { weight: 9 },
            { hue: '#e85113' }
        ]
    }, {
        featureType: 'road.highway',
        elementType: 'labels.icon',
        stylers: [
            { visibility: 'off' }
        ]
    }, {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [
            { lightness: 100 }
        ]
    }, {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [
            { lightness: -100 }
        ]
    }, {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [
            { visibility: 'on' },
            { color: '#f0e4d3' }
        ]
    }, {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [
            { color: '#efe9e4' },
            { lightness: -25 }
        ]
    }
];

/**
 * Main ViewModel function
 * 
 */
function Map() {

    //Declaration of variables and observables
    var self = this,
        map,
        drawingManager,
        geocoder;

    self.placeName = ko.observable('');
    self.showPlaces = ko.observable(false);
    self.placeAddress = ko.observable('');
    self.placeLat = ko.observable('');
    self.placeLng = ko.observable('');
    self.searchPlace = ko.observable('');
    self.query = ko.observable('');
    self.selectedPlace = ko.observable('');
    self.fq_access_token = ko.observable('');
    self.fqVenues = ko.observableArray();
    self.markers = [];

    //Hardcoded list of my favorite places
    self.db = ko.observableArray([{
        name: "La Sagrada Familia",
        address: "Carrer de Mallorca, 401, 08013 Barcelona",
        lat: 41.403455,
        lng: 2.174458
    }, {
        name: "Park Guell",
        address: "08024 Barcelona, Provincia de Barcelona",
        lat: 41.414471,
        lng: 2.152694
    }, {
        name: "La Pedrera",
        address: "Provença, 261-265, 08008 Barcelona",
        lat: 41.395340,
        lng: 2.161994
    }, {
        name: "Port Olimpic",
        address: "Port Olimpic, 08005 Barcelona",
        lat: 41.386124,
        lng: 2.200981
    }, {
        name: "W Hotel",
        address: "Plaça Rosa dels Vents, 1, 08039 Barcelona",
        lat: 41.368294,
        lng: 2.190314
    }]);

    self.polygon = null;

    /**
     * Retrieves access token from url after foursquare's authentication
     */
    function getUrlVars() {
        let hashes = window.location.href.slice().split("#");
        if (hashes[1]) {
            let access_token = hashes[1].split("=")[1];
            return access_token;
        }
    }

    /**
     * Initializes Google Maps, Drawing Manager and event listeners.
     * 
     */
    self.init = () => {
        let access_token = getUrlVars();
        if (access_token) {
            self.fq_access_token(access_token);
        }
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 41.378541, lng: 2.164216 },
            zoom: 13,
            styles: styles
        });
        drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_LEFT,
                drawingModes: [
                    google.maps.drawing.OverlayType.POLYGON
                ]
            }
        });
        google.maps.event.addListener(map, 'click', event => {
            self.placeLat(event.latLng.lat());
            self.placeLng(event.latLng.lng());
            geocoder.geocode({ 'location': { lat: event.latLng.lat(), lng: event.latLng.lng() } }, (result, status) => {
                if (status === 'OK') {
                    self.placeAddress(result[0].formatted_address);
                }
            })
        })
        geocoder = new google.maps.Geocoder;
    }

    /**
     * Filters the available places list
     * 
     */
    self.textFilter = ko.computed(() => {
        let search = self.query().toLowerCase();
        if (!search) {
            return self.db();
        }
        return ko.utils.arrayFilter(self.db(), place => {
            return place.name.toLowerCase().indexOf(search) >= 0;
        })
    });

    /**
     * Opens modal with Foursquare venues
     * 
     * @param {Object} loc - Selected location
     */
    self.openInstaModal = (loc) => {
        if (!self.fq_access_token()) {
            window.open("https://foursquare.com/oauth2/authenticate?client_id=" + FOUR_SQ_CLIENT_ID + "&response_type=token&redirect_uri=http://localhost:8080", "_self");
        } else {
            let ltlng = loc.lat + "," + loc.lng;
            let access_token = self.fq_access_token();
            $.ajax({
                url: "https://api.foursquare.com/v2/venues/search",
                type: "GET",
                data: {
                    ll: ltlng,
                    oauth_token: access_token,
                    v: "20170917"
                },
                success: (data) => {
                    if (data.response.venues.length > 1) {
                        self.fqVenues(data.response.venues);
                        $("#myModal").modal('show');
                    } else {
                        alert("Unable to fetch foursquare data");
                    }
                }
            })
        }
    }

    //Subscribing query input to the text filter
    self.query.subscribe(self.textFilter);

    /**
     * Opens modal to add new places
     * 
     */
    self.addNewPlace = () => {
        let form = document.getElementById('new-place-form');
        if (form.className == 'fade-in') {
            form.className = 'fade-out';
            form.style.display = 'none';
        } else {
            form.className = 'fade-in';
            form.style.display = 'block';
        }
    }

    /**
     * Saves new place to the db observable
     * 
     */
    self.saveNewPlace = () => {
        let location = {
            name: self.placeName(),
            address: self.placeAddress(),
            lat: self.placeLat(),
            lng: self.placeLng()
        }
        self.db.push(location);
        self.createMarkers(self.db());
    }

    /**
     * Creates new markers and puts them on the map
     * @param {Object} location
     * 
     */
    self.createMarkers = (location) => {
        let bounds = new google.maps.LatLngBounds(),
            largeInfowindow = new google.maps.InfoWindow(),
            defaultIcon = self.makeMarkerIcon('19cfd6'),
            selectedIcon = self.makeMarkerIcon('FFFF24');

        self.showPlaces(true);
        if (self.markers.length > 0) {
            self.hideMarkers();
        }
        if (location.length <= 0 || location.length === undefined) {
            location = [];
            ko.utils.arrayForEach(self.db(), place => {
                location.push(place);
            })
        }
        location.forEach(place => {
            let marker = new google.maps.Marker({
                position: {
                    lat: place.lat,
                    lng: place.lng
                },
                map: map,
                animation: google.maps.Animation.DROP,
                title: place.name,
                icon: defaultIcon
            });
            self.markers.push(marker);
            bounds.extend(marker.position);
            marker.addListener('click', () => {
                self.loadInfoWindow(marker, largeInfowindow);
            });
            marker.addListener('mouseover', () => {
                marker.setIcon(selectedIcon);
            });
            marker.addListener('mouseout', () => {
                marker.setIcon(defaultIcon);
            });
        });
    }

    /**
     * Hides all markers on the map
     * 
     */
    self.hideMarkers = () => {
        self.markers.forEach((marker) => {
            marker.setMap(null);
        });
        self.markers = [];
    }

    /**
     * Toggles drawing tool
     * 
     */
    self.toggleDrawing = () => {
        if (drawingManager.map) {
            drawingManager.setMap(null);
            if (polygon !== null) {
                polygon.setMap(null);
            }
        } else {
            drawingManager.setMap(map);
        }
        drawingManager.addListener('overlaycomplete', (event) => {
            if (self.polygon) {
                self.polygon.setMap(null);
                self.hideMarkers();
            }
            drawingManager.setDrawingMode(null);
            // Creating a new editable polygon from the overlay.
            self.polygon = event.overlay;
            self.polygon.setEditable(true);
            //Calculating area
            let area = google.maps.geometry.spherical.computeArea(self.polygon.getPath());
            // Searching within the polygon.
            self.searchWithinPolygon();
            // Make sure the search is re-done if the poly is changed.
            self.polygon.getPath().addListener('set_at', self.searchWithinPolygon);
            self.polygon.getPath().addListener('insert_at', self.searchWithinPolygon);
        })
    }

    /**
     * Triggers search using the drawing manager
     * 
     */
    self.searchWithinPolygon = () => {
        if (self.markers && self.markers.length > 0) {
            self.markers.forEach(marker => {
                if (google.maps.geometry.poly.containsLocation(marker.position, self.polygon)) {
                    marker.setMap(map);
                } else {
                    marker.setMap(null);
                }
            })
        }
    }

    /**
     * Loads Google Maps InfoWindow
     */
    self.loadInfoWindow = (marker, infowindow) => {
        if (infowindow.marker != marker) {
            infowindow.setContent('');
            infowindow.marker = marker;
            infowindow.addListener('closeclick', () => {
                infowindow.marker = null;
            })

            let streetViewService = new google.maps.StreetViewService(),
                radius = 50;
            function getStreetView(data, status) {
                if (status == google.maps.StreetViewStatus.OK) {
                    let nearStreetViewLocation = data.location.latLng,
                        heading = google.maps.geometry.spherical.computeHeading(
                            nearStreetViewLocation, marker.position);

                    infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>');
                    let panoramaOptions = {
                        position: nearStreetViewLocation,
                        pov: {
                            heading: heading,
                            pitch: 30
                        }
                    }
                    let panorama = new google.maps.StreetViewPanorama(
                        document.getElementById('pano'), panoramaOptions);
                } else {
                    infowindow.setContent('<div>' + marker.title + '</div>' +
                        '<div>No Street View Found</div>');
                }
            }
            streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
            infowindow.open(map, marker);
        }
    }

    /**
     * Changes marker color
     */
    self.makeMarkerIcon = (markerColor) => {
        let markerImage = new google.maps.MarkerImage(
            'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
            '|40|_|%E2%80%A2',
            new google.maps.Size(21, 34),
            new google.maps.Point(0, 0),
            new google.maps.Point(10, 34),
            new google.maps.Size(21, 34));
        return markerImage;
    }
    //Initializing program
    self.init();
}

function initMap() {
    ko.applyBindings(new Map());
}


