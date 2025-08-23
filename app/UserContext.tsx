// context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/* --- TYPES --- */
type UserContextType = {
  role: string | null;
  loading: boolean;
  uid: string | null;           // NEW
  firstName: string | null;     // NEW
};

const UserContext = createContext<UserContextType>({
  role: null,
  loading: true,
  uid: null,                    // NEW
  firstName: null,              // NEW
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);            // NEW
  const [firstName, setFirstName] = useState<string | null>(null); // NEW

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setUid(null);           // NEW
        setFirstName(null);     // NEW
        setLoading(false);
        return;
      }

      setUid(user.uid);         // NEW

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setRole(data.role || null);
          setFirstName(data.firstName || null); // NEW
        } else {
          console.error("User document does not exist");
          setRole(null);
          setFirstName(null);   // NEW
        }
      } catch (err) {
        console.error("Error fetching user doc:", err);
        setRole(null);
        setFirstName(null);     // NEW
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ role, loading, uid, firstName }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
