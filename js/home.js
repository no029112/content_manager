// --- home.js ---

// Function to load home.html into the main page
async function loadHomeContent() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Main content container not found.');
        return;
    }

    // Hide other containers
    const containersToHide = ['auth-container', 'upload-form-container', 'content-container', 'chat-container'];
    containersToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    });

    // Create home container if it doesn't exist
    let homeContainer = document.getElementById('home-container');
    if (!homeContainer) {
        homeContainer = document.createElement('div');
        homeContainer.id = 'home-container';
        mainContent.appendChild(homeContainer);
    }

    // Fetch and inject home.html
    try {
        const response = await fetch('home.html');
        if (!response.ok) throw new Error('Network response was not ok.');
        homeContainer.innerHTML = await response.text();
        homeContainer.style.display = 'block';

        // After loading, display AI content
        displayAIContent();
    } catch (error) {
        console.error('Failed to fetch home.html:', error);
        homeContainer.innerHTML = '<p class="text-danger">Could not load home content.</p>';
    }
}


// Function to display channel statistics
async function displayChannelStats() {
    const statsContent = document.getElementById('stats-content');
    if (!statsContent) return;

    try {
        const response = await gapi.client.youtube.channels.list({
            part: 'snippet,statistics',
            mine: true
        });

        if (response.result.items && response.result.items.length > 0) {
            const channel = response.result.items[0];
            const stats = channel.statistics;
            const snippet = channel.snippet;

            statsContent.innerHTML = `
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">ผู้ติดตาม (Subscribers)</h5>
                            <p class="card-text fs-4">${parseInt(stats.subscriberCount).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">ยอดดู (Views)</h5>
                            <p class="card-text fs-4">${parseInt(stats.viewCount).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">วิดีโอ (Videos)</h5>
                            <p class="card-text fs-4">${parseInt(stats.videoCount).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            statsContent.innerHTML = '<p>Could not retrieve channel statistics. Please ensure you have a YouTube channel.</p>';
        }
    } catch (error) {
        console.error('Error fetching channel stats:', error);
        statsContent.innerHTML = '<p class="text-danger">An error occurred while fetching channel statistics.</p>';
    }
}

// Function to display AI-generated content (mock)
function displayAIContent() {
    const aiContent = document.getElementById('ai-content');
    if (!aiContent) return;

    // Mock AI content
    const ideas = [
        { title: 'รีวิว Gadget ใหม่ล่าสุด', description: 'ทำวิดีโอแกะกล่องและรีวิว gadget ที่กำลังเป็นกระแสในตอนนี้' },
        { title: 'สอนทำอาหารง่ายๆ ใน 5 นาที', description: 'สร้างสรรค์เมนูที่ทำตามได้ง่ายๆ สำหรับคนที่ไม่ค่อยมีเวลา' },
        { title: 'จัดอันดับ 10 หนังโปรดตลอดกาล', description: 'แบ่งปันรายชื่อหนังที่คุณชื่นชอบและเหตุผลที่ทำให้มันพิเศษ' }
    ];

    // Simulate a delay for "AI processing"
    setTimeout(() => {
        aiContent.innerHTML = ideas.map(idea => `
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${idea.title}</h5>
                        <p class="card-text">${idea.description}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }, 1500); // 1.5 second delay
}
