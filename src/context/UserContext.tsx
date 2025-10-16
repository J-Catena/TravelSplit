import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { syncLocalExpensesToFirestore } from "../Services/syncService";

// 🔹 Representa un usuario (autenticado o invitado)
export interface AppUser {
    uid?: string;       // UID de Firebase (solo si está logueado)
    name: string;
    isGuest: boolean;
    email?: string;
    photoURL?: string;
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

    // 🧩 Firebase → Detecta usuario autenticado
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                const appUser: AppUser = {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || "Usuario",
                    email: firebaseUser.email || undefined,
                    photoURL: firebaseUser.photoURL || undefined,
                    isGuest: false,
                };
                setUser(appUser);
                localStorage.removeItem("guestUser"); // Limpia modo invitado si existía

                // 🧩 Sincroniza gastos locales del invitado con Firestore
                await syncLocalExpensesToFirestore(firebaseUser.uid);

                // 🔔 (Opcional) Notifica al usuario tras la sincronización
                if (localStorage.getItem("expenses")) {
                    alert("Se han sincronizado tus gastos locales con tu cuenta 😊");
                }
            }
        });
        return () => unsub();
    }, []);

    // 🧩 Invitado → carga desde localStorage si no hay usuario logueado
    useEffect(() => {
        if (user) return; // ya hay usuario logueado
        const guest = localStorage.getItem("guestUser");
        if (guest) {
            setUser(JSON.parse(guest));
        }
    }, [user]);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            {children}
        </UserContext.Provider>
    );
};

// Hook personalizado
export const useUser = () => useContext(UserContext);
