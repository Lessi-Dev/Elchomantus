const express = require('express');
const mongooose = require('mongoose');
const fs = require('fs');
const axios = require('axios')

const config = require('./config.json');

const app = express();

mongooose.connect('mongodb://localhost:27017/lol-tracker')

const userSchema = new mongooose.Schema({
  name: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    required: true,
    min: 3,
    max: 5,
  },
  puuid: {
    type: String,
    min:78,
    max:78,
  },
  matches:{
    type: Array,
    default: []
  },
  lastMatchTracked: {
    type: String,
  }
})

userSchema.function('newRequest', function(){
  axios.get(`https://${config.server}.api.riotgames.com/lol/match/v5/matches/by-puuid/${this.puuid}/ids?start=0&count=100?api_key=${config.token}`)
  .then(res => {
    JSON.parse(res.data.body).forEach(match => {
      for (let i = this.matches.length; i > 0; i--) {
        if(this.matches[i] === match) {
          return;
        } else {
          this.matches.push(match)
        }
        if(i == 0) {
          this.lastMatchTracked = match;
        }
      }
    });
  })
  .catch(error => {
    console.error(error)
  })
})

userSchema.pre('save', function(next) {
  this.puuid = axios
  .get(`https://${config.server}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${this.name}/${this.tag}?api_key=${config.token}`)
  .then(res => {
    this.puuid = res.data.puuid;
    next();
  })
  .catch(error => {
    console.error(error)
  })
});

const User = mongooose.model('User', userSchema,"Users");

app.get('/setToken/:token', (req, res) => {
  config.token = req.params.token;
  fs.writeFile("src/config.json", JSON.stringify(config), function writeJSON(err) {
    if (err) return console.log(err);
    console.log(JSON.stringify(config));
    res.send('Token set');
  });
})

app.get('/createUser/:name/:tag', (req, res) => {
    User.create({name: req.params.name, tag: req.params.tag}, (err, user) => {
      if (err) return console.log(err);
      res.send(user.name);
    });
});

function UpdateUser() {
  User.find({}, (err, users) => {
    if (err) return console.log(err);
    users.forEach(user => {
      user.newRequest();
      user.save();
    });
  });
}

setTimeout(UpdateUser, 2000);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});