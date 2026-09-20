import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA-Ky2xDFvOAPM4wRFPiiZwoT7CEt3-wWc",
  authDomain: "hi-tech-farm.firebaseapp.com",
  databaseURL: "https://hi-tech-farm-default-rtdb.firebaseio.com",
  projectId: "hi-tech-farm",
  storageBucket: "hi-tech-farm.firebasestorage.app",
  messagingSenderId: "588461894899",
  appId: "1:588461894899:web:3bb3352c64bdab6a37db86",
  measurementId: "G-DGSV6MG1JM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);
export { ref, onValue, set, update };
