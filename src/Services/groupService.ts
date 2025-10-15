// Services/groupService.ts
import { db } from "../firebaseConfig";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    getDoc,
    arrayUnion,
    arrayRemove,
    setDoc,
} from "firebase/firestore";
import type { AppUser } from "../context/UserContext";

export interface TravelGroup {
    id?: string;
    name: string;
    description?: string;
    members: string[];
    createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const GUEST_KEY = "groups";

const norm = (s: string) => s.trim().toLowerCase();

function ensureArray<T>(v: unknown, fallback: T[] = []): T[] {
    return Array.isArray(v) ? (v as T[]) : fallback;
}

function userGroupsCol(user: AppUser) {
    if (!user.id) throw new Error("ID ausente para usuario registrado.");
    return collection(db, "users", user.id, "groups");
}

function userGroupDoc(user: AppUser, groupId: string) {
    if (!user.id) throw new Error("ID ausente para usuario registrado.");
    return doc(db, "users", user.id, "groups", groupId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear grupo
// ─────────────────────────────────────────────────────────────────────────────
export async function createGroup(
    user: AppUser,
    data: Omit<TravelGroup, "id" | "createdAt" | "members">
) {
    const newGroup: TravelGroup = {
        ...data,
        members: [],
        createdAt: Date.now(),
    };

    if (user.isGuest) {
        const localGroups = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        localGroups.push({ ...newGroup, id: crypto.randomUUID() });
        localStorage.setItem(GUEST_KEY, JSON.stringify(localGroups));
        return;
    }

    await addDoc(userGroupsCol(user), newGroup);
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener grupos
// ─────────────────────────────────────────────────────────────────────────────
export async function getGroups(user: AppUser): Promise<TravelGroup[]> {
    if (user.isGuest) {
        return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    }

    const snapshot = await getDocs(userGroupsCol(user));
    return snapshot.docs.map(
        (d) =>
        ({
            id: d.id,
            ...d.data(),
            members: ensureArray<string>((d.data() as any)?.members, []),
        } as TravelGroup)
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Eliminar grupo
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteGroup(user: AppUser, id: string) {
    if (user.isGuest) {
        const all: TravelGroup[] = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        const updated = all.filter((g) => g.id !== id);
        localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
        return;
    }

    await deleteDoc(userGroupDoc(user, id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Añadir miembro
// ─────────────────────────────────────────────────────────────────────────────
export async function addMember(user: AppUser, groupId: string, member: string) {
    const clean = member.trim();
    if (!clean) return;

    if (user.isGuest) {
        const all: TravelGroup[] = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        const updated = all.map((g) => {
            if (g.id !== groupId) return g;
            const current = ensureArray<string>(g.members, []);
            // Evitar duplicados (case-insensitive)
            if (current.some((m) => norm(m) === norm(clean))) return g;
            return { ...g, members: [...current, clean] };
        });
        localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
        return;
    }

    // Firebase: garantiza que el doc exista y usa arrayUnion
    const ref = userGroupDoc(user, groupId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        // si no existe, lo creamos mínimo con este shape
        await setDoc(ref, {
            name: "Grupo",
            description: "",
            members: [clean],
            createdAt: Date.now(),
        });
        return;
    }

    await updateDoc(ref, { members: arrayUnion(clean) });
}

// ─────────────────────────────────────────────────────────────────────────────
// Eliminar miembro (PERSISTENTE) ← lo que te faltaba
// ─────────────────────────────────────────────────────────────────────────────
export async function removeMember(user: AppUser, groupId: string, member: string) {
    const clean = member.trim();
    if (!clean) return;

    if (user.isGuest) {
        const all: TravelGroup[] = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        const updated = all.map((g) => {
            if (g.id !== groupId) return g;
            const current = ensureArray<string>(g.members, []);
            return {
                ...g,
                members: current.filter((m) => norm(m) !== norm(clean)),
            };
        });
        localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
        return;
    }

    // Firebase: usa arrayRemove
    const ref = userGroupDoc(user, groupId);
    // Opcional: si quieres evitar case-insensitive en Firebase, primero lee y normaliza:
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as TravelGroup;
    const current = ensureArray<string>(data.members, []);

    // Si hay posibles variantes de mayúsculas/minúsculas, filtramos y actualizamos lista completa:
    const target = current.find((m) => norm(m) === norm(clean));
    if (!target) return;

    // Si no quieres reescribir toda la lista, usa arrayRemove con el valor exacto
    await updateDoc(ref, { members: arrayRemove(target) });
}
