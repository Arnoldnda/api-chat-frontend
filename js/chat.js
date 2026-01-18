// Logique de la page chat

let currentConversation = null;
let currentUser = null;
let conversationFilter = 'all'; // 'all' ou 'groups'
// Cache pour stocker les titres personnalisés des conversations privées
let privateConversationTitles = {}; // { conversationId: "Titre personnalisé" }

// Cache local des données (remplace mock-data.js)
let CONVERSATIONS = []; // Cache des conversations
let MESSAGES = {}; // Cache des messages par conversationId { conversationId: [messages] }
let USERS = []; // Cache des utilisateurs

// Fonctions de remplacement pour mock-data.js (basées sur l'API)

/**
 * Récupère un utilisateur par son ID depuis le cache local
 * Note: Les utilisateurs doivent être chargés au préalable via apiGetUsers()
 */
function getUserById(userId) {
    // Chercher dans le cache local
    return USERS.find(u => u.id === userId) || null;
}

/**
 * Récupère une conversation par son ID depuis le cache local
 */
function getConversationById(convId) {
    return CONVERSATIONS.find(c => c.id === convId) || null;
}

/**
 * Récupère les groupes en commun entre deux utilisateurs
 * @param {number} userId1 - ID du premier utilisateur
 * @param {number} userId2 - ID du deuxième utilisateur
 * @returns {Array} Liste des groupes en commun
 */
function getCommonGroups(userId1, userId2) {
    return CONVERSATIONS.filter(conv => {
        // Seulement les groupes
        if (conv.type !== 'group') return false;
        
        // Vérifier si les deux utilisateurs sont membres
        const participants = conv.participants || [];
        const participantIds = conv.participantIds || [];
        
        const user1IsMember = participants.includes(userId1) || participantIds.includes(userId1);
        const user2IsMember = participants.includes(userId2) || participantIds.includes(userId2);
        
        return user1IsMember && user2IsMember;
    });
}

/**
 * Récupère les messages d'une conversation depuis le cache local
 */
function getMessagesByConversation(convId) {
    return MESSAGES[convId] || [];
}

/**
 * Vérifie si un utilisateur est admin d'une conversation
 */
function isUserAdmin(conversationId, userId) {
    const conv = getConversationById(conversationId);
    if (!conv || !conv.admins) {
        return false;
    }
    return conv.admins.includes(userId);
}

/**
 * Récupère les participants d'une conversation depuis l'API
 */
function getConversationParticipants(conversationId) {
    const conv = getConversationById(conversationId);
    if (!conv || !conv.participants) {
        return [];
    }
    // Retourner les participants depuis le cache de la conversation
    // Les participants sont déjà chargés via loadConversationParticipants()
    return conv.participants.map(uid => getUserById(uid)).filter(u => u);
}

$(document).ready(function() {
    // Vérifier si l'utilisateur est connecté
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    // Récupérer l'utilisateur connecté
    currentUser = getCurrentUser();
    
    // Initialiser l'interface
    initializeChat();
    
    // Charger les conversations
    loadConversations();
    
    // Événements
    setupEventListeners();
});

function initializeChat() {

    $('#chat-zone').addClass('hidden');
    $('#empty-state').removeClass('hidden');

    // Afficher les infos de l'utilisateur connecté
    $('#user-name').text(currentUser.prenoms + ' ' + currentUser.nom);
    $('#user-login').text('@' + currentUser.login);
}

function setupEventListeners() {
    // Filtres de conversation
    $('#filter-all').click(function() {
        conversationFilter = 'all';
        $(this).addClass('bg-gray-700').removeClass('bg-transparent');
        $('#filter-groups').removeClass('bg-gray-700').addClass('bg-transparent');
        loadConversations();
    });
    
    $('#filter-groups').click(function() {
        conversationFilter = 'groups';
        $(this).addClass('bg-gray-700').removeClass('bg-transparent');
        $('#filter-all').removeClass('bg-gray-700').addClass('bg-transparent');
        loadConversations();
    });
    
    // Nouveau message
    $('#btn-new-message').click(function() {
        showNewMessageModal();
    });
    
    // Recherche
    $('#search-conversations').on('input', function() {
        const query = $(this).val().toLowerCase();
        filterConversations(query);
    });
    
    // Menu utilisateur
    $('#btn-user-menu').click(function(e) {
        e.stopPropagation();
        $('#user-menu').toggle();
    });
    
    // Fermer le menu si on clique ailleurs
    $(document).click(function() {
        $('#user-menu').hide();
    });
    
    // Déconnexion
    $('#btn-logout').click(function() {
        logout();
    });
    
    // Export global
    $('#btn-export-all').click(function() {
        exportAllConversations();
    });
    
    // Envoyer un message
    $('#message-form').submit(function(e) {
        e.preventDefault();
        sendMessage();
    });
    
    // Envoyer un message avec la touche Entrée (Shift+Entrée pour nouvelle ligne)
    // Fonctionne pour : texte seul, image seule, ou texte + image ensemble
    $('#message-input').on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // sendMessage() gère automatiquement texte seul, image seule, ou les deux ensemble
            sendMessage();
        }
        // Shift+Entrée crée une nouvelle ligne (comportement par défaut du textarea)
    });
    
    // Upload d'image
    $('#btn-upload-image').click(function() {
        $('#image-input').click();
    });
    
    $('#image-input').change(function(e) {
        handleImageUpload(e.target.files[0]);
    });
    
    // Infos du groupe/conversation
    // Tout le header est cliquable pour ouvrir les infos
    $('#conversation-header').click(function() {
        if (currentConversation) {
            toggleConversationInfo();
        }
    });
    
    // Fermer le panneau info
    $('#btn-close-info').click(function() {
        $('#conversation-info-panel').addClass('hidden');
    });
    
    // Bouton quitter/supprimer conversation
    $('#btn-leave-conversation').click(function() {
        if (currentConversation) {
            if (currentConversation.type === 'group') {
                const userHasLeft = currentConversation.userHasLeft === true;
                
                if (userHasLeft) {
                    // L'utilisateur a déjà quitté, proposer de supprimer
                    deleteConversation(currentConversation.id);
                } else {
                    // L'utilisateur n'a pas encore quitté, proposer de quitter
                    showConfirmModal(
                        'Quitter le groupe',
                        'Êtes-vous sûr de vouloir quitter ce groupe ?',
                        function() {
                            showLoader(true);
                            
                            apiLeaveGroup(currentConversation.id)
                                .done(function(response) {
                                    showLoader(false);
                                    
                                    if (response.hasError) {
                                        showError(response.status?.message || 'Erreur lors de la sortie du groupe');
                                        return;
                                    }
                                    
                                    // Mettre à jour userHasLeft dans la conversation
                                    currentConversation.userHasLeft = true;
                                    
                                    // Mettre à jour le bouton pour afficher "Supprimer la conversation"
                                    $('#leave-btn-text').text('Supprimer la conversation');
                                    
                                    // Mettre à jour l'affichage de la zone d'envoi
                                    updateMessageInputVisibility();
                                    
                                    // Fermer le panneau et revenir à la liste
                                    $('#conversation-info-panel').addClass('hidden');
                                    currentConversation = null;
                                    $('#empty-state').removeClass('hidden');
                                    $('#chat-zone').addClass('hidden');
                                    
                                    // Recharger les conversations
                                    loadConversations();
                                    showSuccess('Vous avez quitté le groupe');
                                })
                                .fail(function(xhr, status, error) {
                                    showLoader(false);
                                    showError('Erreur lors de la sortie du groupe: ' + error);
                                    console.error('Erreur leaveGroup:', error);
                                });
                        },
                        null,
                        'Quitter',
                        'Annuler',
                        true
                    );
                }
            } else {
                // Pour les conversations privées, supprimer la conversation
                deleteConversation(currentConversation.id);
                $('#conversation-info-panel').addClass('hidden');
            }
        }
    });
}

let isLoadingConversations = false;

