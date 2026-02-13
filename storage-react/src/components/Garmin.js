import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import { ResizableBox } from 'react-resizable';
import 'chart.js/auto';
import 'leaflet/dist/leaflet.css';
import 'react-resizable/css/styles.css';
import './css/Garmin.css';

import { useSettings } from '../hooks/useSettings';
import { triggerAPIRequest } from '../services/api.methods';

const Garmin = () => {
  const [isError, setIsError] = useState(false);
  const [coordinates, setCoordinates] = useState([]);
  const [elevations, setElevations] = useState([]);
  const hasFetchedData = useRef(false);

  const getSettings = useSettings();

  const fetchData = useCallback(async () => {
    try {
      console.log("EXEC");
      const userInput = {
        activity_id: "16342894456",
        table: "get_activity_gps_data"
      };

      const response = await triggerAPIRequest(
        "api/db",
        "provider.db",
        "get_garmin_data",
        userInput,
        getSettings
      );

      console.log('response: ', response);

      const data = response.data;
      if (!data) {
        throw new Error('No data received');
      }

      const gpsData = JSON.parse(data[0].gps_data).coordinates;
      setCoordinates(gpsData.map(coord => [coord.lat, coord.lon]));
      setElevations(gpsData.map(coord => coord.elevation));

    } catch (error) {
      console.error('Error fetching data: ', error);
      setIsError(true);
    }
  }, [getSettings]);

  useEffect(() => {
    console.log('useEffect');
    console.log("hasFetchedData.current: ", hasFetchedData.current);
    if (!hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [fetchData]);

  if (isError) {
    return <div>Error fetching data.</div>;
  }

  const elevationData = {
    labels: elevations.map((_, index) => index), // Use index as labels or any other appropriate data
    datasets: [
      {
        label: 'Elevation (m)',
        data: elevations,
        fill: false,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
      },
    ],
  };

  return (
    <div>
      <h2>Garmin Map</h2>
      {coordinates.length > 0 && (
        <div className="map-container">
          <MapContainer center={coordinates[0]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Polyline positions={coordinates} color="blue" />
          </MapContainer>
        </div>
      )}
      <h2>Elevation Profile</h2>
      <ResizableBox
        className="chart-container"
        height={200}
        width={600}
        minConstraints={[300, 100]}
        maxConstraints={[1200, 800]}
      >
        <Line data={elevationData} />
      </ResizableBox>
      <br /><br /><br /><br /><br /><br />
    </div>
  );
};

export default Garmin;
