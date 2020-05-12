const AccMan = require('../engine/access-manager');
const DashMan = require('../engine/dashboard-manager');
const CalMan = require('../engine/calendar-manager');

const ErrorHandler = require('../engine/error-handler');
const VideoMan= require('../engine/SocketEmit');

module.exports = function (app, passport, config) {
    // const socket = require("socket.io");
    //
    // const server = app.listen(3000, () => {
    //     console.log('started in 3000')
    // });
    //
    // const io = socket(server);
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


    /****************** TOKENS ********************/

    /****************** CRUD DASHBOARD ********************/

    /****************** CRUD MESSAGES ********************/


    /****************** CALENDAR MANAGER ******************/
    app.get(`${calPath}/getEvents`, reqAuth, AccMan.roleAuth(all), CalMan.getEvents);
    app.post(`${calPath}/addEvent`, reqAuth, AccMan.roleAuth(all), CalMan.addEvent);
    app.put(`${calPath}/updateEvent`, reqAuth, AccMan.roleAuth(all), CalMan.getEvents);
    app.delete(`${calPath}/deleteEvent`, reqAuth, AccMan.roleAuth(all), CalMan.deleteEvent);

    /****************** SOCKET IO ******************/

    app.post('/SafeSpotter/create',VideoMan.getData)

    /****************** ERROR HANDLER ********************/
    app.use(ErrorHandler.fun404);

};

