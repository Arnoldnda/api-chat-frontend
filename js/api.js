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
    const request = buildRequest(
        { userId: currentUser.id },
        null,
        index,
        size
    );
    
    return apiRequest({
        url: getApiUrl('/conversation/getByCriteria'),
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
        url: getApiUrl('/conversation/create'),
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
        url: getApiUrl('/conversation/export'),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Exporte toutes les conversations
 */
function apiExportAllConversations() {
    const request = buildRequest();
    
    return apiRequest({
        url: getApiUrl('/conversation/export/all'),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Télécharge un fichier d'export
 */
function apiDownloadExport(fileName) {
    return getApiUrl(`/conversation/download/${fileName}`);
}

/**
 * Télécharge un fichier ZIP d'export
 */
function apiDownloadZipExport(fileName) {
    return getApiUrl(`/conversation/download/zip/${fileName}`);
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
        url: getApiUrl('/message/private/send'),
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
        url: getApiUrl('/message/group/send'),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Récupère les messages d'une conversation
 */
function apiGetMessages(conversationId, index = 0, size = 100) {
    const request = buildRequest(
        { conversationId: conversationId },
        null,
        index,
        size
    );
    
    return apiRequest({
        url: getApiUrl('/message/getByCriteria'),
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
        url: getApiUrl('/message/upload-image'),
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
        url: getApiUrl('/historiqueSuppressionMessage/deleteMessage'),
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
        url: getApiUrl('/conversationUser/group/add'),
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
        url: getApiUrl('/conversationUser/group/remove'),
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
        url: getApiUrl('/conversationUser/group/leave'),
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
        url: getApiUrl('/conversationUser/deleteConversation'),
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
        url: getApiUrl('/conversationUser/promoveToAdmin'),
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
        url: getApiUrl('/conversationUser/demoteFromAdmin'),
        method: 'POST',
        data: JSON.stringify(request)
    });
}

/**
 * Récupère la liste des membres d'une conversation
 */
function apiGetConversationMembers(conversationId) {
    const request = buildRequest(
        { conversationId: conversationId }
    );
    
    return apiRequest({
        url: getApiUrl('/conversationUser/getByCriteria'),
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
        url: getApiUrl('/user/getByCriteria'),
        method: 'POST',
        data: JSON.stringify(request)
    });
}
