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

// Новый ключ базы, чтобы с нуля загрузить все твои данные со скриншотов
const DB_KEY = 'quest_db_v2'; 

const DEFAULT_DB = {
    tasks: [
        { id: 1, title: 'Без паразитов', description: 'Провести целый день, не используя в речи слова-паразиты («типа», «как бы», «короче», «ну»)', reward: 30, isOneTime: false, isSpecial: false },
        { id: 2, title: 'Слово дня', description: 'Узнать значение редкого/красивого слова (например, эрудиция, эмпатия, контекст, лаконичность) и уместно использовать его в диалоге со мной 3 раза за день.', reward: 25, isOneTime: false, isSpecial: false },
        { id: 3, title: 'Мастер пересказа', description: 'Посмотреть увлекательное видео или прочитать статью и за 2 минуты эмоционально и красиво пересказать мне суть.', reward: 30, isOneTime: false, isSpecial: false },
        { id: 4, title: 'Никаких матов', description: 'Продержаться 24 часа без единого матерного слова (выражать эмоции только богатым литературным языком).', reward: 60, isOneTime: true, isSpecial: false },
        { id: 5, title: 'Голосовое эссе', description: 'Записать мне аудиосообщение на 2-3 минуты с размышлением на любую тему без пауз, мычания и заминок.', reward: 35, isOneTime: false, isSpecial: false },
        { id: 6, title: 'Адвокат дьявола', description: 'Выбрать любую спорную тему и аргументированно защитить точку зрения, с которой сам изначально не согласен.', reward: 35, isOneTime: false, isSpecial: true },
        { id: 7, title: 'Прочитать книгу', description: '(около 500 страниц)', reward: 650, isOneTime: false, isSpecial: true },
        { id: 8, title: 'Логическая ловушка', description: 'Узнать, что такое 2 любых логических когнитивных искажения (например, «ошибка выжившего» или «эффект Даннинга-Крюгера») и объяснить их мне простыми словами.', reward: 35, isOneTime: false, isSpecial: false },
        { id: 9, title: 'Без гаджетов', description: 'Заниматься саморазвитием, чтением или размышлениями 2 часа без телефона и соцсетей.', reward: 45, isOneTime: false, isSpecial: false },
        { id: 10, title: 'Факт дня', description: 'Узнать 1 интересный исторический или научный факт и рассказать его мне при встрече.', reward: 15, isOneTime: false, isSpecial: false },
        { id: 11, title: 'Анализ ошибки', description: 'Вспомнить недавнюю неудачную ситуацию и написать 2 вывода: чему она научила и как поступить в следующий раз.', reward: 15, isOneTime: false, isSpecial: false },
        { id: 12, title: 'Оратор перед зеркалом', description: 'Потренироваться 3 минуты говорить перед зеркалом на любую тему уверенно и с хорошей дикцией.', reward: 25, isOneTime: false, isSpecial: false },
        { id: 13, title: '3 "Почему"', description: 'Встретив незнакомый термин, событие или факт в интернете, не пролистнуть, а разобраться в нем и найти ответы.', reward: 30, isOneTime: false, isSpecial: false }
    ],
    store: [
        { id: 101, title: 'Массаж спины или ног', description: '(15 минут)', price: 100, isOneTime: false, isSpecial: false },
        { id: 102, title: 'Вкусняшка на выбор вне плана', description: 'Любая вкусность, которую захочется', price: 90, isOneTime: false, isSpecial: false },
        { id: 103, title: 'Любое желание на выбор', description: '(в пределах разумного)', price: 1000, isOneTime: false, isSpecial: true },
        { id: 104, title: 'Вход без очереди', description: '(выбор места или права решения в споре)', price: 400, isOneTime: false, isSpecial: true },
        { id: 105, title: 'Право вето', description: 'Заблокировать одну мою идею или предложение на сегодня.', price: 200, isOneTime: true, isSpecial: false },
        { id: 106, title: 'Секретный подарок от меня', description: 'Что-то приятное и неожиданное', price: 550, isOneTime: true, isSpecial: true },
        { id: 107, title: 'Супер-купон: День абсолютного релакса', description: 'Никаких дел, полное расслабление', price: 700, isOneTime: true, isSpecial: true },
        { id: 108, title: 'Задонатить 150 рублей', description: 'На любые мелкие хотелки', price: 350, isOneTime: false, isSpecial: false },
        { id: 109, title: 'Прокатиться на самокатах', description: 'Совместная поездка с ветерком', price: 400, isOneTime: false, isSpecial: false },
        { id: 110, title: 'Полный контроль маршрута', description: 'Возможность полностью контролировать маршрут прогулки и мест досуга/кафе.', price: 550, isOneTime: false, isSpecial: true },
        { id: 111, title: 'Отключение обидок и выебонов', description: 'От меня на 24 часа. Абсолютное спокойствие!', price: 400, isOneTime: false, isSpecial: true }
    ],
    balance: 0
};

