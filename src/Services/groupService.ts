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

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────
export interface TravelGroup {
    id?: string;
    name: string;
    description?: string;
    members: string[];
    createdAt: number;
}

// ──────────────────────────────────────────────
// Utilidades
// ──────────────────────────────────────────────
const GUEST_KEY = "groups";
const norm = (s: string) => s.trim().toLowerCase();

function ensureArray<T>(v: unknown, fallback: T[] = []): T[] {
    return Array.isArray(v) ? (v as T[]) : fallback;
}

// ✅ Usamos colección raíz "groups" en Firestore
function groupsCollection() {
    return collection(db, "groups");
}

function groupDoc(groupId: string) {
    return doc(db, "groups", groupId);
}

// ──────────────────────────────────────────────
// Crear grupo
// ──────────────────────────────────────────────
export async function createGroup(
    user: AppUser,
    data: Omit<TravelGroup, "id" | "createdAt" | "members">
) {
    const newGroup: TravelGroup = {
        ...data,
        members: [],
        createdAt: Date.now(),
    };

    // Invitado → localStorage
    if (user.isGuest) {
        const localGroups = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        localGroups.push({ ...newGroup, id: crypto.randomUUID() });
        localStorage.setItem(GUEST_KEY, JSON.stringify(localGroups));
        return;
    }

    // Usuario con Firebase → colección raíz
    await addDoc(groupsCollection(), newGroup);
}

// ──────────────────────────────────────────────
// Obtener grupos
// ──────────────────────────────────────────────
export async function getGroups(user: AppUser): Promise<TravelGroup[]> {
    if (user.isGuest) {
        return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    }

    const snapshot = await getDocs(groupsCollection());
    return snapshot.docs.map(
        (d) =>
        ({
            id: d.id,
            ...d.data(),
            members: ensureArray<string>((d.data() as any)?.members, []),
        } as TravelGroup)
    );
}

// ──────────────────────────────────────────────
// Eliminar grupo
// ──────────────────────────────────────────────
export async function deleteGroup(user: AppUser, id: string) {
    if (user.isGuest) {
        const all: TravelGroup[] = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        const updated = all.filter((g) => g.id !== id);
        localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
        return;
    }

    await deleteDoc(groupDoc(id));
}

// ──────────────────────────────────────────────
// Añadir miembro
// ──────────────────────────────────────────────
export async function addMember(user: AppUser, groupId: string, member: string) {
    const clean = member.trim();
    if (!clean) return;

    // Invitado → localStorage
    if (user.isGuest) {
        const all: TravelGroup[] = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        const updated = all.map((g) => {
            if (g.id !== groupId) return g;
            const current = ensureArray<string>(g.members, []);
            if (current.some((m) => norm(m) === norm(clean))) return g;
            return { ...g, members: [...current, clean] };
        });
        localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
        return;
    }

    // Firebase
    const ref = groupDoc(groupId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            name: "Grupo sin nombre",
            description: "",
            members: [clean],
            createdAt: Date.now(),
        });
        return;
    }

    await updateDoc(ref, { members: arrayUnion(clean) });
}

// ──────────────────────────────────────────────
// Eliminar miembro
// ──────────────────────────────────────────────
export async function removeMember(user: AppUser, groupId: string, member: string) {
    const clean = member.trim();
    if (!clean) return;

    // Invitado → localStorage
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

    // Firebase
    const ref = groupDoc(groupId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() as TravelGroup;
    const current = ensureArray<string>(data.members, []);
    const target = current.find((m) => norm(m) === norm(clean));
    if (!target) return;

    await updateDoc(ref, { members: arrayRemove(target) });
}
