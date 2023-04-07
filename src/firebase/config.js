import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCuIpfT-Z701h5r0Yj4tbrYc4EOAX54wTY",
  authDomain: "ecomm-f0ae6.firebaseapp.com",
  projectId: "ecomm-f0ae6",
  storageBucket: "ecomm-f0ae6.appspot.com",
  messagingSenderId: "120976159108",
  appId: "1:120976159108:web:b5d5e4f10c1bdbdc622dd1",
  measurementId: "G-V49E8KP5YP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
