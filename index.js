(function () {

    var uuid = require('uuid');

    var users = [];
    var expirationTime = 1;
    var db = null;



    /**
    * User object
    * @param token
    * @param username
    * @constructor
    */
    function User(token, username) {
        this.token = token;
        this.refreshed = null;
        //this.expires = null;
        this.username = username;
        this.refresh();
    }

    /**
    * Refreshes token expiration time
    */
    User.prototype.refresh = function () {
        this.refreshed = new Date();
        /*this.expires = new Date();
        this.expires.setMinutes(this.expires.getMinutes()+1);
        console.log('this.expires:'+this.expires);*/
    }

    /**
    * Checks if users token is valid
    * @returns {boolean}
    */
    User.prototype.isValid = function () {
        if (this.token == undefined) {
            return false;
        } else {

            var exp = new Date(this.refreshed.getTime());
            exp.setMinutes(exp.getMinutes() + expirationTime);
            // fast clicking may give wrong time somehow?
            //console.log('expires at ' + exp);
            return (exp.getTime() >= (new Date()).getTime());

        }
    }
    /* Garbage collection -> removes expired users in every 10 minutes*/
    setInterval(function () {

        //here just get a list of all objects
        //iterate and call remove on each one

        for (var i = 0; i < users.length; i++) {

            if (!users[i].isValid) {

                db.del(users[i].token + '_refreshed');
                db.del(users[i].token + '_userid');
                //db.del(users[i].username);

            }

        }

        users = users.filter(function (item) {
            return item.isValid();
        });
        console.log("users");
        console.log(users);
    }, 10 * 60 * 1000 /* debug 5*1000*/);



    /**
    * Removes user
    * @param username
    */
    var removeUserByUsername = function (username) {


        db.get(username, function (err, token) {

            db.del(token + '_refreshed');
            db.del(token + '_userid');
            //db.del(username);
            console.log('removed user ' + username);
        });

    }

    /**
    * Add user to pool
    * @param token
    * @param username
    * @returns {User}
    */

    module.exports.addUser = function (username) {

        removeUserByUsername(username);

        var token = uuid.v4();
        var user = new User(token, username);
        users.push(user);

        db.set(token + '_userid', username);
        db.set(token + '_refreshed', new Date());
        //db.set(username, token);

        return user;
    }

    /**
    * Removes user from pool
    * @param username
    */
    module.exports.removeUser = function (username) {
        removeUserByUsername(username);
    }

    /**
    * Checks if token is still valid
    * @param token
    * @returns {boolean}
    */
    module.exports.isTokenValid = function (token, callback) {

        db.get(token + '_userid', function (err, userid) {

            var user = new User(token, userid);

            db.get(token + '_refreshed', function (err, refreshed) {

                user.refreshed = new Date(refreshed);

                var exp = new Date(user.refreshed.getTime());
                exp.setMinutes(exp.getMinutes() + expirationTime);
                // fast clicking may give wrong time somehow?
                //console.log('expires at ' + exp);

                var ret = exp.getTime() >= (new Date()).getTime();
                return callback(ret);

            });

        });



    }

    module.exports.setDb = function (database) {
        db = database;
    }


    /**
    * Sets new expiration time for token
    * @param time in minutes
    */
    module.exports.setExpirationTime = function (time) {
        expirationTime = time;
    }

    /**
    * Finds user from valid users based on token
    * @param token
    * @returns {User}
    */
    module.exports.findUserByToken = function (token, callback) {

        db.get(token + '_userid', function (err, userid) {
            var user = new User(token, userid);
            user.refresh();

            db.set(token + '_refreshed', new Date());

            return callback(user);
        });

    }

    /**
    * Finds user from valid users based on username
    * @param username
    * @returns {User}
    */
    module.exports.findUserByUsername = function (username) {

        db.get(username, function (err, token) {
            var user = new User(token, username);
            return user;
        });

    }
} ());
