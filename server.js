const express = require("express");
const bodyParser = require("body-parser");
const pgp = require("pg-promise")();

const cors = require("cors");
const bcrypt = require("bcrypt");

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const saltRounds = 10;

const Controller = require("./Controller");

const db = pgp("postgres://postgres:test123@localhost:5432/blog");

const app = express();

// pg_ctl -D "C:\Program Files\PostgreSQL\11\data" start

// app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(cors());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
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

const store = new pgSession({
  pgPromise: db,
});

app.use(
  session({
    // store: new pgSession({
    //   pgPromise: db,
    //   // tableName: 'user_sessions'
    // }),
    store,
    // name: '_somecookie',
    name: "user_sid",
    secret: "catdog",
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: false,
      // sameSite: 'none',
      httpOnly: false,
      // maxAge: 60000
      maxAge: 5 * 60 * 1000, // 5 minutes: min * second * millisecond
    },
  })
);

app.use((req, res, next) => {
  console.log("user: ", req.session.user);
  console.log("session: ", req.sessionID);

  next();
});

//powershell
//$env:PORT="3005" ; node server.js
const PORT = process.env.PORT || 3005;
const NODE_ENV = process.env.NODE_ENV || "development";

const DB_PASSWORD = process.env["DB_PASSWORD"];

const sessionChecker = (req, res, next) => {
  if (req.session.user && req.sessionID) {
    store.get(req.sessionID, (err, session) => {
      if (session) {
        next();
      } else if (!session) {
        res.clearCookie("user_sid");
        req.session.destroy(function (err) {
          if (err) {
            console.log(err);
          } else {
            res.status(400).json({ status: false, comment: "Invalid Session" });
          }
        });
      } else {
        console.log("Auth Error: ", err);
        res.clearCookie("user_sid");
        req.session.destroy(function (err) {
          if (err) {
            console.log(err);
          } else {
            res.status(400).json({ status: false, comment: "Auth Error" });
          }
        });
      }
    });
  } else {
    res.clearCookie("user_sid");
    req.session.destroy(function (err) {
      if (err) {
        console.log(err);
      } else {
        res
          .status(400)
          .json({ status: false, comment: "Please Sign In Again" });
      }
    });
  }
};

const deleteCookieSession = (res, req) => {
  res.clearCookie("user_sid");
  req.session.destroy(function (err) {
    if (err) {
      console.log(err);
    } else {
      // res.status(400).json("Invalid Session");
    }
  });
};

app.get("/", Controller.getInitial(db, pgp));

app.get("/auth", (req, res) => {
  if (req.session.user && req.sessionID) {
    store.get(req.sessionID, (err, session) => {
      if (session) {
        res
          .status(200)
          .json({ username: req.session.user, user_id: req.session.user_id });
      } else if (!session) {
        res.clearCookie("user_sid");
        req.session.destroy(function (err) {
          if (err) {
            console.log(err);
          } else {
            res.status(400).json("Invalid Session");
          }
        });
      } else {
        console.log("Auth Error: ", err);
        res.clearCookie("user_sid");
        req.session.destroy(function (err) {
          if (err) {
            console.log(err);
          } else {
            res.status(400).json("Auth Error");
          }
        });
      }
    });
  } else {
    res.clearCookie("user_sid");
    req.session.destroy(function (err) {
      if (err) {
        console.log(err);
      } else {
        res.status(400).json("No Login Detected");
      }
    });
  }
});

app.get("/maxPostCount", Controller.getMaxPostCount(db));

// app.put('/register', (req, res) => Controller.registerUser(db, req, res, bcrypt, saltRounds));
app.put("/register", Controller.registerUser(db, bcrypt, saltRounds));

app.post("/signin", Controller.signInUser(db, bcrypt));

app.get("/getPosts", Controller.getPosts(db));
app.get("/getPosts/:page", Controller.getPosts(db, pgp));

app.put("/submitPost", sessionChecker, Controller.submitPost(db));

app.get("/user/:user", Controller.getUser(db));

app.get("/logout", (req, res, next) => {
  // res.clearCookie('user_sid', {path: '/'});
  res.clearCookie("user_sid");

  if (req.session.user) {
    // res.clearCookie('user_sid', {domain: '127.0.0.1', path: '/'});
    req.session.destroy(function (err) {
      if (err) {
        console.log(err);
      } else {
        res.status(200).json({ status: "Logged Out" });
        // res.clearCookie('user_sid', {domain: 'localhost:3000', path: '/'});
      }
    });
  } else {
    // res.redirect('/login');
  }
});

app.listen(PORT, () => {
  console.log(`Server started on Port ${PORT}.`);
});
