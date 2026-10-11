import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, serverTimestamp, addDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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
const ADMIN_EMAIL = "undercoverhaein@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let deadlineDate = null;
let timerInterval = null;
let cachedAdmin = false;
let isIntroGliding = false; 
let isVideoPrepping = false;

onAuthStateChanged(auth, (user) => { if (user && user.email === ADMIN_EMAIL) cachedAdmin = true; });

// Legacy background window scroll function
function smoothScrollToY(endY, duration) {
  const startY = window.scrollY || window.pageYOffset;
  const distance = endY - startY;
  const startTime = performance.now();
  return new Promise(resolve => {
    function step(time) {
      let progress = (time - startTime) / duration;
      if (progress > 1) progress = 1;
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startY + distance * ease);
      if (progress < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}

// Leaderboard linear climb function
function linearScrollToTop(element, duration) {
  const start = element.scrollTop;
  const startTime = performance.now();
  
  return new Promise(resolve => {
    function step(time) {
      let progress = (time - startTime) / duration;
      if (progress > 1) progress = 1;
      element.scrollTop = start * (1 - progress);
      if (progress < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

function showToast(msg, scrollToForm = false) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div"); t.className = "glass-toast"; 
  t.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> <span>${msg}</span>`;
  if (scrollToForm) { t.onclick = () => { document.getElementById("formCard").scrollIntoView({ behavior: 'smooth', block: 'center' }); t.remove(); }; }
  c.appendChild(t); setTimeout(() => { if(t.parentElement) t.remove(); }, 6000);
}
window.showToast = showToast;

function timeAgo(date) {
  if (!date) return "Just now";
  const seconds = Math.floor((new Date() - date) / 1000);
  let int = seconds / 86400; if (int >= 1) return Math.floor(int) + " days ago";
  int = seconds / 3600; if (int >= 1) return Math.floor(int) + " hrs ago";
  int = seconds / 60; if (int >= 1) return Math.floor(int) + " mins ago";
  return "Just now";
}

const entryGate = document.getElementById("entryGate");
const entryLoader = document.getElementById("entryLoader");
const video = document.getElementById("instructionVideo");

const enterBtn = document.getElementById("enterSiteBtn");
if (enterBtn) {
  enterBtn.addEventListener("click", () => {
    const isReturningUser = localStorage.getItem("siteVisited") === "true";
    localStorage.setItem("siteVisited", "true");
    
    entryGate.style.display = "none"; 
    entryLoader.classList.remove("hidden");
    
    if (video && video.src && video.src !== window.location.href) {
      isVideoPrepping = true; 
      const ppBtn = document.getElementById("btnPlayPause");
      if(ppBtn) ppBtn.style.opacity = "0";

      video.muted = false; video.volume = 1;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => { video.pause(); video.currentTime = 0; isVideoPrepping = false; if(ppBtn) ppBtn.style.opacity = "1"; })
        .catch(() => { isVideoPrepping = false; if(ppBtn) ppBtn.style.opacity = "1"; });
      } else { isVideoPrepping = false; if(ppBtn) ppBtn.style.opacity = "1"; }
    }

    let hasInitiatedGlide = false;
    const startSequence = () => {
      if(hasInitiatedGlide) return;
      hasInitiatedGlide = true; isIntroGliding = true; 
      
      if (!isReturningUser) { window.scrollTo(0, document.body.scrollHeight); } 
      else {
        const vidSec = document.getElementById("videoSection");
        if(vidSec && vidSec.style.display !== "none") {
          const targetY = vidSec.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 2) + (vidSec.offsetHeight / 2);
          window.scrollTo(0, targetY);
        }
      }
      
      entryLoader.style.opacity = "0";
      setTimeout(() => { 
        entryLoader.classList.add("hidden"); 
        const playVideoFinal = () => {
          if (video) { video.currentTime = 0; video.play().catch(()=>{}); }
          isVideoPrepping = false; 
          if(document.getElementById("btnPlayPause")) document.getElementById("btnPlayPause").style.opacity = "1";
          setTimeout(() => { isIntroGliding = false; }, 500);
        };

        if (!isReturningUser) {
          smoothScrollToY(0, 2500).then(() => {
            const vidSec = document.getElementById("videoSection");
            if(vidSec && vidSec.style.display !== "none") {
              const targetY = vidSec.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 2) + (vidSec.offsetHeight / 2);
              smoothScrollToY(targetY, 2500).then(playVideoFinal);
            } else { isIntroGliding = false; }
          });
        } else { playVideoFinal(); }
      }, 400);
    };

    setTimeout(() => {
      if (video && (video.readyState >= 3 || !video.src || video.src === window.location.href)) { startSequence(); } 
      else { const checkVid = setInterval(() => { if (video && video.readyState >= 3) { clearInterval(checkVid); startSequence(); } }, 500); setTimeout(() => { clearInterval(checkVid); startSequence(); }, 3000); }
    }, 3000); 
  });
}

const videoContainer = document.getElementById("videoContainer");
if (videoContainer) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (isIntroGliding) return;
      if (!e.isIntersecting && video && !video.paused) { videoContainer.classList.add("mini-player"); video.setAttribute("controls", "true"); } 
      else { videoContainer.classList.remove("mini-player"); if (video) video.removeAttribute("controls"); }
    });
  }, { threshold: 0.1 });
  const vs = document.getElementById("videoSection");
  if (vs) videoObserver.observe(vs);
}

const track = document.getElementById("carouselTrack");
let carTimer;

function updateCarouselDots() {
  if (!track) return;
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)'); if(slides.length <= 1) return;
  const currentIndex = parseInt(track.firstElementChild.dataset.index);
  const dots = document.querySelectorAll('#carouselDots .dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
}

function slideNext() {
  if (!track) return;
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)'); if(slides.length <= 1) return;
  track.style.transition = 'transform 0.4s ease-in-out'; track.style.transform = 'translateX(-100%)';
  setTimeout(() => { track.appendChild(track.firstElementChild); track.style.transition = 'none'; track.style.transform = 'translateX(0)'; updateCarouselDots(); }, 400);
}

function startCarousel() { clearInterval(carTimer); carTimer = setInterval(slideNext, 4000); }

function initCarousel() {
  if (!track) return;
  const slides = track.querySelectorAll('.car-slide-wrapper:not(.hidden-slide)'); const dc = document.getElementById("carouselDots"); dc.innerHTML = "";
  if(slides.length > 1) { slides.forEach((s, i) => { s.dataset.index = i; const d = document.createElement("span"); d.className = "dot"; if(i===0) d.classList.add("active"); dc.appendChild(d); }); startCarousel(); }
}

const ppBtn = document.getElementById("btnPlayPause"); const seek = document.getElementById("seekSlider"); const vol = document.getElementById("volumeSlider");
const iPlay = document.getElementById("iconPlay"); const iPause = document.getElementById("iconPause");

if (ppBtn && video) {
  ppBtn.addEventListener("click", () => {
    if (video.paused) { video.play(); iPlay.classList.add("hidden"); iPause.classList.remove("hidden"); } 
    else { video.pause(); iPause.classList.add("hidden"); iPlay.classList.remove("hidden"); }
  });
  video.addEventListener("play", () => { if (isVideoPrepping) return; iPlay.classList.add("hidden"); iPause.classList.remove("hidden"); });
  video.addEventListener("pause", () => { if (isVideoPrepping) return; iPause.classList.add("hidden"); iPlay.classList.remove("hidden"); });

  document.getElementById("btnBack5").addEventListener("click", () => video.currentTime -= 5);
  document.getElementById("btnFwd5").addEventListener("click", () => video.currentTime += 5);
  video.addEventListener("timeupdate", () => seek.value = (100 / video.duration) * video.currentTime || 0);
  seek.addEventListener("input", () => video.currentTime = video.duration * (seek.value / 100));
  vol.addEventListener("input", () => video.volume = vol.value);
}

window.copyToolLink = (num) => {
  const link = document.getElementById(`toolLink${num}`).href;
  if (link && link !== window.location.href && !link.endsWith("#")) { navigator.clipboard.writeText(link).then(() => showToast("Site Link Copied!")); } 
  else { showToast("No valid link to copy yet."); }
};

onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const d = snap.data();
    if (d.deadline) { deadlineDate = new Date(d.deadline); startDigitalCountdown(); }
    
    const pSec = document.getElementById("previewSection");
    if (pSec) {
      if (d.preview1 || d.preview2) {
        pSec.style.display = "block";
        const w1 = document.getElementById("ref1Wrap"); const w2 = document.getElementById("ref2Wrap");
        if (d.preview1) { document.getElementById("ref1").src = d.preview1; w1.classList.remove("hidden-slide"); } else { w1.classList.add("hidden-slide"); }
        if (d.preview2) { document.getElementById("ref2").src = d.preview2; w2.classList.remove("hidden-slide"); } else { w2.classList.add("hidden-slide"); }
        initCarousel();
      } else { pSec.style.display = "none"; }
    }
    
    const vSec = document.getElementById("videoSection");
    if (vSec && video) {
      if (d.videoUrl) { vSec.style.display = "block"; video.src = d.videoUrl; } else { vSec.style.display = "none"; }
    }

    const tSec = document.getElementById("toolsSection");
    if (tSec) {
      if (d.tool1Title || d.tool2Title || d.tool3Title) {
        tSec.style.display = "block";
        for (let i = 1; i <= 3; i++) {
          const title = d[`tool${i}Title`]; const url = d[`tool${i}Url`]; const img = d[`tool${i}Img`];
          if (title) { document.getElementById(`toolTitle${i}`).innerText = title; document.getElementById(`adminTool${i}Title`).value = title; }
          if (url) { document.getElementById(`toolLink${i}`).href = url; document.getElementById(`adminTool${i}Url`).value = url; }
          if (img) { document.getElementById(`toolImg${i}`).src = img; }
        }
      } else { tSec.style.display = "none"; }
    }
  }
});

let dotCount = 1;
setInterval(() => { dotCount = (dotCount % 3) + 1; const ld = document.getElementById("loadingDots"); if(ld) ld.innerText = ".".repeat(dotCount); }, 400);

function startDigitalCountdown() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - Date.now(); const abs = Math.abs(diff);
    const h = Math.floor(abs / (1000 * 60 * 60)).toString().padStart(2, "0");
    const m = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    const s = Math.floor((abs % (1000 * 60)) / 1000).toString().padStart(2, "0");

    const cd = document.getElementById("countdown");
    if (cd) {
      cd.innerText = `${diff < 0 ? "-" : ""}${h}:${m}:${s}`;
      document.getElementById("timerStatusText").innerText = diff < 0 ? "DEADLINE PASSED" : "Time remaining";
    }

    document.querySelectorAll('.time-updater').forEach(el => { if(el.dataset.time) el.innerText = timeAgo(new Date(parseInt(el.dataset.time))); });
  }, 1000);
}

let myId = localStorage.getItem("mySubId") || doc(collection(db, "submissions")).id;
let uploadTime = localStorage.getItem("mySubTime") || 0;
const tickIcon = `<svg class="icon-svg svg-tick" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

let hasAnimatedLeaderboard = false;

onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  const orgList = document.getElementById("organizerList"); const regList = document.getElementById("rosterList"); const gallery = document.getElementById("adminGallery");
  if(orgList) orgList.innerHTML = ""; 
  if(regList) regList.innerHTML = ""; 
  if(gallery) gallery.innerHTML = "";
  
  let counter = 0; let rank = 1;

  const landingLb = document.getElementById("landingLeaderboard");
  const lbWrapper = document.getElementById("lbWrapper");
  const lbTitle = document.getElementById("lbTitle");
  
  let t0 = 0;
  let sortedSubs = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data(); const id = docSnap.id; const now = Date.now();
    sortedSubs.push({ id, ...d });

    const editTime = d.editTimestamp || 0; const isTimeout = d.isEditing && (now - editTime > 300000); 

    if (isTimeout && id === myId && d.isEditing) { setDoc(doc(db, "submissions", myId), { isEditing: false }, { merge: true }); localStorage.removeItem("isEditingLocal"); d.isEditing = false; }
    
    if(!d.isStandalone && orgList && regList) {
      counter++;
      const canEdit = (id === myId && (now - uploadTime) < 300000); 
      const editBtn = canEdit ? `<button class="btn-edit-user" onclick="triggerUserEdit('${d.firstName}','${d.lastName}','${d.role}')">Edit</button>` : "";
      
      let tsMillis = d.time ? (d.time.toMillis ? d.time.toMillis() : now) : now;
      const timeText = timeAgo(new Date(tsMillis));
      
      let statusHtml = "";
      if (d.isEditing && !isTimeout) { statusHtml = `<span class="editing-text">Editing...</span>`; } 
      else { statusHtml = `${editBtn}<span class="chess-time time-updater" data-time="${tsMillis}">${timeText}</span>${tickIcon}`; }

      const cardHtml = `
        <div class="chess-row">
          ${!d.isOrganizer ? `<div class="chess-rank">${rank++}</div>` : ''}
          <div class="chess-details">
            <span class="chess-name">${d.firstName} <span style="font-weight:400;">${d.lastName || ''}</span></span>
            <span class="chess-role">${d.role || ''}</span>
          </div>
          <div class="chess-status">${statusHtml}</div>
        </div>`;
      
      d.isOrganizer ? (orgList.innerHTML += cardHtml) : (regList.innerHTML += cardHtml);
    }

    if (gallery) {
      let imgHtml = `<div class="no-img-placeholder">Manual Entry</div>`; let dlBtn = ''; let beforeUploadBtn = '';
      
      if (d.imageUrl) {
        if (d.imageUrl.includes(".mp4") || d.imageUrl.includes(".mov") || d.imageUrl.includes("/video/")) {
          imgHtml = `<video src="${d.imageUrl}" style="width:100%; height:220px; object-fit:cover; background:#000;" controls></video>`;
        } else { imgHtml = `<img src="${d.imageUrl}">`; }
        dlBtn = `<button class="btn-admin-action green-btn" style="flex:1" onclick="window.open('${d.imageUrl}', '_blank')">Download File</button>`;
      } else if (d.isStandalone && d.finalImageUrl) {
        imgHtml = `<img src="${d.finalImageUrl}">`;
        dlBtn = `<button class="btn-admin-action green-btn" style="flex:1" onclick="window.open('${d.finalImageUrl}', '_blank')">Download Final</button>`;
      } else {
        beforeUploadBtn = `<button class="btn-admin-action" style="flex:1; background:#3b82f6; color:white; border:none;" onclick="triggerBeforeUpload('${id}')">Upload Original</button>`;
      }
      
      const editingClass = (d.isEditing && !isTimeout) ? "is-editing-admin" : "";
      const editingBadge = (d.isEditing && !isTimeout) ? `<div class="is-editing-badge">Editing...</div>` : "";

      let finalUploadBtn = "";
      if (d.isStandalone) {
        finalUploadBtn = `<span class="editing-text" style="color: #2563eb; width: 100%; text-align: center; margin-bottom: 5px;">Standalone Post</span>`;
      } else {
        finalUploadBtn = !d.finalImageUrl 
          ? `<button class="btn-admin-action" style="flex:1; background:#facc15; border:none;" onclick="triggerFinalUpload('${id}')">Upload Processed Image</button>`
          : `<button class="btn-admin-action" style="flex:1; background:#fef08a; border:none;" onclick="triggerFinalUpload('${id}')">Replace Processed Image</button>
             <button class="btn-admin-danger" style="flex:1;" onclick="removeFinalImage('${id}')">Remove Processed</button>`;
      }

      gallery.innerHTML += `
        <div class="gallery-card ${editingClass}" id="gal-${id}">
          ${editingBadge} ${imgHtml}
          <div class="gallery-info">
            <h4>${d.firstName} ${d.lastName || ''}</h4><p style="color:#64748b; font-size:0.85rem; margin-bottom:15px;">${d.role || 'No Location Data'}</p>
            <div style="display:flex; gap:8px; margin-bottom: 10px;">
              <button class="btn-admin-action" style="flex:1" onclick="navigator.clipboard.writeText('${d.firstName} ${d.lastName || ''} - ${d.role || ''}'); showToast('Copied!')">Copy Info</button>
              ${dlBtn} ${beforeUploadBtn}
            </div>
            <div style="display:flex; gap:8px; margin-bottom: 10px;">${finalUploadBtn}</div>
            <button class="btn-danger" onclick="showDeleteConfirm('${id}')">Delete Entry</button>
            <div class="del-req-box hidden" id="delbox-${id}">
              <input type="text" id="delinput-${id}" class="del-input" placeholder="Type 'delete'" autocomplete="off">
              <button class="btn-confirm-del" onclick="executeDelete('${id}')">Confirm</button>
            </div>
          </div>
        </div>`;
    }
  });

  const rc = document.getElementById("rosterCounter");
  if (rc) rc.textContent = `${counter} Uploads`;

  if(landingLb) {
    const lbSubs = sortedSubs.filter(d => !d.isStandalone).slice(0, 13);
    const nonOrg = lbSubs.filter(s => !s.isOrganizer && s.time);
    if (nonOrg.length > 0) t0 = nonOrg[0].time.toMillis();

    const isInitialLoad = !hasAnimatedLeaderboard;
    hasAnimatedLeaderboard = true;

    const rowElements = lbSubs.map((d, index) => {
      const lbRank = index + 1;
      let timeText = "";
      if (lbRank === 3) {
        timeText = "In 43 mins";
      } else if (d.isOrganizer) {
        timeText = "Featured";
      } else {
        let tsMillis = d.time ? d.time.toMillis() : Date.now();
        let diff = tsMillis - t0;
        let mins = Math.max(0, Math.floor(diff / 60000));
        let hrs = Math.floor(mins / 60);
        
        if (hrs > 0) {
          timeText = `In ${hrs} hr${hrs > 1 ? 's' : ''}`;
        } else {
          timeText = `In ${mins} min${mins !== 1 ? 's' : ''}`;
        }
      }

      return `
        <div class="chess-row ${isInitialLoad ? 'lb-row-hidden' : 'lb-row-visible'}" style="padding: 12px 15px; gap: 10px;">
          <div class="chess-rank" style="font-size: 0.95rem;">${lbRank}</div>
          <div class="chess-details">
            <span class="chess-name" style="font-size: 0.95rem;">${d.firstName} <span style="font-weight:400;">${d.lastName || ''}</span></span>
          </div>
          <div class="chess-status">
            <span class="chess-time" style="font-size: 0.8rem; font-weight: bold; color: var(--accent-blue);">${timeText}</span>
          </div>
        </div>`;
    });

    landingLb.innerHTML = rowElements.join("");

    if (isInitialLoad) {
      if (lbSubs.length > 0) {
        if(lbWrapper) lbWrapper.classList.add("lb-wrapper-show");
        if(lbTitle) lbTitle.classList.add("cinematic-title-show");

        setTimeout(() => {
          landingLb.scrollTop = landingLb.scrollHeight; 

          const rows = landingLb.querySelectorAll('.chess-row');
          const totalItems = rows.length;
          const scrollDuration = 1600; 
          const intervalTime = scrollDuration / totalItems; 

          linearScrollToTop(landingLb, scrollDuration).then(() => {
            const welcome = document.getElementById("welcomeBox");
            const credits = document.getElementById("creditsBox");
            const eg = document.getElementById("entryGate");
            if (welcome && eg) {
              welcome.classList.add("wb-show");
              if(credits) credits.classList.add("wb-show");
              setTimeout(() => {
                const btn = document.getElementById("seeResultsBtn");
                if (btn) {
                  const rect = btn.getBoundingClientRect();
                  const targetY = rect.top + eg.scrollTop - (window.innerHeight / 2) + (rect.height / 2);
                  
                  const startY = eg.scrollTop;
                  const distance = targetY - startY;
                  const startTime = performance.now();
                  const dur = 600;
                  
                  function step(time) {
                    let progress = (time - startTime) / dur;
                    if (progress > 1) progress = 1;
                    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                    eg.scrollTop = startY + distance * ease;
                    if (progress < 1) requestAnimationFrame(step);
                  }
                  requestAnimationFrame(step);
                }
              }, 150);
            }
          });

          let delay = 0;
          for (let i = totalItems - 1; i >= 0; i--) {
            setTimeout(() => {
              rows[i].classList.remove('lb-row-hidden');
              rows[i].classList.add('lb-row-visible');
            }, delay);
            delay += intervalTime;
          }
        }, 400); 
      } else {
        const welcome = document.getElementById("welcomeBox");
        const credits = document.getElementById("creditsBox");
        if (welcome) welcome.classList.add("wb-show");
        if (credits) credits.classList.add("wb-show");
      }
    }
  }
});

window.triggerFinalUpload = async (subId) => {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const url = await adminCloudUploadWithProgress(file, "Uploading Final Image..."); await setDoc(doc(db, "submissions", subId), { finalImageUrl: url }, { merge: true }); showToast("Final Image Paired!"); } catch(err) { showToast("Upload failed."); }
  };
  input.click();
};

window.removeFinalImage = async (subId) => {
  if (confirm("Remove the finalized image for this entry?")) {
    try {
      await updateDoc(doc(db, "submissions", subId), { finalImageUrl: "" });
      showToast("Final image removed!");
    } catch (err) { showToast("Failed to remove."); }
  }
};

window.triggerBeforeUpload = async (subId) => {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const url = await adminCloudUploadWithProgress(file, "Uploading Original Image..."); await setDoc(doc(db, "submissions", subId), { imageUrl: url }, { merge: true }); showToast("Original Image Added!"); } catch(err) { showToast("Upload failed."); }
  };
  input.click();
};

