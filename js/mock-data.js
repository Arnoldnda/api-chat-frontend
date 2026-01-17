// Données mockées pour tester sans API

// Utilisateur connecté (récupéré du localStorage normalement)
const CURRENT_USER = {
    id: 5,
    login: "ewilson",
    nom: "Wilson",
    prenoms: "Emma"
};

// Liste des utilisateurs disponibles
const USERS = [
    { id: 1, login: "jdoe", nom: "Doe", prenoms: "John" },
    { id: 2, login: "asmith", nom: "Smith", prenoms: "Alice" },
    { id: 3, login: "bmartin", nom: "Martin", prenoms: "Bob" },
    { id: 4, login: "cjones", nom: "Jones", prenoms: "Claire" },
    { id: 5, login: "ewilson", nom: "Wilson", prenoms: "Emma" },
    { id: 6, login: "ftaylor", nom: "Taylor", prenoms: "Frank" },
    { id: 7, login: "gbrown", nom: "Brown", prenoms: "Grace" },
    { id: 8, login: "hdavis", nom: "Davis", prenoms: "Henry" }
];

// Conversations mockées
let CONVERSATIONS = [
    {
        id: 1,
        type: "private", // private ou group
        titre: "Alice Smith",
        participants: [5, 2], // IDs des users
        lastMessage: "Ok merci pour l'info",
        lastMessageTime: "23:45",
        lastMessageDate: new Date(),
        avatar: null
    },
    {
        id: 2,
        type: "group",
        titre: "Young Developers",
        participants: [5, 1, 3, 6], // IDs des users
        admins: [5], // IDs des admins
        lastMessage: "Genre tu cries sur nous quoi",
        lastMessageTime: "23:12",
        lastMessageDate: new Date(),
        avatar: null
    },
    {
        id: 3,
        type: "private",
        titre: "Bob Martin",
        participants: [5, 3],
        lastMessage: "À demain !",
        lastMessageTime: "22:30",
        lastMessageDate: new Date(Date.now() - 3600000),
        avatar: null
    },
    {
        id: 4,
        type: "group",
        titre: "Équipe Projet",
        participants: [5, 1, 2, 4, 7],
        admins: [5, 1],
        lastMessage: "La réunion est à 14h",
        lastMessageTime: "Hier",
        lastMessageDate: new Date(Date.now() - 86400000),
        avatar: null
    }
];

// Messages mockés par conversation
let MESSAGES = {
    1: [
        { id: 1, conversationId: 1, senderId: 2, content: "Salut ! Comment ça va ?", type: "text", createdAt: new Date(Date.now() - 7200000) },
        { id: 2, conversationId: 1, senderId: 5, content: "Ça va bien merci ! Et toi ?", type: "text", createdAt: new Date(Date.now() - 7000000) },
        { id: 3, conversationId: 1, senderId: 2, content: "Super ! Tu as vu le dernier projet ?", type: "text", createdAt: new Date(Date.now() - 6800000) },
        { id: 4, conversationId: 1, senderId: 5, content: "Oui c'est génial !", type: "text", createdAt: new Date(Date.now() - 6600000) },
        { id: 5, conversationId: 1, senderId: 2, content: "Ok merci pour l'info", type: "text", createdAt: new Date(Date.now() - 100000) }
    ],
    2: [
        { id: 6, conversationId: 2, senderId: 1, content: "Salut l'équipe !", type: "text", createdAt: new Date(Date.now() - 10800000) },
        { id: 7, conversationId: 2, senderId: 5, content: "Hey ! 👋", type: "text", createdAt: new Date(Date.now() - 10700000) },
        { id: 8, conversationId: 2, senderId: 3, content: "On se voit demain ?", type: "text", createdAt: new Date(Date.now() - 10500000) },
        { id: 9, conversationId: 2, senderId: 6, content: "Genre tu cries sur nous quoi", type: "text", createdAt: new Date(Date.now() - 200000) }
    ],
    3: [
        { id: 10, conversationId: 3, senderId: 3, content: "On se fait un café ?", type: "text", createdAt: new Date(Date.now() - 14400000) },
        { id: 11, conversationId: 3, senderId: 5, content: "Oui bonne idée !", type: "text", createdAt: new Date(Date.now() - 14300000) },
        { id: 12, conversationId: 3, senderId: 3, content: "À demain !", type: "text", createdAt: new Date(Date.now() - 3600000) }
    ],
    4: [
        { id: 13, conversationId: 4, senderId: 1, content: "N'oubliez pas la réunion", type: "text", createdAt: new Date(Date.now() - 86400000) },
        { id: 14, conversationId: 4, senderId: 5, content: "La réunion est à 14h", type: "text", createdAt: new Date(Date.now() - 86300000) }
    ]
};

// Fonctions utilitaires pour les données mockées

function getUserById(userId) {
    return USERS.find(u => u.id === userId);
}

function getConversationById(convId) {
    return CONVERSATIONS.find(c => c.id === convId);
}

function getMessagesByConversation(convId) {
    return MESSAGES[convId] || [];
}

function isUserAdmin(conversationId, userId) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mock-data.js:109',message:'isUserAdmin entry',data:{conversationId:conversationId,userId:userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const conv = getConversationById(conversationId);
    const result = conv && conv.admins && conv.admins.includes(userId);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mock-data.js:111',message:'isUserAdmin exit',data:{conversationId:conversationId,userId:userId,hasConv:!!conv,hasAdmins:!!(conv&&conv.admins),admins:conv?.admins||[],result:result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
}

function getConversationParticipants(conversationId) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mock-data.js:114',message:'getConversationParticipants entry',data:{conversationId:conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const conv = getConversationById(conversationId);
    if (!conv) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mock-data.js:116',message:'getConversationParticipants - conv not found',data:{conversationId:conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return [];
    }
    const result = conv.participants.map(uid => getUserById(uid)).filter(u => u);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/51a9e05f-773a-4280-97c3-7272c623043e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mock-data.js:117',message:'getConversationParticipants exit',data:{conversationId:conversationId,participantsCount:conv.participants.length,resultCount:result.length,participantIds:conv.participants},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
}

// function formatTime(date) {

//     const now = new Date();
//     const diff = now - date;
//     const hours = Math.floor(diff / 3600000);
//     const days = Math.floor(diff / 86400000);
    
//     if (days > 0) {
//         if (days === 1) return "Hier";
//         if (days < 7) return days + "j";
//         return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
//     }
    
//     return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
// }

function formatTime(dateValue) {

    if (!dateValue) return "";

    let date;

    // Si c'est déjà un Date
    if (dateValue instanceof Date) {
        date = dateValue;
    } 
    // Si c'est une string
    else if (typeof dateValue === "string") {

        // Format: YYYY-MM-DD HH:mm:ss.S
        if (dateValue.includes("-")) {
            date = new Date(dateValue.replace(" ", "T"));
        }
        // Format: DD/MM/YYYY
        else if (dateValue.includes("/")) {
            const [day, month, year] = dateValue.split("/");
            date = new Date(`${year}-${month}-${day}`);
        }
    }

    if (!date || isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);

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
