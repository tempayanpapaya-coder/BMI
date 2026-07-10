/* ==========================================================================
   GAME.JS - Inti Mekanik, Aturan, dan Inisialisasi Papan Game
   v2.0 - Layered Card System + Bug Fixes
   ========================================================================== */

const allMasterSymbols = [
    "🥋", "👊", "🦶", "💥", "🏆", "🥇", "🛡️", "🔥", "🎽", "🔴",
    "🔵", "🙌", "🟥", "🟦", "⏱️", "📋", "🪵", "🧱", "🧘", "🙇",
    "🚩", "📢", "🛑", "WT", "🐉", "⚠️", "🪖", "🥊", "🧦", "🎒",
    "👟", "RUN", "⚡", "💪", "🩸", "🤸", "🥈", "🥉", "👑", "✨",
    "🎉", "🇰🇷", "🐯", "🏮", "⛩️", "🏯", "🥁", "🥢"
];

const beltRanks = [
    { name: "Putih",  color: "#ffffff", bg: "#2c3e50" },
    { name: "Kuning", color: "#ffd600", bg: "#3e3a00" },
    { name: "Hijau",  color: "#00c853", bg: "#0a3d1a" },
    { name: "Biru",   color: "#2979ff", bg: "#0b2545" },
    { name: "Merah",  color: "#d50000", bg: "#3a0007" },
    { name: "Hitam",  color: "#ffd700", bg: "#111111" }
];

/* ---------- State ---------- */
let currentSymbols  = [];
let currentLevel    = 1;
let maxReachedLevel = 1;
let firstCard       = null;
let secondCard      = null;
let lock            = false;
let score           = 0;
let coins           = 0;
let bossTokens      = 0;
let timer;
let gameStarted     = false;
let maxTime         = 0;
let relaxMode       = false;
let bossRewardCard  = null;
let time            = 220;
let isNoLimitActive = false;
let currentDifficulty = "regular";
let comboCount      = 0;
let comboTimer      = null;
const COMBO_TIMEOUT = 3000;

/* ==========================================================================
   LAYER SYSTEM - Kartu berlapis mulai Level 6
   ========================================================================== */

/**
 * Hitung berapa layer yang dipakai di level ini.
 * Level 1-5  → 1 layer (flat, tidak ada penindihan)
 * Level 6-10 → 2 layer
 * Level 11+  → 3 layer
 */
function getLayerCount() {
    if (currentLevel < 6)  return 1;
    if (currentLevel < 11) return 2;
    return 3;
}

/**
 * Beri setiap kartu sebuah "layer" (0 = paling atas/bebas, N = tertindih).
 * Kartu hanya bisa di-klik jika tidak ada kartu lain yang menindihnya
 * (yaitu tidak ada kartu lain dengan layer lebih rendah yang posisinya overlap).
 *
 * BUG FIX (deadlock kartu ter-gembok selamanya):
 * Versi lama membagi kartu ke layer HANYA berdasarkan urutan index di array
 * (i % slotCount), yaitu benar-benar acak dan TIDAK PEDULI pasangan simbol
 * mana yang ada di posisi itu. Akibatnya, dua kartu yang berpasangan bisa
 * saja berakhir di layer yang berbeda dan saling mengunci: pasangan A
 * tertindih pasangan B, pasangan B tertindih pasangan C, dst — sampai
 * membentuk lingkaran yang TIDAK PERNAH bisa dibuka. Level jadi mustahil
 * diselesaikan (persis yang dilaporkan: banyak kartu ter-gembok permanen).
 *
 * Perbaikan: setiap PASANGAN simbol sekarang SELALU ditempatkan pada layer
 * yang SAMA (hanya slotnya yang berbeda). Dengan begitu, begitu sebuah
 * layer "terbuka", seluruh kartu pada layer tsb pasti punya pasangannya
 * sendiri di layer yang sama — dijamin selalu ada kombinasi yang bisa
 * dicocokkan, sehingga papan permainan selalu bisa diselesaikan.
 *
 * data-layer  : layer kartu (0 = atas/bebas, semakin besar = semakin dalam)
 * data-slot   : indeks slot (dipakai isCardBlocked untuk menentukan siapa
 *               menindih siapa antar layer)
 */
