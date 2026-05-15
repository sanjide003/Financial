import { auth, provider, signInWithRedirect, onAuthStateChanged, signOut } from './firebase-config.js';

let currentUser = null;

const initAuth = () => {
    const loginBtn = document.getElementById('btn-login');
    const authError = document.getElementById('auth-error');

    loginBtn.addEventListener('click', async () => {
        try {
            loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...';
            // മൊബൈൽ സപ്പോർട്ടിനായി Popup ന് പകരം Redirect ഉപയോഗിക്കുന്നു
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.error("Auth Error", error);
            authError.textContent = error.message;
            authError.classList.remove('hidden');
            loginBtn.innerHTML = '<img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5"> Google വഴി ലോഗിൻ ചെയ്യുക';
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('view-auth').classList.remove('active');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('user-avatar').src = user.photoURL || 'https://ui-avatars.com/api/?name=' + user.displayName;
            
            // Start app initialization after login
            if(window.app && window.app.initAfterAuth) {
                window.app.initAfterAuth(user);
            }
        } else {
            currentUser = null;
            document.getElementById('view-auth').classList.add('active');
            document.getElementById('main-app').classList.add('hidden');
        }
    });
}

const logout = async () => {
    if(confirm("Are you sure you want to logout?")) {
        await signOut(auth);
    }
}

// Attach to window for global access
window.auth = { initAuth, logout, getCurrentUser: () => currentUser };

export { initAuth };