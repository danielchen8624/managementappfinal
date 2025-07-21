import React from "react";
import { Tabs } from "expo-router";

const _Layout = () => {
  return (
    <Tabs screenOptions = {{headerShown: false}}>
      <Tabs.Screen 
        name="home"
        options={{
          title: "home",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "profile",
          headerShown: false, 
        }}
      />
    </Tabs>

    
  );
};

export default _Layout;
