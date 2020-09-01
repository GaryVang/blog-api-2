const getInitial = (db) => async (req, res) => {
  let postCount;
  let postList;
  const OFFSET = 5 * (req.params.page - 1) || 0;

  await db
    .one("SELECT count(*)  FROM posts")
    .then((result) => {
      postCount = parseInt(result.count);
      // res.status(200).json(parseInt(result.count));
    })
    .catch((error) => {
      console.log("Error: ", error);
      // res.status(400).json('Error: DB has no posts');
      postCount = 0;
    });

  await db.many(
    "SELECT username, post_id, title, body, to_char(post_date, $3) as post_date FROM posts INNER JOIN users ON posts.user_id=users.user_id ORDER BY post_date desc LIMIT 5 OFFSET $1",
    [OFFSET, "second", "YYYY-MM-DD HH12:MI:SS AM (TZ)"]
  )
    .then((result) => {
      postList = result;
    //   res.status(200).json({ status: true, data: result });
    })
    .catch((error) => {
      // error;
      console.log("Error: ", error.result);
      res.status(400).json({ status: false, comment: "Error: No blog posts retrieved" });
    });

    res.status(200).json({postList: postList, postCount: postCount});
};

//Add a layer of validation
const registerUser = (db, bcrypt, saltRounds) => (req, res) => {
  // const registerUser = (db, req, res, bcrypt, saltRounds)  => {

  const USERNAME = req.body.username;
  const PASSWORD_TEXT = req.body.password;

  db.many("SELECT username FROM users WHERE username=$1", [USERNAME])
    .then(() => {
      console.log("Failure: User Already Exists");
      res.status(200).json({ status: false, comment: "User Already Exists" });
    })
    .catch((error) => {
      // error;
      bcrypt.hash(PASSWORD_TEXT, saltRounds, function (err, hash) {
        db.none("INSERT INTO users(username, password) VALUES($1, $2)", [
          USERNAME,
          hash,
        ])
          .then(() => {
            // success;
            // res.json('User Registration Successful');
            res
              .status(200)
              .json({ status: true, comment: "User Registration Successful" });
            console.log("Success: ", USERNAME, PASSWORD_TEXT, hash);
          })
          .catch((error) => {
            // error;
            console.log("Error: User Registration Failed. ", error);
            res
              .status(400)
              .json({
                status: false,
                comment: "SignIn Failed: Wrong Password",
              });
          });
      });
    });

  // bcrypt.hash(PASSWORD_TEXT, saltRounds, function(err, hash) {
  //     db.none('INSERT INTO users(username, password) VALUES($1, $2)', [USERNAME, hash])
  //         .then(() => {
  //             // success;
  //             // res.json('User Registration Successful');
  //             res.status(200).json({status: true, comment:'User Registration Successful'});
  //             console.log('Success: ', USERNAME, PASSWORD_TEXT, hash);
  //         })
  //     .catch(error => {
  //         // error;
  //         console.log('Error: User Registration Failed. ', error);
  //         res.status(400).json({status: false, comment: 'SignIn Failed: Wrong Password'});
  //     });
  // });
};

//Add a layer of validation
const signInUser = (db, bcrypt) => (req, res) => {
  // req.session.dodo = 1;
  // req.session.user = 'OPGG';
  // console.log('outside: ', req.session);
  if (req.session.views) {
    req.session.views++;
  } else {
    req.session.views = 1;
  }

  // console.log('req: ', req.body);
  const USERNAME = req.body.username;
  const PASSWORD_TEXT = req.body.password;

  db.one("SELECT user_id, password FROM users WHERE username=$1", [USERNAME])
    .then((qResult) => {
      const PASSWORD_HASH = qResult.password;

      bcrypt.compare(PASSWORD_TEXT, PASSWORD_HASH, function (err, cResult) {
        if (cResult) {
          // res.json('SignIn Successful', USERNAME);
          // res.status(200).json(USERNAME);
          // console.log('inside: ', req.session);
          // req.session.user = 'bart1112';
          req.session.user = USERNAME;

          res
            .status(200)
            .json({
              status: true,
              user_id: qResult.user_id,
              username: USERNAME,
              comment: USERNAME + " SignIn Successful",
            });
        } else {
          res
            .status(400)
            .json({ status: false, comment: "SignIn Failed: Wrong Password" });
        }
      });
    })
    .catch((error) => {
      // error;
      console.log("Error: ", error);
      res
        .status(400)
        .json({ status: false, comment: "Error: User does not exist." });
    });
};