function assignLayers(totalCards, layerCount, symbols) {
    const assignments = new Array(totalCards);

    // Kelompokkan index posisi kartu berdasarkan simbolnya, supaya kita tahu
    // dua index mana saja yang merupakan satu pasangan.
    const positionsBySymbol = {};
    symbols.forEach((symbol, index) => {
        if (!positionsBySymbol[symbol]) positionsBySymbol[symbol] = [];
        positionsBySymbol[symbol].push(index);
    });

    // Acak urutan pasangan, lalu bagikan rata ke tiap layer (giliran/round-robin)
    // agar layer atas maupun bawah sama-sama berisi campuran pasangan acak.
    const pairKeys = shuffle(Object.keys(positionsBySymbol));

    // Hitung berapa slot terpakai di tiap layer agar data-slot tetap unik per layer.
    const slotCounterPerLayer = new Array(layerCount).fill(0);

    pairKeys.forEach((symbol, pairIndex) => {
        const layer = pairIndex % layerCount;
        positionsBySymbol[symbol].forEach(index => {
            const slot = slotCounterPerLayer[layer]++;
            assignments[index] = { slot, layer };
        });
    });

    return assignments;
}

/**
 * Cek apakah sebuah kartu sedang tertindih (tidak bisa diklik).
 * Kartu tertindih jika ada kartu lain dengan slot yang sama,
 * layer lebih rendah (angka lebih kecil = lebih atas), dan belum matched.
 */
function isCardBlocked(card) {
    const mySlot  = parseInt(card.dataset.slot);
    const myLayer = parseInt(card.dataset.layer);

    if (myLayer === 0) return false; // Layer paling atas selalu bebas

    // Cari kartu lain yang sama slotnya, layer lebih atas, belum matched
    const allCards = document.querySelectorAll(".card");
    for (const other of allCards) {
        if (other === card) continue;
        if (other.classList.contains("matched")) continue;
        if (parseInt(other.dataset.slot)  === mySlot &&
            parseInt(other.dataset.layer) < myLayer) {
            return true; // Ada penindih
        }
    }
    return false;
}

/**
 * Update visual semua kartu berdasarkan status blocked/unblocked.
 * Dipanggil setiap kali ada match.
 */
function refreshLayerVisuals() {
    if (getLayerCount() === 1) return; // Tidak perlu di level 1-5

    document.querySelectorAll(".card:not(.matched)").forEach(card => {
        const badge = card.querySelector(".layer-badge");
        if (isCardBlocked(card)) {
            card.classList.add("card-blocked");
            card.classList.remove("card-free");
            if (badge) badge.innerText = "🔒";
        } else {
            card.classList.remove("card-blocked");
            card.classList.add("card-free");
            // BUG FIX: sebelumnya badge tetap menampilkan 🔒 walau kartu
            // sudah terbuka/bebas karena badge tidak pernah di-update ulang.
            if (badge) badge.innerText = "✓";
        }
    });
}

/* ==========================================================================
   UTILITAS
   ========================================================================== */

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getBoardCols() {
    const total = currentSymbols.length;
    if (total <= 4)  return 2;
    if (total <= 12) return 4;
    if (total <= 16) return 4;
    if (total <= 20) return 4;
    return 6;
}

/* ==========================================================================
   DRAWING KONEKSI
   ========================================================================== */

function drawConnection(cardA, cardB) {
    const canvas = document.getElementById("lineCanvas");
    const ctx    = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const gameWrapper = document.getElementById("game-wrapper");
    if (!gameWrapper) return;

    const wrapRect = gameWrapper.getBoundingClientRect();
    canvas.width  = wrapRect.width;
    canvas.height = wrapRect.height;
    canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();

    const startX = rectA.left - wrapRect.left + rectA.width  / 2;
    const startY = rectA.top  - wrapRect.top  + rectA.height / 2;
    const endX   = rectB.left - wrapRect.left + rectB.width  / 2;
    const endY   = rectB.top  - wrapRect.top  + rectB.height / 2;

    const cols      = getBoardCols();
    const totalCards = document.querySelectorAll(".card").length;
    const rows      = Math.ceil(totalCards / cols);

    const indexA = parseInt(cardA.dataset.index);
    const indexB = parseInt(cardB.dataset.index);
    const ax = indexA % cols, ay = Math.floor(indexA / cols);
    const bx = indexB % cols, by = Math.floor(indexB / cols);

    let corners = [{ x: startX, y: startY }];
    if (ax !== bx && ay !== by) {
        if (isEmptyCell(bx, ay, cols, rows)) corners.push({ x: endX, y: startY });
        else                                  corners.push({ x: startX, y: endY });
    }
    corners.push({ x: endX, y: endY });

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach(c => ctx.lineTo(c.x, c.y));
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth   = 5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur  = 12;
    ctx.stroke();

    setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 350);
}

/* ==========================================================================
   COMBO SYSTEM
   ========================================================================== */

function handleComboSystem() {
    if (comboTimer) clearTimeout(comboTimer);
    comboCount++;

    const displayLevel = comboCount - 1;
    let bonusCoins = 0, comboName = "";

    if      (displayLevel === 1)  { comboName = "Basic";    bonusCoins = 2; }
    else if (displayLevel === 2)  { comboName = "Taegeuk";  bonusCoins = 2; }
    else if (displayLevel === 3)  { comboName = "Koryo";    bonusCoins = 3; }
    else if (displayLevel >= 4)   { comboName = "Keumgang"; bonusCoins = 5; }

    if (displayLevel >= 1 && bonusCoins > 0) {
        coins += bonusCoins;
        syncCoins();
        showComboNotification(`Combo x${displayLevel}: ${comboName} (+Rp.${bonusCoins}k)`);
    }

    comboTimer = setTimeout(() => { comboCount = 0; }, COMBO_TIMEOUT);
}

