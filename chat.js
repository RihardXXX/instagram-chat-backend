const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    allowEIO3: true, // false by default
    cors: {
        origin: '*',
    }
});
// const { v4: uuidv4 } = require('uuid');
const Room = require('./models/room');
const Message = require('./models/message');
const User = require('./models/user');
const { normalizeRoom } = require('./helpers');
const { normalizeResponse } = require('./helpers');
// const Message = require('~/server/models/message');

// const rooms = [];

// const createMessage = (text, username, userId, id = uuidv4()) => ({ text, username, userId, id, name: `name${id}` });

io.on('connection', socket => {
    // получение списка всех комнат и обновление их на клиенте
    socket.on('updateAllRooms', async () => {
        // все комнаты
        const allRooms = await Room.find();
        io.emit('initialRoomsClient', allRooms);
    });

    // получение комнат только данного пользователя
    socket.on('updateMyRooms', async ({ user }) => {
        // console.log('user: ', user);
        // получить все комнаты созданные данным пользователем
        const myRooms = await Room.find({ author: user._id }).exec();
        // вызывать getMyRooms и положить туда список всех моих комнат
        io.emit('getMyRooms', myRooms);
    });

    // инициализация комнат для общения
    socket.on('initialRooms', async ({ user }, cb) => {
        // console.log('test: ', user);
        // если нет в БД общей комнаты то создаем её
        const room = await Room.findOne({ name: 'общая' }).exec();
        if (!room) {
            const newRoom = new Room({
                name: 'общая',
                topic: 'теги',
                users: [],
                messages: [],
            });

            newRoom.save(async function(err, doc, next) {
                if (err) {
                    const errorsList = Object.values(err.errors).map(item => item.properties.message);
                    socket.emit('setError', errorsList);
                } else {
                    socket._events.updateAllRooms();
                    socket._events.updateMyRooms({ user });
                }
            });
        } else {
            // обновляем состояние списка комнат на клиенте вызывая серверное событие
            socket._events.updateAllRooms();
            // и обновляем комнаты данного пользователя
            socket._events.updateMyRooms({ user });
        }
    });

    // принимаем новое сообщение от клиента
    socket.on('createNewMessage', async ({ text, room, user }, cb) => {
        // цепляемся в определенной комнате
        socket.join(room._id);

        // делаем проверку на пустоту сообщения
        if (!text.length) {
            socket.emit('setError', ['пожалуйста заполните сообщение для отправки']);
            return;
        }

        // создаём сообщение для текущей комнаты
        const newMessage = new Message({
            room: room.name,
            user,
            message_body: text,
        });

        // находим текущую комнату и в неё добавляем сообщение
        const currentRoom = await Room.findById(room._id);
        // добавляем сообщение
        currentRoom.messages.push(newMessage);
        // сохраняем изменения
        await currentRoom.save();

        // обновляем на клиенте текущую комнату
        // отправляем с сервера последние 30 сообщений чтобы не нагружать клиент
        io.to(room._id).emit('updateCurrentRoom', normalizeRoom(currentRoom));
    });


    // подключение к комнате
    socket.on('joinedRooms', async ({ user, room }, cb) => {
        // цепляемся в определенной комнате
        socket.join(room._id);
        // тут создаём модель сообщения и сохраняем её
        const newMessage = new Message({
            room: room.name,
            user,
            message_body: `Пользователь ${user.username} присоединился к чату`,
        });

        // находим комнату по айди
        const currentRoom = await Room.findById(room._id);
        // добавляем сообщение
        currentRoom.messages.push(newMessage);
        // сохраняем изменения
        await currentRoom.save();

        // проверяем есть ли в комнате юзер с таким айди, если нет то добавляем
        const isRepeat = currentRoom.users.some(item => item._id === user._id);
        if (!isRepeat) {
            // удаляем пароль перед добавлениям в комнату
            delete user.password;
            currentRoom.users.push(user);
            await currentRoom.save();
        }

        // обновляем на клиенте текущую комнату
        io.to(room._id).emit('updateCurrentRoom', normalizeRoom(currentRoom));
        // обновляем список всех комнат на клиенте, нужно чтобы другие участники видели кто и в каких комнатах
        socket._events.updateAllRooms();
        socket._events.updateMyRooms({ user });
        // // то что будем транслироваться для других участников
        // socket.broadcast
        //     .to(room)
        //     .emit('addMessageFromServer', createMessage(`Пользователь ${username} присоединился к чату`, 'admin'));
    });

    // пользователь вышел из комнаты
    socket.on('exitRoom', async ({ room, user }, cb) => {
        // цепляемся в определенной комнате
        socket.join(room._id);

        // находим в бд текущую комнату
        const currentRoom = await Room.findById(room._id);
        // удаляем пользователя из текущей комнаты
        currentRoom.users = currentRoom.users.filter(item => item._id !== user._id);
        // сохраняем изменения в бд
        await currentRoom.save();

        // создаем сообщение о том что пользователь удалился из комнаты
        const newMessage = new Message({
            room: room.name,
            user,
            message_body: `Пользователь ${user.username} вышел из чата`,
        });
        // добавляем сообщение
        currentRoom.messages.push(newMessage);
        // сохраняем изменения
        await currentRoom.save();

        // бросаем на клиент обновленную комнату
        io.to(room._id).emit('updateCurrentRoom', currentRoom);
        // обновляем список всех комнат на клиенте, нужно чтобы другие участники видели кто и в каких комнатах
        socket._events.updateAllRooms();
        socket._events.updateMyRooms({ user });
        // то что будем транслироваться для других участников
        // socket.broadcast
        //     .to(room)
        //     .emit('addMessageFromServer', createMessage(`Пользователь ${username} вышел из комнаты`, 'admin'));
    });

    // создать новую комнату
    socket.on('createNewRoom', ({ room, user }, cb) => {
        console.log('user: ', user);
        // console.log('room: ', room);
        socket.emit('setError', []);

        // если нет автора или имени комнаты то бросаем ошибку
        if (!user._id || !room.roomName) {
            socket.emit('setError', ['нет пользователя или имени комнаты']);
            return;
        }

        // если потрачен лимит создания комнат
        if (user.roomCount <= 0) {
            socket.emit('setError', ['вы не можете создать больше 5 комнат']);
            return;
        }

        // сформировать комнату
        const newRoom = new Room({
            author: user._id,
            private: room.private,
            name: room.roomName,
            topic: '',
        });

        // console.log(123, newRoom);

        // сохранить комнату
        newRoom.save(async function(err, doc, next) {
            if (!err) {
                // сделать декремент в счетчике создания комнат у данного пользователя
                const currentUser = await User.findById(user._id);
                // уменьшаем количество комнат для создания у пользователя
                currentUser.roomCount -= 1;
                // сохранить данные пользователя после декремента
                await currentUser.save();
                // console.log('currentUser', currentUser);
                // обновить на клиенте данные
                io.emit('updateUserClient', normalizeResponse(currentUser.toObject()));

                // получить все комнаты созданные данным пользователем
                const myRooms = await Room.find({ author: user._id }).exec();
                // console.log(111, myRooms);
                // вызывать getMyRooms и положить туда список всех моих комнат
                io.emit('getMyRooms', myRooms);

                // обновление всех комнат на клиенте
                socket._events.updateAllRooms();
            } else {
                // console.log('XXXXXXXXXXX_XXXXXXXXX: ', err.message);
                // const errorsList = Object.values(err.errors).map(item => item.properties.message);
                socket.emit('setError', ['комната с таким именем уже существует']);
            }
        });
    });

    // удалить мою комнату
    socket.on('deleteMyRoom', async ({ room, user }, cb) => {
        socket.emit('setError', []);
        // console.log('room: ', room.author);
        // console.log('user: ', user._id);
        // проверить является ли он автором комнаты
        if (room.author !== user._id) {
            socket.emit('setError', ['вы не являетесь автором комнаты']);
            return false;
        }

        try {
            // найти данную комнату и удалить её
            await Room.deleteOne({ _id: room._id });

            // добавить текущему пользователю счетчик инкремент в поле количество комнат
            const currentUser = await User.findById(user._id);
            // уменьшаем количество комнат для создания у пользователя
            currentUser.roomCount += 1;
            // сохранить данные пользователя после декремента
            await currentUser.save();
            // обновить на клиенте данные
            io.emit('updateUserClient', normalizeResponse(currentUser.toObject()));

            // обновить состояние всех комнат и моих комнат
            socket._events.updateAllRooms();
            socket._events.updateMyRooms({ user });
        } catch (err) {
            socket.emit('setError', ['удаление комнаты не удалось']);
        }
    });
});

module.exports = {
    app,
    server,
};
