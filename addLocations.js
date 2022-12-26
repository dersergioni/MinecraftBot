const {
    requestCoordinatesOptions, requestTypeOfLocationOptions, startOptions, emptyOptions
} = require('./tgReplyOptions');
const db = require('./dbModels');
const Modes = require('./sessionModes');
const {getChatId, getDbUser, getInputData} = require("./helpers");

class AddLocations {

    constructor(bot, sessionModes, sessionData) {
        this.bot = bot;
        this.modes = sessionModes;
        this.sessionData = sessionData;
    }

    async promptCoordinateOne(msg) {
        const chatId = getChatId(msg);
        try {
            const user = getDbUser(msg);
            const mapId = await db.Map.findOne({where: {userId: user}});
            let sentMsg = await this.bot.sendMessage(chatId, 'Первая координата:');
            const sentReq = await this.bot.sendMessage(chatId, 'Ок, введи первую координату:', requestCoordinatesOptions);
            this.sessionData.set(chatId, {
                entering: '',
                mapId: mapId.dataValues.mapId,
                demoMsg: sentMsg,
                originReq: sentReq,
                initialCommand: getInputData(msg)
            });
            this.modes.set(chatId, Modes.EnterCoordinateOne);
        } catch (e) {
            await this.bot.sendMessage(chatId, 'Ошибка на сервере');
        }
    }

    async promptCoordinateTwo(msg) {
        const chatId = getChatId(msg);
        try {
            const userData = this.sessionData.get(chatId);
            const number = parseInt(userData.entering);
            if (isNaN(number)) throw('');
            userData.locations = [number];
            userData.entering = '';
            let sentMsg = await this.bot.sendMessage(chatId, 'Вторая координата:');
            userData.originReq = await this.bot.sendMessage(chatId, 'Ок, введи вторую координату:', requestCoordinatesOptions);
            userData.demoMsg = sentMsg;
            this.modes.set(chatId, Modes.EnterCoordinateTwo);
        } catch (e) {
            await this.bot.sendMessage(chatId, 'Что-то не то ввел, попробуй еще раз');
        }

    }

    async promptCoordinateThree(msg) {
        const chatId = getChatId(msg);
        try {
            const userData = this.sessionData.get(chatId);
            const number = parseInt(userData.entering);
            if (isNaN(number)) throw('');
            userData.locations.push(number);
            userData.entering = '';
            let sentMsg = await this.bot.sendMessage(chatId, 'Третья координата:');
            userData.originReq = await this.bot.sendMessage(chatId, 'Ок, введи третью координату:', requestCoordinatesOptions);
            userData.demoMsg = sentMsg;
            this.modes.set(chatId, Modes.EnterCoordinateThree);
        } catch (e) {
            await this.bot.sendMessage(chatId, 'Что-то не то ввел, попробуй еще раз');
        }
    }

    async promptType(msg) {
        const chatId = getChatId(msg);
        try {
            const userData = this.sessionData.get(chatId);
            const number = parseInt(userData.entering);
            if (isNaN(number)) throw('');
            userData.locations.push(number);
            userData.entering = '';
            if (userData.locations.length !== 3) throw('');
            userData.originReq = await this.bot.sendMessage(chatId, `Отлично, координаты [${userData.locations[0]} ${userData.locations[1]} ${userData.locations[2]}], теперь тип точки:`, requestTypeOfLocationOptions);
            this.modes.set(chatId, Modes.AddType);
        } catch (e) {
            await this.bot.sendMessage(chatId, 'Что-то не то ввел, попробуй еще раз');
        }
    }

    async promptDesc(msg) {
        const chatId = getChatId(msg);
        try {
            const userData = this.sessionData.get(chatId);
            userData.type = getInputData(msg);
            userData.originReq = await this.bot.sendMessage(chatId, `Отлично, это ${userData.type}. И последнее, теперь описание (можно оставить пустым):`, emptyOptions);
            this.modes.set(chatId, Modes.AddDescription);
        } catch (e) {
            await this.bot.sendMessage(chatId, 'Что-то не то ввел, попробуй еще раз');
        }
    }

    async finalize(msg) {
        const chatId = getChatId(msg);
        try {
            const user = getDbUser(msg);
            const userData = this.sessionData.get(chatId);
            let desc = getInputData(msg);
            if (desc !== 'empty') {
                desc = desc.trim();
                userData.desc = desc.charAt(0).toUpperCase() + desc.slice(1);
            }
            userData.author = user;
            userData.first = userData.locations[0];
            userData.center = userData.locations[1];
            userData.last = userData.locations[2];
            await db.Location.create(userData);
            userData.originReq = await this.bot.sendMessage(chatId, `Готово`, startOptions);
            this.modes.set(chatId, Modes.Start);
        } catch (e) {
            await this.bot.sendMessage(chatId, 'Что-то не то ввел, попробуй еще раз', emptyOptions);
        }
    }

}

module.exports = AddLocations;