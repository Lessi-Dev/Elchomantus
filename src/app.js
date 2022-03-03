const express = require('express');
const mongooose = require('mongoose');
const fs = require('fs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const path = require('path')
const config = require('./config.json');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('a user connected');
});

mongooose.connect('mongodb://localhost:27017/Elchomantus', { useNewUrlParser: true });

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
    default: "🇺🇦",
  },
  region: {
    type: String,
    default: config.defaultServer,
    validator: function(v) {
      return config.servers.includes(v);
    }
  },
  favourite: {
    type: Boolean,
    default: false,
  },
})

const timer = ms => new Promise(res => setTimeout(res, ms))

function AddPuuid(user,res) {
  if(user.puuid == undefined) {
    user.puuid = "🇺🇦";
    const xhr = new XMLHttpRequest();
    console.log(`https://${user.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${user.username}/${user.tag}?api_key=${config.token}`);
    xhr.open('GET', `https://${user.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${user.username}/${user.tag}?api_key=${config.token}`);
    xhr.onreadystatechange = async function() {
      if (xhr.status === 200 && xhr.readyState === 4) {
        const response = JSON.parse(xhr.responseText);
        user.puuid = response.puuid;
        user.save();
        user.updateMatches(user);
      }else if(xhr.status === 404 && xhr.readyState === 4) {
        const response = JSON.parse(xhr.responseText);
        User.deleteOne({username: user.username,tag: user.tag}, (err) => {
          io.emit('invalid user',user);
          if (err) return console.log(err);
          return console.log("User Removed");
        }).clone();
      }else if(xhr.status === 403 && xhr.readyState === 4) {
        io.emit('invalid token');
        User.deleteOne({username: user.username,tag: user.tag}, (err) => {
          io.emit('invalid user',user);
          if (err) return console.log(err);
          return console.log("User Removed");
        }).clone();
      }
    }
    xhr.send();
  }
}

userSchema.pre('save', async function(next) {
  if(this.name == undefined) {
    this.name = this.username;
  }
  const user = this;
  AddPuuid(user);
  next();
});

userSchema.methods.updateMatches = function(user) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `https://${user.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${user.puuid}/ids?start=0&count=${config.howMany}&api_key=${config.token}`);
  xhr.onload = function() {
    if (xhr.status === 200 && xhr.readyState === 4) {
      const response = JSON.parse(xhr.responseText);
      for(i=0;i<response.length;i++) {
        if(i==response.length-1) {
          console.log("Updated LastMatchTracked");
          GetMatch(response[i],i,user);
          user.lastMatchTracked = response[0];
          break;
        }else if(response[i] != user.lastMatchTracked) {
          GetMatch(response[i],i,user);
        }else if(response[i] == user.lastMatchTracked) {
          console.log("Last Match equal at",i);
          user.lastMatchTracked = response[0];
          break;
        }
      }
      user.save();
    }
  }
  xhr.send();
};

const User = mongooose.model('User', userSchema,"Users");

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
});

app.get('/add', (req,res) => {
  res.sendFile(path.join(__dirname, '../public/add.html'))
});

app.get('/settings',(req,res) => {
  res.sendFile(path.join(__dirname, '../public/settings.html'));
});

app.get('/setToken/:token', (req, res) => {
  config.token = req.params.token;
  fs.writeFile("src/config.json", JSON.stringify(config), function writeJSON(err) {
    if (err) return console.log(err);
    console.log(JSON.stringify(config));
    res.send('Token set');
  });
})

app.get('/createUser/:username/:tag', async (req, res) => {
  const AllUsers = await User.find({});
  for(i=0;i<AllUsers.length;i++) {
    if(AllUsers[i].username == req.params.username && AllUsers[i].tag == req.params.tag && AllUsers[i].region == req.params.region) {
      res.status(400).send("User already exists");
      return;
    }
  }
  await User.create({username: req.params.username, tag: req.params.tag, region: req.params.region}, (err, user) => {
    if (err) return res.status(500).send("error :"+err);
    res.status(200).send(user.username);
  });
});

app.get('/update', (req, res) => {
  UpdateUser();
  res.send('Updated');
});

app.get('/deleteUser/:username/:tag', async (req, res) => {
  await User.findOneAndDelete({username: req.params.username, tag: req.params.tag}, (err, user) => {
    if (err) return res.status(500).send("error :"+err);
    console.log(`${user.username}#${user.tag} deleted`);
    res.status(200).send("Deleted");
  }).clone();
});

app.get('/all', (req, res) => {
  User.find({}, (err, users) => {
    if (err) return res.status(500).send("error :"+err);
    res.status(200).send(users);
  });
});

function UpdateUser() {
  User.find({}, (err, users) => {
    if (err) return console.log(err);
    try{
      users.forEach(user => {
        if(user != undefined) {
          user.updateMatches(user);
        }
      });
    } catch(err) {
    console.log(err);
    }
  });
}

async function GetMatch(matchId,i,user) {
  await timer(config.delay * i);
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `https://${user.region}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${config.token}`);
  xhr.onload = async function() {
    if (xhr.status === 200 && xhr.readyState === 4) {
      const response = JSON.parse(xhr.responseText);
      user.matches.push(response);
      user.save()
      .then(user => console.log(response.info.gameId))
      .catch(err => err)
    }
  }
  xhr.send();
}

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});