window.showDeleteConfirm = (id) => document.getElementById(`delbox-${id}`).classList.remove("hidden");
window.executeDelete = async (id) => {
  if (document.getElementById(`delinput-${id}`).value.toLowerCase() === "delete") { await deleteDoc(doc(db, "submissions", id)); showToast("Deleted successfully."); } else { showToast("Type 'delete' exactly."); }
};

window.triggerUserEdit = async (f, l, r) => {
  const proceed = confirm("Notice: Only press Edit if you made a mistake.\n\nTo edit: Make your changes below, then press the 'Confirm Edit' button to save. Continue?"); if (!proceed) return;
  localStorage.setItem("isEditingLocal", "true");
  document.getElementById("firstName").value = f; document.getElementById("lastName").value = l; document.getElementById("role").value = r;
  document.getElementById("editNotice").classList.remove("hidden"); 
  
  const revBtn = document.getElementById("reviewBtn"); revBtn.innerText = "Confirm Edit"; revBtn.classList.add("shake-constant");
  document.getElementById("successCard").classList.add("hidden"); document.getElementById("formCard").classList.remove("hidden"); document.getElementById("uploadForm").classList.remove("hidden"); document.getElementById("reviewContainer").classList.add("hidden");
  document.getElementById("formCard").scrollIntoView({ behavior: 'smooth', block: 'center' });
  try { await setDoc(doc(db, "submissions", myId), { isEditing: true, editTimestamp: Date.now() }, { merge: true }); } catch(e){}
};

