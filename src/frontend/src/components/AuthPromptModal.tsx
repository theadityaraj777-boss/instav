import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

// Firebase Configuration (env.json se keys automatic load hongi)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthPromptModal({ open, onClose }: AuthPromptModalProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Firebase Google Sign-In Popup kholega
      const result = await signInWithPopup(auth, provider);
      console.log("User logged in successfully:", result.user);
      onClose(); // Login hone ke baad modal band ho jaye
    } catch (error) {
      console.error("Firebase Login Error:", error);
    } finally {
    
      setIsLoggingIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm mx-auto rounded-2xl border text-center"
        style={{
          background: "oklch(0.11 0.009 265)",
          borderColor: "oklch(1 0 0 / 8%)",
        }}
      >
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f5c842, #e8a020, #ff6b6b)",
              }}
            >
              <UserPlus className="w-6 h-6 text-black" />
            </div>
          </div>
          <DialogTitle className="text-foreground text-lg">
            Create your profile first
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm mt-1 mb-5">
          Sign in with Google to like, comment, follow, and post on Smileup.
        </p>
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #f5c842, #e8a020)",
            color: "oklch(0.07 0.006 265)",
            boxShadow: "0 2px 16px oklch(0.78 0.16 75 / 0.35)",
          }}
        >
          {isLoggingIn ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Connecting...
            </span>
          ) : (
            "Sign In with Google"
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
}
