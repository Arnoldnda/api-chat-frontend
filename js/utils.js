// Fonctions utilitaires

// Afficher un message d'erreur
function showError(message, elementId = 'error-message') {
    const errorDiv = $('#' + elementId);
    errorDiv.html(`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <span class="block sm:inline">${message}</span>
        </div>
    `).show();
    
    // Masquer après 5 secondes
    setTimeout(() => {
        errorDiv.fadeOut();
    }, 5000);
}

// Afficher un message de succès
function showSuccess(message, elementId = 'success-message') {
    const successDiv = $('#' + elementId);
    successDiv.html(`
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            <span class="block sm:inline">${message}</span>
        </div>
    `).show();
    
    // Masquer après 3 secondes
    setTimeout(() => {
        successDiv.fadeOut();
    }, 3000);
}

// Afficher/masquer le loader
function showLoader(show = true) {
    if (show) {
        $('#loader').removeClass('hidden').show();
    } else {
        $('#loader').addClass('hidden').hide();
    }
}

// Sauvegarder dans le localStorage
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Erreur lors de la sauvegarde:', e);
        return false;
    }
}

// Récupérer du localStorage
function getFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error('Erreur lors de la récupération:', e);
        return null;
    }
}

// Supprimer du localStorage
function removeFromStorage(key) {
    localStorage.removeItem(key);
}

// Vérifier si l'utilisateur est connecté
function isAuthenticated() {
    const user = getFromStorage(CONFIG.STORAGE_KEYS.USER);
    return user !== null;
}

// Obtenir l'utilisateur connecté
function getCurrentUser() {
    return getFromStorage(CONFIG.STORAGE_KEYS.USER);
}

// Déconnexion
function logout() {
    removeFromStorage(CONFIG.STORAGE_KEYS.USER);
    window.location.href = 'index.html';
}

// Faire une requête AJAX au format de votre API
function apiRequest(options) {
    // Ajouter le content-type
    if (!options.headers || !options.headers['Content-Type']) {
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/json';
    }
    
    return $.ajax(options);
}