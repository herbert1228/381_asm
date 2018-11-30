const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const session = require("express-session")
const uuid = require("uuid/v4")
const MongoClient = require("mongodb").MongoClient

const SECRETKEY = "DON'T HACK MY SERVER, BE DISCIPLINED"
const MongoURL = process.env.MONGOURL
console.log(MongoURL)

const RESTAURANT = "rest"

const users = [
  {userid: "dev", password: "dev"},
  {userid: "guest", password: "guest"}
]

MongoClient.connect(MongoURL, (err, db) => {
  if (err) throw err

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
    if (!req.session.authenticated){
      res.status(200).render("login")
    } else {
      res.redirect("/api/restaurant/")
    }
  })

  app.post("/login", (req,res) => {
    for (var i=0; i<users.length; i++) {
      if (users[i].userid == req.body.userid &&
        users[i].password == req.body.password) {
        req.session.authenticated = true
        req.session.userid = req.body.userid
      }
    }
    res.redirect("/api/restaurant/")
  })

  app.use((req, res, next) => { //next()
    console.log(req.session)
    if (req.session.authenticated){
      next()
    } else {
      res.redirect("/login")
    }
  })

  app.get("/logout", (req,res) => {
    req.session = null
    res.redirect("/")
  })

  app.get("/api/restaurant/", (req, res) => {
    res.render("create")
  })

  app.post("/api/restaurant/", (req, res) => {
    const {name, borough, cuisine, street, building, zipcode, coord} = req.body
    console.log(req.body, req.body.name)
    const owner = req.session.userid
    if (name == null || owner == null) {
      console.log(name, owner)
      res.end("name or owner cannot be null")
      return
    }
    db.collection(RESTAURANT, (err, collection) => {
      if (err) throw err
      collection.insert({
        name, borough, cuisine, address: {street, building, zipcode, coord}, owner
      })
    })
  })

  app.listen(8099)

})
