import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [coords, setCoords] = useState({ latitude: 0, longitude: 0 });
  const isSupported = typeof window !== 'undefined' && 'geolocation' in navigator;

  useEffect(() => {
    let watcher = null;

    if (isSupported) {
      watcher = navigator.geolocation.watchPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error.message);
        }
      );
    } else {
      console.warn('Geolocation is not supported by this browser.');
    }

    // Cleanup function
    return () => {
      if (watcher) {
        navigator.geolocation.clearWatch(watcher);
      }
    };
  }, [isSupported]);

  return { coords, isSupported };
}