let selectedFile = null; const fileInput = document.getElementById("fileInput");
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) {
      selectedFile = e.target.files[0];
      document.getElementById("dropzoneContent").innerHTML = `
        <svg class="icon-svg" style="width:40px;height:40px;color:#10b981;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <h3 style="color:#10b981;">${selectedFile.name}</h3><small>Ready for upload</small>`;
    }
  });
}

const reviewBtn = document.getElementById("reviewBtn");
if (reviewBtn) {
  reviewBtn.addEventListener("click", async () => {
    const f = document.getElementById("firstName").value.trim(); const l = document.getElementById("lastName").value.trim(); const r = document.getElementById("role").value.trim();
    const isEditing = localStorage.getItem("isEditingLocal") === "true";

    if (!f || !l || !r) { showToast("Please fill all fields."); return; }
    if (!selectedFile && !isEditing) { showToast("Please select a picture."); return; }

    if (isEditing && !selectedFile) {
      document.getElementById("uploadOverlay").classList.remove("hidden"); document.getElementById("overlayText").innerText = "Saving Edits...";
      await setDoc(doc(db, "submissions", myId), { firstName: f, lastName: l, role: r, isEditing: false }, { merge: true });
      localStorage.removeItem("isEditingLocal");
      const revBtn = document.getElementById("reviewBtn"); revBtn.innerText = "Review Submission"; revBtn.classList.remove("shake-constant");
      document.getElementById("uploadOverlay").classList.add("hidden"); document.getElementById("formCard").classList.add("hidden"); document.getElementById("successCard").classList.remove("hidden");
      showToast("Edits Saved!", true); return;
    }

    document.getElementById("uploadForm").classList.add("hidden"); document.getElementById("reviewContainer").classList.remove("hidden");
    document.getElementById("reviewName").innerHTML = `${f} <span style="font-weight:400; font-size:0.9em;">${l}</span>`; document.getElementById("reviewRole").innerText = r;
    if (selectedFile) {
      if (selectedFile.type.includes("video")) { document.getElementById("reviewImage").style.display = "none"; } 
      else { document.getElementById("reviewImage").style.display = "block"; document.getElementById("reviewImage").src = URL.createObjectURL(selectedFile); }
    }
  });
}

