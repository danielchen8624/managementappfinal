// app/contexts/BuildingContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

type BuildingDoc = {
  name?: string;
  address?: string;
  // add other fields you store on the building doc
};

type BuildingContextType = {
  buildingId: string | null;
  building: (BuildingDoc & { id: string }) | null;
  setBuildingId: (id: string | null) => Promise<void>;
  clearBuilding: () => Promise<void>;
  loading: boolean;          // loading the saved id or the doc
  refresh: () => Promise<void>; // re-fetch the building doc
};

const BuildingContext = createContext<BuildingContextType>({
  buildingId: null,
  building: null,
  setBuildingId: async () => {},
  clearBuilding: async () => {},
  loading: false,
  refresh: async () => {},
});

const STORAGE_KEY = "buildingId";

export const BuildingProvider = ({ children }: { children: React.ReactNode }) => {
  const [buildingId, setBuildingIdState] = useState<string | null>(null);
  const [building, setBuilding] = useState<(BuildingDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true); // initial load & doc fetch

  // Load saved buildingId on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setBuildingIdState(stored);
      } catch (e) {
        console.error("Failed to load buildingId:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch the building doc whenever buildingId changes
  useEffect(() => {
    let cancelled = false;
    const fetchDoc = async () => {
      if (!buildingId) {
        setBuilding(null);
        return;
      }
      setLoading(true);
      try {
        const ref = doc(db, "buildings", buildingId);
        const snap = await getDoc(ref);
        if (!cancelled) {
          if (snap.exists()) {
            setBuilding({ id: snap.id, ...(snap.data() as BuildingDoc) });
          } else {
            // If the saved id no longer exists, clear it
            setBuilding(null);
            await AsyncStorage.removeItem(STORAGE_KEY);
            setBuildingIdState(null);
          }
        }
      } catch (e) {
        if (!cancelled) console.error("Failed to fetch building doc:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDoc();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const setBuildingId = async (id: string | null) => {
    try {
      if (id) {
        await AsyncStorage.setItem(STORAGE_KEY, id);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      setBuildingIdState(id);
    } catch (e) {
      console.error("Failed to persist buildingId:", e);
      // still update local state to keep UI responsive
      setBuildingIdState(id);
    }
  };

  const clearBuilding = async () => setBuildingId(null);

  const refresh = async () => {
    // Re-fetch current building doc on demand
    if (!buildingId) return;
    try {
      const ref = doc(db, "buildings", buildingId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setBuilding({ id: snap.id, ...(snap.data() as BuildingDoc) });
      }
    } catch (e) {
      console.error("Failed to refresh building doc:", e);
    }
  };

  const value = useMemo(
    () => ({ buildingId, building, setBuildingId, clearBuilding, loading, refresh }),
    [buildingId, building, loading]
  );

  return <BuildingContext.Provider value={value}>{children}</BuildingContext.Provider>;
};

export const useBuilding = () => useContext(BuildingContext);
