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
    
    // Ajouter les headers par défaut pour le backend
    if (!options.headers['lang']) {
        options.headers['lang'] = 'fr';
    }
    
    return $.ajax(options);
}

/**
 * Formater une date pour l'affichage (format court pour liste de conversations)
 * @param {Date|string} dateValue - La date à formater
 * @param {Object} options - Options de formatage (long: boolean)
 * @returns {string} - La date formatée
 */
function formatTime(dateValue, options = {}) {
    if (!dateValue) return "";

    let date;

    // Si c'est déjà un Date
    if (dateValue instanceof Date) {
        date = dateValue;
    } 
    // Si c'est une string, utiliser parseDateFromApi si disponible
    else if (typeof dateValue === "string") {
        if (typeof parseDateFromApi === 'function') {
            date = parseDateFromApi(dateValue);
        } else {
            // Fallback: Format: YYYY-MM-DD HH:mm:ss.S
            if (dateValue.includes("-")) {
                date = new Date(dateValue.replace(" ", "T"));
            }
            // Format: DD/MM/YYYY
            else if (dateValue.includes("/")) {
                const [day, month, year] = dateValue.split("/");
                date = new Date(`${year}-${month}-${day}`);
            }
        }
    }

    if (!date || isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);

    // Format long pour affichage détaillé
    if (options.long) {
        if (days === 0) {
            return date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        } else if (days === 1) {
            return "Hier " + date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        } else if (days < 7) {
            const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
            const dayName = dayNames[date.getDay()];
            return dayName + " " + date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        } else {
            const currentYear = now.getFullYear();
            const dateYear = date.getFullYear();
            if (dateYear === currentYear) {
                return date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit"
                }) + " " + date.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
            } else {
                return date.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }) + " " + date.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
            }
        }
    }

    // Format court (par défaut pour liste de conversations)
    if (days > 0) {
        if (days === 1) return "Hier";
        if (days < 7) return `${days}j`;
        return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit"
        });
    }

    return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

/**
 * Formater une date pour l'affichage des messages (style WhatsApp)
 * @param {Date|string} dateValue - La date à formater
 * @param {boolean} hasDaySeparator - Si true, n'affiche que l'heure (séparateur de jour déjà affiché)
 * @returns {string} - La date formatée style WhatsApp
 */
function formatMessageTime(dateValue, hasDaySeparator = false) {
    if (!dateValue) return "";

    let date;

    // Si c'est déjà un Date
    if (dateValue instanceof Date) {
        date = dateValue;
    } 
    // Si c'est une string, utiliser parseDateFromApi si disponible
    else if (typeof dateValue === "string") {
        if (typeof parseDateFromApi === 'function') {
            date = parseDateFromApi(dateValue);
        } else {
            // Fallback
            if (dateValue.includes("-")) {
                date = new Date(dateValue.replace(" ", "T"));
            } else if (dateValue.includes("/")) {
                const [day, month, year] = dateValue.split("/");
                date = new Date(`${year}-${month}-${day}`);
            }
        }
    }

    if (!date || isNaN(date.getTime())) return "";

    const timeStr = date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);

    // Si un séparateur de jour est déjà affiché, toujours afficher juste l'heure
    if (hasDaySeparator) {
        return timeStr;
    }

    // Aujourd'hui : juste l'heure
    if (days === 0) {
        return timeStr;
    }
    
    // Hier : "Hier 14:30"
    if (days === 1) {
        return "Hier " + timeStr;
    }
    
    // Cette semaine : "Lun 14:30", "Mar 14:30", etc.
    if (days < 7) {
        const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        const dayName = dayNames[date.getDay()];
        return dayName + " " + timeStr;
    }
    
    // Dates éloignées (plus de 7 jours) : "07/01/2026 14:30"
    const currentYear = now.getFullYear();
    const dateYear = date.getFullYear();
    if (dateYear === currentYear) {
        // Cette année : "07/01 14:30"
        return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit"
        }) + " " + timeStr;
    }
    
    // Autre année : "07/01/2026 14:30"
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }) + " " + timeStr;
}

/**
 * Détermine la taille de l'écran (mobile, tablette, desktop)
 * @returns {string} - 'mobile', 'tablet', ou 'desktop'
 */
function getScreenSize() {
    const width = window.innerWidth || document.documentElement.clientWidth;
    if (width < 768) {
        return 'mobile';
    } else if (width < 1024) {
        return 'tablet';
    } else {
        return 'desktop';
    }
}