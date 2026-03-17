/* =========================
   Settings
========================= */
const IMAGE_PATHS = {
    characters: {
        ann: "images/ann.png",
        momoka: "images/momoka.png",
    },
    items: {
        strawberry: "images/item_chin.png",
        cake: "images/item_chinko.png",
        star: "images/item_chinking.png",
        special: "images/item_special.png",
        unko: "images/item_unko.png",
    },
};

const CHARACTERS = {
    ann: {
        name: "アン",
        speed: 11.5,
        width: 82,
        height: 82,
        catchPadding: 10,
        skillDuration: 5000,
        skillType: "speed",
    },
    momoka: {
        name: "ももか",
        speed: 7.2,
        width: 88,
        height: 88,
        catchPadding: 24,
        skillDuration: 5000,
        skillType: "scoreMultiplier",
    },
};

const ITEM_TYPES = {
    strawberry: { score: 10, chance: 0.30, size: 48, color: "#ff7da7" },
    cake: { score: 20, chance: 0.22, size: 52, color: "#ffb269" },
    star: { score: 30, chance: 0.16, size: 54, color: "#ffd84c" },
    special: { score: 0, chance: 0.12, size: 50, color: "#6aa9ff" },
    unko: { score: -15, chance: 0.20, size: 48, color: "#8f6039" },
};

const GAME = {
    duration: 60,
    baseSpawnInterval: 720,
    baseFallSpeed: 2.7,
};

/* =========================
   DOM
========================= */
const screens = {
    title: document.getElementById("titleScreen"),
    select: document.getElementById("selectScreen"),
    game: document.getElementById("gameScreen"),
    result: document.getElementById("resultScreen"),
};

const ui = {
    scoreText: document.getElementById("scoreText"),
    timeText: document.getElementById("timeText"),
    skillText: document.getElementById("skillText"),
    finalScoreText: document.getElementById("finalScoreText"),
    finalCharacterText: document.getElementById("finalCharacterText"),
    warningText: document.getElementById("warningText"),
    flashLayer: document.getElementById("flashLayer"),
    gameOverlay: document.getElementById("gameOverlay"),
    skillBtn: document.getElementById("skillBtn"),
    touchArea: document.getElementById("touchArea"),
    annCardImage: document.getElementById("annCardImage"),
    momokaCardImage: document.getElementById("momokaCardImage"),
};

const buttons = {
    goSelect: document.getElementById("goSelectBtn"),
    backTitle: document.getElementById("backTitleBtn"),
    startGame: document.getElementById("startGameBtn"),
    retry: document.getElementById("retryBtn"),
    toSelect: document.getElementById("toSelectBtn"),
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* =========================
   State
========================= */
const images = {};

const state = {
    selectedCharacterKey: "ann",
    score: 0,
    skillGauge: 0,
    skillReady: false,
    skillActive: false,
    skillEndTime: 0,
    activeMultiplier: 1,
    items: [],
    player: null,
};

const runtime = {
    gameRunning: false,
    animationId: null,
    countdownInterval: null,
    lastFrameTime: 0,
    spawnTimer: 0,
    remainingTime: GAME.duration,
    difficultyLevel: 0,
    isDragging: false,
    targetPlayerX: null,
};

/* =========================
   Setup
========================= */
function applyImagePathsToUI() {
    ui.annCardImage.src = IMAGE_PATHS.characters.ann;
    ui.momokaCardImage.src = IMAGE_PATHS.characters.momoka;
}

function preloadImages() {
    const sources = [
        ...Object.values(IMAGE_PATHS.characters),
        ...Object.values(IMAGE_PATHS.items),
    ];

    const jobs = sources.map(
        (src) =>
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ src, img });
                img.onerror = () => resolve({ src, img: null });
                img.src = src;
            })
    );

    return Promise.all(jobs).then((results) => {
        results.forEach(({ src, img }) => {
            images[src] = img;
        });
    });
}

/* =========================
   Screen Control
========================= */
function showScreen(name) {
    Object.values(screens).forEach((screen) => {
        screen.classList.remove("active");
    });
    screens[name].classList.add("active");
}

