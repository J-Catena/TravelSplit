import { db } from "../firebaseConfig";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
} from "firebase/firestore";
import type { AppUser } from "../context/UserContext";

export interface Expense {
    id?: string;
    groupId: string;
    payer: string;
    amount: number;
    description: string;
    category: string;
    createdAt: number;
    participants?: string[];
    userId?: string; // 👈 nuevo campo opcional
}

// 🔹 Crear gasto
export async function addExpense(
    user: AppUser,
    expense: Omit<Expense, "id" | "createdAt" | "userId">
) {
    const newExpense: Expense = {
        ...expense,
        createdAt: Date.now(),
    };

    try {
        // 🧩 Invitado → localStorage
        if (user.isGuest) {
            const localExpenses = JSON.parse(localStorage.getItem("expenses") || "[]");
            localExpenses.push({ ...newExpense, id: crypto.randomUUID() });
            localStorage.setItem("expenses", JSON.stringify(localExpenses));
            return;
        }

        // 🧩 Usuario con Firebase (autenticado)
        await addDoc(collection(db, "expenses"), {
            ...newExpense,
            userId: user.uid, // 👈 NECESARIO para las reglas Firestore
        });
    } catch (error: any) {
        console.error("❌ Error al añadir gasto:", error);
        alert("Error al guardar el gasto: " + error.message);
    }
}

// 🔹 Obtener gastos por grupo
export async function getExpenses(
    user: AppUser,
    groupId: string
): Promise<Expense[]> {
    try {
        // 🧩 Invitado → localStorage
        if (user.isGuest) {
            const all = JSON.parse(localStorage.getItem("expenses") || "[]");
            return all
                .filter((e: Expense) => e.groupId === groupId)
                .sort((a: Expense, b: Expense) => b.createdAt - a.createdAt);
        }

        // 🧩 Firebase
        const q = query(
            collection(db, "expenses"),
            where("groupId", "==", groupId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
    } catch (error: any) {
        console.error("❌ Error al obtener gastos:", error);
        alert("Error al cargar los gastos: " + error.message);
        return [];
    }
}

// 🔹 Eliminar gasto
export async function deleteExpense(user: AppUser, id: string) {
    try {
        // 🧩 Invitado → localStorage
        if (user.isGuest) {
            const all = JSON.parse(localStorage.getItem("expenses") || "[]");
            const updated = all.filter((e: Expense) => e.id !== id);
            localStorage.setItem("expenses", JSON.stringify(updated));
            return;
        }

        // 🧩 Firebase
        await deleteDoc(doc(db, "expenses", id));
    } catch (error: any) {
        console.error("❌ Error al eliminar gasto:", error);
        alert("Error al eliminar el gasto: " + error.message);
    }
}
