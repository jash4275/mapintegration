import React, { useRef, useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useGeolocation } from '../../hooks/useGeolocation';
import './MapComponent.css';


const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const colors = {
  line: "#3498db",
  fill: "rgba(52, 152, 219, 0.3)",
  hover: "#2ecc71",
  point: "#e74c3c"
};

const mapStyles = {
  standard: [
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ saturation: -100 }, { lightness: 50 }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#a3ccff" }]
    }
  ],
  satellite: [
    {
      stylers: [
        { gamma: 0.8 },
        { saturation: -20 },
        { lightness: -10 }
      ]
    }
  ]
};

export default function MapComponent() {
  const mapRef = useRef(null);
  const { coords } = useGeolocation();
  const [map, setMap] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [polygon, setPolygon] = useState(null);
  const [polygonArea, setPolygonArea] = useState(0);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [geocoder, setGeocoder] = useState(null);
  const [isInitialCenter, setIsInitialCenter] = useState(true);
  const markersRef = useRef([]);
  const lastActionRef = useRef('none'); // To track whether the last action was 'add' or 'move'

  const updatePolygon = (points) => {
    if (points.length < 3) {
      if (polygon) {
        polygon.setMap(null);
        setPolygon(null);
      }
      setPolygonArea(0);
      return;
    }

    const polygonPath = points.map(point => new google.maps.LatLng(point.lat, point.lng));
    
    if (polygon) {
      polygon.setPath(polygonPath);
    } else {
      const newPolygon = new google.maps.Polygon({
        paths: points,
        strokeColor: colors.line,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: colors.fill,
        fillOpacity: 0.35,
        geodesic: true
      });

      newPolygon.setMap(map);
      setPolygon(newPolygon);
    }

    if (window.google && google.maps.geometry.spherical) {
      const area = google.maps.geometry.spherical.computeArea(polygonPath);
      setPolygonArea(Math.round(area));
    }
  };


  const [pointLocations, setPointLocations] = useState([]);

  // Function to get address from coordinates
  const getLocationDetails = async (lat, lng, index) => {
    if (!geocoder) return;

    try {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK) {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });

      const address = response[0]?.formatted_address || 'Location not found';
      setPointLocations(prev => {
        const newLocations = [...prev];
        newLocations[index] = address;
        return newLocations;
      });
    } catch (error) {
      console.error('Geocoding failed:', error);
      setPointLocations(prev => {
        const newLocations = [...prev];
        newLocations[index] = 'Failed to get location';
        return newLocations;
      });
    }
  };



  const createMarker = (point, index, shouldAnimate) => {
    if (!map) return null;

    const marker = new google.maps.Marker({
      position: point,
      map: map,
      draggable: true,
      animation: shouldAnimate ? google.maps.Animation.DROP : null,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: colors.point,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff"
      }
    });

    getLocationDetails(point.lat, point.lng, index);


    marker.addListener('drag', () => {
      lastActionRef.current = 'move';
      const newPoints = [...selectedPoints];
      const position = marker.getPosition();
      newPoints[index] = {
        lat: position.lat(),
        lng: position.lng()
      };
      updatePolygon(newPoints);
    });

    marker.addListener('dragend', () => {
      const newPoints = [...selectedPoints];
      const position = marker.getPosition();
      newPoints[index] = {
        lat: position.lat(),
        lng: position.lng()
      };
      setSelectedPoints(newPoints);
      getLocationDetails(position.lat(), position.lng(), index);
    });

    marker.addListener('mouseover', () => {
      marker.setIcon({
        ...marker.getIcon(),
        fillColor: colors.hover,
        scale: 12
      });
    });

    marker.addListener('mouseout', () => {
      marker.setIcon({
        ...marker.getIcon(),
        fillColor: colors.point,
        scale: 10
      });
    });

    return marker;
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => {
      if (marker) {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      }
    });
    markersRef.current = [];
  };

  useEffect(() => {
    if (!map) return;

    clearMarkers();
    
    const newMarkers = selectedPoints.map((point, index) => {
      // Only animate if this is a new point being added (not moved)
      const shouldAnimate = lastActionRef.current === 'add' && index === selectedPoints.length - 1;
      const marker = createMarker(point, index, shouldAnimate);
      return marker;
    });

    markersRef.current = newMarkers;
    setMarkers(newMarkers);
    updatePolygon(selectedPoints);
  }, [selectedPoints, map]);

  const startOver = () => {
    lastActionRef.current = 'none';
    clearMarkers();
    setMarkers([]);
    setSelectedPoints([]);
    if (polygon) {
      polygon.setMap(null);
      setPolygon(null);
    }
    setPolygonArea(0);
  };

  const searchLocation = () => {
    if (!searchQuery.trim() || !geocoder) return;

    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && map) {
        const location = results[0].geometry.location;
        map.setCenter(location);
        map.setZoom(15);
        setIsInitialCenter(false);

        const marker = new google.maps.Marker({
          map: map,
          position: location,
          animation: google.maps.Animation.DROP
        });

        setTimeout(() => marker.setMap(null), 3000);
      } else {
        alert('Location not found. Please try a different search.');
      }
    });
  };

  useEffect(() => {
    const initializeMap = async () => {
      const loader = new Loader({
        apiKey: GOOGLE_MAPS_API_KEY,
        libraries: ["geometry", "places"],
      });

      await loader.load();

      const newMap = new google.maps.Map(mapRef.current, {
        center: { lat: coords.latitude || 0, lng: coords.longitude || 0 },
        zoom: 20,
        styles: mapStyles.standard,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER
        }
      });

      setMap(newMap);
      setGeocoder(new google.maps.Geocoder());

      newMap.addListener("click", ({ latLng }) => {
        lastActionRef.current = 'add'; // Set action to 'add' when adding new point
        const newPoint = {
          lat: latLng.lat(),
          lng: latLng.lng()
        };
        setSelectedPoints(prev => [...prev, newPoint]);
        setIsInitialCenter(false);
      });
    };

    initializeMap();

    return () => {
      clearMarkers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (map && coords.latitude && coords.longitude && isInitialCenter) {
      map.setCenter({ lat: coords.latitude, lng: coords.longitude });
      setIsInitialCenter(false);
    }
  }, [coords, map, isInitialCenter]);

  useEffect(() => {
    if (map) {
      map.setMapTypeId(
        isSatelliteView
          ? google.maps.MapTypeId.SATELLITE
          : google.maps.MapTypeId.ROADMAP
      );

      map.setOptions({
        styles: isSatelliteView ? mapStyles.satellite : mapStyles.standard
      });
    }
  }, [isSatelliteView, map]);

  return (
    <div className="container">
      <div className="sidebar">
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
            placeholder="Search location"
            className="search-input"
          />
          <button onClick={searchLocation} className="search-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>

        <div className="controls-container">
          <button onClick={startOver} className="start-over-btn">
            Start Over
          </button>

          <div className="view-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={isSatelliteView}
                onChange={(e) => setIsSatelliteView(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
            <span className="toggle-label">
              {isSatelliteView ? 'Satellite' : 'Standard'} View
            </span>
          </div>

          {selectedPoints.length > 0 && (
            <div className="point-info">
              <div>Points: {selectedPoints.length}</div>
              <div>Area: {polygonArea.toLocaleString()} m²</div>
              
              {/* Location Details Section */}
              <div className="locations-list">
                <h3>Point Locations:</h3>
                {pointLocations.map((location, index) => (
                  <div key={index} className="location-item">
                    <strong>Point {index + 1}:</strong>
                    <p>{location || 'Loading...'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="map-container">
        <div ref={mapRef} className="map-view" />
      </div>
    </div>
  );
}