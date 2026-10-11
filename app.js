import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCdHmdrgtLIdnCQ7w4BRyWncS7_nFcxdtA",
  authDomain: "editor-drop.firebaseapp.com",
  projectId: "editor-drop",
  storageBucket: "editor-drop.firebasestorage.app",
  messagingSenderId: "627419081969",
  appId: "1:627419081969:web:7d3ba2a53db5bcdcc90d50"
};

const CLOUDINARY_CLOUD_NAME = "ykfzqvzs"; 
const CLOUDINARY_PRESET = "photo_drop"; 

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DOM ELEMENTS ---
const landingPage = document.getElementById('landing-page');
const galleryPage = document.getElementById('gallery-page');
const loadingScreen = document.getElementById('loading-screen');
const fullscreenViewer = document.getElementById('fullscreen-viewer');
const scrollContainer = document.getElementById('scroll-container');
const scrollOnboarding = document.getElementById('scroll-onboarding');

const viewBtn = document.getElementById('view-pictures-btn');
const backBtn = document.getElementById('back-btn');
const closeViewerBtn = document.getElementById('close-viewer-btn');

const secretTrigger = document.getElementById('secret-trigger');
const cmsModal = document.getElementById('cms-modal');
const closeCmsBtn = document.getElementById('close-cms');
const cmsInputs = document.getElementById('cms-inputs');
const uploadProgressView = document.getElementById('upload-progress-view');
const uploadLog = document.getElementById('upload-log');
const finishUploadBtn = document.getElementById('finish-upload-btn');

const tabUpload = document.getElementById('tab-upload');
const tabManage = document.getElementById('tab-manage');
const viewUpload = document.getElementById('view-upload');
const viewManage = document.getElementById('view-manage');
const assetGrid = document.getElementById('cms-asset-grid');
const selectAllBtn = document.getElementById('select-all-btn');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');

const fileInput = document.getElementById('image-upload');
const creditsListUl = document.getElementById('credits-list');
const creditsInput = document.getElementById('credits-input');
const saveCreditsBtn = document.getElementById('save-credits-btn');
const galleryContainer = document.getElementById('gallery-container');

let imagesData = [];
let creditsData = ['Saditha Sulakshana (PGS)'];
let hasSeenOnboarding = false;
let selectedForDeletion = new Set();

// --- UTILITIES ---
function showToast(msg) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = "glass-toast";
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function appendLog(msg, type = "info") {
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.textContent = `> ${msg}`;
  uploadLog.appendChild(line);
  uploadLog.scrollTop = uploadLog.scrollHeight;
}

// Converts high-res Cloudinary URL into a lightweight 300px thumbnail instantly
function getCloudinaryThumb(url) {
  return url.replace('/upload/', '/upload/c_scale,w_300,q_auto,f_auto/');
}

// --- REAL-TIME FIRESTORE LISTENERS ---
onSnapshot(doc(db, "gallery_config", "credits"), (snap) => {
  if (snap.exists() && snap.data().list) {
    creditsData = snap.data().list;
    renderCredits();
  } else {
    renderCredits(); 
  }
});

onSnapshot(query(collection(db, "gallery_photos"), orderBy("timestamp", "asc")), (snap) => {
  imagesData = [];
  snap.forEach(docSnap => {
    imagesData.push({ id: docSnap.id, ...docSnap.data() });
  });
  
  if (galleryPage.classList.contains('active')) {
    renderGallery();
    buildFullscreenViewer();
  }
  if (cmsModal.classList.contains('hidden') === false && viewManage.classList.contains('active')) {
    renderCmsAssetGrid();
  }
});

function renderCredits() {
  creditsListUl.innerHTML = '';
  creditsData.forEach(credit => {
    const li = document.createElement('li');
    li.textContent = credit.trim();
    creditsListUl.appendChild(li);
  });
}

// --- NAVIGATION (INSTANT LOAD, NO PRELOAD BLOCKING) ---
viewBtn.addEventListener('click', () => {
  landingPage.classList.remove('active');
  galleryPage.classList.add('active');
  renderGallery(); 
  buildFullscreenViewer();
});

