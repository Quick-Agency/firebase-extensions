import { getApps, initializeApp, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

const app = getApp();
const firestore = getFirestore();

export { app, firestore };
