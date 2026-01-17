// Gestion des modals

// ==========================================
// MODAL NOUVEAU MESSAGE
// ==========================================

function showNewMessageModal() {
    // Créer l'overlay pour l'effet de profondeur
    const overlayHtml = `
        <div id="new-message-modal-overlay" class="fixed left-0 top-0 bottom-0 w-96 z-40" style="background-color: rgba(0, 0, 0, 0.3); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"></div>
    `;
    
    const modalHtml = `
        <div id="new-message-modal" class="fixed left-0 top-0 bottom-0 w-96 bg-gray-800 flex flex-col z-50 shadow-2xl" style="transform: translateX(0); transition: transform 0.3s ease-in-out;">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
                <div class="flex items-center">
                    <button id="close-new-message-modal" class="text-gray-400 hover:text-white mr-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h3 class="text-white font-semibold text-lg">Nouvelle discussion</h3>
                </div>
            </div>
                
                <!-- Recherche -->
                <div class="p-4 border-b border-gray-700">
                    <div class="relative">
                        <input 
                            type="text" 
                            id="search-users-modal"
                            placeholder="Rechercher un nom ou un numéro"
                            class="w-full bg-gray-700 text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        >
                        <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>
                
                <!-- Bouton Nouveau groupe -->
                <div class="p-4 border-b border-gray-700">
                    <button id="btn-new-group-from-modal" class="w-full flex items-center p-3 hover:bg-gray-700 rounded-lg transition">
                        <div class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center mr-3">
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                        </div>
                        <span class="text-white font-medium">Nouveau groupe</span>
                    </button>
                </div>
                
                <!-- Liste des utilisateurs -->
                <div class="flex-1 overflow-y-auto scrollbar-thin">
                    <div class="p-2">
                        <p class="text-gray-400 text-sm px-4 py-2">Contacts disponibles</p>
                        <div id="users-list-modal">
                            <!-- Les utilisateurs seront insérés ici -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(overlayHtml);
    $('body').append(modalHtml);
    
    // Charger la liste des utilisateurs
    loadUsersInModal();
    
    // Événements
    $('#close-new-message-modal').click(closeNewMessageModal);
    $('#new-message-modal-overlay').click(closeNewMessageModal);
    
    $('#search-users-modal').on('input', function() {
        filterUsersInModal($(this).val().toLowerCase());
    });
    
    $('#btn-new-group-from-modal').click(function() {
        closeNewMessageModal();
        showNewGroupModal();
    });
}

function loadUsersInModal() {
    const $list = $('#users-list-modal');
    $list.empty();
    showLoader(true);
    
    apiGetUsers()
        .done(function(response) {
            showLoader(false);
            
            if (response.hasError) {
                showError(response.status?.message || 'Erreur lors du chargement des utilisateurs');
                return;
            }
            
            if (!response.items || response.items.length === 0) {
                $list.append('<p class="text-gray-400 text-center p-4">Aucun utilisateur disponible</p>');
                return;
            }
            
            // Filtrer l'utilisateur connecté
            const otherUsers = response.items.filter(u => u.id !== currentUser.id);
            
            // Stocker les utilisateurs pour utilisation ultérieure
            USERS = response.items;
            
            if (otherUsers.length === 0) {
                $list.append('<p class="text-gray-400 text-center p-4">Aucun autre utilisateur disponible</p>');
                return;
            }
            
            otherUsers.forEach(user => {
                const userHtml = `
                    <div class="user-item-modal p-3 hover:bg-gray-700 rounded-lg cursor-pointer transition" data-user-id="${user.id}">
                        <div class="flex items-center">
                            <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                                <span class="text-white font-semibold">${(user.prenoms || '').charAt(0)}${(user.nom || '').charAt(0)}</span>
                            </div>
                            <div>
                                <p class="text-white font-medium">${user.prenoms || ''} ${user.nom || ''}</p>
                                <p class="text-gray-400 text-sm">@${user.login || ''}</p>
                            </div>
                        </div>
                    </div>
                `;
                
                $list.append(userHtml);
            });
            
            // Événement clic sur un utilisateur
            $('.user-item-modal').click(function() {
                const userId = parseInt($(this).data('user-id'));
                startPrivateConversation(userId);
            });
        })
        .fail(function(xhr, status, error) {
            showLoader(false);
            showError('Erreur lors du chargement des utilisateurs: ' + error);
            console.error('Erreur loadUsersInModal:', error);
        });
}

function filterUsersInModal(query) {
    $('.user-item-modal').each(function() {
        const text = $(this).text().toLowerCase();
        if (text.includes(query)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

function closeNewMessageModal() {
    $('#new-message-modal').remove();
    $('#new-message-modal-overlay').remove();
}

function startPrivateConversation(userId) {
    closeNewMessageModal();
    
    // Chercher si une conversation privée existe déjà
    // Vérifier d'abord avec participantIds si disponible, sinon avec participants
    const existingConv = CONVERSATIONS.find(c => {
        if (c.type !== 'private') return false;
        
        // Si participantIds est disponible (depuis l'API), l'utiliser
        if (c.participantIds && Array.isArray(c.participantIds) && c.participantIds.length > 0) {
            return c.participantIds.includes(currentUser.id) && c.participantIds.includes(userId);
        }
        
        // Sinon, utiliser participants si disponible
        if (c.participants && Array.isArray(c.participants) && c.participants.length > 0) {
            return c.participants.includes(currentUser.id) && c.participants.includes(userId);
        }
        
        return false;
    });
    
    if (existingConv) {
        // Conversation existe, on l'ouvre
        selectConversation(existingConv.id);
    } else {
        // Créer une conversation temporaire (elle sera créée au backend lors de l'envoi du 1er message)
        const otherUser = getUserById(userId);
        if (!otherUser) {
            showError('Utilisateur introuvable');
            return;
        }
        
        const newConv = {
            id: 'temp-' + Date.now(), // ID temporaire
            type: 'private',
            titre: `${otherUser.prenoms} ${otherUser.nom}`,
            participants: [currentUser.id, userId],
            lastMessage: '',
            lastMessageTime: 'Maintenant',
            lastMessageDate: new Date(),
            isTemporary: true, // Flag pour savoir que c'est temporaire
            tempReceiverId: userId // Stocker l'ID du destinataire pour l'envoi du premier message
        };
        
        // Ajouter à la liste des conversations
        CONVERSATIONS.unshift(newConv);
        
        // Initialiser les messages vides
        if (!MESSAGES) MESSAGES = {};
        MESSAGES[newConv.id] = [];
        
        // Ajouter la conversation temporaire à l'affichage sans recharger depuis l'API
        const $list = $('#conversations-list');
        const convHtml = createConversationItem(newConv);
        $list.prepend(convHtml);
        
        // Attacher les événements sur la nouvelle conversation
        $(`.conversation-item[data-id="${newConv.id}"]`).click(function(e) {
            if ($(e.target).closest('.export-conv-btn').length) {
                return;
            }
            selectConversation(newConv.id);
        });
        
        // Sélectionner la conversation
        selectConversation(newConv.id);
        
        // Pas de message de succès - la conversation n'est pas vraiment créée tant qu'un message n'est pas envoyé
    }
}

// ==========================================
// MODAL NOUVEAU GROUPE
// ==========================================

function showNewGroupModal() {
    // Créer l'overlay pour l'effet de profondeur
    const overlayHtml = `
        <div id="new-group-modal-overlay" class="fixed left-0 top-0 bottom-0 w-96 z-40" style="background-color: rgba(0, 0, 0, 0.3); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"></div>
    `;
    
    const modalHtml = `
        <div id="new-group-modal" class="fixed left-0 top-0 bottom-0 w-96 bg-gray-800 flex flex-col z-50 shadow-2xl" style="transform: translateX(0); transition: transform 0.3s ease-in-out;">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
                <div class="flex items-center">
                    <button id="close-new-group-modal" class="text-gray-400 hover:text-white mr-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h3 class="text-white font-semibold text-lg">Nouveau groupe</h3>
                </div>
            </div>
                
                <!-- Nom du groupe -->
                <div class="p-4 border-b border-gray-700">
                    <input 
                        type="text" 
                        id="group-name-input"
                        placeholder="Nom du groupe"
                        class="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        required
                    >
                </div>
                
                <!-- Compteur de sélection -->
                <div class="px-4 py-2 bg-gray-700">
                    <p class="text-gray-300 text-sm">
                        <span id="selected-count">0</span> membre(s) sélectionné(s)
                    </p>
                </div>
                
                <!-- Liste des utilisateurs avec checkbox -->
                <div class="flex-1 overflow-y-auto scrollbar-thin p-4">
                    <div id="group-users-list">
                        <!-- Les utilisateurs seront insérés ici -->
                    </div>
                </div>
                
                <!-- Footer avec boutons -->
                <div class="p-4 border-t border-gray-700 flex justify-end space-x-2">
                    <button id="cancel-group" class="px-4 py-2 text-gray-400 hover:text-white">
                        Annuler
                    </button>
                    <button id="create-group" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed" disabled>
                        Créer le groupe
                    </button>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(overlayHtml);
    $('body').append(modalHtml);
    
    // Charger la liste des utilisateurs
    loadUsersForGroup();
    
    // Événements
    $('#close-new-group-modal, #cancel-group').click(closeNewGroupModal);
    $('#new-group-modal-overlay').click(closeNewGroupModal);
    
    $('#group-name-input').on('input', checkGroupFormValidity);
    $('#create-group').click(createGroup);
}

