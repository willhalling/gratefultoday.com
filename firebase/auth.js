import { firestoreAuth } from './firebase-config';

import {
  signOut,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  signInWithEmailAndPassword,
  applyActionCode,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  Auth,
  setPersistence,
  browserLocalPersistence,
  getAuth
} from 'firebase/auth';

export const signinWithGoogle = async () => {
  const auth = firestoreAuth;
  const provider = new GoogleAuthProvider();
  const signin = await signInWithPopup(auth, provider).catch(
    (error) => {
      throw new Error(error)
    });
  if (signin) {
    return signin.user.email
  }
};

export const sendSignInLink = async (email) => {
  const actionCodeSettings = {
    url: `${location.origin}/sign-in/email`,
    handleCodeInApp: true,
  };
  const auth = firestoreAuth;
  await sendSignInLinkToEmail(auth, email, actionCodeSettings).catch(
    (error) => {
      throw new Error(error)
    });
};

export const isSignInLink = async (email) => {
  // Confirm the link is a sign-in with email link.
  const auth = firestoreAuth;
  if (isSignInWithEmailLink(auth, window.location.href)) {
    // Additional state parameters can also be passed via URL.
    // This can be used to continue the user's intended action before triggering
    // the sign-in operation.
    // Get the email if available. This should be available if the user completes
    // the flow on the same device where they started it.
    /* 
    let email = window.localStorage.getItem('gt_emailForSignIn');
    if (!email) {
      // User opened the link on a different device. To prevent session fixation
      // attacks, ask the user to provide the associated email again. For example:
      email = window.prompt('Please provide your email for confirmation');
    } */
    // The client SDK will parse the code from the link for you.
    signInWithEmailLink(auth, email, window.location.href)
      .then((result) => {
        // Clear email from storage.
        window.localStorage.removeItem('fc_emailForSignIn');
        // You can access the new user via result.user
        // Additional user info profile not available via:
        // result.additionalUserInfo.profile == null
        // You can check if the user is new or existing:
        // result.additionalUserInfo.isNewUser
      })
      .catch((error) => {
        console.warn(error);
        throw new Error(error)
        // Some error occurred, you can inspect the code: error.code
        // Common errors could be invalid email and invalid or expired OTPs.
      });
  }
};

export async function logOut() {
  const auth = firestoreAuth;
  console.log('Log Out');
  await signOut(auth).catch((error) => {
    throw new Error(error);
  });
}

export function handleVerifyEmail(actionCode) {
  const auth = firestoreAuth;
  return applyActionCode(auth, actionCode)
    .then(async response => {
      const user = auth.currentUser
      await user.reload()
      return response
    })
    .catch(error => {
      throw new Error(error)
    })
}

export const loginWithEmailAndPassword = async (email, password) => {
  const auth = firestoreAuth;
  await signInWithEmailAndPassword(auth, email, password).catch((error) => {
    throw new Error(error);
  });
};
