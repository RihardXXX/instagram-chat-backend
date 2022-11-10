require('dotenv').config();

// Подключаем бэкенд на Express.
const express = require('express');
const cors = require('cors');

// создаём приложение и настраиваем сокеты
const { app, server } = require('./chat');

app.use(cors({
    origin: '*'
}));
// app.use(express.json());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

// Подключаем Mongoose и делаем коннект к базе данных.
// Прописываем стандартные настройки Mongoose.
const mongoose = require('mongoose');
// mongoose.Schema.Types.Boolean.convertToFalse.add("");
mongoose.connect(`mongodb://localhost/${process.env.DATABASE}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Подключаем маршруты для управления моделью Page.
// импорт роутов
const authorizationRouter = require('./authorizationRouter');
app.use('/authorization', authorizationRouter);

// подключаем роуты для редактирования профиля
// тут будет сторожевая вышка для проверки токена авторизации
const profileRouter = require('./profileRouter');
app.use('/profile', profileRouter);

const consola = require('consola');

// функция запуска сервера
async function start() {
    server.listen(process.env.PORT, () => {
        consola.ready({
            message: `Server listening on ${process.env.BASE_URL}:${process.env.PORT}`,
            badge: true,
        });
    });
}


// запускать сервер только после подключения к БД
mongoose.connection.on('connected', () => {
    // запуск сервера после подключения к БД
    // при билде обязательно сменить путь в файле вендорс файлу normalize.css
    // Запуск приложения.
    start();
});
