const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let bottlesCollected = parseInt(localStorage.getItem('fride_bottles')) || 0;
let score = 0;
let speedFactor = 1;
let isPaused = false;
let gameOver = false;

// Игрок (Буква F)
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 200,
    width: 40,
    height: 40,
    dy: -10, // Начальный прыжок вверх!
    jumpPower: -12,
    gravity: 0.4,
    speed: 6
};

let platforms = [];
let bottles = [];

function init() {
    platforms = [];
    bottles = [];
    gameOver = false;
    player.y = canvas.height - 200;
    player.dy = player.jumpPower; // Прыжок при старте
    
    // Создаем первую платформу точно под игроком
    platforms.push({
        x: player.x - 10,
        y: player.y + 50,
        width: 80,
        height: 15
    });

    // Создаем остальные платформы
    for (let i = 1; i < 8; i++) {
        addPlatform(canvas.height - i * 120);
    }

    // Скрываем загрузку через 2 секунды
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        animate();
    }, 2000);
}

function addPlatform(y) {
    platforms.push({
        x: Math.random() * (canvas.width - 70),
        y: y,
        width: 70,
        height: 15
    });
}

function drawPlayer() {
    ctx.fillStyle = "#00ff88";
    ctx.font = "900 45px Arial";
    ctx.fillText("F", player.x, player.y);
}

function update() {
    if (isPaused || gameOver) return;

    // Гравитация и движение
    player.dy += player.gravity;
    player.y += player.dy;

    // Ускорение каждые 10 бутылок
    speedFactor = 1 + (Math.floor(bottlesCollected / 10) * 0.05);

    // Если игрок поднялся выше середины, двигаем мир вниз (эффект камеры)
    if (player.y < canvas.height / 2) {
        let diff = canvas.height / 2 - player.y;
        player.y = canvas.height / 2;
        
        platforms.forEach(p => {
            p.y += diff;
            if (p.y > canvas.height) {
                platforms.splice(platforms.indexOf(p), 1);
                addPlatform(0); // Добавляем новую сверху
                
                // Шанс появления бутылки на новой платформе
                if (Math.random() > 0.6) {
                    bottles.push({
                        x: platforms[platforms.length-1].x + 20,
                        y: -30,
                        w: 25,
                        h: 35
                    });
                }
            }
        });
        
        bottles.forEach(b => b.y += diff);
    }

    // Проверка столкновения с платформами (только при падении вниз)
    if (player.dy > 0) {
        platforms.forEach(p => {
            if (player.x + 20 > p.x && 
                player.x < p.x + p.width && 
                player.y + 10 > p.y && 
                player.y - 10 < p.y + p.height) {
                player.dy = player.jumpPower;
            }
        });
    }

    // Сбор бутылок
    bottles.forEach((b, index) => {
        if (player.x < b.x + b.w &&
            player.x + 30 > b.x &&
            player.y < b.y + b.h &&
            player.y + 30 > b.y) {
            bottles.splice(index, 1);
            bottlesCollected++;
            saveProgress();
        }
        if (b.y > canvas.height) bottles.splice(index, 1);
    });

    // Проигрыш
    if (player.y > canvas.height) endGame();
    
    updateUI();
}

// Управление наклоном (влево-вправо)
window.addEventListener('deviceorientation', (e) => {
    let tilt = e.gamma; // Наклон телефона
    if (tilt) player.x += tilt * 0.5;
});

// Управление нажатием (для ПК и теста)
window.addEventListener('keydown', (e) => {
    if (e.key === "ArrowLeft") player.x -= 20;
    if (e.key === "ArrowRight") player.x += 20;
});

// Зацикливание экрана (если ушел за левый край, вышел из правого)
if (player.x > canvas.width) player.x = 0;
if (player.x < -30) player.x = canvas.width;

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
    
    // Рисуем платформы
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    platforms.forEach(p => {
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 5);
        ctx.fill();
    });
    
    // Рисуем бутылки (розовые иконки)
    ctx.fillStyle = "#ff0088";
    bottles.forEach(b => {
        ctx.font = "25px Arial";
        ctx.fillText("🍼", b.x, b.y + 25);
    });

    drawPlayer();

    if (!gameOver) requestAnimationFrame(animate);
}

// Кнопки управления
document.getElementById('pause-btn').onclick = () => {
    isPaused = !isPaused;
    document.getElementById('pause-btn').innerText = isPaused ? "▶️" : "⏸";
    if (!isPaused) animate();
};

document.getElementById('restart-btn').onclick = () => location.reload();
document.getElementById('exit-btn').onclick = () => tg.close();

init();
