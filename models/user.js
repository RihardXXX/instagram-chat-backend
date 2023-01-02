const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

// модель пользователя
const user = new mongoose.Schema({
    username: {
        type: String,
        lowercase: true,
        unique: true,
        required: [true, 'поле имени обязательно для заполнения'],
        match: [/^[a-zA-Z0-9а-яА-Я0-9]+$/, 'пожалуйста введите валидное имя пользователя'],
        index: true,
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
        required: [true, 'поле электронной почты обязательно для заполнения'],
        match: [/\S+@\S+\.\S+/, 'введите валидную электронную почту'],
        index: true,
    },
    password: {
        type: String,
        required: [true, 'пароль является обязательным полем для заполнения'],
    },
    is_active: { type: Boolean, default: false },
    roomCount: { type: Number, default: 5 },
    gender: { type: String, default: '' },
    invitedRooms: [],
    img: { type: String, default: '' },
    bio: { type: String, default: '' },
    socialNetwork: [{}],
}, { timestamps: true });

user.plugin(uniqueValidator, { message: 'такое имя или электронная почта уже существует' });

module.exports = mongoose.model('User', user);