const cancelRevBtn = document.getElementById("cancelReviewBtn");
if (cancelRevBtn) cancelRevBtn.addEventListener("click", () => { document.getElementById("uploadForm").classList.remove("hidden"); document.getElementById("reviewContainer").classList.add("hidden"); });

const confirmSubBtn = document.getElementById("confirmSubmitBtn");
if (confirmSubBtn) {
  confirmSubBtn.addEventListener("click", () => {
    document.getElementById("uploadOverlay").classList.remove("hidden");
    const fd = new FormData(); fd.append("file", selectedFile); fd.append("upload_preset", CLOUDINARY_PRESET);
    const xhr = new XMLHttpRequest(); xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = Math.round((e.loaded / e.total) * 100);
        document.getElementById("progressBar").style.width = p + "%"; document.getElementById("progressPercent").textContent = p + "%";
        if (p === 100) document.getElementById("overlayText").innerText = "Securing Assets...";
      }
    };
    xhr.onload = async () => {
      if (xhr.status === 200) {
        const resp = JSON.parse(xhr.responseText); let finalUrl = resp.secure_url;
        if (resp.resource_type === "video") finalUrl = finalUrl.replace("/upload/", "/upload/f_mp4,q_auto/");
        const isEditing = localStorage.getItem("isEditingLocal") === "true";
        const payload = { firstName: document.getElementById("firstName").value, lastName: document.getElementById("lastName").value, role: document.getElementById("role").value, imageUrl: finalUrl, isOrganizer: false, isEditing: false };
        
        if (!isEditing) payload.time = serverTimestamp();
        await setDoc(doc(db, "submissions", myId), payload, { merge: true });
        if (!isEditing) { uploadTime = Date.now(); localStorage.setItem("mySubId", myId); localStorage.setItem("mySubTime", uploadTime); }
        
        localStorage.removeItem("isEditingLocal");
        const revBtn = document.getElementById("reviewBtn"); revBtn.innerText = "Review Submission"; revBtn.classList.remove("shake-constant");
        document.getElementById("dropzoneContent").innerHTML = ` <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg> <h3>Choose High-Quality Picture</h3><small>Click to browse files</small>`;
        
        document.getElementById("uploadOverlay").classList.add("hidden"); document.getElementById("reviewContainer").classList.add("hidden"); document.getElementById("formCard").classList.add("hidden"); document.getElementById("successCard").classList.remove("hidden");
        showToast(isEditing ? "Update Recorded!" : "Submission Recorded!", true);
      } else { showToast("Upload failed."); document.getElementById("uploadOverlay").classList.add("hidden"); }
    };
    xhr.send(fd);
  });
}

