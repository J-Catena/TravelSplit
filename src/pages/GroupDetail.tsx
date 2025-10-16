import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "react-hot-toast";
import { useUser } from "../context/UserContext";
import {
    addExpense,
    getExpenses,
    deleteExpense,
    type Expense,
} from "../Services/expenseService";
import {
    getGroups,
    addMember,
    removeMember,
    type TravelGroup,
} from "../Services/groupService";

export default function GroupDetail() {
    const { id } = useParams<{ id: string }>();
    const { user } = useUser();

    const [group, setGroup] = useState<TravelGroup | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [newMember, setNewMember] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [payer, setPayer] = useState("");
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingExpense, setSavingExpense] = useState(false);
    const [addingMember, setAddingMember] = useState(false);

    const CATEGORY_COLORS: Record<string, string> = {
        Comida: "#FBBF24",
        Estancia: "#60A5FA",
        Vehículo: "#34D399",
        "Otros gastos": "#A78BFA",
    };

    const cardStyle =
        "bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-md p-5 sm:p-6 transition-all duration-300 hover:shadow-lg";

    // ────────────────────────────────────────────────────────────────────────────
    // Carga inicial
    // ────────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user || !id) return;
        (async () => {
            try {
                setLoading(true);
                const groups = await getGroups(user);
                const g = groups.find((gr) => gr.id === id) || null;
                setGroup(g);
                if (g?.members?.length) setPayer(g.members[0]);
                const exps = await getExpenses(user, id);
                setExpenses(exps);
            } catch {
                toast.error("No se pudo cargar el grupo.");
            } finally {
                setLoading(false);
            }
        })();
    }, [user, id]);

    // 🔹 FIX: sincronizar payer automáticamente cuando cambian los miembros
    useEffect(() => {
        if (group?.members?.length) {
            if (!payer || !group.members.includes(payer)) {
                setPayer(group.members[0]);
            }
        }
    }, [group?.members]);

    // ────────────────────────────────────────────────────────────────────────────
    // Cálculos derivados
    // ────────────────────────────────────────────────────────────────────────────
    const balances = useMemo(() => {
        const b: Record<string, number> = {};
        if (!group?.members?.length) return b;
        group.members.forEach((m) => (b[m] = 0));
        expenses.forEach((e) => {
            const perPerson = e.amount / (group?.members.length || 1);
            group.members.forEach((m) => {
                if (m === e.payer) b[m] += e.amount - perPerson;
                else b[m] -= perPerson;
            });
        });
        return b;
    }, [group?.members, expenses]);

    const settlements = useMemo(() => {
        const debtors = Object.entries(balances)
            .filter(([_, bal]) => bal < -0.01)
            .map(([name, bal]) => ({ name, amount: -bal }));
        const creditors = Object.entries(balances)
            .filter(([_, bal]) => bal > 0.01)
            .map(([name, bal]) => ({ name, amount: bal }));

        const s: string[] = [];
        const ds = [...debtors];
        const cs = [...creditors];

        while (ds.length && cs.length) {
            ds.sort((a, b) => b.amount - a.amount);
            cs.sort((a, b) => b.amount - a.amount);
            const debtor = ds[0];
            const creditor = cs[0];
            const amount = Math.min(debtor.amount, creditor.amount);
            s.push(`${debtor.name} → ${creditor.name}: ${amount.toFixed(2)} €`);
            debtor.amount -= amount;
            creditor.amount -= amount;
            if (debtor.amount < 0.01) ds.shift();
            if (creditor.amount < 0.01) cs.shift();
        }
        return s;
    }, [balances]);

    const categoryData = useMemo(() => {
        const totals: Record<string, number> = {};
        expenses.forEach((e) => {
            if (!e.category) return;
            if (!totals[e.category]) totals[e.category] = 0;
            totals[e.category] += e.amount;
        });
        return Object.entries(totals).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    // ────────────────────────────────────────────────────────────────────────────
    // Handlers
    // ────────────────────────────────────────────────────────────────────────────
    const handleAddMember = useCallback(async () => {
        if (!newMember.trim() || !id || !user) return;
        try {
            setAddingMember(true);
            await addMember(user, id, newMember.trim());
            const updated = await getGroups(user);
            const g = updated.find((gr) => gr.id === id) || null;
            setGroup(g);
            setNewMember("");
            toast.success("Integrante añadido");
        } catch {
            toast.error("No se pudo añadir el integrante.");
        } finally {
            setAddingMember(false);
        }
    }, [user, id, newMember]);

    const handleRemoveMember = useCallback(
        async (name: string) => {
            if (!group || !id || !user) return;
            if (group.members.length <= 1) {
                toast.error("El grupo debe tener al menos 1 integrante.");
                return;
            }
            if (!confirm(`¿Quieres eliminar a ${name}?`)) return;

            // Optimista + rollback
            const prev = group;
            const optimistic = {
                ...group,
                members: group.members.filter((m) => m !== name),
            };
            setGroup(optimistic);
            if (payer === name && optimistic.members.length)
                setPayer(optimistic.members[0]);

            try {
                await removeMember(user, id, name);
                const refreshed = await getGroups(user);
                setGroup(refreshed.find((g) => g.id === id) || null);
                toast.success("Integrante eliminado");
            } catch {
                setGroup(prev);
                toast.error("No se pudo eliminar el integrante.");
            }
        },
        [group, id, user, payer]
    );

    const handleAddExpense = useCallback(async () => {
        // 🔔 Ayuda rápida si no hay integrantes
        if (!group?.members?.length) {
            toast("Primero añade al menos un integrante 👥", { icon: "ℹ️" });
            return;
        }

        if (!payer || !description.trim() || !amount.trim() || !category) {
            toast("Completa todos los campos", { icon: "⚠️" });
            return;
        }

        try {
            setSavingExpense(true);
            await addExpense(user!, {
                groupId: id!,
                payer,
                amount: parseFloat(amount),
                description: description.trim(),
                category,
            });
            const updated = await getExpenses(user!, id!);
            setExpenses(updated);
            setDescription("");
            setAmount("");
            setCategory("");
            toast.success("Gasto añadido");
        } catch {
            toast.error("No se pudo añadir el gasto.");
        } finally {
            setSavingExpense(false);
        }
    }, [user, id, payer, description, amount, category, group?.members?.length]);

    // ────────────────────────────────────────────────────────────────────────────
    // UI
    // ────────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-600">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-400 border-t-transparent"></div>
                <span className="ml-3 text-sm font-medium">Cargando grupo...</span>
            </div>
        );
    }

    const hasMembers = !!group?.members?.length;

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-10" />
            <div className="relative z-10 max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-800 tracking-tight flex items-center gap-2 text-center sm:text-left">
                        🌍 {group?.name}
                    </h1>
                    <Link
                        to="/"
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition text-sm sm:text-base"
                    >
                        ← Volver
                    </Link>
                </header>

                {/* Integrantes */}
                <section className={cardStyle}>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 border-b border-gray-100 pb-3 mb-5 flex items-center gap-2">
                        👥 Integrantes
                    </h3>

                    <ul className="mb-5 space-y-2">
                        {group?.members.map((m) => (
                            <li
                                key={m}
                                className="flex items-center justify-between bg-gradient-to-r from-white to-blue-50/40 hover:from-blue-50 hover:to-green-50 transition-all duration-200 rounded-xl px-3 py-2 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm shadow-inner">
                                        {m.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-800 font-medium">{m}</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveMember(m)}
                                    className="text-gray-700 hover:text-red-600 transition-all duration-150 p-1 rounded-full hover:bg-gray-100 active:scale-95"
                                    title={`Eliminar a ${m}`}
                                    aria-label={`Eliminar a ${m}`}
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            value={newMember}
                            onChange={(e) => setNewMember(e.target.value)}
                            placeholder="Añadir nuevo integrante"
                            className="border border-gray-300 rounded-lg px-4 py-2 flex-1 text-sm shadow-sm focus:ring-2 focus:ring-green-300 outline-none transition"
                        />
                        <button
                            onClick={handleAddMember}
                            disabled={addingMember || !newMember.trim()}
                            className="bg-gradient-to-r from-green-500 to-green-600 disabled:opacity-60 disabled:cursor-not-allowed hover:from-green-600 hover:to-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                        >
                            {addingMember ? "Añadiendo..." : "Añadir"}
                        </button>
                    </div>
                </section>

                {/* Nuevo gasto */}
                <section className={cardStyle}>
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                        💸 Nuevo gasto
                    </h3>
                    {!hasMembers && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                            Añade al menos un integrante para poder registrar gastos.
                        </p>
                    )}
                    <div className="space-y-3">
                        <select
                            value={payer}
                            onChange={(e) => setPayer(e.target.value)}
                            disabled={!hasMembers}
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-green-300 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        >
                            {!hasMembers ? (
                                <option>Sin integrantes</option>
                            ) : (
                                group?.members.map((m) => <option key={m}>{m}</option>)
                            )}
                        </select>

                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            disabled={!hasMembers}
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-green-300 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        >
                            <option value="">Seleccionar categoría</option>
                            <option value="Estancia">Estancia</option>
                            <option value="Comida">Comida</option>
                            <option value="Vehículo">Vehículo</option>
                            <option value="Otros gastos">Otros gastos</option>
                        </select>

                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descripción"
                            disabled={!hasMembers}
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-green-300 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Monto (€)"
                            disabled={!hasMembers}
                            className="border border-gray-300 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-green-300 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />

                        <button
                            onClick={handleAddExpense}
                            disabled={savingExpense || !hasMembers}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-blue-700 text-white font-semibold rounded-lg py-2 shadow-md transition active:scale-[0.98]"
                        >
                            {savingExpense ? "Guardando..." : "Añadir gasto"}
                        </button>
                    </div>
                </section>

                {/* Balance general */}
                <section className={cardStyle}>
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                        📊 Balance general
                    </h3>
                    {Object.entries(balances).map(([member, balance]) => (
                        <div
                            key={member}
                            className="flex justify-between text-sm border-b border-gray-100 py-1"
                        >
                            <span className="font-medium text-gray-700">{member}</span>
                            <span
                                className={`font-semibold ${balance >= 0 ? "text-green-600" : "text-red-500"
                                    }`}
                            >
                                {balance >= 0 ? "+" : ""}
                                {balance.toFixed(2)} €
                            </span>
                        </div>
                    ))}
                </section>

                {/* Desglose por categoría */}
                {categoryData.length > 0 && (
                    <section className={cardStyle}>
                        <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                            Desglose por categoría
                        </h3>
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                            <ul className="flex-1 w-full divide-y divide-gray-100 text-sm">
                                {categoryData.map((c) => (
                                    <li
                                        key={c.name}
                                        className="flex justify-between py-2 hover:bg-gray-50 rounded-md transition px-1"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        CATEGORY_COLORS[c.name] || "#CBD5E1",
                                                }}
                                            />
                                            <span className="font-medium text-gray-700">{c.name}</span>
                                        </div>
                                        <span className="text-gray-900 font-semibold">
                                            {c.value.toFixed(2)} €
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex-1 w-full flex flex-col items-center justify-center">
                                <div className="w-full h-[260px] sm:h-[340px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={80}
                                                outerRadius={120}
                                                labelLine={false}
                                                label={(p) => {
                                                    const percent =
                                                        typeof (p as { percent?: number })?.percent ===
                                                            "number"
                                                            ? (p as { percent?: number }).percent!
                                                            : 0;
                                                    return `${Math.round(percent * 100)}%`;
                                                }}
                                            >
                                                {categoryData.map((entry) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={CATEGORY_COLORS[entry.name] || "#CBD5E1"}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number, name: string) => [
                                                    `${value.toFixed(2)} €`,
                                                    name,
                                                ]}
                                                contentStyle={{
                                                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                                                    borderRadius: "10px",
                                                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Ajuste final */}
                {settlements.length > 0 && (
                    <section className={cardStyle}>
                        <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                            💰 Ajuste final
                        </h3>
                        <ul className="space-y-2 text-sm">
                            {settlements.map((s, i) => {
                                const match = s.match(
                                    /^(.*?)\s*→\s*(.*?):\s*(\d+(\.\d{1,2})?)\s*€$/
                                );
                                if (!match)
                                    return (
                                        <li key={i} className="text-gray-700">
                                            {s}
                                        </li>
                                    );
                                const [, p, r, amount] = match;
                                return (
                                    <li
                                        key={i}
                                        className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition rounded-lg px-3 py-2"
                                    >
                                        <span className="text-gray-700">
                                            <span className="font-medium text-gray-800">{p}</span> debe
                                            a{" "}
                                            <span className="font-medium text-gray-800">{r}</span>
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            {parseFloat(amount).toFixed(2)} €
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {/* Historial */}
                <section className={cardStyle}>
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                        🧾 Historial de gastos
                    </h3>

                    {expenses.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Aún no hay gastos registrados.
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {expenses.map((e) => (
                                <li
                                    key={e.id}
                                    className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-gray-50 rounded-lg px-2 transition"
                                >
                                    <div>
                                        <span className="font-semibold text-blue-700">
                                            {e.payer}
                                        </span>{" "}
                                        <span className="text-gray-600 italic text-sm">
                                            — {e.description || "Sin descripción"}
                                        </span>
                                        <div className="text-gray-500 text-xs">{e.category}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-gray-800 text-sm">
                                            {e.amount.toFixed(2)} €
                                        </span>
                                        <button
                                            onClick={async () => {
                                                if (!confirm("¿Seguro que deseas eliminar este gasto?"))
                                                    return;
                                                try {
                                                    await deleteExpense(user!, e.id!);
                                                    const updated = await getExpenses(user!, id!);
                                                    setExpenses(updated);
                                                    toast.success("Gasto eliminado");
                                                } catch {
                                                    toast.error("No se pudo eliminar el gasto.");
                                                }
                                            }}
                                            className="text-gray-700 hover:text-red-600 transition"
                                            aria-label="Eliminar gasto"
                                            title="Eliminar gasto"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
