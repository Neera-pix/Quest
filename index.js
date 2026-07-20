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

// База по умолчанию с перенесёнными данными со скриншотов
const DEFAULT_DB = {
    tasks: [
        { id: 101, title: 'Без паразитов', desc: 'Провести целый день, не используя в речи слова-паразиты («типа», «как бы», «короче», «ну»).', reward: 30, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 102, title: 'Слово дня', desc: 'Узнать значение редкого/красивого слова (например, эрудиция, эмпатия, контекст, лаконичность) и уместно использовать его в диалоге со мной 3 раза за день.', reward: 25, isOneTime: false, isSpecial: false, diff: 1 },
        { id: 103, title: 'Мастер пересказа', desc: 'Посмотреть увлекательное видео или прочитать статью и за 2 минуты эмоционально и красиво пересказать мне суть.', reward: 30, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 104, title: 'Никаких матов', desc: 'Продержаться 24 часа без единого матерного слова (выражать эмоции только богатым литературным языком).', reward: 60, isOneTime: true, isSpecial: false, diff: 3 },
        { id: 105, title: 'Голосовое эссе', desc: 'Записать мне аудиосообщение на 2-3 минуты с размышлением на любую тему без пауз, мычания и заминок.', reward: 35, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 106, title: 'Адвокат дьявола', desc: 'Выбрать любую спорную тему и аргументированно защитить точку зрения, с которой сам изначально не согласен.', reward: 35, isOneTime: false, isSpecial: false, diff: 3 },
        { id: 107, title: 'Прочитать книгу', desc: 'Прочитать книгу (около 500 страниц).', reward: 650, isOneTime: false, isSpecial: false, diff: 4 },
        { id: 108, title: 'Логическая ловушка', desc: 'Узнать, что такое 2 любых логических когнитивных искажения (например, «ошибка выжившего» или «эффект Даннинга-Крюгера») и объяснить их мне простыми словами.', reward: 35, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 109, title: 'Без гаджетов', desc: 'Заниматься саморазвитием, чтением или размышлениями 2 часа без телефона и соцсетей.', reward: 45, isOneTime: false, isSpecial: false, diff: 3 },
        { id: 110, title: 'Факт дня', desc: 'Узнать 1 интересный исторический или научный факт и рассказать его мне при встрече.', reward: 15, isOneTime: false, isSpecial: false, diff: 1 },
        { id: 111, title: 'Анализ ошибки', desc: 'Вспомнить недавнюю неудачную ситуацию и написать 2 вывода: чему она научила и как поступить в следующий раз.', reward: 15, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 112, title: 'Оратор перед зеркалом', desc: 'Потренироваться 3 минуты говорить перед зеркалом на любую тему уверенно и с хорошей дикцией.', reward: 25, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 113, title: '3 "Почему"', desc: 'Встретив незнакомый термин, событие или факт в интернете, не пролистнуть, а разобраться в нем и найти ответы.', reward: 30, isOneTime: false, isSpecial: false, diff: 2 }
    ],
    store: [
        { id: 201, title: 'Массаж спины или ног', desc: '15 минут расслабляющего массажа.', price: 100, isOneTime: false, isSpecial: false, diff: 1 },
        { id: 202, title: 'Вкусняшка на выбор', desc: 'Вкусняшка на выбор вне плана.', price: 90, isOneTime: false, isSpecial: false, diff: 1 },
        { id: 203, title: 'Любое желание на выбор', desc: 'Любое желание в пределах разумного.', price: 1000, isOneTime: false, isSpecial: true, diff: 4 },
        { id: 204, title: 'Вход без очереди', desc: 'Выбор места или права решения в споре.', price: 400, isOneTime: false, isSpecial: false, diff: 3 },
        { id: 205, title: 'Право вето', desc: 'Заблокировать одну мою идею или предложение на сегодня.', price: 200, isOneTime: true, isSpecial: false, diff: 2 },
        { id: 206, title: 'Секретный подарок от меня', desc: 'Что-то особенное и неожиданное.', price: 550, isOneTime: true, isSpecial: true, diff: 3 },
        { id: 207, title: 'Супер-купон: День абсолютного релакса', desc: 'Полный чилл на весь день.', price: 700, isOneTime: true, isSpecial: true, diff: 4 },
        { id: 208, title: 'Задонатить 150 рублей', desc: 'Донат на твои нужды.', price: 350, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 209, title: 'Прокатиться на самокатах', desc: 'Совместная поездка на электросамокатах.', price: 400, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 210, title: 'Контроль маршрута', desc: 'Возможность полностью контролировать маршрут прогулки и мест досуга/кафе.', price: 550, isOneTime: false, isSpecial: false, diff: 3 },
        { id: 211, title: 'Отключение обидок', desc: 'И выебонов от меня на 24 часа.', price: 400, isOneTime: false, isSpecial: false, diff: 3 }
    ],
    inventory: [],
    balance: 0,
    level: 1,
    exp: 0
};

