// --- Configuration ---
const SPREADSHEET_ID = '1co9ifi-djnarTEG1BDWJSf7EF_XE59n5rrwGypOeyMM'; // **Provided Spreadsheet ID**

// --- Element References ---
// Note: uploadForm and uploadStatus are inside upload.html,
// so they can only be referenced after upload.html is loaded.

// --- Event Handlers ---
// We need to wait for the menu to be loaded, so we use a MutationObserver
document.addEventListener('DOMContentLoaded', () => {
    const menuPlaceholder = document.getElementById('menu-placeholder');

    const observer = new MutationObserver((mutationsList, observer) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const navUploadLink = document.getElementById('nav-upload-link');
                if (navUploadLink) {
                    navUploadLink.addEventListener('click', handleUploadLinkClick);
                    observer.disconnect(); // Stop observing once the element is found
                    break;
                }
            }
        }
    });

    observer.observe(menuPlaceholder, { childList: true, subtree: true });
});


function handleUploadLinkClick(event) {
    event.preventDefault();

    // This function is defined in authen.js but we can call it from here
    // It handles showing the upload form and hiding other content
    showUploadForm();
}



// --- การอัปโหลด (โค้ดส่วนนี้เหมือนเดิมเกือบทั้งหมด) ---
function handleUpload(event) {
    event.preventDefault();

    // Get elements at the time of submission, not on script load
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim());
    const programName = document.getElementById('program-name').value;
    const videoFile = document.getElementById('video-file').files[0];

    if (!videoFile) {
        alert('กรุณาเลือกไฟล์วิดีโอ');
        return;
    }

    const resource = {
        snippet: {
            title: title,
            description: description,
            tags: tags,
            categoryId: '22',
            defaultLanguage: 'th',
            defaultAudioLanguage: 'th'
        },
        status: {
            privacyStatus: 'private'
        }
    };

    // ใช้ gapi.client.youtube.videos.insert เพื่อเริ่มการอัปโหลด
    // ไม่ต้องใช้ MediaUploader ที่ซับซ้อนแล้ว เพราะ GAPI จัดการให้
    const uploader = new Upload(resource, videoFile, programName);
    uploader.upload();
}

// คลาสสำหรับช่วยอัปโหลด (ดัดแปลงเล็กน้อย)
class Upload {
    constructor(metadata, file, programName) {
        this.metadata = metadata;
        this.file = file;
        this.programName = programName;
        this.uploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
    }

    async upload() {
        uploadStatus.innerHTML = 'กำลังเตรียมอัปโหลด...';
        try {
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Length': this.file.size,
                    'X-Upload-Content-Type': this.file.type,
                },
                body: JSON.stringify(this.metadata),
            });

            if (!response.ok) {
                throw new Error(`Initial request failed: ${response.statusText}`);
            }

            const location = response.headers.get('Location');
            this.uploadFile(location);
        } catch (error) {
            uploadStatus.innerHTML = 'เกิดข้อผิดพลาดในการเริ่มอัปโหลด: ' + error.message;
            console.error('Upload initiation failed:', error);
        }
    }

    uploadFile(location) {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', location, true);
        xhr.setRequestHeader('Content-Type', this.file.type);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                uploadStatus.innerHTML = `กำลังอัปโหลด... ${percentComplete}%`;
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const videoData = JSON.parse(xhr.responseText);
                uploadStatus.innerHTML = `อัปโหลด YouTube สำเร็จ! <a href="https://www.youtube.com/watch?v=${videoData.id}" target="_blank">ดูวิดีโอ</a>. กำลังบันทึกข้อมูลลง Google Sheet...`;
                logToGoogleSheet(this.programName, this.metadata.snippet, videoData);
                uploadForm.reset();
            } else {
                uploadStatus.innerHTML = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + xhr.responseText;
                console.error('File upload failed:', xhr.responseText);
            }
        };

        xhr.send(this.file);
    }
}

// --- Google Sheets Logging Function ---
async function logToGoogleSheet(programName, snippet, videoData) {
    const sheetName = programName;
    const now = new Date();
    // Using Intl for more robust localization
    const dateFormatter = new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeFormatter = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const timestamp = `${dateFormatter.format(now)} ${timeFormatter.format(now)}`;
    const videoUrl = `https://www.youtube.com/watch?v=${videoData.id}`;

    const values = [[
        timestamp,
        snippet.title,
        snippet.description,
        snippet.tags.join(', '),
        videoData.id,
        videoUrl
    ]];

    const body = {
        values: values,
    };

    try {
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: body,
        });
        console.log('Sheet update response:', response);
        uploadStatus.innerHTML = `อัปโหลด YouTube และบันทึกข้อมูลลง Sheet '${sheetName}' สำเร็จ! <a href="${videoUrl}" target="_blank">ดูวิดีโอ</a>`;

    } catch (err) {
        console.error('Error writing to Google Sheet:', err);
        const errorMsg = err.result?.error?.message || 'ไม่สามารถเชื่อมต่อกับ Google Sheet ได้';
        uploadStatus.innerHTML = `อัปโหลด YouTube สำเร็จ แต่เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Google Sheet: ${errorMsg}`;
    }
}