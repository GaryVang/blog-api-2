const getInitial = (db, pgp) => async (req, res) => {
  let postCount;
  let postList;
  // let categoryList;
  const OFFSET = 5 * (req.params.page - 1) || 0;

  let where = "";
  let whereCount = "";
  if (req.query.username) {
    where = pgp.as.format("WHERE username=$1", [req.query.username]);
    whereCount = pgp.as.format(
      "INNER JOIN users ON posts.user_id=users.user_id WHERE username=$1",
      [req.query.username]
    );
  }

  await db
    .one("SELECT count(post_id) FROM posts $1:raw", [whereCount])
    .then((result) => {
      postCount = parseInt(result.count);
    })
    .catch((error) => {
      // res.status(400).json('Error: DB has no posts');
      postCount = 0;
    });

  //Order by post_date error
  // HH12 does not order correctly: 12AM > 1AM
  await db
    .any(
      "SELECT username, post_id, title, body, to_char(post_date, $3) as post_date, category_id, posts_categories.name as category_name FROM posts INNER JOIN posts_categories ON posts_categories.cat_id=posts.category_id INNER JOIN users ON posts.user_id=users.user_id $4:raw ORDER BY post_date desc LIMIT 5 OFFSET $1",
      [OFFSET, "second", "YYYY-MM-DD HH12:MI:SS AM (TZ)", where]
    )
    .then((result) => {
      postList = result;
      //   res.status(200).json( { status: true, data: result });
    })
    .catch((error) => {
      // error;
      res
        .status(400)
        .json({ status: false, comment: "Error: No blog posts retrieved" });
    });

    //----Category
    // await db
    //   .many("SELECT cat_id, name FROM posts_categories")
    //   .then((result) => {
    //     categoryList = result;
    //   })
    //   .catch((error) => {
    //     res.status(400).json('Error: DB has no post categories');
    // });
    //--------Category End

  res.status(200).json({ postList: postList, postCount: postCount });
};

//Add a layer of validation
const registerUser = (db, bcrypt, saltRounds) => (req, res) => {
  // const registerUser = (db, req, res, bcrypt, saltRounds)  => {

  const USERNAME = req.body.username;
  const PASSWORD_TEXT = req.body.password;

  db.many("SELECT username FROM users WHERE username=$1", [USERNAME])
    .then(() => {
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
          })
          .catch((error) => {
            res.status(400).json({
              status: false,
              comment: "SignIn Failed: Wrong Password",
            });
          });
      });
    });
};

//Add a layer of validation
const signInUser = (db, bcrypt) => (req, res) => {
  if (req.session.views) {
    req.session.views++;
  } else {
    req.session.views = 1;
  }

  const USERNAME = req.body.username;
  const PASSWORD_TEXT = req.body.password;

  db.one("SELECT user_id, password FROM users WHERE username=$1", [USERNAME])
    .then((qResult) => {
      const PASSWORD_HASH = qResult.password;

      bcrypt.compare(PASSWORD_TEXT, PASSWORD_HASH, function (err, cResult) {
        if (cResult) {
          req.session.user = USERNAME;
          req.session.user_id = qResult.user_id;

          res.status(200).json({
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
      res
        .status(400)
        .json({ status: false, comment: "Error: User does not exist." });
    });
};

const getPosts = (db, pgp) => (req, res) => {
  let where = "";

  if (req.query.username) {
    where = pgp.as.format("WHERE username=$1", [req.query.username]);
  }

  const OFFSET = 5 * (req.params.page - 1) || 0;

  db.many(
    "SELECT username, post_id, title, body, to_char(post_date, $3) as post_date, category_id, posts_categories.name as category_name FROM posts INNER JOIN posts_categories ON posts_categories.cat_id=posts.category_id INNER JOIN users ON posts.user_id=users.user_id $4:raw ORDER BY post_date desc LIMIT 5 OFFSET $1",
    [OFFSET, "second", "YYYY-MM-DD HH12:MI:SS AM (TZ)", where]
  )
    .then((result) => {
      res.status(200).json({ status: true, data: result });
    })
    .catch((error) => {
      res
        .status(400)
        .json({ status: false, comment: "Error: No blog posts retrieved" });
    });
};

const submitPost = (db) => (req, res) => {
  const TITLE = req.body.title;
  const CONTENT = req.body.content;
  const USER_ID = req.body.user_id;
  const CATEGORY_ID = req.body.category_id;

  db.none("INSERT INTO posts(title, body, user_id, category_id) VALUES($1, $2, $3, $4)", [
    TITLE,
    CONTENT,
    USER_ID,
    CATEGORY_ID,
  ])
    .then(() => {
      res
        .status(200)
        .json({ status: true, comment: "Post Submition Successful" });
    })
    .catch((error) => {
      res.status(400).json({ status: false, comment: "Post Submition Failed" });
    });
};

const getMaxPostCount = (db) => (req, res) => {
  db.one("SELECT count(*)  FROM posts")
    .then((result) => {
      res.status(200).json(parseInt(result.count));
    })
    .catch((error) => {
      res.status(400).json("Error: DB has no posts");
    });
};

const getUser = (db) => (req, res) => {
  const USERNAME = req.params.user;

  //returns null on fail
  db.oneOrNone(
    "SELECT username, to_char(join_date, $2) as join_date, count(posts.post_id) as posts FROM users LEFT JOIN posts ON posts.user_id=users.user_id WHERE users.username = $1 GROUP BY username, join_date",
    [USERNAME, "YYYY-MM-DD HH12:MI:SS AM (TZ)"]
  )
    .then((result) => res.status(200).json(result))
    .catch((error) => {
      res.status(400).json(null);
    });
};

module.exports = {
  getInitial,
  registerUser,
  signInUser,
  getPosts,
  submitPost,
  getMaxPostCount,
  getUser,
};
