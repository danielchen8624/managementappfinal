// context/UserContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/* --- ROLE TYPES --- */
export type Role = "supervisor" | "manager" | "security" | "employee";

function normalizeRole(raw: unknown): Role | null {
  if (typeof raw !== "string") return null;
  const lower = raw.toLowerCase();
  if (["supervisor", "manager", "security", "employee"].includes(lower)) {
    return lower as Role;
  }
  return null;
}

/* --- CONTEXT TYPE --- */
type UserContextType = {
  role: Role | null;
  loading: boolean;
  uid: string | null;
  firstName: string | null;

  // convenience flags
  isSupervisor: boolean;
  isManager: boolean;
  isSecurity: boolean;
  isEmployee: boolean;
};

const UserContext = createContext<UserContextType>({
  role: null,
  loading: true,
  uid: null,
  firstName: null,
  isSupervisor: false,
  isManager: false,
  isSecurity: false,
  isEmployee: false,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setUid(null);
        setFirstName(null);
        setLoading(false);
        return;
      }

      setUid(user.uid);

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          setRole(normalizeRole(data?.role));
          setFirstName(typeof data?.firstName === "string" ? data.firstName : null);
        } else {
          console.error("User document does not exist:", user.uid);
          setRole(null);
          setFirstName(null);
        }
      } catch (err) {
        console.error("Error fetching user doc:", err);
        setRole(null);
        setFirstName(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<UserContextType>(() => {
    return {
      role,
      loading,
      uid,
      firstName,
      isSupervisor: role === "supervisor",
      isManager: role === "manager",
      isSecurity: role === "security",
      isEmployee: role === "employee",
    };
  }, [role, loading, uid, firstName]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