const getPosts = (db) => (req, res) => {
  console.log("User: ", req.session.user);
  // const OFFSET = req.body.offset;
  const OFFSET = 5 * (req.params.page - 1) || 0;
  // const PAGE = req.params.page - 1;
  // console.log('page: ', req.params.page);
  // console.log('offset :', OFFSET);

  // let maxPosts;
  // let postArr;

  // await db.one('SELECT count(*) as max_post_count FROM posts')
  // .then(result => {
  //     console.log('max_post_count', result);
  //     maxPosts = result;
  // })
  // .catch(error => {
  //     // error;
  //     console.log('Error: ', error);
  //     res.status(400).json('Error: DB has no posts');
  // });

  db.many(
    "SELECT username, post_id, title, body, to_char(post_date, $3) as post_date FROM posts INNER JOIN users ON posts.user_id=users.user_id ORDER BY post_date desc LIMIT 5 OFFSET $1",
    [OFFSET, "second", "YYYY-MM-DD HH12:MI:SS AM (TZ)"]
  )
    .then((result) => {
      // console.log(result);
      // postArr = result;
      res.status(200).json({ status: true, data: result });
    })
    .catch((error) => {
      // error;
      console.log("Error: ", error.result);
      res
        .status(400)
        .json({ status: false, comment: "Error: No blog posts retrieved" });
    });

  // res.status(200).json({maxPosts: maxPosts, postArr: postArr});
};

const submitPost = (db) => (req, res) => {
  const TITLE = req.body.title;
  const CONTENT = req.body.content;
  const USER_ID = req.body.user_id;

  db.none("INSERT INTO posts(title, body, user_id) VALUES($1, $2, $3)", [
    TITLE,
    CONTENT,
    USER_ID,
  ])
    .then(() => {
      // success;
      // res.json('Post Submition Successful');
      res
        .status(200)
        .json({ status: true, comment: "Post Submition Successful" });
      console.log("Success: ", TITLE, CONTENT, USER_ID);
    })
    .catch((error) => {
      // error;
      console.log("Error: Post Submition Failed ", error);
      res.status(400).json({ status: false, comment: "Post Submition Failed" });
    });

  // db.none('INSERT INTO users(username, password) VALUES($1, $2)', [USERNAME, hash])
  //         .then(() => {
  //             // success;
  //             res.json('User Registration Successful');
  //             console.log('Success: ', USERNAME, PASSWORD_TEXT, hash);
  //         })
  // .catch(error => {
  //     // error;
  //     console.log('Error: User Registration Failed. ', error);
  //     res.status(400).json('SignIn Failed: Wrong Password');
  // });
};

const getMaxPostCount = (db) => (req, res) => {
  //  if (req.session.views) {
  //         req.session.views++;
  //       }
  //       else {
  //         req.session.views = 1;
  //       }
  //       res.send(`${req.session.views} views`);

  db.one("SELECT count(*)  FROM posts")
    .then((result) => {
      // console.log('max_post_count', parseInt(result.count));
      // maxPosts = result;
      res.status(200).json(parseInt(result.count));
    })
    .catch((error) => {
      // error;
      console.log("Error: ", error);
      res.status(400).json("Error: DB has no posts");
    });
};

module.exports = {
  getInitial,
  registerUser,
  signInUser,
  getPosts,
  submitPost,
  getMaxPostCount,
};
