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
  lastMatchTracked: {
    type: String,
  },
  error: {
    type: String,
  },
})

userSchema.pre('save', function(next) {
  this.puuid = axios
  .get(`https://${config.server}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${this.name}/${this.tag}?api_key=${config.token}`)
  .then(res => {
    this.puuid = res.data.puuid;
    next();
  })
  .catch(error => {
    console.log("Something not correct with the inputs")
    this.error = error;
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


app.get('/createTrackedUser/:name/:tag',async (req, res) => {
  if (req.params.name != undefined && req.params.tag != undefined) {
  const usr = await User.findOne({name: req.params.name, tag: req.params.tag}, (err, user) => {
    if (err) {
      console.log("Error:"+err);
      return    }
    res.send(user);
  }).catch(err => {console.log(err)})
  if(usr != null) {
    console.log("User not found")
    User.create({name: req.params.name, tag: req.params.tag}, (err, user) => {
      if (err){
        res.send(err);
        return  
      } 
      res.send(user.name);
    });
  }
  } else {
    res.send('Missing parameters');
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});