function chooseCharacter(key) {
    state.selectedCharacterKey = key;

    document.querySelectorAll(".card").forEach((card) => {
        card.classList.toggle("selected", card.dataset.char === key);
    });
}

/* =========================
   Game State
========================= */
function createPlayer() {
    const charData = CHARACTERS[state.selectedCharacterKey];

    return {
        x: canvas.width / 2 - charData.width / 2,
        y: canvas.height - charData.height - 18,
        width: charData.width,
        height: charData.height,
        speed: charData.speed,
        catchPadding: charData.catchPadding,
        charKey: state.selectedCharacterKey,
    };
}

function resetGameState() {
    state.score = 0;
    state.skillGauge = 0;
    state.skillReady = false;
    state.skillActive = false;
    state.skillEndTime = 0;
    state.activeMultiplier = 1;
    state.items = [];
    state.player = createPlayer();

    runtime.gameRunning = true;
    runtime.lastFrameTime = 0;
    runtime.spawnTimer = 0;
    runtime.remainingTime = GAME.duration;
    runtime.difficultyLevel = 0;
    runtime.isDragging = false;
    runtime.targetPlayerX = state.player.x;

    ui.warningText.classList.remove("show");
    updateHUD();
}

function startGame() {
    clearGameLoop();
    resetGameState();
    showScreen("game");

    runtime.countdownInterval = setInterval(() => {
        runtime.remainingTime -= 1;

        if (runtime.remainingTime <= 10) {
            ui.warningText.classList.add("show");
        }

        if (runtime.remainingTime <= 0) {
            runtime.remainingTime = 0;
            updateHUD();
            endGame();
            return;
        }

        updateDifficulty();
        updateHUD();
    }, 1000);

    runtime.animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
    runtime.gameRunning = false;
    clearGameLoop();

    ui.finalScoreText.textContent = state.score;
    ui.finalCharacterText.textContent = `使用キャラ：${CHARACTERS[state.selectedCharacterKey].name}`;
    showScreen("result");
}

function clearGameLoop() {
    if (runtime.animationId) {
        cancelAnimationFrame(runtime.animationId);
        runtime.animationId = null;
    }

    if (runtime.countdownInterval) {
        clearInterval(runtime.countdownInterval);
        runtime.countdownInterval = null;
    }
}

function updateDifficulty() {
    const elapsed = GAME.duration - runtime.remainingTime;
    runtime.difficultyLevel = Math.floor(elapsed / 15);
}

function updateHUD() {
    ui.scoreText.textContent = state.score;
    ui.timeText.textContent = runtime.remainingTime;
    ui.skillText.textContent = state.skillReady ? "READY!" : `${state.skillGauge} / 3`;
    ui.skillBtn.classList.toggle("disabled", !state.skillReady);
}

/* =========================
   Items
========================= */
function getSpawnInterval() {
    return Math.max(290, GAME.baseSpawnInterval - runtime.difficultyLevel * 90);
}

function getFallSpeed() {
    return GAME.baseFallSpeed + runtime.difficultyLevel * 0.75;
}

function weightedRandomType() {
    const r = Math.random();
    let total = 0;

    for (const key in ITEM_TYPES) {
        total += ITEM_TYPES[key].chance;
        if (r <= total) {
            return key;
        }
    }

    return "strawberry";
}

function spawnItem() {
    const type = weightedRandomType();
    const itemDef = ITEM_TYPES[type];

    state.items.push({
        type,
        x: Math.random() * (canvas.width - itemDef.size),
        y: -itemDef.size,
        size: itemDef.size,
        speed: getFallSpeed() + Math.random() * 1.15,
        rotation: Math.random() * Math.PI * 2,
        rotateSpeed: (Math.random() - 0.5) * 0.04,
    });
}

function updateItems() {
    const player = state.player;
    const catchBox = {
        x: player.x - player.catchPadding,
        y: player.y,
        width: player.width + player.catchPadding * 2,
        height: player.height - 10,
    };

    state.items = state.items.filter((item) => {
        item.y += item.speed;
        item.rotation += item.rotateSpeed;

        const hit =
            item.x < catchBox.x + catchBox.width &&
            item.x + item.size > catchBox.x &&
            item.y < catchBox.y + catchBox.height &&
            item.y + item.size > catchBox.y;

        if (hit) {
            handleCatch(item);
            return false;
        }

        return item.y < canvas.height + item.size;
    });
}

