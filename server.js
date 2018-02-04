require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const passport = require('passport');
const passportJWT = require("passport-jwt");
const cors = require('cors');

const {DATABASE_URL, PORT, CLIENT_ORIGIN} = require('./config');
const {QuestionPost} = require('./models');
const {AnswerPost} = require('./models');
const app = express();
const {router: usersRouter} = require('./users');
const {router: authRouter,localStrategy,jwtStrategy} = require('./auth');

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(express.static('public'))
// app.use(cors({origin: CLIENT_ORIGIN})
// );

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
  if (req.method === 'OPTIONS') {
    return res.send(204);
  }
  next();
});

app.use(passport.initialize());
passport.use('local', localStrategy);

passport.use(jwtStrategy);

app.use('/api/users/', usersRouter);
app.use('/api/auth/', authRouter);


mongoose.Promise = global.Promise;

const jwtAuth = passport.authenticate('jwt', {session: false});

app.get('/', (req,res) => {
  QuestionPost
  .find()
  .populate('comments')
  .then(question => {
    res.json(question);
  })
  .catch(err => {
    console.error(err);
    res.status(500).json({
      error: 'something went terribly wrong'
    });
  });
});

app.get('/questions/:topic', (req, res) => {
  QuestionPost
    .find({
      topic : req.params.topic
    })
    .populate('comments')
    .then(question => {
      res.json(question);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: 'something went terribly wrong'
      });
    });
});
app.get('/answers/', (req,res) => {
  AnswerPost
    .find()
    .then(comment => {
      res.json(comment);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        errpr: 'something went terribly terribly wrong'
      });
    });
});

app.post('/new', jwtAuth, (req, res) => {
  console.log('postnew');
  const requiredFields = ['question'];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`
      console.error(message);
      return res.status(400).send(message);
    }
  }

  QuestionPost
    .create({
      question: req.body.question,
      user: req.user.username,
      topic: req.body.topic
    })
    .then(questionPost => {
      console.log('res123',questionPost);
      res.status(201).json(questionPost.apiRepr());
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: 'Something went wrong'
      });
    });

});

app.post('/answers/:id', jwtAuth, (req, res) => {

  AnswerPost
    .create({
      comment: req.body.comment,
      user: req.user.username
    })
    .then(answer => {
      console.log(typeof(answer._id));
      QuestionPost
      .findById(req.params.id)
      .then(question => {
        answer._id = [answer._id];
        question.comments = question.comments.concat(answer._id);
        question.save();
      })
      return answer;  
    })
    .then(item => {
      res.status(200).json(item);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: 'Something went wrong'
      });
    });
});


app.delete('/answers/:id', (req, res) => {
  const requiredFields = ['id'];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`
      console.error(message);
      return res.status(400).send(message);
    }
  }

  AnswerPost
    .findByIdAndRemove(req.body.id)
    .then(answer => {
      QuestionPost
      .findById(req.params.id)
      .then(question => {
       let index = question.comments.indexOf(req.body.id)
       question.comments.splice(index,1);
       question.save();
      })
      return answer;
    })
    .then(item => {
      res.status(200).json(item);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: 'something went terribly wrong'
      });
    });
});

app.put('/answers/:id/q', jwtAuth, (req, res) => {

  // if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
  //   res.status(400).json({
  //     error: 'Request path id and request body id values must match'
  //   });
  // }

  const updated = {};
  const updateableFields = ['question'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });


  QuestionPost
    .findByIdAndUpdate(req.params.id, {
      $set: {
        question : req.body.question
      }
    }, {
      new: true
    })
    .then(updatedPost => res.status(200).json(updatedPost))
    .catch(err => res.status(500).json({
      message: 'Something went wrong'
    }));
});

app.put('/answers/:id/a', jwtAuth, (req, res) => {


  const updated = {};
  const updateableFields = ['comment'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });
// 


  AnswerPost
    .findByIdAndUpdate(req.body.id, {
      $set: {
        comment : req.body.comment
      }
    }, {
      new: true
    })
    .then(updatedPost => res.status(200).json(updatedPost))
    .catch(err => res.status(500).json({
      message: 'Something went wrong'
    }));
});

app.get('/protected', jwtAuth, (req, res) => {
  return res.json({
    data: 'rosebud'
  });
});


app.use('*', function (req, res) {
  res.status(404).json({
    message: 'Not Found'
  });
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl = DATABASE_URL, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
          resolve();
        })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer().catch(err => console.error(err));
};

module.exports = {
  runServer,
  app,
  closeServer
};