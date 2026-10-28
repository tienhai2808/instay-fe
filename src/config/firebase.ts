import { FIREBASE_MESSAGING_SW_PATH } from "@/constants/firebase";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseWebConfig: FirebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const hasRequiredFirebaseEnv = () => {
  return Object.values(firebaseWebConfig).every(Boolean);
};

export const getFirebaseConfig = (): FirebaseWebConfig => {
  return firebaseWebConfig;
};

export const getFirebaseVapidKey = () => {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";
};

export const getFirebaseMessagingSwUrl = () => {
  const params = new URLSearchParams(Object.entries(firebaseWebConfig));
  return `${FIREBASE_MESSAGING_SW_PATH}?${params.toString()}`;
};
