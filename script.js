const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const params = new URLSearchParams(window.location.search);
// Начальные данные из бота
let balance = parseInt(params.get('balance')) || 0;
let bottles = parseInt(params.get('bottles')) || 0;
let highScore = parseInt(params.get('record')) || 0;

// Игровые переменные
let platforms = [], bottleArray = [], isPaused = false, isOver = false;
let currentMeters = 0;
const player = { x: canvas.width/2, y: canvas.height-200, w: 50, h: 50, dy: -10, jump: -13, grav: 0.5 }; // Чуть больше F

function init() {
    // Стикеры на фоне при загрузке
    const stickers = ["😀", "🚀", "💰", "💎", "🔥"];
    const loader = document.getElementById('stickers-bg');
    for(let i=0; i<15; i++) {
        let s = document.createElement('div');
        s.className = 'sticker-bg';
        s.innerText = stickers[Math.floor(Math.random()*stickers.length)];
        s.style.left = Math.random()*100 + "%";
        s.style.animationDuration = (2 + Math.random()*3) + "s";
        loader.appendChild(s);
    }

    resetGameVariables();
    
    // Эмуляция загрузки
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

function resetGameVariables() {
    // Сбрасываем только позицию, НЕ баланс
    currentMeters = 0;
    player.y = canvas.height - 200;
    player.dy = -10;
    platforms = [{ x: canvas.width/2-40, y: canvas.height-100, w: 80, h: 20 }];
    bottleArray = [];
    isOver = false;
    for(let i=1; i<8; i++) spawnPlat(canvas.height - i*130);
}

function spawnPlat(y) {
    let x = Math.random()*(canvas.width-70);
    platforms.push({ x: x, y: y, w: 70, h: 20 });
    if(Math.random() > 0.6) bottleArray.push({ x: x+25, y: y-35, w: 20, h: 30 });
}

window.addEventListener('touchmove', (e) => { if(!isPaused && !isOver) player.x = e.touches[0].clientX - 25; });

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
        platforms.forEach(p => { if(player.x+40 > p.x && player.x+10 < p.x+p.w && player.y+50 > p.y && player.y+50 < p.y+p.h+10) player.dy = player.jump; });
    }
    
    bottleArray.forEach((b,i) => { if(player.x < b.x+b.w && player.x+50 > b.x && player.y < b.y+b.h && player.y+50 > b.y) { bottleArray.splice(i,1); bottles++; balance += 1000; } });
    
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
    
    // Платформы с травой
    platforms.forEach(p => {
        ctx.fillStyle = "#8B4513"; // Земля
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#32CD32"; // Трава
        ctx.fillRect(p.x, p.y, p.w, 5);
    });
    
    ctx.fillStyle = "#fff"; bottleArray.forEach(b => ctx.fillText("🍼", b.x, b.y+25));
    
    // Игрок F
    ctx.fillStyle = "#FF8C00"; ctx.font = "900 50px Arial"; 
    ctx.strokeStyle = "black"; ctx.lineWidth = 2;
    ctx.strokeText("F", player.x, player.y+40);
    ctx.fillText("F", player.x, player.y+40);

    requestAnimationFrame(animate);
}

// КНОПКА "ЕЩЕ РАЗ" - ПРОСТО ПЕРЕЗАПУСКАЕТ РАУНД, БАЛАНС ОСТАЕТСЯ!
document.getElementById('restart-btn').onclick = () => {
    document.getElementById('game-over').classList.add('hidden');
    resetGameVariables();
    animate();
};

// КНОПКИ ВЫХОДА - ОТПРАВЛЯЮТ ДАННЫЕ БОТУ
const saveAndExit = () => {
    // Фиксируем рекорд перед выходом
    if(currentMeters > highScore) highScore = currentMeters;
    
    tg.sendData(JSON.stringify({
        action: "save",
        balance: balance,
        bottles: bottles,
        record: highScore
    }));
    setTimeout(() => tg.close(), 100);
};

document.getElementById('pause-exit-btn').onclick = saveAndExit;
document.getElementById('exit-btn').onclick = saveAndExit;

document.getElementById('resume-btn').onclick = () => { isPaused = false; document.getElementById('pause-modal').classList.add('hidden'); animate(); };
document.getElementById('pause-btn').onclick = () => { isPaused = true; document.getElementById('pause-modal').classList.remove('hidden'); };

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
