'use strict';

/** External services **/
const HttpStatus = require('http-status-codes');
const Request = require('request-promise');
const _ = require('lodash');

/** DB Models **/
const Model = require('../models/index');
const Users = Model.Users;

//const MongoManager = require('./mongo-manager');

/** Dashboard Manager **/
//const DashboardManager = require('../engine/dashboard-manager');

// const D_TYPE = require('../engine/dashboard-manager').D_TYPE;
// const DS_TYPE = require('../engine/dashboard-manager').DS_TYPE;


// const checkExistence = async (req, res) => {
//     let joinModel;
//
//     switch (parseInt(req.params.type)) {
//         case D_TYPE.FBC:
//         case D_TYPE.FBM:
//         case D_TYPE.FB:
//         case D_TYPE.IG:
//             joinModel = FbToken;
//             break;
//         case D_TYPE.GA:
//             joinModel = GaToken;
//             break
//         case D_TYPE.YT:
//             joinModel = GaToken;
//             break;
//         default:
//             return res.status(HttpStatus.BAD_REQUEST).send({
//                 error: true,
//                 message: 'Cannot find a service of type ' + req.params.type + '.'
//             })
//     }
//
//     try {
//         const key = await Users.findOne({where: {id: req.user.id}, include: [{model: joinModel}]});
//
//         if ((key['dataValues']['FbTokens'] && key['dataValues']['FbTokens'].length > 0) ||
//             (key['dataValues']['GaTokens'] && key['dataValues']['GaTokens'].length > 0)) {
//             return res.status(HttpStatus.OK).send({
//                 exists: true,
//                 service: parseInt(req.params.type)
//             })
//         } else {
//             return res.status(HttpStatus.OK).send({
//                 exists: false,
//                 service: parseInt(req.params.type)
//             });
//         }
//
//     } catch (err) {
//         console.error(err);
//
//         if(err.message.includes('401')) {
//             return res.status(HttpStatus.UNAUTHORIZED).send({
//                 error: true,
//                 message: 'The token is either not valid or expired.'
//             })
//         }
//
//         return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
//             error: true,
//             message: 'An error occurred while checking the existence of a token service.'
//         })
//     }
// };
const permissionGranted = async (req, res) => {
    let response;
    try {

        response = await checkInternalPermission(req.user.id, req.params.type);
        return res.status(HttpStatus.OK).send(response);
    } catch (err) {
        console.error(err.message);

        if(err.message.includes('401')){ // Token expired
            return res.status(HttpStatus.OK).send({
                name: DS_TYPE[parseInt(req.params.type)],
                type: parseInt(req.params.type),
                granted: false,
                tokenValid: false,
                scopes: null
            });
        }

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'There is a problem with our servers.'
        })
    }
};

// const checkInternalPermission = async (user_id, type) => {
//
//     let scopes = [];
//     let hasPermission, key;
//
//     if (parseInt(type) === D_TYPE.FB || parseInt(type) === D_TYPE.IG || parseInt(type) === D_TYPE.FBM) { // Facebook or Instagram
//         key = await FbToken.findOne({where: {user_id: user_id}});
//     } else {
//         key = await GaToken.findOne({where: {user_id: user_id}});
//     }
//
//     if (!key) { // If a key is not set, return error
//         console.warn('KEY IS NOT SET UP');
//         return {
//             name: DS_TYPE[parseInt(type)],
//             type: parseInt(type),
//             granted: false,
//             tokenValid: true,
//             scopes: null
//         };
//     }
//
//     switch (parseInt(type)) {
//         case D_TYPE.FB: // Facebook
//             scopes = _.map((await FbAPI.getTokenInfo(key['api_key']))['data'], 'permission');
//             hasPermission = checkFBContains(scopes);
//             scopes = scopes.filter(el => !el.includes('instagram'));
//             break;
//         case D_TYPE.GA: // Google Analytics
//             scopes = (await GaAPI.getTokenInfo(key['private_key']))['scope'].split(' ');
//             hasPermission = checkGAContains(scopes);
//             scopes = scopes.filter(el => !el.includes('yt-analytics') && !el.includes('youtube'));
//             break;
//         case D_TYPE.IG: // Instagram
//             scopes = _.map((await FbAPI.getTokenInfo(key['api_key']))['data'], 'permission');
//             hasPermission = checkIGContains(scopes);
//             scopes = scopes.filter(el => el.includes('instagram'));
//             break;
//         case D_TYPE.YT: // YouTube
//             scopes = (await GaAPI.getTokenInfo(key['private_key']))['scope'].split(' ');
//             hasPermission = checkYTContains(scopes);
//             scopes = scopes.filter(el => el.includes('yt-analytics') || el.includes('youtube'));
//             break;
//         case D_TYPE.FBM:
//             scopes = _.map((await FbAPI.getTokenInfo(key['api_key']))['data'], 'permission');
//             hasPermission = checkFBContains(scopes);
//             scopes = scopes.filter(el => !el.includes('instagram'));
//             break;
//         default:
//             return {
//                 error: true,
//                 message: 'The service with id ' + type + ' does not exist.'
//             };
//     }
//
//     return {
//         name: DS_TYPE[parseInt(type)],
//         type: parseInt(type),
//         granted: hasPermission,
//         tokenValid: true,
//         scopes: hasPermission ? scopes : null
//     };
//
// };
// const revokePermissions = async (req, res) => {
//     let type = parseInt(req.params.type);
//     let key;
//
//     if (type === D_TYPE.FB || type === D_TYPE.IG) { // Facebook or Instagram
//         key = (await FbToken.findOne({where: {user_id: req.user.id}}))['api_key'];
//     } else {
//         key = (await GaToken.findOne({where: {user_id: req.user.id}}))['private_key'];
//     }
//
//     try {
//         switch (type) {
//             case D_TYPE.FB:
//             case D_TYPE.IG:
//                 await revokeFbPermissions(key);
//                 // await revokeIgPermissions(key);
//                 await FbToken.destroy({where: {user_id: req.user.id}});
//                 await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.FB);
//                 await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.IG);
//                 await MongoManager.removeUserMongoData(req.user.id, D_TYPE.FB);
//                 await MongoManager.removeUserMongoData(req.user.id, D_TYPE.IG);
//                 break;
//             // case D_TYPE.IG:
//             //     await revokeFbPermissions(key);
//             //     await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.IG);
//             //     break;
//             case D_TYPE.GA:
//             case D_TYPE.YT:
//                 await revokeGaPermissions(key);
//                 await GaToken.destroy({where: {user_id: req.user.id}});
//                 await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.GA);
//                 await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.YT);
//                 await MongoManager.removeUserMongoData(req.user.id, D_TYPE.GA);
//                 await MongoManager.removeUserMongoData(req.user.id,D_TYPE.YT);
//                 break;
//         }
//
//         return res.status(HttpStatus.OK).send({
//             revoked: true,
//             service: DS_TYPE[type],
//             type: type
//         })
//
//     } catch (e) {
//         console.error(e);
//         return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
//             name: 'Error on revoking permissions',
//             message: 'An error occurred while revoking the permissions to the service with id ' + req.params.type
//         })
//     }
// };

/** TOKENS CRUD**/





module.exports = {
    permissionGranted,
};