function loadUsersForGroup() {
    const $list = $('#group-users-list');
    $list.empty();
    
    // Si USERS n'est pas encore chargé, le charger
    if (!USERS || USERS.length === 0) {
        apiGetUsers()
            .done(function(response) {
                if (!response.hasError && response.items) {
                    USERS = response.items;
                    renderUsersForGroup();
                }
            });
        return;
    }
    
    renderUsersForGroup();
}

function renderUsersForGroup() {
    const $list = $('#group-users-list');
    $list.empty();
    
    // Filtrer l'utilisateur connecté
    const otherUsers = USERS.filter(u => u.id !== currentUser.id);
    
    otherUsers.forEach(user => {
        const userHtml = `
            <label class="flex items-center p-3 hover:bg-gray-700 rounded-lg cursor-pointer transition">
                <input type="checkbox" class="group-user-checkbox w-5 h-5 text-green-600 bg-gray-600 border-gray-500 rounded focus:ring-green-600 mr-3" data-user-id="${user.id}">
                <div class="flex items-center flex-1">
                    <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                        <span class="text-white font-semibold text-sm">${(user.prenoms || '').charAt(0)}${(user.nom || '').charAt(0)}</span>
                    </div>
                    <div>
                        <p class="text-white font-medium">${user.prenoms || ''} ${user.nom || ''}</p>
                        <p class="text-gray-400 text-sm">@${user.login || ''}</p>
                    </div>
                </div>
            </label>
        `;
        
        $list.append(userHtml);
    });
    
    // Événement sur les checkbox
    $('.group-user-checkbox').change(checkGroupFormValidity);
}

