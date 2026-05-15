import { auth, provider, signInWithRedirect, onAuthStateChanged, signOut } from './firebase-config.js';

let currentUser = null;

const initAuth = () => {
    const loginBtn = document.getElementById('btn-login');
    const authError = document.getElementById('auth-error');

    loginBtn.addEventListener('click', async () => {
        try {
            loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...';
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.error("Auth Error", error);
            authError.textContent = error.message;
            authError.classList.remove('hidden');
            loginBtn.innerHTML = '<img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-5 h-5"> Google വഴി ലോഗിൻ ചെയ്യുക';
        }
    });

    onAuthStateChanged(auth, (user) => {
        const viewAuth = document.getElementById('view-auth');
        const mainApp = document.getElementById('main-app');

        if (user) {
            currentUser = user;
            
            // പഴയ സ്ക്രീൻ പൂർണ്ണമായും മറയ്ക്കുന്നു (CSS Conflict Fix)
            viewAuth.classList.add('hidden');
            viewAuth.classList.remove('flex', 'active');
            
            // ആപ്പ് ഡാഷ്‌ബോർഡ് കാണിക്കുന്നു
            mainApp.classList.remove('hidden');
            mainApp.classList.add('flex');
            
            document.getElementById('user-avatar').src = user.photoURL || 'https://ui-avatars.com/api/?name=' + user.displayName;
            
            // Start app initialization after login
            if(window.app && window.app.initAfterAuth) {
                window.app.initAfterAuth(user);
                window.app.switchTab('home'); // ഹോം സ്ക്രീനിലേക്ക് നേരിട്ട് മാറ്റുന്നു
            }
        } else {
            currentUser = null;
            // ലോഗൗട്ട് ചെയ്യുമ്പോൾ വീണ്ടും ലോഗിൻ സ്ക്രീൻ കാണിക്കുന്നു
            viewAuth.classList.remove('hidden');
            viewAuth.classList.add('flex', 'active');
            
            mainApp.classList.add('hidden');
            mainApp.classList.remove('flex');
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