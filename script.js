const tg = window.Telegram.WebApp;
tg.expand();

// В начале script.js
const urlParams = new URLSearchParams(window.location.search);
// Берем баланс из ссылки или из памяти, если ссылки нет
let totalBalance = parseInt(urlParams.get('balance')) || parseInt(localStorage.getItem('fride_bottles')) * 1000 || 0;

// Обновляем отображение баланса в начале игры
function updateUI() {
    document.getElementById('bottles').innerText = Math.floor(totalBalance / 1000);
    document.getElementById('money').innerText = totalBalance.toLocaleString();
}

// При сборе бутылки
// (внутри функции сбора в update)
if (player_collides_with_bottle) {
    totalBalance += 1000; // +1000 рублей за бутылку
    updateUI();
}

// ЛОГИКА ОКНА ВЫВОДА
const withdrawModal = document.getElementById('withdraw-form-modal');

document.getElementById('withdraw-btn').onclick = () => {
    withdrawModal.classList.remove('hidden');
};

document.getElementById('close-withdraw-btn').onclick = () => {
    withdrawModal.classList.add('hidden');
};

document.getElementById('confirm-withdraw-btn').onclick = () => {
    const charName = document.getElementById('input-char-name').value;
    const amount = parseInt(document.getElementById('input-amount').value);

    if (!charName || !amount) {
        tg.showAlert("Заполните все поля!");
        return;
    }

    if (amount < 150000) {
        tg.showAlert("Минимальная сумма вывода — 150 000 руб.!");
        return;
    }

    if (amount > totalBalance) {
        tg.showAlert("Недостаточно средств на балансе!");
        return;
    }

    // ОТПРАВКА ДАННЫХ БОТУ
    const data = {
        action: "withdraw",
        char_name: charName,
        amount: amount
    };
    
    tg.sendData(JSON.stringify(data)); // Бот получит это сообщение
    
    // Уменьшаем баланс в игре визуально
    totalBalance -= amount;
    updateUI();
    withdrawModal.classList.add('hidden');
    tg.close(); // Закрываем игру после вывода
};


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let bottlesCollected = parseInt(localStorage.getItem('fride_bottles')) || 0;
let platformCount = 0;
let isPaused = false;
let gameOver = false;
let speedFactor = 1;

const player = {
    x: canvas.width / 2, y: canvas.height - 200,
    width: 40, height: 40, dy: -10, jumpPower: -12, gravity: 0.45
};

let platforms = [];
let bottles = [];

function init() {
    platforms = [];
    bottles = [];
    platformCount = 0;
    
    // Начальная платформа
    platforms.push({ x: canvas.width/2 - 40, y: canvas.height - 100, w: 80, h: 15 });
    
    // Генерация первых блоков
    for(let i=1; i<8; i++) {
        spawnPlatform(canvas.height - i * 130);
    }

    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        animate();
    }, 2000);
}

function spawnPlatform(y) {
    platformCount++;
    const pW = 70, pH = 15;
    const pX = Math.random() * (canvas.width - pW);
    const newPlatform = { x: pX, y: y, w: pW, h: pH };
    platforms.push(newPlatform);

    // Логика бутылок: на каждом 3-м или 4-м блоке по 1-2 штуки
    if (platformCount % 3 === 0 || platformCount % 4 === 0) {
        const count = Math.random() > 0.5 ? 2 : 1;
        for(let i=0; i < count; i++) {
            bottles.push({
                x: pX + (i * 25), y: y - 35, w: 20, h: 30
            });
        }
    }
}

// Управление пальцем/мышкой
function handleMove(e) {
    if (isPaused || gameOver) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    player.x = clientX - player.width / 2;
}
canvas.addEventListener('touchmove', handleMove);
canvas.addEventListener('mousemove', handleMove);

function update() {
    if (isPaused || gameOver) return;

    player.dy += player.gravity;
    player.y += player.dy;

    // Скорость увеличивается по чуть-чуть
    speedFactor = 1 + (bottlesCollected / 50) * 0.1;

    // Движение камеры
    if (player.y < canvas.height / 2) {
        let diff = canvas.height / 2 - player.y;
        player.y = canvas.height / 2;
        platforms.forEach(p => {
            p.y += diff * speedFactor;
            if (p.y > canvas.height) {
                platforms.splice(platforms.indexOf(p), 1);
                spawnPlatform(0);
            }
        });
        bottles.forEach(b => b.y += diff * speedFactor);
    }

    // Прыжок от платформ
    if (player.dy > 0) {
        platforms.forEach(p => {
            if (player.x + 30 > p.x && player.x < p.x + p.w && 
                player.y + 40 > p.y && player.y + 40 < p.y + p.h + 10) {
                player.dy = player.jumpPower;
            }
        });
    }

    // Сбор бутылок
    bottles.forEach((b, i) => {
        if (player.x < b.x + b.w && player.x + 30 > b.x && player.y < b.y + b.h && player.y + 40 > b.y) {
            bottles.splice(i, 1);
            bottlesCollected++;
            localStorage.setItem('fride_bottles', bottlesCollected);
        }
        if (b.y > canvas.height) bottles.splice(i, 1);
    });

    if (player.y > canvas.height) endGame();
    updateUI();
}

function updateUI() {
    document.getElementById('bottles').innerText = bottlesCollected;
    document.getElementById('money').innerText = (bottlesCollected * 1000).toLocaleString();
}

function animate() {
    if (isPaused || gameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();

    // Рисуем платформы
    ctx.fillStyle = "#ff8c00";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Рисуем бутылки
    bottles.forEach(b => {
        ctx.font = "24px Arial";
        ctx.fillText("🍼", b.x, b.y + 20);
    });

    // Рисуем игрока
    ctx.fillStyle = "#fff";
    ctx.font = "900 40px Arial";
    ctx.fillText("F", player.x, player.y + 30);

    requestAnimationFrame(animate);
}

function endGame() {
    gameOver = true;
    document.getElementById('final-bottles').innerText = bottlesCollected;
    document.getElementById('game-over').classList.remove('hidden');
}

// КНОПКИ
document.getElementById('pause-btn').onclick = () => {
    isPaused = true;
    document.getElementById('pause-modal').classList.remove('hidden');
};
document.getElementById('resume-btn').onclick = () => {
    isPaused = false;
    document.getElementById('pause-modal').classList.add('hidden');
    animate();
};
document.getElementById('pause-exit-btn').onclick = () => tg.close();
document.getElementById('exit-btn').onclick = () => tg.close();
document.getElementById('restart-btn').onclick = () => location.reload();

document.getElementById('withdraw-btn').onclick = () => {
    if (bottlesCollected < 150) {
        tg.showAlert(`Недостаточно! Нужно 150 бутылок (150к руб). У вас: ${bottlesCollected}`);
    } else {
        tg.showAlert("Запрос на вывод 150.000+ руб отправлен админу!");
        // Тут можно добавить tg.sendData для отправки в бот
    }
};

document.getElementById('support-btn').onclick = () => tg.openTelegramLink("https://t.me/Dead_Hard11");

init();