function checkGroupFormValidity() {
    const groupName = $('#group-name-input').val().trim();
    const selectedUsers = $('.group-user-checkbox:checked').length;
    
    $('#selected-count').text(selectedUsers);
    
    // Activer le bouton si nom et au moins 1 utilisateur sélectionné
    if (groupName && selectedUsers > 0) {
        $('#create-group').prop('disabled', false);
    } else {
        $('#create-group').prop('disabled', true);
    }
}

function createGroup() {
    const groupName = $('#group-name-input').val().trim();
    const selectedUserIds = [];
    
    $('.group-user-checkbox:checked').each(function() {
        selectedUserIds.push(parseInt($(this).data('user-id')));
    });
    
    if (!groupName || selectedUserIds.length === 0) {
        showError('Veuillez remplir tous les champs');
        return;
    }
    
    showLoader(true);
    
    // Créer le groupe via l'API
    apiCreateGroup(groupName, selectedUserIds)
        .done(function(response) {
            showLoader(false);
            
            if (response.hasError) {
                showError(response.status?.message || 'Erreur lors de la création du groupe');
                return;
            }
            
            if (!response.items || response.items.length === 0) {
                showError('Aucune conversation créée');
                return;
            }
            
            // Mapper la conversation créée
            const apiConv = response.items[0];
            const newGroup = mapConversationFromApi(apiConv);
            
            // Ajouter à la liste
            CONVERSATIONS.unshift(newGroup);
            if (!MESSAGES) MESSAGES = {};
            MESSAGES[newGroup.id] = [];
            
            // Fermer le modal
            closeNewGroupModal();
            
            // Recharger et sélectionner
            loadConversations();
            selectConversation(newGroup.id);
            
            // Charger les participants du nouveau groupe
            loadConversationParticipants(newGroup.id);
            
            showSuccess(`Groupe "${groupName}" créé avec succès`);
        })
        .fail(function(xhr, status, error) {
            showLoader(false);
            showError('Erreur lors de la création du groupe: ' + error);
            console.error('Erreur createGroup:', error);
        });
}

