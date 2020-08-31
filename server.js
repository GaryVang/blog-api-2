const express = require('express');
const bodyParser = require('body-parser');
const pgp = require('pg-promise')();

const cors = require('cors');
const bcrypt = require('bcrypt');

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const saltRounds = 10;

const Controller = require('./Controller');

const db = pgp('postgres://postgres:test123@localhost:5432/blog');

const app = express();

// pg_ctl -D "C:\Program Files\PostgreSQL\11\data" start

// app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(cors());
app.use(cors({credentials: true, origin: 'http://localhost:3000'}));
// app.set('trust proxy', 1)

// app.use(function(req, res, next) {
//     // res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Credentials', true);
//     res.header(
//         'Access-Control-Allow-Headers',
//         'Origin, X-Requested-With, Content-Type, Accept'
//     );
//     next();
// });

app.use(
    session({
        store: new pgSession({
            pgPromise: db
            // tableName: 'user_sessions'
        }),
        // name: '_somecookie',
        key: 'user_sid',
        secret: "catdog",
        saveUninitialized: false,
        resave: false,
        cookie: {
            secure: false,
            // sameSite: 'none',
            httpOnly: false,
            // maxAge: 60000
            maxAge: 5 * 60 * 1000 // 5 minutes: min * second * millisecond
        }
    })
);

app.use((req, res, next) => {
    console.log('user: ', req.session.user);
    console.log('session: ', req.sessionID);

    next();
});

//powershell
//$env:PORT="3005" ; node server.js
const PORT = process.env.PORT || 3005;
const NODE_ENV = process.env.NODE_ENV || 'development';

const DB_PASSWORD = process.env["DB_PASSWORD"];


const sessionChecker = (req, res, next) => {
    if (req.session.user && req.headers.cookie.includes('user_sid')) {
    // if (req.session.user && req.session.cookie.user_sid) {
    // if (req.session.user) {
        // res.redirect('/dashboard');
        console.log('today: ', req.session.user);
        // res.status(200).json({username: req.session.user});
        next();
    } else {
        // console.log('req.session.cookie: ',  req.headers.cookie.split('='));
        // console.log('req.session.cookie: ',  req.headers.cookie.includes('user_sid'));
        next();
    }    
};

app.get('/', sessionChecker, (req, res) => {
    // res.json('Hello World');
    if (req.session.user) {
        // res.redirect('/dashboard');
        console.log('today: ', req.session.user);
        res.status(200).json({username: req.session.user});
    } else {
        // console.log(555555);
        // res.clearCookie('user_sid');
        // next();
        res.status(400).json("No Valid Login");
    }   

    // res.status(200).json({username: req.session.user});
    // if (req.session.views) {
    //     req.session.views++;
    //   }
    //   else {
    //     req.session.views = 1;
    //   }
    //   res.send(`${req.session.views} views`);
});

app.get('/maxPostCount', Controller.getMaxPostCount(db));

// app.put('/register', (req, res) => Controller.registerUser(db, req, res, bcrypt, saltRounds));
app.put('/register', Controller.registerUser(db, bcrypt, saltRounds));

app.post('/signin', Controller.signInUser(db, bcrypt));

app.get('/getPosts', Controller.getPosts(db));
app.get('/getPosts/:page', sessionChecker, Controller.getPosts(db));

app.put('/submitPost', Controller.submitPost(db));

app.get('/logout', (req, res, next) => {
    // res.clearCookie('user_sid', {path: '/'});
    // console.log('logout user: ', req.session.user);
    res.clearCookie('user_sid');
    // console.log('2logout user: ', req.sessionID);
    if (req.session.user) {
        // res.clearCookie('user_sid', {domain: '127.0.0.1', path: '/'});
        req.session.destroy(function(err){
            if(err){
               console.log(err);
            }else{
                res.status(200).json({status:'Logged Out'});
                // res.clearCookie('user_sid', {domain: 'localhost:3000', path: '/'});
            }
         });
        // console.log('destroy: ', req.session);
        // res.redirect('/');
    } else {
        // res.redirect('/login');
    }
});

app.listen(PORT, () => {
    console.log(`Server started on Port ${PORT}.`);
});