function showComboNotification(message) {
    let container = document.getElementById("combo-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "combo-container";
        Object.assign(container.style, {
            position: "absolute", top: "20%", left: "50%",
            transform: "translateX(-75%)", zIndex: "999", pointerEvents: "none"
        });
        document.getElementById("game-wrapper")?.appendChild(container);
    }
    container.innerHTML = "";

    const popUp = document.createElement("div");
    popUp.innerText = message;
    Object.assign(popUp.style, {
        background: "rgba(0,0,0,0.85)", color: "#ffd700",
        padding: "8px 18px", borderRadius: "25px",
        fontWeight: "bold", fontSize: "1.2rem",
        border: "2px solid #00ffff", boxShadow: "0 0 15px #00ffff",
        animation: "fadeUpAndOut 1.5s forwards"
    });
    container.appendChild(popUp);
    setTimeout(() => popUp.remove(), 1500);
}

/* ==========================================================================
   INISIALISASI LEVEL
   ========================================================================== */

function initLevelConfig() {
    const stageInfo = getChapter(currentLevel);
    const chapEl    = document.getElementById("chapter");
    if (chapEl) {
        chapEl.innerText = stageInfo.isBoss
            ? `Boss ${stageInfo.chapter}`
            : `Chapter ${stageInfo.chapter}`;
    }

    let neededPairs    = Math.min(currentLevel + 1, allMasterSymbols.length);
    let selectedSymbols = allMasterSymbols.slice(0, neededPairs);
    currentSymbols     = [...selectedSymbols, ...selectedSymbols];

    // Waktu berdasarkan kesulitan
    let baseTime = 20 + (currentSymbols.length / 2) * 5;
    if      (currentDifficulty === "senior")  time = Math.round(baseTime * 0.7);
    else if (currentDifficulty === "sabeum")  time = Math.round(baseTime * 0.5);
    else                                       time = baseTime;

    maxTime = time;

    // Grid layout
    const gameContainer = document.getElementById("game");
    if (gameContainer) {
        gameContainer.className = "";
        const total = currentSymbols.length;
        if      (total <= 4)  { gameContainer.style.gridTemplateColumns = "repeat(2, 1fr)"; gameContainer.classList.add("grid-2x2"); }
        else if (total <= 12) { gameContainer.style.gridTemplateColumns = "repeat(4, 1fr)"; gameContainer.classList.add("grid-4x3"); }
        else if (total <= 16) { gameContainer.style.gridTemplateColumns = "repeat(4, 1fr)"; gameContainer.classList.add("grid-4x4"); }
        else if (total <= 20) { gameContainer.style.gridTemplateColumns = "repeat(4, 1fr)"; gameContainer.classList.add("grid-4x5"); }
        else                  { gameContainer.style.gridTemplateColumns = "repeat(6, 1fr)"; gameContainer.classList.add("grid-6x6"); }

        // Tambah class layer-mode agar CSS bisa styling khusus
        if (getLayerCount() > 1) gameContainer.classList.add("layer-mode");
    }

    const lvlEl = document.getElementById("level");
    const tmEl  = document.getElementById("time");
    const cnEl  = document.getElementById("coins");
    if (lvlEl) lvlEl.innerText = currentLevel;
    if (tmEl)  tmEl.innerText  = time;
    if (cnEl)  cnEl.innerText  = coins;

    updateLevelSelectorHTML();
    updateBeltUI();
    updateInventoryUI();
}

/* ==========================================================================
   BUAT PAPAN
   ========================================================================== */

