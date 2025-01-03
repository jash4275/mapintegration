// MapContext.js
import React, { createContext, useContext, useState } from 'react';

const MapContext = createContext();

export function MapProvider({ children }) {
  const [globalSelectedPoints, setGlobalSelectedPoints] = useState([]);
  const [globalPolygonArea, setGlobalPolygonArea] = useState(0);
  const [globalPointLocations, setGlobalPointLocations] = useState([]);

  const updateGlobalPoints = (points) => {
    setGlobalSelectedPoints(points);
  };

  const updateGlobalArea = (area) => {
    setGlobalPolygonArea(area);
  };

  const updateGlobalLocations = (locations) => {
    setGlobalPointLocations(locations);
  };

  const clearGlobalState = () => {
    setGlobalSelectedPoints([]);
    setGlobalPolygonArea(0);
    setGlobalPointLocations([]);
  };

  return (
    <MapContext.Provider
      value={{
        globalSelectedPoints,
        globalPolygonArea,
        globalPointLocations,
        updateGlobalPoints,
        updateGlobalArea,
        updateGlobalLocations,
        clearGlobalState
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};