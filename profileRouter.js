// будут проводится операции по редактированию профиля
const express = require('express');
const profileRouter = express.Router();
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const { normalizeResponse } = require('./helpers');
const JWT_SECRET = require('./config');

profileRouter.use(async function(req, res, next) {
    // тут создать прослойку для проверки авторизации
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
            
            // если есть токен и такой пользователь в бд то допускаем дальнейший пропуск запроса
            // добавляем найденного пользователя
            req.body.user = user;
            next();
        }
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

// получение списка всех пользователей
profileRouter.get('/allUsers', async function(req, res) {

    try {
        const { user } = req.body;
        // получаем список всех пользователей
        const users = await User.find({});
        // убираем пароли у каждого пользователя и себя из списка
        const allUsers = users.map(user => {
            delete user.password;
            return user;
        })
            .filter(item => item._id.toString() !== user._id.toString());

        return res.status(200).json({ allUsers });
    } catch (err) {
        console.log('err: ', err);
        return res.status(500).json({ message: err });
    }
});

// добавление приглашений от пользователя
profileRouter.post('/addInvite', async function(req, res) {

    try {
        // забираем из тела запроса комнату в которую приглашаем и кого приглашаем
        const { invitedUser, invitedRoom } = req.body.data;

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
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

// отклонить приглашение в комнату
profileRouter.post('/deleteInvite', async function(req, res) {
    try {
        // забираем из тела запроса комнату в которую приглашаем и кого приглашаем
        const { currentUser, invitedRoom } = req.body.data;

        // находим пользователя которого надо пригласить
        const isUser = await User.findOne({ email: currentUser.email }).exec();

        if (!isUser) {
            return res.status(500).json({ message: 'такого пользователя не существует' });
        }

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
    } catch (err) {
        return res.status(500).json({ message: err });
    }
});

// редактирование профиля пользователя 
profileRouter.post('/editUser', async function(req, res) {
    try {
        const user = req.body.user;

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
    } catch (err) {
        console.log('err: ', err);
        return res.status(500).json({ message: err.message });
    }
});

// роут для добавления соц сети
profileRouter.post('/socialNetwork', async function(req, res) {
    try {
        const { user, social } = req.body;

        // создаем массив соц сетей добавляя старые данные и новые
        const newSocials = [...user.socialNetwork, social];
        // вновь созданный массив кладем в поле соц сетей
        user.socialNetwork = newSocials;
        await user.save();
        return res.status(200).json({ user: normalizeResponse(user.toObject()) });
    } catch (err) {
        console.log('err: ', err);
        return res.status(500).json({ message: err.message });
    }
});

// роут для удаления соц сети
profileRouter.delete('/socialNetwork/:id', async function(req, res) {
    try {
        const { user } = req.body;
        const id = req.params.id;

        // console.log(id);

        // фильтруем массив и возвращаем данные которые не совпвдают
        const newSocials = user.socialNetwork.filter(social => social.id !== id);
        // console.log('newSocials', newSocials);
        // вновь созданный массив кладем в поле соц сетей
        user.socialNetwork = newSocials;
        await user.save();
        return res.status(200).json({ user: normalizeResponse(user.toObject()) });
    } catch (err) {
        console.log('err: ', err);
        return res.status(500).json({ message: err.message });
    }
});

// роут для изменений соц сети
profileRouter.patch('/socialNetwork', async function(req, res) {
    try {
        // подумать над логикой приложения
        const { user, idSocial, changeSocial } = req.body;

        // находим определенную соц сеть и вносим в неё изменения
        const currentSocial = user.socialNetwork.find(social => social._id !== idSocial);
        // в старую соц сеть мерджим новые данные
        const resultSocial = Object.assign({}, currentSocial, changeSocial);
        // создаем соц сети без старого объекта
        // а потом новый объект вносим на его место
        user.socialNetwork = user.socialNetwork.map(social => {
            // если социальная сеть равна старой
            if (social._id === currentSocial._id) {
                return resultSocial;
            } else {
                return social;
            }
        })
        await user.save();
        return res.status(200).json({ user: normalizeResponse(user.toObject()) });
    } catch (err) {
        console.log('err: ', err);
        return res.status(500).json({ message: err.message });
    }
});

// получение данных пользователя по его айди
profileRouter.get('/get-user/:id', async function(req, res) {
    try {
        // из квери параметров получаем айди пользователя которого надо найти
        const id = req.params.id;

        const user = await User.findOne({ _id: id }).exec();

        if (!user) {
            return res.status(500).json({ message: 'такого пользователя не существует' });
        }

        return res.status(200).json({ user: normalizeResponse(user.toObject()) });
    } catch (err) {
        console.log('err: ', err);
        return res.status(500).json({ message: err.message });
    }
});

module.exports = profileRouter;