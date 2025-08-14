document.addEventListener('DOMContentLoaded', () => {
    // Use a MutationObserver to ensure the menu link is present before attaching event listener
    const menuPlaceholder = document.getElementById('menu-placeholder');

    const observer = new MutationObserver((mutationsList, observer) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const navLink = document.getElementById('nav-elevenlabs-link');
                if (navLink) {
                    navLink.addEventListener('click', (event) => {
                        event.preventDefault();
                        // This function will be created in authen.js in the next step
                        showElevenlabs();
                    });
                    observer.disconnect(); // Stop observing once the element is found
                    break;
                }
            }
        }
    });

    observer.observe(menuPlaceholder, { childList: true, subtree: true });
});

// This function will be called from authen.js after loading the HTML
function initializeElevenLabs() {
    const form = document.getElementById('elevenlabs-form');
    if (form) {
        form.addEventListener('submit', handleGenerateSpeech);
    }
}

async function handleGenerateSpeech(event) {
    event.preventDefault();

    // --- CONFIGURATION ---
    // IMPORTANT: Replace with your actual ElevenLabs API key
    const apiKey = 'ELEVENLABS_API_KEY_PLACEHOLDER';
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Example Voice ID (Rachel)
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    // --- ELEMENT REFERENCES ---
    const generateButton = document.getElementById('elevenlabs-generate-button');
    const statusDiv = document.getElementById('elevenlabs-status');
    const audioPlayer = document.getElementById('elevenlabs-audio');
    const textInput = document.getElementById('elevenlabs-text').value;

    if (!textInput.trim()) {
        statusDiv.textContent = 'กรุณาป้อนข้อความ';
        return;
    }

    if (apiKey === 'ELEVENLABS_API_KEY_PLACEHOLDER') {
        statusDiv.innerHTML = '<strong>ข้อผิดพลาด:</strong> ไม่ได้ตั้งค่า API Key ของ ElevenLabs';
        return;
    }

    // --- UI UPDATE: Loading state ---
    generateButton.disabled = true;
    generateButton.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Generating...
    `;
    statusDiv.textContent = 'กำลังสร้างเสียงพูด...';
    audioPlayer.style.display = 'none';

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: textInput,
                model_id: 'eleven_multilingual_v2', // Or another model ID
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail.message || `HTTP error! status: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // --- UI UPDATE: Success state ---
        audioPlayer.src = audioUrl;
        audioPlayer.style.display = 'block';
        audioPlayer.play();
        statusDiv.textContent = 'สร้างเสียงพูดสำเร็จ!';
        generateButton.textContent = 'Regenerate';

    } catch (error) {
        // --- UI UPDATE: Error state ---
        console.error('ElevenLabs API Error:', error);
        statusDiv.innerHTML = `<strong>เกิดข้อผิดพลาด:</strong> ${error.message}`;
    } finally {
        // --- UI UPDATE: Reset button state ---
        generateButton.disabled = false;
    }
}
