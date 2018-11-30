const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const session = require("express-session")
const uuid = require("uuid/v4")
const MongoClient = require("mongodb").MongoClient
const ObjectId = require("mongodb").ObjectID
const assert = require("assert")
const fs = require("fs")

const SECRETKEY = "DON'T HACK MY SERVER, BE DISCIPLINED"
const MongoURL = "mongodb://developer:developer123@ds143593.mlab.com:43593/herbert1228"

const RESTAURANT = "rest"

const users = [
  {userid: "dev", password: "dev"},
  {userid: "guest", password: "guest"}
]

MongoClient.connect(MongoURL, (err, db) => {
  if (err) throw err
  //const db = client.db("herbert1228")
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
      res.redirect("/read")
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
    res.redirect("/read")
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

  app.get("/read", (req, res) => {
    findRestaurant(db, {}, (restaurant) => {
      res.render("read", {restaurant, self: req.session.userid})
    })
  })

  app.get("/create", (req, res) => {
    res.render("create")
  })

  app.get("/api/restaurant/", (req, res) => {
    findRestaurant(db, {}, (restaurant) => {
      res.json({restaurant})
    })
  })

  app.post("/api/restaurant/", (req, res) => {
    const {name, borough, photo, cuisine, street, building, zipcode, coordX, coordY} = req.body
    const owner = req.session.userid
    assert.notEqual(owner, null)
    assert.notEqual(name, null)

    let new_photo = null

    if (photo != "" && photo.size != 0) {
      const mimetype = photo.type
      console.log("photo: ", photo)
      fs.readFile(photo.path, function (err, data) {
        new_photo = {
          mimetype,
          image: new Buffer(data).toString("base64")
        }
      })
    }

    db.collection(RESTAURANT).insertOne(
      {name, borough, cuisine, new_photo, address: {street, building, zipcode, coord: {coordX, coordY}}, owner},
      (err, result) => {
        if (!result) {
          res.render("create", {error: "some error occurs"})
        }
        res.redirect("/read")
      }
    )
  })

  app.listen(8099)
})


app.post("/api/restaurant/update", (req, res, next) => {
  const {name, borough, photo, cuisine, street, building, zipcode, coordX, coordY} = req.body
  const owner = req.session.userid
  assert.notEqual(owner, null)
  assert.notEqual(name, null)

  let new_photo = null

  if (photo != "" && photo.size != 0) {
    const mimetype = photo.type
    console.log("photo: ", photo)
    fs.readFile(photo.path, function (err, data) {
      new_photo = {
        mimetype,
        image: new Buffer(data).toString("base64")
      }
    })
  }

  db.collection(RESTAURANT).updateOne(
    {"_id": ObjectId(id)}, owner},{$set: {name, borough, photo, cuisine, street, building, zipcode, coordX, coordY}},
    (err, result) => {
      if (!result) {
        res.render("create", {error: "some error occurs"})
      }
      assert.equal(null,err)
      console.log("Item Updated!")
      db.close()
      res.redirect("/read")
    }
  )
})
app.listen(8099)
})


function findRestaurant(db, criteria, callback) {
  const restaurants = []
  db.collection(RESTAURANT).find(criteria).each(function (err, doc) {
    assert.equal(err, null)
    if (doc != null) {
      restaurants.push(doc)
    } else {
      callback(restaurants)
    }
  })
}
