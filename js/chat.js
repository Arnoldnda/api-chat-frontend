// Logique de la page chat

let currentConversation = null;
let currentUser = null;
let conversationFilter = 'all'; // 'all' ou 'groups'
// Cache pour stocker les titres personnalisés des conversations privées
let privateConversationTitles = {}; // { conversationId: "Titre personnalisé" }

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
    
    // Upload d'image
    $('#btn-upload-image').click(function() {
        $('#image-input').click();
    });
    
    $('#image-input').change(function(e) {
        handleImageUpload(e.target.files[0]);
    });
    
    // Infos du groupe/conversation
    $('#btn-conversation-info').click(function() {
        toggleConversationInfo();
    });
    
    // Clic sur le header de conversation pour afficher les infos
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
                if (confirm('Êtes-vous sûr de vouloir quitter ce groupe ?')) {
                    showLoader(true);
                    
                    apiLeaveGroup(currentConversation.id)
                        .done(function(response) {
                            showLoader(false);
                            
                            if (response.hasError) {
                                showError(response.status?.message || 'Erreur lors de la sortie du groupe');
                                return;
                            }
                            
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversations',message:'loadConversations already in progress, skipping',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
        // #endregion
        return;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversations',message:'loadConversations entry',data:{conversationsCount:CONVERSATIONS.length,conversationsIds:CONVERSATIONS.map(c=>c.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    isLoadingConversations = true;
    const $list = $('#conversations-list');
    $list.empty();
    showLoader(true);
    
    apiGetConversations()
        .done(function(response) {
            showLoader(false);
            
            if (response.hasError) {
                showError(response.status?.message || 'Erreur lors du chargement des conversations');
                return;
            }
            
            if (!response.items || response.items.length === 0) {
                // Aucune conversation
                return;
            }
            
            // Mapper les données API vers le format frontend
            let conversations = response.items.map(mapConversationFromApi);
            
            // Préserver les titres mis à jour et les participants/admins des conversations existantes
            conversations = conversations.map(newConv => {
                const existingConv = CONVERSATIONS.find(c => c.id === newConv.id);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversations',message:'preserving conversation data',data:{conversationId:newConv.id,hasExistingConv:!!existingConv,newTitle:newConv.titre,existingTitle:existingConv?.titre,cachedTitle:privateConversationTitles[newConv.id]},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                // #endregion
                
                // Pour les conversations privées, vérifier d'abord le cache, puis CONVERSATIONS
                if (newConv.type === 'private') {
                    const cachedTitle = privateConversationTitles[newConv.id];
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversations',message:'checking cache for private conversation',data:{conversationId:newConv.id,cachedTitle:cachedTitle,newTitle:newConv.titre},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                    // #endregion
                    if (cachedTitle && cachedTitle !== 'PRIVATE' && cachedTitle !== 'Conversation privée') {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversations',message:'preserving private conversation title from cache',data:{conversationId:newConv.id,preservedTitle:cachedTitle},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                        // #endregion
                        newConv.titre = cachedTitle;
                    } else if (existingConv && existingConv.titre && existingConv.titre !== 'PRIVATE' && existingConv.titre !== 'Conversation privée') {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversations',message:'preserving private conversation title from CONVERSATIONS',data:{conversationId:newConv.id,preservedTitle:existingConv.titre},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                        // #endregion
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
                }
                return newConv;
            });
            
            // Filtrer les conversations
            if (conversationFilter === 'groups') {
                conversations = conversations.filter(c => c.type === 'group');
            }
            
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
            showError('Erreur lors du chargement des conversations: ' + error);
            console.error('Erreur loadConversations:', error);
        });
}

/**
 * Mappe une conversation de l'API vers le format frontend
 */
function mapConversationFromApi(apiConv) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:228',message:'mapConversationFromApi entry',data:{conversationId:apiConv.id,typeConversationCode:apiConv.typeConversationCode,hasParticipants:!!apiConv.participantIds,participantIds:apiConv.participantIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const currentUser = getCurrentUser();
    
    // Déterminer le type
    const type = apiConv.typeConversationCode === 'GROUP' ? 'group' : 'private';
    
    // Parser la date du dernier message
    let lastMessageDate = null;
    let lastMessageTime = '';
    let lastMessage = '';
    
    if (apiConv.lastMessage) {
        lastMessage = apiConv.lastMessage.content || '';
        if (apiConv.lastMessage.createdAt) {
            // Parser la date (peut être "dd/MM/yyyy" ou "2026-01-13 22:07:50.0")
            const dateStr = apiConv.lastMessage.createdAt;
            if (dateStr.includes('/')) {
                // Format "dd/MM/yyyy"
                const parts = dateStr.split('/');
                lastMessageDate = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                // Format "2026-01-13 22:07:50.0"
                lastMessageDate = new Date(dateStr);
            }
            lastMessageTime = formatTime(lastMessageDate);
        }
    }
    
    // Pour les conversations privées, déterminer le titre (nom de l'autre participant)
    let titre = apiConv.titre;
    if (type === 'private' && apiConv.titre === 'PRIVATE') {
        // Le titre sera mis à jour quand on chargera les participants
        titre = 'Conversation privée';
    }
    
    const mappedConv = {
        id: apiConv.id,
        type: type,
        titre: titre,
        participants: [], // Sera chargé séparément si nécessaire
        admins: [], // Sera chargé séparément si nécessaire
        lastMessage: lastMessage,
        lastMessageTime: lastMessageTime,
        lastMessageDate: lastMessageDate,
        avatar: null
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:263',message:'mapConversationFromApi exit',data:{conversationId:mappedConv.id,participantsCount:mappedConv.participants.length,adminsCount:mappedConv.admins.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return mappedConv;
}

function createConversationItem(conv) {
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
                        <span class="text-xs text-gray-400 ml-2">${conv.lastMessageDate ? formatTime(conv.lastMessageDate) : (conv.lastMessageTime || '')}</span>
                    </div>
                    <p class="text-sm text-gray-400 truncate">${conv.lastMessage || ''}</p>
                </div>
            </div>
            <!-- Menu trois points (visible au survol) -->
            <button class="three-dots-conv-btn absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full transition-opacity" data-conv-id="${conv.id}" data-conv-type="${conv.type}" title="Options">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5"/>
                    <circle cx="12" cy="12" r="1.5"/>
                    <circle cx="12" cy="19" r="1.5"/>
                </svg>
            </button>
        </div>
    `;
}

function selectConversation(convId) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:219',message:'selectConversation entry',data:{conversationId:convId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    currentConversation = getConversationById(convId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:221',message:'selectConversation - conv loaded',data:{conversationId:convId,hasConv:!!currentConversation,participantsCount:currentConversation?.participants?.length||0,adminsCount:currentConversation?.admins?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Marquer la conversation comme active
    $('.conversation-item').removeClass('bg-gray-700');
    $(`.conversation-item[data-id="${convId}"]`).addClass('bg-gray-700');
    
    // Afficher la zone de chat
    // $('#empty-state').hide();
    // $('#chat-zone').show();
    $('#empty-state').addClass('hidden');
    $('#chat-zone').removeClass('hidden');
    
    // Charger les participants depuis l'API (sans callback car on n'a pas besoin d'attendre)
    loadConversationParticipants(convId);
    
    // Mettre à jour le header
    updateChatHeader();
    
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'loadConversationParticipants entry',data:{conversationId:conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    
    apiGetConversationMembers(conversationId)
        .done(function(response) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'loadConversationParticipants API response',data:{conversationId:conversationId,hasError:response.hasError,itemsCount:response.items?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
            // #endregion
            
            if (response.hasError || !response.items || response.items.length === 0) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'loadConversationParticipants - no members',data:{conversationId:conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                // #endregion
                if (callback && typeof callback === 'function') {
                    callback();
                }
                return;
            }
            
            const conv = getConversationById(conversationId);
            if (!conv) return;
            
            // Mapper les membres depuis l'API
            const participants = [];
            const admins = [];
            
            response.items.forEach(member => {
                if (member.userId) {
                    participants.push(member.userId);
                    
                    // role = true signifie admin
                    if (member.role === true) {
                        admins.push(member.userId);
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
                }
            });
            
            // Mettre à jour la conversation
            conv.participants = participants;
            conv.admins = admins;
            
            // Pour les conversations privées, mettre à jour le titre avec le nom de l'autre participant
            if (conv.type === 'private' && participants.length > 0) {
                const currentUser = getCurrentUser();
                const otherParticipantId = participants.find(id => id !== currentUser.id);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'updating private conversation title',data:{conversationId:conversationId,otherParticipantId:otherParticipantId,currentUserId:currentUser.id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                // #endregion
                if (otherParticipantId) {
                    const otherUser = getUserById(otherParticipantId);
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'otherUser found',data:{conversationId:conversationId,otherUserFound:!!otherUser,otherUserNom:otherUser?.nom,otherUserPrenoms:otherUser?.prenoms},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                    // #endregion
                    if (otherUser) {
                        const newTitle = `${otherUser.prenoms} ${otherUser.nom}`;
                        conv.titre = newTitle;
                        // Mettre à jour le cache des titres personnalisés
                        privateConversationTitles[conversationId] = newTitle;
                        // Mettre à jour aussi dans CONVERSATIONS
                        const convIndex = CONVERSATIONS.findIndex(c => c.id === conversationId);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'updating CONVERSATIONS array and cache',data:{conversationId:conversationId,convIndex:convIndex,newTitle:newTitle},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                        // #endregion
                        if (convIndex >= 0) {
                            CONVERSATIONS[convIndex].titre = newTitle;
                            // Mettre à jour l'affichage dans la liste des conversations
                            const $convItem = $(`.conversation-item[data-id="${conversationId}"] h3`);
                            // #region agent log
                            fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'updating DOM title',data:{conversationId:conversationId,$convItemLength:$convItem.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                            // #endregion
                            if ($convItem.length) {
                                $convItem.text(newTitle);
                            }
                        }
                        // Mettre à jour le header si c'est la conversation courante
                        if (currentConversation && currentConversation.id === conversationId) {
                            updateChatHeader();
                        }
                    } else {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'otherUser not found in USERS',data:{conversationId:conversationId,otherParticipantId:otherParticipantId,usersCount:USERS.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
                        // #endregion
                    }
                }
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'loadConversationParticipants exit',data:{conversationId:conversationId,participantsCount:participants.length,adminsCount:admins.length,participants:participants,admins:admins},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
            // #endregion
            
            // Appeler le callback si fourni
            if (callback && typeof callback === 'function') {
                callback();
            }
        })
        .fail(function(xhr, status, error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:loadConversationParticipants',message:'loadConversationParticipants error',data:{conversationId:conversationId,error:error},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
            // #endregion
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
    
    // Toujours permettre de cliquer sur le header pour voir les infos
    // Le bouton info reste visible pour les groupes, mais le header est cliquable pour tous
    if (currentConversation.type === 'group') {
        $('#btn-conversation-info').show();
    } else {
        $('#btn-conversation-info').hide();
    }
    
    // Rendre le header cliquable visuellement
    $('#conversation-header').css('cursor', 'pointer');
}

function loadMessages() {
    if (!currentConversation) return;
    
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
            const messages = response.items.map(mapMessageFromApi);
            
            // Trier par date (du plus ancien au plus récent)
            messages.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateA - dateB;
            });
            
            // Stocker les messages pour utilisation ultérieure
            if (!MESSAGES) MESSAGES = {};
            MESSAGES[currentConversation.id] = messages;
            
            messages.forEach(msg => {
                const msgHtml = createMessageItem(msg);
                $container.append(msgHtml);
            });
            
            // Attacher les événements de suppression
            attachMessageDeleteListeners();
            
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
 * Mappe un message de l'API vers le format frontend
 */
function mapMessageFromApi(apiMsg) {
    // Parser la date
    let createdAt = null;
    if (apiMsg.createdAt) {
        const dateStr = apiMsg.createdAt;
        if (dateStr.includes('/')) {
            // Format "dd/MM/yyyy"
            const parts = dateStr.split('/');
            createdAt = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            // Format "2026-01-13 22:07:50.0"
            createdAt = new Date(dateStr);
        }
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
        createdAt: createdAt
    };
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
                
                showSuccess('Message supprimé');
            })
            .fail(function(xhr, status, error) {
                showLoader(false);
                showError('Erreur lors de la suppression du message: ' + error);
                console.error('Erreur deleteMessage:', error);
            });
    }
}

function createMessageItem(msg) {
    const isOwn = msg.senderId === currentUser.id;
    const sender = getUserById(msg.senderId);
    const time = formatTime(msg.createdAt);
    
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
    
    if (isOwn) {
        return `
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
        `;
    } else {
        return `
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:686',message:'loadConversationInfo entry',data:{conversationId:currentConversation.id,type:currentConversation.type,participantsCount:currentConversation.participants?.length||0,adminsCount:currentConversation.admins?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    
    // Toujours recharger les participants depuis l'API pour avoir les données à jour
    loadConversationParticipants(currentConversation.id, function() {
        renderConversationInfo();
    });
}

function renderConversationInfo() {
    if (!currentConversation) return;
    
    const isGroup = currentConversation.type === 'group';
    const currentUser = getCurrentUser();
    
    const participants = getConversationParticipants(currentConversation.id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:renderConversationInfo',message:'getConversationParticipants result',data:{conversationId:currentConversation.id,participantsReturned:participants.length,participantIds:participants.map(p=>p.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    const isAdmin = isGroup && isUserAdmin(currentConversation.id, currentUser.id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.js:renderConversationInfo',message:'isUserAdmin result',data:{conversationId:currentConversation.id,userId:currentUser.id,isAdmin:isAdmin},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    
    // Mettre à jour le titre du panneau
    $('#conversation-info-panel h3').text(isGroup ? 'Infos du groupe' : 'Infos de la conversation');
    
    $('#group-name').text(currentConversation.titre || 'Sans titre');
    if (isGroup) {
        $('#members-count').text(participants.length + (participants.length > 1 ? ' membres' : ' membre'));
    } else {
        // Pour les conversations privées, afficher le nom de l'autre participant
        const otherParticipant = participants.find(p => p.id !== currentUser.id);
        if (otherParticipant) {
            $('#members-count').text('Conversation privée');
        } else {
            $('#members-count').text('1 participant');
        }
    }
    
    const $membersList = $('#members-list');
    $membersList.empty();
    
    participants.forEach(user => {
        const userIsAdmin = currentConversation.admins && currentConversation.admins.includes(user.id);
        const isCurrentUser = user.id === currentUser.id;
        
        const memberHtml = `
            <div class="flex items-center justify-between p-3 hover:bg-gray-700 rounded">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                        <span class="text-white font-semibold">${(user.prenoms || '').charAt(0) || (user.nom || '').charAt(0) || '?'}</span>
                    </div>
                    <div>
                        <p class="text-white font-medium">${user.prenoms} ${user.nom}</p>
                        <p class="text-gray-400 text-sm">@${user.login}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    ${userIsAdmin ? '<span class="text-green-400 text-sm">Admin</span>' : ''}
                    ${isAdmin && !isCurrentUser ? `
                        <div class="relative member-menu-container">
                            <button class="member-menu-btn text-gray-400 hover:text-white p-1" data-user-id="${user.id}">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 6a2 2 0 110-4 2 2 0 010 4zM12 14a2 2 0 110-4 2 2 0 010 4zM12 22a2 2 0 110-4 2 2 0 010 4z"/>
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
    $('#members-section-title').text(isGroup ? 'Membres' : 'Participants');
    
    // Mettre à jour le bouton quitter/supprimer
    if (isGroup) {
        $('#leave-btn-text').text('Quitter le groupe');
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
    const menu = $(`
        <div class="conversation-context-menu fixed bg-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[150px]" style="top: ${e.pageY + 5}px; left: ${e.pageX - 120}px;">
            <button class="menu-item-export w-full text-left px-4 py-2 text-white hover:bg-gray-600 flex items-center" data-conv-id="${convId}">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Exporter
            </button>
            ${isPrivate ? `
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
    
    if (isPrivate) {
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
                showSuccess('Export téléchargé');
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
    
    if (confirm(`Voulez-vous nommer ${user.prenoms} ${user.nom} comme administrateur ?`)) {
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
    }
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
    
    if (confirm(`Voulez-vous retirer les droits d'administrateur à ${user.prenoms} ${user.nom} ?`)) {
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
    }
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
    
    if (confirm(`Voulez-vous retirer ${user.prenoms} ${user.nom} du groupe ?`)) {
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
                });
                
                showSuccess(`${user.prenoms} a été retiré du groupe`);
            })
            .fail(function(xhr, status, error) {
                showLoader(false);
                showError('Erreur lors du retrait du membre: ' + error);
                console.error('Erreur removeMemberFromGroup:', error);
            });
    }
}