const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const params = new URLSearchParams(window.location.search);
// Берем данные из URL
let serverBalance = parseInt(params.get('balance')) || 0;
let serverBottles = parseInt(params.get('bottles')) || 0;
let serverRecord = parseInt(params.get('record')) || 0;

// Проверяем локальное сохранение (защита от вылетов)
let localBalance = parseInt(localStorage.getItem('fride_bal')) || 0;
let localBottles = parseInt(localStorage.getItem('fride_bot')) || 0;
let localRecord = parseInt(localStorage.getItem('fride_rec')) || 0;

// Используем максимальное значение (чтобы не потерять прогресс)
let balance = Math.max(serverBalance, localBalance);
let bottles = Math.max(serverBottles, localBottles);
let highScore = Math.max(serverRecord, localRecord);

let platforms = [], items = [], isPaused = false, isOver = false;
let currentMeters = 0, platCount = 0;
const player = { x: canvas.width/2, y: canvas.height-200, w: 40, h: 40, dy: -10, jump: -13, grav: 0.5 };

function init() {
    resetRound();
    // Загрузка
    let p = 0;
    let i = setInterval(() => {
        p += 5; document.getElementById('progress-fill').style.width = p+"%";
        if(p>=100) { clearInterval(i); document.getElementById('loader').classList.add('hidden'); document.getElementById('game-ui').classList.remove('hidden'); animate(); }
    }, 50);
}

function resetRound() {
    currentMeters = 0;
    player.y = canvas.height - 200; player.dy = -10;
    platforms = [{ x: canvas.width/2-40, y: canvas.height-100, w: 80, h: 15 }];
    items = [];
    isOver = false;
    platCount = 0;
    for(let i=1; i<8; i++) spawnPlat(canvas.height - i*130);
}

function spawnPlat(y) {
    platCount++;
    let x = Math.random()*(canvas.width-70);
    platforms.push({ x: x, y: y, w: 70, h: 15 });
    
    // Спавн предметов
    // Мешок (каждая 10-я ступень)
    if (platCount % 10 === 0) {
        items.push({ x: x+20, y: y-35, w: 30, h: 30, type: 'bag' }); // Мешок
    } 
    // Бутылка (часто)
    else if (Math.random() > 0.5) {
        items.push({ x: x+25, y: y-30, w: 20, h: 30, type: 'bottle' }); // Бутылка
    }
}

// Надежное сохранение в память телефона
function instantSave() {
    localStorage.setItem('fride_bal', balance);
    localStorage.setItem('fride_bot', bottles);
    localStorage.setItem('fride_rec', highScore);
}

window.addEventListener('touchmove', (e) => { if(!isPaused && !isOver) player.x = e.touches[0].clientX - 20; });

function update() {
    if(isPaused || isOver) return;
    player.dy += player.grav; player.y += player.dy;
    
    if(player.y < canvas.height/2) {
        let d = canvas.height/2 - player.y; player.y = canvas.height/2;
        currentMeters += Math.floor(d/10);
        platforms.forEach(p => { p.y += d; if(p.y > canvas.height) { platforms.splice(platforms.indexOf(p),1); spawnPlat(0); } });
        items.forEach(b => b.y += d);
    }

    if(player.dy > 0) {
        platforms.forEach(p => { if(player.x+30 > p.x && player.x < p.x+p.w && player.y+40 > p.y && player.y+40 < p.y+p.h+10) player.dy = player.jump; });
    }
    
    // Сбор предметов
    items.forEach((b,i) => { 
        if(player.x < b.x+b.w && player.x+30 > b.x && player.y < b.y+b.h && player.y+40 > b.y) { 
            items.splice(i,1); 
            if(b.type === 'bottle') {
                bottles++; balance += 1000; 
            } else if(b.type === 'bag') {
                balance += 10000; // Мешок 10к
            }
            instantSave(); // <-- СОХРАНЯЕМ ПРИ КАЖДОМ ВЗЯТИИ
        } 
    });
    
    if(player.y > canvas.height) { 
        isOver = true; 
        if(currentMeters > highScore) highScore = currentMeters;
        instantSave();
        document.getElementById('game-over').classList.remove('hidden'); 
        document.getElementById('final-steps').innerText = currentMeters;
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
    
    // Платформы
    ctx.fillStyle = "#000"; ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 2;
    platforms.forEach(p => { ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeRect(p.x, p.y, p.w, p.h); });
    
    // Предметы
    items.forEach(b => {
        if(b.type === 'bottle') {
            ctx.fillStyle = "#ff0055"; 
            ctx.font = "24px Arial"; ctx.fillText("🧪", b.x, b.y+25);
        } else {
            ctx.fillStyle = "#00ff00"; // Мешок - Зеленый
            ctx.font = "28px Arial"; ctx.fillText("💰", b.x, b.y+25);
        }
    });
    
    // Игрок F
    ctx.fillStyle = "#ff0055"; ctx.font = "900 40px 'Orbitron'"; 
    ctx.shadowBlur = 20; ctx.shadowColor = "#ff0055";
    ctx.fillText("F", player.x, player.y+30);
    ctx.shadowBlur = 0;

    requestAnimationFrame(animate);
}

// ОТПРАВКА В БОТА
const sendDataToBot = () => {
    // Обновляем рекорд перед отправкой
    if(currentMeters > highScore) highScore = currentMeters;
    
    tg.sendData(JSON.stringify({
        action: "save",
        balance: balance,
        bottles: bottles,
        record: highScore
    }));
    setTimeout(() => tg.close(), 100);
};

// ЕЩЕ РАЗ - Просто скрываем меню и сбрасываем позицию (БАЛАНС ОСТАЕТСЯ)
document.getElementById('restart-btn').onclick = () => {
    sendDataToBot(); // Отправляем данные в бота на всякий случай
    // Внимание: sendData закроет окно. 
    // Если нужно играть дальше без закрытия - используем просто reset:
    // document.getElementById('game-over').classList.add('hidden');
    // resetRound();
    // animate();
    // НО! Ты просил сохранение при нажатии. Самый надежный способ - отправить данные боту и закрыть.
    // Если хочешь остаться в игре:
    /*
    document.getElementById('game-over').classList.add('hidden');
    resetRound();
    animate();
    */
};

// ВЫХОД
document.getElementById('exit-btn').onclick = sendDataToBot;
document.getElementById('pause-exit-btn').onclick = sendDataToBot;

document.getElementById('resume-btn').onclick = () => { isPaused = false; document.getElementById('pause-modal').classList.add('hidden'); animate(); };
document.getElementById('pause-btn').onclick = () => { isPaused = true; document.getElementById('pause-modal').classList.remove('hidden'); };

document.getElementById('open-draw').onclick = () => document.getElementById('withdraw-modal').classList.remove('hidden');
document.getElementById('close-draw').onclick = () => document.getElementById('withdraw-modal').classList.add('hidden');
document.getElementById('confirm-draw').onclick = () => {
    let n = document.getElementById('in-name').value, a = parseInt(document.getElementById('in-amount').value);
    if(a >= 150000 && a <= balance) {
        tg.sendData(JSON.stringify({action:"withdraw", char_name:n, amount:a}));
        setTimeout(() => tg.close(), 100);
    } else tg.showAlert("Error: Min 150k!");
};

document.getElementById('support-btn').onclick = () => tg.openTelegramLink("https://t.me/Dead_Hard11");

init();