function createBoard() {
    const game = document.getElementById("game");
    if (!game) return;

    game.innerHTML = "";
    shuffle(currentSymbols);

    const totalCards  = currentSymbols.length;
    const layerCount  = getLayerCount();
    const cols        = Math.ceil(Math.sqrt(totalCards));
    game.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    let cardSize = Math.floor((window.innerWidth * 0.9) / cols);
    cardSize = Math.max(30, Math.min(cardSize, 80));
    document.documentElement.style.setProperty("--card-size", `${cardSize}px`);

    // Tentukan layer dan slot setiap kartu
    const layerAssignments = assignLayers(totalCards, layerCount, currentSymbols);

    const stageInfo    = getChapter(currentLevel);
    bossRewardCard     = stageInfo.isBoss
        ? Math.floor(Math.random() * totalCards)
        : null;

    currentSymbols.forEach((symbol, index) => {
        const { slot, layer } = layerAssignments[index];

        const card = document.createElement("div");
        card.className       = "card";
        card.dataset.symbol  = symbol;
        card.dataset.index   = index;
        card.dataset.slot    = slot;
        card.dataset.layer   = layer;

        // Offset visual bertumpuk (layer > 0 terlihat sedikit di belakang)
        if (layerCount > 1 && layer > 0) {
            const offsetPx = layer * 4;
            card.style.transform   = `translate(${offsetPx}px, ${offsetPx}px)`;
            card.style.zIndex      = String(10 - layer);
            card.classList.add("card-stacked");
        }

        // Tampilkan indikator layer di badge kecil
        if (layerCount > 1) {
            const badge = document.createElement("span");
            badge.className = "layer-badge";
            badge.dataset.layer = layer;
            // BUG FIX: badge dulunya statis (dibuat sekali berdasarkan layer
            // asli) sehingga kartu yang sudah terbuka tetap menampilkan ikon
            // gembok selamanya. Sekarang di-refresh oleh refreshLayerVisuals().
            badge.innerText = layer === 0 ? "✓" : "🔒";
            card.appendChild(badge);
        }

        card.innerHTML += `<span class="symbol">${symbol}</span>`;

        card.addEventListener("click", () => onCardClick(card, index, stageInfo));

        game.appendChild(card);
    });

    // Terapkan visual blocked/free setelah semua kartu dibuat
    refreshLayerVisuals();
}

/* ==========================================================================
   HANDLER KLIK KARTU
   ========================================================================== */

function onCardClick(card, index, stageInfo) {
    if (!gameStarted) return;
    if (lock)         return;
    if (card.classList.contains("matched")) return;
    if (firstCard === card) return;

    // === CEK BLOCKED ===
    if (isCardBlocked(card)) {
        // Animasi shake singkat untuk feedback
        card.classList.add("card-shake");
        setTimeout(() => card.classList.remove("card-shake"), 400);
        return;
    }

    playClickSound();
    card.classList.remove("hidden-symbol");

    if (!firstCard) {
        firstCard = card;
        firstCard.classList.add("selected-active");
    } else {
        secondCard = card;
        lock = true;

        if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
            // MATCH!
            try { drawConnection(firstCard, secondCard); } catch(e) {}
            try { handleComboSystem(); } catch(e) {}

            const card1 = firstCard;
            const card2 = secondCard;
            card1.classList.add("removing");
            card2.classList.add("removing");

            score += 10;
            const scoreEl = document.getElementById("score");
            if (scoreEl) scoreEl.innerText = score;

            firstCard  = null;
            secondCard = null;

            setTimeout(() => {
                card1.classList.add("matched");
                card2.classList.add("matched");
                card1.style.visibility = "hidden";
                card2.style.visibility = "hidden";
                lock = false;

                // Update layer setelah match – mungkin ada kartu yang jadi bebas
                refreshLayerVisuals();

                checkWin();
            }, 350);

        } else {
            // TIDAK MATCH
            comboCount = 0;
            if (comboTimer) clearTimeout(comboTimer);
            setTimeout(() => {
                if (firstCard)  firstCard.classList.remove("selected-active");
                if (secondCard) secondCard.classList.remove("selected-active");
                firstCard  = null;
                secondCard = null;
                lock = false;
            }, 300);
        }
    }

    // Boss reward card
    if (stageInfo.isBoss && index === bossRewardCard && !card.dataset.rewardFound) {
        card.dataset.rewardFound = "true";
        bossTokens++;
        updateBossTokenVisibility();
        playBossTokenSound();
        showModalInfo("🐉 SABUK UKT Diterima!", "Kamu mendapatkan Boss Token!");
    }
}

/* ==========================================================================
   SHUFFLE
   ========================================================================== */

function shuffleBoard() {
    if (!gameStarted) {
        showModalInfo("⚠️", "Mulai game dulu!");
        return;
    }

    const cards           = [...document.querySelectorAll(".card")];
    const unmatchedCards  = cards.filter(c => !c.classList.contains("matched"));
    const symbols         = unmatchedCards.map(c => c.dataset.symbol);

    shuffle(symbols);

    unmatchedCards.forEach((card, i) => {
        card.dataset.symbol = symbols[i];
        const symbolEl = card.querySelector(".symbol");
        if (symbolEl) symbolEl.innerText = symbols[i];
    });

    // Pastikan ada move yang bisa dilakukan
    let safety = 0;
    while (!hasAvailableMove() && safety < 20) {
        shuffle(symbols);
        unmatchedCards.forEach((card, i) => {
            card.dataset.symbol = symbols[i];
            const symbolEl = card.querySelector(".symbol");
            if (symbolEl) symbolEl.innerText = symbols[i];
        });
        safety++;
    }
}

