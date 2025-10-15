import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAx6m-vMJnz_Pf8ktNg6MXyQmWiMs3GRE4",
    authDomain: "travelsplit-72d62.firebaseapp.com",
    projectId: "travelsplit-72d62",
    storageBucket: "travelsplit-72d62.firebasestorage.app",
    messagingSenderId: "844697555511",
    appId: "1:844697555511:web:8cb5efaca7c3744f4665b2"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
