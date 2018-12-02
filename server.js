const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const session = require("express-session")
const uuid = require("uuid/v4")
const MongoClient = require("mongodb").MongoClient
const ObjectID = require("mongodb").ObjectID
const assert = require("assert")
//const fs = require("fs")
//const formidable = require("formidable")

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
    for (let i=0; i<users.length; i++) {
      if (users[i].userid === req.body.userid &&
        users[i].password === req.body.password) {
        req.session.authenticated = true
        req.session.userid = req.body.userid
      }
    }
    res.redirect("/read")
  })

  app.use((req, res, next) => { //next()
    //console.log(req.session)
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

  app.get("/display", (req, res) => {
    const criteria = {_id: ObjectID(req.query._id)}
    findRestaurant(db, criteria, (r) => {
      if (r[0] != undefined) {
        res.render("display", {r: r[0], error: null})
      } else {
        res.render("display", {error: "restaurant not found"})
      }
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
    const {name, borough, cuisine, street, building, zipcode, coordX, coordY} = req.body
    const owner = req.session.userid
    assert.notEqual(owner, null)
    assert.notEqual(name, null)

    //const form = new formidable.IncomingForm()

    // form.parse(req, function (err, fields, files) {
    //   console.log("files", JSON.stringify(files))
    //
    let new_photo
    //   const filename = files.photo.path
    //   if (files.photo.size != 0) {
    //     const mimetype = files.photo.type
    //
    //     fs.readFile(filename, function (err, data) {
    //       new_photo = {
    //         mimetype,
    //         image: new Buffer(data).toString("base64")
    //       }
    //     })
    //   }

    db.collection(RESTAURANT).insertOne(
      {_id: uuid(), name, borough, cuisine, new_photo, address: {street, building, zipcode, coord: {coordX, coordY}}, owner},
      (err, result) => {
        assert.equal(err, null)
        if (!result) {
          res.render("create", {error: "some error occurs"})
        }
        res.redirect("/read")
      }
    )
    // })
  })

  app.get("/rate", (req, res) => {
    res.render("rate")
  })

  app.post("/rate", (req, res) => {
    // const {name, borough, cuisine, street, building, zipcode, coordX, coordY} = req.body
    // const owner = req.session.userid
    res.end("Coming Soon...")
  })

  app.get("/change", (req, res) => {
    const self = req.session.userid
    const criteria = {_id: ObjectID(req.query._id), owner: self}
    findRestaurant(db, criteria, (r) => {
      if (r[0] !== undefined) {
        res.render("change", {r: r[0], error: null})
      } else {
        res.render("change", {error: "rejected", r: {name: "Error: You are not authorized to edit"}})
      }
    })
  })

  app.post("/change", (req, res) => {
    const {name, borough, cuisine, street, building, zipcode, coordX, coordY, _id} = req.body
    const self = req.session.userid
    assert.notEqual(self, null)
    assert.notEqual(name, null)

    let new_photo = null
    //
    // if (photo != "" && photo.size != 0) {
    //   const mimetype = photo.type
    //   console.log("photo: ", photo)
    //   fs.readFile(photo.path, function (err, data) {
    //     new_photo = {
    //       mimetype,
    //       image: new Buffer(data).toString("base64")
    //     }
    //   })
    // }

    db.collection(RESTAURANT).updateOne(
      {_id: ObjectID(_id), owner: self},
      {$set: {name, borough, new_photo, cuisine, street, building, zipcode, coordX, coordY}},
      (err, result) => {
        assert.equal(err, null)
        if (!result) {
          res.render("change", {error: "some error occurs", r: {name: "some error occurs"}})
        } else {
          res.redirect("/read")
        }
      }
    )
  })

  app.listen(8099)
  console.log("server started!")
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