async function getDB() {
    try {
        const data = await redis.get(DB_KEY);
        if (!data) {
            await redis.set(DB_KEY, DEFAULT_DB);
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
        await redis.set(DB_KEY, db);
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

app.post('/api/add-item', async (req, res) => {
    const { type, title, description, value, isOneTime, isSpecial } = req.body;
    const db = await getDB();
    const newItem = {
        id: Date.now(),
        title,
        description: description || '',
        isOneTime: Boolean(isOneTime),
        isSpecial: Boolean(isSpecial)
    };
    
    if (type === 'task') {
        newItem.reward = Number(value);
        db.tasks.push(newItem);
    } else {
        newItem.price = Number(value);
        db.store.push(newItem);
    }
    await saveDB(db);
    res.json({ success: true, db });
});

app.post('/api/edit-item', async (req, res) => {
    const { type, id, title, description, value, isOneTime, isSpecial } = req.body;
    const db = await getDB();
    const arr = type === 'task' ? db.tasks : db.store;
    const itemIndex = arr.findIndex(i => i.id === id);
    
    if (itemIndex !== -1) {
        arr[itemIndex].title = title;
        arr[itemIndex].description = description || '';
        arr[itemIndex].isOneTime = Boolean(isOneTime);
        arr[itemIndex].isSpecial = Boolean(isSpecial);
        
        if (type === 'task') arr[itemIndex].reward = Number(value);
        else arr[itemIndex].price = Number(value);
        
        await saveDB(db);
    }
    res.json({ success: true, db });
});

app.post('/api/delete-item', async (req, res) => {
    const { type, id } = req.body;
    const db = await getDB();
    if (type === 'task') db.tasks = db.tasks.filter(t => t.id !== id);
    else db.store = db.store.filter(s => s.id !== id);
    await saveDB(db);
    res.json({ success: true, db });
});

app.post('/api/complete-task', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const task = db.tasks.find(t => t.id === id);
    if (task) {
        db.balance += task.reward;
        if (task.isOneTime) db.tasks = db.tasks.filter(t => t.id !== id);
        await saveDB(db);
        await notifyAdmin(`✅ Задание выполнено!\n«${task.title}» (+${task.reward} 🪙)\nТекущий баланс: ${db.balance} 🪙`);
    }
    res.json({ success: true, db });
});

app.post('/api/buy-item', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const item = db.store.find(s => s.id === id);
    if (item && db.balance >= item.price) {
        db.balance -= item.price;
        if (item.isOneTime) db.store = db.store.filter(s => s.id !== id);
        await saveDB(db);
        await notifyAdmin(`🎁 Покупка в магазине!\n«${item.title}» (-${item.price} 🪙)\nОстаток баланса: ${db.balance} 🪙`);
        res.json({ success: true, db });
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        :root {
            --bg: #121214; --card: #1c1c1e; --primary: #007aff; --danger: #ff453a; 
            --success: #32d74b; --text: #f5f5f7; --text-muted: #8e8e93;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 15px; padding-bottom: 90px; }
        .balance-card { background: linear-gradient(135deg, #2c2c2e, #1c1c1e); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .balance-value { font-size: 32px; font-weight: 800; color: #ffd60a; margin: 10px 0; }
        
        .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
        .tab-btn { padding: 12px 5px; background: #2c2c2e; color: var(--text-muted); font-size: 14px; font-weight: 600; border-radius: 12px; border: none; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .tab-btn.active { background: var(--primary); color: #fff; box-shadow: 0 4px 10px rgba(0, 122, 255, 0.3); }

        .card { background: var(--card); border-radius: 16px; padding: 16px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .card-title { margin-top: 0; margin-bottom: 15px; font-size: 18px; display: flex; align-items: center; gap: 8px; }
        
        .list-item { border-bottom: 1px solid #2c2c2e; padding: 16px 0; }
        .list-item:last-child { border-bottom: none; padding-bottom: 0; }
        
        .item-header { display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; }
        .item-info { flex: 1; padding-right: 10px; }
        .item-title { font-size: 16px; font-weight: 600; color: var(--text); line-height: 1.3; }
        .item-value { font-weight: 800; font-size: 15px; color: #ffd60a; white-space: nowrap; margin-top: 4px; }
        
        .tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .tag { font-size: 11px; padding: 3px 8px; border-radius: 8px; background: #3a3a3c; color: #d1d1d6; font-weight: 600; }
        .tag.special { background: rgba(255, 69, 58, 0.15); color: var(--danger); }
        
        .item-desc { font-size: 14px; color: var(--text-muted); margin-top: 10px; padding-top: 10px; border-top: 1px dashed #3a3a3c; display: none; line-height: 1.4; animation: fadeIn 0.2s; }
        .item-desc.show { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        .actions { display: flex; gap: 8px; margin-top: 12px; }
        button.action-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; color: white; }
        .btn-green { background: var(--success); }
        .btn-blue { background: var(--primary); }
        .btn-red { background: rgba(255, 69, 58, 0.15); color: var(--danger) !important; }
        .btn-gray { background: #3a3a3c; }

        input, textarea { width: 100%; padding: 14px; margin-top: 8px; border-radius: 12px; border: 1px solid #3a3a3c; background: #2c2c2e; color: white; box-sizing: border-box; font-family: inherit; font-size: 15px; }
        textarea { resize: vertical; min-height: 80px; }
        .checkbox-label { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 15px; color: #ccc; cursor: pointer; padding: 5px 0; }
        .checkbox-label input { width: 20px; height: 20px; margin: 0; accent-color: var(--primary); }

        .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(5px); }
        .modal.show { display: flex; animation: fadeModal 0.2s; }
        .modal-content { background: var(--card); border-radius: 20px; padding: 24px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        @keyframes fadeModal { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    </style>
</head>
<body>
    <div class="balance-card">
        <div style="color: var(--text-muted); font-size: 14px; font-weight: 600; text-transform: uppercase;">Мой баланс</div>
        <div class="balance-value" id="balance">0 🪙</div>
    </div>

    <div class="tabs">
        <button id="btn-tasks" class="tab-btn active" onclick="setTab('tasks')">📋 Обычные квесты</button>
        <button id="btn-tasks_special" class="tab-btn" onclick="setTab('tasks_special')">🌟 Особые квесты</button>
        <button id="btn-store" class="tab-btn" onclick="setTab('store')">🎁 Обычный маркет</button>
        <button id="btn-store_special" class="tab-btn" onclick="setTab('store_special')">💎 Особый маркет</button>
    </div>

    <div id="content"></div>

    <!-- Модалка добавления/редактирования -->
    <div id="item-modal" class="modal">
        <div class="modal-content">
            <h3 id="modal-title" style="margin-top:0;">Настройка</h3>
            <input type="hidden" id="modal-id">
            <input type="hidden" id="modal-type">
            <input id="modal-name" placeholder="Название">
            <textarea id="modal-desc" placeholder="Описание (развернётся по клику)"></textarea>
            <input id="modal-value" type="number" placeholder="Сумма монет">
            
            <label class="checkbox-label"><input id="modal-onetime" type="checkbox"> Одноразовое</label>
            <label class="checkbox-label"><input id="modal-special" type="checkbox"> Особая категория</label>
            
            <div class="actions" style="margin-top: 20px;">
                <button class="action-btn btn-blue" onclick="saveItem()">Сохранить</button>
                <button class="action-btn btn-gray" onclick="closeModal()">Отмена</button>
            </div>
        </div>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const userId = tg.initDataUnsafe?.user?.id || 0;
        const isAdmin = (userId == ${ADMIN_ID});
        
        let globalData = { tasks: [], store: [], balance: 0 };
        let currentTab = 'tasks';

        async function loadData() {
            const res = await fetch('/api/data');
            globalData = await res.json();
            document.getElementById('balance').innerText = globalData.balance + ' 🪙';
            render();
        }

        function setTab(tab) {
            currentTab = tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + tab).classList.add('active');
            render();
        }

        function toggleDesc(id) {
            const desc = document.getElementById('desc-' + id);
            if (desc) desc.classList.toggle('show');
        }

        function render() {
            const content = document.getElementById('content');
            let html = '';

            // Админское управление балансом на вкладке магазина
            if (isAdmin && currentTab.startsWith('store')) {
                html += '<div class="card"><h3 class="card-title">💰 Управление балансом</h3>' +
                        '<input id="new-balance" type="number" value="' + globalData.balance + '">' +
                        '<button class="action-btn btn-blue" style="width:100%; margin-top:10px;" onclick="updateBalance()">Изменить баланс</button></div>';
            }

            // Кнопка добавления для админа
            if (isAdmin) {
                const isTask = currentTab.startsWith('tasks');
                const isSpec = currentTab.endsWith('special');
                html += '<div class="card"><button class="action-btn btn-gray" style="width:100%; padding:14px;" onclick="openModal(\\'' + (isTask ? 'task' : 'store') + '\\', null, ' + isSpec + ')">➕ Добавить новую запись</button></div>';
            }

            // Рендер списка
            const isTasks = currentTab.startsWith('tasks');
            const isSpecial = currentTab.endsWith('special');
            const items = isTasks ? globalData.tasks : globalData.store;
            const filteredItems = items.filter(i => Boolean(i.isSpecial) === isSpecial);

            if (filteredItems.length === 0) {
                html += '<div class="card" style="text-align:center; padding:30px 10px; color:var(--text-muted);">Здесь пока ничего нет 🤷‍♂️</div>';
            } else {
                let listHtml = filteredItems.map(item => {
                    const valueStr = isTasks ? '+' + item.reward : '-' + item.price;
                    const btnHtml = isAdmin 
                        ? '<button class="action-btn btn-gray" onclick="openModal(\\'' + (isTasks ? 'task' : 'store') + '\\', ' + item.id + ')">✏️ Изменить</button>' +
                          '<button class="action-btn btn-red" onclick="deleteItem(\\'' + (isTasks ? 'task' : 'store') + '\\', ' + item.id + ')">🗑 Удалить</button>'
                        : (isTasks 
                            ? '<button class="action-btn btn-green" onclick="completeTask(' + item.id + ')">✅ Выполнено</button>' 
                            : '<button class="action-btn btn-blue" onclick="buyItem(' + item.id + ')">🛍 Купить</button>');

                    return '<div class="list-item">' +
                           '<div class="item-header" onclick="toggleDesc(' + item.id + ')">' +
                           '<div class="item-info"><div class="item-title">' + item.title + '</div>' +
                           '<div class="tags">' +
                           '<span class="tag">' + (item.isOneTime ? 'Одноразовое' : 'Многоразовое') + '</span>' +
                           (item.isSpecial ? '<span class="tag special">Особое</span>' : '') +
                           '</div></div>' +
                           '<div class="item-value">' + valueStr + ' 🪙</div></div>' +
                           (item.description ? '<div id="desc-' + item.id + '" class="item-desc">' + item.description + '</div>' : '') +
                           '<div class="actions">' + btnHtml + '</div></div>';
                }).join('');
                
                html += '<div class="card">' + listHtml + '</div>';
            }
            content.innerHTML = html;
        }

        // Логика модалки
        function openModal(type, id = null, forceSpecial = false) {
            document.getElementById('modal-type').value = type;
            document.getElementById('modal-id').value = id || '';
            document.getElementById('modal-title').innerText = id ? 'Редактирование' : 'Создание';

            if (id) {
                const arr = type === 'task' ? globalData.tasks : globalData.store;
                const item = arr.find(i => i.id === id);
                document.getElementById('modal-name').value = item.title;
                document.getElementById('modal-desc').value = item.description || '';
                document.getElementById('modal-value').value = type === 'task' ? item.reward : item.price;
                document.getElementById('modal-onetime').checked = item.isOneTime;
                document.getElementById('modal-special').checked = item.isSpecial;
            } else {
                document.getElementById('modal-name').value = '';
                document.getElementById('modal-desc').value = '';
                document.getElementById('modal-value').value = '';
                document.getElementById('modal-onetime').checked = false;
                document.getElementById('modal-special').checked = forceSpecial;
            }
            document.getElementById('item-modal').classList.add('show');
        }

        function closeModal() {
            document.getElementById('item-modal').classList.remove('show');
        }

        async function saveItem() {
            const type = document.getElementById('modal-type').value;
            const id = document.getElementById('modal-id').value;
            const title = document.getElementById('modal-name').value;
            const description = document.getElementById('modal-desc').value;
            const value = document.getElementById('modal-value').value;
            const isOneTime = document.getElementById('modal-onetime').checked;
            const isSpecial = document.getElementById('modal-special').checked;

            if (!title || !value) return alert('Заполни название и сумму!');

            const endpoint = id ? '/api/edit-item' : '/api/add-item';
            const payload = { type, title, description, value, isOneTime, isSpecial };
            if (id) payload.id = Number(id);

            const res = await fetch(endpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            const data = await res.json();
            if(data.success) {
                globalData = data.db;
                document.getElementById('balance').innerText = globalData.balance + ' 🪙';
                closeModal();
                render();
            }
        }

        async function updateBalance() {
            const balance = document.getElementById('new-balance').value;
            if(balance === '') return;
            await fetch('/api/update-balance', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({balance}) });
            loadData();
        }

        async function deleteItem(type, id) {
            if(!confirm('Точно удалить?')) return;
            const res = await fetch('/api/delete-item', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, id}) });
            const data = await res.json();
            if(data.success) { globalData = data.db; render(); }
        }

        async function completeTask(id) {
            const res = await fetch('/api/complete-task', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
            const data = await res.json();
            if(data.success) { 
                globalData = data.db; 
                document.getElementById('balance').innerText = globalData.balance + ' 🪙';
                render(); 
            }
        }

        async function buyItem(id) {
            const res = await fetch('/api/buy-item', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) });
            const data = await res.json();
            if(!data.success) alert(data.message);
            else { 
                globalData = data.db; 
                document.getElementById('balance').innerText = globalData.balance + ' 🪙';
                render(); 
            }
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
