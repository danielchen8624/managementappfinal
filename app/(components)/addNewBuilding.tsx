import { View, Text, TextInput, TouchableOpacity, SafeAreaView } from "react-native";
import { useState, useEffect } from "react";
import React from "react";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

function AddNewBuilding() {
  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmitBuilding = async () => {
    // if building doesnt already eixst, add it to firestore
    console.log("hai");
    if (buildingName && address) {
      setLoading(true);
      try {
        await addDoc(collection(db, "buildings"), {
          name: buildingName,
          address: address,
          createdBy: auth.currentUser?.uid,
          createdAt: new Date(),
        });
        setBuildingName("");
        setAddress("");
        alert("Building added successfully");
      } catch (error) {
        console.error("Error adding building: ", error);
        alert("Error adding building");
      } finally {
        setLoading(false);
      }
    } else {
      alert("Please fill in all fields");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
    <View style = {{flex: 1}}>
      <Text>Add a new building here</Text>
      <TextInput
        placeholder="Building Name"
        value={buildingName}
        onChangeText={setBuildingName}
        style={{
          height: 40,
          borderColor: "gray",
          borderWidth: 1,
          marginBottom: 10,
          paddingHorizontal: 10,
        }}
      />
      <TextInput
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
        style={{
          height: 40,
          borderColor: "gray",
          borderWidth: 1,
          marginBottom: 10,
          paddingHorizontal: 10,
        }}
      />

      <TouchableOpacity
        style={{
          backgroundColor: "#007BFF",
          padding: 10,
          alignItems: "center",
        }}
        onPress={handleSubmitBuilding}
      >
        <Text style={{ color: "white" }}>Add Building</Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

export default AddNewBuilding;
