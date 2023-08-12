import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Location from "expo-location";
import MapView, { Polyline } from "react-native-maps";
import axios from "axios";

export default function App() {
  // son declaras las variables para enviarlas a la api como estados
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

  // Habilita el uso de acelerometro durante la ejecucion de la app
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

  // Se utiliza para calcula el intervalo de tiempo desde que se inicia el tiempo hasta que se finaliza
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

  // se le da formato al tiempo
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  
  // Se habilita el uso de gps para tener continuamente la ubicacion
  useEffect(() => {
    getLocationAsync();
  }, []);

  // Es la funcion donde se obtiene la ubicacion con el gps
  const getLocationAsync = async () => {
    // el status es para la peticion de los permisos de usar el gps en el telefono
    const { status } = await Location.requestForegroundPermissionsAsync();
    // si se le otorgan permisos empieza la obtencion de coordenadas
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
            // se guardan las coordenadas de lalitude y longitud en un array de coordenadas
            setRouteCoordinates((prevCoordinates) => [
              ...prevCoordinates,
              { latitude, longitude },
            ]);
          }
        }
      );
      // al obtener las coordenas actuales se guardan en locatio
      setLocation(location);
    }
  };

  // inicializa los valores de los estados al dar clic en el boton de inciar
  const handleStartRoute = () => {
    setIsRouteStarted(true);
    setSteps(0);
    setStartTime(new Date());
    // Recopilar las coordenadas de inicio
    const { latitude, longitude } = location.coords;
    setStartLatitude(latitude);
    setStartLongitude(longitude);
  };

  // obtiene los valores finales para ser enviados a la api
  const handleEndRoute = async () => {
    setIsRouteStarted(false);
    await setEndTime(new Date());

    // Recopilar las coordenadas de fin
    const { latitude, longitude } = location.coords;
    setEndLatitude(latitude);
    setEndLongitude(longitude);
    
    const timeDiff = (endTime - startTime) / 1000;
    const stepRateValue = steps / (timeDiff / 60);
    
    // variable que tendra todos los valores para ser enviado
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

  // funcion para enviar los valores a la api mediante el request post
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
    // contenedor inicial
    <View style={styles.container}>
      {/* se mostraran los pasos obtenidos por el acelerometro */}
      <Text>Total Steps: {steps}</Text>
      {/* al generar el primer par de coordenadas se renderizara el mapa con el componente MapView */}
      {location?.coords && (
        // componente del mapa renderizado con las cooredenadas
        <MapView style={styles.map} initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}>
          {/* Linea que va marcando la ruta, con linea roja, falta su correccion */}
          <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="red" />
        </MapView>
      )}
      {/* muestra la diferencia de tiempo tiempo */}
      <Text>Time Elapsed: {formatTime(elapsedTime)}</Text>

      {/* es una condicional en caso de si ya incio ruta o no, mostrara un boton y otro apartir de : */}
      {isRouteStarted ? (
        <TouchableOpacity style={styles.endButton} onPress={handleEndRoute}>
        <Text style={styles.endButtonText}>Finalizar Ruta</Text>
      </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.startButton} onPress={handleStartRoute}>
          <Text style={styles.startButtonText}>Iniciar Ruta</Text>
        </TouchableOpacity>
      )}
      {/* muestra el promedio entre los pasos y el tiempo */}
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
