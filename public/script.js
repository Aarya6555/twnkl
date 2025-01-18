// WebSocket connection
const WS_URL = window.location.hostname === 'localhost' 
  ? 'ws://localhost:8080' 
  : 'wss://' + window.location.hostname;
const socket = new WebSocket(WS_URL);

// Global variables
let currentUser = null;
let currentPartner = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const chatArea = document.getElementById('chatArea');
const waitingScreen = document.getElementById('waitingScreen');
const emptyState = document.getElementById('emptyState');
const startRandomChat = document.getElementById('startRandomChat');
const chatPreference = document.getElementById('chatPreference');
const cancelSearch = document.getElementById('cancelSearch');
const messageInput = document.getElementById('messageInput');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const mediaModal = document.getElementById('mediaModal');
const modalImage = document.getElementById('modalImage');
const modalVideo = document.getElementById('modalVideo');
const closeModal = document.querySelector('.close-modal');

// Initial setup - hide main screen and show login screen
mainScreen.classList.add('hidden');
loginScreen.classList.add('active');

// Initialize chat preference and button
chatPreference.value = 'anyone';
startRandomChat.disabled = false;

// Login Elements
const profileInput = document.getElementById('profileInput');
const profilePreview = document.getElementById('profilePreview');
const username = document.getElementById('username');
const gender = document.getElementById('gender');
const enterChat = document.getElementById('enterChat');

// Chat Elements
const filterGender = document.getElementById('filterGender');
const startChat = document.getElementById('startChat');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendMessage = document.getElementById('sendMessage');
const messagesContainer = document.getElementById('messagesContainer');

// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const themeIcon = themeToggle.querySelector('i');

// Set initial theme and icon
html.setAttribute('data-theme', 'dark');
themeIcon.className = 'fas fa-sun';

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    // Update icon opposite to theme (sun for dark, moon for light)
    themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
});

// Profile image preview
profileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Enter chat button click
enterChat.addEventListener('click', () => {
    if (!username.value || !gender.value || profilePreview.src === 'default-avatar.png') {
        alert('Please fill all fields and select a profile image');
        return;
    }

    currentUser = {
        username: username.value,
        gender: gender.value,
        profileImage: profilePreview.src
    };

    socket.send(JSON.stringify({
        type: 'user_info',
        data: currentUser
    }));

    // Switch screens
    switchToMainScreen();
});

// Function to switch to main screen
function switchToMainScreen() {
    // Hide login screen
    loginScreen.classList.remove('active');
    loginScreen.classList.add('hidden');
    
    // Show main screen
    mainScreen.classList.remove('hidden');
    mainScreen.classList.add('active');
    
    // Update user profile in empty state
    document.getElementById('userProfileImage').src = currentUser.profileImage || 'default-avatar.png';
    document.getElementById('userProfileName').textContent = currentUser.username;
    document.getElementById('userProfileGender').textContent = currentUser.gender.charAt(0).toUpperCase() + currentUser.gender.slice(1);
    
    // Show empty state and hide other components
    emptyState.style.display = 'flex';
    chatArea.classList.add('hidden');
}

// Update user data when profile is set
function setUserProfile(username, gender, profileImage) {
    currentUser = {
        username,
        gender,
        profileImage: profileImage || 'default-avatar.png'
    };
   
    // Update profile if already on main screen
    if (!mainScreen.classList.contains('hidden')) {
        document.getElementById('userProfileImage').src = currentUser.profileImage;
        document.getElementById('userProfileName').textContent = currentUser.username;
        document.getElementById('userProfileGender').textContent = currentUser.gender.charAt(0).toUpperCase() + currentUser.gender.slice(1);
    }
}

// Start random chat button click
startRandomChat.addEventListener('click', () => {
    if (!chatPreference.value) {
        alert('Please select your chat preference');
        return;
    }
    
    if (socket.readyState !== WebSocket.OPEN) {
        alert('Connection lost. Please refresh the page.');
        return;
    }

    // Hide both empty state and chat area, show only waiting screen
    emptyState.style.display = 'none';
    chatArea.classList.add('hidden');
    chatArea.style.display = 'none';
    document.getElementById('waitingScreen').classList.remove('hidden');
    document.getElementById('waitingScreen').style.display = 'flex';

    socket.send(JSON.stringify({
        type: 'find_partner',
        preference: chatPreference.value
    }));
});

// Disconnect button click
disconnectBtn.addEventListener('click', () => {
    socket.send(JSON.stringify({
        type: 'disconnect'
    }));

    currentPartner = null;
    // Hide chat area and waiting screen, show empty state
    chatArea.classList.add('hidden');
    chatArea.style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'none';
    emptyState.style.display = 'flex';
    messagesContainer.innerHTML = '';
});

