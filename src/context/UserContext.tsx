import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "../firebaseConfig";

export interface AppUser {
    id: string;        // uid de Firebase cuando está logueado
    name: string;
    isGuest: boolean;
    // opcional: email?: string; photoURL?: string;
}

interface UserContextValue {
    user: AppUser | null;
    setUser: (u: AppUser | null) => void;
}

const UserContext = createContext<UserContextValue>({
    user: null,
    setUser: () => { },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);

    // 🔹 Firebase (usuario registrado)
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                setUser({
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || "Usuario",
                    isGuest: false,
                });
            }
        });
        return () => unsub();
    }, []);

    // 🔹 Invitado (localStorage)
    useEffect(() => {
        if (user) return;
        const guest = localStorage.getItem("guestUser");
        if (guest) setUser(JSON.parse(guest));
    }, [user]);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
