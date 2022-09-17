const express = require('express');
const authorizationRouter = express.Router();
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const { normalizeResponse } = require('./helpers');
const JWT_SECRET = require('./config');

// middleware that is specific to this router
authorizationRouter.use(function(req, res, next) {
    next();
});

// registration user
authorizationRouter.post('/registration', function(req, res) {
    const { username, email, password, gender } = req.body.user;
    const user = new User({
        username,
        email,
        password,
        gender,
    });
    user.save(function(err, doc, next) {
        if (err) {
            const errorsList = Object.values(err.errors).map(item => item.properties.message);
            return res.status(500).json({ message: errorsList });
        } else {
            return res.status(200).json({ user: normalizeResponse(doc.toObject()) });
        }
    });
});

// logIn user
authorizationRouter.post('/logIn', async function(req, res) {
    const { email, password } = req.body.user;

    try {
        // проверка что такая почта существует
        const isUser = await User.findOne({ email }).exec();
        if (!isUser) {
            return res.status(500).json({ message: ['такой почты не существует'] });
        }
        // если пароль с бд не совпадает с пароллем в запросе
        if (isUser.password !== password) {
            return res.status(500).json({ message: ['пароль указан неверный'] });
        }
        // если все совпадает возвращаем пользователя
        return res.status(200).json({ user: normalizeResponse(isUser.toObject()) });
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

// logOut user
authorizationRouter.get('/logOut', function(req, res) {
    res.json({
        logOut: 'logOut',
    });
});

// auth status
authorizationRouter.get('/auth', async function(req, res) {
    // получаем из хедара токен
    const token = req.headers.authorization.split(' ')[1];

    try {
        // парсим токен и получаем почту и тп данные
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
            const email = decoded.email;
            // находим из БД пользорвателя и возвращаем его
            const user = await User.findOne({ email }).exec();
            return res.status(200).json({ user });
        }
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

// получение списка всех пользователей
authorizationRouter.get('/allUsers', async function(req, res) {

    // получаем из хедара токен
    const token = req.headers.authorization.split(' ')[1];

    try {
        // парсим токен и получаем почту и тп данные
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
            const email = decoded.email;
            // находим из БД пользорвателя и возвращаем его
            const user = await User.findOne({ email }).exec();
            if (!user) {
                return res.status(500).json({ message: 'пройдите авторизацию чтобы получить список пользователей' });
            }
            // получаем список всех пользователей
            const users = await User.find({});
            // убираем пароли у каждого пользователя и себя из списка
            const allUsers = users.map(user => {
                delete user.password;
                return user;
            })
                .filter(item => item._id.toString() !== user._id.toString());

            return res.status(200).json({ allUsers });
        }
    } catch (err) {
        console.log('err: ', err);
        return res.status(500).json({ message: err });
    }
});

// добавление приглашений от пользователя
authorizationRouter.post('/addInvite', async function(req, res) {
    // получаем из хедара токен
    const token = req.headers.authorization.split(' ')[1];

    try {
        // парсим токен и получаем почту и тп данные
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
            const email = decoded.email;
            // находим из БД пользорвателя и возвращаем его
            const user = await User.findOne({ email }).exec();
            if (!user) {
                return res.status(500).json({ message: 'пройдите авторизацию чтобы получить список пользователей' });
            }

            // забираем из тела запроса комнату в которую приглашаем и кого приглашаем
            const { invitedUser, invitedRoom } = req.body.data;

            // console.log('invitedUser: ', invitedUser);
            // console.log('invitedRoom: ', invitedRoom);

            // находим пользователя которого надо пригласить
            const isUser = await User.findOne({ email: invitedUser.email }).exec();

            if (!isUser) {
                return res.status(500).json({ message: 'такого пользователя не существует' });
            }

            // добавляем комнату если её нет, если есть удаляем
            const isRoomInvited = isUser.invitedRooms.some(room => room._id === invitedRoom._id);

            // console.log('isRoomInvited: ', isRoomInvited);

            if (isRoomInvited) {
                // если уже приглашен, то снимаем приглашение
                isUser.invitedRooms = isUser.invitedRooms.filter(room => room._id !== invitedRoom._id);
                await isUser.save();
                return res.status(200).json({ result: 'remove invite' });
            } else {
                // если не приглашен, то добавляем приглашение
                isUser.invitedRooms.push(invitedRoom);
                await isUser.save();
                return res.status(200).json({ result: 'add invite' });
            }
        }
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

module.exports = authorizationRouter;
