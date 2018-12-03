const express = require("express")
const app = express()
// const bodyParser = require("body-parser")
const session = require("express-session")
const uuid = require("uuid/v4")
const MongoClient = require("mongodb").MongoClient
const ObjectID = require("mongodb").ObjectID
const assert = require("assert")
const fs = require("fs")
const formidableMiddleware = require("express-formidable")

const SECRETKEY = "DON'T HACK MY SERVER, BE DISCIPLINED"
// const MongoURL = "mongodb://developer:developer123@ds143593.mlab.com:43593/herbert1228"
const MongoURL = "mongodb://herbert:chan@fyp.3warriors.tk/data"

const RESTAURANT = "rest"

const users = [
  {userid: "dev", password: "dev"},
  {userid: "demo", password: ""},
  {userid: "student", password: ""}
]

MongoClient.connect(MongoURL, (err, db) => {
  if (err) throw err
  app.set("view engine", "ejs")
  app.use(formidableMiddleware())

  app.use(session({
    secret: SECRETKEY,
    resave: true,
    saveUninitialized: true,
    genid: req => uuid() //eslint-disable-line
  }))

  app.get("/api/restaurant/:type/:target", (req, res) => {
    const criteria = {}
    if (req.params.type != null) {
      criteria[req.params.type] = req.params.target
    }

    findRestaurant(db, criteria, (restaurant) => {
      res.json(restaurant)
    })
  })

  app.get("/api/restaurant/", (req, res) => {
    findRestaurant(db, {}, (restaurant) => {
      res.json(restaurant)
    })
  })

  app.post("/api/restaurant/", async (req, res) => {
    const {name, borough, cuisine, street, building, zipcode, coordX, coordY} = req.fields

    if (name == null) {
      res.json({status: "failed"})
      return
    }

    const uploadPhoto = req.files.photo
    const owner = req.session.userid

    let photo
    if (uploadPhoto != null) {
      const filename = uploadPhoto.path
      const mimetype = uploadPhoto.type

      if (uploadPhoto.size !== 0 && (mimetype === "image/jpeg" || mimetype === "image/png")) {
        await new Promise((resolve, reject) => {
          fs.readFile(filename, (err, data) => {
            if (err) {
              reject(err)
            } else {
              resolve(
                photo = {
                  mimetype,
                  image: new Buffer(data).toString("base64")
                }
              )
            }
          })
        })
      }
    }

    db.collection(RESTAURANT).insertOne(
      {name, borough, cuisine, photo, address: {street, building, zipcode, coord: {coordX, coordY}}, owner},
      (err, insertOneWriteOpResult) => {
        assert.equal(err, null)
        if (!insertOneWriteOpResult) {
          res.json({status: "failed"})
        }
        res.json({status: "ok", _id: insertOneWriteOpResult.insertedId})
      }
    )
    // })
  })

  app.get("/login", (req, res) => {
    if (!req.session.authenticated){
      res.status(200).render("login")
    } else {
      res.redirect("/read")
    }
  })

  app.post("/login", (req,res) => {
    for (let i=0; i<users.length; i++) {
      if (users[i].userid === req.fields.userid &&
        users[i].password === req.fields.password) {
        req.session.authenticated = true
        req.session.userid = req.fields.userid
      }
    }
    res.redirect("/read")
  })

  app.use((req, res, next) => { //next()
    // console.log(req.session)
    if (req.session.authenticated){
      next()
    } else {
      res.redirect("/login")
    }
  })

  app.get("/logout", (req,res) => {
    req.session.authenticated = false
    req.session.userid = null
    res.redirect("/login")
  })

  app.get("/read", (req, res) => {
    const query = req.query
    findRestaurant(db, {}, (restaurant) => {
      res.render("read", {restaurant, self: req.session.userid, query})
    })
  })

  app.get("/display", (req, res) => {
    const criteria = {_id: ObjectID(req.query._id)}
    findRestaurant(db, criteria, (r) => {
      if (r[0] != undefined) {
        res.render("display", {r: r[0]})
      } else {
        res.render("error", {message: "restaurant not found"})
      }
    })
  })

  app.get("/create", (req, res) => {
    res.render("create")
  })

  app.post("/create", async (req, res) => {
    const {name, borough, cuisine, street, building, zipcode, coordX, coordY} = req.fields
    const uploadPhoto = req.files.photo
    const owner = req.session.userid
    assert.notEqual(owner, null)
    assert.notEqual(name, null)

    let photo
    const filename = uploadPhoto.path
    const mimetype = uploadPhoto.type

    if (uploadPhoto.size !== 0 && (mimetype === "image/jpeg" || mimetype === "image/png")) {
      await new Promise((resolve, reject) => {
        fs.readFile(filename,(err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(
              photo = {
                mimetype,
                image: new Buffer(data).toString("base64")
              }
            )
          }
        })
      })
    }

    db.collection(RESTAURANT).insertOne(
      {name, borough, cuisine, photo, address: {street, building, zipcode, coord: {coordX, coordY}}, owner},
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
    const {_id} = req.query
    if (_id == null) {
      res.render("error", {message: "invalid arguments"})
      return
    }
    findRestaurant(db, {_id: ObjectID(_id)}, (r) => {
      if (r[0] !== undefined) {
        if (r[0].rate != null) {
          if(r[0].rate.filter(r => {return r.userid === req.session.userid}).length === 0) {
            res.render("rate", {_id, userid: req.session.userid})
          } else {
            res.render("error", {message: "You have rated already"})
          }
        } else {
          res.render("rate", {_id, userid: req.session.userid})
        }
      } else {
        console.log(r[0])
        res.render("error", {message: "restaurant do not exist"})
      }
    })
  })

  app.post("/rate", (req, res) => {
    const {_id, rate, userid} = req.fields
    db.collection(RESTAURANT).updateOne(
      {_id: ObjectID(_id)},
      {$push: {rate: {userid: userid, value: rate}}})
    res.redirect("/read")
  })

  app.get("/delete", (req, res) => {
    const {_id} = req.query
    const self = req.session.userid
    db.collection(RESTAURANT).deleteOne(
      {_id: ObjectID(_id), owner: self},
      (err, result) => {
        assert.equal(err, null)
        if (result.deletedCount === 1) {
          res.render("delete")
        } else {
          res.render("error", {message: "You are not authorized to delete!!!"})
        }
      }
    )
  })

  app.get("/change", (req, res) => {
    const self = req.session.userid
    const criteria = {_id: ObjectID(req.query._id), owner: self}
    findRestaurant(db, criteria, (r) => {
      if (r[0] !== undefined) {
        res.render("change", {r: r[0], error: null})
      } else {
        res.render("error", {message: "Rejected: You are not authorized to edit"})
      }
    })
  })

  app.post("/change", async (req, res) => {
    const {name, borough, cuisine, street, building, zipcode, coordX, coordY, _id} = req.fields
    const self = req.session.userid

    if (name == null){
      res.render("error", {message: "name should not be empty"})
      return
    }

    const updateObj = {name, borough, cuisine, address: {street, building, zipcode, coord: {coordX, coordY}}}

    const uploadPhoto = req.files.photo

    let photo
    const filename = uploadPhoto.path
    const mimetype = uploadPhoto.type

    if (uploadPhoto.size !== 0 && (mimetype === "image/jpeg" || mimetype === "image/png")) {
      // console.log("uploading a photo")
      await new Promise((resolve, reject) => {
        fs.readFile(filename,(err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(
              photo = {
                mimetype,
                image: new Buffer(data).toString("base64")
              }
            )
          }
        })
      })
      updateObj.photo = photo
    }

    db.collection(RESTAURANT).updateOne(
      {_id: ObjectID(_id), owner: self},
      {$set: updateObj},
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

  app.get("/googlemap", (req, res) => {
    const {lat, lon, restaurant} = req.query
    if (lat != null && lon != null && restaurant != null) {
      res.render("googlemap", {lat, lon, restaurant})
    } else {
      res.render("error", {message: "invalid arguments"})
    }
  })

  app.get("*", (req, res) => {
    res.redirect("/read")
  })

  app.listen(process.env.PORT || 8099)
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
