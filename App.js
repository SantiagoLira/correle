import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Location from "expo-location";
import MapView, { Polyline } from "react-native-maps";
import axios from "axios";

export default function App() {
  const [isRouteStarted, setIsRouteStarted] = useState(false);
  const [steps, setSteps] = useState(0);
  const [location, setLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [stepRate, setStepRate] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startLatitude, setStartLatitude] = useState(null);
  const [endLatitude, setEndLatitude] = useState(null);
  const [startLongitude, setStartLongitude] = useState(null);
  const [endLongitude, setEndLongitude] = useState(null);


  useEffect(() => {
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const acceleration = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
      if (isRouteStarted && acceleration > 1.2) {
        setSteps((prevSteps) => prevSteps + 1);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [isRouteStarted]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRouteStarted && startTime) {
        const currentTime = new Date();
        const elapsedMilliseconds = currentTime - startTime;
        setElapsedTime(elapsedMilliseconds);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isRouteStarted, startTime]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  
  useEffect(() => {
    getLocationAsync();
  }, []);

  const getLocationAsync = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const location = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation(newLocation);
          if (isRouteStarted) {
            setRouteCoordinates((prevCoordinates) => [
              ...prevCoordinates,
              { latitude, longitude },
            ]);
          }
        }
      );
      setLocation(location);
    }
  };

  const handleStartRoute = () => {
    setIsRouteStarted(true);
    setSteps(0);
    setStartTime(new Date());
    // Recopilar las coordenadas de inicio
    const { latitude, longitude } = location.coords;
    setStartLatitude(latitude);
    setStartLongitude(longitude);
  };

  const handleEndRoute = async () => {
    setIsRouteStarted(false);
    await setEndTime(new Date());

    // Recopilar las coordenadas de fin
    const { latitude, longitude } = location.coords;
    setEndLatitude(latitude);
    setEndLongitude(longitude);
    
    const timeDiff = (endTime - startTime) / 1000;
    const stepRateValue = steps / (timeDiff / 60);
    
    const routeData = {
      date: new Date(),
      steps: steps,
      startLatitude: startLatitude,
      startLongitude: startLongitude,
      endLatitude: endLatitude,
      endLongitude: endLongitude,
      timeElapsed: timeDiff,
      stepRate: stepRateValue.toFixed(2),
    };

    sendRouteDataToApi(routeData);
  };

  const sendRouteDataToApi = async (routeData) => {
    try {
      const apiUrl = "https://apiapp.fly.dev/addRegistro"; // Reemplaza con la URL de tu API externa
      const response = await axios.post(apiUrl, routeData);
      console.log("Datos enviados exitosamente");
    } catch (error) {
      console.error("Error al enviar los datos:", error);
    }
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
      <Text>Time Elapsed: {formatTime(elapsedTime)}</Text>
      {isRouteStarted ? (
        <TouchableOpacity style={styles.endButton} onPress={handleEndRoute}>
        <Text style={styles.endButtonText}>Finalizar Ruta</Text>
      </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.startButton} onPress={handleStartRoute}>
          <Text style={styles.startButtonText}>Iniciar Ruta</Text>
        </TouchableOpacity>
      )}
      {stepRate !== null && <Text>Step Rate: {stepRate} steps/min</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    width: 350,
    height: 400,
  },
  startButton: {
    backgroundColor: "blue",
    padding: 10,
    marginTop: 10,
  },
  startButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  endButton: {
    backgroundColor: "red",
    padding: 10,
    marginTop: 10,
  },
  endButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