// Send message
sendMessage.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        socket.send(JSON.stringify({
            type: 'message',
            message: message
        }));

        addMessage(message, true);
        messageInput.value = '';
        messageInput.style.height = '45px';
        messageInput.style.overflowY = 'hidden';
    }
});

// Attachment button handling
const attachmentButton = document.getElementById('attachmentButton');
const attachmentOptions = document.querySelector('.attachment-options');

attachmentButton.addEventListener('click', () => {
    attachmentButton.classList.toggle('active');
    attachmentOptions.classList.toggle('show');
});

// Close attachment options when clicking outside
document.addEventListener('click', (e) => {
    if (!attachmentButton.contains(e.target) && 
        !attachmentOptions.contains(e.target)) {
        attachmentButton.classList.remove('active');
        attachmentOptions.classList.remove('show');
    }
});

// Handle attachment options
document.querySelectorAll('.attachment-option').forEach(option => {
    option.addEventListener('click', () => {
        const type = option.dataset.type;
        if (type === 'gif') {
            openGifSelector();
        } else {
            fileInput.accept = type === 'image' ? 'image/*' : 'video/*';
            fileInput.click();
        }
        attachmentPopup.classList.add('hidden');
        attachButton.classList.remove('active');
    });
});

// File input handlers
imageInput.addEventListener('change', (e) => handleFileUpload(e, 'image'));
videoInput.addEventListener('change', (e) => handleFileUpload(e, 'video'));

async function handleFileUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
    }

    // Show loading state
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('message', 'sent');
    loadingMessage.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Uploading...</div>';
    messagesContainer.appendChild(loadingMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const base64Data = await fileToBase64(file);
        socket.send(JSON.stringify({
            type: type,
            data: base64Data
        }));
        // Remove loading message
        messagesContainer.removeChild(loadingMessage);
        addMediaMessage(base64Data, type, true);
    } catch (error) {
        console.error('Error handling file:', error);
        // Remove loading message
        messagesContainer.removeChild(loadingMessage);
        alert('Error uploading file. Please try again.');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function addMediaMessage(data, type, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isSent ? 'sent' : 'received');

    if (type === 'image') {
        const img = document.createElement('img');
        img.src = data;
        messageDiv.appendChild(img);
        // Add click handler for image preview
        img.addEventListener('click', () => {
            openMediaModal(data, 'image');
        });
        img.onload = () => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        };
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = data;
        video.controls = true;
        messageDiv.appendChild(video);
        // Add click handler for video preview
        video.addEventListener('click', (e) => {
            if (!e.target.closest('.vjs-control')) {
                openMediaModal(data, 'video');
            }
        });
        video.onloadeddata = () => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        };
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Media Modal Functions
function openMediaModal(src, type) {
    mediaModal.classList.remove('hidden');
    setTimeout(() => mediaModal.classList.add('show'), 10);
    
    if (type === 'image') {
        modalImage.src = src;
        modalImage.classList.remove('hidden');
        modalImage.classList.add('show');
        modalVideo.classList.add('hidden');
        modalVideo.classList.remove('show');
        modalVideo.pause();
    } else {
        modalVideo.src = src;
        modalVideo.classList.remove('hidden');
        modalVideo.classList.add('show');
        modalImage.classList.add('hidden');
        modalImage.classList.remove('show');
    }
}

function closeMediaModal() {
    mediaModal.classList.remove('show');
    setTimeout(() => {
        mediaModal.classList.add('hidden');
        modalImage.classList.add('hidden');
        modalVideo.classList.add('hidden');
        modalVideo.pause();
    }, 300);
}

// Close modal events
closeModal.addEventListener('click', closeMediaModal);

mediaModal.addEventListener('click', (e) => {
    if (e.target === mediaModal) {
        closeMediaModal();
    }
});

// Close modal with escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mediaModal.classList.contains('hidden')) {
        closeMediaModal();
    }
});

// WebSocket connection handler
socket.onopen = () => {
    console.log('Connected to server');
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    alert('Connection error. Please refresh the page.');
};

socket.onclose = () => {
    console.log('Disconnected from server');
    alert('Connection lost. Please refresh the page.');
};

// Update WebSocket message handler
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'user_connected':
            console.log('Successfully connected as:', currentUser.username);
            break;

        case 'partner_found':
            currentPartner = data.partner;
            // Hide waiting screen and show chat area
            const waitingScreen = document.getElementById('waitingScreen');
            waitingScreen.style.opacity = '0';
            setTimeout(() => {
                waitingScreen.classList.add('hidden');
                waitingScreen.style.display = 'none';
                waitingScreen.style.opacity = '1';
                emptyState.style.display = 'none';
                chatArea.classList.remove('hidden');
                chatArea.style.display = 'flex';
                updatePartnerInfo();
            }, 300);
            break;

        case 'message':
            addMessage(data.message, false);
            break;

        case 'partner_disconnected':
            alert('Partner has disconnected');
            disconnectBtn.click();
            break;

        case 'image':
        case 'video':
            addMediaMessage(data.data, data.type, false);
            break;
            
        case 'error':
            alert(data.message || 'An error occurred');
            break;
    }
};

