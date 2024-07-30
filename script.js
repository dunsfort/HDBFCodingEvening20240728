// Global variables
let currentUser = '';
let users = [];
let messages = [];
let currentPrivateChat = null;
const emojiList = ['😀', '😂', '😍', '🤔', '😎', '👍', '❤️', '🎉', '🔥', '🌈', '🍕', '🎵', '🐱', '🌺', '🚀'];
let typingUsers = new Set();
let privateTypingUser = null;
let typingTimer;
let notificationsMuted = false;

// Initialize the application when the DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Set up the initial state of the application
function initializeApp() {
    loadStoredData();

    // Set up event listeners for various UI elements
    document.getElementById('join-chat').addEventListener('click', joinChat);
    document.getElementById('send-message').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', handleTyping);
    document.getElementById('message-input').addEventListener('keyup', handleStoppedTyping);

    document.getElementById('emoji-button').addEventListener('click', toggleEmojiPicker);

    document.getElementById('bold-button').addEventListener('click', () => formatSelection('bold'));
    document.getElementById('italic-button').addEventListener('click', () => formatSelection('italic'));
    document.getElementById('code-button').addEventListener('click', () => formatSelection('code'));

    document.getElementById('change-username').addEventListener('click', changeUsername);

    document.getElementById('users').addEventListener('click', initiatePrivateChat);
    document.getElementById('send-private-message').addEventListener('click', sendPrivateMessage);
    document.getElementById('private-message-input').addEventListener('keypress', handlePrivateTyping);
    document.getElementById('private-message-input').addEventListener('keyup', handlePrivateStoppedTyping);

    document.getElementById('back-to-public').addEventListener('click', backToPublicChat);

    document.getElementById('notification-toggle').addEventListener('click', toggleNotifications);

    // Update UI and start periodic checks
    updateUsersList();
    setInterval(checkForNewMessages, 5000);
    setInterval(updateTypingIndicator, 1000);

    // Request notification permission
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

// Load user data and messages from local storage
function loadStoredData() {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        users = JSON.parse(storedUsers);
    }
    const storedMessages = localStorage.getItem('messages');
    if (storedMessages) {
        messages = JSON.parse(storedMessages);
    }
    console.log('Loaded users:', users);
}

// Handle the join chat button click
function joinChat(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username-input');
    currentUser = usernameInput.value.trim();
    
    if (currentUser) {
        console.log('Joining chat with username:', currentUser);
        if (!users.includes(currentUser)) {
            users.push(currentUser);
            localStorage.setItem('users', JSON.stringify(users));
        }
        localStorage.setItem('currentUser', currentUser);
        switchToChatArea();
        updateUsersList();
        loadMessages();
    } else {
        alert('Please enter a username.');
    }
}

// Switch from login area to chat area
function switchToChatArea() {
    document.getElementById('login-area').classList.add('hidden');
    document.getElementById('chat-area').classList.remove('hidden');
}

// Update the list of online users
function updateUsersList() {
    const usersList = document.getElementById('users');
    usersList.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('li');
        userElement.textContent = user;
        userElement.dataset.username = user;
        if (user === currentUser) {
            userElement.classList.add('current-user');
        }
        usersList.appendChild(userElement);
    });
}

// Send a message in the public chat
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    if (messageText) {
        const newMessage = createMessage(currentUser, messageText);
        messages.push(newMessage);
        localStorage.setItem('messages', JSON.stringify(messages));
        displayMessage(newMessage);
        messageInput.value = '';
        notifyNewMessage(newMessage);
    }
}

// Create a new message object
function createMessage(user, text, isPrivate = false, recipient = null) {
    return {
        id: Date.now(),
        user: user,
        text: text,
        timestamp: new Date().toISOString(),
        isPrivate: isPrivate,
        recipient: recipient
    };
}

// Load and display all public messages
function loadMessages() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    messages.filter(m => !m.isPrivate).forEach(displayMessage);
}

// Display a single message in the chat
function displayMessage(message, isPrivate = false) {
    const chatMessages = isPrivate ? document.getElementById('private-chat-messages') : document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    const messageClass = message.user === currentUser ? 'user-message' : 'other-message';
    messageElement.className = `message ${messageClass} ${isPrivate ? 'private-' + messageClass : ''}`;
    messageElement.innerHTML = `
        <div class="message-user">${message.user}</div>
        <div class="message-text">${formatMessage(message.text)}</div>
        <div class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message text (bold, italic, code)
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}

// Toggle the emoji picker visibility
function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emoji-picker');
    if (emojiPicker.classList.contains('hidden')) {
        const emojiGrid = emojiPicker.querySelector('.emoji-grid');
        emojiGrid.innerHTML = '';
        emojiList.forEach(emoji => {
            const emojiButton = document.createElement('button');
            emojiButton.className = 'emoji';
            emojiButton.textContent = emoji;
            emojiButton.addEventListener('click', insertEmoji);
            emojiGrid.appendChild(emojiButton);
        });
    }
    emojiPicker.classList.toggle('hidden');
}

// Insert selected emoji into the message input
function insertEmoji(event) {
    const emoji = event.target.textContent;
    const messageInput = document.getElementById('message-input');
    messageInput.value += emoji;
    messageInput.focus();
    toggleEmojiPicker();
}

// Format selected text (bold, italic, code)
function formatSelection(type) {
    const messageInput = document.getElementById('message-input');
    const start = messageInput.selectionStart;
    const end = messageInput.selectionEnd;
    const selectedText = messageInput.value.substring(start, end);
    let formattedText;

    switch(type) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'code':
            formattedText = `\`${selectedText}\``;
            break;
    }

    messageInput.value = messageInput.value.substring(0, start) + formattedText + messageInput.value.substring(end);
    messageInput.focus();
}