function paidShuffle() {
    if (coins < 5) { showModalInfo("❌", "Koin tidak cukup!"); return; }
    coins -= 5;
    syncCoins();
    shuffleBoard();
}

function autoShuffle() {
    let count = 0;
    const interval = setInterval(() => {
        shuffleBoard();
        if (++count >= 10) {
            clearInterval(interval);
            showModalInfo("⚡", "Auto Shuffle selesai!");
        }
    }, 300);
}

/* ==========================================================================
   MODAL CUSTOM (pengganti alert/confirm/prompt)
   ========================================================================== */

/* ==========================================================================
   MODAL CUSTOM (pengganti alert/confirm/prompt)
   BUG FIX: showModalInfo & showModalConfirm dulunya berbagi satu elemen
   #customModal tanpa antrian. Kalau dua popup dipicu berdekatan (misalnya
   popup "Boss Token" lalu langsung disusul popup "Level Selesai" di level
   boss), popup kedua langsung menimpa isi popup pertama sebelum sempat
   terbaca pemain — terasa seperti tanda menang "hilang". Sekarang setiap
   showModalInfo/showModalConfirm baru akan MENGANTRI dulu jika ada modal
   yang sedang tampil, baru dirender setelah modal sebelumnya ditutup.
   ========================================================================== */

let modalBusy = false;
const modalQueue = [];

function queueModal(renderFn) {
    if (modalBusy) {
        modalQueue.push(renderFn);
    } else {
        modalBusy = true;
        renderFn();
    }
}

function closeModalAndAdvanceQueue(modal) {
    modal.classList.remove("modal-show");
    modal.style.display = "none";
    modalBusy = false;
    if (modalQueue.length > 0) {
        const next = modalQueue.shift();
        modalBusy = true;
        next();
    }
}

/**
 * Tampilkan modal informasi sederhana (pengganti alert).
 * @param {string} title
 * @param {string} message
 * @param {function} [onOk]
 */
function showModalInfo(title, message, onOk) {
    queueModal(() => {
        // Buat atau reuse modal
        let modal = document.getElementById("customModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "customModal";
            modal.innerHTML = `
                <div id="customModalBox">
                    <div id="customModalTitle"></div>
                    <div id="customModalMsg"></div>
                    <div id="customModalBtns"></div>
                </div>`;
            document.body.appendChild(modal);
        }
        // BUG FIX: popup kemenangan dulu bisa jadi tidak terlihat kalau
        // TKD.html tidak (atau belum) memuat stylesheet yang berisi style
        // #customModal — style inline ini memastikan popup SELALU tampil
        // di tengah layar apa pun kondisi CSS eksternalnya.
        applyModalInlineStyles(modal);
        modal.style.display = "flex";

        document.getElementById("customModalTitle").innerText = title;
        document.getElementById("customModalMsg").innerText   = message;

        const btns = document.getElementById("customModalBtns");
        btns.innerHTML = "";

        const okBtn = document.createElement("button");
        okBtn.innerText  = "OK";
        okBtn.className  = "modal-btn modal-btn-ok";
        okBtn.onclick    = () => {
            closeModalAndAdvanceQueue(modal);
            if (onOk) onOk();
        };
        btns.appendChild(okBtn);

        modal.classList.add("modal-show");
    });
}

/**
 * Terapkan style inline dasar ke modal supaya popup selalu tampil rapi
 * di tengah layar meskipun stylesheet eksternal (TKD.css/layer-styles.css)
 * belum ter-link dengan benar di halaman.
 */
function applyModalInlineStyles(modal) {
    Object.assign(modal.style, {
        position: "fixed", inset: "0", background: "rgba(0,0,0,0.72)",
        zIndex: "9999", display: "flex", alignItems: "center", justifyContent: "center"
    });
    const box = document.getElementById("customModalBox");
    if (box) {
        Object.assign(box.style, {
            background: "#1a1a2e", border: "2px solid #00ffff", borderRadius: "16px",
            padding: "28px 32px", minWidth: "260px", maxWidth: "90vw", textAlign: "center",
            boxShadow: "0 0 30px rgba(0,255,255,0.3)"
        });
    }
    const title = document.getElementById("customModalTitle");
    if (title) Object.assign(title.style, { fontSize: "1.3rem", fontWeight: "bold", color: "#ffd700", marginBottom: "10px" });
    const msg = document.getElementById("customModalMsg");
    if (msg) Object.assign(msg.style, { fontSize: "1rem", color: "#e0e0e0", marginBottom: "20px", lineHeight: "1.5" });
    const btns = document.getElementById("customModalBtns");
    if (btns) Object.assign(btns.style, { display: "flex", gap: "12px", justifyContent: "center" });
}

/**
 * Modal konfirmasi (pengganti confirm).
 */
