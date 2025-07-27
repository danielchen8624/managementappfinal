import React from "react";
import { Tabs } from "expo-router";

const _Layout = () => {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Dashboard",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="task"
        options={{
          title: "Tasks",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
        }}
      />
    </Tabs>
  );
};

export default _Layout;
