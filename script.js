const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const params = new URLSearchParams(window.location.search);
let balance = parseInt(params.get('balance')) || 0;
let bottles = parseInt(params.get('bottles')) || 0;
let highScore = parseInt(params.get('record')) || 0;

let platforms = [], bottleArray = [], isPaused = false, isOver = false;
let currentMeters = 0;
const player = { x: canvas.width/2, y: canvas.height-200, w: 40, h: 40, dy: -10, jump: -13, grav: 0.5 };

function init() {
    resetGame();
    // Анимация загрузки
    let p = 0;
    let i = setInterval(() => {
        p += 5; document.getElementById('progress-fill').style.width = p+"%";
        if(p>=100) { clearInterval(i); document.getElementById('loader').classList.add('hidden'); document.getElementById('game-ui').classList.remove('hidden'); animate(); }
    }, 50);
}

function resetGame() {
    currentMeters = 0;
    player.y = canvas.height - 200; player.dy = -10;
    platforms = [{ x: canvas.width/2-40, y: canvas.height-100, w: 80, h: 15 }];
    bottleArray = [];
    isOver = false;
    for(let i=1; i<8; i++) spawnPlat(canvas.height - i*130);
}

function spawnPlat(y) {
    let x = Math.random()*(canvas.width-70);
    platforms.push({ x: x, y: y, w: 70, h: 15 });
    if(Math.random() > 0.6) bottleArray.push({ x: x+25, y: y-35, w: 20, h: 30 });
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
        platforms.forEach(p => { if(player.x+40 > p.x && player.x < p.x+p.w && player.y+40 > p.y && player.y+40 < p.y+p.h+10) player.dy = player.jump; });
    }
    
    bottleArray.forEach((b,i) => { if(player.x < b.x+b.w && player.x+40 > b.x && player.y < b.y+b.h && player.y+40 > b.y) { bottleArray.splice(i,1); bottles++; balance += 1000; } });
    
    if(player.y > canvas.height) { 
        isOver = true; 
        if(currentMeters > highScore) highScore = currentMeters;
        document.getElementById('game-over').classList.remove('hidden'); 
        document.getElementById('final-steps').innerText = currentMeters;
        // НЕ отправляем сразу, ждем выбора игрока (Рестарт или Выход)
    }
    
    document.getElementById('steps-counter').innerText = currentMeters;
    document.getElementById('record').innerText = highScore;
    document.getElementById('money').innerText = balance.toLocaleString();
    document.getElementById('bottles').innerText = bottles;
}

function animate() {
    if(isPaused || isOver) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    update();
    
    // Неоновые платформы
    ctx.fillStyle = "#000"; ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 2;
    platforms.forEach(p => { ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeRect(p.x, p.y, p.w, p.h); });
    
    // Бутылки (Неон)
    ctx.fillStyle = "#ff0055"; 
    bottleArray.forEach(b => { ctx.shadowBlur=10; ctx.shadowColor="#ff0055"; ctx.fillText("🧪", b.x, b.y+25); ctx.shadowBlur=0; });
    
    // Игрок F
    ctx.fillStyle = "#ff0055"; ctx.font = "900 40px 'Orbitron'"; 
    ctx.shadowBlur = 20; ctx.shadowColor = "#ff0055";
    ctx.fillText("F", player.x, player.y+30);
    ctx.shadowBlur = 0;

    requestAnimationFrame(animate);
}

// ФУНКЦИЯ ОТПРАВКИ ДАННЫХ В ФОНЕ (БЕЗ ЗАКРЫТИЯ)
const sendDataBackground = () => {
    tg.sendData(JSON.stringify({
        action: "save",
        balance: balance,
        bottles: bottles,
        record: highScore
    }));
};

// При нажатии "ЕЩЕ РАЗ" мы сохраняем прогресс и перезапускаем раунд
document.getElementById('restart-btn').onclick = () => {
    sendDataBackground(); // <--- ВОТ ЭТО ГАРАНТИРУЕТ СОХРАНЕНИЕ
    document.getElementById('game-over').classList.add('hidden');
    resetGame();
    animate();
};

// При нажатии "ВЫЙТИ"
document.getElementById('exit-btn').onclick = () => { sendDataBackground(); setTimeout(() => tg.close(), 100); };
document.getElementById('pause-exit-btn').onclick = () => { sendDataBackground(); setTimeout(() => tg.close(), 100); };

document.getElementById('resume-btn').onclick = () => { isPaused = false; document.getElementById('pause-modal').classList.add('hidden'); animate(); };
document.getElementById('pause-btn').onclick = () => { isPaused = true; document.getElementById('pause-modal').classList.remove('hidden'); };

// ВЫВОД
document.getElementById('open-draw').onclick = () => document.getElementById('withdraw-modal').classList.remove('hidden');
document.getElementById('close-draw').onclick = () => document.getElementById('withdraw-modal').classList.add('hidden');
document.getElementById('confirm-draw').onclick = () => {
    let n = document.getElementById('in-name').value, a = parseInt(document.getElementById('in-amount').value);
    if(a >= 150000 && a <= balance) {
        tg.sendData(JSON.stringify({action:"withdraw", char_name:n, amount:a}));
        setTimeout(() => tg.close(), 100);
    } else tg.showAlert("Error: Min 150k or Low Balance");
};

document.getElementById('support-btn').onclick = () => tg.openTelegramLink("https://t.me/твой_ник");

init();
