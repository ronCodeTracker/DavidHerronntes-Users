

import restify from 'restify';
import * as util from 'util';
import {
    SQUser, connectDB, userParams, findOneUser,
    createUser, sanitizedUser
} from './users-sequelize.mjs';

import DBG from 'debug';
const log = DBG('users:service');
const error = DBG('users:error'); 

///////////// Set up the REST server

var server = restify.createServer({
    name: "User-Auth-Service",
    version: "0.0.1"
});


server.use(restify.plugins.authorizationParser());
server.use(check);
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({
    mapParams: true
}));



server.listen(process.env.PORT, "localhost", function () {
    log(server.name + ' listening at ' + server.url);
});

process.on('uncaughtException', function (err) {
    console.error("UNCAUGHT EXCEPTION - " + (err.stack || err));
    process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
    console.error(`UNHANDLED PROMISE REJECTION: ${util.inspect(p)} reason: ${reason}`);
    process.exit(1);
});


// Mimic API Key authentication


var apiKeys = [{ user: 'them', key: 'D4ED43C0-8BD6-4FE2-B358-7C0E230D11EF' }];



function check(req, res, next) {
    
    if (req.authorization && req.authorization.basic) {
        var found = false;
        for (let auth of apiKeys) {
            if (auth.key === req.authorization.basic.password
                && auth.user === req.authorization.basic.username) {
                found = true;
                break;
            }
        }
        if (found) next();
        else {
            res.send(401, new Error("Not authenticated"));
            
            next(false);
        }
    } else {
        res.send(500, new Error('No Authorization Key'));
        
        next(false);
    }
}




// Create a user record
server.post('/create-user', async (req, res, next) => {
    try {
        //log('create-user params ' + util.inspect(req.params));
        await connectDB();
        let result = await createUser(req);
        //log('created ' + util.inspect(result));
        res.contentType = 'json';
        res.send(result);
        next(false);
    } catch (err) {
        res.send(500, err);
        // error(`/create-user ${err.stack}`);
        next(false);
    }
});





// Find a user, if not found create one given profile information


server.post('/find-or-create', async (req, res, next) => {
    //log('find-or-create ' + util.inspect(req.params));
    try {
        await connectDB();
        let user = await findOneUser(req.params.username);
        if (!user) {
            user = await createUser(req);
            if (!user) throw new Error('No user created');
        }
        //log('find-or-created ' + util.inspect(user));
        res.contentType = 'json';
        res.send(user);
        return next(false);
    } catch (err) {
        res.send(500, err);
        //error(`/find-or-create ${err.stack}`);
        next(false);
    }
});
