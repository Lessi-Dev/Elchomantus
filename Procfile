backend: node backend/app.js
web: rollup -c

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