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

const registrationHandler = (req, res) => {
    const { username, email, password, gender } = req.body.user;

    const user = new User({
        username,
        email,
        password,
        gender,
    });
    user.save(function(err, doc, next) {
        if (err) {
            console.log('test');
            const errorsList = Object.values(err.errors).map(item => item.properties.message);
            return res.status(500).json({ message: errorsList });
        } else {
            return res.status(200).json({ user: normalizeResponse(doc.toObject()) });
        }
    });
}

const loginHandler = async (req, res) => {
    const { email, password } = req.body.user;

    // console.log('test: ', email, password);

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
        // console.log('try');
        // если все совпадает возвращаем пользователя
        return res.status(200).json({ user: normalizeResponse(isUser.toObject()) });
    } catch (err) {
        // console.log('catch: ', err);
        return res.status(500).json({ message: err });
    }
}

// registration user
authorizationRouter.post('/registration', registrationHandler);

// logIn user
authorizationRouter.post('/logIn', loginHandler);

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
            return res.status(200).json({ user: normalizeResponse(user.toObject()) });
        }
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

// Эту секцию удалить так как она дублируется из другого роутра profile

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

// отклонить приглашение в комнату
authorizationRouter.post('/deleteInvite', async function(req, res) {
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
            const { currentUser, invitedRoom } = req.body.data;

            // находим пользователя которого надо пригласить
            const isUser = await User.findOne({ email: currentUser.email }).exec();

            if (!isUser) {
                return res.status(500).json({ message: 'такого пользователя не существует' });
            }

            // console.log('currentUser: ', currentUser);
            // console.log('invitedRoom: ', invitedRoom);
            //
            // проверяем есть ли такое приглашение вообще
            const isRoomInvited = isUser.invitedRooms.some(room => room._id === invitedRoom._id);
            //
            console.log('isRoomInvited: ', isRoomInvited);
            // если есть такое приглашение то удаляем его
            if (isRoomInvited) {
                // удаляем приглашение
                isUser.invitedRooms = isUser.invitedRooms.filter(room => room._id !== invitedRoom._id);
                await isUser.save();
                return res.status(200).json({ user: normalizeResponse(isUser.toObject()) });
            }
        }
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

// редактирование профиля пользователя 
authorizationRouter.post('/editUser', async function(req, res) {
    // получаем из хедара токен
    const token = req.headers.authorization.split(' ')[1];

    try {
        // парсим токен и получаем почту и тп данные
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
            const email = decoded.email;
            // находим из БД пользователя и возвращаем его
            const user = await User.findOne({ email }).exec();

            if (!user) {
                return res.status(500).json({ message: 'пройдите авторизацию чтобы получить список пользователей' });
            }

            // если есть имя то меняем его
            if (req.body.data.username) {
                const newUsername = req.body.data.username;
                user.username = newUsername;
                await user.save();
                return res.status(200).json({ user: normalizeResponse(user.toObject()) });
            }

            // если есть пол то меняем его
            if (req.body.data.gender) {
                const newGender = req.body.data.gender;
                user.gender = newGender;
                await user.save();
                return res.status(200).json({ user: normalizeResponse(user.toObject()) });
            }

            // если есть пол то меняем его
            if (req.body.data.email) {
                const newEmail = req.body.data.email;
                user.email = newEmail;
                await user.save();
                return res.status(200).json({ user: normalizeResponse(user.toObject()) });
            }

            // если есть биография то меняем её
            // чтобы мы могли и полностью стирать инфо о пользователе
            if ('bio' in req.body.data) {
                const newBio = req.body.data.bio;
                user.bio = newBio;
                await user.save();
                return res.status(200).json({ user: normalizeResponse(user.toObject()) });
            }

            return 'test';
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

authorizationRouter.post('/vkAuth', async function(req, res) {
    const { username, email, password, gender } = req.body.user;

    // после получения данных делаем проверку на наличие почты в бд
    // если почта существует то запускаем логин функцию
    // иначе запускаем регистрацию

    // console.log('req.body.user: ', req.body.user);
    // проверяем есть ли пользователь в бд
    const user = await User.findOne({ email }).exec();
    if (!user) {
        // делаем регистрацию если нет пользователя
        registrationHandler(req, res);
    } else {
        // в идеале мы должны генерировать временный токен и отправить обратно 
        // а потом если он нормальный допускать к логину
        // иначе входим под логином и паролем
        loginHandler(req, res);
    }

});

module.exports = authorizationRouter;
