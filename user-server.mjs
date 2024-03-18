

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

//server.get('/', hello_world_func);

// extra not needed from book
function hello_world_func(req, res, next) {
    console.log("hello started");

    res.send('hello I am ' + req.params.name);
    
}


// Create a user record
server.post('/create-user', (req, res, next) => {


    runProcess(req, res, next);


    //try {
    //    //log('create-user params ' + util.inspect(req.params));
    //    console.log(req.body);
    //    //connectDB();
    //    let result = req.body;
    //    console.log(result);
    //    //let result = createUser(req);
    //    //log('created ' + util.inspect(result));
    //    //res.contentType = 'json';
    //    res.send(result);
    //    next(false);
    //} catch (err) {
    //    console.log("hawk feather2");
    //    res.send(500, err);
    //    console.log("error");
    //    // error(`/create-user ${err.stack}`);
    //    next(false);
    //}
});

async function runProcess(req, res, next) {
    try {
        log('create-user params ' + util.inspect(req.params));
        console.log(req.body);
        await connectDB();
        
        let result = createUser(req);
        log('created ' + util.inspect(result));
        res.contentType = 'json';
        res.send(result);
        next(false);
    } catch (err) {
        console.log("hawk feather2");
        res.send(500, err);
        console.log("error");
        error(`/create-user ${err.stack}`);
        next(false);
    }
}



// Find a user, if not found create one given profile information


//server.post('/find-or-create', async (req, res, next) => {
//    //log('find-or-create ' + util.inspect(req.params));
//    try {
//        await connectDB();
//        let user = await findOneUser(req.params.username);
//        if (!user) {
//            user = await createUser(req);
//            if (!user) throw new Error('No user created');
//        }
//        //log('find-or-created ' + util.inspect(user));
//        res.contentType = 'json';
//        res.send(user);
//        return next(false);
//    } catch (err) {
//        res.send(500, err);
//        //error(`/find-or-create ${err.stack}`);
//        next(false);
//    }
//});

server.get('/find/:username',(req, res, next) => {

    runProcess2(req, res, next);
});




async function runProcess2(req, res, next) {


    try {
        await connectDB();
        const user = await findOneUser(req.params.username);
        if (!user) {
            res.send(404, new Error("Did not find req.params.username"));
        }
        else {
            res.contentType = 'json';
            res.send(user);
        }
        next(false);

    } catch(err) {
        res.send(500, err);
        next(false);
    }



}


server.post('/find-or-create', (req, res, next) => {


    runProcess3(req, res, next);

}); 



async function runProcess3(req, res, next) {

    try {
        await connectDB();
        let user = await findOneUser(req.params.username);
        

        if (!user) {
            user = await createUser(req);
            if (!user) throw new Error('No user created');
        }


        res.contentType = 'json';
        res.send(user);
        return next(false);

    } catch (err) {

        res.send(500, err);
        next(false);

    }
    

}




server.get('/list', (req, res, next) => {

     runProcess4(req, res, next);


});



async function runProcess4(req, res, next) {



    try {
        await connectDB();
        let userlist = await SQUser.findAll({});
        userlist = userlist.map(user => sanitizedUser(user));
        if (!userlist) userlist = [];
        res.conentType = 'json';
        res.send(userlist);
        return next(false);
    } catch(err) {
        res.send(500, err);
        next(false);
    }


}


server.post('/update-user/:username', (req, res, next) => {

    runProcess5(req, res, next);

});



async function runProcess5(req, res, next) {

    try {
             await connectDB();
             let toupdate = userParams(req);
             console.log("req    " + req);
        console.log("toupdate " + toupdate);
             console.log("req.params.username " + req.params.username);
             await SQUser.update(toupdate, { where: { username: req.params.username } });
             console.log("SQUser spot");
             const result = await findOneUser(req.params.username);
             res.contentType = 'json';
             console.log("result" + result );
             res.send(result);
             next(false);
        

    } catch (err) {
        res.send(500, err);
        next(false);
    }
}



server.del('/destroy/:username', (req, res, next) => {

        runProcess6(req, res, next);

})



async function runProcess6(req, res, next) {


      try {
          await connectDB();
          const user = await SQUser.findOne({ where: { username: req.params.username } });
          if (!user) {
              res.send(404, new Error('User not found'));
          }
          else {
              user.destroy();
              res.conentType = 'json';
              res.send({});
          }          
          next(false);

     } catch (err) {
          res.send(500, err);
          next(false);
     }
     
}



server.post('/password-check', (req, res, next) => {

    runProcess7(req, res, next);



    });


async function runProcess7(req, res, next) {

    try {
        await connectDB();
        const user = await SQUser.findOne({ where: { username: req.params.username } });
        let checked;
        if (!user) {
            checked = {
                check: false, username: req.params.username, message: 'User not found'
            };

        } else if (user.username === req.params.username && user.password === req.params.password) {
            checked = {
                check: true, username: user.username
            };
        } else {
            checked = {
                check: false, username: req.params.username, message: 'Incorrect password'
            };

        }

        res.conentType = 'json';
        res.send(checked);
        next(false);
    } catch (err) {

        res.send(500, err);
        next(false);
    }

}