function loadConversations() {
    // Éviter les appels multiples simultanés
    if (isLoadingConversations) {
        return;
    }
    isLoadingConversations = true;
    const $list = $('#conversations-list');
    $list.empty();
    showLoader(true);
    
    apiGetConversations()
        .done(function(response) {
            showLoader(false);
            isLoadingConversations = false;
            
            if (response.hasError) {
                const errorMsg = response.status?.message || response.status?.code || 'Erreur lors du chargement des conversations';
                showError(errorMsg);
                return;
            }
            
            if (!response.items || response.items.length === 0) {
                // Aucune conversation
                CONVERSATIONS = [];
                return;
            }
            
            // Mapper les données API vers le format frontend
            let conversations;
            try {
                conversations = response.items.map(mapConversationFromApi);
            } catch (error) {
                console.error('Erreur lors du mapping des conversations:', error);
                showError('Erreur lors du traitement des données');
                return;
            }
            
            // Préserver les titres mis à jour et les participants/admins des conversations existantes
            conversations = conversations.map(newConv => {
                const existingConv = CONVERSATIONS.find(c => c.id === newConv.id);
                
                // Pour les conversations privées, vérifier d'abord le cache, puis CONVERSATIONS
                if (newConv.type === 'private') {
                    const cachedTitle = privateConversationTitles[newConv.id];
                    if (cachedTitle && cachedTitle !== 'PRIVATE' && cachedTitle !== 'Conversation privée') {
                        newConv.titre = cachedTitle;
                    } else if (existingConv && existingConv.titre && existingConv.titre !== 'PRIVATE' && existingConv.titre !== 'Conversation privée') {
                        newConv.titre = existingConv.titre;
                        // Mettre à jour le cache
                        privateConversationTitles[newConv.id] = existingConv.titre;
                    }
                }
                
                if (existingConv) {
                    // Préserver les participants et admins si déjà chargés
                    if (existingConv.participants && existingConv.participants.length > 0) {
                        newConv.participants = existingConv.participants;
                    }
                    if (existingConv.admins && existingConv.admins.length > 0) {
                        newConv.admins = existingConv.admins;
                    }
                    // Préserver userHasLeft si déjà chargé
                    if (existingConv.hasOwnProperty('userHasLeft')) {
                        newConv.userHasLeft = existingConv.userHasLeft;
                    }
                    // Préserver les anciens membres si déjà chargés
                    if (existingConv.formerMembers && existingConv.formerMembers.length > 0) {
                        newConv.formerMembers = existingConv.formerMembers;
                    }
                    // Préserver participantIds si disponible (mais utiliser celui de l'API s'il est plus récent)
                    if (!newConv.participantIds || newConv.participantIds.length === 0) {
                        if (existingConv.participantIds && existingConv.participantIds.length > 0) {
                            newConv.participantIds = existingConv.participantIds;
                        }
                    }
                    // Préserver createdAt et createdBy si déjà chargés
                    if (existingConv.createdAt) {
                        newConv.createdAt = existingConv.createdAt;
                    }
                    if (existingConv.createdBy) {
                        newConv.createdBy = existingConv.createdBy;
                    }
                }
                return newConv;
            });
            
            // Pour les conversations privées avec participantIds, mettre à jour automatiquement les titres
            // Cette logique se fait AVANT le filtrage et le tri pour que les titres soient corrects dès l'affichage
            const currentUser = getCurrentUser();
            const userIdsToLoad = new Set();
            
            // Première passe : mettre à jour les titres pour les utilisateurs déjà en cache
            conversations.forEach(conv => {
                if (conv.type === 'private' && conv.participantIds && conv.participantIds.length > 0) {
                    const otherParticipantId = conv.participantIds.find(id => id !== currentUser.id);
                    if (otherParticipantId) {
                        // Vérifier si l'utilisateur est déjà dans le cache
                        const otherUser = getUserById(otherParticipantId);
                        if (otherUser && otherUser.nom && otherUser.prenoms) {
                            // Mettre à jour le titre immédiatement
                            const newTitle = `${otherUser.prenoms} ${otherUser.nom}`;
                            // Mettre à jour si le titre est générique (PRIVATE ou Conversation privée)
                            if (conv.titre === 'PRIVATE' || conv.titre === 'Conversation privée' || !conv.titre || conv.titre.trim() === '') {
                                conv.titre = newTitle;
                                privateConversationTitles[conv.id] = newTitle;
                            }
                        } else {
                            // Ajouter à la liste des utilisateurs à charger
                            userIdsToLoad.add(otherParticipantId);
                        }
                    }
                }
            });
            
            // Filtrer les conversations
            if (conversationFilter === 'groups') {
                conversations = conversations.filter(c => c.type === 'group');
            }
            
            // Récupérer les conversations temporaires existantes qui ont des messages
            const existingTempConversations = CONVERSATIONS.filter(conv => {
                if (conv.isTemporary) {
                    const messages = MESSAGES[conv.id] || [];
                    return messages.length > 0;
                }
                return false;
            });
            
            // Ajouter les conversations temporaires avec messages à la liste
            existingTempConversations.forEach(tempConv => {
                // Vérifier qu'elle n'est pas déjà dans la liste (au cas où elle serait devenue réelle)
                const alreadyExists = conversations.find(c => c.id === tempConv.id);
                if (!alreadyExists) {
                    conversations.push(tempConv);
                }
            });
            
            // Supprimer du DOM les conversations temporaires sans messages
            CONVERSATIONS.forEach(conv => {
                if (conv.isTemporary) {
                    const messages = MESSAGES[conv.id] || [];
                    if (messages.length === 0) {
                        // Retirer du DOM si présent
                        $(`.conversation-item[data-id="${conv.id}"]`).remove();
                    }
                }
            });
            
            // Trier par date du dernier message
            conversations.sort((a, b) => {
                const dateA = a.lastMessageDate ? new Date(a.lastMessageDate) : new Date(0);
                const dateB = b.lastMessageDate ? new Date(b.lastMessageDate) : new Date(0);
                return dateB - dateA;
            });
            
            // Stocker les conversations pour utilisation ultérieure
            CONVERSATIONS = conversations;
            isLoadingConversations = false;
            
            conversations.forEach(conv => {
                const convHtml = createConversationItem(conv);
                $list.append(convHtml);
            });
            
            // Charger les derniers messages visibles pour chaque conversation
            const lastMessagePromises = CONVERSATIONS.map(conv => {
                return apiGetLastVisibleMessage(conv.id)
                    .done(function(response) {
                        if (!response.hasError && response.items && response.items.length > 0) {
                            // Filtrer les messages pour trouver le dernier avec isHiden: false
                            const visibleMessages = response.items.filter(msg => !msg.isHiden);
                            
                            if (visibleMessages.length > 0) {
                                // Prendre le premier message (les messages sont déjà triés par date décroissante)
                                const lastMsg = visibleMessages[0];
                                conv.lastMessage = lastMsg.content || '';
                                conv.lastMessageImgUrl = lastMsg.imgUrl || null;
                                
                                // Déterminer le type de message
                                if (lastMsg.typeMessageCode) {
                                    if (lastMsg.typeMessageCode === 'IMAGE') {
                                        conv.lastMessageType = 'image';
                                    } else if (lastMsg.typeMessageCode === 'MIXED') {
                                        conv.lastMessageType = 'mixed';
                                    } else {
                                        conv.lastMessageType = 'text';
                                    }
                                } else if (conv.lastMessageImgUrl && !conv.lastMessage) {
                                    // Si on a une image mais pas de texte, c'est une image
                                    conv.lastMessageType = 'image';
                                } else {
                                    conv.lastMessageType = 'text';
                                }
                                
                                // Parser la date avec l'heure complète
                                if (lastMsg.createdAt) {
                                    conv.lastMessageDate = parseDateFromApi(lastMsg.createdAt);
                                    if (conv.lastMessageDate) {
                                        conv.lastMessageTime = formatTime(conv.lastMessageDate);
                                        
                                        // Mettre à jour l'affichage dans la liste
                                        const $convItem = $(`.conversation-item[data-id="${conv.id}"]`);
                                        if ($convItem.length) {
                                            // Mettre à jour l'heure
                                            const $timeSpan = $convItem.find('.conversation-time');
                                            if ($timeSpan.length) {
                                                $timeSpan.text(conv.lastMessageTime);
                                            }
                                            
                                            // Mettre à jour le dernier message (texte ou "Image")
                                            const $lastMsgContainer = $convItem.find('.flex-1.min-w-0').children().last();
                                            if ($lastMsgContainer.length) {
                                                if (conv.lastMessageType === 'image' || (conv.lastMessageType === 'mixed' && !conv.lastMessage)) {
                                                    $lastMsgContainer.replaceWith(`
                                                        <span class="flex items-center text-sm text-gray-400">
                                                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                            </svg>
                                                            Image
                                                        </span>
                                                    `);
                                                } else {
                                                    $lastMsgContainer.replaceWith(`<p class="text-sm text-gray-400 truncate">${conv.lastMessage || ''}</p>`);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    })
                    .fail(function() {
                        // En cas d'erreur, on continue sans mettre à jour l'heure
                        console.error('Erreur lors du chargement du dernier message pour la conversation', conv.id);
                    });
            });
            
            // Attendre que tous les derniers messages soient chargés
            $.when.apply($, lastMessagePromises).done(function() {
                // Tous les derniers messages ont été chargés
            });
            
            // Charger les utilisateurs manquants en arrière-plan pour mettre à jour les titres
            if (userIdsToLoad.size > 0) {
                // Charger tous les utilisateurs pour avoir les infos nécessaires
                apiGetUsers()
                    .done(function(response) {
                        if (!response.hasError && response.items) {
                            // Mettre à jour le cache USERS
                            response.items.forEach(user => {
                                const existingUserIndex = USERS.findIndex(u => u.id === user.id);
                                if (existingUserIndex >= 0) {
                                    USERS[existingUserIndex] = user;
                                } else {
                                    USERS.push(user);
                                }
                            });
                            
                            // Maintenant mettre à jour les titres des conversations privées
                            CONVERSATIONS.forEach(conv => {
                                if (conv.type === 'private' && conv.participantIds && conv.participantIds.length > 0) {
                                    const otherParticipantId = conv.participantIds.find(id => id !== currentUser.id);
                                    if (otherParticipantId) {
                                        const otherUser = getUserById(otherParticipantId);
                                        if (otherUser && otherUser.nom && otherUser.prenoms) {
                                            const newTitle = `${otherUser.prenoms} ${otherUser.nom}`;
                                            // Mettre à jour si le titre est générique (PRIVATE ou Conversation privée)
                                            if (conv.titre === 'PRIVATE' || conv.titre === 'Conversation privée' || !conv.titre || conv.titre.trim() === '') {
                                                conv.titre = newTitle;
                                                privateConversationTitles[conv.id] = newTitle;
                                                
                                                // Mettre à jour l'affichage dans la liste
                                                const $convItem = $(`.conversation-item[data-id="${conv.id}"] h3`);
                                                if ($convItem.length) {
                                                    $convItem.text(newTitle);
                                                }
                                                
                                                // Mettre à jour le header si c'est la conversation courante
                                                if (currentConversation && currentConversation.id === conv.id) {
                                                    updateChatHeader();
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    })
                    .fail(function() {
                        // En cas d'erreur, on continue sans mettre à jour les titres
                        console.error('Erreur lors du chargement des utilisateurs pour les titres');
                    });
            }
            
            // Événements sur les conversations
            $('.conversation-item').click(function(e) {
                // Ne pas déclencher si on clique sur le bouton export
                if ($(e.target).closest('.export-conv-btn').length) {
                    return;
                }
                const convId = parseInt($(this).data('id'));
                selectConversation(convId);
            });
            
            // Événement sur le bouton trois points
            $('.three-dots-conv-btn').click(function(e) {
                e.stopPropagation();
                const convId = parseInt($(this).data('conv-id'));
                const convType = $(this).data('conv-type');
                showConversationMenu(e, convId, convType, $(this));
            });
        })
        .fail(function(xhr, status, error) {
            isLoadingConversations = false;
            showLoader(false);
            let errorMessage = 'Erreur lors du chargement des conversations';
            if (xhr.status === 0) {
                errorMessage = 'Impossible de contacter le serveur. Vérifiez que votre API est démarrée.';
            } else if (xhr.responseJSON && xhr.responseJSON.status && xhr.responseJSON.status.message) {
                errorMessage = xhr.responseJSON.status.message;
            } else if (error) {
                errorMessage += ': ' + error;
            }
            showError(errorMessage);
            console.error('Erreur loadConversations:', xhr, status, error);
        });
}

/**
 * Mappe une conversation de l'API vers le format frontend
 */
function mapConversationFromApi(apiConv) {
    const currentUser = getCurrentUser();
    
    // Déterminer le type
    const type = apiConv.typeConversationCode === 'GROUP' ? 'group' : 'private';
    
    // Utiliser lastMessage de l'API comme valeur initiale (sera complété avec l'heure via l'appel séparé)
    let lastMessage = '';
    let lastMessageDate = null;
    let lastMessageTime = '';
    let lastMessageType = null; // 'text', 'image', 'mixed'
    let lastMessageImgUrl = null;
    
    // Le backend peut retourner LastMessage (avec majuscule) ou lastMessage
    const lastMsg = apiConv.lastMessage || apiConv.LastMessage;
    if (lastMsg) {
        lastMessage = lastMsg.content || '';
        lastMessageImgUrl = lastMsg.imgUrl || null;
        
        // Déterminer le type de message
        if (lastMsg.typeMessageCode) {
            if (lastMsg.typeMessageCode === 'IMAGE') {
                lastMessageType = 'image';
            } else if (lastMsg.typeMessageCode === 'MIXED') {
                lastMessageType = 'mixed';
            } else {
                lastMessageType = 'text';
            }
        } else if (lastMessageImgUrl && !lastMessage) {
            // Si on a une image mais pas de texte, c'est une image
            lastMessageType = 'image';
        } else {
            lastMessageType = 'text';
        }
        
        // Note: la date du lastMessage de l'API n'a pas l'heure (format "dd/MM/yyyy")
        // On l'utilise comme fallback, mais l'heure sera mise à jour via apiGetLastVisibleMessage
        if (lastMsg.createdAt) {
            lastMessageDate = parseDateFromApi(lastMsg.createdAt);
            if (lastMessageDate) {
                lastMessageTime = formatTime(lastMessageDate);
            }
        }
    }
    
    // Pour les conversations privées, déterminer le titre (nom de l'autre participant)
    let titre = apiConv.titre;
    if (type === 'private' && apiConv.titre === 'PRIVATE') {
        // Le titre sera mis à jour quand on chargera les participants
        titre = 'Conversation privée';
    }
    
    // Parser la date de création
    let createdAt = null;
    if (apiConv.createdAt) {
        createdAt = parseDateFromApi(apiConv.createdAt);
    }
    
    const mappedConv = {
        id: apiConv.id,
        type: type,
        titre: titre,
        participants: [], // Sera chargé séparément si nécessaire
        participantIds: apiConv.participantIds || [], // Stocker participantIds de l'API
        admins: [], // Sera chargé séparément si nécessaire
        lastMessage: lastMessage,
        lastMessageTime: lastMessageTime,
        lastMessageDate: lastMessageDate,
        lastMessageType: lastMessageType,
        lastMessageImgUrl: lastMessageImgUrl,
        createdAt: createdAt,
        createdBy: apiConv.createdBy || null,
        avatar: null
    };
    return mappedConv;
}

function createConversationItem(conv) {
    // Adapter l'affichage de l'heure selon la résolution
    const screenSize = typeof getScreenSize === 'function' ? getScreenSize() : 'desktop';
    let timeDisplay = '';
    
    if (conv.lastMessageDate) {
        // Utiliser formatTime avec options selon la résolution
        if (screenSize === 'mobile') {
            // Format court pour mobile
            timeDisplay = formatTime(conv.lastMessageDate);
        } else {
            // Format court pour tablette et desktop (peut être amélioré si nécessaire)
            timeDisplay = formatTime(conv.lastMessageDate);
        }
    } else if (conv.lastMessageTime) {
        timeDisplay = conv.lastMessageTime;
    }
    
    // Déterminer l'affichage du dernier message
    let lastMessageDisplay = '';
    if (conv.lastMessageType === 'image' || (conv.lastMessageType === 'mixed' && !conv.lastMessage)) {
        // Afficher "Image" avec une icône si c'est une image (ou mixed sans texte)
        lastMessageDisplay = `
            <span class="flex items-center text-sm text-gray-400">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Image
            </span>
        `;
    } else {
        // Afficher le texte du message
        lastMessageDisplay = `<p class="text-sm text-gray-400 truncate">${conv.lastMessage || ''}</p>`;
    }
    
    const icon = conv.type === 'group' 
        ? '<path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>'
        : '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>';
    
    return `
        <div class="conversation-item group p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 transition relative" data-id="${conv.id}">
            <div class="flex items-start">
                <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center mr-3 flex-shrink-0">
                    <svg class="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        ${icon}
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <h3 class="font-semibold text-white truncate">${conv.titre}</h3>
                        <div class="flex flex-col items-end">
                            <span class="conversation-time text-xs text-gray-400">${timeDisplay}</span>
                            <!-- Flèche vers le bas (visible au survol) -->
                            <button class="three-dots-conv-btn mt-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity" data-conv-id="${conv.id}" data-conv-type="${conv.type}" title="Options">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${lastMessageDisplay}
                </div>
            </div>
        </div>
    `;
}

function selectConversation(convId) {
    // Vérifier si on quitte une conversation temporaire sans messages
    if (currentConversation && currentConversation.isTemporary) {
        const tempConvId = currentConversation.id;
        const tempMessages = MESSAGES[tempConvId] || [];
        
        // Si la conversation temporaire n'a pas de messages, la supprimer
        if (tempMessages.length === 0) {
            // Retirer de la liste
            CONVERSATIONS = CONVERSATIONS.filter(c => c.id !== tempConvId);
            
            // Retirer du DOM
            $(`.conversation-item[data-id="${tempConvId}"]`).remove();
            
            // Nettoyer les messages
            if (MESSAGES[tempConvId]) {
                delete MESSAGES[tempConvId];
            }
        }
    }
    
    currentConversation = getConversationById(convId);
    
    if (!currentConversation) {
        console.error('Conversation not found:', convId);
        return;
    }
    
    // Marquer la conversation comme active
    $('.conversation-item').removeClass('bg-gray-700');
    $(`.conversation-item[data-id="${convId}"]`).addClass('bg-gray-700');
    
    // Afficher la zone de chat
    // $('#empty-state').hide();
    // $('#chat-zone').show();
    $('#empty-state').addClass('hidden');
    $('#chat-zone').removeClass('hidden');
    
    // Si c'est une conversation temporaire, ne pas charger depuis l'API
    if (currentConversation.isTemporary) {
        // Initialiser les messages vides si nécessaire
        if (!MESSAGES) MESSAGES = {};
        if (!MESSAGES[convId]) {
            MESSAGES[convId] = [];
        }
        // Mettre à jour le header
        updateChatHeader();
        // Afficher les messages vides (ou déjà chargés localement)
        const $container = $('#messages-container');
        $container.empty();
        const messages = MESSAGES[convId] || [];
        
        // Afficher les messages avec séparateurs de jours inline (comme WhatsApp)
        let previousMsg = null;
        messages.forEach((msg, index) => {
            // Vérifier si on doit afficher un séparateur de jour
            const showSeparator = shouldShowDaySeparator(msg, previousMsg, index);
            const separatorText = showSeparator ? formatDaySeparator(new Date(msg.createdAt)) : null;
            
            const msgHtml = createMessageItem(msg, showSeparator, separatorText);
            $container.append(msgHtml);
            
            previousMsg = msg;
        });
        attachMessageDeleteListeners();
        
        // Initialiser le séparateur sticky pour les conversations temporaires aussi
        initStickyDaySeparator();
        
        // Fermer le panneau info si ouvert
        $('#conversation-info-panel').addClass('hidden');
        return;
    }
    
    // Charger les participants depuis l'API (avec callback pour mettre à jour l'affichage de l'input)
    loadConversationParticipants(convId, function() {
        // Mettre à jour l'affichage de la zone d'envoi après avoir chargé les participants
        updateMessageInputVisibility();
        // Si le panneau d'infos est ouvert, recharger les infos pour afficher les participants
        if (!$('#conversation-info-panel').hasClass('hidden') && currentConversation && currentConversation.id === convId) {
            renderConversationInfo();
        }
    });
    
    // Mettre à jour le header
    updateChatHeader();
    
    // Mettre à jour l'affichage de la zone d'envoi (au cas où userHasLeft serait déjà défini)
    updateMessageInputVisibility();
    
    // Charger les messages
    loadMessages();
    
    // Fermer le panneau info si ouvert
    $('#conversation-info-panel').addClass('hidden');
    
    // Attacher les événements de suppression de messages
    attachMessageDeleteListeners();
}

/**
 * Charge les participants d'une conversation depuis l'API
 */
function loadConversationParticipants(conversationId, callback) {
    // Ne pas charger si c'est une conversation temporaire ou si l'ID est invalide
    if (!conversationId || (typeof conversationId === 'string' && conversationId.startsWith('temp-'))) {
        if (callback && typeof callback === 'function') {
            callback();
        }
        return;
    }
    
    apiGetConversationMembers(conversationId)
        .done(function(response) {
            
            if (response.hasError || !response.items || response.items.length === 0) {
                if (callback && typeof callback === 'function') {
                    callback();
                }
                return;
            }
            
            const conv = getConversationById(conversationId);
            if (!conv) {
                // Si la conversation n'est pas dans le cache, essayer de la charger depuis l'API
                // Cela peut arriver si on clique sur un groupe depuis les groupes en commun
                if (callback && typeof callback === 'function') {
                    callback();
                }
                return;
            }
            
            // Mapper les membres depuis l'API
            const participants = [];
            const admins = [];
            const formerMembers = []; // Anciens membres qui ont quitté
            
            const currentUser = getCurrentUser();
            response.items.forEach(member => {
                if (member.userId) {
                    const hasLeft = member.hasLeft || false;
                    
                    // Si c'est l'utilisateur actuel, stocker hasLeft
                    if (currentUser && member.userId === currentUser.id) {
                        conv.userHasLeft = hasLeft;
                    }
                    
                    // Mettre à jour les infos utilisateur dans USERS
                    const userIndex = USERS.findIndex(u => u.id === member.userId);
                    if (userIndex >= 0) {
                        // Mettre à jour l'utilisateur existant
                        if (member.userNom) USERS[userIndex].nom = member.userNom;
                        if (member.userPrenoms) USERS[userIndex].prenoms = member.userPrenoms;
                        if (member.userLogin) USERS[userIndex].login = member.userLogin;
                    } else {
                        // Ajouter un nouvel utilisateur (même si les infos ne sont pas complètes)
                        USERS.push({
                            id: member.userId,
                            nom: member.userNom || '',
                            prenoms: member.userPrenoms || '',
                            login: member.userLogin || ''
                        });
                    }
                    
                    // Séparer les membres actifs des anciens membres
                    if (hasLeft) {
                        // Ancien membre
                        formerMembers.push({
                            userId: member.userId,
                            leftAt: member.leftAt || null,
                            role: member.role || false,
                            hasDefinitivelyLeft: member.hasDefinitivelyLeft || false
                        });
                    } else {
                        // Membre actif
                        participants.push(member.userId);
                        
                        // role = true signifie admin
                        if (member.role === true) {
                            admins.push(member.userId);
                        }
                    }
                }
            });
            
            // Mettre à jour la conversation
            conv.participants = participants;
            conv.admins = admins;
            conv.formerMembers = formerMembers; // Stocker les anciens membres
            
            // Mettre à jour l'affichage de la zone d'envoi si c'est la conversation courante
            if (currentConversation && currentConversation.id === conversationId) {
                updateMessageInputVisibility();
            }
            
            // Pour les conversations privées, mettre à jour le titre avec le nom de l'autre participant
            if (conv.type === 'private' && participants.length > 0) {
                const currentUser = getCurrentUser();
                const otherParticipantId = participants.find(id => id !== currentUser.id);
                if (otherParticipantId) {
                    const otherUser = getUserById(otherParticipantId);
                    if (otherUser) {
                        const newTitle = `${otherUser.prenoms} ${otherUser.nom}`;
                        conv.titre = newTitle;
                        // Mettre à jour le cache des titres personnalisés
                        privateConversationTitles[conversationId] = newTitle;
                        // Mettre à jour aussi dans CONVERSATIONS
                        const convIndex = CONVERSATIONS.findIndex(c => c.id === conversationId);
                        if (convIndex >= 0) {
                            CONVERSATIONS[convIndex].titre = newTitle;
                            // Mettre à jour l'affichage dans la liste des conversations
                            const $convItem = $(`.conversation-item[data-id="${conversationId}"] h3`);
                            if ($convItem.length) {
                                $convItem.text(newTitle);
                            }
                        }
                        // Mettre à jour le header si c'est la conversation courante
                        if (currentConversation && currentConversation.id === conversationId) {
                            updateChatHeader();
                        }
                    } else {
                    }
                }
            }
            
            
            // Appeler le callback si fourni
            if (callback && typeof callback === 'function') {
                callback();
            }
        })
        .fail(function(xhr, status, error) {
            console.error('Erreur loadConversationParticipants:', error);
            
            // Appeler le callback même en cas d'erreur pour afficher ce qui est disponible
            if (callback && typeof callback === 'function') {
                callback();
            }
        });
}

function attachMessageDeleteListeners() {
    // Supprimer les anciens listeners
    $('.message-delete-btn').off('click');
    
    // Ajouter les nouveaux listeners
    $('.message-delete-btn').click(function(e) {
        e.stopPropagation();
        const messageId = parseInt($(this).data('message-id'));
        deleteMessage(messageId);
    });
}

function updateChatHeader() {
    const icon = currentConversation.type === 'group'
        ? '<path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>'
        : '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>';
    
    $('#conversation-icon').html(icon);
    $('#conversation-title').text(currentConversation.titre);
    
    // Le header est déjà cliquable via la classe cursor-pointer dans le HTML
}

/**
 * Détermine si on doit afficher un séparateur de jour entre deux messages
 * @param {Object} currentMsg - Le message actuel
 * @param {Object} previousMsg - Le message précédent (peut être null)
 * @param {number} index - L'index du message dans la liste (0 pour le premier)
 * @returns {boolean} - true si on doit afficher un séparateur
 */
function shouldShowDaySeparator(currentMsg, previousMsg, index = 0) {
    if (!currentMsg || !currentMsg.createdAt) {
        return false;
    }
    
    // Si c'est le premier message (index 0), toujours afficher un séparateur
    if (index === 0) {
        return true;
    }
    
    // Si pas de message précédent, afficher un séparateur
    if (!previousMsg || !previousMsg.createdAt) {
        return true;
    }
    
    const currentDate = new Date(currentMsg.createdAt);
    const previousDate = new Date(previousMsg.createdAt);
    
    // Vérifier si les dates sont valides
    if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) {
        return false;
    }
    
    // Comparer les dates (année, mois, jour)
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const previousDay = previousDate.getDate();
    const previousMonth = previousDate.getMonth();
    const previousYear = previousDate.getFullYear();
    
    // Afficher un séparateur si les jours sont différents
    return currentDay !== previousDay || 
           currentMonth !== previousMonth || 
           currentYear !== previousYear;
}

/**
 * Formate le séparateur de jour pour l'affichage
 * @param {Date} date - La date à formater
 * @returns {string} - Le texte du séparateur formaté
 */
function formatDaySeparator(date) {
    if (!date || isNaN(date.getTime())) {
        return "";
    }
    
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    
    // Aujourd'hui
    if (days === 0) {
        return "Aujourd'hui";
    }
    
    // Hier
    if (days === 1) {
        return "Hier";
    }
    
    // Cette semaine (moins de 7 jours)
    if (days < 7) {
        const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        return dayNames[date.getDay()];
    }
    
    // Cette année ou autre année : afficher la date complète au format "07/01/2026"
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function loadMessages() {
    if (!currentConversation) return;
    
    // Ne pas charger si c'est une conversation temporaire
    if (currentConversation.isTemporary) {
        // Initialiser les messages vides si nécessaire
        if (!MESSAGES) MESSAGES = {};
        if (!MESSAGES[currentConversation.id]) {
            MESSAGES[currentConversation.id] = [];
        }
        // Afficher les messages vides (ou déjà chargés localement)
        const $container = $('#messages-container');
        $container.empty();
        const messages = MESSAGES[currentConversation.id] || [];
        messages.forEach(msg => {
            const msgHtml = createMessageItem(msg);
            $container.append(msgHtml);
        });
        attachMessageDeleteListeners();
        return;
    }
    
    const $container = $('#messages-container');
    $container.empty();
    showLoader(true);
    
    apiGetMessages(currentConversation.id)
        .done(function(response) {
            showLoader(false);
            
            if (response.hasError) {
                showError(response.status?.message || 'Erreur lors du chargement des messages');
                return;
            }
            
            if (!response.items || response.items.length === 0) {
                // Aucun message
                attachMessageDeleteListeners();
                return;
            }
            
            // Mapper les messages de l'API vers le format frontend
            const allMessages = response.items.map(mapMessageFromApi);
            
            // Filtrer les messages supprimés (isHiden: true)
            const messages = allMessages.filter(msg => !msg.isHiden);
            
            // Trier par date (du plus ancien au plus récent)
            messages.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateA - dateB;
            });
            
            // Stocker les messages pour utilisation ultérieure
            if (!MESSAGES) MESSAGES = {};
            MESSAGES[currentConversation.id] = messages;
            
            // Afficher les messages avec séparateurs de jours inline (comme WhatsApp)
            let previousMsg = null;
            messages.forEach((msg, index) => {
                // Vérifier si on doit afficher un séparateur de jour
                const showSeparator = shouldShowDaySeparator(msg, previousMsg, index);
                const separatorText = showSeparator ? formatDaySeparator(new Date(msg.createdAt)) : null;
                
                const msgHtml = createMessageItem(msg, showSeparator, separatorText);
                $container.append(msgHtml);
                
                previousMsg = msg;
            });
            
            // Attacher les événements de suppression
            attachMessageDeleteListeners();
            
            // Initialiser le séparateur sticky
            initStickyDaySeparator();
            
            // Scroller vers le bas
            scrollToBottom();
        })
        .fail(function(xhr, status, error) {
            showLoader(false);
            showError('Erreur lors du chargement des messages: ' + error);
            console.error('Erreur loadMessages:', error);
        });
}

/**
 * Parse une date depuis l'API en gérant tous les formats possibles
 * @param {string} dateStr - La date au format string depuis l'API
 * @returns {Date|null} - L'objet Date parsé ou null si invalide
 */
function parseDateFromApi(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }
    
    let date = null;
    
    // Format "dd/MM/yyyy" (sans heure)
    if (dateStr.includes('/') && !dateStr.includes(' ')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // Créer la date avec l'heure à 00:00:00
            date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    // Format "dd/MM/yyyy HH:mm:ss" (avec heure)
    else if (dateStr.includes('/') && dateStr.includes(' ')) {
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
            const datePart = parts[0].split('/');
            const timePart = parts[1].split(':');
            if (datePart.length === 3 && timePart.length >= 2) {
                date = new Date(
                    parseInt(datePart[2]),
                    parseInt(datePart[1]) - 1,
                    parseInt(datePart[0]),
                    parseInt(timePart[0]) || 0,
                    parseInt(timePart[1]) || 0,
                    parseInt(timePart[2]) || 0
                );
            }
        }
    }
    // Format "2026-01-13 22:07:50.0" ou "2026-01-13 22:07:50"
    else if (dateStr.includes('-') && dateStr.includes(' ')) {
        // Nettoyer le format en remplaçant l'espace par T et en supprimant le .0 à la fin
        let cleanedStr = dateStr.replace(' ', 'T');
        // Supprimer les millisecondes et le .0 à la fin si présent
        cleanedStr = cleanedStr.replace(/\.\d+$/, '');
        // Si pas de secondes, ajouter :00
        if (!cleanedStr.includes(':')) {
            cleanedStr += 'T00:00:00';
        } else {
            const timeParts = cleanedStr.split('T')[1].split(':');
            if (timeParts.length === 2) {
                cleanedStr += ':00';
            }
        }
        date = new Date(cleanedStr);
    }
    // Format ISO standard "2026-01-13T22:07:50"
    else if (dateStr.includes('T')) {
        date = new Date(dateStr);
    }
    // Essayer le parsing direct
    else {
        date = new Date(dateStr);
    }
    
    // Vérifier que la date est valide
    if (date && !isNaN(date.getTime())) {
        return date;
    }
    
    return null;
}

/**
 * Mappe un message de l'API vers le format frontend
 */
function mapMessageFromApi(apiMsg) {
    // Parser la date
    let createdAt = null;
    if (apiMsg.createdAt) {
        createdAt = parseDateFromApi(apiMsg.createdAt);
    }
    
    // Déterminer le type de message
    let type = 'text';
    if (apiMsg.typeMessageCode) {
        if (apiMsg.typeMessageCode === 'IMAGE') {
            type = 'image';
        } else if (apiMsg.typeMessageCode === 'MIXED') {
            type = 'mixed';
        }
    }
    
    // Mettre à jour USERS avec infoCreator si disponible
    if (apiMsg.infoCreator && apiMsg.createdBy) {
        const userIndex = USERS.findIndex(u => u.id === apiMsg.createdBy);
        if (userIndex >= 0) {
            // Mettre à jour l'utilisateur existant
            if (apiMsg.infoCreator.nom) USERS[userIndex].nom = apiMsg.infoCreator.nom;
            if (apiMsg.infoCreator.prenoms) USERS[userIndex].prenoms = apiMsg.infoCreator.prenoms;
            if (apiMsg.infoCreator.login) USERS[userIndex].login = apiMsg.infoCreator.login;
        } else {
            // Ajouter un nouvel utilisateur
            USERS.push({
                id: apiMsg.createdBy,
                nom: apiMsg.infoCreator.nom || '',
                prenoms: apiMsg.infoCreator.prenoms || '',
                login: apiMsg.infoCreator.login || ''
            });
        }
    }
    
    return {
        id: apiMsg.id,
        conversationId: apiMsg.conversationId || (apiMsg.conversation ? apiMsg.conversation.id : null),
        senderId: apiMsg.createdBy,
        content: apiMsg.content || '',
        imgUrl: apiMsg.imgUrl || null,
        type: type,
        createdAt: createdAt,
        isHiden: apiMsg.isHiden || false // Stocker isHiden pour filtrer les messages supprimés
    };
}

/**
 * Met à jour le dernier message visible d'une conversation dans la liste
 */
function updateConversationLastMessage(conversationId) {
    const conv = getConversationById(conversationId);
    if (!conv) return;
    
    apiGetLastVisibleMessage(conversationId)
        .done(function(response) {
            if (!response.hasError && response.items && response.items.length > 0) {
                // Filtrer les messages pour trouver le dernier avec isHiden: false
                const visibleMessages = response.items.filter(msg => !msg.isHiden);
                
                if (visibleMessages.length > 0) {
                    // Prendre le premier message (les messages sont déjà triés par date décroissante)
                    const lastMsg = visibleMessages[0];
                    conv.lastMessage = lastMsg.content || '';
                    conv.lastMessageImgUrl = lastMsg.imgUrl || null;
                    
                    // Déterminer le type de message
                    if (lastMsg.typeMessageCode) {
                        if (lastMsg.typeMessageCode === 'IMAGE') {
                            conv.lastMessageType = 'image';
                        } else if (lastMsg.typeMessageCode === 'MIXED') {
                            conv.lastMessageType = 'mixed';
                        } else {
                            conv.lastMessageType = 'text';
                        }
                    } else if (conv.lastMessageImgUrl && !conv.lastMessage) {
                        // Si on a une image mais pas de texte, c'est une image
                        conv.lastMessageType = 'image';
                    } else {
                        conv.lastMessageType = 'text';
                    }
                    
                    // Parser la date avec l'heure complète
                    if (lastMsg.createdAt) {
                        conv.lastMessageDate = parseDateFromApi(lastMsg.createdAt);
                        if (conv.lastMessageDate) {
                            conv.lastMessageTime = formatTime(conv.lastMessageDate);
                            
                            // Mettre à jour l'affichage dans la liste
                            const $convItem = $(`.conversation-item[data-id="${conversationId}"]`);
                            if ($convItem.length) {
                                // Mettre à jour l'heure
                                const $timeSpan = $convItem.find('.conversation-time');
                                if ($timeSpan.length) {
                                    $timeSpan.text(conv.lastMessageTime);
                                }
                                
                                // Mettre à jour le dernier message (texte ou "Image")
                                const $lastMsgContainer = $convItem.find('.flex-1.min-w-0').children().last();
                                if ($lastMsgContainer.length) {
                                    if (conv.lastMessageType === 'image' || (conv.lastMessageType === 'mixed' && !conv.lastMessage)) {
                                        $lastMsgContainer.replaceWith(`
                                            <span class="flex items-center text-sm text-gray-400">
                                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                                Image
                                            </span>
                                        `);
                                    } else {
                                        $lastMsgContainer.replaceWith(`<p class="text-sm text-gray-400 truncate">${conv.lastMessage || ''}</p>`);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Aucun message visible, mettre à jour avec des valeurs vides
                    conv.lastMessage = '';
                    conv.lastMessageTime = '';
                    conv.lastMessageDate = null;
                    conv.lastMessageType = null;
                    conv.lastMessageImgUrl = null;
                    
                    // Mettre à jour l'affichage dans la liste
                    const $convItem = $(`.conversation-item[data-id="${conversationId}"]`);
                    if ($convItem.length) {
                        const $timeSpan = $convItem.find('.conversation-time');
                        if ($timeSpan.length) {
                            $timeSpan.text('');
                        }
                        const $lastMsgContainer = $convItem.find('.flex-1.min-w-0').children().last();
                        if ($lastMsgContainer.length) {
                            $lastMsgContainer.replaceWith(`<p class="text-sm text-gray-400 truncate"></p>`);
                        }
                    }
                }
            }
        })
        .fail(function() {
            // En cas d'erreur, on continue sans mettre à jour
            console.error('Erreur lors de la mise à jour du dernier message pour la conversation', conversationId);
        });
}

function deleteMessage(messageId) {
    if (!currentConversation) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
        showLoader(true);
        
        apiDeleteMessage(messageId)
            .done(function(response) {
                showLoader(false);
                
                if (response.hasError) {
                    showError(response.status?.message || 'Erreur lors de la suppression du message');
                    return;
                }
                
                // Recharger les messages
                loadMessages();
                
                // Mettre à jour le dernier message dans la liste des conversations
                updateConversationLastMessage(currentConversation.id);
                
                showSuccess('Message supprimé');
            })
            .fail(function(xhr, status, error) {
                showLoader(false);
                showError('Erreur lors de la suppression du message: ' + error);
                console.error('Erreur deleteMessage:', error);
            });
    }
}

function createMessageItem(msg, showDaySeparator = false, daySeparatorText = null) {
    const isOwn = msg.senderId === currentUser.id;
    const sender = getUserById(msg.senderId);
    // TOUJOURS afficher uniquement l'heure (les séparateurs gèrent l'affichage du jour)
    const time = formatMessageTime(msg.createdAt, true);
    
    // Gérer les images
    let imageHtml = '';
    if (msg.imgUrl) {
        imageHtml = `<img src="${msg.imgUrl}" class="max-w-full rounded mb-2" alt="Image" />`;
    }
    
    // Gérer le contenu texte
    let contentHtml = '';
    if (msg.content) {
        contentHtml = `<p class="text-white break-words">${msg.content}</p>`;
    }
    
    // Séparateur de jour inline (comme WhatsApp)
    let separatorHtml = '';
    if (showDaySeparator && daySeparatorText) {
        separatorHtml = `
            <div class="flex justify-center my-4 day-separator" data-separator-date="${daySeparatorText}">
                <div class="bg-gray-600 text-gray-300 text-xs px-3 py-1 rounded-full">
                    ${daySeparatorText}
                </div>
            </div>
        `;
    }
    
    const messageHtml = isOwn ? `
        <div class="message-item group flex justify-end mb-4 relative" data-message-id="${msg.id}">
            <div class="bg-green-700 rounded-lg px-4 py-2 max-w-md relative">
                ${imageHtml}
                ${contentHtml}
                <span class="text-xs text-green-200 mt-1 block">${time}</span>
                <button class="message-delete-btn absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-opacity" data-message-id="${msg.id}" title="Supprimer le message">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    ` : `
        <div class="message-item group flex justify-start mb-4 relative" data-message-id="${msg.id}">
            <div class="bg-gray-700 rounded-lg px-4 py-2 max-w-md relative">
                ${currentConversation.type === 'group' ? `<p class="text-green-400 text-sm font-semibold mb-1">${sender ? sender.prenoms : 'Utilisateur'}</p>` : ''}
                ${imageHtml}
                ${contentHtml}
                <span class="text-xs text-gray-400 mt-1 block">${time}</span>
                <button class="message-delete-btn absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-opacity" data-message-id="${msg.id}" title="Supprimer le message">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    return separatorHtml + messageHtml;
}

/**
 * Met à jour la visibilité de la zone d'envoi de message
 * Masque l'input si l'utilisateur a quitté le groupe, affiche une barre de message à la place
 */
function updateMessageInputVisibility() {
    if (!currentConversation) {
        $('#message-form').removeClass('hidden');
        $('#left-group-message').addClass('hidden');
        return;
    }
    
    const isGroup = currentConversation.type === 'group';
    const userHasLeft = currentConversation.userHasLeft === true;
    
    if (isGroup && userHasLeft) {
        // Masquer le formulaire d'envoi et afficher la barre de message
        $('#message-form').addClass('hidden');
        $('#left-group-message').removeClass('hidden');
    } else {
        // Afficher le formulaire d'envoi et masquer la barre de message
        $('#message-form').removeClass('hidden');
        $('#left-group-message').addClass('hidden');
    }
}

function sendMessage() {
    const content = $('#message-input').val().trim();
    const imageFile = $('#image-input')[0].files[0];
    
    if (!content && !imageFile) {
        return;
    }
    
    if (!currentConversation) {
        showError('Sélectionnez une conversation');
        return;
    }
    
    // Vérifier si l'utilisateur a quitté le groupe
    if (currentConversation.type === 'group' && currentConversation.userHasLeft === true) {
        showError('Vous ne pouvez pas envoyer de messages à ce groupe, car vous n\'en faites plus partie.');
        return;
    }
    
    showLoader(true);
    
    // Fonction pour envoyer le message après upload d'image si nécessaire
    const sendMessageAfterUpload = function(imgUrl) {
        const typeMessageCode = determineMessageType(content, imgUrl);
        
        let apiCall;
        if (currentConversation.type === 'private') {
            // Pour les conversations privées, trouver l'autre participant
            let otherParticipant;
            if (currentConversation.isTemporary && currentConversation.tempReceiverId) {
                // Conversation temporaire, utiliser tempReceiverId
                otherParticipant = currentConversation.tempReceiverId;
            } else {
                otherParticipant = currentConversation.participants.find(id => id !== currentUser.id);
            }
            
            if (!otherParticipant) {
                showLoader(false);
                showError('Impossible de trouver le destinataire');
                return;
            }
            apiCall = apiSendPrivateMessage(otherParticipant, typeMessageCode, content || null, imgUrl || null);
        } else {
            // Pour les groupes, vérifier si c'est une conversation temporaire
            if (currentConversation.isTemporary) {
                showLoader(false);
                showError('Veuillez d\'abord créer le groupe');
                return;
            }
            apiCall = apiSendGroupMessage(currentConversation.id, typeMessageCode, content || null, imgUrl || null);
        }
        
        apiCall
            .done(function(response) {
                showLoader(false);
                
                if (response.hasError) {
                    showError(response.status?.message || 'Erreur lors de l\'envoi du message');
                    return;
                }
                
                // Vider le champ
                $('#message-input').val('');
                $('#image-preview').hide().empty();
                $('#image-input').val('');
                
                // Si c'était une conversation temporaire, mettre à jour avec la vraie conversation
                if (currentConversation.isTemporary && response.items && response.items[0]) {
                    const messageResponse = response.items[0];
                    if (messageResponse.conversationId) {
                        // Remplacer la conversation temporaire par la vraie
                        currentConversation.id = messageResponse.conversationId;
                        currentConversation.isTemporary = false;
                        delete currentConversation.tempReceiverId;
                        
                        // Charger les participants de la nouvelle conversation
                        loadConversationParticipants(messageResponse.conversationId, function() {
                            // Mettre à jour le header avec le nouveau titre si conversation privée
                            if (currentConversation.type === 'private') {
                                updateChatHeader();
                            }
                            // Recharger les conversations pour mettre à jour le titre dans la liste
                            loadConversations();
                        });
                    }
                }
                
                // Recharger les messages
                loadMessages();
                
                // Recharger les conversations pour mettre à jour le dernier message
                // (sauf si on vient de créer une conversation privée, car déjà fait dans le callback)
                if (!currentConversation.isTemporary) {
                    loadConversations();
                }
                
                // Réactiver la conversation courante
                setTimeout(() => {
                    $(`.conversation-item[data-id="${currentConversation.id}"]`).addClass('bg-gray-700');
                }, 100);
                
                showSuccess('Message envoyé !');
            })
            .fail(function(xhr, status, error) {
                showLoader(false);
                showError('Erreur lors de l\'envoi du message: ' + error);
                console.error('Erreur sendMessage:', error);
            });
    };
    
    // Si une image est présente, l'uploader d'abord
    if (imageFile) {
        apiUploadImage(imageFile)
            .done(function(response) {
                if (response.hasError || !response.items || !response.items[0] || !response.items[0].url) {
                    showLoader(false);
                    showError('Erreur lors de l\'upload de l\'image');
                    return;
                }
                
                const imgUrl = response.items[0].url;
                sendMessageAfterUpload(imgUrl);
            })
            .fail(function(xhr, status, error) {
                showLoader(false);
                showError('Erreur lors de l\'upload de l\'image: ' + error);
                console.error('Erreur upload image:', error);
            });
    } else {
        // Pas d'image, envoyer directement
        sendMessageAfterUpload(null);
    }
}

/**
 * Détermine le type de message selon le contenu et l'image
 */
function determineMessageType(content, imgUrl) {
    if (content && imgUrl) {
        return 'MIXED';
    } else if (imgUrl) {
        return 'IMAGE';
    } else {
        return 'TEXT';
    }
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
}

/**
 * Met à jour le séparateur de jour sticky selon le message visible en haut (style WhatsApp)
 * Le sticky ne s'affiche que si aucun séparateur inline n'est visible en haut
 */
function updateStickyDaySeparator() {
    const $container = $('#messages-container');
    const $stickySeparator = $('#sticky-day-separator');
    
    if ($container.length === 0 || $stickySeparator.length === 0 || !currentConversation) {
        $stickySeparator.addClass('hidden');
        return;
    }
    
    const container = $container[0];
    const containerRect = container.getBoundingClientRect();
    
    // Vérifier d'abord si un séparateur inline est visible en haut (dans les 100px du haut)
    const $inlineSeparators = $container.find('.day-separator');
    let visibleInlineSeparator = null;
    
    $inlineSeparators.each(function() {
        const $sep = $(this);
        const sepRect = $sep[0].getBoundingClientRect();
        
        // Si le séparateur est visible dans le viewport (proche du haut, dans les 100px)
        if (sepRect.top <= containerRect.top + 100 && sepRect.bottom >= containerRect.top - 50) {
            visibleInlineSeparator = $sep;
            return false; // Sortir de la boucle
        }
    });
    
    // Si un séparateur inline est visible en haut, cacher le sticky
    if (visibleInlineSeparator) {
        $stickySeparator.addClass('hidden');
        return;
    }
    
    // Sinon, trouver le message le plus proche du haut pour afficher le sticky
    const $messages = $container.find('.message-item');
    
    if ($messages.length === 0) {
        $stickySeparator.addClass('hidden');
        return;
    }
    
    let targetMessage = null;
    let minDistance = Infinity;
    
    // Parcourir tous les messages pour trouver celui le plus proche du haut
    $messages.each(function() {
        const $msg = $(this);
        const msgElement = $msg[0];
        const msgRect = msgElement.getBoundingClientRect();
        
        // Distance du haut du conteneur
        const distanceFromTop = msgRect.top - containerRect.top;
        
        // Si le message est visible dans le viewport
        if (msgRect.top <= containerRect.bottom && msgRect.bottom >= containerRect.top) {
            // Prendre le message le plus proche du haut (priorité aux messages visibles)
            if (distanceFromTop >= 0 && distanceFromTop < minDistance) {
                minDistance = distanceFromTop;
                targetMessage = $msg;
            } else if (distanceFromTop < 0 && Math.abs(distanceFromTop) < Math.abs(minDistance)) {
                minDistance = distanceFromTop;
                targetMessage = $msg;
            }
        } else {
            // Si le message n'est pas visible, vérifier s'il est plus proche
            const absDistance = Math.abs(distanceFromTop);
            if (absDistance < Math.abs(minDistance)) {
                minDistance = distanceFromTop;
                targetMessage = $msg;
            }
        }
    });
    
    // Si aucun message trouvé, prendre le premier message
    if (!targetMessage && $messages.length > 0) {
        targetMessage = $messages.first();
    }
    
    if (targetMessage) {
        // Récupérer la date du message
        const messageId = targetMessage.data('message-id');
        if (messageId) {
            // Trouver le message dans le cache
            const messages = MESSAGES[currentConversation.id] || [];
            const msg = messages.find(m => m.id === messageId);
            
            if (msg && msg.createdAt) {
                const separatorText = formatDaySeparator(new Date(msg.createdAt));
                $stickySeparator.find('div').text(separatorText);
                $stickySeparator.removeClass('hidden');
                return;
            }
        }
    }
    
    // Si pas de message trouvé, cacher le séparateur
    $stickySeparator.addClass('hidden');
}

/**
 * Initialise le système de séparateur sticky pour le scroll
 */
function initStickyDaySeparator() {
    const $container = $('#messages-container');
    
    // Détacher les anciens event listeners s'ils existent
    $container.off('scroll.stickySeparator');
    
    // Ajouter l'event listener pour le scroll
    $container.on('scroll.stickySeparator', function() {
        updateStickyDaySeparator();
    });
    
    // Mettre à jour initialement
    setTimeout(() => {
        updateStickyDaySeparator();
    }, 100);
}

// La fonction showNewMessageModal() est maintenant dans modals.js

function toggleConversationInfo() {
    const $panel = $('#conversation-info-panel');
    
    if ($panel.hasClass('hidden')) {
        // Charger les infos de la conversation/groupe
        loadConversationInfo();
        $panel.removeClass('hidden');
    } else {
        $panel.addClass('hidden');
    }
}

function loadConversationInfo() {
    if (!currentConversation) return;
    
    // Toujours recharger les participants depuis l'API pour avoir les données à jour
    loadConversationParticipants(currentConversation.id, function() {
        renderConversationInfo();
    });
}

function renderConversationInfo() {
    if (!currentConversation) return;
    
    const isGroup = currentConversation.type === 'group';
    const currentUser = getCurrentUser();
    
    // Récupérer les participants depuis la conversation actuelle
    // getConversationParticipants retourne déjà les objets utilisateur complets
    let participants = getConversationParticipants(currentConversation.id);
    
    // Si pas de participants pour un groupe, vérifier si les IDs sont chargés mais pas les objets utilisateur
    if (isGroup && (!participants || participants.length === 0)) {
        // Vérifier si la conversation a des participantIds mais pas d'objets utilisateur chargés
        const conv = getConversationById(currentConversation.id);
        const hasParticipantIds = conv && ((conv.participants && conv.participants.length > 0) || (conv.participantIds && conv.participantIds.length > 0));
        
        if (hasParticipantIds) {
            // Les IDs sont là mais les objets utilisateur ne sont pas chargés dans USERS
            // Charger depuis l'API pour mettre à jour USERS
            loadConversationParticipants(currentConversation.id, function() {
                // Re-rendre les infos une fois les participants chargés
                renderConversationInfo();
            });
            return; // Sortir ici, renderConversationInfo sera rappelé après le chargement
        } else {
            // Pas d'IDs non plus, charger depuis l'API
            loadConversationParticipants(currentConversation.id, function() {
                // Re-rendre les infos une fois les participants chargés
                renderConversationInfo();
            });
            return; // Sortir ici, renderConversationInfo sera rappelé après le chargement
        }
    }
    
    const isAdmin = isGroup && isUserAdmin(currentConversation.id, currentUser.id);
    
    // Mettre à jour le titre du panneau
    $('#conversation-info-panel h3').text(isGroup ? 'Infos du groupe' : 'Infos de la conversation');
    
    $('#group-name').text(currentConversation.titre || 'Sans titre');
    if (isGroup) {
        $('#members-count').text(participants.length + (participants.length > 1 ? ' membres' : ' membre'));
    } else {
        // Pour les conversations privées, afficher le nom de l'autre participant
        const otherParticipant = participants.find(p => p.id !== currentUser.id);
        if (otherParticipant) {
            $('#members-count').text(`${otherParticipant.prenoms} ${otherParticipant.nom}`);
        } else {
            $('#members-count').text('Conversation privée');
        }
    }
    
    const $membersList = $('#members-list');
    $membersList.empty();
    
    // Afficher les informations de création pour les groupes (avant le titre "Membres")
    if (isGroup) {
        // Supprimer l'ancienne section si elle existe
        $('#group-creation-info').remove();
        
        if (currentConversation.createdAt && currentConversation.createdBy) {
            const creator = getUserById(currentConversation.createdBy);
            const creatorName = creator ? `${creator.prenoms} ${creator.nom}` : 'Utilisateur inconnu';
            
            // Formater la date de création
            const creationDate = currentConversation.createdAt;
            let formattedDate = '';
            if (creationDate instanceof Date) {
                formattedDate = creationDate.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const formattedTime = creationDate.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                formattedDate += ` à ${formattedTime}`;
            } else if (typeof creationDate === 'string') {
                formattedDate = creationDate;
            }
            
            const creationInfoHtml = `
                <div id="group-creation-info" class="mb-6 pb-4 border-b border-gray-700">
                    <p class="text-gray-400 text-sm text-center">
                        Groupe créé par <span class="text-white font-medium">${creatorName}</span><br>
                        <span class="text-gray-500">le ${formattedDate}</span>
                    </p>
                </div>
            `;
            
            // Insérer avant le conteneur de la section "Membres" (avant le titre)
            $('#members-section-title').parent().before(creationInfoHtml);
        }
    }
    
    // Pour les conversations privées, afficher les groupes en commun
    if (!isGroup) {
        const otherParticipant = participants.find(p => p.id !== currentUser.id);
        if (otherParticipant) {
            const commonGroups = getCommonGroups(currentUser.id, otherParticipant.id);
            
            if (commonGroups.length > 0) {
                // Charger les participants de tous les groupes en commun
                const loadPromises = commonGroups.map(group => {
                    return apiGetConversationMembers(group.id)
                        .done(function(response) {
                            if (response.hasError || !response.items || response.items.length === 0) {
                                return;
                            }
                            
                            // Mapper les membres depuis l'API et mettre à jour le cache
                            const groupParticipants = [];
                            const groupAdmins = [];
                            const groupFormerMembers = [];
                            
                            response.items.forEach(member => {
                                if (member.userId) {
                                    const hasLeft = member.hasLeft || false;
                                    
                                    // Mettre à jour le cache USERS
                                    const userIndex = USERS.findIndex(u => u.id === member.userId);
                                    if (userIndex >= 0) {
                                        if (member.userNom) USERS[userIndex].nom = member.userNom;
                                        if (member.userPrenoms) USERS[userIndex].prenoms = member.userPrenoms;
                                        if (member.userLogin) USERS[userIndex].login = member.userLogin;
                                    } else {
                                        USERS.push({
                                            id: member.userId,
                                            nom: member.userNom || '',
                                            prenoms: member.userPrenoms || '',
                                            login: member.userLogin || ''
                                        });
                                    }
                                    
                                    // Séparer les membres actifs des anciens membres
                                    if (hasLeft) {
                                        groupFormerMembers.push({
                                            userId: member.userId,
                                            leftAt: member.leftAt || null,
                                            role: member.role || false,
                                            hasDefinitivelyLeft: member.hasDefinitivelyLeft || false
                                        });
                                    } else {
                                        groupParticipants.push(member.userId);
                                        if (member.role === true) {
                                            groupAdmins.push(member.userId);
                                        }
                                    }
                                }
                            });
                            
                            // Mettre à jour la conversation dans le cache
                            group.participants = groupParticipants;
                            group.admins = groupAdmins;
                            group.formerMembers = groupFormerMembers;
                        })
                        .fail(function(xhr, status, error) {
                            console.error('Erreur lors du chargement des participants du groupe:', error);
                        });
                });
                
                // Attendre que tous les participants soient chargés avant d'afficher
                $.when.apply($, loadPromises).done(function() {
                    // Maintenant afficher les groupes avec les participants chargés
                    let commonGroupsHtml = `
                        <div class="mb-6">
                            <h5 class="text-gray-400 font-semibold mb-3">${commonGroups.length} ${commonGroups.length > 1 ? 'groupes en commun' : 'groupe en commun'}</h5>
                            <div class="space-y-2">
                    `;
                    
                    commonGroups.forEach(group => {
                        const memberCount = group.participants ? group.participants.length : 0;
                        
                        // Récupérer les membres visibles (max 3-4, en excluant l'utilisateur actuel et l'autre participant)
                        const visibleMembers = [];
                        if (group.participants && group.participants.length > 0) {
                            const otherParticipantId = otherParticipant.id;
                            const currentUserId = currentUser.id;
                            
                            // Filtrer les participants (exclure l'utilisateur actuel et l'autre participant)
                            const otherMembers = group.participants
                                .filter(pId => pId !== currentUserId && pId !== otherParticipantId)
                                .slice(0, 3); // Prendre max 3 autres membres
                            
                            // Convertir en objets utilisateur
                            otherMembers.forEach(memberId => {
                                const member = getUserById(memberId);
                                if (member) {
                                    visibleMembers.push(member);
                                }
                            });
                        }
                        
                        // Construire la liste des noms de membres
                        let membersListText = '';
                        if (visibleMembers.length > 0) {
                            membersListText = visibleMembers.map(m => `${m.prenoms} ${m.nom}`).join(', ');
                            // Ajouter "Vous" si l'utilisateur actuel est dans le groupe
                            if (group.participants && group.participants.includes(currentUser.id)) {
                                membersListText += ', Vous';
                            }
                            // Si il y a plus de membres, on pourrait ajouter "et X autres" mais pour l'instant on garde simple
                        } else if (group.participants && group.participants.includes(currentUser.id)) {
                            membersListText = 'Vous';
                        }
                        
                        commonGroupsHtml += `
                            <div class="common-group-item p-3 hover:bg-gray-700 rounded cursor-pointer transition" data-group-id="${group.id}">
                                <div class="flex items-center">
                                    <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center mr-3 flex-shrink-0">
                                        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-white font-medium truncate">${group.titre}</p>
                                        <p class="text-gray-400 text-sm truncate">${membersListText || `${memberCount} ${memberCount > 1 ? 'membres' : 'membre'}`}</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    commonGroupsHtml += `
                            </div>
                        </div>
                    `;
                    
                    $membersList.append(commonGroupsHtml);
                    
                    // Événement click pour ouvrir le groupe
                    $('.common-group-item').click(function() {
                        const groupId = parseInt($(this).data('group-id'));
                        // Fermer le panneau d'infos d'abord
                        $('#conversation-info-panel').addClass('hidden');
                        // Sélectionner la conversation
                        selectConversation(groupId);
                        
                        // Faire un appel API direct pour charger les participants
                        apiGetConversationMembers(groupId)
                            .done(function(response) {
                                if (response.hasError || !response.items || response.items.length === 0) {
                                    return;
                                }
                                
                                const group = getConversationById(groupId);
                                if (!group) return;
                                
                                // Mapper les membres depuis l'API et mettre à jour le cache
                                const participants = [];
                                const admins = [];
                                const formerMembers = [];
                                
                                const currentUser = getCurrentUser();
                                response.items.forEach(member => {
                                    if (member.userId) {
                                        const hasLeft = member.hasLeft || false;
                                        
                                        // Mettre à jour le cache USERS
                                        const userIndex = USERS.findIndex(u => u.id === member.userId);
                                        if (userIndex >= 0) {
                                            if (member.userNom) USERS[userIndex].nom = member.userNom;
                                            if (member.userPrenoms) USERS[userIndex].prenoms = member.userPrenoms;
                                            if (member.userLogin) USERS[userIndex].login = member.userLogin;
                                        } else {
                                            USERS.push({
                                                id: member.userId,
                                                nom: member.userNom || '',
                                                prenoms: member.userPrenoms || '',
                                                login: member.userLogin || ''
                                            });
                                        }
                                        
                                        // Séparer les membres actifs des anciens membres
                                        if (hasLeft) {
                                            formerMembers.push({
                                                userId: member.userId,
                                                leftAt: member.leftAt || null,
                                                role: member.role || false,
                                                hasDefinitivelyLeft: member.hasDefinitivelyLeft || false
                                            });
                                        } else {
                                            participants.push(member.userId);
                                            if (member.role === true) {
                                                admins.push(member.userId);
                                            }
                                        }
                                    }
                                });
                                
                                // Mettre à jour la conversation dans le cache
                                group.participants = participants;
                                group.admins = admins;
                                group.formerMembers = formerMembers;
                                
                                // Mettre à jour currentConversation aussi
                                if (currentConversation && currentConversation.id === groupId) {
                                    currentConversation.participants = participants;
                                    currentConversation.admins = admins;
                                    currentConversation.formerMembers = formerMembers;
                                }
                                
                                // Si le panneau d'infos est ouvert, le rafraîchir
                                if (!$('#conversation-info-panel').hasClass('hidden') && currentConversation && currentConversation.id === groupId) {
                                    renderConversationInfo();
                                }
                            })
                            .fail(function(xhr, status, error) {
                                console.error('Erreur lors du chargement des participants:', error);
                            });
                    });
                });
            }
        }
    } else {
        // Pour les groupes, trier : utilisateur connecté → admins → autres
        let sortedParticipants = [...participants];
        sortedParticipants.sort((a, b) => {
            const aIsCurrentUser = a.id === currentUser.id;
            const bIsCurrentUser = b.id === currentUser.id;
            const aIsAdmin = currentConversation.admins && currentConversation.admins.includes(a.id);
            const bIsAdmin = currentConversation.admins && currentConversation.admins.includes(b.id);
            
            // Utilisateur connecté en premier
            if (aIsCurrentUser) return -1;
            if (bIsCurrentUser) return 1;
            
            // Ensuite les admins
            if (aIsAdmin && !bIsAdmin) return -1;
            if (!aIsAdmin && bIsAdmin) return 1;
            
            // Enfin tri alphabétique pour les autres
            const aName = `${a.prenoms} ${a.nom}`.toLowerCase();
            const bName = `${b.prenoms} ${b.nom}`.toLowerCase();
            return aName.localeCompare(bName);
        });
        
        // Afficher les membres actifs
        sortedParticipants.forEach(user => {
        const userIsAdmin = currentConversation.admins && currentConversation.admins.includes(user.id);
        const isCurrentUser = user.id === currentUser.id;
        
        const memberHtml = `
            <div class="group flex items-center justify-between p-3 hover:bg-gray-700 rounded">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                        <span class="text-white font-semibold">${(user.prenoms || '').charAt(0) || (user.nom || '').charAt(0) || '?'}</span>
                    </div>
                    <div>
                        <p class="text-white font-medium">${isGroup && isCurrentUser ? 'Vous' : `${user.prenoms} ${user.nom}`}</p>
                        ${!isGroup || !isCurrentUser ? `<p class="text-gray-400 text-sm">@${user.login}</p>` : ''}
                    </div>
                </div>
                <div class="flex flex-col items-end" style="min-width: 80px;">
                    ${userIsAdmin ? '<span class="text-green-400 text-sm mb-1">Admin</span>' : '<span class="mb-1" style="height: 1.25rem;"></span>'}
                    ${isAdmin && !isCurrentUser ? `
                        <div class="relative member-menu-container">
                            <button class="member-menu-btn text-gray-400 hover:text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-user-id="${user.id}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                            <div class="member-menu hidden absolute right-0 mt-1 w-48 bg-gray-700 rounded-lg shadow-lg py-1 z-10">
                                ${userIsAdmin ? 
                                    `<button class="w-full text-left px-4 py-2 text-white hover:bg-gray-600 demote-admin-btn" data-user-id="${user.id}">Retirer admin</button>` :
                                    `<button class="w-full text-left px-4 py-2 text-white hover:bg-gray-600 promote-admin-btn" data-user-id="${user.id}">Nommer admin</button>`
                                }
                                <button class="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-600 remove-member-btn" data-user-id="${user.id}">Retirer du groupe</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        $membersList.append(memberHtml);
    });
    
    // Afficher les anciens membres s'il y en a
    if (currentConversation.formerMembers && currentConversation.formerMembers.length > 0) {
        // Ajouter un séparateur
        $membersList.append('<div class="border-t border-gray-700 my-4"></div>');
        $membersList.append('<h5 class="text-gray-400 font-semibold mb-3 text-sm">Anciens membres</h5>');
        
        currentConversation.formerMembers.forEach(formerMember => {
            const user = getUserById(formerMember.userId);
            if (!user) return;
            
            const leftAtText = formerMember.leftAt ? formatTime(formerMember.leftAt) : 'Date inconnue';
            const wasAdmin = formerMember.role === true;
            
            const formerMemberHtml = `
                <div class="flex items-center justify-between p-3 hover:bg-gray-700 rounded opacity-60">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                            <span class="text-white font-semibold">${(user.prenoms || '').charAt(0) || (user.nom || '').charAt(0) || '?'}</span>
                        </div>
                        <div>
                            <p class="text-white font-medium">${user.prenoms} ${user.nom}</p>
                            <p class="text-gray-400 text-sm">@${user.login}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end">
                        ${wasAdmin ? '<span class="text-green-400 text-xs mb-1">Ancien admin</span>' : ''}
                        <span class="text-gray-500 text-xs">Sorti le ${leftAtText}</span>
                    </div>
                </div>
            `;
            
            $membersList.append(formerMemberHtml);
        });
        }
    }
    
    // Événements sur les menus membres
    $('.member-menu-btn').click(function(e) {
        e.stopPropagation();
        const $menu = $(this).siblings('.member-menu');
        $('.member-menu').not($menu).hide();
        $menu.toggle();
    });
    
    // Fermer les menus si on clique ailleurs
    $(document).click(function() {
        $('.member-menu').hide();
    });
    
    // Actions sur les membres
    $('.promote-admin-btn').click(function() {
        const userId = parseInt($(this).data('user-id'));
        promoteToAdmin(userId);
    });
    
    $('.demote-admin-btn').click(function() {
        const userId = parseInt($(this).data('user-id'));
        demoteFromAdmin(userId);
    });
    
    $('.remove-member-btn').click(function() {
        const userId = parseInt($(this).data('user-id'));
        removeMemberFromGroup(userId);
    });
    
    // Afficher/masquer les boutons admin (seulement pour les groupes)
    if (isGroup && isAdmin) {
        $('#admin-actions').show();
        
        // Bouton ajouter membre
        $('#admin-actions button').off('click').click(function() {
            showAddMemberModal(currentConversation.id);
        });
    } else {
        $('#admin-actions').hide();
    }
    
    // Mettre à jour le titre de la section membres
    // Pour les conversations privées, ne pas afficher de titre de section
    if (isGroup) {
        $('#members-section-title').text('Membres').show();
    } else {
        $('#members-section-title').hide();
    }
    
    // Mettre à jour le bouton quitter/supprimer
    if (isGroup) {
        const userHasLeft = currentConversation.userHasLeft === true;
        if (userHasLeft) {
            $('#leave-btn-text').text('Supprimer la conversation');
        } else {
            $('#leave-btn-text').text('Quitter le groupe');
        }
    } else {
        $('#leave-btn-text').text('Supprimer la conversation');
    }
    
    // Mettre à jour l'icône du groupe/conversation dans le panneau
    const iconSvg = $('#conversation-info-panel .w-20 svg');
    if (isGroup) {
        iconSvg.html('<path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>');
    } else {
        iconSvg.html('<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>');
    }
}

function handleImageUpload(file) {
    if (!file) return;
    
    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
        showError('Veuillez sélectionner une image');
        return;
    }
    
    // Afficher l'aperçu
    const reader = new FileReader();
    reader.onload = function(e) {
        $('#image-preview').html(`
            <div class="relative inline-block mb-2">
                <img src="${e.target.result}" class="max-h-32 rounded" />
                <button id="remove-image" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
                    ×
                </button>
            </div>
        `).show();
        
        $('#remove-image').click(function() {
            $('#image-preview').hide().empty();
            $('#image-input').val('');
        });
    };
    reader.readAsDataURL(file);
}

function filterConversations(query) {
    $('.conversation-item').each(function() {
        const title = $(this).find('h3').text().toLowerCase();
        if (title.includes(query)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

function showConversationMenu(e, convId, convType, buttonElement) {
    // Supprimer le menu existant s'il y en a un
    $('.conversation-context-menu').remove();
    
    const isPrivate = convType === 'private';
    const conv = getConversationById(convId);
    const isGroup = convType === 'group';
    const userHasLeft = conv && conv.userHasLeft === true;
    
    const menu = $(`
        <div class="conversation-context-menu fixed bg-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[150px]" style="top: ${e.pageY + 5}px; left: ${e.pageX - 120}px;">
            <button class="menu-item-export w-full text-left px-4 py-2 text-white hover:bg-gray-600 flex items-center" data-conv-id="${convId}">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Exporter
            </button>
            ${isPrivate || (isGroup && userHasLeft) ? `
                <button class="menu-item-delete w-full text-left px-4 py-2 text-red-400 hover:bg-gray-600 flex items-center" data-conv-id="${convId}">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Supprimer
                </button>
            ` : ''}
        </div>
    `);
    
    $('body').append(menu);
    
    // Fermer le menu en cliquant ailleurs
    setTimeout(() => {
        const closeMenu = (clickEvent) => {
            if (!menu.is(clickEvent.target) && !menu.has(clickEvent.target).length && !buttonElement.is(clickEvent.target)) {
                menu.remove();
                $(document).off('click', closeMenu);
            }
        };
        $(document).on('click', closeMenu);
    }, 0);
    
    // Actions du menu
    menu.find('.menu-item-export').click(function(e) {
        e.stopPropagation();
        const id = parseInt($(this).data('conv-id'));
        exportConversation(id);
        menu.remove();
    });
    
    // Gérer le clic sur "Supprimer" pour les conversations privées ET les groupes quittés
    if (isPrivate || (isGroup && userHasLeft)) {
        menu.find('.menu-item-delete').click(function(e) {
            e.stopPropagation();
            const id = parseInt($(this).data('conv-id'));
            deleteConversation(id);
            menu.remove();
        });
    }
}

function exportAllConversations() {
    showLoader(true);
    
    apiExportAllConversations()
        .done(function(response) {
            showLoader(false);
            
            if (response.hasError) {
                showError(response.status?.message || 'Erreur lors de l\'export');
                return;
            }
            
            if (response.fileName) {
                const downloadUrl = apiDownloadZipExport(response.fileName);
                window.open(downloadUrl, '_blank');
                
                // Afficher un message avec le nombre de conversations si disponible
                const count = response.count || 0;
                const message = count > 0 
                    ? `Export téléchargé (${count} conversation${count > 1 ? 's' : ''})`
                    : 'Export téléchargé';
                showSuccess(message);
            } else {
                showError('Aucun fichier généré');
            }
        })
        .fail(function(xhr, status, error) {
            showLoader(false);
            showError('Erreur lors de l\'export: ' + error);
            console.error('Erreur exportAllConversations:', error);
        });
}

// Fonction pour exporter une conversation
function exportConversation(convId) {
    const conv = getConversationById(convId);
    if (!conv) return;
    
    showLoader(true);
    
    apiExportConversation(convId)
        .done(function(response) {
            showLoader(false);
            
            if (response.hasError) {
                showError(response.status?.message || 'Erreur lors de l\'export');
                return;
            }
            
            if (response.fileName) {
                const downloadUrl = apiDownloadExport(response.fileName);
                window.open(downloadUrl, '_blank');
                showSuccess(`Export de "${conv.titre}" téléchargé`);
            } else {
                showError('Aucun fichier généré');
            }
        })
        .fail(function(xhr, status, error) {
            showLoader(false);
            showError('Erreur lors de l\'export: ' + error);
            console.error('Erreur exportConversation:', error);
        });
}

// Fonction pour supprimer une conversation
function deleteConversation(convId) {
    const conv = getConversationById(convId);
    if (!conv) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer la conversation "${conv.titre}" ?`)) {
        showLoader(true);
        
        apiDeleteConversation(convId)
            .done(function(response) {
                showLoader(false);
                
                if (response.hasError) {
                    showError(response.status?.message || 'Erreur lors de la suppression de la conversation');
                    return;
                }
                
                // Retirer de la liste
                CONVERSATIONS = CONVERSATIONS.filter(c => c.id !== convId);
                
                // Si c'est la conversation courante, revenir à l'état vide
                if (currentConversation && currentConversation.id === convId) {
                    currentConversation = null;
                    $('#empty-state').removeClass('hidden');
                    $('#chat-zone').addClass('hidden');
                    $('#conversation-info-panel').addClass('hidden');
                }
                
                // Recharger les conversations
                loadConversations();
                
                showSuccess('Conversation supprimée');
            })
            .fail(function(xhr, status, error) {
                showLoader(false);
                showError('Erreur lors de la suppression de la conversation: ' + error);
                console.error('Erreur deleteConversation:', error);
            });
    }
}

// Promouvoir un membre en admin
function promoteToAdmin(userId) {
    if (!currentConversation) return;
    
    const user = getUserById(userId);
    
    showConfirmModal(
        'Nommer administrateur',
        `Voulez-vous nommer ${user.prenoms} ${user.nom} comme administrateur ?`,
        function() {
            showLoader(true);
            
            apiPromoteToAdmin(currentConversation.id, userId)
                .done(function(response) {
                    showLoader(false);
                    
                    if (response.hasError) {
                        showError(response.status?.message || 'Erreur lors de la promotion');
                        return;
                    }
                    
                    // Recharger les participants depuis l'API pour mettre à jour les admins
                    loadConversationParticipants(currentConversation.id, function() {
                        // Recharger les infos si le panneau est ouvert
                        if (!$('#conversation-info-panel').hasClass('hidden')) {
                            renderConversationInfo();
                        }
                    });
                    
                    showSuccess(`${user.prenoms} est maintenant administrateur`);
                })
                .fail(function(xhr, status, error) {
                    showLoader(false);
                    showError('Erreur lors de la promotion: ' + error);
                    console.error('Erreur promoteToAdmin:', error);
                });
        },
        null,
        'Confirmer',
        'Annuler',
        false
    );
}

// Rétrograder un admin
function demoteFromAdmin(userId) {
    if (!currentConversation) return;
    
    const user = getUserById(userId);
    
    // Vérifier qu'il reste au moins un admin
    if (currentConversation.admins && currentConversation.admins.length <= 1) {
        showError('Il doit rester au moins un administrateur');
        return;
    }
    
    showConfirmModal(
        'Retirer les droits d\'administrateur',
        `Voulez-vous retirer les droits d'administrateur à ${user.prenoms} ${user.nom} ?`,
        function() {
            showLoader(true);
            
            apiDemoteFromAdmin(currentConversation.id, userId)
                .done(function(response) {
                    showLoader(false);
                    
                    if (response.hasError) {
                        showError(response.status?.message || 'Erreur lors de la rétrogradation');
                        return;
                    }
                    
                    // Recharger les participants depuis l'API pour mettre à jour les admins
                    loadConversationParticipants(currentConversation.id, function() {
                        // Recharger les infos si le panneau est ouvert
                        if (!$('#conversation-info-panel').hasClass('hidden')) {
                            renderConversationInfo();
                        }
                    });
                    
                    showSuccess(`${user.prenoms} n'est plus administrateur`);
                })
                .fail(function(xhr, status, error) {
                    showLoader(false);
                    showError('Erreur lors de la rétrogradation: ' + error);
                    console.error('Erreur demoteFromAdmin:', error);
                });
        },
        null,
        'Retirer',
        'Annuler',
        false
    );
}

// Retirer un membre du groupe
function removeMemberFromGroup(userId) {
    if (!currentConversation) return;
    
    const user = getUserById(userId);
    
    // Vérifier si c'est un admin
    const isAdmin = currentConversation.admins && currentConversation.admins.includes(userId);
    if (isAdmin && currentConversation.admins && currentConversation.admins.length <= 1) {
        showError('Impossible de retirer le dernier administrateur');
        return;
    }
    
    showConfirmModal(
        'Retirer du groupe',
        `Voulez-vous retirer ${user.prenoms} ${user.nom} du groupe ?`,
        function() {
            showLoader(true);
            
            apiRemoveMemberFromGroup(currentConversation.id, userId)
                .done(function(response) {
                    showLoader(false);
                    
                    if (response.hasError) {
                        showError(response.status?.message || 'Erreur lors du retrait du membre');
                        return;
                    }
                    
                    // Recharger les participants depuis l'API
                    loadConversationParticipants(currentConversation.id, function() {
                        // Recharger les infos si le panneau est ouvert
                        if (!$('#conversation-info-panel').hasClass('hidden')) {
                            renderConversationInfo();
                        }
                        // Fermer et rouvrir le modal d'ajout de membre s'il est ouvert pour mettre à jour la liste
                        if ($('#add-member-modal').length > 0) {
                            const convId = currentConversation.id;
                            closeAddMemberModal();
                            setTimeout(() => {
                                showAddMemberModal(convId);
                            }, 100);
                        }
                    });
                    
                    showSuccess(`${user.prenoms} a été retiré du groupe`);
                })
                .fail(function(xhr, status, error) {
                    showLoader(false);
                    showError('Erreur lors du retrait du membre: ' + error);
                    console.error('Erreur removeMemberFromGroup:', error);
                });
        },
        null,
        'Retirer',
        'Annuler',
        true
    );
}