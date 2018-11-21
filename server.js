const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const session = require("express-session")
const uuid = require("uuid/v4")

const SECRETKEY = "DON'T HACK MY SERVER, BE DISCIPLINED"

const users = [
  {userid: "dev", password: "dev"},
  {userid: "guest", password: "guest"}
]

app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(session({
  secret: SECRETKEY,
  resave: true,
  saveUninitialized: true,
  genid: req => uuid() //eslint-disable-line
}))

app.get("/login", (req, res) => {
  res.status(200).render("login")
})

app.post("/login",function(req,res) {
  for (var i=0; i<users.length; i++) {
    if (users[i].userid == req.body.userid &&
      users[i].password == req.body.password) {
      req.session.authenticated = true
      req.session.userid = req.body.userid
    }
  }
  res.redirect("/")
})

app.use((req, res, next) => { //next()
  console.log(req.session)
  if (req.session.authenticated){
    next()
  } else {
    res.redirect("/login")
  }
})

app.get("/", (req, res) => {
  res.status(200).end("Hello, " + req.session.userid)
})

app.get("/logout",function(req,res) {
  req.session = null
  res.redirect("/")
})

app.listen(8099)