const resBtn = document.getElementById("resetBtn");
if (resBtn) resBtn.addEventListener("click", () => { triggerUserEdit(document.getElementById("firstName").value, document.getElementById("lastName").value, document.getElementById("role").value); });

let taps = 0, lastTap = 0;
document.getElementById("secretTrigger").addEventListener("click", () => {
  const now = Date.now(); if (now - lastTap < 500) taps++; else taps = 1; lastTap = now;
  if (taps === 3) {
    taps = 0; if (cachedAdmin) { document.getElementById("adminPanel").classList.remove("hidden"); } else { signInWithPopup(auth, provider).then((res) => { if (res.user.email === ADMIN_EMAIL) document.getElementById("adminPanel").classList.remove("hidden"); else showToast("Access Denied."); }); }
  }
});
document.getElementById("closeAdminBtn").addEventListener("click", () => document.getElementById("adminPanel").classList.add("hidden"));

function switchAdminTab(activeTabId, activeViewId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));
  document.getElementById(activeTabId).classList.add('active');
  document.getElementById(activeViewId).classList.remove('hidden');
}
document.getElementById("tabSettings").addEventListener("click", () => switchAdminTab("tabSettings", "viewSettings"));
document.getElementById("tabGallery").addEventListener("click", () => switchAdminTab("tabGallery", "viewGallery"));
document.getElementById("tabOrder").addEventListener("click", () => { switchAdminTab("tabOrder", "viewOrder"); renderDraggableList(); });

function adminCloudUploadWithProgress(file, labelTitle) {
  return new Promise((resolve, reject) => {
    document.getElementById("adminUploadOverlay").classList.remove("hidden"); document.getElementById("adminOverlayText").innerText = labelTitle; document.getElementById("adminProgressBar").style.width = "0%"; document.getElementById("adminProgressPercent").innerText = "0%";
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET);
    const xhr = new XMLHttpRequest(); xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) { const p = Math.round((e.loaded / e.total) * 100); document.getElementById("adminProgressBar").style.width = p + "%"; document.getElementById("adminProgressPercent").innerText = p + "%"; if(p === 100) document.getElementById("adminOverlayText").innerText = "Processing Format..."; } };
    xhr.onload = () => { document.getElementById("adminUploadOverlay").classList.add("hidden"); if (xhr.status === 200) { const resp = JSON.parse(xhr.responseText); let finalUrl = resp.secure_url; if (resp.resource_type === "video") finalUrl = finalUrl.replace("/upload/", "/upload/f_mp4,vc_h264,q_auto/"); resolve(finalUrl); } else { showToast("Upload failed server-side."); reject("Failed"); } };
    xhr.onerror = () => { document.getElementById("adminUploadOverlay").classList.add("hidden"); showToast("Network Error."); reject("Error"); };
    xhr.send(fd);
  });
}

document.getElementById("saveTimerBtn").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { deadline: new Date(document.getElementById("adminTimer").value).toISOString() }, { merge: true }); showToast("Timer Updated!"); });
document.getElementById("uploadVideoBtn").addEventListener("click", async () => { const f = document.getElementById("adminVideoFile").files[0]; if (!f) return; try { const url = await adminCloudUploadWithProgress(f, "Uploading Video..."); await setDoc(doc(db, "config", "settings"), { videoUrl: url }, { merge: true }); showToast("Video Live!"); } catch(e){} });
document.getElementById("removeVideoBtn").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { videoUrl: "" }, { merge: true }); showToast("Video Removed."); });

const saveToolText = async (step) => { const t = document.getElementById(`adminTool${step}Title`).value; const u = document.getElementById(`adminTool${step}Url`).value; await setDoc(doc(db, "config", "settings"), { [`tool${step}Title`]: t, [`tool${step}Url`]: u }, { merge: true }); showToast(`Step ${step} Text Saved!`); };
const saveToolImg = async (step) => { const f = document.getElementById(`adminTool${step}Img`).files[0]; if (!f) return; try { const url = await adminCloudUploadWithProgress(f, `Uploading Step ${step} Icon...`); await setDoc(doc(db, "config", "settings"), { [`tool${step}Img`]: url }, { merge: true }); showToast(`Step ${step} Icon Saved!`); } catch(e) {} };
document.getElementById("saveTool1TextBtn").addEventListener("click", () => saveToolText(1)); document.getElementById("uploadTool1ImgBtn").addEventListener("click", () => saveToolImg(1));
document.getElementById("saveTool2TextBtn").addEventListener("click", () => saveToolText(2)); document.getElementById("uploadTool2ImgBtn").addEventListener("click", () => saveToolImg(2));
document.getElementById("saveTool3TextBtn").addEventListener("click", () => saveToolText(3)); document.getElementById("uploadTool3ImgBtn").addEventListener("click", () => saveToolImg(3));
document.getElementById("uploadImgBtn1").addEventListener("click", async () => { const f = document.getElementById("adminImgFile1").files[0]; if (!f) return; try { const url = await adminCloudUploadWithProgress(f, "Uploading Picture 1..."); await setDoc(doc(db, "config", "settings"), { preview1: url }, { merge: true }); showToast("Pic 1 Saved!"); } catch(e){} });
document.getElementById("removeImgBtn1").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { preview1: "" }, { merge: true }); showToast("Pic 1 Removed."); });
document.getElementById("uploadImgBtn2").addEventListener("click", async () => { const f = document.getElementById("adminImgFile2").files[0]; if (!f) return; try { const url = await adminCloudUploadWithProgress(f, "Uploading Picture 2..."); await setDoc(doc(db, "config", "settings"), { preview2: url }, { merge: true }); showToast("Pic 2 Saved!"); } catch(e){} });
document.getElementById("removeImgBtn2").addEventListener("click", async () => { await setDoc(doc(db, "config", "settings"), { preview2: "" }, { merge: true }); showToast("Pic 2 Removed."); });
document.getElementById("seedBtn").addEventListener("click", async () => { const f = document.getElementById("seedFirst"); const l = document.getElementById("seedLast"); const r = document.getElementById("seedRole"); if (!f.value || !l.value) return; await setDoc(doc(collection(db, "submissions")), { firstName: f.value, lastName: l.value, role: r.value, isOrganizer: true, time: serverTimestamp() }); f.value = ""; l.value = ""; r.value = ""; showToast("Featured Post added to gallery!"); });

// -------------------------------------------------------------
// STANDALONE UPLOADS & DRAG & DROP ORDERING
// -------------------------------------------------------------
let isDraggingItem = false;

document.getElementById("addStandaloneBtn").addEventListener("click", async () => {
  const file = document.getElementById("standaloneFile").files[0];
  const title = document.getElementById("standaloneTitle").value.trim() || "Standalone Post";
  if (!file) { showToast("Please select an image for the standalone post."); return; }
  
  try {
     const url = await adminCloudUploadWithProgress(file, "Uploading Standalone...");
     await addDoc(collection(db, "submissions"), {
        isStandalone: true,
        finalImageUrl: url,
        firstName: title,
        lastName: "",
        role: "",
        order: finalizedSubmissions.length, 
        time: serverTimestamp()
     });
     document.getElementById("standaloneFile").value = "";
     document.getElementById("standaloneTitle").value = "";
     showToast("Standalone Post Added!");
  } catch (e) {
     showToast("Failed to upload standalone post.");
  }
});