function handleCatch(item) {
    const def = ITEM_TYPES[item.type];

    if (item.type === "special") {
        if (!state.skillReady) {
            state.skillGauge += 1;
            if (state.skillGauge >= 3) {
                state.skillGauge = 3;
                state.skillReady = true;
            }
        }
        addFloatingText("+SKILL", item.x + item.size / 2, item.y, "special");
    } else if (item.type === "unko") {
        state.score += def.score;
        flash("danger-hit");
        addFloatingText(`${def.score}`, item.x + item.size / 2, item.y, "bad");
    } else {
        const gained = def.score * state.activeMultiplier;
        state.score += gained;
        addFloatingText(`+${gained}`, item.x + item.size / 2, item.y, "good");
    }

    updateHUD();
}

/* =========================
   Skill
========================= */
function activateSkill() {
    if (!state.skillReady || state.skillActive || !runtime.gameRunning) return;

    const charData = CHARACTERS[state.selectedCharacterKey];

    state.skillReady = false;
    state.skillGauge = 0;
    state.skillActive = true;
    state.skillEndTime = performance.now() + charData.skillDuration;

    if (charData.skillType === "scoreMultiplier") {
        state.activeMultiplier = 2;
    }

    flash("skill-active");
    updateHUD();
}

function updateSkill(now) {
    if (!state.skillActive) return;

    if (now >= state.skillEndTime) {
        state.skillActive = false;
        state.activeMultiplier = 1;
    }
}

/* =========================
   Player Control
========================= */
function getPointerX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    return (clientX - rect.left) * scaleX;
}

function setTargetPlayerX(clientX) {
    if (!state.player) return;
    const pointerX = getPointerX(clientX);
    runtime.targetPlayerX = pointerX - state.player.width / 2;
}