async function getDB() {
    try {
        const data = await redis.get('quest_db');
        return (!data) ? DEFAULT_DB : (typeof data === 'string' ? JSON.parse(data) : data);
    } catch (e) {
        console.error('Ошибка Redis:', e);
        return DEFAULT_DB;
    }
}

async function saveDB(db) { await redis.set('quest_db', db); }

const bot = new Telegraf(BOT_TOKEN);
app.use(express.json());

async function notifyAdmin(text) {
    try { await bot.telegram.sendMessage(ADMIN_ID, text); } 
    catch (e) { console.error('Ошибка Telegram:', e); }
}

app.get('/api/data', async (req, res) => { res.json(await getDB()); });

app.post('/api/update-stats', async (req, res) => {
    const { balance, level, exp } = req.body;
    const db = await getDB();
    if (balance !== undefined) db.balance = Number(balance);
    if (level !== undefined) db.level = Number(level);
    if (exp !== undefined) db.exp = Number(exp);
    await saveDB(db);
    res.json(db);
});

app.post('/api/save-item', async (req, res) => {
    const { type, id, title, desc, value, isOneTime, isSpecial, diff } = req.body;
    const db = await getDB();
    const list = type === 'task' ? db.tasks : db.store;
    
    let item = list.find(i => i.id == id);
    if (item) {
        // Редактирование
        item.title = title; item.desc = desc; item.isOneTime = isOneTime; item.isSpecial = isSpecial; item.diff = Number(diff);
        if (type === 'task') item.reward = Number(value); else item.price = Number(value);
    } else {
        // Создание
        const newItem = { id: Date.now(), title, desc, isOneTime, isSpecial, diff: Number(diff) };
        if (type === 'task') newItem.reward = Number(value); else newItem.price = Number(value);
        list.push(newItem);
    }
    await saveDB(db);
    res.json(db);
});

app.post('/api/delete-item', async (req, res) => {
    const { type, id } = req.body;
    const db = await getDB();
    if (type === 'task') db.tasks = db.tasks.filter(t => t.id != id);
    else if (type === 'store') db.store = db.store.filter(s => s.id != id);
    else if (type === 'inventory') db.inventory = db.inventory.filter(i => i.invId != id);
    await saveDB(db);
    res.json(db);
});

app.post('/api/complete-task', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const task = db.tasks.find(t => t.id == id);
    if (task) {
        db.balance += task.reward;
        db.exp += task.reward; // Опыт = заработанные монеты
        if (task.isOneTime) db.tasks = db.tasks.filter(t => t.id != id);
        await saveDB(db);
        await notifyAdmin(`✅ Задание выполнено!\n«${task.title}»\n+${task.reward} 🪙 | +${task.reward} EXP\nТекущий баланс: ${db.balance} 🪙`);
    }
    res.json(db);
});

