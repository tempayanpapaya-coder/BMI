// ==========================================
// HALAMAN UTAMA / MENU MANAGEMENT
// ==========================================

let globalAudioCtx = null;
let musicVolume = 0.05;
let soundVolume = 1.0;

// Fungsi untuk mengamankan inisialisasi Audio Context
function getAudioContext() {
    if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
    }
    return globalAudioCtx;
}

// Fungsi buka/tutup Modal Panel dengan performa optimal
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.toggle("show");
    }
}

// Meluncurkan Game Utama (TKD.html) secara asinkron agar tidak lag
function goToGame() {
    setTimeout(() => {
        window.location.href = 'TKD.html';
    }, 50);
}
function goToShop() {
    setTimeout(() => {
        window.location.href = 'Shop.html';
    }, 50);
}

// Memuat data dari localStorage saat halaman dibuka
function loadMenuData() {
    let savedName = localStorage.getItem("tkd_playerName");
    let maxLevel = localStorage.getItem("tkd_maxReachedLevel") || 1;

    if (!savedName) {
        savedName = "PMS DRAGON";
        localStorage.setItem("tkd_playerName", savedName);
    }

    const lblName = document.getElementById("lblPlayerName");
    const txtName = document.getElementById("txtPlayerName");
    const lblLvl = document.getElementById("lblMaxLevel");

    if (lblName) lblName.innerText = savedName;
    if (txtName) txtName.value = savedName;
    if (lblLvl) lblLvl.innerText = maxLevel;

    // BUG FIX: selektor kesulitan sekarang menampilkan pilihan yang tersimpan,
    // bukan selalu kembali ke "Regular" tiap kali menu dibuka
    const savedDifficulty = localStorage.getItem("tkd_difficulty") || "regular";
    const selDifficulty = document.getElementById("difficultySelect");
    if (selDifficulty) selDifficulty.value = savedDifficulty;

    // Sinkronkan posisi slider musik & efek suara dengan volume yang tersimpan
    const savedMusicVol = parseFloat(localStorage.getItem("tkd_musicVolume"));
    const savedSoundVol = parseFloat(localStorage.getItem("tkd_soundVolume"));
    const musicSlider = document.getElementById("musicVolumeSlider");
    const soundSlider = document.getElementById("soundVolumeSlider");
    if (!isNaN(savedMusicVol)) {
        musicVolume = savedMusicVol;
        if (musicSlider) musicSlider.value = savedMusicVol;
    }
    if (!isNaN(savedSoundVol)) {
        soundVolume = savedSoundVol;
        if (soundSlider) soundSlider.value = savedSoundVol;
        const volPercent = document.getElementById("soundVolPercent");
        if (volPercent) volPercent.innerText = Math.round(savedSoundVol * 100) + "%";
    }
}

// BUG FIX: menu sebelumnya memanggil changeDifficulty() dari Game.js, yang
// tidak dimuat di index.html — ini membuat pilihan kesulitan error saat
// diklik. Fungsi ini hanya menyimpan pilihan; Game.js membacanya saat
// TKD.html dibuka.
function selectDifficultyMenu(value) {
    localStorage.setItem("tkd_difficulty", value);
}

// Menyimpan Akun Offline Baru
function saveOfflineAccount() {
    const txtName = document.getElementById("txtPlayerName");
    if (!txtName) return;

    let inputName = txtName.value.trim();
    if (inputName === "") {
        alert("Nama tidak boleh kosong!");
        return;
    }

    localStorage.setItem("tkd_playerName", inputName);
    
    const lblName = document.getElementById("lblPlayerName");
    if (lblName) lblName.innerText = inputName;
    
    togglePanel('accountPanel');
    alert("🎉 Akun Offline '" + inputName + "' berhasil dimuat!");
}

// Memutar suara klik dengan penanganan latensi rendah
function playClickSound() {
    try {
        const audioCtx = getAudioContext();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);
        
        gainNode.gain.setValueAtTime(0.5 * soundVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    } catch(e) {
        console.warn("AudioContext belum siap:", e);
    }
}

function toggleSettingsPanel() {
    const panel = document.getElementById("settingsPanel");
    const overlay = document.getElementById("settingsOverlay");
    
    if (panel) panel.classList.toggle("hidden");
    if (overlay) overlay.classList.toggle("hidden");
}

function toggleMusic() {
    const bgMusic = document.getElementById("bgMusic");
    const btn = document.getElementById("musicToggleBtn");
    if (!bgMusic) return;
    
    if (bgMusic.muted) {
        bgMusic.muted = false;
        if (btn) {
            btn.innerText = "MUTE";
            btn.style.background = "#21bb1a";
        }
        bgMusic.play().catch(() => {});
    } else {
        bgMusic.muted = true;
        if (btn) {
            btn.innerText = "UNMUTE";
            btn.style.background = "#d50000";
        }
    }
}

function updateMusicVolume(vol) {
    const bgMusic = document.getElementById("bgMusic");
    musicVolume = parseFloat(vol);
    if (bgMusic) {
        bgMusic.volume = musicVolume;
    }
    // BUG FIX: volume dulunya tidak pernah disimpan, jadi selalu reset tiap kunjungan
    localStorage.setItem("tkd_musicVolume", musicVolume);
}

function updateSoundVolume(vol) {
    soundVolume = parseFloat(vol);
    const volPercent = document.getElementById("soundVolPercent");
    if (volPercent) {
        volPercent.innerText = Math.round(soundVolume * 100) + "%";
    }
    localStorage.setItem("tkd_soundVolume", soundVolume);
}

function resetAllGameData() {
    if (confirm("Apakah Anda yakin ingin menghapus semua rekor, koin, dan progres?")) {
        localStorage.clear();
        alert("✅ Data berhasil di-reset!");
        window.location.reload();
    }
}

// Inisialisasi event listener secara aman tanpa tumpang tindih
window.addEventListener("DOMContentLoaded", () => {
    loadMenuData();
    
    // Auto-play musik latar jika diizinkan oleh browser setelah interaksi pertama
    window.addEventListener('click', () => {
        const bgMusic = document.getElementById("bgMusic");
        if (bgMusic && bgMusic.paused && !bgMusic.muted) {
            bgMusic.volume = musicVolume;
            bgMusic.play().catch(() => {});
        }
    }, { once: true });
});
