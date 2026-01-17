// Gestion de l'authentification

$(document).ready(function() {
    // Vérifier si déjà connecté
    if (isAuthenticated()) {
        window.location.href = 'chat.html';
        return;
    }
    
    // Basculer entre login et inscription
    $('#show-register').click(function(e) {
        e.preventDefault();
        $('#login-form').hide();
        $('#register-form').show();
    });
    
    $('#show-login').click(function(e) {
        e.preventDefault();
        $('#register-form').hide();
        $('#login-form').show();
    });
    
    // Gérer la soumission du formulaire de connexion
    $('#login-form').submit(function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Gérer la soumission du formulaire d'inscription
    $('#register-form').submit(function(e) {
        e.preventDefault();
        handleRegister();
    });
});

// Fonction de connexion
function handleLogin() {
    const login = $('#login-username').val().trim();
    const password = $('#login-password').val();
    
    // Validation basique
    if (!login) {
        showError('Veuillez entrer votre identifiant', 'login-error');
        return;
    }
    
    
    // Afficher le loader
    showLoader();
    
    // Préparer les données au format de votre API
    const requestData = {
        datas: [
            {
                login: login
                // Ajoutez le password ici si nécessaire
                // password: password
            }
        ],
        user: CONFIG.SYSTEM_USER_ID,
        isSimpleLoading: true
    };
    
    // Appel API
    $.ajax({
        url: getApiUrl(CONFIG.ROUTES.LOGIN),
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: function(response) {
            showLoader(false);
            
            // Vérifier si la réponse contient une erreur
            if (response.hasError) {
                showError('Erreur lors de la connexion', 'login-error');
                return;
            }
            
            // Vérifier si on a bien un utilisateur dans items
            if (!response.items || response.items.length === 0) {
                showError('Identifiant incorrect', 'login-error');
                return;
            }
            
            // Récupérer les infos utilisateur
            const user = response.items[0];
            
            // Sauvegarder les infos utilisateur
            saveToStorage(CONFIG.STORAGE_KEYS.USER, user);
            
            // Afficher succès et rediriger
            showSuccess('Connexion réussie ! Redirection...', 'login-success');
            
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        },
        error: function(xhr) {
            showLoader(false);
            
            let errorMessage = 'Erreur de connexion';
            
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage = xhr.responseJSON.message;
            } else if (xhr.status === 0) {
                errorMessage = 'Impossible de contacter le serveur. Vérifiez que votre API est démarrée.';
            } else if (xhr.status === 404) {
                errorMessage = 'Route API non trouvée';
            } else if (xhr.status === 500) {
                errorMessage = 'Erreur serveur';
            }
            
            showError(errorMessage, 'login-error');
            console.error('Erreur complète:', xhr);
        }
    });
}

// Fonction d'inscription
function handleRegister() {
    const nom = $('#register-nom').val().trim();
    const prenoms = $('#register-prenoms').val().trim();
    const login = $('#register-login').val().trim();
    
    
    // Validation
    if (!nom || !prenoms || !login) {
        showError('Veuillez remplir tous les champs obligatoires', 'register-error');
        return;
    }
    
    
    // Afficher le loader
    showLoader();
    
    // Préparer les données au format de votre API
    const requestData = {
        datas: [
            {
                nom: nom,
                prenoms: prenoms,
                login: login
            }
        ],
        user: CONFIG.SYSTEM_USER_ID,
        isSimpleLoading: true
    };
    
    // Appel API
    $.ajax({
        url: getApiUrl(CONFIG.ROUTES.REGISTER),
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: function(response) {
            showLoader(false);
            
            // Vérifier si la réponse contient une erreur
            if (response.hasError) {
                showError('Erreur lors de l\'inscription', 'register-error');
                return;
            }
            
            // Vérifier si on a bien un utilisateur dans items
            if (!response.items || response.items.length === 0) {
                showError('Erreur lors de la création du compte', 'register-error');
                return;
            }
            
            // Récupérer les infos utilisateur créé
            const user = response.items[0];
            
            // Sauvegarder les infos utilisateur
            saveToStorage(CONFIG.STORAGE_KEYS.USER, user);
            
            // Afficher succès et rediriger
            showSuccess('Inscription réussie ! Redirection...', 'register-success');
            
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        },
        error: function(xhr) {
            showLoader(false);
            
            let errorMessage = 'Erreur lors de l\'inscription';
            
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage = xhr.responseJSON.message;
            } else if (xhr.status === 0) {
                errorMessage = 'Impossible de contacter le serveur. Vérifiez que votre API est démarrée.';
            } else if (xhr.status === 409 || xhr.status === 422) {
                errorMessage = 'Cet identifiant est déjà utilisé';
            } else if (xhr.status === 404) {
                errorMessage = 'Route API non trouvée';
            } else if (xhr.status === 500) {
                errorMessage = 'Erreur serveur';
            }
            
            showError(errorMessage, 'register-error');
            console.error('Erreur complète:', xhr);
        }
    });
}