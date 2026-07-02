import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBV4HUwNtskbvCdhpQNTA4Wvk8oEPyhJlY",
  authDomain: "financial-b456b.firebaseapp.com",
  projectId: "financial-b456b",
  storageBucket: "financial-b456b.firebasestorage.app",
  messagingSenderId: "137390618798",
  appId: "1:137390618798:web:48c719ff72cdc4261b953f",
  measurementId: "G-WWLKBHR8WV"
};

const app = initializeApp(firebaseConfig);
const appCheckSiteKey = window.FINTRACK_APP_CHECK_SITE_KEY || '';
const appCheckProviderType = window.FINTRACK_APP_CHECK_PROVIDER || 'recaptcha-enterprise';
if (appCheckSiteKey) {
  const provider = appCheckProviderType === 'recaptcha-v3'
    ? new ReCaptchaV3Provider(appCheckSiteKey)
    : new ReCaptchaEnterpriseProvider(appCheckSiteKey);

  initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true
  });
}
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export {
  auth,
  db,
  provider,
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc
};