function updatePlayer() {
    const player = state.player;
    if (!player) return;

    let currentSpeed = player.speed;

    if (
        state.skillActive &&
        CHARACTERS[state.selectedCharacterKey].skillType === "speed"
    ) {
        currentSpeed *= 1.7;
    }

    if (runtime.targetPlayerX !== null) {
        const diff = runtime.targetPlayerX - player.x;

        if (Math.abs(diff) <= currentSpeed) {
            player.x = runtime.targetPlayerX;
        } else {
            player.x += Math.sign(diff) * currentSpeed;
        }
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

/* =========================
   Effects
========================= */
function flash(className) {
    ui.flashLayer.className = "flash";
    void ui.flashLayer.offsetWidth;
    ui.flashLayer.classList.add(className);
}

function addFloatingText(text, x, y, kind) {
    const el = document.createElement("div");
    el.className = `floating-text ${kind}`;
    el.textContent = text;
    el.style.left = `${(x / canvas.width) * 100}%`;
    el.style.top = `${(y / canvas.height) * 100}%`;

    ui.gameOverlay.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 900);
}

/* =========================
   Drawing
========================= */
function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#fff8fc");
    grad.addColorStop(0.6, "#f8fbff");
    grad.addColorStop(1, "#edf7ff");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.fillStyle =
            i % 2 === 0
                ? "rgba(255, 195, 221, 0.18)"
                : "rgba(176, 220, 255, 0.18)";
        ctx.arc(50 + i * 72, 68 + (i % 2) * 36, 28, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawImageOrFallback(src, x, y, size, color, rotation = 0) {
    const img = images[src];

    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(rotation);

    if (img) {
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
        ctx.fillStyle = color;
        drawRoundedRect(ctx, -size / 2, -size / 2, size, size, 14);
        ctx.fill();
    }

    ctx.restore();
}

function drawRoundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

function drawItems() {
    state.items.forEach((item) => {
        drawImageOrFallback(
            IMAGE_PATHS.items[item.type],
            item.x,
            item.y,
            item.size,
            ITEM_TYPES[item.type].color,
            item.rotation
        );
    });
}

function drawPlayerShadow(player) {
    ctx.save();
    ctx.fillStyle = "rgba(81, 61, 90, 0.12)";
    ctx.beginPath();
    ctx.ellipse(
        player.x + player.width / 2,
        player.y + player.height - 2,
        player.width * 0.28,
        8,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
}

function drawPlayer() {
    const player = state.player;
    if (!player) return;

    const src = IMAGE_PATHS.characters[player.charKey];
    const size = Math.max(player.width, player.height);

    drawPlayerShadow(player);
    drawImageOrFallback(src, player.x, player.y, size, "#ff84b1", 0);

    if (state.skillActive) {
        ctx.save();
        ctx.strokeStyle =
            CHARACTERS[state.selectedCharacterKey].skillType === "speed"
                ? "rgba(255, 111, 169, 0.55)"
                : "rgba(96, 140, 255, 0.55)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2,
            player.y + player.height / 2,
            player.width * 0.56,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
    }
}

function drawSkillHint() {
    if (!state.skillReady) return;

    ctx.save();
    ctx.fillStyle = "rgba(79, 132, 255, 0.15)";
    ctx.fillRect(14, 14, 132, 34);
    ctx.fillStyle = "#4479f2";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("SKILL READY!", 24, 37);
    ctx.restore();
}

function render() {
    drawBackground();
    drawItems();
    drawPlayer();
    drawSkillHint();
}

function renderLoadingPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#5c4a63";
    ctx.textAlign = "center";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("STARTでゲーム開始！", canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = "14px sans-serif";
    ctx.fillText(
        "画像がない場合は色付きの仮ブロックで表示されます",
        canvas.width / 2,
        canvas.height / 2 + 20
    );
    ctx.textAlign = "start";
}

/* =========================
   Main Loop
========================= */
function gameLoop(timestamp) {
    if (!runtime.gameRunning) return;

    if (!runtime.lastFrameTime) {
        runtime.lastFrameTime = timestamp;
    }

    const delta = timestamp - runtime.lastFrameTime;
    runtime.lastFrameTime = timestamp;

    runtime.spawnTimer += delta;
    if (runtime.spawnTimer >= getSpawnInterval()) {
        spawnItem();
        runtime.spawnTimer = 0;
    }

    updateSkill(timestamp);
    updatePlayer();
    updateItems();
    render();

    runtime.animationId = requestAnimationFrame(gameLoop);
}

/* =========================
   Events
========================= */
function bindButtons() {
    buttons.goSelect.addEventListener("click", () => showScreen("select"));
    buttons.backTitle.addEventListener("click", () => showScreen("title"));
    buttons.startGame.addEventListener("click", startGame);
    buttons.retry.addEventListener("click", startGame);
    buttons.toSelect.addEventListener("click", () => showScreen("select"));
    ui.skillBtn.addEventListener("click", activateSkill);
}

function bindCharacterCards() {
    document.querySelectorAll(".card").forEach((card) => {
        card.addEventListener("click", () => {
            chooseCharacter(card.dataset.char);
        });
    });
}

function bindTouchControls() {
    ui.touchArea.addEventListener("pointerdown", (e) => {
        if (!runtime.gameRunning || !state.player) return;
        e.preventDefault();
        runtime.isDragging = true;
        setTargetPlayerX(e.clientX);
    });

    ui.touchArea.addEventListener("pointermove", (e) => {
        if (!runtime.gameRunning || !runtime.isDragging || !state.player) return;
        e.preventDefault();
        setTargetPlayerX(e.clientX);
    });

    window.addEventListener("pointerup", () => {
        runtime.isDragging = false;
    });

    window.addEventListener("pointercancel", () => {
        runtime.isDragging = false;
    });
}

function bindKeyboardFallback() {
    window.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            activateSkill();
        }
    });
}

/* =========================
   Init
========================= */
async function init() {
    applyImagePathsToUI();
    bindButtons();
    bindCharacterCards();
    bindTouchControls();
    bindKeyboardFallback();
    chooseCharacter("ann");
    await preloadImages();
    renderLoadingPreview();
}

init();