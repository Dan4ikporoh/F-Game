const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const params = new URLSearchParams(window.location.search);
// Читаем начальные данные
let balance = parseInt(params.get('balance')) || 0;
let bottles = parseInt(params.get('bottles')) || 0;
let highScore = parseInt(params.get('record')) || 0;
let currentMeters = 0;

let platforms = [], bottleArray = [], isPaused = false, isOver = false;
const player = { x: canvas.width/2, y: canvas.height-200, w: 40, h: 40, dy: -10, jump: -12, grav: 0.45 };

function init() {
    // Звезды созданы в CSS
    platforms = [{ x: canvas.width/2-40, y: canvas.height-100, w: 80, h: 15 }];
    for(let i=1; i<8; i++) spawnPlat(canvas.height - i*130);
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('progress-fill').style.width = progress + "%";
        if(progress >= 100) {
            clearInterval(interval);
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('game-ui').classList.remove('hidden');
            animate();
        }
    }, 100);
}

function spawnPlat(y) {
    let x = Math.random()*(canvas.width-70);
    platforms.push({ x: x, y: y, w: 70, h: 15 });
    if(Math.random() > 0.7) bottleArray.push({ x: x+25, y: y-30, w: 20, h: 30 });
}

window.addEventListener('touchmove', (e) => { if(!isPaused && !isOver) player.x = e.touches[0].clientX - 20; });

function update() {
    if(isPaused || isOver) return;
    player.dy += player.grav; player.y += player.dy;
    
    if(player.y < canvas.height/2) {
        let d = canvas.height/2 - player.y; player.y = canvas.height/2;
        currentMeters += Math.floor(d/10);
        platforms.forEach(p => { p.y += d; if(p.y > canvas.height) { platforms.splice(platforms.indexOf(p),1); spawnPlat(0); } });
        bottleArray.forEach(b => b.y += d);
    }

    if(player.dy > 0) {
        platforms.forEach(p => { if(player.x+30 > p.x && player.x < p.x+p.w && player.y+40 > p.y && player.y+40 < p.y+p.h+10) player.dy = player.jump; });
    }
    
    bottleArray.forEach((b,i) => { if(player.x < b.x+b.w && player.x+30 > b.x && player.y < b.y+b.h && player.y+40 > b.y) { bottleArray.splice(i,1); bottles++; balance += 1000; } });
    
    if(player.y > canvas.height) { 
        isOver = true; 
        if(currentMeters > highScore) highScore = currentMeters;
        document.getElementById('game-over').classList.remove('hidden'); 
        document.getElementById('final-steps').innerText = currentMeters;
    }
    
    document.getElementById('steps-counter').innerText = currentMeters + " м";
    document.getElementById('record').innerText = highScore;
    document.getElementById('money').innerText = balance.toLocaleString();
    document.getElementById('bottles').innerText = bottles;
}

function animate() {
    if(isPaused || isOver) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    update();
    ctx.fillStyle = "#ff8c00"; platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
    ctx.fillStyle = "#fff"; bottleArray.forEach(b => ctx.fillText("🍼", b.x, b.y+20));
    ctx.fillStyle = "#ff8c00"; ctx.font = "900 45px Arial"; ctx.fillText("F", player.x, player.y+30);
    requestAnimationFrame(animate);
}

// ФУНКЦИЯ СОХРАНЕНИЯ
const saveDataAndClose = () => {
    // ВАЖНО: Обновляем рекорд перед отправкой
    if(currentMeters > highScore) highScore = currentMeters;
    
    const data = {
        action: "save",
        balance: balance,
        bottles: bottles,
        record: highScore
    };
    tg.sendData(JSON.stringify(data));
    // Не закрываем сразу, ждем отправки
    setTimeout(() => tg.close(), 100);
};

// Привязываем кнопки выхода
document.getElementById('pause-exit-btn').onclick = saveDataAndClose;
document.getElementById('exit-btn').onclick = saveDataAndClose;

document.getElementById('resume-btn').onclick = () => { isPaused = false; document.getElementById('pause-modal').classList.add('hidden'); animate(); };
document.getElementById('pause-btn').onclick = () => { isPaused = true; document.getElementById('pause-modal').classList.remove('hidden'); };
document.getElementById('restart-btn').onclick = () => location.reload();

// Вывод средств
document.getElementById('open-draw').onclick = () => document.getElementById('withdraw-modal').classList.remove('hidden');
document.getElementById('close-draw').onclick = () => document.getElementById('withdraw-modal').classList.add('hidden');
document.getElementById('confirm-draw').onclick = () => {
    let n = document.getElementById('in-name').value, a = parseInt(document.getElementById('in-amount').value);
    if(a >= 150000 && a <= balance) {
        tg.sendData(JSON.stringify({action:"withdraw", char_name:n, amount:a}));
        setTimeout(() => tg.close(), 100);
    } else tg.showAlert("Ошибка: минимум 150к!");
};

document.getElementById('support-btn').onclick = () => tg.openTelegramLink("https://t.me/твой_ник");

init();
