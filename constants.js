require('dotenv').config();

module.exports = {
    TOKEN: process.env.TOKEN,
    REDIS_URL: process.env.REDIS_URL,
    RECIEVER_NO: process.env.RECIEVER_NO
};