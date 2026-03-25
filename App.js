// PREMIUM UI + NOTES & CATEGORIES ADDED

import React, { useState, useEffect } from "react";
import { View, Text, Button, TextInput, ScrollView, StyleSheet, Switch, TouchableOpacity } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Polyline } from "react-native-maps";

const LOCATION_TASK = "background-location-task";

TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) return;
});

export default function App() {
  const [trips, setTrips] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [route, setRoute] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [editingTrip, setEditingTrip] = useState(null);

  const theme = darkMode ? dark : light;

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("trips");
      if (saved) setTrips(JSON.parse(saved));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("trips", JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await Location.requestBackgroundPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    let sub;
    if (tracking) {
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10 },
        (loc) => {
          const { latitude, longitude, speed, accuracy } = loc.coords;
          if (accuracy > 50) return;

          setRoute((r) => [...r, { latitude, longitude }]);

          setCurrentTrip((prev) => {
            if (!prev && speed > 3) return { last: [latitude, longitude], distance: 0 };
            if (!prev) return prev;

            const dist = getDistance(prev.last, [latitude, longitude]);
            if (dist > 1) return prev;

            return { last: [latitude, longitude], distance: prev.distance + dist };
          });
        }
      ).then((s) => (sub = s));
    }
    return () => sub && sub.remove();
  }, [tracking]);

  const startTrip = () => {
    setRoute([]);
    setTracking(true);
  };

  const stopTrip = () => {
    if (!currentTrip) return;

    const trip = {
      id: Date.now(),
      distance: currentTrip.distance,
      route,
      date: new Date().toLocaleString(),
      note: "",
      category: "Business",
    };

    setTrips((t) => [trip, ...t]);
    setTracking(false);
    setCurrentTrip(null);
    setRoute([]);
  };

  const saveEdit = () => {
    setTrips(trips.map(t => t.id === editingTrip.id ? editingTrip : t));
    setEditingTrip(null);
  };

  const categories = ["Business", "Personal", "Delivery", "Other"];

  return (
    <ScrollView style={theme.container}>
      <Text style={theme.title}>DriversNote Pro+</Text>

      <View style={theme.row}>
        <Text style={theme.label}>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      <View style={theme.card}>
        {!tracking ? (
          <TouchableOpacity style={theme.button} onPress={startTrip}>
            <Text style={theme.buttonText}>Start Trip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={theme.stopButton} onPress={stopTrip}>
            <Text style={theme.buttonText}>Stop Trip</Text>
          </TouchableOpacity>
        )}
        {currentTrip && <Text style={theme.text}>{currentTrip.distance.toFixed(2)} km</Text>}
      </View>

      {route.length > 0 && (
        <MapView style={theme.map}
          initialRegion={{ latitude: route[0].latitude, longitude: route[0].longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
          <Polyline coordinates={route} strokeWidth={4} />
        </MapView>
      )}

      {trips.map((t) => (
        <View key={t.id} style={theme.card}>
          {editingTrip?.id === t.id ? (
            <>
              <TextInput
                value={editingTrip.note}
                placeholder="Trip note"
                onChangeText={(val) => setEditingTrip({ ...editingTrip, note: val })}
                style={theme.input}
              />

              <ScrollView horizontal>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={editingTrip.category === c ? theme.catActive : theme.cat}
                    onPress={() => setEditingTrip({ ...editingTrip, category: c })}
                  >
                    <Text style={theme.text}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Button title="Save" onPress={saveEdit} />
            </>
          ) : (
            <>
              <Text style={theme.text}>{t.date}</Text>
              <Text style={theme.text}>{t.distance.toFixed(2)} km</Text>
              <Text style={theme.sub}>{t.category}</Text>
              {t.note ? <Text style={theme.note}>{t.note}</Text> : null}

              {t.route && (
                <MapView style={{ height: 140 }}
                  initialRegion={{ latitude: t.route[0].latitude, longitude: t.route[0].longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
                  <Polyline coordinates={t.route} strokeWidth={3} />
                </MapView>
              )}

              <Button title="Edit" onPress={() => setEditingTrip(t)} />
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function getDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const base = {
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 20 },
  card: { padding: 15, borderRadius: 16, marginBottom: 15 },
  map: { height: 260, borderRadius: 16, marginBottom: 15 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  button: { padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 10 },
  stopButton: { padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 10 },
  buttonText: { fontWeight: "600" },
  text: { fontSize: 16 },
  sub: { opacity: 0.7 },
  note: { fontStyle: "italic", marginTop: 5 },
  cat: { padding: 10, borderRadius: 20, marginRight: 8 },
  catActive: { padding: 10, borderRadius: 20, marginRight: 8 },
};

const light = StyleSheet.create({
  ...base,
  container: { ...base.container, backgroundColor: "#f5f7fa" },
  title: { ...base.title, color: "#111" },
  card: { ...base.card, backgroundColor: "#fff" },
  button: { ...base.button, backgroundColor: "#2563eb" },
  stopButton: { ...base.stopButton, backgroundColor: "#dc2626" },
  buttonText: { ...base.buttonText, color: "#fff" },
  text: { ...base.text, color: "#111" },
  input: { ...base.input, borderColor: "#ddd", color: "#111" },
  cat: { ...base.cat, backgroundColor: "#e5e7eb" },
  catActive: { ...base.catActive, backgroundColor: "#2563eb" },
});

const dark = StyleSheet.create({
  ...base,
  container: { ...base.container, backgroundColor: "#0f172a" },
  title: { ...base.title, color: "#fff" },
  card: { ...base.card, backgroundColor: "#1e293b" },
  button: { ...base.button, backgroundColor: "#3b82f6" },
  stopButton: { ...base.stopButton, backgroundColor: "#ef4444" },
  buttonText: { ...base.buttonText, color: "#fff" },
  text: { ...base.text, color: "#fff" },
  input: { ...base.input, borderColor: "#334155", color: "#fff" },
  cat: { ...base.cat, backgroundColor: "#334155" },
  catActive: { ...base.catActive, backgroundColor: "#3b82f6" },
});


// ================= APK BUILD CONFIG (EAS) =================
// Create these files in your project root

// 1) eas.json
// -----------------
// Controls how your APK is built

/*
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
*/

// 2) app.json (or app.config.js)
// -----------------
// Basic app configuration + permissions required for GPS + background tracking

/*
{
  "expo": {
    "name": "DriversNote Pro+",
    "slug": "driversnote-pro",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f172a"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourname.driversnote",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE"
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow this app to track trips even when closed.",
          "locationWhenInUsePermission": "Allow this app to track your trips.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ]
    ]
  }
}
*/

// 3) Install required packages (run once)
// --------------------------------------
// npx expo install expo-location expo-task-manager react-native-maps @react-native-async-storage/async-storage

// 4) Build command
// --------------------------------------
// eas build -p android --profile preview

// After build finishes, download APK and install on your phone
