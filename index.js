"use strict";

const express = require("express");
const morgan = require("morgan");
const {
  getItems,
  getItemById,
  getCompanies,
  createCart,
  addItemToCart,
  deleteItemFromCart,
  goCheckOut,
  getCartItems,
  getAllOrders,
  getLatestOrder,
  getUpdatedCart,
} = require("./handlers");

const PORT = 4000;

express()
  .use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Methods",
      "OPTIONS, HEAD, GET, PUT, POST, DELETE"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  })
  .use(morgan("tiny"))
  .use(express.static("./server/assets"))
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use("/", express.static(__dirname + "/"))

  // REST endpoints?
  .get("/bacon", (req, res) => res.status(200).json("🥓"))
  //get all items in the database
  .get("/getItems", getItems)
  // gets item based on id (param passed during fetch)
  .get("/getItem/:id", getItemById)
  // gets all companies
  .get("/getCompanies", getCompanies)
  // returns unique cartId
  .get("/createCart", createCart)
  // adds selected item to cart
  .post("/addItemToCart", addItemToCart)
  // goes to CHECKOUT page and transfers items to Orders collection from Cart collection
  .put("/goToCheckOut", goCheckOut)
  // deletes itemId from user's cart
  .delete("/deleteItemFromCart", deleteItemFromCart)
  // retrieves items from Cart
  .get("/getCartItems/:cartId", getCartItems)
  // get all orders in DB
  .get("/getAllOrders", getAllOrders)
  // get the most recent order that was placed
  .get("/getLatestOrder", getLatestOrder)
  // gets the updated cart so it can update stock properly
  // .patch("/getUpdateCart", getUpdatedCart)

  .listen(PORT, () => console.info(`Listening on port ${PORT}`));
