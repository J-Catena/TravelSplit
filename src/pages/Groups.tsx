import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import {
    createGroup,
    getGroups,
    deleteGroup,
    type TravelGroup,
} from "../Services/groupService";
import { Link } from "react-router-dom";

export default function Groups() {
    const { user } = useUser();
    const [groups, setGroups] = useState<TravelGroup[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // 🔹 Cargar los grupos al entrar
    useEffect(() => {
        if (user) {
            getGroups(user).then(setGroups);
        }
    }, [user]);

    const handleAddGroup = async () => {
        if (!name.trim()) return;
        await createGroup(user!, { name, description });
        const updated = await getGroups(user!);
        setGroups(updated);
        setName("");
        setDescription("");
    };

    const handleDelete = async (id: string) => {
        await deleteGroup(user!, id);
        const updated = await getGroups(user!);
        setGroups(updated);
    };

    return (
        <div className="p-4 sm:p-6 max-w-lg mx-auto">
            {/* Título */}
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-6 text-center">
                Mis grupos de viaje
            </h1>

            {/* Formulario */}
            <div className="mb-6 bg-white p-4 rounded-xl shadow-md flex flex-col gap-2">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre del viaje"
                    className="border rounded-lg px-3 py-2 text-sm sm:text-base"
                />
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="border rounded-lg px-3 py-2 text-sm sm:text-base"
                />
                <button
                    onClick={handleAddGroup}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 mt-2 text-sm sm:text-base"
                >
                    Crear grupo
                </button>
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {groups.length === 0 && (
                    <p className="text-gray-600 text-center text-sm sm:text-base">
                        Aún no tienes grupos.
                    </p>
                )}

                {groups.map((g) => (
                    <div
                        key={g.id}
                        className="bg-white shadow-md rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                        <div className="flex-1">
                            <p className="font-semibold text-base sm:text-lg">{g.name}</p>
                            <p className="text-gray-500 text-sm">{g.description}</p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Link
                                to={`/group/${g.id}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-sm sm:text-base"
                            >
                                Abrir
                            </Link>
                            <button
                                onClick={() => handleDelete(g.id!)}
                                className="text-red-500 hover:text-red-700 font-semibold text-sm sm:text-base"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
