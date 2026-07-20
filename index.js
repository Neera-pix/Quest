const { Telegraf } = require('telegraf');
const express = require('express');
const { Redis } = require('@upstash/redis');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 6542247611;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const DEFAULT_DB = {
    tasks: [
        { id: 1, title: 'Приготовить завтрак', reward: 50 },
        { id: 2, title: 'Обнять при встрече', reward: 20 }
    ],
    store: [
        { id: 1, title: 'Массаж спины 15 мин', price: 100 },
        { id: 2, title: 'Выбор фильма на вечер', price: 50 }
    ],
    balance: 0
};

async function getDB() {
    try {
        const data = await redis.get('quest_db');
        if (!data) {
            await redis.set('quest_db', DEFAULT_DB);
            return DEFAULT_DB;
        }
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        console.error('Ошибка чтения из Redis:', e);
        return DEFAULT_DB;
    }
}

async function saveDB(db) {
    try {
        await redis.set('quest_db', db);
    } catch (e) {
        console.error('Ошибка записи в Redis:', e);
    }
}

const bot = new Telegraf(BOT_TOKEN);
app.use(express.json());

async function notifyAdmin(text) {
    try {
        await bot.telegram.sendMessage(ADMIN_ID, text);
    } catch (e) {
        console.error('Ошибка отправки уведомления:', e);
    }
}

app.get('/api/data', async (req, res) => {
    const db = await getDB();
    res.json(db);
});

app.post('/api/update-balance', async (req, res) => {
    const { balance } = req.body;
    const db = await getDB();
    if (balance !== undefined && !isNaN(balance)) {
        db.balance = Number(balance);
        await saveDB(db);
    }
    res.json({ success: true, balance: db.balance });
});

app.post('/api/add-task', async (req, res) => {
    const { title, reward } = req.body;
    const db = await getDB();
    if (title && reward) {
        db.tasks.push({ id: Date.now(), title, reward: Number(reward) });
        await saveDB(db);
    }
    res.json({ success: true, tasks: db.tasks });
});

app.post('/api/add-store', async (req, res) => {
    const { title, price } = req.body;
    const db = await getDB();
    if (title && price) {
        db.store.push({ id: Date.now(), title, price: Number(price) });
        await saveDB(db);
    }
    res.json({ success: true, store: db.store });
});

app.post('/api/delete-task', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    db.tasks = db.tasks.filter(t => t.id !== id);
    await saveDB(db);
    res.json({ success: true, tasks: db.tasks });
});

app.post('/api/delete-store', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    db.store = db.store.filter(s => s.id !== id);
    await saveDB(db);
    res.json({ success: true, store: db.store });
});

app.post('/api/complete-task', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const task = db.tasks.find(t => t.id === id);
    if (task) {
        db.balance += task.reward;
        db.tasks = db.tasks.filter(t => t.id !== id);
        await saveDB(db);
        await notifyAdmin(`✅ Задание выполнено!\n«${task.title}» (+${task.reward} 🪙)\nТекущий баланс: ${db.balance} 🪙`);
    }
    res.json({ success: true, balance: db.balance, tasks: db.tasks });
});

