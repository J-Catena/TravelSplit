import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebaseConfig";
import { useUser } from "../context/UserContext";

export default function Start() {
    const { setUser } = useUser();

    const handleGuestStart = () => {
        const guestUser = {
            id: crypto.randomUUID(),
            name: "Invitado",
            isGuest: true,
        };
        localStorage.setItem("guestUser", JSON.stringify(guestUser));
        setUser(guestUser);
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-100 text-center px-6">
            <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-3xl p-8 sm:p-12 md:p-16 flex flex-col items-center gap-6 border border-gray-100 w-full max-w-md transition-all duration-300">

                {/* 🔹 Logo arriba */}
                <img
                    src="/logo.png"
                    alt="TravelSplit logo"
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain drop-shadow-md transition-transform duration-300 hover:scale-110"
                />

                {/* 🔹 Nombre */}
                <h1
                    className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text 
                 bg-gradient-to-r from-emerald-600 to-blue-600 drop-shadow-sm"
                >
                    TravelSplit
                </h1>

                {/* 🔹 Descripción */}
                <p className="text-gray-600 max-w-sm text-base sm:text-lg mt-1 mb-4 leading-relaxed">
                    Crea, organiza y comparte tus viajes con amigos de forma sencilla
                </p>

                {/* 🔹 Botones */}
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                        onClick={handleGuestStart}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 
                   text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg 
                   transition-all duration-300 transform hover:-translate-y-0.5 text-base sm:text-lg"
                    >
                        Empezar sin registrarse
                    </button>

                    <button
                        onClick={handleGoogleLogin}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                   text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg 
                   transition-all duration-300 transform hover:-translate-y-0.5 text-base sm:text-lg"
                    >
                        Iniciar sesión con Google
                    </button>
                </div>
            </div>
        </div>

    );
}
