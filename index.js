const { Telegraf } = require('telegraf');
const express = require('express');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
// Укажи здесь свой ID цифрами (без кавычек)
const ADMIN_ID = 6542247611; 

const bot = new Telegraf(BOT_TOKEN);

app.use(express.json());

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body { font-family: sans-serif; background: #1c1c1e; color: #fff; padding: 20px; text-align: center; }
        .card { background: #2c2c2e; border-radius: 12px; padding: 15px; margin-bottom: 10px; }
        button { background: #007aff; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; width: 100%; }
    </style>
</head>
<body>
    <h2>🎯 Квесты & Магазин</h2>
    <div id="app"></div>
    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();
        const userId = tg.initDataUnsafe?.user?.id || 0;
        const isAdmin = userId == ${ADMIN_ID};
        
        const app = document.getElementById('app');
        if (isAdmin) {
            app.innerHTML = '<div class="card"><h3>Панель Админа</h3><p>Тут можно редактировать задания и магазин</p></div>';
        } else {
            app.innerHTML = '<div class="card"><h3>Твои задания</h3><p>Выполняй квесты и получай монеты!</p></div>';
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));

bot.start((ctx) => ctx.reply('Привет! Нажми на кнопку ниже, чтобы открыть квесты'));
bot.launch();
