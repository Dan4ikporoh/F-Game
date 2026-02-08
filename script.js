const tg = window.Telegram.WebApp;
tg.expand();

console.log("Script started");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Подстройка размера
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Получаем баланс из ссылки бота
const urlParams = new URLSearchParams(window.location.search);
let totalBalance = parseInt(urlParams.get('balance')) || 0;
let bottlesCollected = Math.floor(totalBalance / 1000);

let platforms = [];
let bottles = [];
let isPaused = false;
let gameOver = false;
let platformCount = 0;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 200,
    w: 40, h: 40,
    dy: -10, jumpPower: -12, gravity: 0.45
};

// Запуск игры
function init() {
    console.log("Init game...");
    platforms = [];
    bottles = [];
    platforms.push({ x: canvas.width/2 - 40, y: canvas.height - 100, w: 80, h: 15 });
    
    for(let i=1; i<8; i++) {
        spawnPlatform(canvas.height - i * 130);
    }

    setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('game-ui').classList.remove('hidden');
        animate();
    }, 1500);
}

function spawnPlatform(y) {
    platformCount++;
    const pX = Math.random() * (canvas.width - 70);
    platforms.push({ x: pX, y: y, w: 70, h: 15 });

    if (platformCount % 4 === 0) {
        bottles.push({ x: pX + 20, y: y - 30, w: 20, h: 30 });
    }
}

// Управление
window.addEventListener('touchstart', (e) => {
    player.x = e.touches[0].clientX - 20;
});
window.addEventListener('touchmove', (e) => {
    player.x = e.touches[0].clientX - 20;
});

function update() {
    if (isPaused || gameOver) return;

    player.dy += player.gravity;
    player.y += player.dy;

    // Камера
    if (player.y < canvas.height / 2) {
        let diff = canvas.height / 2 - player.y;
        player.y = canvas.height / 2;
        platforms.forEach(p => {
            p.y += diff;
            if (p.y > canvas.height) {
                platforms.splice(platforms.indexOf(p), 1);
                spawnPlatform(0);
            }
        });
        bottles.forEach(b => b.y += diff);
    }

    // Прыжок
    if (player.dy > 0) {
        platforms.forEach(p => {
            if (player.x + 30 > p.x && player.x < p.x + p.w && 
                player.y + 40 > p.y && player.y + 40 < p.y + p.h + 5) {
                player.dy = player.jumpPower;
            }
        });
    }

    // Сбор
    bottles.forEach((b, i) => {
        if (player.x < b.x + b.w && player.x + 30 > b.x && player.y < b.y + b.h && player.y + 40 > b.y) {
            bottles.splice(i, 1);
            totalBalance += 1000;
            bottlesCollected++;
            updateUI();
        }
    });

    if (player.y > canvas.height) {
        gameOver = true;
        document.getElementById('final-bottles').innerText = bottlesCollected;
        document.getElementById('game-over').classList.remove('hidden');
    }
}

function updateUI() {
    document.getElementById('bottles').innerText = bottlesCollected;
    document.getElementById('money').innerText = totalBalance.toLocaleString();
}

function animate() {
    if (isPaused || gameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();

    ctx.fillStyle = "#ff8c00";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    ctx.fillStyle = "white";
    bottles.forEach(b => ctx.fillText("🍼", b.x, b.y + 20));

    ctx.fillStyle = "#fff";
    ctx.font = "900 40px Arial";
    ctx.fillText("F", player.x, player.y + 35);

    requestAnimationFrame(animate);
}

// Кнопки
document.getElementById('pause-btn').onclick = () => {
    isPaused = true;
    document.getElementById('pause-modal').classList.remove('hidden');
};
document.getElementById('resume-btn').onclick = () => {
    isPaused = false;
    document.getElementById('pause-modal').classList.add('hidden');
    animate();
};

document.getElementById('withdraw-btn').onclick = () => {
    document.getElementById('withdraw-form-modal').classList.remove('hidden');
};
document.getElementById('close-withdraw-btn').onclick = () => {
    document.getElementById('withdraw-form-modal').classList.add('hidden');
};

document.getElementById('confirm-withdraw-btn').onclick = () => {
    const name = document.getElementById('input-char-name').value;
    const amount = parseInt(document.getElementById('input-amount').value);
    if (amount >= 150000 && amount <= totalBalance) {
        tg.sendData(JSON.stringify({action: "withdraw", char_name: name, amount: amount}));
        tg.close();
    } else {
        tg.showAlert("Ошибка суммы!");
    }
};

document.getElementById('restart-btn').onclick = () => location.reload();
document.getElementById('support-btn').onclick = () => tg.openTelegramLink("https://t.me/твой_ник");

// СТАРТ
init();
updateUI();
