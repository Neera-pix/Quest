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

const EXP_MAP = { 1: 10, 2: 25, 3: 50, 4: 100 };

const DEFAULT_DB = {
    version: 3, // Флаг принудительного обновления для Redis
    tasks: [
        { id: 101, title: '«Без паразитов»', desc: 'Провести целый день, не используя в речи слова-паразиты («типа», «как бы», «короче», «ну»)', reward: 30, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 102, title: '«Слово дня»', desc: 'Узнать значение редкого/красивого слова (например, эрудиция, эмпатия, контекст, лаконичность) и уместно использовать его в диалоге со мной 3 раза за день.', reward: 25, isOneTime: false, isSpecial: false, diff: 1 },
        { id: 103, title: '«Мастер пересказа»', desc: 'Посмотреть увлекательное видео или прочитать статью и за 2 минуты эмоционально и красиво пересказать мне суть', reward: 30, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 104, title: '«Никаких матов»', desc: 'Продержаться 24 часа без единого матерного слова (выражать эмоции только богатым литературным языком)', reward: 60, isOneTime: true, isSpecial: false, diff: 3 },
        { id: 105, title: '«Голосовое эссе»', desc: 'Записать мне аудиосообщение на 2-3 минуты с размышлением на любую тему без пауз, мычания и заминок.', reward: 35, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 106, title: '«Адвокат дьявола»', desc: 'Выбрать любую спорную тему и аргументированно защитить точку зрения, с которой сам изначально не согласен', reward: 35, isOneTime: false, isSpecial: false, diff: 3 },
        { id: 107, title: 'Прочитать книгу (около 500 страниц)', desc: '', reward: 650, isOneTime: false, isSpecial: false, diff: 4 },
        { id: 108, title: '«Логическая ловушка»', desc: 'Узнать, что такое 2 любых логических когнитивных искажения (например, «ошибка выжившего» или «эффект Даннинга-Крюгера») и объяснить их мне простыми словами.', reward: 35, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 109, title: '«Без гаджетов»', desc: 'Заниматься саморазвитием, чтением или размышлениями 2 часа без телефона и соцсетей', reward: 45, isOneTime: false, isSpecial: false, diff: 3 },
        { id: 110, title: '«Факт дня»', desc: 'Узнать 1 интересный исторический или научный факт и рассказать его мне при встрече.', reward: 15, isOneTime: false, isSpecial: false, diff: 1 },
        { id: 111, title: '«Анализ ошибки»', desc: 'Вспомнить недавнюю неудачную ситуацию и написать 2 вывода: чему она научила и как поступить в следующий раз', reward: 15, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 112, title: '«Оратор перед зеркалом»', desc: 'Потренироваться 3 минуты говорить перед зеркалом на любую тему уверенно и с хорошей дикцией', reward: 25, isOneTime: false, isSpecial: false, diff: 2 },
        { id: 113, title: '«3 "Почему"»', desc: 'Встретив незнакомый термин, событие или факт в интернете, не пролистнуть, а разобраться в нем и найти ответы', reward: 30, isOneTime: false, isSpecial: false, diff: 2 }
    ],
    store: [
        { id: 201, title: '«Массаж спины или ног (15 минут)»', desc: '', price: 100, isOneTime: false, isSpecial: false },
        { id: 202, title: '«Вкусняшка на выбор вне плана»', desc: '', price: 90, isOneTime: false, isSpecial: false },
        { id: 203, title: '«Любое желание на выбор (в пределах разумного)»', desc: '', price: 1000, isOneTime: false, isSpecial: false },
        { id: 204, title: '«Вход без очереди (выбор места или права решения в споре)»', desc: '', price: 400, isOneTime: false, isSpecial: false },
        { id: 205, title: '«Право вето»', desc: '(Заблокировать одну мою идею или предложение на сегодня)', price: 200, isOneTime: true, isSpecial: false },
        { id: 206, title: '«Секретный подарок от меня»', desc: '', price: 550, isOneTime: true, isSpecial: false },
        { id: 207, title: '«Супер-купон: День абсолютного релакса»', desc: '', price: 700, isOneTime: true, isSpecial: false },
        { id: 208, title: 'Задонатить 150 рублей', desc: '', price: 350, isOneTime: false, isSpecial: false },
        { id: 209, title: 'Прокатиться на самокатах', desc: '', price: 400, isOneTime: false, isSpecial: false },
        { id: 210, title: 'Возможность полностью контролировать маршрут прогулки и мест досуга/кафе', desc: '', price: 550, isOneTime: false, isSpecial: false },
        { id: 211, title: 'Отключение обидок и выебонов от меня на 24 часа', desc: '', price: 400, isOneTime: false, isSpecial: false }
    ],
    inventory: [],
    balance: 0,
    level: 1,
    exp: 0
};

