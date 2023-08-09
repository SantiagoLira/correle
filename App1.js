import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import MapView, { Polyline } from 'react-native-maps';

export default function App() {
  const [steps, setSteps] = useState(0);
  const [location, setLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [weight, setWeight] = useState(70);

  useEffect(() => {
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
      if (acceleration > 1.2) {
        setSteps((prevSteps) => prevSteps + 1);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    getLocationAsync();
  }, []);

  const getLocationAsync = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10, // Actualiza cada 10 metros
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation(newLocation);
          setRouteCoordinates((prevCoordinates) => [
            ...prevCoordinates,
            { latitude, longitude },
          ]);
        }
      );
      setLocation(location);
    }
  };

  const handleStartRoute = () => {
    // Lógica para iniciar la ruta y guardar los datos necesarios
  };
  const calculateCaloriesBurned = (distance) => {
    // Valor MET para caminar: 3.5 MET (basado en un promedio)
    const metValue = 3.5;
    // Calorías quemadas (kcal) = MET x Peso (kg) x Tiempo (horas)
    const caloriesBurned = metValue * weight * (distance / 1000) / 60; // La distancia se convierte a kilómetros y el tiempo se calcula en minutos
    return caloriesBurned.toFixed(2); // Redondea a 2 decimales
  };
  

  return (
    <View style={styles.container}>
      <Text>Total Steps: {steps}</Text>
      {location?.coords && (
        <MapView style={styles.map} initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}>
          <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="red" />
        </MapView>
      )}
    
      <TouchableOpacity style={styles.startButton} onPress={handleStartRoute}>
        <Text style={styles.startButtonText}>Iniciar Ruta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: 420,
    height: 500,
  },
  startButton: {
    backgroundColor: 'blue',
    padding: 10,
    marginTop: 10,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
