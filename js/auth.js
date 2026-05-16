import {
    auth,
    provider,
    browserLocalPersistence,
    getRedirectResult,
    setPersistence,
    signInWithPopup,
    signInWithRedirect,
    onAuthStateChanged,
    signOut
} from './firebase-config.js';

let currentUser = null;
let authInitialized = false;

const loginButtonHtml = '<img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5" alt="Google"> Google വഴി ലോഗിൻ ചെയ്യുക';

const resetLoginButton = () => {
    const loginBtn = document.getElementById('btn-login');
    loginBtn.disabled = false;
    loginBtn.innerHTML = loginButtonHtml;
};

const showAuthError = (message) => {
    const authError = document.getElementById('auth-error');
    authError.textContent = message;
    authError.classList.remove('hidden');
};

const clearAuthError = () => {
    const authError = document.getElementById('auth-error');
    authError.textContent = '';
    authError.classList.add('hidden');
};

const getFriendlyAuthError = (error) => {
    const code = error?.code || '';

    if (code === 'auth/unauthorized-domain') {
        return 'ഈ domain Firebase Authentication > Settings > Authorized domains-ൽ add ചെയ്തിട്ടില്ല. Firebase Console-ൽ current website domain add ചെയ്തിട്ട് വീണ്ടും ശ്രമിക്കുക.';
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return 'Google sign-in window അടഞ്ഞു. ദയവായി വീണ്ടും ശ്രമിക്കുക.';
    }
    if (code === 'auth/popup-blocked') {
        return 'Browser popup block ചെയ്തു. Redirect sign-in ആരംഭിക്കുന്നു...';
    }
    if (code === 'auth/network-request-failed') {
        return 'Network പ്രശ്നം കാരണം Google sign-in പൂർത്തിയാക്കാൻ കഴിഞ്ഞില്ല. Internet connection പരിശോധിക്കുക.';
    }
    if (code === 'auth/operation-not-allowed') {
        return 'Firebase Console-ൽ Google provider enable ചെയ്തിട്ടില്ല. Authentication > Sign-in method > Google enable ചെയ്യുക.';
    }

    return error?.message || 'Google sign-in പൂർത്തിയാക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.';
};

const isRedirectFallbackError = (error) => [
    'auth/popup-blocked',
    'auth/operation-not-supported-in-this-environment'
].includes(error?.code);

const startGoogleLogin = async () => {
    const loginBtn = document.getElementById('btn-login');
    clearAuthError();
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Google തുറക്കുന്നു...';

    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Google popup sign-in error', error);

        if (isRedirectFallbackError(error)) {
            showAuthError(getFriendlyAuthError(error));
            loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Redirecting...';
            try {
                await signInWithRedirect(auth, provider);
            } catch (redirectError) {
                console.error('Google redirect fallback error', redirectError);
                showAuthError(getFriendlyAuthError(redirectError));
                resetLoginButton();
            }
            return;
        }

        showAuthError(getFriendlyAuthError(error));
        resetLoginButton();
    }
};

const handleSignedInUser = (user) => {
    currentUser = user;

    const viewAuth = document.getElementById('view-auth');
    const mainApp = document.getElementById('main-app');

    viewAuth.classList.add('hidden');
    viewAuth.classList.remove('flex', 'active');

    mainApp.classList.remove('hidden');
    mainApp.classList.add('flex');

    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}`;
    document.getElementById('user-avatar').src = user.photoURL || fallbackAvatar;

    if (window.app && window.app.initAfterAuth) {
        window.app.initAfterAuth(user);
        window.app.switchTab('home');
    }
};

const handleSignedOutUser = () => {
    currentUser = null;

    const viewAuth = document.getElementById('view-auth');
    const mainApp = document.getElementById('main-app');

    viewAuth.classList.remove('hidden');
    viewAuth.classList.add('flex', 'active');

    mainApp.classList.add('hidden');
    mainApp.classList.remove('flex');
    resetLoginButton();
};

const initAuth = async () => {
    if (authInitialized) return;
    authInitialized = true;

    const loginBtn = document.getElementById('btn-login');
    loginBtn.innerHTML = loginButtonHtml;
    loginBtn.addEventListener('click', startGoogleLogin);

    try {
        await setPersistence(auth, browserLocalPersistence);
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
            clearAuthError();
        }
    } catch (error) {
        console.error('Google redirect sign-in error', error);
        showAuthError(getFriendlyAuthError(error));
        resetLoginButton();
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            clearAuthError();
            handleSignedInUser(user);
        } else {
            handleSignedOutUser();
        }
    }, (error) => {
        console.error('Auth state error', error);
        showAuthError(getFriendlyAuthError(error));
        resetLoginButton();
    });
};

const logout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error', error);
        showAuthError('Logout ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.');
    }
};

window.auth = { initAuth, logout, getCurrentUser: () => currentUser };

export { initAuth };
