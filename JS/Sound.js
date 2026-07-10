/* ==========================================================================
   SOUND.JS - Modul Manajemen Audio & Musik
   v2.0 - Bug Fix: variabel audio dideklarasikan HANYA di sini (jangan
   deklarasi ulang di index.js agar tidak konflik antar halaman)
   ========================================================================== */

// CATATAN: Variabel ini hanya aktif di halaman GAME (TKD.html).
// Di halaman index.html, deklarasi terpisah ada di index.js — tidak konflik
// karena kedua file tidak dimuat bersamaan di halaman yang sama.
// BUG FIX: soundVolume dulunya default 4 (seharusnya skala 0-1). Karena semua
// perhitungan gain di file ini mengalikan dengan soundVolume (mis. 0.9 *
// soundVolume), nilai 4 membuat gain jauh melebihi 1.0 dan efek suara pecah
// / terdistorsi sampai user menggeser slider secara manual.
let musicVolume    = parseFloat(localStorage.getItem("tkd_musicVolume")) || 0.5;
let soundVolume    = isNaN(parseFloat(localStorage.getItem("tkd_soundVolume")))
    ? 1
    : parseFloat(localStorage.getItem("tkd_soundVolume"));
let globalAudioCtx = null;

function getAudioContext() {
    if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioCtx.state === "suspended") {
        globalAudioCtx.resume();
    }
    return globalAudioCtx;
}

function updateMusicVolume(val) {
    musicVolume    = parseFloat(val);
    const bgMusic  = document.getElementById("bgMusic");
    if (bgMusic) bgMusic.volume = musicVolume;
    localStorage.setItem("tkd_musicVolume", musicVolume);
}

function updateSoundVolume(val) {
    soundVolume = parseFloat(val);
    const el    = document.getElementById("soundVolPercent");
    if (el) el.innerText = Math.round(soundVolume * 100) + "%";
    localStorage.setItem("tkd_soundVolume", soundVolume);
}

function toggleMusic() {
    const bgMusic = document.getElementById("bgMusic");
    const btn     = document.getElementById("musicToggleBtn");
    if (!bgMusic) return;

    if (bgMusic.muted) {
        bgMusic.muted       = false;
        if (btn) { btn.innerText = "MUTE";   btn.style.background = "#21bb1a"; }
    } else {
        bgMusic.muted       = true;
        if (btn) { btn.innerText = "UNMUTE"; btn.style.background = "#d50000"; }
    }
}

function playClickSound() {
    try {
        const audioCtx = getAudioContext();
        const now      = audioCtx.currentTime;
        const osc      = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

        const vol = 0.9 * soundVolume;
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    } catch(e) {
        console.log("Gagal memutar suara klik:", e);
    }
}

function playGlassShatterSound() {
    try {
        const audioCtx = getAudioContext();
        const now      = audioCtx.currentTime;

        const osc     = audioCtx.createOscillator();
        const gainOsc = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(3000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gainOsc.gain.setValueAtTime(0.3, now);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gainOsc);
        gainOsc.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.3);

        const bufferSize = audioCtx.sampleRate * 0.4;
        const buffer     = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type  = "highpass";
        filter.frequency.setValueAtTime(4000, now);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseNode.start(now); noiseNode.stop(now + 0.4);
    } catch(e) {
        console.log("Gagal memutar suara gelas pecah:", e);
    }
}

function playVictorySound() {
    try {
        const audioCtx = getAudioContext();
        const now      = audioCtx.currentTime;

        for (let j = 0; j < 2; j++) {
            const t          = j * 0.2;
            const bufferSize = audioCtx.sampleRate * 0.4;
            const buffer     = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data       = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            const noiseNode = audioCtx.createBufferSource();
            noiseNode.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type  = "bandpass";
            filter.frequency.setValueAtTime(1500, now + t);

            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now + t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.4);

            noiseNode.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(audioCtx.destination);
            noiseNode.start(now + t);
        }

        const winNotes   = [523.25,587.33,659.25,698.46,783.99,880.00,987.77,1046.50,1318.51,1567.98];
        let   timeOffset = 0;

        winNotes.forEach((freq, index) => {
            const osc      = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type       = index % 2 === 0 ? "square" : "triangle";
            osc.frequency.value = freq;

            if (index > 6) {
                osc.frequency.setValueAtTime(freq, now + timeOffset);
                osc.frequency.linearRampToValueAtTime(freq + 50, now + timeOffset + 0.08);
            }

            gainNode.gain.setValueAtTime(0.2, now + timeOffset);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.12);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + timeOffset + 0.12);
            timeOffset += 0.05;
        });
    } catch(e) {
        console.log("Victory Audio Context Error:", e);
    }
}

function playCountdownSound(isGo) {
    try {
        const audioCtx = getAudioContext();
        const now      = audioCtx.currentTime;
        const osc      = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = isGo ? "square" : "sine";
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

        const dur = isGo ? 0.25 : 0.12;
        const vol = (isGo ? 0.4 : 0.3) * soundVolume;
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + dur);
    } catch(e) {
        console.log("Gagal memutar suara countdown:", e);
    }
}

function playBossTokenSound() {
    try {
        const audioCtx = getAudioContext();
        const now      = audioCtx.currentTime;

        const osc1     = audioCtx.createOscillator();
        const gainNode1 = audioCtx.createGain();
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(180, now);
        osc1.frequency.exponentialRampToValueAtTime(60, now + 0.5);

        const osc2      = audioCtx.createOscillator();
        const gainNode2 = audioCtx.createGain();
        osc2.type = "square";
        osc2.frequency.setValueAtTime(90, now);
        osc2.frequency.linearRampToValueAtTime(45, now + 0.5);

        // BUG FIX: hapus "const filter = document.createElement ? null : ..."
        // yang tidak masuk akal — langsung buat biquadFilter saja
        const biquadFilter = audioCtx.createBiquadFilter();
        biquadFilter.type  = "lowpass";
        biquadFilter.frequency.setValueAtTime(800, now);
        biquadFilter.frequency.exponentialRampToValueAtTime(200, now + 0.5);

        const baseVol = 0.5 * soundVolume;
        gainNode1.gain.setValueAtTime(baseVol,       now);
        gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        gainNode2.gain.setValueAtTime(baseVol * 0.8, now);
        gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc1.connect(gainNode1); gainNode1.connect(biquadFilter);
        osc2.connect(gainNode2); gainNode2.connect(biquadFilter);
        biquadFilter.connect(audioCtx.destination);

        osc1.start(now); osc1.stop(now + 0.5);
        osc2.start(now); osc2.stop(now + 0.5);
    } catch(e) {
        console.log("Gagal memutar suara Boss Token:", e);
    }
}
