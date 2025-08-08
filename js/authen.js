// --- Configuration ---
const CLIENT_ID = '1023795618904-6p5ctqus8n83i0d4kulalf8tkdd5kucc.apps.googleusercontent.com'; // **Provided Client ID**
const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest",
    "https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest"
];
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/spreadsheets';

// --- Element References ---
const authContainer = document.getElementById('auth-container');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const uploadFormContainer = document.getElementById('upload-form-container');
const authStatus = document.getElementById('auth-status');


let tokenClient;
let gapiInited = false;
let gisInited = false;

// --- รอให้ gapi และ gis โหลดเสร็จ ---
function handleClientLoad() {
    // 1. โหลด GAPI client สำหรับเรียก YouTube API
    gapi.load('client', initializeGapiClient);
    // 2. โหลด GIS client สำหรับการยืนยันตัวตน
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // จะกำหนด callback ทีหลัง
    });
    gisInited = true;
    checkAuthButton();
};

async function initializeGapiClient() {
    await gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    checkAuthButton();
}

// --- Session Management & Auth Flow ---

function checkAuthButton() {
    if (gapiInited && gisInited) {
        loginButton.disabled = false;
        restoreSession();
    }
}

function restoreSession() {
    const tokenDataString = localStorage.getItem('youtube_token');
    if (tokenDataString) {
        const tokenData = JSON.parse(tokenDataString);
        const tokenAgeDays = (Date.now() - tokenData.timestamp) / (1000 * 60 * 60 * 24);

        if (tokenAgeDays < 10) {
            gapi.client.setToken(tokenData.token);
            showUploadForm();
        } else {
            // Token is expired, clear it
            localStorage.removeItem('youtube_token');
        }
    } else {
        showLoginForm();
    }
}

// --- UI Update Functions ---
function showLoginForm() {
    authContainer.style.display = 'block';
    uploadFormContainer.style.display = 'none';

    // Move login button to header
    authStatus.innerHTML = ''; // Clear previous state
    authStatus.appendChild(loginButton);
    loginButton.style.display = 'inline-block';
    logoutButton.style.display = 'none';
}

function showUploadForm() {
    authContainer.style.display = 'none';
    uploadFormContainer.style.display = 'block';

    // Move logout button to header
    authStatus.innerHTML = ''; // Clear previous state
    authStatus.appendChild(logoutButton);
    logoutButton.style.display = 'inline-block';
    loginButton.style.display = 'none';
}


// --- Event Handlers ---
loginButton.disabled = true;
loginButton.onclick = handleAuthClick;
logoutButton.onclick = handleLogout;

function handleLogout() {
    const tokenDataString = localStorage.getItem('youtube_token');
    if (tokenDataString) {
        const tokenData = JSON.parse(tokenDataString);
        google.accounts.oauth2.revoke(tokenData.token.access_token, () => {
            console.log('Token revoked.');
        });
        localStorage.removeItem('youtube_token');
    }
    gapi.client.setToken(null);
    showLoginForm();
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        // Store the token and timestamp in localStorage
        const token = gapi.client.getToken();
        const tokenData = {
            token: token,
            timestamp: Date.now()
        };
        localStorage.setItem('youtube_token', JSON.stringify(tokenData));

        // UI changes
        showUploadForm();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}
