import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, query, orderBy, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
const CLOUDINARY_PRESET = "pphone"; 

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
const fileInput = document.getElementById('image-upload');
const creditsListUl = document.getElementById('credits-list');
const creditsInput = document.getElementById('credits-input');
const saveCreditsBtn = document.getElementById('save-credits-btn');
const galleryContainer = document.getElementById('gallery-container');
const uploadStatus = document.getElementById('upload-status');

let imagesData = [];
let creditsData = ['Saditha Sulakshana (PGS)'];
let hasSeenOnboarding = false;

// Toast Utility
function showToast(msg) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = "glass-toast";
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// --- REAL-TIME FIRESTORE LISTENERS ---
// 1. Listen for Credits
onSnapshot(doc(db, "gallery_config", "credits"), (snap) => {
  if (snap.exists() && snap.data().list) {
    creditsData = snap.data().list;
    renderCredits();
  }
});

// 2. Listen for Photos (Bypasses all static Cloudflare caching)
onSnapshot(query(collection(db, "gallery_photos"), orderBy("timestamp", "asc")), (snap) => {
  imagesData = [];
  snap.forEach(docSnap => {
    imagesData.push({ id: docSnap.id, ...docSnap.data() });
  });
  
  if (galleryPage.classList.contains('active')) {
    renderGallery();
    buildFullscreenViewer();
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

// --- NAVIGATION ---
viewBtn.addEventListener('click', async () => {
  landingPage.classList.remove('active');
  
  if (imagesData.length === 0) {
    galleryPage.classList.add('active');
    renderGallery(); 
  } else {
    loadingScreen.classList.remove('hidden');
    loadingScreen.classList.add('active');
    
    await preloadImages(imagesData.map(img => img.url));
    
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('hidden');
    galleryPage.classList.add('active');
    renderGallery();
    buildFullscreenViewer();
  }
});

backBtn.addEventListener('click', () => {
  galleryPage.classList.remove('active');
  landingPage.classList.add('active');
});

function preloadImages(urls) {
  return Promise.all(urls.map(url => {
    return new Promise(resolve => {
      const img = new Image();
      img.src = url;
      img.onload = resolve;
      img.onerror = resolve; 
    });
  }));
}

// --- SECRET TRIPLE-CLICK CMS ---
let clickCount = 0;
let clickTimer;

secretTrigger.addEventListener('click', () => {
  clickCount++;
  if (clickCount === 1) {
    clickTimer = setTimeout(() => { clickCount = 0; }, 1000);
  } else if (clickCount === 3) {
    clearTimeout(clickTimer);
    clickCount = 0;
    
    // Instantly open CMS without authentication
    openCmsModal();
  }
});

function openCmsModal() {
  creditsInput.value = creditsData.join(', ');
  cmsModal.classList.remove('hidden');
}

closeCmsBtn.addEventListener('click', () => cmsModal.classList.add('hidden'));

// --- CMS: SAVE CREDITS ---
saveCreditsBtn.addEventListener('click', async () => {
  const rawText = creditsInput.value;
  creditsData = rawText.split(',').map(s => s.trim()).filter(s => s !== "");
  
  try {
    await setDoc(doc(db, "gallery_config", "credits"), { list: creditsData });
    showToast("Credits Updated!");
  } catch(e) {
    showToast("Failed to save credits.");
  }
});

// --- CMS: UPLOAD IMAGE ---
fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  uploadStatus.textContent = "Uploading assets...";

  for (let file of files) {
    let dateTaken = new Date();
    try {
      const exifData = await exifr.parse(file);
      if (exifData && exifData.DateTimeOriginal) {
        dateTaken = new Date(exifData.DateTimeOriginal);
      } else if (file.lastModified) {
        dateTaken = new Date(file.lastModified);
      }
    } catch (err) {
      console.log("No EXIF data.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST', 
        body: formData
      });
      const data = await res.json();

      if (data.secure_url) {
        await addDoc(collection(db, "gallery_photos"), {
          url: data.secure_url,
          timestamp: dateTaken.getTime(),
          hourLabel: formatHourAMPM(dateTaken),
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
    }
  }

  uploadStatus.textContent = "";
  showToast("Upload Complete!");
  cmsModal.classList.add('hidden');
  fileInput.value = "";
});

function formatHourAMPM(date) {
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; 
  return `${hours} ${ampm}`;
}

// --- RENDER GRID ---
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
      card.innerHTML = `<img src="${img.url}" loading="lazy" alt="Event photo">`;
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
    
    slide.innerHTML = `
      <img src="${img.url}" alt="Event photo">
      <button class="download-action" onclick="forceDownload('${img.url}', ${index + 1})">↓ Save Image</button>
    `;
    scrollContainer.appendChild(slide);
  });
}

function openFullscreenViewer(index) {
  fullscreenViewer.classList.remove('hidden');
  
  if (!hasSeenOnboarding) {
    scrollOnboarding.classList.remove('hidden');
    hasSeenOnboarding = true;
  } else {
    scrollOnboarding.classList.add('hidden');
  }

  const targetSlide = document.getElementById(`slide-${index}`);
  if (targetSlide) {
    targetSlide.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
}

closeViewerBtn.addEventListener('click', () => {
  fullscreenViewer.classList.add('hidden');
});

// --- FORCE DOWNLOAD WITH RENAME BY NUMBER ---
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