function showModalConfirm(title, message, onYes, onNo) {
    queueModal(() => {
        let modal = document.getElementById("customModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "customModal";
            modal.innerHTML = `
                <div id="customModalBox">
                    <div id="customModalTitle"></div>
                    <div id="customModalMsg"></div>
                    <div id="customModalBtns"></div>
                </div>`;
            document.body.appendChild(modal);
        }
        applyModalInlineStyles(modal);
        modal.style.display = "flex";

        document.getElementById("customModalTitle").innerText = title;
        document.getElementById("customModalMsg").innerText   = message;

        const btns = document.getElementById("customModalBtns");
        btns.innerHTML = "";

        const yesBtn = document.createElement("button");
        yesBtn.innerText = "Ya";
        yesBtn.className = "modal-btn modal-btn-ok";
        yesBtn.onclick   = () => { closeModalAndAdvanceQueue(modal); if (onYes) onYes(); };

        const noBtn = document.createElement("button");
        noBtn.innerText = "Batal";
        noBtn.className = "modal-btn modal-btn-cancel";
        noBtn.onclick   = () => { closeModalAndAdvanceQueue(modal); if (onNo) onNo(); };

        btns.appendChild(yesBtn);
        btns.appendChild(noBtn);
        modal.classList.add("modal-show");
    });
}

/* ==========================================================================
   ITEM: HINT, NO LIMIT, SHUFFLE
   ========================================================================== */

function buyHint() {
    // BUG FIX: cek gameStarted/lock dipindah ke paling atas — sebelumnya
    // popup "Clue Habis" bisa muncul walau game belum dimulai.
    if (!gameStarted || lock) return;

    let itemHint = parseInt(localStorage.getItem("item_hint")) || 0;
    if (itemHint <= 0 && bossTokens <= 0) {
        lock = false;
        showModalConfirm("🔍 Clue Habis", "Buka Toko Taegeuk?",
            () => openTaegeukShop());
        return;
    }

    if (bossTokens > 0) {
        if (findAndHighlightMatch()) { bossTokens--; updateBossTokenVisibility(); }
        return;
    }
    if (findAndHighlightMatch()) {
        itemHint--;
        localStorage.setItem("item_hint", itemHint);
        updateInventoryUI();
    }
}

function useShuffleItem() {
    if (!gameStarted) { showModalInfo("⚠️", "Mulai game dulu!"); return; }
    let itemShuffle = parseInt(localStorage.getItem("item_shuffle")) || 0;
    if (itemShuffle <= 0) {
        showModalConfirm("🔀 Paid Shuffle Habis", "Buka Toko Taegeuk?",
            () => openTaegeukShop());
        return;
    }
    itemShuffle--;
    localStorage.setItem("item_shuffle", itemShuffle);
    updateInventoryUI();
    shuffleBoard();
}

function useNoLimitItem() {
    if (!gameStarted || isNoLimitActive) return;
    let itemNoLimit = parseInt(localStorage.getItem("item_noLimit")) || 0;
    if (itemNoLimit <= 0) {
        showModalConfirm("♾️ No Limit Time Habis", "Buka Toko Taegeuk?",
            () => openTaegeukShop());
        return;
    }
    itemNoLimit--;
    localStorage.setItem("item_noLimit", itemNoLimit);
    updateInventoryUI();

    isNoLimitActive = true;
    clearInterval(timer);
    time = 9999;
    const timeEl = document.getElementById("time");
    if (timeEl) timeEl.innerText = "♾️";
    showModalInfo("♾️ Waktu Tak Terbatas!", "Diaktifkan untuk level ini.");
}

function buySkipLevel() {
    if (coins < 15) { showModalInfo("❌", "Koin tidak cukup! Harga Lompat Level Rp.15K"); return; }
    showModalConfirm("⏭️ Lompat Level", "Bayar Rp.15K koin untuk melewati level ini?",
        () => {
            coins -= 15;
            syncCoins();
            saveGameData();
            nextLevel();
        });
}

/* ==========================================================================
   TIMER & FLOW GAME
   ========================================================================== */

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        time--;
        const tmEl = document.getElementById("time");
        if (tmEl) tmEl.innerText = time;
        if (time <= 0) {
            clearInterval(timer);
            gameStarted = false;
            saveToLeaderboard(true);
            document.getElementById("gameOverOverlay")?.classList.remove("hidden");
        }
    }, 1000);
}

