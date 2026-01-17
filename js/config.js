//configuration de l'application 
const CONFIG = {
    //URL de base de l'api 
    API_URL: 'http://localhost:8080',

    // Routes de l'api 
    ROUTES: {
        LOGIN: '/user/login',
        REGISTER: '/user/create',
        // Conversations
        CONVERSATION_GET_BY_CRITERIA: '/conversation/getByCriteria',
        CONVERSATION_CREATE: '/conversation/create',
        CONVERSATION_EXPORT: '/conversation/export',
        CONVERSATION_EXPORT_ALL: '/conversation/export/all',
        CONVERSATION_DOWNLOAD: '/conversation/download',
        CONVERSATION_DOWNLOAD_ZIP: '/conversation/download/zip',
        // Messages
        MESSAGE_PRIVATE_SEND: '/message/private/send',
        MESSAGE_GROUP_SEND: '/message/group/send',
        MESSAGE_GET_BY_CRITERIA: '/message/getByCriteria',
        MESSAGE_UPLOAD_IMAGE: '/message/upload-image',
        // Suppression message
        HISTORIQUE_DELETE_MESSAGE: '/historiqueSuppressionMessage/deleteMessage',
        // ConversationUser
        CONVERSATION_USER_GROUP_ADD: '/conversationUser/group/add',
        CONVERSATION_USER_GROUP_REMOVE: '/conversationUser/group/remove',
        CONVERSATION_USER_GROUP_LEAVE: '/conversationUser/group/leave',
        CONVERSATION_USER_DELETE: '/conversationUser/deleteConversation',
        CONVERSATION_USER_PROMOTE: '/conversationUser/promoveToAdmin',
        CONVERSATION_USER_DEMOTE: '/conversationUser/demoteFromAdmin',
        CONVERSATION_USER_GET_BY_CRITERIA: '/conversationUser/getByCriteria',
        // Users
        USER_GET_BY_CRITERIA: '/user/getByCriteria'
    },

    //clés pour le localstorage 
    STORAGE_KEYS: {
        USER: 'chat_user'
    },

    // ID de l'utilisateur système pour les créations (à ajuster selon votre besoin)
    SYSTEM_USER_ID: 1

}; 

// function pour construire l'url complète 
function getApiUrl(route) {
    return CONFIG.API_URL + route; 
}