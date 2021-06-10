'use strict';

const fs = require('fs');

const DashboardManager = require('./dashboard-manager');
const Model = require('../models');
const User = require('../models/index').Users;
const passport = require('../app').passport;
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto-random-string');
const jwt = require('jsonwebtoken');

const HttpStatus = require('http-status-codes');

/** USER CRUD **/

const createUser = async (req, res) => {
    const Op = Model.Sequelize.Op;
    const user = req.body;
    const password = bcrypt.hashSync(user.password);
    const token = crypto({length: 30});

    User.findAll({
        where: {
            [Op.or]: [
                {username: user.username},
                {email: user.email}
            ]
        }
    })
        .then(userbn => {
            // user !== null then a username or an email already exists in the sistem
            // the registration has to be rejected
            if (userbn.length !== 0) {
                return res.status(HttpStatus.BAD_REQUEST).send({
                    created: false,
                    error: 'Username or email already exists',
                });
            } else {
                User.create({
                    username: user.username,
                    email: user.email,
                    company_name: user.company_name,
                    vat_number: user.vat_number,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    birth_place: user.birth_place,
                    birth_date: user.birth_date || user.birth_date !== '' ? new Date(user.birth_date) : null,
                    fiscal_code: user.fiscal_code,
                    address: user.address,
                    province: user.province,
                    city: user.city,
                    zip: user.zip,
                    password: password,
                    user_type: 0,
                    is_verified: true,
                    token: token,
                    checksum: '0'
                })
                    .then(newUser => {

                        const user_id = newUser.get('id');
                    //     DashboardManager.internalCreateDefaultDashboards(user_id)
                    //         .then(() => {
                    //             //if (!is_verified)
                    //             try {
                    //                 // TODO FIX: ripristinare sendmail
                    //                 //sendMail(res, user.email, token);
                    //             }
                    //             catch (err) {
                    //                 console.error("Cannot send the email. Probably, the SMTP server is not active in this machine.");
                    //                 //console.log(err);
                    //             }
                    //
                    //             return res.status(HttpStatus.CREATED).send({
                    //                 created: true,
                    //                 first_name: newUser.get('first_name'),
                    //                 last_name: newUser.get('last_name')
                    //             });
                    //         })
                    //         .catch(err => {
                    //             User.destroy({where: {id: user_id}}); // Deletes the new db row
                    //
                    //             console.log('ACCESS_MANAGER ERROR. Details below:');
                    //             console.error(err);
                    //             return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                    //                 created: false,
                    //                 message: 'Cannot create the new user',
                    //                 username: user.username
                    //             });
                    //         });
                        return res.status(HttpStatus.CREATED).send({
                            created: true,
                            username: newUser.get('username')
                        });
                    })
                    .catch(err => {
                        console.log('ACCESS_MANAGER ERROR. Details below:');
                        console.error(err);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                            created: false,
                            message: 'Cannot create the new user',
                            username: user.username
                        });
                    })
            }
        })
    ;
};

const getUserById = (req, res) => {
    User.findByPk(req.user.id)
        .then(user => {
            return res.status(HttpStatus.OK).send(user);
        })
        .catch(err => {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: true,
                message: 'Cannot GET the user informations'
            });
        })
};

const updateUser = (req, res) => {

    const user = req.body;
    const password = user.password ? bcrypt.hashSync(user.password) : null;

    Model.Users.update({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        city: user.city,
        zip: user.zip,
        lang: user.lang,
        password: password || req.user.password
    }, {
        where: {
            id: req.user.id
        }
    })
        .then(newUser => {
            return res.status(HttpStatus.OK).json({
                updated: true,
                user_id: req.user.id
            })
        })
        .catch(err => {
            console.error(err);

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                updated: false,
                user_id: req.user.id,
                error: 'Cannot update the user'
            })
        });
};

const deleteUser = (req, res) => {
    Model.Users.destroy({where: {user: req.body.username}})
        .then(() => {
            return res.status(HttpStatus.OK).json({
                deleted: true,
                username: parseInt(req.body.username)
            })
        })
        .catch(err => {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                deleted: false,
                user: req.body.username,
                message: 'Cannot delete the user'
            })
        })
};

/** INTERNAL METHODS **/
const getUserTypeByString = (stringType) => {
    let type;

    switch (stringType) {
        case 'company':
            type = 1;
            break;
        case 'editor':
            type = 2;
            break;
        case 'analyst':
            type = 3;
            break;
    }

    return type;
};


/** LOGIN METHODS **/
const basicLogin = (req, res, next) => {
    passport.authenticate('basic', {session: false}, function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({
                logged: false,
                error: 'unauthorized'
            })
        } else {
            const token = jwt.sign(user.dataValues, 'your_jwt_secret');

            if(user.is_verified) {
                return res.status(HttpStatus.OK).send({
                    'User': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'user_type': user.user_type
                    },
                    'token': token
                });
            } else {
                return res.status(HttpStatus.FORBIDDEN).send({
                    logged: false,
                    error: 'Account not verified'
                })
            }
        }
    })(req, res, next);
};
const roleAuth = function (roles) {
    return async (req, res, next) => {
        let user = req.user;
        let userFound;
        try {
            // userFound = await User.findById(user.id);
            userFound = await User.findByPk(user.id)
            if (roles.indexOf(userFound.user_type) > -1) {
                return next();
            }

            res.status(401).json({error: 'You are not authorized to view this content'});
            return next('Unauthorized');


        } catch (e) {
            res.status(422).json({error: 'No user found.'});
            return next(err);
        }
    }
};

/** METHOD EXPORT **/
module.exports = {createUser, getUserById, updateUser, deleteUser, basicLogin, roleAuth};
