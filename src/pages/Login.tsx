import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebaseConfig";

export default function Login() {
    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <h1 className="text-4xl font-bold mb-8 text-blue-700">TravelSplit 🌍</h1>
            <button
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all"
            >
                Iniciar sesión con Google
            </button>
        </div>
    );
}
