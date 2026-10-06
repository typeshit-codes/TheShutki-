import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

let app = null;

export function initFirebase(config) {
  if (!config?.apiKey) return null;
  app = getApps()[0] || initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
  });
  return app;
}

export function getFbAuth() {
  return app ? getAuth(app) : null;
}

export { RecaptchaVerifier, signInWithPhoneNumber };
