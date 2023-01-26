//jshint esversion:6


/////////////////////////STARTING FILESS///////////////////////////////////////
require('dotenv').config()
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require("passport");
var GoogleStrategy = require('passport-google-oauth20').Strategy; // GOOOGLE AUTH
const findOrCreate = require('mongoose-find-or-create')


const passportLocalMongoose = require("passport-local-mongoose") // salt and hash

const md5 = require("md5");


const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
//////////////////////////////////cookies////////////////////////////////////////////////
app.set('trust proxy', 1)
app.use(session({
  name: "test",
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session())
//////////////////////////////////cookies////////////////////////////////////////////////

mongoose.set("strictQuery", false);
app.use(express.static("public"));
mongoose.connect('mongodb://127.0.0.1:27017/userDB', () => {
  console.log("Connected to MongoDB");

});


/////////////////////////STARTING FILESS///////////////////////////////////////


//create constructor of userSchema
const userSchema = new mongoose.Schema({ //turn new mangoose.Schema   //for cyrptio

  email: String,
  password: String ,
  googleId: String,
  secret : String

})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)





//create users collections


const User = mongoose.model("User", userSchema);

//// Statik method fir userSchema to
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user); // cookinen icine mesaj konulmasini saglar

});

passport.deserializeUser(function(user, done) { // cookinen icinden mesaji almamizi saglar
  done(null, user);
});

//////GOOGLE AUTH
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));




app.get("/", function(req, res) {
  res.render("home")
})

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));


app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function(req, res) {
  res.render("login")
})



app.get("/register", function(req, res) {
  res.render("register")
})


app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
})


app.get("/secrets", function(req, res) {

  User.find({"secret": { $ne: null}}, function(err , foundUsers) {

    if(err){
      console.log(err);
    } else {
      if(foundUsers) {
        res.render("secrets" , {usersWithSecrets : foundUsers})
      }
    }
  })


});

app.get("/submit" , (req, res) => {

    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login")
    }
})

app.post("/submit" , (req, res) => {
     const newSecret = req.body.secret;
  console.log(req.user._id);

  User.findById(req.user._id, (err,foundUser) =>{
    if(err){
      console.log(err);
    } else { if (foundUser) {
        foundUser.secret  = newSecret;
        foundUser.save(function() {
          res.redirect("/")
        })
    }

    }


    })
})



//make register//
app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {

    if (err) {
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })
    }

  })

})

//REGISTER ENDS////


app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })
    };
  });
})









app.listen(3000, function() {
  console.log("Server started on port 3000");
});
