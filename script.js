const tg = window.Telegram.WebApp;
tg.expand();

alert("Игра запускается!"); // Это должно вылезти при старте

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

ctx.fillStyle = "orange";
ctx.fillRect(50, 50, 100, 100); // Рисуем оранжевый квадрат для теста
