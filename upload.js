// --- Configuration ---
const CLIENT_ID = '1023795618904-6p5ctqus8n83i0d4kulalf8tkdd5kucc.apps.googleusercontent.com'; // **Provided Client ID**
const SPREADSHEET_ID = '1co9ifi-djnarTEG1BDWJSf7EF_XE59n5rrwGypOeyMM'; // **Provided Spreadsheet ID**
const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest",
    "https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest"
];
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/spreadsheets';

// --- Element References ---
const loginButton = document.getElementById('login-button');
const uploadFormContainer = document.getElementById('upload-form-container');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');

let tokenClient;
let gapiInited = false;
let gisInited = false;

// --- รอให้ gapi และ gis โหลดเสร็จ ---
window.onload = () => {
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

// เช็คว่าโหลดครบทั้ง 2 library หรือยัง แล้วค่อยเปิดปุ่ม
function checkAuthButton() {
    if (gapiInited && gisInited) {
        loginButton.disabled = false;
    }
}

// --- จัดการการทำงานของปุ่ม ---
loginButton.disabled = true;
loginButton.onclick = handleAuthClick;
uploadForm.onsubmit = handleUpload;

function handleAuthClick() {
    // เมื่อกดปุ่ม ให้ GIS ขอ Token
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        // ถ้าสำเร็จ ให้แสดงฟอร์ม
        uploadFormContainer.style.display = 'block';
        loginButton.style.display = 'none';
    };

    if (gapi.client.getToken() === null) {
        // ถ้ายังไม่มี token, ขอ token ใหม่
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // ถ้ามี token อยู่แล้ว แต่เผื่อหมดอายุ ให้ขอใหม่แบบเงียบๆ
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// --- การอัปโหลด (โค้ดส่วนนี้เหมือนเดิมเกือบทั้งหมด) ---
function handleUpload(event) {
    event.preventDefault();

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