const AccMan = require('../engine/access-manager');
const TokenManager = require('../engine/token-manager');
const DashMan = require('../engine/dashboard-manager');
const CalMan = require('../engine/calendar-manager');
const MessMan = require('../engine/message-manager');

const ErrorHandler = require('../engine/error-handler');

module.exports = function (app, passport, config) {

    const site_URL = (config['site_URL'].includes('localhost') ? 'http://localhost:4200' : '') + '/#/preferences/api-keys?err=true';

    /* PATHs */
    const amPath   = '/users';
    const keysPath = '/keys';
    const dashPath = '/dashboards';
    const calPath  = '/calendar';
    const messPath = '/message';

    /* AUTH */
    const reqAuth = passport.authenticate('jwt', {session: false});

    const admin = '0';
    const user = '1';
    const editor = '2';
    const analyst = '3';
    const all = [admin, user, editor, analyst];

    // TODO gestire le delete bene: se il risultato restituito dalla query è 0, allora non ha eliminato niente

    /****************** ACCESS MANAGER ********************/
    app.post('/login', AccMan.basicLogin);

    /****************** CRUD USERS ********************/
    app.post(`${amPath}/create/`, AccMan.createUser);
    app.get(`${amPath}/getFromId/`, reqAuth, AccMan.roleAuth(all), AccMan.getUserById);
    app.put(`${amPath}/update/`, reqAuth, AccMan.roleAuth(all), AccMan.updateUser);
    app.delete(`${amPath}/delete/`, reqAuth, AccMan.roleAuth([admin]), AccMan.deleteUser);

    app.get(`${amPath}/verifyEmail`, AccMan.verifyEmail);

    /****************** TOKENS ********************/
    // CRUD
    app.post(`${keysPath}/insert/`, reqAuth, AccMan.roleAuth(all), TokenManager.insertKey);
    app.get(`${keysPath}/getAll/`, reqAuth, AccMan.roleAuth(all), TokenManager.readAllKeysById);
    app.put(`${keysPath}/update/`, reqAuth, AccMan.roleAuth(all), TokenManager.update);
    app.delete(`${keysPath}/delete/`, reqAuth, AccMan.roleAuth(all), TokenManager.deleteKey);

    /****************** CRUD DASHBOARD ********************/
    app.get(`${dashPath}/getAllUserDashboards/`, reqAuth, AccMan.roleAuth(all), DashMan.readUserDashboards);
    app.get(`${dashPath}/getDashboardByType/:type`, reqAuth, AccMan.roleAuth(all), DashMan.getDashboardByType);
    app.get(`${dashPath}/getDashboardByID/:id`, reqAuth, AccMan.roleAuth(all), DashMan.getDashboardByID);
    app.get(`${dashPath}/getChart/:dashboard_id/:chart_id`, reqAuth, AccMan.roleAuth(all), DashMan.readChart);
    app.get(`${dashPath}/getChartsByFormat/:format`, reqAuth, AccMan.roleAuth(all), DashMan.getByFormat);
    app.get(`${dashPath}/getChartsNotAddedByDashboard/:dashboard_id/`, reqAuth, AccMan.roleAuth(all), DashMan.readNotAddedByDashboard);
    app.get(`${dashPath}/getChartsNotAddedByDashboardAndType/:dashboard_id/:type`, reqAuth, AccMan.roleAuth(all), DashMan.readNotAddedByDashboardAndType);

    app.put(`${dashPath}/updateChartInDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.updateChartInDashboard);
    app.put(`${dashPath}/updateChartsInDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.updateChartsInDashboard);
    app.put(`${dashPath}/updateProof`, DashMan.updateArray);

    app.post(`${dashPath}/createDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.createDashboard);
    app.post(`${dashPath}/addChartToDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.addChartToDashboard);

    app.delete(`${dashPath}/removeChartFromDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.removeChartFromDashboard);
    app.delete(`${dashPath}/clearDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.clearAllDashboard);
    app.delete(`${dashPath}/deleteUserDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.deleteUserDashboard);
    app.delete(`${dashPath}/deleteDashboard`, reqAuth, AccMan.roleAuth(all), DashMan.deleteDashboard);

    /****************** CRUD MESSAGES ********************/
    app.post(`${messPath}/createMessage`, reqAuth, AccMan.roleAuth(admin), MessMan.createMessage);
    app.get(`${messPath}/getMessageByID/:message_id`, reqAuth, AccMan.roleAuth(all), MessMan.readMessageByID);
    app.get(`${messPath}/getMessagesForUser`, reqAuth, AccMan.roleAuth(all), MessMan.getMessagesForUser);
    app.post(`${messPath}/sendMessageToUser`, reqAuth, AccMan.roleAuth(admin), MessMan.sendMessageToUser);
    app.put(`${messPath}/setMessageRead`, reqAuth, AccMan.roleAuth(all), MessMan.setMessageRead);
    app.delete(`${messPath}/deleteMessageForUser/:message_id`, reqAuth, AccMan.roleAuth(all), MessMan.deleteMessageForUser);
    app.delete(`${messPath}/deleteMessageByID`, reqAuth, AccMan.roleAuth(admin), MessMan.deleteMessageByID);


    /****************** CALENDAR MANAGER ******************/
    app.get(`${calPath}/getEvents`, reqAuth, AccMan.roleAuth(all), CalMan.getEvents);
    app.post(`${calPath}/addEvent`, reqAuth, AccMan.roleAuth(all), CalMan.addEvent);
    app.put(`${calPath}/updateEvent`, reqAuth, AccMan.roleAuth(all), CalMan.getEvents);
    app.delete(`${calPath}/deleteEvent`, reqAuth, AccMan.roleAuth(all), CalMan.deleteEvent);

    /****************** ERROR HANDLER ********************/
    app.use(ErrorHandler.fun404);

};

