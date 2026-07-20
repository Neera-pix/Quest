const { Telegraf } = require('telegraf');
const express = require('express');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 6542247611;

const bot = new Telegraf(BOT_TOKEN);

app.use(express.json());

// Временное хранилище в памяти (квесты, товары, баланс)
let tasks = [
    { id: 1, title: 'Приготовить завтрак', reward: 50 },
    { id: 2, title: 'Обнять при встрече', reward: 20 }
];

let store = [
    { id: 1, title: 'Массаж спины 15 мин', price: 100 },
    { id: 2, title: 'Выбор фильма на вечер', price: 50 }
];

let userBalance = 0;

// API Эндпоинты
app.get('/api/data', (req, res) => {
    res.json({ tasks, store, balance: userBalance });
});

app.post('/api/add-task', (req, res) => {
    const { title, reward } = req.body;
    if (title && reward) {
        tasks.push({ id: Date.now(), title, reward: Number(reward) });
    }
    res.json({ success: true, tasks });
});

app.post('/api/add-store', (req, res) => {
    const { title, price } = req.body;
    if (title && price) {
        store.push({ id: Date.now(), title, price: Number(price) });
    }
    res.json({ success: true, store });
});

app.post('/api/complete-task', (req, res) => {
    const { id } = req.body;
    const task = tasks.find(t => t.id === id);
    if (task) {
        userBalance += task.reward;
        tasks = tasks.filter(t => t.id !== id);
    }
    res.json({ success: true, balance: userBalance, tasks });
});

app.post('/api/buy-item', (req, res) => {
    const { id } = req.body;
    const item = store.find(s => s.id === id);
    if (item && userBalance >= item.price) {
        userBalance -= item.price;
        res.json({ success: true, balance: userBalance });
    } else {
        res.json({ success: false, message: 'Недостаточно монет!' });
    }
});

// Фронтенд
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1c1c1e; color: #fff; padding: 15px; margin: 0; }
        .card { background: #2c2c2e; border-radius: 12px; padding: 15px; margin-bottom: 12px; }
        h2, h3 { margin-top: 0; }
        input, button { width: 100%; padding: 10px; margin-top: 8px; border-radius: 8px; border: none; box-sizing: border-box; }
        input { background: #3a3a3c; color: white; }
        button { background: #007aff; color: white; font-weight: bold; cursor: pointer; }
        button.secondary { background: #34c759; }
        .item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3a3c; padding: 8px 0; }
        .item:last-child { border-bottom: none; }
        .badge { background: #ffd60a; color: #000; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 0.9em; }
    </style>
</head>
<body>
    <h2>🎯 Квесты & Магазин</h2>
    <div class="card">Баланс: <span id="balance" class="badge">0 🪙</span></div>
    <div id="app"></div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const userId = tg.initDataUnsafe?.user?.id || 0;
        const isAdmin = userId == ${ADMIN_ID};

        async function loadData() {
            const res = await fetch('/api/data');
            const data = await res.json();
            document.getElementById('balance').innerText = data.balance + ' 🪙';
            render(data);
        }

        function render(data) {
            const app = document.getElementById('app');
            if (isAdmin) {
                app.innerHTML = \`
                    <div class="card">
                        <h3>➕ Добавить квест</h3>
                        <input id="t-title" placeholder="Название квеста">
                        <input id="t-reward" type="number" placeholder="Награда (монет)">
                        <button onclick="addTask()">Сохранить квест</button>
                    </div>
                    <div class="card">
                        <h3>➕ Добавить товар</h3>
                        <input id="s-title" placeholder="Название товара">
                        <input id="s-price" type="number" placeholder="Цена (монет)">
                        <button class="secondary" onclick="addStore()">Сохранить товар</button>
                    </div>
                \`;
            } else {
                let tasksHtml = data.tasks.map(t => \`
                    <div class="item">
                        <div>\${t.title} (+\${t.reward} 🪙)</div>
                        <button style="width:auto;" onclick="completeTask(\${t.id})">Сделано</button>
                    </div>
                \`).join('') || '<p>Квестов пока нет</p>';

                let storeHtml = data.store.map(s => \`
                    <div class="item">
                        <div>\${s.title} (\${s.price} 🪙)</div>
                        <button class="secondary" style="width:auto;" onclick="buyItem(\${s.id})">Купить</button>
                    </div>
                \`).join('') || '<p>Магазин пуст</p>';

                app.innerHTML = \`
                    <div class="card"><h3>📋 Доступные квесты</h3>\${tasksHtml}</div>
                    <div class="card"><h3>🎁 Магазин наград</h3>\${storeHtml}</div>
                \`;
            }
        }

        async function addTask() {
            const title = document.getElementById('t-title').value;
            const reward = document.getElementById('t-reward').value;
            await fetch('/api/add-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title, reward}) });
            loadData();
        }

        async function addStore() {
            const title = document.getElementById('s-title').value;
            const price = document.getElementById('s-price').value;
            await fetch('/api/add-store', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title, price}) });
            loadData();
        }

        async function completeTask(id) {
            await fetch('/api/complete-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
            loadData();
        }

        async function buyItem(id) {
            const res = await fetch('/api/buy-item', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
            const data = await res.json();
            if(!data.success) alert(data.message);
            loadData();
        }

        loadData();
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

const PORT = process.env.PORT || 3000;
app.