app.post('/api/buy-item', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const item = db.store.find(s => s.id === id);
    if (item && db.balance >= item.price) {
        db.balance -= item.price;
        db.store = db.store.filter(s => s.id !== id);
        await saveDB(db);
        await notifyAdmin(`🎁 Покупка в магазине!\n«${item.title}» (-${item.price} 🪙)\nОстаток баланса: ${db.balance} 🪙`);
        res.json({ success: true, balance: db.balance });
    } else {
        res.json({ success: false, message: 'Недостаточно монет!' });
    }
});

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body { font-family: sans-serif; background: #1c1c1e; color: #fff; padding: 15px; margin: 0; }
        .card { background: #2c2c2e; border-radius: 12px; padding: 15px; margin-bottom: 12px; }
        h2, h3 { margin-top: 0; }
        input, button { width: 100%; padding: 10px; margin-top: 8px; border-radius: 8px; border: none; box-sizing: border-box; }
        input { background: #3a3a3c; color: white; }
        button { background: #007aff; color: white; font-weight: bold; }
        button.secondary { background: #34c759; }
        button.danger { background: #ff3b30; }
        .item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3a3c; padding: 8px 0; }
        .badge { background: #ffd60a; color: #000; padding: 3px 8px; border-radius: 12px; font-weight: bold; }
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
        const isAdmin = (userId == ${ADMIN_ID});

        async function loadData() {
            const res = await fetch('/api/data');
            const data = await res.json();
            document.getElementById('balance').innerText = data.balance + ' 🪙';
            render(data);
        }

        function render(data) {
            const app = document.getElementById('app');
            if (isAdmin) {
                let tasksList = data.tasks.map(t => '<div class="item"><div>' + t.title + ' (+' + t.reward + ' 🪙)</div><button class="danger" style="width:auto;" onclick="deleteTask(' + t.id + ')">Удалить</button></div>').join('') || '<p>Заданий нет</p>';
                let storeList = data.store.map(s => '<div class="item"><div>' + s.title + ' (' + s.price + ' 🪙)</div><button class="danger" style="width:auto;" onclick="deleteStore(' + s.id + ')">Удалить</button></div>').join('') || '<p>Товаров нет</p>';

                app.innerHTML = '<div class="card"><h3>💰 Управление балансом</h3><input id="new-balance" type="number" placeholder="Новое количество монет" value="' + data.balance + '"><button class="secondary" onclick="updateBalance()">Изменить баланс</button></div>' +
                                '<div class="card"><h3>➕ Добавить квест</h3><input id="t-title" placeholder="Название"><input id="t-reward" type="number" placeholder="Награда"><button onclick="addTask()">Сохранить квест</button></div>' +
                                '<div class="card"><h3>📋 Активные квесты</h3>' + tasksList + '</div>' +
                                '<div class="card"><h3>➕ Добавить товар</h3><input id="s-title" placeholder="Название"><input id="s-price" type="number" placeholder="Цена"><button class="secondary" onclick="addStore()">Сохранить товар</button></div>' +
                                '<div class="card"><h3>🎁 Товары в магазине</h3>' + storeList + '</div>';
            } else {
                let tasksHtml = data.tasks.map(t => '<div class="item"><div>' + t.title + ' (+' + t.reward + ' 🪙)</div><button style="width:auto;" onclick="completeTask(' + t.id + ')">Сделано</button></div>').join('') || '<p>Квестов нет</p>';
                let storeHtml = data.store.map(s => '<div class="item"><div>' + s.title + ' (' + s.price + ' 🪙)</div><button class="secondary" style="width:auto;" onclick="buyItem(' + s.id + ')">Купить</button></div>').join('') || '<p>Магазин пуст</p>';

                app.innerHTML = '<div class="card"><h3>📋 Доступные квесты</h3>' + tasksHtml + '</div>' +
                                '<div class="card"><h3>🎁 Магазин наград</h3>' + storeHtml + '</div>';
            }
        }

        async function updateBalance() {
            const balance = document.getElementById('new-balance').value;
            if(balance === '') return;
            await fetch('/api/update-balance', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({balance}) });
            loadData();
        }

        async function addTask() {
            const title = document.getElementById('t-title').value;
            const reward = document.getElementById('t-reward').value;
            if(!title || !reward) return;
            await fetch('/api/add-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title, reward}) });
            loadData();
        }

        async function addStore() {
            const title = document.getElementById('s-title').value;
            const price = document.getElementById('s-price').value;
            if(!title || !price) return;
            await fetch('/api/add-store', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title, price}) });
            loadData();
        }

        async function deleteTask(id) {
            await fetch('/api/delete-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
            loadData();
        }

        async function deleteStore(id) {
            await fetch('/api/delete-store', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
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
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));

bot.start((ctx) => ctx.reply('Привет! Нажми на кнопку меню, чтобы открыть квесты'));
bot.launch();
