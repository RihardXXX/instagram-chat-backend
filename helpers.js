const jwt = require('jsonwebtoken');
const JWT_SECRET = require('./config');

function generateJWT(user) {
    return jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
    }, JWT_SECRET);
}

// удаляет пароль и генерирует токен для клиента
const normalizeResponse = user => {
    delete user.password;
    // console.log(222, user);
    return {
        ...user,
        token: generateJWT(user),
    };
};

// метод который вырезает последние 20 сообщений для отправки на клиенте
const lastTwentyMessages = list => list.slice(-30);

// метод который принимает монго объект и в нём вырезает сообщения последние 30 штук
const normalizeRoom = room => ({
    ...room._doc,
    messages: lastTwentyMessages(room._doc.messages),
});


module.exports = {
    normalizeResponse,
    lastTwentyMessages,
    normalizeRoom,
};
