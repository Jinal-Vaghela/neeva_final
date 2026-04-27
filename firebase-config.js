// public/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXNGP3AU9Ej9IlmBKvV5pUCO3nZIiVwOo",
  authDomain: "neeva-ayurveda.firebaseapp.com",
  projectId: "neeva-ayurveda",
  storageBucket: "neeva-ayurveda.firebasestorage.app",
  messagingSenderId: "1011846119702",
  appId: "1:1011846119702:web:4f7450dc8e86e54fec5037",
  measurementId: "G-YWG1PG7ZQ4",
  databaseURL: "https://neeva-ayurveda-default-rtdb.firebaseio.com/" // Added for completeness
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics safely
let analytics;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (e) {
  console.warn("Firebase Analytics initialization failed:", e);
}

// Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // Realtime Database reference
export const googleProvider = new GoogleAuthProvider();