// Helper functions
function addMessage(message, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isSent ? 'sent' : 'received');
    // Convert URLs to links and handle line breaks
    const formattedMessage = message
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');
    messageDiv.innerHTML = formattedMessage;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updatePartnerInfo() {
    document.getElementById('partnerImage').src = currentPartner.profileImage;
    document.getElementById('partnerName').textContent = currentPartner.username;
    document.getElementById('partnerGender').textContent = currentPartner.gender;
}

function openGifSelector() {
    // Using GIPHY API
    const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';  // Free GIPHY API key
    const searchTerm = prompt('Enter GIF search term:');
    
    if (searchTerm) {
        fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${searchTerm}&limit=10`)
            .then(response => response.json())
            .then(data => {
                const gif = data.data[0]?.images?.original?.url;
                if (gif) {
                    socket.send(JSON.stringify({
                        type: 'image',
                        data: gif
                    }));
                    addMediaMessage(gif, 'image', true);
                }
            })
            .catch(error => {
                console.error('Error fetching GIF:', error);
                alert('Error loading GIF. Please try again.');
            });
    }
}

// Only disable button if preference is empty (which should never happen now)
chatPreference.addEventListener('change', () => {
    if (!chatPreference.value) {
        startRandomChat.disabled = true;
    } else {
        startRandomChat.disabled = false;
    }
});

// Cancel search button click
cancelSearch.addEventListener('click', () => {
    socket.send(JSON.stringify({
        type: 'cancel_search'
    }));
    document.getElementById('waitingScreen').style.display = 'none';
    emptyState.style.display = 'flex';
});

// Message input handling
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            e.preventDefault();
            sendMessage.click();
        } else {
            // Allow normal Enter for new line
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight + 24) + 'px'; // Add extra space for new line
        }
    }
});

messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    // Limit maximum height
    if (this.scrollHeight > 200) {
        this.style.overflowY = 'auto';
        this.style.height = '200px';
    } else {
        this.style.overflowY = 'hidden';
    }
});

// GIF handling
const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';  // Free GIPHY API key
const gifButton = document.getElementById('gifButton');
const gifSelector = document.getElementById('gifSelector');
const gifSearchInput = document.getElementById('gifSearchInput');
const gifResults = document.getElementById('gifResults');
let gifSearchTimeout;

// Show/Hide GIF selector
gifButton.addEventListener('click', () => {
    gifSelector.classList.toggle('hidden');
    if (!gifSelector.classList.contains('hidden')) {
        gifSearchInput.focus();
        searchGifs('trending'); // Load trending GIFs by default
    }
});

// Close GIF selector when clicking outside
document.addEventListener('click', (e) => {
    if (!gifButton.contains(e.target) && 
        !gifSelector.contains(e.target)) {
        gifSelector.classList.add('hidden');
    }
});

// Search GIFs
gifSearchInput.addEventListener('input', (e) => {
    clearTimeout(gifSearchTimeout);
    const query = e.target.value.trim();
    
    gifSearchTimeout = setTimeout(() => {
        if (query) {
            searchGifs(query);
        } else {
            searchGifs('trending');
        }
    }, 500);
});

async function searchGifs(query) {
    try {
        gifResults.innerHTML = '<div class="gif-loading"><i class="fas fa-spinner fa-spin"></i></div>';
        
        const endpoint = !query || query === 'trending'
            ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`
            : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=24&rating=g&lang=en`;

        const response = await fetch(endpoint);
        const data = await response.json();
        
        gifResults.innerHTML = '';
        
        data.data.forEach(gif => {
            const gifItem = document.createElement('div');
            gifItem.className = 'gif-item';
            
            const imgContainer = document.createElement('div');
            imgContainer.className = 'gif-img-container';
            
            const img = document.createElement('img');
            img.src = gif.images.preview_gif.url;
            img.loading = 'lazy';
            img.dataset.original = gif.images.fixed_height.url;
            
            imgContainer.appendChild(img);
            gifItem.appendChild(imgContainer);
            
            gifItem.addEventListener('click', () => {
                sendGif(gif.images.fixed_height.url);
                gifSelector.classList.add('hidden');
            });
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        img.src = img.dataset.original;
                        observer.unobserve(img);
                    }
                });
            });
            observer.observe(img);
            
            gifResults.appendChild(gifItem);
        });
    } catch (error) {
        console.error('Error fetching GIFs:', error);
        gifResults.innerHTML = '<div class="gif-loading">Error loading GIFs</div>';
    }
}

function sendGif(url) {
    socket.send(JSON.stringify({
        type: 'image',
        data: url
    }));
    addMediaMessage(url, 'image', true);
} 