function closeNewGroupModal() {
    $('#new-group-modal').remove();
    $('#new-group-modal-overlay').remove();
}

// ==========================================
// MODAL AJOUTER MEMBRE
// ==========================================

function showAddMemberModal(conversationId) {
    const conv = getConversationById(conversationId);
    if (!conv || conv.type !== 'group') return;
    
    const modalHtml = `
        <div id="add-member-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 class="text-white font-semibold text-lg">Ajouter un membre</h3>
                    <button id="close-add-member-modal" class="text-gray-400 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Recherche -->
                <div class="p-4 border-b border-gray-700">
                    <div class="relative">
                        <input 
                            type="text" 
                            id="search-add-member"
                            placeholder="Rechercher un utilisateur"
                            class="w-full bg-gray-700 text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        >
                        <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>
                
                <!-- Liste des utilisateurs -->
                <div class="flex-1 overflow-y-auto scrollbar-thin p-4">
                    <div id="add-member-list">
                        <!-- Les utilisateurs seront insérés ici -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(modalHtml);
    
    // Charger la liste
    loadUsersForAddMember(conversationId);
    
    // Événements
    $('#close-add-member-modal').click(closeAddMemberModal);
    $('#add-member-modal').click(function(e) {
        if (e.target.id === 'add-member-modal') {
            closeAddMemberModal();
        }
    });
    
    $('#search-add-member').on('input', function() {
        filterAddMemberList($(this).val().toLowerCase());
    });
}

function loadUsersForAddMember(conversationId) {
    const conv = getConversationById(conversationId);
    const $list = $('#add-member-list');
    $list.empty();
    
    // Utilisateurs pas encore dans le groupe (seulement exclure les membres actifs)
    // Les anciens membres peuvent être réajoutés
    const availableUsers = USERS.filter(u => !conv.participants.includes(u.id));
    
    if (availableUsers.length === 0) {
        $list.append('<p class="text-gray-400 text-center py-4">Tous les utilisateurs sont déjà membres</p>');
        return;
    }
    
    availableUsers.forEach(user => {
        const userHtml = `
            <div class="add-member-item p-3 hover:bg-gray-700 rounded-lg cursor-pointer transition flex items-center justify-between" data-user-id="${user.id}">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                        <span class="text-white font-semibold text-sm">${user.prenoms.charAt(0)}${user.nom.charAt(0)}</span>
                    </div>
                    <div>
                        <p class="text-white font-medium">${user.prenoms} ${user.nom}</p>
                        <p class="text-gray-400 text-sm">@${user.login}</p>
                    </div>
                </div>
                <button class="btn-add-this-member bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                    Ajouter
                </button>
            </div>
        `;
        
        $list.append(userHtml);
    });
    
    // Événement clic sur "Ajouter"
    $('.btn-add-this-member').click(function(e) {
        e.stopPropagation();
        const userId = parseInt($(this).closest('.add-member-item').data('user-id'));
        addMemberToGroup(conversationId, userId);
    });
}

function addMemberToGroup(conversationId, userId) {
    const conv = getConversationById(conversationId);
    const user = getUserById(userId);
    
    showLoader(true);
    
    apiAddMemberToGroup(conversationId, userId)
        .done(function(response) {
            showLoader(false);
            
            if (response.hasError) {
                showError(response.status?.message || 'Erreur lors de l\'ajout du membre');
                return;
            }
            
            closeAddMemberModal();
            
            // Recharger les participants depuis l'API
            loadConversationParticipants(conversationId, function() {
                // Recharger les infos si le panneau est ouvert
                if (!$('#conversation-info-panel').hasClass('hidden')) {
                    renderConversationInfo();
                }
                // Fermer et rouvrir le modal d'ajout de membre s'il est ouvert pour mettre à jour la liste
                if ($('#add-member-modal').length > 0) {
                    closeAddMemberModal();
                    setTimeout(() => {
                        showAddMemberModal(conversationId);
                    }, 100);
                }
            });
            
            showSuccess(`${user.prenoms} ${user.nom} ajouté au groupe`);
        })
        .fail(function(xhr, status, error) {
            showLoader(false);
            showError('Erreur lors de l\'ajout du membre: ' + error);
            console.error('Erreur addMemberToGroup:', error);
        });
}

function filterAddMemberList(query) {
    $('.add-member-item').each(function() {
        const text = $(this).text().toLowerCase();
        if (text.includes(query)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

function closeAddMemberModal() {
    $('#add-member-modal').remove();
}

// ==========================================
// MODAL DE CONFIRMATION
// ==========================================

/**
 * Affiche un popup de confirmation moderne
 * @param {string} title - Titre du popup
 * @param {string} message - Message de confirmation
 * @param {function} onConfirm - Callback appelé lors de la confirmation
 * @param {function} onCancel - Callback appelé lors de l'annulation (optionnel)
 * @param {string} confirmButtonText - Texte du bouton de confirmation (défaut: 'Confirmer')
 * @param {string} cancelButtonText - Texte du bouton d'annulation (défaut: 'Annuler')
 * @param {boolean} isDestructive - Si true, le bouton de confirmation sera rouge (défaut: false)
 */
function showConfirmModal(title, message, onConfirm, onCancel, confirmButtonText = 'Confirmer', cancelButtonText = 'Annuler', isDestructive = false) {
    const modalHtml = `
        <div id="confirm-modal" class="fixed inset-0 flex items-center justify-center z-50" style="background-color: rgba(0, 0, 0, 0.1); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);">
            <div class="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-2xl">
                <h3 class="text-white font-semibold text-lg mb-4">${title}</h3>
                <p class="text-gray-300 mb-6">${message}</p>
                <div class="flex justify-end space-x-3">
                    <button id="confirm-cancel-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
                        ${cancelButtonText}
                    </button>
                    <button id="confirm-ok-btn" class="px-4 py-2 ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition">
                        ${confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(modalHtml);
    
    $('#confirm-cancel-btn').click(function() {
        $('#confirm-modal').remove();
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
    });
    
    $('#confirm-ok-btn').click(function() {
        $('#confirm-modal').remove();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    // Fermer en cliquant sur le fond
    $('#confirm-modal').click(function(e) {
        if (e.target.id === 'confirm-modal') {
            $('#confirm-modal').remove();
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            }
        }
    });
}