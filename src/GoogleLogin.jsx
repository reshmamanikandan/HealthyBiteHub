import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

export default function GoogleLogin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Keep track of logged in user state across page reloads
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Handler: Handle Google Login Popup
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      // User profile info available via result.user
      console.log("Logged in user:", result.user);
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError("Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "40px auto", textAlign: "center" }}>
      <h2>Google Authentication</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {user ? (
        <div>
          <img
            src={user.photoURL}
            alt="Profile"
            style={{ width: "80px", borderRadius: "50%" }}
          />
          <h3>Welcome, {user.displayName}</h3>
          <p>{user.email}</p>
          <button onClick={handleSignOut} style={{ padding: "10px 20px" }}>
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            margin: "0 auto"
          }}
        >
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
      )}
    </div>
  );
}