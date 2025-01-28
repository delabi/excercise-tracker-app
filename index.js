const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI);

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  _id: { type: String, default: uuidv4, required: true }
});

const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: () => Date.now() },
  _id: { type: String, default: uuidv4, required: true },
})

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  try {
    const newUser = new User({ username });
    const data = await newUser.save();
    res.json({ username: data.username, _id: data._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user' });
    console.log(error);
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;

  try {
    const userFrmDB = await User.findById(_id);
    const username = userFrmDB.username;
    const user_id = userFrmDB._id;
    const exercise = new Exercise({ user_id, username, description, duration, date: date || undefined });
    const data = await exercise.save();
    res.json({ _id: data.user_id, username: data.username, description: data.description, duration: data.duration, date: data.date });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save exercise' });
    console.log(error);
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  console.log("Req Query: ", req.query);

  console.log("Extras:" + from, to, limit);

  try {
    const userById = await User.findById(_id);
    if(!userById) {
      return res.status(404).json({ error: 'User not found' });
    }
    const username = userById.username;

    let query = { user_id: _id };

    if(from || to) {
      query.date = {};
      if(from) {
        query.date.$gte = new Date(from);
      }
      if(to) {
        query.date.$lte = new Date(to);
      }
    }

    let exerciseQuery = Exercise.find(query);
    
    if(limit) {
      exerciseQuery.limit(parseInt(limit));
    }

    const exercises = await exerciseQuery.exec();
    count = exercises.length;

    const formattedLog = exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date ? new Date(exercise.date).toDateString() : null
    }));
    res.json({ _id, username, from, to, count, log: formattedLog });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exercises' });
    console.log(error);
  }
});

const listener = app.listen(process.env.PORT || 3002, () => {
  console.log('Your app is listening on port ' + listener.address().port);
})