function startLevel() {
    document.getElementById("startOverlay")?.classList.add("hidden");
    document.getElementById("bgMusic")?.play().catch(() => {});

    const countdown = document.getElementById("countdown");
    if (!countdown) { gameStarted = true; startTimer(); return; }

    let count = 3;
    countdown.style.display = "block";
    countdown.innerText     = count;
    playCountdownSound(false);

    const cd = setInterval(() => {
        count--;
        if (count > 0) {
            countdown.innerText = count;
            playCountdownSound(false);
        } else if (count === 0) {
            countdown.innerText = "GO!";
            playCountdownSound(true);
        } else {
            clearInterval(cd);
            countdown.style.display = "none";
            gameStarted = true;
            startTimer();
        }
    }, 1000);
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > maxReachedLevel) maxReachedLevel = currentLevel;
    saveGameData();
    comboCount = 0;
    if (comboTimer) { clearTimeout(comboTimer); comboTimer = null; }
    resetState();
}

function resetCurrentLevel() {
    document.getElementById("gameOverOverlay")?.classList.add("hidden");
    resetState();
}

function resetState() {
    clearInterval(timer);
    gameStarted     = false;
    firstCard       = null;
    secondCard      = null;
    lock            = false;
    relaxMode       = false;
    isNoLimitActive = false;
    initLevelConfig();
    createBoard();
    document.getElementById("startOverlay")?.classList.remove("hidden");
}

function changeDifficulty(value) {
    currentDifficulty = value;
    // BUG FIX: simpan pilihan agar tersinkron dengan selector di menu utama
    localStorage.setItem("tkd_difficulty", value);
    showModalInfo("🥋 Kesulitan Berubah", `Tingkat ujian: ${value.toUpperCase()}`,
        () => resetState());
}

/* ==========================================================================
   BELT & CHAPTER
   ========================================================================== */

function getBeltRank(level) {
    if (level <= 5)  return beltRanks[0];
    if (level <= 10) return beltRanks[1];
    if (level <= 15) return beltRanks[2];
    if (level <= 20) return beltRanks[3];
    if (level <= 25) return beltRanks[4];
    return beltRanks[5];
}

function updateBeltUI() {
    const belt     = getBeltRank(currentLevel);
    const beltBadge = document.getElementById("beltRank");
    // BUG FIX: hapus "Putih = currentDifficulty" yang tidak valid
    if (beltBadge) {
        beltBadge.innerText   = belt.name;
        beltBadge.style.color = belt.color;
    }
    document.body.style.background = belt.bg;
}

function getChapter(level) {
    return {
        chapter: Math.floor((level - 1) / 5) + 1,
        isBoss:  level % 5 === 0
    };
}

/* ==========================================================================
   LEVEL SELECTOR
   ========================================================================== */

function updateLevelSelectorHTML() {
    const selector = document.getElementById("levelSelector");
    if (!selector) return;
    selector.innerHTML = "";
    if (maxReachedLevel <= 1) { selector.disabled = true; return; }
    selector.disabled = false;
    for (let i = 1; i <= maxReachedLevel; i++) {
        const opt   = document.createElement("option");
        opt.value   = i;
        opt.text    = `Level ${i}`;
        if (i === currentLevel) opt.selected = true;
        selector.add(opt);
    }
}

function selectLevel(target) {
    if (!target) return;
    currentLevel = parseInt(target);
    resetState();
}

/* ==========================================================================
   WIN CHECK
   ========================================================================== */

function checkWin() {
    const total   = document.querySelectorAll(".card").length;
    const matched = document.querySelectorAll(".card.matched").length;
    if (matched < total) return false;

    clearInterval(timer);
    gameStarted = false;
    lock        = true;
    playVictorySound();

    setTimeout(() => {
        try { confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } }); } catch(e) {}

        let baseReward = 5, bonusCoins = 0;
        if      (currentDifficulty === "senior") bonusCoins = 1;
        else if (currentDifficulty === "sabeum") bonusCoins = 3;
        let totalReward = baseReward + bonusCoins;

        coins += totalReward;
        syncCoins();
        playGlassShatterSound();

        showModalInfo(
            `🏆 LEVEL ${currentLevel} SELESAI!`,
            `🎁 Hadiah: Rp.${totalReward}K`,
            () => nextLevel()
        );
    }, 500);

    return true;
}

/* ==========================================================================
   HINT
   ========================================================================== */

function findAndHighlightMatch() {
    // Hanya highlight kartu yang tidak blocked dan belum matched
    const cards = [...document.querySelectorAll(".card")]
        .filter(c => !c.classList.contains("matched") && !isCardBlocked(c));

    for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
            if (cards[i].dataset.symbol === cards[j].dataset.symbol) {
                lock = true;
                cards[i].classList.add("hint-card");
                cards[j].classList.add("hint-card");
                setTimeout(() => {
                    cards[i].classList.remove("hint-card");
                    cards[j].classList.remove("hint-card");
                    lock = false;
                }, 3000);
                return true;
            }
        }
    }
    showModalInfo("🔍 Tidak Ada Pasangan", "Semua pasangan yang bisa diklik tertindih. Coba shuffle dulu!");
    lock = false;
    return false;
}