// Change the current user's username
function changeUsername() {
    const newUsername = prompt('Enter your new username:');
    if (newUsername && newUsername.trim()) {
        const oldUsername = currentUser;
        currentUser = newUsername.trim();
        users = users.map(user => user === oldUsername ? currentUser : user);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', currentUser);
        updateUsersList();
        alert('Username changed successfully!');
    }
}

// Initiate a private chat with another user
function initiatePrivateChat(event) {
    if (event.target.tagName === 'LI' && event.target.dataset.username !== currentUser) {
        currentPrivateChat = event.target.dataset.username;
        document.getElementById('private-chat-partner').textContent = currentPrivateChat;
        document.getElementById('chat-container').classList.add('hidden');
        document.getElementById('private-chat-area').classList.remove('hidden');
        loadPrivateMessages();
    }
}

// Load and display private messages
function loadPrivateMessages() {
    const privateChatMessages = document.getElementById('private-chat-messages');
    privateChatMessages.innerHTML = '';
    messages.filter(m => m.isPrivate && 
        ((m.user === currentUser && m.recipient === currentPrivateChat) || 
         (m.user === currentPrivateChat && m.recipient === currentUser)))
        .forEach(m => displayMessage(m, true));
}

// Send a private message
function sendPrivateMessage() {
    const privateMessageInput = document.getElementById('private-message-input');
    const messageText = privateMessageInput.value.trim();
    if (messageText && currentPrivateChat) {
        const newMessage = createMessage(currentUser, messageText, true, currentPrivateChat);
        messages.push(newMessage);
        localStorage.setItem('messages', JSON.stringify(messages));
        displayMessage(newMessage, true);
        privateMessageInput.value = '';
        notifyNewMessage(newMessage);
    }
}

// Return to the public chat
function backToPublicChat() {
    currentPrivateChat = null;
    document.getElementById('chat-container').classList.remove('hidden');
    document.getElementById('private-chat-area').classList.add('hidden');
}

// Handle typing in public chat
function handleTyping() {
    typingUsers.add(currentUser);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        typingUsers.delete(currentUser);
    }, 3000);
}

// Handle stopped typing in public chat
function handleStoppedTyping() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        typingUsers.delete(currentUser);
    }, 1000);
}

// Handle typing in private chat
function handlePrivateTyping() {
    privateTypingUser = currentUser;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        privateTypingUser = null;
    }, 3000);
}

// Handle stopped typing in private chat
function handlePrivateStoppedTyping() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        privateTypingUser = null;
    }, 1000);
}

// Update typing indicators
function updateTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    const privateTypingIndicator = document.getElementById('private-typing-indicator');
    
    if (typingUsers.size > 0) {
        const typingUsersList = Array.from(typingUsers).filter(user => user !== currentUser);
        typingIndicator.textContent = typingUsersList.length > 0 ? 
            `${typingUsersList.join(', ')} ${typingUsersList.length > 1 ? 'are' : 'is'} typing...` : '';
    } else {
        typingIndicator.textContent = '';
    }

    if (privateTypingUser && privateTypingUser !== currentUser) {
        privateTypingIndicator.textContent = `${privateTypingUser} is typing...`;
    } else {
        privateTypingIndicator.textContent = '';
    }
}

// Toggle notifications on/off
function toggleNotifications() {
    notificationsMuted = !notificationsMuted;
    const notificationToggle = document.getElementById('notification-toggle');
    notificationToggle.classList.toggle('muted', notificationsMuted);
    notificationToggle.innerHTML = notificationsMuted ? '<i class="fas fa-bell-slash"></i>' : '<i class="fas fa-bell"></i>';
}

// Show a notification for a new message
function notifyNewMessage(message) {
    if (!notificationsMuted && Notification.permission === 'granted' && document.hidden) {
        const notification = new Notification('New Message', {
            body: `${message.user}: ${message.text}`,
            icon: 'path/to/notification-icon.png'
        });
        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }
    const notificationSound = document.getElementById('notification-sound');
    notificationSound.play();
}

// Check for new messages (simulated for local storage)
function checkForNewMessages() {
    // In a real application, this would involve checking with a server
    // For this local version, we'll just reload messages from localStorage
    const storedMessages = localStorage.getItem('messages');
    if (storedMessages) {
        const newMessages = JSON.parse(storedMessages);
        if (newMessages.length > messages.length) {
            const latestMessages = newMessages.slice(messages.length);
            latestMessages.forEach(message => {
                if (!message.isPrivate) {
                    displayMessage(message);
                } else if (message.recipient === currentUser || message.user === currentUser) {
                    displayMessage(message, true);
                }
                notifyNewMessage(message);
            });
            messages = newMessages;
        }
    }
}