backBtn.addEventListener('click', () => {
  galleryPage.classList.remove('active');
  landingPage.classList.add('active');
});


// --- SECRET TRIPLE-CLICK CMS & TABS ---
let clickCount = 0;
let clickTimer;
secretTrigger.addEventListener('click', () => {
  clickCount++;
  if (clickCount === 1) {
    clickTimer = setTimeout(() => { clickCount = 0; }, 1000);
  } else if (clickCount === 3) {
    clearTimeout(clickTimer);
    clickCount = 0;
    creditsInput.value = creditsData.join(', ');
    cmsModal.classList.remove('hidden'); 
    renderCmsAssetGrid();
  }
});

closeCmsBtn.addEventListener('click', () => cmsModal.classList.add('hidden'));

tabUpload.addEventListener('click', () => {
  tabUpload.classList.add('active'); tabManage.classList.remove('active');
  viewUpload.classList.add('active'); viewManage.classList.remove('active');
});

tabManage.addEventListener('click', () => {
  tabManage.classList.add('active'); tabUpload.classList.remove('active');
  viewManage.classList.add('active'); viewUpload.classList.remove('active');
  renderCmsAssetGrid();
});

// --- CMS: DELETE ASSETS ---
function renderCmsAssetGrid() {
  assetGrid.innerHTML = '';
  selectedForDeletion.clear();
  
  imagesData.forEach(img => {
    const item = document.createElement('div');
    item.className = 'asset-item';
    item.innerHTML = `<img src="${getCloudinaryThumb(img.url)}" loading="lazy">`;
    
    item.addEventListener('click', () => {
      if (selectedForDeletion.has(img.id)) {
        selectedForDeletion.delete(img.id);
        item.classList.remove('selected');
      } else {
        selectedForDeletion.add(img.id);
        item.classList.add('selected');
      }
    });
    assetGrid.appendChild(item);
  });
}

selectAllBtn.addEventListener('click', () => {
  const items = document.querySelectorAll('.asset-item');
  if (selectedForDeletion.size === imagesData.length) {
    selectedForDeletion.clear();
    items.forEach(item => item.classList.remove('selected'));
  } else {
    imagesData.forEach(img => selectedForDeletion.add(img.id));
    items.forEach(item => item.classList.add('selected'));
  }
});

deleteSelectedBtn.addEventListener('click', async () => {
  if (selectedForDeletion.size === 0) return;
  if (!confirm(`Delete ${selectedForDeletion.size} asset(s) from the gallery?`)) return;

  const originalText = deleteSelectedBtn.textContent;
  deleteSelectedBtn.textContent = 'Deleting...';
  
  for (let id of selectedForDeletion) {
    try {
      await deleteDoc(doc(db, "gallery_photos", id));
    } catch(e) {
      console.error("Failed to delete", id);
    }
  }
  
  showToast("Assets removed from gallery.");
  deleteSelectedBtn.textContent = originalText;
  selectedForDeletion.clear();
});

// --- CMS: SAVE CREDITS ---
saveCreditsBtn.addEventListener('click', async () => {
  const rawText = creditsInput.value;
  creditsData = rawText.split(',').map(s => s.trim()).filter(s => s !== "");
  try {
    await setDoc(doc(db, "gallery_config", "credits"), { list: creditsData });
    showToast("Credits Updated!");
  } catch(e) { showToast("Failed to save credits."); }
});

