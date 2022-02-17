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
  },
  username: {
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
    default: "187",
  }
})

userSchema.methods.newRequest = async function(user){
  axios.get(`https://${config.server}.api.riotgames.com/lol/match/v5/matches/by-puuid/${this.puuid}/ids?start=0&count=${config.howMany}&api_key=${config.token}`)
  .then(function(res) {
    if(this.lastMatchTracked === res.data[0]) {
      console.log("No new matches at User: " + this.name);
      return;
    }
    for(let i = 0; i < res.data.length; i++){
      delay();
      GetMatch(res.data[i]).then(async (response) => {
        console.log(i+":"+response.data.info.gameDuration);
        await user.matches.push(response.data);
        await user.save();
        delay();
      }).catch(err => {})
    }
  })
  .catch(error => {
    console.error(error)
  })
}

userSchema.pre('save', function(next) {
  if(this.name === undefined) {
    this.name = this.username;
  }
  this.puuid = axios
  .get(`https://${config.server}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${this.username}/${this.tag}?api_key=${config.token}`)
  .then(res => {
    this.puuid = res.data.puuid;
    next();
  })
  .catch(error => {
    console.error(error)
  })
  this.newRequest();
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

app.get('/createUser/:username/:tag', (req, res) => {
  User.create({username: req.params.username, tag: req.params.tag}, (err, user) => {
    if (err) return res.status(500).send(err);
    res.send(user.username);
  });
});

app.get('/update', (req, res) => {
  UpdateUser();
  res.send('Updated');
});

function UpdateUser() {
  User.find({}, (err, users) => {
    if (err) return console.log(err);
    try{
      users.forEach(user => {
        console.log(user.username);
        if(user != undefined) {
          user.newRequest(user);
        }
      });
    } catch(err) {
    console.log(err);
    }
  });
}

async function GetMatch(matchId) {
try{
  return await axios.get(`https://${config.server}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${config.token}`);
} catch(err) {
  console.log(err);
}
};

const delay = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

setInterval(UpdateUser, 3600000);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});