import { db } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

// 🔹 Sube los gastos locales de invitados a Firestore
export async function syncLocalExpensesToFirestore(userId: string) {
    const localExpenses = JSON.parse(localStorage.getItem("expenses") || "[]");

    if (!localExpenses.length) return;

    for (const expense of localExpenses) {
        const { id, ...rest } = expense; // quitar id local
        try {
            await addDoc(collection(db, "expenses"), {
                ...rest,
                userId, // asociar al usuario autenticado
            });
        } catch (err) {
            console.error("❌ Error al sincronizar gasto:", err);
        }
    }

    // 🧹 Limpiar almacenamiento local tras sincronización
    localStorage.removeItem("expenses");
    console.log("✅ Gastos locales sincronizados con Firestore");
}
