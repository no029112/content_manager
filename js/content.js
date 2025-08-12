document.addEventListener('DOMContentLoaded', () => {
    // We need to wait for the menu to be loaded, so we use a MutationObserver
    const menuPlaceholder = document.getElementById('menu-placeholder');

    const observer = new MutationObserver((mutationsList, observer) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const navContentLink = document.getElementById('nav-content-link');
                if (navContentLink) {
                    navContentLink.addEventListener('click', handleContentClick);
                    observer.disconnect(); // Stop observing once the element is found
                    break;
                }
            }
        }
    });

    observer.observe(menuPlaceholder, { childList: true, subtree: true });
});

async function handleContentClick(event) {
    event.preventDefault();
    console.log("All Content link clicked!");

    // Hide other containers and show the content container
    document.getElementById('upload-form-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
    const contentContainer = document.getElementById('content-container');
    contentContainer.style.display = 'block';

    // Load content.html if it's not already loaded
    if (contentContainer.innerHTML.trim() === '') {
        try {
            const response = await fetch('content.html');
            if (!response.ok) throw new Error('Network response was not ok.');
            contentContainer.innerHTML = await response.text();
        } catch (error) {
            console.error('Failed to fetch content.html:', error);
            contentContainer.innerHTML = '<p class="text-danger">Could not load content display.</p>';
            return;
        }
    }

    // Now, fetch and display the videos
    await fetchAndDisplayVideos();
}

async function fetchAndDisplayVideos() {
    const loader = document.getElementById('content-loader');
    const display = document.getElementById('video-display');

    loader.style.display = 'block';
    display.style.display = 'none';

    try {
        // 1. Get the user's channel uploads playlist ID
        let uploadsPlaylistId = await getUploadsPlaylistId();
        if (!uploadsPlaylistId) {
            throw new Error("Could not find channel's uploads playlist.");
        }

        // 2. Get all video items from that playlist
        let allVideos = await getAllPlaylistItems(uploadsPlaylistId);
        console.log('before allVideos', allVideos);
        // 3. Get video details (including duration) for all videos
        ///let videoDetails = await getVideoDetails(allVideos.map(v => v.snippet.resourceId.videoId));
        let videoIds = allVideos.map(v => v.snippet.resourceId.videoId);
        const part = 'snippet,contentDetails';
        let allDetails = [];
        for (let i = 0; i < videoIds.length; i += 50) {
            const batch = videoIds.slice(i, i + 50);
            const response = await gapi.client.youtube.videos.list({
                part: part,
                id: batch.join(',')
            });
            allDetails = allDetails.concat(response.result.items);
        }


        // 4. Categorize and render videos
        categorizeAndRenderVideos(allDetails);

    } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        document.getElementById('content-container').innerHTML = `<p class="text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูลวิดีโอ: ${error.message}</p>`;
    } finally {
        loader.style.display = 'none';
        display.style.display = 'block';
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
            part: 'snippet,contentDetails',
            playlistId: playlistId,
            maxResults: 50, // Max allowed per page
            pageToken: nextPageToken
        });

        const result = response.result;
        allItems = allItems.concat(result.items);
        nextPageToken = result.nextPageToken;

    } while (nextPageToken);

    return allItems;
}

async function getVideoDetails(videoIds) {
    console.log(videoIds)
    let allDetails = [];
    // The API allows fetching details for up to 50 videos at a time
    const part = 'snippet,contentDetails';
    console.log(part)
    for (let i = 0; i < videoIds.length; i += 50) {
        const batch = videoIds.slice(i, i + 50);
        const response = await gapi.client.youtube.videos.list({
            part: part,
            id: batch.join(',')
        });
        allDetails = allDetails.concat(response.result.items);
    }
    return allDetails;
}

function parseISO8601Duration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (parseInt(match[1], 10) || 0);
    const minutes = (parseInt(match[2], 10) || 0);
    const seconds = (parseInt(match[3], 10) || 0);

    return (hours * 3600) + (minutes * 60) + seconds;
}


function categorizeAndRenderVideos(videos) {
    const longVideosContainer = document.getElementById('long-videos-container');
    const shortsContainer = document.getElementById('shorts-container');
    const noLongVideos = document.getElementById('no-long-videos');
    const noShorts = document.getElementById('no-shorts');

    // Clear previous content
    longVideosContainer.innerHTML = '';
    shortsContainer.innerHTML = '';

    let longVideoCount = 0;
    let shortCount = 0;

    videos.forEach(video => {
        const durationInSeconds = parseISO8601Duration(video.contentDetails.duration);
        const videoCard = createVideoCard(video);

        if (durationInSeconds > 60) {
            longVideosContainer.innerHTML += videoCard;
            longVideoCount++;
        } else {
            shortsContainer.innerHTML += videoCard;
            shortCount++;
        }
    });

    noLongVideos.style.display = longVideoCount === 0 ? 'block' : 'none';
    noShorts.style.display = shortCount === 0 ? 'block' : 'none';
}

function createVideoCard(video) {
    const videoId = video.id;
    const title = video.snippet.title;
    // Use a higher quality thumbnail if available
    const thumbnailUrl = video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return `
        <div class="col">
            <div class="card h-100">
                <a href="${videoUrl}" target="_blank">
                    <img src="${thumbnailUrl}" class="card-img-top" alt="${title}">
                </a>
                <div class="card-body">
                    <p class="card-title">
                        <a href="${videoUrl}" target="_blank" class="text-decoration-none">${title}</a>
                    </p>
                </div>
            </div>
        </div>
    `;
}