app.post('/api/buy-item', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const item = db.store.find(s => s.id == id);
    if (item && db.balance >= item.price) {
        db.balance -= item.price;
        db.inventory.push({ invId: Date.now(), title: item.title, desc: item.desc, diff: item.diff });
        if (item.isOneTime) db.store = db.store.filter(s => s.id != id);
        await saveDB(db);
        await notifyAdmin(`🛍 Куплен товар!\n«${item.title}» отправлен в инвентарь!\n-${item.price} 🪙\nОстаток: ${db.balance} 🪙`);
        res.json({ success: true, db });
    } else {
        res.json({ success: false, message: 'Недостаточно монет!' });
    }
});

app.post('/api/use-inventory', async (req, res) => {
    const { invId } = req.body;
    const db = await getDB();
    const item = db.inventory.find(i => i.invId == invId);
    if (item) {
        db.inventory = db.inventory.filter(i => i.invId != invId);
        await saveDB(db);
        await notifyAdmin(`🔥 ИСПОЛЬЗОВАН ПРЕДМЕТ ИЗ ИНВЕНТАРЯ 🔥\n«${item.title}»\nПора действовать!`);
    }
    res.json(db);
});

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        :root { --bg: #121214; --card: #1e1e22; --accent: #6b4cff; --text: #f0f0f0; --sub: #8e8e93; 
                --d1: #34c759; --d2: #ffcc00; --d3: #ff3b30; --d4: #bf5af2; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 0; padding-bottom: 80px;}
        * { box-sizing: border-box; }
        
        /* Шапка RPG */
        .rpg-header { background: linear-gradient(135deg, #2a2a32, #1a1a20); padding: 15px; text-align: center; border-bottom: 2px solid var(--accent); box-shadow: 0 4px 15px rgba(0,0,0,0.5);}
        .rpg-stats { display: flex; justify-content: space-around; font-size: 14px; font-weight: bold; margin-bottom: 8px;}
        .rpg-stats span { background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 12px; }
        .exp-bar-bg { width: 100%; height: 10px; background: #333; border-radius: 5px; overflow: hidden; position: relative;}
        .exp-bar-fill { height: 100%; background: linear-gradient(90deg, #6b4cff, #a288ff); width: 50%; transition: 0.3s; }
        .exp-text { font-size: 11px; color: #aaa; margin-top: 4px; }

        /* Вкладки (Скроллируемые) */
        .tabs-wrapper { display: flex; overflow-x: auto; padding: 10px; gap: 8px; background: var(--bg); position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #333;}
        .tabs-wrapper::-webkit-scrollbar { display: none; }
        .tab-btn { flex-shrink: 0; padding: 10px 16px; background: var(--card); color: var(--sub); font-weight: bold; border-radius: 20px; border: 1px solid #333; font-size: 14px; transition: 0.2s;}
        .tab-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

        .container { padding: 15px; }
        .card { background: var(--card); border-radius: 14px; padding: 15px; margin-bottom: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }
        h3 { margin: 0 0 10px 0; font-size: 16px; display: flex; justify-content: space-between; align-items: center;}
        
        input, select, textarea { width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #444; background: #2a2a2e; color: white; font-family: inherit;}
        button { width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; font-size: 14px; color: white; cursor: pointer; transition: 0.2s; background: var(--accent); }
        button:active { transform: scale(0.98); }
        button.action { background: #34c759; }
        button.danger { background: #ff3b30; }
        button.small { width: auto; padding: 8px 12px; font-size: 12px; margin-left: 5px;}

        /* Аккордеон и элементы */
        .item-row { border: 1px solid #333; border-radius: 12px; margin-bottom: 10px; overflow: hidden; background: #1a1a1e; }
        .item-header { padding: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
        .item-title-block { display: flex; flex-direction: column; gap: 4px; flex-grow:1; }
        .item-title { font-weight: bold; font-size: 15px; display: flex; align-items: center; gap: 6px;}
        .item-tags { display: flex; gap: 5px; font-size: 10px; }
        .tag { padding: 2px 6px; border-radius: 6px; background: #333; color: #ccc; }
        .diff-1 { color: var(--d1); } .diff-2 { color: var(--d2); } .diff-3 { color: var(--d3); } .diff-4 { color: var(--d4); text-shadow: 0 0 5px var(--d4);}
        .item-val { font-weight: 900; font-size: 16px; color: #ffd60a; white-space: nowrap; margin-left: 10px;}
        
        .item-body { padding: 0 12px 12px 12px; display: none; border-top: 1px dashed #333; margin-top: 5px; padding-top: 10px; color: #bbb; font-size: 14px; line-height: 1.4;}
        .item-body.open { display: block; }
        .item-actions { display: flex; gap: 8px; margin-top: 12px; }

        /* Админские формы */
        .admin-edit-form { background: #222; padding: 10px; border-radius: 8px; margin-top: 10px; border: 1px solid #444;}
        .checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 14px; color: #ccc;}
        .checkbox-row input { width: 20px; height: 20px; margin: 0; }
    </style>
</head>
<body>
    <div class="rpg-header" id="rpg-header">
        <div class="rpg-stats">
            <span id="ui-level">Уровень 1</span>
            <span id="ui-balance">💰 0</span>
        </div>
        <div class="exp-bar-bg"><div class="exp-bar-fill" id="ui-exp-fill"></div></div>
        <div class="exp-text" id="ui-exp-text">EXP: 0</div>
    </div>

    <div class="tabs-wrapper">
        <div class="tab-btn active" onclick="showTab('tasks')">📋 Квесты</div>
        <div class="tab-btn" onclick="showTab('tasks-sp')">🌟 Особые Квесты</div>
        <div class="tab-btn" onclick="showTab('store')">🎁 Магазин</div>
        <div class="tab-btn" onclick="showTab('store-sp')">💎 Особые Товары</div>
        <div class="tab-btn" onclick="showTab('inv')">🎒 Инвентарь</div>
        <div class="tab-btn admin-only" onclick="showTab('admin')" style="display:none;">⚙️ Админка</div>
    </div>

    <div class="container" id="content"></div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const isAdmin = ((tg.initDataUnsafe?.user?.id || 0) == ${ADMIN_ID});
        if(isAdmin) document.querySelector('.admin-only').style.display = 'block';

        let g_db = { tasks: [], store: [], inventory: [], balance: 0, level: 1, exp: 0 };
        let currentTab = 'tasks';

        const diffColors = { 1: '🟢 Легко', 2: '🟡 Средне', 3: '🔴 Сложно', 4: '🟣 Ультра' };

        async function init() {
            const res = await fetch('/api/data');
            g_db = await res.json();
            updateHeader();
            showTab(currentTab);
        }

        function updateHeader() {
            document.getElementById('ui-level').innerText = 'Уровень ' + g_db.level;
            document.getElementById('ui-balance').innerText = '💰 ' + g_db.balance;
            document.getElementById('ui-exp-text').innerText = 'Общий EXP: ' + g_db.exp;
            // Простейшая визуализация (допустим каждый уровень это +1000 опыта для визуала)
            let fill = (g_db.exp % 1000) / 10; 
            document.getElementById('ui-exp-fill').style.width = fill + '%';
        }

        function toggleDesc(id) {
            const el = document.getElementById(id);
            if(el) el.classList.toggle('open');
        }

        function showTab(tab) {
            currentTab = tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            event.currentTarget?.classList?.add('active');

            const c = document.getElementById('content');
            let html = '';

            if (tab === 'tasks' || tab === 'tasks-sp') {
                const isSp = (tab === 'tasks-sp');
                const list = g_db.tasks.filter(t => t.isSpecial === isSp);
                html += list.map(t => renderItem(t, 'task')).join('') || '<p>Тут пока пусто.</p>';
            } 
            else if (tab === 'store' || tab === 'store-sp') {
                const isSp = (tab === 'store-sp');
                const list = g_db.store.filter(s => s.isSpecial === isSp);
                html += list.map(s => renderItem(s, 'store')).join('') || '<p>Тут пока пусто.</p>';
            }
            else if (tab === 'inv') {
                html += g_db.inventory.map(i => renderInvItem(i)).join('') || '<p>Инвентарь пуст.</p>';
            }
            else if (tab === 'admin' && isAdmin) {
                html += \`
                    <div class="card">
                        <h3>🛠 Добавить Квест/Товар</h3>
                        <select id="a-type"><option value="task">Квест</option><option value="store">Товар</option></select>
                        <input id="a-title" placeholder="Название">
                        <textarea id="a-desc" placeholder="Описание" rows="2"></textarea>
                        <input id="a-val" type="number" placeholder="Награда / Цена">
                        <select id="a-diff">
                            <option value="1">Сложность: Легко (1)</option>
                            <option value="2" selected>Сложность: Средне (2)</option>
                            <option value="3">Сложность: Сложно (3)</option>
                            <option value="4">Сложность: Ультра (4)</option>
                        </select>
                        <label class="checkbox-row"><input type="checkbox" id="a-onetime"> Одноразовое</label>
                        <label class="checkbox-row"><input type="checkbox" id="a-special"> Во вкладку "Особое"</label>
                        <button onclick="saveItem('new')">Добавить</button>
                    </div>
                    <div class="card">
                        <h3>📊 Статистика Игрока</h3>
                        <label>Монеты (Баланс):</label>
                        <input id="st-bal" type="number" value="\${g_db.balance}">
                        <label>Уровень:</label>
                        <input id="st-lvl" type="number" value="\${g_db.level}">
                        <label>Общий Опыт:</label>
                        <input id="st-exp" type="number" value="\${g_db.exp}">
                        <button class="secondary" onclick="updateStats()">Сохранить статы</button>
                    </div>
                \`;
            }
            c.innerHTML = html;
        }

        function renderItem(item, type) {
            const valLabel = type === 'task' ? '+' + item.reward : '-' + item.price;
            const diffClass = 'diff-' + item.diff;
            const uid = type + '-' + item.id;
            
            let actions = '';
            if (!isAdmin) {
                if (type === 'task') actions = \`<button class="action" onclick="completeTask(\${item.id})">Сделано</button>\`;
                else actions = \`<button class="action" onclick="buyItem(\${item.id})">Купить</button>\`;
            } else {
                actions = \`
                    <button class="small" onclick="toggleEdit('\${uid}')">Редактировать</button>
                    <button class="danger small" onclick="delItem('\${type}', \${item.id})">Удалить</button>
                \`;
            }

            let editForm = isAdmin ? \`
                <div class="admin-edit-form" id="edit-\${uid}" style="display:none;">
                    <input id="et-\${uid}" value="\${item.title}">
                    <textarea id="ed-\${uid}" rows="2">\${item.desc}</textarea>
                    <input id="ev-\${uid}" type="number" value="\${type==='task'?item.reward:item.price}">
                    <select id="edf-\${uid}">
                        <option value="1" \${item.diff==1?'selected':''}>Легко</option>
                        <option value="2" \${item.diff==2?'selected':''}>Средне</option>
                        <option value="3" \${item.diff==3?'selected':''}>Сложно</option>
                        <option value="4" \${item.diff==4?'selected':''}>Ультра</option>
                    </select>
                    <label class="checkbox-row"><input type="checkbox" id="eo-\${uid}" \${item.isOneTime?'checked':''}> Одноразовое</label>
                    <label class="checkbox-row"><input type="checkbox" id="es-\${uid}" \${item.isSpecial?'checked':''}> Особое (🌟/💎)</label>
                    <button onclick="saveItem('\${type}', \${item.id})">Сохранить</button>
                </div>
            \` : '';

            return \`
                <div class="item-row">
                    <div class="item-header" onclick="toggleDesc('desc-\${uid}')">
                        <div class="item-title-block">
                            <div class="item-title">
                                <span class="\${diffClass}">●</span> \${item.title}
                            </div>
                            <div class="item-tags">
                                <span class="tag">\${diffColors[item.diff].split(' ')[1]}</span>
                                \${item.isOneTime ? '<span class="tag">1 раз</span>' : '<span class="tag">Многоразово</span>'}
                            </div>
                        </div>
                        <div class="item-val">\${valLabel} 🪙</div>
                    </div>
                    <div class="item-body" id="desc-\${uid}">
                        \${item.desc}
                        <div class="item-actions">\${actions}</div>
                        \${editForm}
                    </div>
                </div>
            \`;
        }

        function renderInvItem(item) {
            let actionBtn = isAdmin 
                ? \`<button class="danger small" onclick="delItem('inventory', \${item.invId})">Удалить из инвентаря</button>\`
                : \`<button class="action" onclick="useInv(\${item.invId})">Использовать</button>\`;
                
            return \`
                <div class="item-row">
                    <div class="item-header" onclick="toggleDesc('inv-\${item.invId}')">
                        <div class="item-title-block">
                            <div class="item-title"><span class="diff-\${item.diff}">●</span> \${item.title}</div>
                        </div>
                    </div>
                    <div class="item-body" id="inv-\${item.invId}">
                        \${item.desc || 'Без описания'}
                        <div class="item-actions">\${actionBtn}</div>
                    </div>
                </div>
            \`;
        }

        function toggleEdit(uid) {
            const el = document.getElementById('edit-' + uid);
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        async function updateStats() {
            const b = document.getElementById('st-bal').value;
            const l = document.getElementById('st-lvl').value;
            const e = document.getElementById('st-exp').value;
            const res = await fetch('/api/update-stats', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({balance:b, level:l, exp:e}) });
            g_db = await res.json();
            updateHeader(); alert('Сохранено!');
        }

        async function saveItem(type, id = null) {
            let data = {};
            if (type === 'new') {
                data = {
                    type: document.getElementById('a-type').value,
                    title: document.getElementById('a-title').value,
                    desc: document.getElementById('a-desc').value,
                    value: document.getElementById('a-val').value,
                    diff: document.getElementById('a-diff').value,
                    isOneTime: document.getElementById('a-onetime').checked,
                    isSpecial: document.getElementById('a-special').checked
                };
            } else {
                const uid = type + '-' + id;
                data = {
                    type: type, id: id,
                    title: document.getElementById('et-' + uid).value,
                    desc: document.getElementById('ed-' + uid).value,
                    value: document.getElementById('ev-' + uid).value,
                    diff: document.getElementById('edf-' + uid).value,
                    isOneTime: document.getElementById('eo-' + uid).checked,
                    isSpecial: document.getElementById('es-' + uid).checked
                };
            }
            
            if(!data.title || !data.value) return alert('Введите название и значение!');
            
            const res = await fetch('/api/save-item', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
            g_db = await res.json();
            if (type === 'new') {
                document.getElementById('a-title').value = '';
                document.getElementById('a-desc').value = '';
                document.getElementById('a-val').value = '';
                alert('Успешно добавлено!');
            }
            showTab(currentTab);
        }

        async function delItem(type, id) {
            if(!confirm('Точно удалить?')) return;
            const res = await fetch('/api/delete-item', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({type, id}) });
            g_db = await res.json();
            showTab(currentTab);
        }

        async function completeTask(id) {
            const res = await fetch('/api/complete-task', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
            g_db = await res.json();
            updateHeader(); showTab(currentTab);
        }

        async function buyItem(id) {
            const res = await fetch('/api/buy-item', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
            const data = await res.json();
            if(!data.success) { alert(data.message); return; }
            g_db = data.db;
            updateHeader(); showTab(currentTab); alert('Предмет добавлен в Инвентарь!');
        }

        async function useInv(invId) {
            if(!confirm('Использовать предмет прямо сейчас?')) return;
            const res = await fetch('/api/use-inventory', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({invId}) });
            g_db = await res.json();
            showTab(currentTab); alert('Запрос отправлен!');
        }

        init();
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));

bot.start((ctx) => ctx.reply('Привет! Нажми на кнопку меню, чтобы открыть квесты'));
bot.launch();
