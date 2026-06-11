import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { AuthPromptModal } from "./components/AuthPromptModal";

function App() {
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsModalOpen(false);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-xl font-semibold animate-pulse text-purple-500">Smileup Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-50">
        <h1 className="text-2xl font-black text-purple-500 tracking-wider">Smileup</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <img 
                src={user.photoURL || "https://via.placeholder.com/150"} 
                alt="Profile" 
                className="w-9 h-9 rounded-full border-2 border-purple-500"
              />
              <button 
                onClick={() => signOut(getAuth())}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              Login
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-col items-center justify-center p-6 mt-16">
        {user ? (
          <div className="text-center bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl max-w-md w-full">
            <span className="bg-green-500/10 text-green-400 text-xs px-3 py-1 rounded-full font-medium">Firebase Connected</span>
            <h2 className="text-2xl font-bold mt-4 mb-2">Welcome, {user.displayName}!</h2>
            <p className="text-gray-400 text-sm mb-4">{user.email}</p>
          </div>
        ) : (
          <div className="text-center max-w-md px-4">
            <h2 className="text-4xl font-extrabold text-gray-100 mb-4 tracking-tight">Connect with a Smile 😊</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Smileup par aapka swagat hai! Apne doston se judne ke liye login karein.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-8 py-3 rounded-xl font-bold shadow-xl transition-all"
            >
              Get Started
            </button>
          </div>
        )}
      </main>

      <AuthPromptModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

export default App;