function renderDraggableList() {
  if (isDraggingItem) return;
  const listEl = document.getElementById("draggableOrderList");
  listEl.innerHTML = "";
  
  finalizedSubmissions.forEach((sub, index) => {
     const item = document.createElement("div");
     item.className = "drag-item";
     item.draggable = true;
     item.dataset.id = sub.id;
     item.innerHTML = `
        <div class="drag-handle">☰</div>
        <img src="${sub.finalImageUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin: 0 15px;">
        <div style="flex:1;">
          <strong>${sub.firstName} ${sub.lastName || ''}</strong>
          ${sub.isStandalone ? '<span class="standalone-badge">Standalone</span>' : ''}
        </div>
        <button class="btn-admin-danger btn-remove-standalone" style="padding: 5px 10px; font-size: 0.8rem;" data-id="${sub.id}" ${!sub.isStandalone ? 'style="display:none;"' : ''}>Delete</button>
     `;

     item.addEventListener("dragstart", () => { isDraggingItem = true; item.classList.add("dragging"); });
     item.addEventListener("dragend", () => { isDraggingItem = false; item.classList.remove("dragging"); });
     listEl.appendChild(item);
  });
  setupDragEvents(listEl);
}

function setupDragEvents(listEl) {
  listEl.addEventListener("dragover", (e) => {
     e.preventDefault();
     const afterElement = getDragAfterElement(listEl, e.clientY);
     const dragging = document.querySelector(".dragging");
     if (!dragging) return;
     if (afterElement == null) { listEl.appendChild(dragging); } 
     else { listEl.insertBefore(dragging, afterElement); }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.drag-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
     const box = child.getBoundingClientRect();
     const offset = y - box.top - box.height / 2;
     if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } 
     else { return closest; }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

document.getElementById("saveOrderBtn").addEventListener("click", async () => {
  const listEl = document.getElementById("draggableOrderList");
  const items = [...listEl.querySelectorAll('.drag-item')];
  showToast("Saving custom order...");
  let promises = [];
  items.forEach((item, newIndex) => {
     const id = item.dataset.id;
     promises.push(updateDoc(doc(db, "submissions", id), { order: newIndex }));
  });
  try {
     await Promise.all(promises);
     showToast("Order saved successfully!");
  } catch(e) { showToast("Failed to save order."); }
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-remove-standalone")) {
     if (confirm("Delete this standalone post permanently?")) {
        await deleteDoc(doc(db, "submissions", e.target.dataset.id));
        showToast("Standalone post deleted.");
     }
  }
});

// -------------------------------------------------------------
// RESULTS LOGIC: TIKTOK STYLE, TRUE SCROLL, PER-POST UI 
// -------------------------------------------------------------
const resultsModal = document.getElementById("resultsModal");
const seeResultsBtn = document.getElementById("seeResultsBtn");
const resultsViewport = document.getElementById("resultsViewport");

let finalizedSubmissions = [];
let resultsLoaded = false;
let onboardingTimer = null;
let activeUnsubComments = null;
let activeUnsubSheetComments = null;
let activeLikesUnsub = null;
let currentModalSubId = null;

onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  let tempSubs = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (data.finalImageUrl) { 
      tempSubs.push({ id: doc.id, ...data });
    }
  });

  tempSubs.sort((a, b) => {
    let orderA = a.order !== undefined ? a.order : 9999;
    let orderB = b.order !== undefined ? b.order : 9999;
    if (orderA !== orderB) return orderA - orderB;
    let timeA = a.time ? (a.time.toMillis ? a.time.toMillis() : 0) : 0;
    let timeB = b.time ? (b.time.toMillis ? b.time.toMillis() : 0) : 0;
    return timeA - timeB;
  });

  finalizedSubmissions = tempSubs;
  resultsLoaded = true;

  finalizedSubmissions.forEach(sub => {
    if (sub.finalImageUrl) { const img = new Image(); img.src = sub.finalImageUrl; }
    if (sub.imageUrl) { const img2 = new Image(); img2.src = sub.imageUrl; }
  });

  if (document.getElementById("viewOrder") && !document.getElementById("viewOrder").classList.contains("hidden")) {
     renderDraggableList();
  }
});

seeResultsBtn.addEventListener("click", () => {
  if (resultsLoaded && finalizedSubmissions.length === 0) {
    showToast("No photos uploaded to the gallery yet.");
    return;
  }
  
  document.getElementById("entryGate").style.display = "none";
  entryLoader.classList.remove("hidden");
  
  setTimeout(() => {
    if (!resultsLoaded || finalizedSubmissions.length === 0) {
      entryLoader.classList.add("hidden");
      document.getElementById("entryGate").style.display = "block"; 
      showToast("No photos uploaded to the gallery yet.");
      return;
    }
    
    entryLoader.classList.add("hidden");
    resultsModal.classList.remove("hidden");
    buildResultsCarousel();

    if (!localStorage.getItem("shortsOnboardingV16")) {
      onboardingTimer = setTimeout(() => {
        if (!localStorage.getItem("shortsOnboardingV16")) {
          document.getElementById("scrollOnboarding").classList.remove("hidden");
        }
      }, 2000);
    }
  }, 2500); 
});

let scrollDebounce;
resultsViewport.addEventListener("scroll", () => {
  if (!localStorage.getItem("shortsOnboardingV16")) {
    localStorage.setItem("shortsOnboardingV16", "true");
    clearTimeout(onboardingTimer);
    document.getElementById("scrollOnboarding").classList.add("hidden");
  }

  clearTimeout(scrollDebounce);
  scrollDebounce = setTimeout(() => {
    if (finalizedSubmissions.length <= 1) return;
    const viewportTop = resultsViewport.scrollTop;
    const slides = document.querySelectorAll('.result-slide-wrapper');
    
    let activeSlide = null;
    slides.forEach(slide => {
      if (Math.abs(slide.offsetTop - viewportTop) < 10) {
        activeSlide = slide;
      }
    });

    if (activeSlide) {
      if (activeSlide.classList.contains("is-bottom-clone")) {
        const realFirst = document.getElementById("slide-1");
        if (realFirst) resultsViewport.scrollTop = realFirst.offsetTop;
      } else if (activeSlide.classList.contains("is-top-clone")) {
        const realLast = document.getElementById(`slide-${finalizedSubmissions.length}`);
        if (realLast) resultsViewport.scrollTop = realLast.offsetTop;
      }
    }
  }, 150); 
}, { passive: true });

document.getElementById("closeResultsBtn").addEventListener("click", () => {
  resultsModal.classList.add("hidden");
  document.getElementById("entryGate").style.display = "block"; 
  clearTimeout(onboardingTimer);
  if (activeUnsubComments) activeUnsubComments();
  if (activeLikesUnsub) activeLikesUnsub();
  closeBottomSheet();
});

const resObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const slide = entry.target;
      const domIdx = parseInt(slide.dataset.index);
      const realIndex = parseInt(slide.dataset.realIndex);
      
      document.getElementById("resultsPagination").innerText = `${realIndex + 1} / ${finalizedSubmissions.length}`;
      
      listenToLiveFloatingComments(finalizedSubmissions[realIndex].id, domIdx);
      listenToLikes(finalizedSubmissions[realIndex].id, domIdx);
    }
  });
}, { threshold: 0.6 }); 

function buildResultsCarousel() {
  resultsViewport.innerHTML = "";
  
  let slidesToBuild = [];
  if (finalizedSubmissions.length > 1) {
    slidesToBuild.push({...finalizedSubmissions[finalizedSubmissions.length - 1], isTopClone: true});
    slidesToBuild.push(...finalizedSubmissions);
    slidesToBuild.push({...finalizedSubmissions[0], isBottomClone: true});
  } else {
    slidesToBuild = [...finalizedSubmissions];
  }

  const likedPosts = JSON.parse(localStorage.getItem("site_liked_posts") || "[]");

  slidesToBuild.forEach((sub, idx) => {
    const slide = document.createElement("div");
    let classNames = "result-slide-wrapper";
    if (sub.isTopClone) classNames += " is-top-clone";
    if (sub.isBottomClone) classNames += " is-bottom-clone";
    
    slide.className = classNames;
    slide.dataset.index = idx;
    
    let realIndex = idx;
    if (finalizedSubmissions.length > 1) {
      if (idx === 0) realIndex = finalizedSubmissions.length - 1; 
      else if (idx === slidesToBuild.length - 1) realIndex = 0;   
      else realIndex = idx - 1; 
    }
    
    slide.dataset.realIndex = realIndex;
    slide.id = `slide-${idx}`;
    
    let imageContentHtml = "";
    if (sub.isStandalone) {
      imageContentHtml = `
        <div class="ba-image-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
          <img src="${sub.finalImageUrl}" class="img-base" style="object-fit: contain; width: 100%; height: 100%;" draggable="false">
        </div>
      `;
    } else {
      imageContentHtml = `
        <div class="ba-image-wrapper" id="bacontainer-${idx}">
          <img src="${sub.finalImageUrl}" class="img-base" draggable="false">
          <img src="${sub.imageUrl}" class="img-overlay" id="baoverlay-${idx}" draggable="false">
          <div class="slider-handle" id="bahandle-${idx}"></div>
        </div>
      `;
    }

    const isLiked = likedPosts.includes(sub.id);
    const fillAttr = isLiked ? "#ff003c" : "none";
    const strokeAttr = isLiked ? "none" : "white";

    slide.innerHTML = `
      <div class="ba-container">
        ${imageContentHtml}
      </div>
      
      <div class="shorts-action-bar">
        <button class="action-btn like-btn" data-id="${sub.id}" data-idx="${idx}" data-liked="${isLiked}">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="${strokeAttr}" stroke-width="2" fill="${fillAttr}" class="heart-icon"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span class="action-counter" id="like-count-${idx}">${sub.likes || 0}</span>
        </button>
        <button class="action-btn comment-trigger-btn" data-id="${sub.id}">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="white" stroke-width="2" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          <span class="action-counter" id="comment-count-${idx}">0</span>
        </button>
      </div>

      <div class="tinder-info-bar">
        <h2>${sub.firstName} <span style="font-weight: 400;">${sub.lastName || ''}</span></h2>
        ${sub.role ? `<p>${sub.role}</p>` : ''}
        <button class="tinder-download-btn" data-url="${sub.finalImageUrl}" data-name="${sub.firstName}_${sub.lastName || 'Post'}">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Download Result
        </button>
      </div>
    `;
    
    resultsViewport.appendChild(slide);
    initTrueOverlaySlider(idx);
    resObserver.observe(slide);
  });
  
  setTimeout(() => {
    if (finalizedSubmissions.length > 1) {
      const realFirst = document.getElementById("slide-1");
      if (realFirst) resultsViewport.scrollTop = realFirst.offsetTop;
    } else {
      resultsViewport.scrollTop = 0;
    }
  }, 50); 

  document.querySelectorAll('.tinder-download-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const url = e.currentTarget.dataset.url;
      const name = e.currentTarget.dataset.name;
      showToast("Preparing high quality download...");
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${name}_Final.jpg`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      } catch (error) { window.open(url, "_blank"); }
    });
  });

  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(e.currentTarget.dataset.liked === "true") return; 
      
      e.currentTarget.dataset.liked = "true";
      const subId = e.currentTarget.dataset.id;
      const svg = e.currentTarget.querySelector('.heart-icon');
      
      svg.style.fill = "#ff003c"; svg.style.stroke = "none";
      svg.style.animation = "attentionShake 0.4s ease";
      setTimeout(() => svg.style.animation = "", 400);

      let localLikes = JSON.parse(localStorage.getItem("site_liked_posts") || "[]");
      if (!localLikes.includes(subId)) {
          localLikes.push(subId);
          localStorage.setItem("site_liked_posts", JSON.stringify(localLikes));
      }

      try {
        const ref = doc(db, "submissions", subId);
        await updateDoc(ref, { likes: increment(1) });
      } catch(err) { console.error(err); }
    });
  });

  document.querySelectorAll('.comment-trigger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openBottomSheet(e.currentTarget.dataset.id);
    });
  });
}

function initTrueOverlaySlider(idx) {
  const container = document.getElementById(`bacontainer-${idx}`);
  if (!container) return;
  
  const overlayImg = document.getElementById(`baoverlay-${idx}`);
  const handle = document.getElementById(`bahandle-${idx}`);
  let isDragging = false;

  const moveSlider = (e) => {
    if (!isDragging) return;
    let clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const rect = container.getBoundingClientRect();
    let x = clientX - rect.left;
    if (x < 0) x = 0; if (x > rect.width) x = rect.width;
    const percent = (x / rect.width) * 100;
    
    overlayImg.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
    handle.style.left = `${percent}%`;
  };

  handle.addEventListener("mousedown", () => isDragging = true);
  handle.addEventListener("touchstart", () => isDragging = true, {passive: true});
  window.addEventListener("mouseup", () => { isDragging = false; });
  window.addEventListener("touchend", () => { isDragging = false; });
  window.addEventListener("mousemove", moveSlider);
  window.addEventListener("touchmove", moveSlider, {passive: true});
}

function listenToLikes(submissionId, domIdx) {
  if(activeLikesUnsub) activeLikesUnsub();
  activeLikesUnsub = onSnapshot(doc(db, "submissions", submissionId), (docSnap) => {
    if(docSnap.exists()){
      const likes = docSnap.data().likes || 0;
      const counterEl = document.getElementById(`like-count-${domIdx}`);
      if(counterEl) counterEl.innerText = likes;
    }
  });
}

function listenToLiveFloatingComments(submissionId, domIdx) {
  if (activeUnsubComments) activeUnsubComments();
  const streamEl = document.getElementById("floatingStream");
  streamEl.innerHTML = ""; 
  
  const commentsRef = collection(db, "submissions", submissionId, "comments");
  activeUnsubComments = onSnapshot(query(commentsRef, orderBy("timestamp", "desc")), (snap) => {
    const counterEl = document.getElementById(`comment-count-${domIdx}`);
    if (counterEl) counterEl.innerText = snap.size;

    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const c = change.doc.data();
        const bubble = document.createElement("div");
        bubble.className = "live-comment-bubble";
        
        const safeText = c.text ? c.text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        bubble.innerHTML = `<b>${c.name}:</b> ${safeText}`;
        streamEl.prepend(bubble);
        setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, 4000);
      }
    });
  });
}

// -------------------------------------------------------------
// TIKTOK STYLE BOTTOM SHEET COMMENTS LOGIC
// -------------------------------------------------------------
const bottomSheetOverlay = document.getElementById("bottomSheetOverlay");
const tiktokCommentsSheet = document.getElementById("tiktokCommentsSheet");

function openBottomSheet(subId) {
  if (!subId) return;
  currentModalSubId = subId;
  bottomSheetOverlay.classList.remove("hidden");
  setTimeout(() => tiktokCommentsSheet.classList.add("open"), 10);
  
  if(activeUnsubSheetComments) activeUnsubSheetComments();
  
  const listEl = document.getElementById("sheetCommentsList");
  listEl.innerHTML = "";
  
  const commentsRef = collection(db, "submissions", subId, "comments");
  activeUnsubSheetComments = onSnapshot(query(commentsRef, orderBy("timestamp", "desc")), (snap) => {
    document.getElementById("sheetCommentCount").innerText = `${snap.size} comments`;
    listEl.innerHTML = "";
    
    snap.forEach(docSnap => {
      const c = docSnap.data();
      const cId = docSnap.id;
      const timeStr = c.timestamp ? timeAgo(c.timestamp.toDate()) : "Just now";
      const initial = c.name ? c.name.charAt(0).toUpperCase() : "?";
      
      const safeText = c.text ? c.text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
      const safePin = c.pin || '';
      
      listEl.innerHTML += `
        <div class="sheet-comment-item">
          <div class="sheet-avatar">${initial}</div>
          <div class="sheet-comment-body">
            <span class="sheet-comment-name">${c.name} <span class="sheet-comment-time">${timeStr}</span></span>
            <p class="sheet-comment-text">${safeText}</p>
          </div>
          <button class="sheet-comment-options" data-cid="${cId}" data-cpin="${safePin}" data-ctext="${safeText}">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>
      `;
    });

    document.querySelectorAll('.sheet-comment-options').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.currentTarget;
        openCommentOptions(btnEl.dataset.cid, btnEl.dataset.cpin, btnEl.dataset.ctext);
      });
    });
  });
}

function closeBottomSheet() {
  tiktokCommentsSheet.classList.remove("open");
  setTimeout(() => {
    bottomSheetOverlay.classList.add("hidden");
    if(activeUnsubSheetComments) activeUnsubSheetComments();
  }, 300);
}

bottomSheetOverlay.addEventListener("click", closeBottomSheet);
document.getElementById("closeSheetBtn").addEventListener("click", closeBottomSheet);

document.getElementById("sheetCommentForm").addEventListener("submit", async (e) => {
  e.preventDefault(); 
  
  const name = document.getElementById("sheetCommentName").value.trim();
  const pin = document.getElementById("sheetCommentPin").value.trim();
  const text = document.getElementById("sheetCommentText").value.trim();
  
  if (!name || !text) { showToast("Please fill in your name and comment."); return; }
  if (!/^\d{4}$/.test(pin)) { showToast("PIN must be exactly 4 digits."); return; }
  if (!currentModalSubId) { showToast("Error: Missing gallery ID."); return; }
  
  const submitBtn = document.getElementById("sheetSubmitBtn");
  submitBtn.disabled = true;
  
  try {
    await addDoc(collection(db, "submissions", currentModalSubId, "comments"), {
      name: name,
      pin: pin,
      text: text,
      timestamp: serverTimestamp()
    });
    
    document.getElementById("sheetCommentText").value = "";
    document.getElementById("displayPin").innerText = pin;
    document.getElementById("pinReminderModal").classList.remove("hidden");
  } catch (error) {
    if (error.message && error.message.includes("permission")) {
      showToast("Firebase Error: Permission Denied. Check Rules.");
    } else {
      showToast("Failed to post comment. Check connection.");
    }
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById("closePinReminderBtn").addEventListener("click", () => {
  document.getElementById("pinReminderModal").classList.add("hidden");
});

document.getElementById("copyPinBtn").addEventListener("click", () => {
  const pin = document.getElementById("displayPin").innerText;
  navigator.clipboard.writeText(pin).then(() => showToast("PIN Copied!"));
});

let activeCommentActionId = null;
let activeCommentActionPin = null;

function openCommentOptions(cId, cPin, cText) {
  activeCommentActionId = cId;
  activeCommentActionPin = cPin;
  
  document.getElementById("verifyPinInput").value = "";
  document.getElementById("editArea").classList.add("hidden");
  document.getElementById("actionButtons").style.display = "flex";
  document.getElementById("saveEditBtn").classList.add("hidden");
  
  const decoder = document.createElement("div");
  decoder.innerHTML = cText;
  document.getElementById("editCommentText").value = decoder.textContent;
  
  document.getElementById("commentActionModal").classList.remove("hidden");
}

document.getElementById("cancelActionBtn").addEventListener("click", () => {
  document.getElementById("commentActionModal").classList.add("hidden");
});

document.getElementById("verifyDeleteBtn").addEventListener("click", async () => {
  const pinInput = document.getElementById("verifyPinInput").value;
  if (pinInput !== activeCommentActionPin) { showToast("Incorrect PIN."); return; }
  
  if (confirm("Permanently delete this comment?")) {
    await deleteDoc(doc(db, "submissions", currentModalSubId, "comments", activeCommentActionId));
    document.getElementById("commentActionModal").classList.add("hidden");
    showToast("Comment deleted.");
  }
});

document.getElementById("verifyEditBtn").addEventListener("click", () => {
  const pinInput = document.getElementById("verifyPinInput").value;
  if (pinInput !== activeCommentActionPin) { showToast("Incorrect PIN."); return; }
  
  document.getElementById("actionButtons").style.display = "none";
  document.getElementById("editArea").classList.remove("hidden");
  document.getElementById("saveEditBtn").classList.remove("hidden");
});

document.getElementById("saveEditBtn").addEventListener("click", async () => {
  const newText = document.getElementById("editCommentText").value.trim();
  if (!newText) { showToast("Comment cannot be empty."); return; }
  
  await updateDoc(doc(db, "submissions", currentModalSubId, "comments", activeCommentActionId), {
    text: newText
  });
  
  document.getElementById("commentActionModal").classList.add("hidden");
  showToast("Comment updated!");
});