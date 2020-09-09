const express = require("express");
const bodyParser = require("body-parser");
const pgp = require("pg-promise")();

const cors = require("cors");
const bcrypt = require("bcrypt");

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const saltRounds = 10;

const Controller = require("./Controller");

// const db = pgp("postgres://postgres:test123@localhost:5432/blog");
const db = pgp(process.env.DATABASE_URL);

const app = express();

app.use(bodyParser.json());
// app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cors({ credentials: true }));

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
    name: "user_sid",
    secret: "catdog",
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: false,
      // sameSite: 'none',
      httpOnly: false,
      maxAge: 15 * 60 * 1000, // 15 minutes: min * second * millisecond
    },
  })
);

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
            // console.log(err);
          } else {
            res.status(400).json({ status: false, comment: "Invalid Session" });
          }
        });
      } else {
        res.clearCookie("user_sid");
        req.session.destroy(function (err) {
          if (err) {
            // console.log(err);
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
        // console.log(err);
      } else {
        res
          .status(400)
          .json({ status: false, comment: "Please Sign In Again" });
      }
    });
  }
};

// const deleteCookieSession = (res, req) => {
//   res.clearCookie("user_sid");
//   req.session.destroy(function (err) {
//     if (err) {
//       console.log(err);
//     } else {
//       // res.status(400).json("Invalid Session");
//     }
//   });
// };

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
            // console.log(err);
          } else {
            res.status(400).json("Invalid Session");
          }
        });
      } else {
        res.clearCookie("user_sid");
        req.session.destroy(function (err) {
          if (err) {
            // console.log(err);
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
        // console.log(err);
      } else {
        res.status(400).json("No Login Detected");
      }
    });
  }
});

app.get("/maxPostCount", Controller.getMaxPostCount(db));

app.put("/register", Controller.registerUser(db, bcrypt, saltRounds));

app.post("/signin", Controller.signInUser(db, bcrypt));

app.get("/getPosts", Controller.getPosts(db));
app.get("/getPosts/:page", Controller.getPosts(db, pgp));

app.put("/submitPost", sessionChecker, Controller.submitPost(db));

app.get("/user/:user", Controller.getUser(db));

app.get("/logout", (req, res, next) => {
  res.clearCookie("user_sid");

  if (req.session.user) {
    req.session.destroy(function (err) {
      if (err) {
        // console.log(err);
      } else {
        res.status(200).json({ status: "Logged Out" });
      }
    });
  }
});

app.listen(PORT, () => {
  // console.log(`Server started on Port ${PORT}.`);
});
