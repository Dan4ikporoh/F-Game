const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let bottlesCollected = parseInt(localStorage.getItem('fride_bottles')) || 0;
let speedFactor = 1;
let isPaused = false;
let gameOver = false;

// Игрок (Буква F)
const player = {
    x: canvas.width / 2, y: canvas.height - 150, width: 40, height: 40,
    dy: 0, jumpPower: -10, gravity: 0.3, speed: 5
};

let platforms = [];
let bottles = [];

function init() {
    platforms = [];
    for(let i=0; i<7; i++) {
        platforms.push({ x: Math.random()*(canvas.width-60), y: i*100, width: 60, height: 10 });
    }
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        animate();
    }, 2000);
}

function drawPlayer() {
    ctx.fillStyle = "#00ff88";
    ctx.font = "900 40px Arial";
    ctx.fillText("F", player.x, player.y);
}

function update() {
    if(isPaused || gameOver) return;

    player.dy += player.gravity;
    player.y += player.dy;

    // Увеличение сложности
    speedFactor = 1 + Math.floor(bottlesCollected / 10) * 0.05;

    // Логика прыжка и платформ
    platforms.forEach(p => {
        if(player.dy > 0 && player.x + 30 > p.x && player.x < p.x + p.width && 
           player.y > p.y && player.y < p.y + p.height) {
            player.dy = player.jumpPower;
        }
        p.y += 2 * speedFactor; // Платформы едут вниз

        if(p.y > canvas.height) {
            p.y = 0;
            p.x = Math.random() * (canvas.width - 60);
            // Шанс появления бутылки
            if(Math.random() > 0.7) bottles.push({x: p.x + 15, y: p.y - 30, w: 20, h: 30});
        }
    });

    // Сбор бутылок
    bottles.forEach((b, index) => {
        b.y += 2 * speedFactor;
        if(player.y < b.y + b.h && player.y > b.y - 40 && player.x < b.x + b.w && player.x > b.x - 20) {
            bottles.splice(index, 1);
            bottlesCollected++;
            saveProgress();
        }
    });

    if(player.y > canvas.height) endGame();
    updateUI();
}

function saveProgress() {
    localStorage.setItem('fride_bottles', bottlesCollected);
}

function updateUI() {
    document.getElementById('bottles').innerText = bottlesCollected;
    document.getElementById('money').innerText = (bottlesCollected * 1000).toLocaleString();
}

function endGame() {
    gameOver = true;
    document.getElementById('final-bottles').innerText = bottlesCollected;
    document.getElementById('game-over').classList.remove('hidden');
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
    drawPlayer();
    
    // Рисуем платформы
    ctx.fillStyle = "white";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    
    // Рисуем бутылки
    ctx.fillStyle = "#ff0088";
    bottles.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

    if(!gameOver) requestAnimationFrame(animate);
}

// Кнопки
document.getElementById('withdraw-open').onclick = () => document.getElementById('withdraw-modal').classList.remove('hidden');
document.getElementById('send-request').onclick = () => {
    const name = document.getElementById('withdraw-name').value;
    if(bottlesCollected < 150) {
        tg.showAlert("Недостаточно бутылок! Нужно минимум 150 (150к руб).");
    } else {
        tg.sendData(JSON.stringify({action: "withdraw", name: name, amount: bottlesCollected * 1000}));
        tg.showAlert("✅ Запрос отправлен! Ожидайте уведомления.");
        document.getElementById('withdraw-modal').classList.add('hidden');
    }
};

document.getElementById('restart-btn').onclick = () => location.reload();
document.getElementById('support-btn').onclick = () => tg.openTelegramLink("https://t.me/твой_ник");

init();
