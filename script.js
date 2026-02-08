const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const params = new URLSearchParams(window.location.search);
let totalBalance = parseInt(params.get('balance')) || 0;
let highScore = parseInt(params.get('record')) || 0;
let currentSteps = 0;

let platforms = [], bottles = [], isPaused = false, gameOver = false, platCount = 0;
const player = { x: canvas.width/2, y: canvas.height-200, w: 40, h: 40, dy: -10, jump: -12, grav: 0.45 };

function init() {
    // Создаем звезды на фоне
    for(let i=0; i<30; i++) {
        let s = document.createElement('div'); s.className = 'stars';
        s.style.left = Math.random()*100+'vw'; s.style.animationDelay = Math.random()*10+'s';
        document.body.appendChild(s);
    }
    platforms = [{ x: canvas.width/2-40, y: canvas.height-100, w: 80, h: 15 }];
    for(let i=1; i<8; i++) spawnPlat(canvas.height - i*130);
    setTimeout(() => { document.getElementById('loader').classList.add('hidden'); document.getElementById('game-ui').classList.remove('hidden'); animate(); }, 2000);
}

function spawnPlat(y) {
    platCount++;
    let x = Math.random()*(canvas.width-70);
    platforms.push({ x: x, y: y, w: 70, h: 15 });
    if(platCount % 4 === 0) bottles.push({ x: x+25, y: y-30, w: 20, h: 30 });
}

window.addEventListener('touchmove', (e) => { if(!isPaused && !gameOver) player.x = e.touches[0].clientX - 20; });

function update() {
    if(isPaused || gameOver) return;
    player.dy += player.grav; player.y += player.dy;
    
    // Камера и счетчик метров
    if(player.y < canvas.height/2) {
        let d = canvas.height/2 - player.y; 
        player.y = canvas.height/2;
        currentSteps += Math.floor(d/10); // Считаем "метры"
        platforms.forEach(p => { p.y += d; if(p.y > canvas.height) { platforms.splice(platforms.indexOf(p),1); spawnPlat(0); } });
        bottles.forEach(b => b.y += d);
    }

    if(player.dy > 0) {
        platforms.forEach(p => { if(player.x+30 > p.x && player.x < p.x+p.w && player.y+40 > p.y && player.y+40 < p.y+p.h+10) player.dy = player.jump; });
    }
    
    bottles.forEach((b,i) => { if(player.x < b.x+b.w && player.x+30 > b.x && player.y < b.y+b.h && player.y+40 > b.y) { bottles.splice(i,1); totalBalance += 1000; } });
    
    if(player.y > canvas.height) { 
        gameOver = true; 
        if(currentSteps > highScore) highScore = currentSteps;
        document.getElementById('game-over').classList.remove('hidden'); 
        document.getElementById('final-steps').innerText = currentSteps; 
    }
    
    document.getElementById('steps-counter').innerText = currentSteps + " м";
    document.getElementById('record').innerText = highScore;
    document.getElementById('money').innerText = totalBalance.toLocaleString();
    document.getElementById('bottles').innerText = Math.floor(totalBalance/1000);
}

function animate() {
    if(isPaused || gameOver) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    update();
    
    ctx.fillStyle = "#ff8c00"; // Платформы оранжевые
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));
    
    ctx.fillStyle = "#fff"; 
    bottles.forEach(b => ctx.fillText("🍼", b.x, b.y+20));
    
    // Игрок - Оранжевая буква F с эффектом свечения
    ctx.fillStyle = "#ff8c00";
    ctx.font = "900 45px Arial";
    ctx.shadowBlur = 15; ctx.shadowColor = "#ff4500";
    ctx.fillText("F", player.x, player.y+30);
    ctx.shadowBlur = 0;

    requestAnimationFrame(animate);
}

const saveAndExit = () => { tg.sendData(JSON.stringify({action:"save", total_balance: totalBalance, record: highScore})); tg.close(); };
document.getElementById('pause-exit-btn').onclick = saveAndExit;
document.getElementById('exit-btn').onclick = saveAndExit;
document.getElementById('resume-btn').onclick = () => { isPaused = false; document.getElementById('pause-modal').classList.add('hidden'); animate(); };
document.getElementById('pause-btn').onclick = () => { isPaused = true; document.getElementById('pause-modal').classList.remove('hidden'); };
document.getElementById('restart-btn').onclick = () => location.reload();
document.getElementById('open-draw').onclick = () => document.getElementById('withdraw-modal').classList.remove('hidden');
document.getElementById('close-draw').onclick = () => document.getElementById('withdraw-modal').classList.add('hidden');
document.getElementById('support-btn').onclick = () => tg.openTelegramLink("https://t.me/твой_ник");
document.getElementById('confirm-draw').onclick = () => {
    let n = document.getElementById('in-name').value, a = parseInt(document.getElementById('in-amount').value);
    if(a >= 150000 && a <= totalBalance) { tg.sendData(JSON.stringify({action:"withdraw", char_name:n, amount:a})); tg.close(); }
    else tg.showAlert("Минимум 150к и не больше баланса!");
};
init();
