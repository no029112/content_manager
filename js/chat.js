// --- Constants ---
const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=';

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    const menuPlaceholder = document.getElementById('menu-placeholder');
    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const navChatLink = document.getElementById('nav-chat-link');
                if (navChatLink) {
                    navChatLink.addEventListener('click', handleChatClick);
                    observer.disconnect();
                    break;
                }
            }
        }
    });
    observer.observe(menuPlaceholder, { childList: true, subtree: true });
});

// --- Navigation and Page Loading ---
async function handleChatClick(event) {
    event.preventDefault();
    console.log("Chat with AI link clicked!");

    document.getElementById('upload-form-container').style.display = 'none';
    document.getElementById('content-container').style.display = 'none';
    const chatContainer = document.getElementById('chat-container');
    chatContainer.style.display = 'block';

    if (chatContainer.innerHTML.trim() === '') {
        try {
            const response = await fetch('chat.html');
            if (!response.ok) throw new Error('Network response was not ok.');
            chatContainer.innerHTML = await response.text();
            attachChatListeners();
        } catch (error) {
            console.error('Failed to fetch chat.html:', error);
            chatContainer.innerHTML = '<p class="text-danger">Could not load chat interface.</p>';
        }
    }
}

// --- Core Chat Logic: Event Listeners and API Key Handling ---
function attachChatListeners() {
    console.log("Attaching chat listeners...");
    document.getElementById('save-gemini-key-btn').addEventListener('click', saveGeminiApiKey);
    document.getElementById('chat-send-btn').addEventListener('click', handleSendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents form submission if it's in a form
            handleSendMessage();
        }
    });

    loadAndVerifyApiKey();
}

function loadAndVerifyApiKey() {
    const apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    const apiKeyInput = document.getElementById('gemini-api-key-input');
    const apiKeyStatus = document.getElementById('api-key-status');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    if (apiKey) {
        apiKeyInput.value = apiKey;
        apiKeyStatus.textContent = 'API Key loaded from memory.';
        apiKeyStatus.className = 'form-text text-success';
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
    } else {
        apiKeyStatus.textContent = 'Please enter your Gemini API Key to begin.';
        apiKeyStatus.className = 'form-text text-warning';
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
    }
}

function saveGeminiApiKey() {
    const apiKeyInput = document.getElementById('gemini-api-key-input');
    const apiKey = apiKeyInput.value.trim();
    const apiKeyStatus = document.getElementById('api-key-status');

    if (apiKey) {
        localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey);
        apiKeyStatus.textContent = 'API Key saved successfully!';
        apiKeyStatus.className = 'form-text text-success';
        console.log("Gemini API Key saved.");
        loadAndVerifyApiKey(); // Reload to enable chat
    } else {
        apiKeyStatus.textContent = 'API Key cannot be empty.';
        apiKeyStatus.className = 'form-text text-danger';
    }
}


// --- Core Chat Logic: Sending Messages and AI Interaction ---

async function handleSendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();

    if (!message) return;

    addMessageToChatBox(message, 'user');
    chatInput.value = '';

    const loadingIndicator = document.getElementById('chat-loading');
    loadingIndicator.style.display = 'block';

    try {
        // 1. Get context from YouTube
        const videoContext = await getYouTubeVideoContext();

        // 2. Get Gemini API Key
        const geminiApiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
        if (!geminiApiKey) {
            throw new Error("Gemini API Key is not set.");
        }

        // 3. Construct the prompt
        const prompt = `You are an expert YouTube channel consultant. Analyze the following list of video titles and descriptions from my channel to understand my content. Then, answer my question.

        **My Videos:**
        ${videoContext}

        **My Question:**
        ${message}`;

        // 4. Call Gemini API
        const response = await fetch(GEMINI_API_URL + geminiApiKey, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${errorData.error.message}`);
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;

        addMessageToChatBox(aiResponse, 'ai');

    } catch (error) {
        console.error("Error during AI chat:", error);
        addMessageToChatBox(`An error occurred: ${error.message}`, 'ai-error');
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function addMessageToChatBox(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`; // e.g., 'chat-message user'

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    // A simple way to format the text a little bit
    bubbleDiv.innerHTML = message.replace(/\n/g, '<br>');

    messageDiv.appendChild(bubbleDiv);
    chatBox.appendChild(messageDiv);

    // Scroll to the bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}


// --- YouTube Data Fetching Functions (Adapted from content.js) ---

async function getYouTubeVideoContext() {
    try {
        const uploadsPlaylistId = await getUploadsPlaylistId();
        if (!uploadsPlaylistId) {
            return "Could not find the channel's uploads playlist. No video context available.";
        }

        const allVideos = await getAllPlaylistItems(uploadsPlaylistId);
        if (allVideos.length === 0) {
            return "No videos found on the channel. No video context available.";
        }

        const videoDetails = await getVideoDetails(allVideos.map(v => v.snippet.resourceId.videoId));

        // Format the context string
        return videoDetails.map(video => {
            return `- Title: ${video.snippet.title}\n  Description: ${video.snippet.description.substring(0, 200)}...`;
        }).join('\n\n');

    } catch (error) {
        console.error("Failed to get YouTube video context:", error);
        return `An error occurred while fetching video data: ${error.message}. The AI will not have video context.`;
    }
}


async function getUploadsPlaylistId() {
    const response = await gapi.client.youtube.channels.list({
        part: 'contentDetails',
        mine: true
    });

    if (response.result.items && response.result.items.length > 0) {
        return response.result.items[0].contentDetails.relatedPlaylists.uploads;
    }
    return null;
}

async function getAllPlaylistItems(playlistId) {
    let allItems = [];
    let nextPageToken = null;

    do {
        const response = await gapi.client.youtube.playlistItems.list({
            part: 'snippet',
            playlistId: playlistId,
            maxResults: 50,
            pageToken: nextPageToken
        });

        const result = response.result;
        allItems = allItems.concat(result.items);
        nextPageToken = result.nextPageToken;

    } while (nextPageToken);

    return allItems;
}

async function getVideoDetails(videoIds) {
    let allDetails = [];
    for (let i = 0; i < videoIds.length; i += 50) {
        const batch = videoIds.slice(i, i + 50);
        const response = await gapi.client.youtube.videos.list({
            part: 'snippet', // Only need snippet for title/description
            id: batch.join(',')
        });
        allDetails = allDetails.concat(response.result.items);
    }
    return allDetails;
}
