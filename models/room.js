const mongoose = require('mongoose');
// const user = require('./user');
// const message = require('./message');

// Модель комнат
const room = new mongoose.Schema({
    author: { type: String, default: '' },
    private: { type: Boolean, default: false },
    name: { type: String, lowercase: true, unique: true },
    topic: { type: String, default: '' },
    users: [{}],
    messages: [{}],
    created_at: Date,
    updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Room', room);
