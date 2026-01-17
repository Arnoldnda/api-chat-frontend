// API Service - Centralisation de tous les appels API

/**
 * Construit une requête standard pour l'API
 */
function buildRequest(data = null, datas = null, index = 0, size = 100, isSimpleLoading = false) {
    const currentUser = getCurrentUser();
    const request = {
        user: currentUser ? currentUser.id : null,
        index: index,
        size: size,
        isSimpleLoading: isSimpleLoading
    };
    
    if (data !== null) {
        request.data = data;
    }
    
    if (datas !== null && Array.isArray(datas)) {
        request.datas = datas;
    }
    
    return request;
}

/**
 * CONVERSATIONS
 */

/**
 * Récupère la liste des conversations actives de l'utilisateur
 */
function apiGetConversations(index = 0, size = 100) {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) {
        console.error('Utilisateur non connecté');
        return $.Deferred().reject({ status: 401, responseJSON: { status: { message: 'Utilisateur non connecté' } } });
    }
    
    const request = buildRequest(
        { userId: currentUser.id },
        null,
        index,
        size,
        true  // isSimpleLoading = true pour obtenir les dates avec heure
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_GET_BY_CRITERIA),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Crée un nouveau groupe
 */
function apiCreateGroup(titre, participantIds) {
    const request = buildRequest(
        null,
        [{
            titre: titre,
            participantIds: participantIds
        }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_CREATE),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Exporte une conversation
 */
function apiExportConversation(conversationId) {
    const request = buildRequest(
        null,
        [{ id: conversationId }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_EXPORT),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Exporte toutes les conversations
 */
function apiExportAllConversations() {
    const request = buildRequest(
        null,  // data
        [{}]   // datas - tableau avec un objet vide comme attendu par l'API
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_EXPORT_ALL),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Télécharge un fichier d'export
 */
function apiDownloadExport(fileName) {
    return getApiUrl(`${CONFIG.ROUTES.CONVERSATION_DOWNLOAD}/${fileName}`);
}

/**
 * Télécharge un fichier ZIP d'export
 */
function apiDownloadZipExport(fileName) {
    return getApiUrl(`${CONFIG.ROUTES.CONVERSATION_DOWNLOAD_ZIP}/${fileName}`);
}

/**
 * MESSAGES
 */

/**
 * Envoie un message privé (crée la conversation si elle n'existe pas)
 */
function apiSendPrivateMessage(receiverId, typeMessageCode, content = null, imgUrl = null) {
    const messageData = {
        receiverId: receiverId,
        typeMessageCode: typeMessageCode
    };
    
    if (content) {
        messageData.content = content;
    }
    
    if (imgUrl) {
        messageData.imgUrl = imgUrl;
    }
    
    const request = buildRequest(null, [messageData]);
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.MESSAGE_PRIVATE_SEND),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Envoie un message dans un groupe
 */
function apiSendGroupMessage(conversationId, typeMessageCode, content = null, imgUrl = null) {
    const messageData = {
        conversationId: conversationId,
        typeMessageCode: typeMessageCode
    };
    
    if (content) {
        messageData.content = content;
    }
    
    if (imgUrl) {
        messageData.imgUrl = imgUrl;
    }
    
    const request = buildRequest(null, [messageData]);
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.MESSAGE_GROUP_SEND),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Récupère les messages d'une conversation
 */
function apiGetMessages(conversationId, index = 0, size = 100) {
    if (!conversationId) {
        console.error('conversationId is required');
        return $.Deferred().reject({ status: 400, responseJSON: { status: { message: 'conversationId is required' } } });
    }
    
    const request = buildRequest(
        { conversationId: conversationId },
        null,
        index,
        size,
        true  // isSimpleLoading = true pour obtenir les dates avec heure
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.MESSAGE_GET_BY_CRITERIA),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Récupère le dernier message visible (isHiden: false) d'une conversation
 * Utilise /message/getByCriteria avec conversationId et isSimpleLoading: true
 */
function apiGetLastVisibleMessage(conversationId) {
    if (!conversationId) {
        console.error('conversationId is required');
        return $.Deferred().reject({ status: 400, responseJSON: { status: { message: 'conversationId is required' } } });
    }
    
    const request = buildRequest(
        { conversationId: conversationId },
        null,
        0,
        100, // Charger plusieurs messages pour trouver le dernier visible
        true // isSimpleLoading = true pour avoir la date complète avec l'heure
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.MESSAGE_GET_BY_CRITERIA),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Upload une image
 */
function apiUploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return $.ajax({
        url: getApiUrl(CONFIG.ROUTES.MESSAGE_UPLOAD_IMAGE),
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false
    });
}

/**
 * SUPPRESSION DE MESSAGE
 */

/**
 * Supprime un message localement (pour l'utilisateur)
 */
function apiDeleteMessage(messageId) {
    const request = buildRequest(
        null,
        [{ messageId: messageId }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.HISTORIQUE_DELETE_MESSAGE),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * GESTION DES MEMBRES (ConversationUser)
 */

/**
 * Ajoute un membre à un groupe
 */
function apiAddMemberToGroup(conversationId, userId) {
    const request = buildRequest(
        null,
        [{
            conversationId: conversationId,
            userId: userId
        }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_USER_GROUP_ADD),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Retire un membre d'un groupe
 */
function apiRemoveMemberFromGroup(conversationId, userId) {
    const request = buildRequest(
        null,
        [{
            conversationId: conversationId,
            userId: userId
        }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_USER_GROUP_REMOVE),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Quitte un groupe
 */
function apiLeaveGroup(conversationId) {
    const request = buildRequest(
        null,
        [{ conversationId: conversationId }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_USER_GROUP_LEAVE),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Supprime une conversation localement (marque hasCleaned = true)
 */
function apiDeleteConversation(conversationId) {
    const request = buildRequest(
        null,
        [{ conversationId: conversationId }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_USER_DELETE),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Promouvoit un membre en admin
 */
function apiPromoteToAdmin(conversationId, userId) {
    const request = buildRequest(
        null,
        [{
            conversationId: conversationId,
            userId: userId
        }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_USER_PROMOTE),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Rétrograde un admin
 */
function apiDemoteFromAdmin(conversationId, userId) {
    const request = buildRequest(
        null,
        [{
            conversationId: conversationId,
            userId: userId
        }]
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_USER_DEMOTE),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Récupère la liste des membres d'une conversation
 */
function apiGetConversationMembers(conversationId) {
    if (!conversationId) {
        console.error('conversationId is required');
        return $.Deferred().reject({ status: 400, responseJSON: { status: { message: 'conversationId is required' } } });
    }
    
    const request = buildRequest(
        { conversationId: conversationId }
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.CONVERSATION_USER_GET_BY_CRITERIA),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * UTILISATEURS
 */

/**
 * Récupère la liste des utilisateurs
 */
function apiGetUsers(index = 0, size = 100) {
    const request = buildRequest(
        {},
        null,
        index,
        size
    );
    
    return apiRequest({
        url: getApiUrl(CONFIG.ROUTES.USER_GET_BY_CRITERIA),
        method: 'POST',
        data: JSON.stringify(request)
    });
}