async function getDB() {
    try {
        let data = await redis.get('quest_db');
        if (typeof data === 'string') data = JSON.parse(data);
        
        if (!data || data.version !== 3) {
            const merged = { ...DEFAULT_DB, balance: data?.balance || 0, exp: data?.exp || 0, level: data?.level || 1, inventory: data?.inventory || [] };
            await redis.set('quest_db', merged);
            return merged;
        }
        return data;
    } catch (e) {
        return DEFAULT_DB;
    }
}

async function saveDB(db) { await redis.set('quest_db', db); }

const bot = new Telegraf(BOT_TOKEN);
app.use(express.json());

async function notifyAdmin(text) {
    try { await bot.telegram.sendMessage(ADMIN_ID, text); } catch (e) {}
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
    
    let item = list.find(i => Number(i.id) === Number(id));
    if (item) {
        item.title = title; item.desc = desc; item.isOneTime = isOneTime; item.isSpecial = isSpecial;
        if (type === 'task') { item.reward = Number(value); item.diff = Number(diff); } 
        else { item.price = Number(value); }
    } else {
        const newItem = { id: Date.now(), title, desc, isOneTime, isSpecial };
        if (type === 'task') { newItem.reward = Number(value); newItem.diff = Number(diff); } 
        else { newItem.price = Number(value); }
        list.push(newItem);
    }
    await saveDB(db);
    res.json(db);
});

app.post('/api/delete-item', async (req, res) => {
    const { type, id } = req.body;
    const db = await getDB();
    if (type === 'task') db.tasks = db.tasks.filter(t => Number(t.id) !== Number(id));
    else if (type === 'store') db.store = db.store.filter(s => Number(s.id) !== Number(id));
    else if (type === 'inventory') db.inventory = db.inventory.filter(i => Number(i.invId) !== Number(id));
    await saveDB(db);
    res.json(db);
});

app.post('/api/complete-task', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const task = db.tasks.find(t => Number(t.id) === Number(id));
    if (task) {
        const gainedExp = EXP_MAP[task.diff] || 10;
        db.balance += task.reward;
        db.exp += gainedExp;
        if (task.isOneTime) db.tasks = db.tasks.filter(t => Number(t.id) !== Number(id));
        await saveDB(db);
        await notifyAdmin(`✅ Задание выполнено!\n«${task.title}»\n+${task.reward} 🪙 | +${gainedExp} EXP\nТекущий баланс: ${db.balance} 🪙`);
    }
    res.json(db);
});

app.post('/api/buy-item', async (req, res) => {
    const { id } = req.body;
    const db = await getDB();
    const item = db.store.find(s => Number(s.id) === Number(id));
    if (item && db.balance >= item.price) {
        db.balance -= item.price;
        db.inventory.push({ invId: Date.now(), title: item.title, desc: item.desc });
        if (item.isOneTime) db.store = db.store.filter(s => Number(s.id) !== Number(id));
        await saveDB(db);
        await notifyAdmin(`🛍 Куплен товар!\n«${item.title}» отправлен в инвентарь!\nОстаток: ${db.balance} 🪙`);
        res.json({ success: true, db });
    } else {
        res.json({ success: false, message: 'Недостаточно монет!' });
    }
});

