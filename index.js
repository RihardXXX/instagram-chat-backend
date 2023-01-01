require('dotenv').config();

// Подключаем бэкенд на Express.
// const express = require('express');
const cors = require('cors');

// создаём приложение и настраиваем сокеты
const { app, server } = require('./chat');

// отрубаем корсы
app.use(cors({
    origin: '*'
}));
// пордключаем бодипарсер

const bodyParser = require('body-parser');

// app.use(express.json());
// app.use(express.json({limit: '50mb'}));
// app.use(express.urlencoded({limit: '50mb'}));
// Express 4.0
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));


// Подключаем Mongoose и делаем коннект к базе данных.
// Прописываем стандартные настройки Mongoose.
const mongoose = require('mongoose');
// эта хуйня бережет от ошибок 
mongoose.set("strictQuery", false);
// mongoose.Schema.Types.Boolean.convertToFalse.add("");
// https://cloud.mongodb.com/v2/63a76ec2a6942d034b4b4fee#/clusters
mongoose.connect('mongodb+srv://admin:admin@my-communication.ayhbjbc.mongodb.net/?retryWrites=true&w=majority', {
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