// --- CMS: UPLOAD IMAGE (TERMINAL LOG) ---
fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  cmsInputs.classList.add('hidden');
  uploadProgressView.classList.remove('hidden');
  finishUploadBtn.classList.add('hidden');
  uploadLog.innerHTML = '';
  
  appendLog(`Initializing batch upload for ${files.length} asset(s)...`, 'info');

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let dateTaken = new Date();
    
    appendLog(`[Asset ${i+1}/${files.length}] Scanning metadata...`, 'info');
    try {
      const exifPromise = exifr.parse(file);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
      const exifData = await Promise.race([exifPromise, timeoutPromise]);
      if (exifData && exifData.DateTimeOriginal) { dateTaken = new Date(exifData.DateTimeOriginal); } 
      else { dateTaken = new Date(file.lastModified); }
    } catch (err) {
      dateTaken = new Date(file.lastModified);
    }

    await new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
      
      let lastLoggedPercent = 0;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const p = Math.round((event.loaded / event.total) * 100);
          if (p >= lastLoggedPercent + 20 || p === 100) {
            appendLog(`[Asset ${i+1}] Uploading packet... ${p}%`, 'info');
            lastLoggedPercent = p;
          }
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url) {
            appendLog(`[Asset ${i+1}] Cloud transfer complete. Registering DB...`, 'info');
            try {
              await addDoc(collection(db, "gallery_photos"), {
                url: data.secure_url,
                timestamp: dateTaken.getTime(),
                hourLabel: formatHourAMPM(dateTaken),
                createdAt: serverTimestamp()
              });
              appendLog(`[Asset ${i+1}] Indexing complete.`, 'success');
              resolve();
            } catch(dbErr) { reject(); }
          }
        } else { reject(); }
      };
      xhr.onerror = () => reject();
      xhr.send(fd);
    });
  }

  appendLog(`All assets processed. Batch upload closed.`, 'success');
  finishUploadBtn.classList.remove('hidden');
  fileInput.value = "";
});

finishUploadBtn.addEventListener('click', () => {
  cmsModal.classList.add('hidden');
  cmsInputs.classList.remove('hidden');
  uploadProgressView.classList.add('hidden');
});

function formatHourAMPM(date) {
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; 
  return `${hours} ${ampm}`;
}

// --- RENDER GRID WITH THUMBNAILS ---
function renderGallery() {
  galleryContainer.innerHTML = '';
  
  if (imagesData.length === 0) {
    galleryContainer.innerHTML = `
      <div class="empty-state">
        <h2>No images available.</h2>
        <p>Check back later.</p>
      </div>`;
    return;
  }

  const partitions = {};
  imagesData.forEach((img, index) => {
    if (!partitions[img.hourLabel]) partitions[img.hourLabel] = [];
    partitions[img.hourLabel].push({ ...img, globalIndex: index });
  });

  for (const [hour, images] of Object.entries(partitions)) {
    const section = document.createElement('div');
    section.className = 'time-partition';
    
    const header = document.createElement('h2');
    header.textContent = hour;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'image-grid';

    images.forEach(img => {
      const card = document.createElement('div');
      card.className = 'image-card';
      // Load optimized Cloudinary thumbnail instead of full image
      card.innerHTML = `<img src="${getCloudinaryThumb(img.url)}" loading="lazy" alt="Event photo">`;
      card.addEventListener('click', () => openFullscreenViewer(img.globalIndex));
      grid.appendChild(card);
    });

    section.appendChild(grid);
    galleryContainer.appendChild(section);
  }
}

// --- FULLSCREEN TIKTOK VIEWER ---
function buildFullscreenViewer() {
  scrollContainer.innerHTML = '';
  imagesData.forEach((img, index) => {
    const slide = document.createElement('div');
    slide.className = 'scroll-slide';
    slide.id = `slide-${index}`;
    
    // Viewer keeps the high-resolution source URL
    slide.innerHTML = `
      <img src="${img.url}" loading="lazy" alt="Event photo">
      <button class="download-action" onclick="forceDownload('${img.url}', ${index + 1})">↓ Save Image</button>
    `;
    scrollContainer.appendChild(slide);
  });
}

function openFullscreenViewer(index) {
  fullscreenViewer.classList.remove('hidden');
  
  if (!hasSeenOnboarding) {
    scrollOnboarding.classList.remove('hidden');
    setTimeout(() => scrollOnboarding.classList.add('hidden'), 3000);
    hasSeenOnboarding = true;
  }

  const targetSlide = document.getElementById(`slide-${index}`);
  if (targetSlide) {
    targetSlide.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
}

closeViewerBtn.addEventListener('click', () => {
  fullscreenViewer.classList.add('hidden');
});

// --- FORCE DOWNLOAD ---
window.forceDownload = async function(url, numberIndex) {
  try {
    showToast("Preparing download...");
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Event_Photo_${numberIndex}.jpg`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    window.open(url, '_blank');
  }
};