app.post('/api/use-inventory', async (req, res) => {
    const { invId } = req.body;
    const db = await getDB();
    const item = db.inventory.find(i => Number(i.invId) === Number(invId));
    if (item) {
        db.inventory = db.inventory.filter(i => Number(i.invId) !== Number(invId));
        await saveDB(db);
        await notifyAdmin(`🔥 ИСПОЛЬЗОВАН ПРЕДМЕТ ИЗ ИНВЕНТАРЯ 🔥\n«${item.title}»`);
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
        body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding-bottom: 80px;}
        * { box-sizing: border-box; }
        
        .rpg-header { background: linear-gradient(135deg, #2a2a32, #1a1a20); padding: 15px; text-align: center; border-bottom: 2px solid var(--accent); box-shadow: 0 4px 15px rgba(0,0,0,0.5);}
        .rpg-stats { display: flex; justify-content: space-around; font-size: 14px; font-weight: bold; margin-bottom: 8px;}
        .rpg-stats span { background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 12px; }
        .exp-bar-bg { width: 100%; height: 10px; background: #333; border-radius: 5px; overflow: hidden;}
        .exp-bar-fill { height: 100%; background: linear-gradient(90deg, #6b4cff, #a288ff); width: 0%; transition: 0.3s; }
        .exp-text { font-size: 11px; color: #aaa; margin-top: 4px; }

        .tabs-wrapper { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 8px; background: var(--bg); position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #333;}
        .tab-btn { padding: 10px 4px; text-align: center; background: var(--card); color: var(--sub); font-weight: bold; border-radius: 8px; border: 1px solid #333; font-size: 11px; display: flex; align-items: center; justify-content: center;}
        .tab-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

        .container { padding: 15px; }
        .card { background: var(--card); border-radius: 14px; padding: 15px; margin-bottom: 12px; }
        h3 { margin: 0 0 10px 0; font-size: 15px; }
        
        input, select, textarea { width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #444; background: #2a2a2e; color: white; font-family: inherit;}
        button { width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; font-size: 14px; color: white; cursor: pointer; background: var(--accent); }
        button.action { background: #34c759; }
        button.danger { background: #ff3b30; }
        button.small { width: auto; padding: 8px 12px; font-size: 12px; margin-left: 5px;}

        .item-row { border: 1px solid #333; border-radius: 12px; margin-bottom: 10px; background: #1a1a1e; }
        .item-header { padding: 12px; display: flex; justify-content: space-between; align-items: center; }
        .item-title-block { display: flex; flex-direction: column; gap: 4px; flex-grow:1; }
        .item-title { font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 6px; line-height: 1.2;}
        .item-tags { display: flex; gap: 5px; font-size: 10px; flex-wrap: wrap; }
        .tag { padding: 2px 6px; border-radius: 6px; background: #333; color: #ccc; }
        .diff-1 { color: var(--d1); } .diff-2 { color: var(--d2); } .diff-3 { color: var(--d3); } .diff-4 { color: var(--d4); }
        .item-val { font-weight: 900; font-size: 15px; color: #ffd60a; margin-left: 10px;}
        
        .item-body { padding: 0 12px 12px 12px; display: none; border-top: 1px dashed #333; margin-top: 5px; padding-top: 10px; font-size: 13px; color: #bbb;}
        .item-body.open { display: block; }
        .item-actions { display: flex; gap: 8px; margin-top: 12px; }
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
        <div class="tab-btn" onclick="showTab('store')">🎁 Магазин</div>
        <div class="tab-btn" onclick="showTab('inv')">🎒 Инвентарь</div>
        <div class="tab-btn" onclick="showTab('tasks-sp')">🌟 Ос. Квесты</div>
        <div class="tab-btn" onclick="showTab('store-sp')">💎 Ос. Товары</div>
        <div class="tab-btn admin-only" onclick="showTab('admin')" style="display:none;">⚙️ Админка</div>
    </div>

    <div class="container" id="content"></div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const isAdmin = ((tg.initDataUnsafe?.user?.id || 0) == ${ADMIN_ID});
        if(isAdmin) document.querySelector('.admin-only').style.display = 'flex';

        let g_db = { tasks: [], store: [], inventory: [], balance: 0, level: 1, exp: 0 };
        let currentTab = 'tasks';
        const diffColors = { 1: '🟢 Легко', 2: '🟡 Средне', 3: '🔴 Сложно', 4: '🟣 Ультра' };

        function alertMsg(msg) { if(tg.showAlert) tg.showAlert(msg); else alert(msg); }
        function confirmAction(msg, callback) {
            if(tg.showConfirm) tg.showConfirm(msg, (res) => { if(res) callback(); });
            else if(confirm(msg)) callback();
        }

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
            let fill = (g_db.exp % 1000) / 10; 
            document.getElementById('ui-exp-fill').style.width = fill + '%';
        }

        window.toggleDesc = function(id) {
            const el = document.getElementById(id);
            if(el) el.classList.toggle('open');
        }

        window.toggleAdminDiff = function() {
            const type = document.getElementById('a-type').value;
            document.getElementById('a-diff').style.display = (type === 'task') ? 'block' : 'none';
        }

        window.showTab = function(tab) {
            currentTab = tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            event.currentTarget?.classList?.add('active');

            const c = document.getElementById('content');
            let html = '';

            if (tab === 'tasks' || tab === 'tasks-sp') {
                const isSp = (tab === 'tasks-sp');
                const list = g_db.tasks.filter(t => t.isSpecial === isSp).sort((a, b) => a.diff - b.diff);
                html += list.map(t => renderItem(t, 'task')).join('') || '<p>Тут пока пусто.</p>';
            } 
            else if (tab === 'store' || tab === 'store-sp') {
                const isSp = (tab === 'store-sp');
                const list = g_db.store.filter(s => s.isSpecial === isSp);
                html += list.map(s => renderItem(s, 'store')).join('') || '<p>Тут пока пусто.</p>';
            }
            else if (tab === 'inv') {
                html += g_db.inventory.map(i => renderItem(i, 'inventory')).join('') || '<p>Инвентарь пуст.</p>';
            }
            else if (tab === 'admin' && isAdmin) {
                html += \`
                    <div class="card">
                        <h3>🛠 Добавить Квест/Товар</h3>
                        <select id="a-type" onchange="toggleAdminDiff()">
                            <option value="task">Квест</option>
                            <option value="store">Товар</option>
                        </select>
                        <input id="a-title" placeholder="Название">
                        <textarea id="a-desc" placeholder="Описание" rows="2"></textarea>
                        <input id="a-val" type="number" placeholder="Награда / Цена">
                        <select id="a-diff">
                            <option value="1">Сложность: Легко</option>
                            <option value="2" selected>Сложность: Средне</option>
                            <option value="3">Сложность: Сложно</option>
                            <option value="4">Сложность: Ультра</option>
                        </select>
                        <label class="checkbox-row"><input type="checkbox" id="a-onetime"> Одноразовое</label>
                        <label class="checkbox-row"><input type="checkbox" id="a-special"> Во вкладку "Особое"</label>
                        <button onclick="saveItem('new')">Добавить</button>
                    </div>
                    <div class="card">
                        <h3>📊 Статистика Игрока</h3>
                        <label>Монеты:</label>
                        <input id="st-bal" type="number" value="\${g_db.balance}">
                        <label>Уровень:</label>
                        <input id="st-lvl" type="number" value="\${g_db.level}">
                        <label>Опыт:</label>
                        <input id="st-exp" type="number" value="\${g_db.exp}">
                        <button class="action" onclick="updateStats()">Сохранить статы</button>
                    </div>
                \`;
            }
            c.innerHTML = html;
        }

        function renderItem(item, type) {
            const isTask = type === 'task';
            const isStore = type === 'store';
            const isInv = type === 'inventory';
            const uid = type + '-' + (isInv ? item.invId : item.id);
            
            let valLabel = isTask ? '+' + item.reward : (isStore ? '-' + item.price : '');
            let diffIcon = isTask ? \`<span class="diff-\${item.diff}">●</span> \` : '';
            
            let tagsHtml = '';
            if (!isInv) {
                if (isTask) tagsHtml += \`<span class="tag">\${diffColors[item.diff].split(' ')[1]}</span>\`;
                tagsHtml += item.isOneTime ? '<span class="tag">1 раз</span>' : '<span class="tag">Многоразово</span>';
            }

            let actions = '';
            if (!isAdmin) {
                if (isTask) actions = \`<button class="action" onclick="event.stopPropagation(); completeTask(\${item.id})">Сделано</button>\`;
                else if (isStore) actions = \`<button class="action" onclick="event.stopPropagation(); buyItem(\${item.id})">Купить</button>\`;
                else if (isInv) actions = \`<button class="action" onclick="event.stopPropagation(); useInv(\${item.invId})">Использовать</button>\`;
            } else {
                if (isInv) {
                    actions = \`<button class="danger small" onclick="event.stopPropagation(); delItem('inventory', \${item.invId})">Удалить из инвентаря</button>\`;
                } else {
                    actions = \`
                        <button class="small" onclick="event.stopPropagation(); toggleDesc('edit-\${uid}')">Редактировать</button>
                        <button class="danger small" onclick="event.stopPropagation(); delItem('\${type}', \${item.id})">Удалить</button>
                    \`;
                }
            }

            const safeTitle = item.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const safeDesc = (item.desc || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            let editForm = (isAdmin && !isInv) ? \`
                <div class="admin-edit-form item-body" id="edit-\${uid}">
                    <input id="et-\${uid}" value="\${safeTitle}">
                    <textarea id="ed-\${uid}" rows="2">\${safeDesc}</textarea>
                    <input id="ev-\${uid}" type="number" value="\${isTask ? item.reward : item.price}">
                    <select id="edf-\${uid}" style="display:\${isTask ? 'block' : 'none'}">
                        <option value="1" \${item.diff==1?'selected':''}>Легко</option>
                        <option value="2" \${item.diff==2?'selected':''}>Средне</option>
                        <option value="3" \${item.diff==3?'selected':''}>Сложно</option>
                        <option value="4" \${item.diff==4?'selected':''}>Ультра</option>
                    </select>
                    <label class="checkbox-row"><input type="checkbox" id="eo-\${uid}" \${item.isOneTime?'checked':''}> Одноразовое</label>
                    <label class="checkbox-row"><input type="checkbox" id="es-\${uid}" \${item.isSpecial?'checked':''}> Особое (🌟/💎)</label>
                    <button onclick="saveItem('\${type}', \${item.id})">Сохранить изменения</button>
                </div>
            \` : '';

            return \`
                <div class="item-row">
                    <div class="item-header" onclick="toggleDesc('desc-\${uid}')">
                        <div class="item-title-block">
                            <div class="item-title">\${diffIcon}\${item.title}</div>
                            \${tagsHtml ? \`<div class="item-tags">\${tagsHtml}</div>\` : ''}
                        </div>
                        \${valLabel ? \`<div class="item-val">\${valLabel} 🪙</div>\` : ''}
                    </div>
                    <div class="item-body" id="desc-\${uid}">
                        \${item.desc || (isInv ? 'Без описания' : '')}
                        <div class="item-actions">\${actions}</div>
                    </div>
                    \${editForm}
                </div>
            \`;
        }

        window.updateStats = async function() {
            const b = document.getElementById('st-bal').value;
            const l = document.getElementById('st-lvl').value;
            const e = document.getElementById('st-exp').value;
            const res = await fetch('/api/update-stats', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({balance:b, level:l, exp:e}) });
            g_db = await res.json();
            updateHeader(); alertMsg('Статистика сохранена!');
        }

        window.saveItem = async function(type, id = null) {
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
                    type, id,
                    title: document.getElementById('et-' + uid).value,
                    desc: document.getElementById('ed-' + uid).value,
                    value: document.getElementById('ev-' + uid).value,
                    diff: document.getElementById('edf-' + uid).value,
                    isOneTime: document.getElementById('eo-' + uid).checked,
                    isSpecial: document.getElementById('es-' + uid).checked
                };
            }
            if(!data.title || !data.value) return alertMsg('Введи название и значение!');
            
            const res = await fetch('/api/save-item', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
            g_db = await res.json();
            showTab(currentTab);
        }

        window.delItem = function(type, id) {
            confirmAction('Точно удалить?', async () => {
                const res = await fetch('/api/delete-item', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({type, id}) });
                g_db = await res.json();
                showTab(currentTab);
            });
        }

        window.completeTask = async function(id) {
            const res = await fetch('/api/complete-task', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
            g_db = await res.json();
            updateHeader(); showTab(currentTab);
            alertMsg('Задание выполнено! Награда начислена.');
        }

        window.buyItem = async function(id) {
            const res = await fetch('/api/buy-item', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
            const data = await res.json();
            if(!data.success) return alertMsg(data.message);
            g_db = data.db;
            updateHeader(); showTab(currentTab);
            alertMsg('Товар куплен и добавлен в инвентарь!');
        }

        window.useInv = function(invId) {
            confirmAction('Использовать предмет прямо сейчас?', async () => {
                const res = await fetch('/api/use-inventory', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({invId}) });
                g_db = await res.json();
                showTab(currentTab);
                alertMsg('Предмет активирован!');
            });
        }

        init();
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {});

bot.start((ctx) => ctx.reply('Привет! Нажми на кнопку меню, чтобы открыть приложение'));
bot.launch();
