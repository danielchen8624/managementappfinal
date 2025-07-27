import React, { useEffect, useState } from "react";     
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import {db, auth} from "../../firebaseConfig";

function ManageEmployees() {
    return (
        <SafeAreaView style={styles.container}>
        <View style={styles.container}>
            <Text style={styles.title}>Manage Employees</Text>
            <Text style={styles.description}>
                This section allows managers to view and manage employee tasks and projects.
            </Text>
            {/* Additional management functionalities can be added here */}
        </View>
        </SafeAreaView>
    );                      
}
export default ManageEmployees;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#F9FAFB",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: "#6B7280",
    },
}); 