/* ==========================================================================
   STORAGE.JS - Modul Save Data, Koin, & Papan Peringkat
   v2.0 - Bug Fix: hapus togglePanel duplikat
   ========================================================================== */

function saveGameData() {
    localStorage.setItem("tkd_currentLevel",    currentLevel);
    localStorage.setItem("tkd_maxReachedLevel", maxReachedLevel);
    localStorage.setItem("tkd_coins",           coins);
    localStorage.setItem("tkd_score",           score);
    saveToLeaderboard(false);
}

function syncCoins() {
    localStorage.setItem("tkd_coins", coins);
    const coinEl = document.getElementById("coins");
    if (coinEl) coinEl.innerText = coins;
}

function updateInventoryUI() {
    const itemHint    = parseInt(localStorage.getItem("item_hint"))    || 0;
    const itemNoLimit = parseInt(localStorage.getItem("item_noLimit")) || 0;
    const itemShuffle = parseInt(localStorage.getItem("item_shuffle")) || 0;

    if (document.getElementById("invHint"))    document.getElementById("invHint").innerText    = itemHint;
    if (document.getElementById("invNoLimit")) document.getElementById("invNoLimit").innerText = itemNoLimit;
    if (document.getElementById("invShuffle")) document.getElementById("invShuffle").innerText = itemShuffle;
}

function loadGameData() {
    const savedCurrent = localStorage.getItem("tkd_currentLevel");
    const savedMax     = localStorage.getItem("tkd_maxReachedLevel");
    const savedCoins   = localStorage.getItem("tkd_coins");
    const savedScore   = localStorage.getItem("tkd_score");

    if (savedCurrent && savedMax) {
        currentLevel    = parseInt(savedCurrent);
        maxReachedLevel = parseInt(savedMax);
        coins           = parseInt(savedCoins) || 0;
        score           = parseInt(savedScore) || 0;

        const sEl = document.getElementById("score");
        const cEl = document.getElementById("coins");
        if (sEl) sEl.innerText = score;
        if (cEl) cEl.innerText = coins;

        updateInventoryUI();
        return true;
    }
    return false;
}

function saveToLeaderboard(forcePrompt = false) {
    let playerName = localStorage.getItem("tkd_playerName");

    if (!playerName && score > 0) {
        playerName = prompt("Masukkan nama Anda untuk Papan Peringkat:", "PMS DRAGON");
        if (!playerName || playerName.trim() === "") playerName = "Anonim";
        localStorage.setItem("tkd_playerName", playerName);
    }

    if (!playerName) return;

    let leaderboard   = JSON.parse(localStorage.getItem("tkd_leaderboard")) || [];
    let existingEntry = leaderboard.find(e => e.name === playerName);

    if (existingEntry) {
        if (score > existingEntry.score) {
            existingEntry.score = score;
            existingEntry.level = maxReachedLevel;
        }
    } else if (score > 0) {
        leaderboard.push({ name: playerName, score, level: maxReachedLevel });
    }

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem("tkd_leaderboard", JSON.stringify(leaderboard));
    renderLeaderboard();
}

function renderLeaderboard() {
    const leaderboard = JSON.parse(localStorage.getItem("tkd_leaderboard")) || [];
    const tbody       = document.getElementById("leaderboard-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (leaderboard.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.4);">Belum ada rekor.</td></tr>`;
        return;
    }

    leaderboard.forEach((entry, index) => {
        const row    = document.createElement("tr");
        const medals = ["🐲", "🥇", "🥈", "🥉"];
        const medal  = medals[index] ?? (index + 1);
        row.innerHTML = `
            <td>${medal}</td>
            <td>${entry.name}</td>
            <td style="color:#21bb1a;font-weight:bold;">${entry.score}</td>
            <td>Lvl ${entry.level}</td>`;
        tbody.appendChild(row);
    });
}

function resetAllGameData() {
    // Gunakan modal custom jika tersedia, fallback ke confirm native
    if (typeof showModalConfirm === "function") {
        showModalConfirm(
            "⚠️ Reset Data",
            "Apakah Anda yakin ingin menghapus semua rekor, koin, dan progres?",
            () => {
                localStorage.clear();
                showModalInfo("✅", "Data berhasil di-reset!", () => window.location.reload());
            }
        );
    } else {
        if (confirm("Apakah Anda yakin ingin menghapus semua rekor, koin, dan progres?")) {
            localStorage.clear();
            alert("✅ Data berhasil di-reset!");
            window.location.reload();
        }
    }
}

// BUG FIX: togglePanel DIHAPUS dari sini — sudah ada di Shop.js & index.js
// Jangan definisikan ulang di sini agar tidak konflik.