/* ==========================================================================
   GRID HELPER
   ========================================================================== */

function isEmptyCell(x, y, cols, rows) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return true;
    const idx  = y * cols + x;
    const card = document.querySelector(`[data-index="${idx}"]`);
    return (!card || card.classList.contains("matched"));
}

function hasAvailableMove() {
    const free = [...document.querySelectorAll(".card:not(.matched)")]
        .filter(c => !isCardBlocked(c));
    // Cek apakah ada minimal satu pasangan di antara kartu bebas
    for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
            if (free[i].dataset.symbol === free[j].dataset.symbol) return true;
        }
    }
    return false;
}

/* ==========================================================================
   BOSS TOKEN
   ========================================================================== */

function updateBossTokenVisibility() {
    const wrapper   = document.getElementById("bossTokenWrapper");
    const tokenSpan = document.getElementById("bossTokens");
    if (!tokenSpan) return;
    tokenSpan.innerText = bossTokens;
    if (wrapper) wrapper.className = bossTokens > 0 ? "show-token" : "hidden-token";
}

/* ==========================================================================
   DEV CHEAT PANEL
   ========================================================================== */

function toggleCheatPanel()    { document.getElementById("cheatPanel")?.classList.toggle("hidden"); }
function cheatAddCoins()       { coins += 999; syncCoins(); showModalInfo("💰", "Koin Ditambahkan!"); }
function cheatAddBossTokens()  { bossTokens += 999; updateBossTokenVisibility(); showModalInfo("👑", "999 MASTER Token Ditambahkan!"); }
function cheatAutoWin()        { document.querySelectorAll(".card").forEach(c => { c.classList.remove("hidden-symbol"); c.classList.add("matched"); }); checkWin(); }
function cheatTimeNoLimit()    { clearInterval(timer); const t = document.getElementById("time"); if (t) t.innerText = "∞"; }
function cheatSetLevel() {
    const lvlInp = document.getElementById("cheatLevelInput");
    if (!lvlInp) return;
    const lvl = parseInt(lvlInp.value);
    if (lvl > 0) {
        currentLevel = lvl;
        if (currentLevel > maxReachedLevel) maxReachedLevel = currentLevel;
        resetState();
    }
}

/* ==========================================================================
   LONG PRESS & NAVIGASI
   ========================================================================== */

function setupLongPress(elementId, callbackLong, callbackShort) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let pressTimer = null, isLongPress = false;

    const startPress = () => {
        isLongPress = false;
        pressTimer  = setTimeout(() => { isLongPress = true; callbackLong(); }, 1000);
    };
    const endPress = () => {
        clearTimeout(pressTimer);
        if (!isLongPress) callbackShort();
        isLongPress = false;
    };

    el.addEventListener("mousedown",  startPress);
    el.addEventListener("mouseup",    endPress);
    el.addEventListener("touchstart", startPress, { passive: true });
    el.addEventListener("touchend",   endPress,   { passive: true });
}

function openTaegeukShop()    { window.location.href = "Shop.html"; }
function toggleSettingsPanel(){ document.getElementById("settingsPanel")?.classList.toggle("hidden"); }

/* ==========================================================================
   INIT
   ========================================================================== */

window.addEventListener("DOMContentLoaded", () => {
    setupLongPress("btnSkipLevel", toggleCheatPanel, buySkipLevel);
    setupLongPress("btnHint",      shuffleBoard,     buyHint);

    const settingsBtn   = document.getElementById("settingsBtn");
    const settingsPanel = document.getElementById("settingsPanel");

    if (settingsBtn && settingsPanel) {
        settingsBtn.onclick = (e) => { e.stopPropagation(); toggleSettingsPanel(); };
    }

    window.addEventListener("click", (e) => {
        if (settingsPanel && !settingsPanel.classList.contains("hidden")) {
            if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
                settingsPanel.classList.add("hidden");
            }
        }
    });

    const btnMulih = document.getElementById("btnMulih");
    if (btnMulih) btnMulih.onclick = () => { window.location.href = "index.html"; };

    // BUG FIX: sebelumnya currentDifficulty selalu "regular" saat halaman
    // dibuka, walaupun pemain sudah memilih tingkat lain di menu utama.
    currentDifficulty = localStorage.getItem("tkd_difficulty") || "regular";
    const difficultySelect = document.getElementById("difficultySelect");
    if (difficultySelect) difficultySelect.value = currentDifficulty;

    loadGameData();
    initLevelConfig();
    createBoard();
    updateBossTokenVisibility();
    renderLeaderboard();
});

/* ---------- Slideshow (tidak diubah) ---------- */
const slides = document.querySelectorAll(".slide");
let currentSlide = 0;
if (slides.length > 0) {
    setInterval(() => {
        slides[currentSlide].classList.remove("active");
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add("active");
    }, 2000);
}
