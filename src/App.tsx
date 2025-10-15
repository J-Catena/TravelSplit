import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useUser } from "./context/UserContext";
import Start from "./pages/Start";
import Groups from "./pages/Groups";
import { Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";

function App() {
  const { user, setUser } = useUser();

  if (!user) return <Start />;

  const handleLogout = async () => {
    try {
      if (user.isGuest) {
        localStorage.removeItem("guestUser");
      } else {
        await signOut(auth);
      }
    } finally {
      // No recargamos la página: dejamos que React re-renderice Start
      setUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* 🔹 Header principal */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-3 sm:py-4">
          {/* 🔹 Logo + nombre (link a home) */}
          <Link
            to="/"
            aria-label="Ir al inicio"
            className="flex items-center gap-3 group transition-transform duration-300 hover:scale-[1.02]"
          >
            <picture>
              <img
                src="/logo.png"
                srcSet="/logo.png 1x, /logo@2x.png 2x"
                sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 56px"
                alt="TravelSplit logo"
                className="h-10 sm:h-12 md:h-14 w-auto object-contain drop-shadow-sm"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = "/logo.png";
                  img.srcset = "";
                }}
              />
            </picture>

            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text 
                         bg-gradient-to-r from-emerald-600 to-blue-600 drop-shadow-sm 
                         transition-all duration-300 group-hover:brightness-110"
            >
              TravelSplit
            </h1>
          </Link>

          {/* 🔹 Usuario y botón de salir */}
          <div className="flex items-center gap-3">
            <span
              className="text-gray-700 font-medium truncate max-w-[120px] sm:max-w-none"
              title={user.name}
            >
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* 🔹 Contenido */}
      <main className="flex-1 flex justify-center items-start p-4 sm:p-8">
        <div className="w-full max-w-2xl">
          <Groups />
        </div>
      </main>

      {/* 🔹 Footer mejorado */}
      <footer className="w-full bg-gradient-to-r from-green-50 via-blue-50 to-indigo-50 border-t border-gray-200 text-center py-5 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-2 sm:gap-3">
          <p className="text-gray-700 text-sm sm:text-base leading-snug">
            © {new Date().getFullYear()} <span className="font-semibold text-emerald-700">TravelSplit</span> — Crea y comparte tus viajes
          </p>

          <p className="text-gray-500 text-xs sm:text-sm leading-snug">
            Diseñado y desarrollado por{" "}
            <a
              href="https://juancatena.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
            >
              Juan Catena
            </a>
          </p>
        </div>
      </footer>

      {/* ✅ Toaster global */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: {
            background: "#333",
            color: "#fff",
            borderRadius: "10px",
            fontSize: "0.9rem",
          },
          success: {
            iconTheme: { primary: "#4ade80", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
          },
        }}
      />
    </div>
  );
}

export default App;
