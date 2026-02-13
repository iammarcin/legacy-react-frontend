import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './css/Wanderer.css';
import L from 'leaflet'; // For custom icon fix

// Fix for default Leaflet icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const HikeDetailMap = ({ trackPoints, photoDataList }) => {
  if (!trackPoints || trackPoints.length === 0) {
    return null;
  }

  const polylineCoordinates = trackPoints.map(p => [p.latitude, p.longitude]);
  const mapCenter = polylineCoordinates.length > 0 ? polylineCoordinates[0] : [0, 0]; // Default center if needed

  console.log("HikeDetailMap received photoDataList:", photoDataList);
  console.log("HikeDetailMap received trackPoints:", trackPoints);

  const photoMarkers = photoDataList.map(photo => {
    if (!photo.time || !trackPoints || trackPoints.length === 0) {
      console.log("Skipping photo due to missing time or no track points:", photo);
      return null;
    }
    try {
      const photoTime = new Date(photo.time).getTime();
      if (isNaN(photoTime)) {
        console.log("Skipping photo due to invalid photo time:", photo);
        return null;
      }

      let closestTrackPoint = null;
      let minTimeDiff = Infinity;

      trackPoints.forEach(tp => {
        if (!tp.time || typeof tp.latitude !== 'number' || typeof tp.longitude !== 'number') {
          return; // Skip trackpoint if essential data is missing
        }
        try {
          const trackPointTime = new Date(tp.time).getTime();
          if (isNaN(trackPointTime)) return;

          const timeDiff = Math.abs(photoTime - trackPointTime);
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestTrackPoint = tp;
          }
        } catch (e) {
          console.error("Error parsing track point time:", tp.time, e);
        }
      });

      if (closestTrackPoint) {
        // Optional: Add a threshold for max allowed time difference (e.g., 60000ms = 1 minute)
        // if (minTimeDiff > 60000) { 
        //   console.log("Photo", photo.path, "too far in time from closest track point:", minTimeDiff, "ms");
        //   return null;
        // }
        console.log("Matched photo", photo.path, "to trackPoint at", closestTrackPoint.time, "with diff (ms):", minTimeDiff);
        return {
          ...photo,
          latitude: closestTrackPoint.latitude,
          longitude: closestTrackPoint.longitude,
        };
      } else {
        console.log("No suitable trackPoint found for photo:", photo.path);
      }
    } catch (e) {
      console.error("Error processing photo for time matching:", photo, e);
    }
    return null;
  }).filter(marker => marker !== null); // Filter out nulls (photos that couldn't be matched

  console.log("Generated photoMarkers for map:", photoMarkers);

  return (
    <div className="hike-map-container">
      <h3>Hike Map</h3>
      <MapContainer center={mapCenter} zoom={13} style={{ height: "550px", width: "100%" }} className="leaflet-container">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Polyline positions={polylineCoordinates} color="blue" />
        {photoMarkers.map((markerData, index) => (
          // We now use markerData which has coordinates from the matched track point
          <Marker key={`photo-marker-${index}`} position={[markerData.latitude, markerData.longitude]}>
            <Popup minWidth={500} maxWidth={500} className="custom-popup">
              {markerData.path && <img src={markerData.path} alt={markerData.caption || `Photo ${index + 1}`} style={{ width: '100%', height: 'auto' }} />}
              {/*markerData.time && <p>Photo Time: {new Date(markerData.time).toLocaleString()}</p>*/}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default HikeDetailMap;
