"use strict";
const { MongoClient, ObjectId } = require("mongodb");

require("dotenv").config();
const { MONGO_URI } = process.env;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
// use this package to generate unique ids: https://www.npmjs.com/package/uuid
const { v4: uuidv4, stringify } = require("uuid");

//-----------------------------------------------------------------------------------------------------
// returns list of all items
//-----------------------------------------------------------------------------------------------------
const getItems = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();
  try {
    const db = client.db("E-Commerce_Project");
    const items = await db.collection("Item Data").find().toArray();
    return res.status(200).json({
      status: 200,
      data: items,
      success: true,
    });
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};

//-----------------------------------------------------------------------------------------------------
// funcion for getting specific item filtered by ID received as params
//-----------------------------------------------------------------------------------------------------
const getItemById = async (req, res) => {
  //parameter received from FE when fetching
  const _id = req.params.id;
  //creating client and connecting to it
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();

  try {
    //DB to which to connect to
    const db = client.db("E-Commerce_Project");
    //finding item based on param passed to handler
    const item = await db.collection("Item Data").findOne({ _id: Number(_id) });

    //send item object as data to frontend if not null
    if (item !== null) {
      return res.status(200).json({
        status: 200,
        data: item,
        message: `You have retrieved item ${item.name} from ID ${_id}`,
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: item,
        message: `No item with ${_id} was found`,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};

//-----------------------------------------------------------------------------------------------------
// gets all companies
//-----------------------------------------------------------------------------------------------------
const getCompanies = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();

  try {
    //DB to which to connect to
    const db = client.db("E-Commerce_Project");
    //finding all companies
    const companies = await db.collection("Companies").find().toArray();

    //send companies object as data to frontend if not null
    if (companies.length > 0) {
      return res.status(200).json({
        status: 200,
        data: companies,
        message: "You have retrieved all companies.",
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: companies,
        message: `No companies found...`,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};

//----------------------------------------------------------------------------------------------------
// CREATES unique CART ID upon loading the Home Page with an empty Array inside and returns it's ID
// to store it in LOCAL STORAGE
//----------------------------------------------------------------------------------------------------
const createCart = async (req, res) => {
  const items = [];
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();
  try {
    const db = client.db("E-Commerce_Project");
    const cart = await db.collection("Cart").insertOne({ items });

    return res.status(200).json({
      status: 200,
      data: cart,
      message: "Unique Cart ID created",
    });
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};
//----------------------------------------------------------------------------------
// adds item IDs to the customer's unique CART. Expects only one item and the cartId.
//----------------------------------------------------------------------------------
const addItemToCart = async (req, res) => {
  const _id = req.body.cartId;
  const item = req.body;

  const client = new MongoClient(MONGO_URI, options);
  await client.connect();

  try {
    const db = client.db("E-Commerce_Project");

    //checks if said Cart with CartId exists
    const validateCart = await db
      .collection("Cart")
      .findOne({ _id: ObjectId(_id) });

    if (validateCart !== null) {
      //updates the cart by adding said item
      await db
        .collection("Cart")
        .updateOne(
          { _id: ObjectId(_id) },
          { $push: { items: item } } /* item.toString() */
        );
      return res.status(201).json({
        status: 201,
        data: item,
        message: `Item with ID ${item._id} has been added to cart ID ${_id}.`,
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: _id,
        message: `Cart with ID ${_id} was not found.`,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};

//-----------------------------------------------------------------------------------------------------
// gets Items from Cart to create an Order  !!! ~~~~~ Still missing Updating the stock feature ~~~~~
//-----------------------------------------------------------------------------------------------------
const goCheckOut = async (req, res) => {
  let orderItems = [];
  const _id = req.body.cartId;
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();
  try {
    //find the Cart
    const db = client.db("E-Commerce_Project");
    const cartItems = await db
      .collection("Cart")
      .findOne({ _id: ObjectId(_id) });

    if (cartItems === null || cartItems === undefined) {
      return res.status(500).json({
        status: 500,
        message: "Cart not found",
      });
    }

    orderItems = [...cartItems.items];

    //update Item Data stock

    orderItems.forEach(async (item) => {
      //get the Item's actual stock data from Item Data collection
      const findFromItem_data = await db
        .collection("Item Data")
        .findOne({ _id: item._id });

      // VALIDATION -> // check if there's enough stock
      if (
        findFromItem_data !== null &&
        findFromItem_data.numInStock - Number(item.amountBought) < 0
      ) {
        return res.status(500).json({
          status: 500,
          message: "Not enough stock",
        });
      }
      // if everything is OK -> do the update based on actual stock information
      const updateEachItemData = await db.collection("Item Data").updateOne(
        { _id: item._id },
        {
          $set: {
            ...item,
            numInStock:
              findFromItem_data.numInStock - Number(item.amountBought),
          },
        }
      );
      // console.log(updateEachItemData);
    });

    // Generate an Order
    const orderId = await db
      .collection("Orders")
      .insertOne({ orderItems: orderItems });

    let uniqueId = orderId.insertedId.toString();

    //Find the correct Order
    const newOrder = await db
      .collection("Orders")
      .findOne({ _id: ObjectId(uniqueId) });

    return res.status(200).json({
      status: 200,
      data: newOrder,
      message: "Purchase attempt was successful",
    });
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};
//-----------------------------------------------------------------------------------------------------
// deletes item from Cart
//-----------------------------------------------------------------------------------------------------
const deleteItemFromCart = async (req, res) => {
  const _id = req.body.cartId;
  const item = req.body;
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();
  try {
    const db = client.db("E-Commerce_Project");

    //checks if said Cart with CartId exists
    const validateItem = await db
      .collection("Cart")
      .findOne({ _id: ObjectId(_id) });

    if (validateItem !== null) {
      //updates the cart by removing said item
      await db
        .collection("Cart")
        .updateOne({ _id: ObjectId(_id) }, { $pull: { items: item } });

      return res.status(200).json({
        status: 200,
        data: item,
        message: `Item with ID ${item._id} was deleted.`,
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: item,
        message: `Item with ID ${item._id} was not found `,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};

//-----------------------------------------------------------------------------------------------------
// gets all of the items that are currently in the cart
//-----------------------------------------------------------------------------------------------------
const getCartItems = async (req, res) => {
  const cartId = req.params.cartId;
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();

  try {
    const db = client.db("E-Commerce_Project");

    //validates that the id provided from FE matches the id in the cart collection
    const validateCart = await db
      .collection("Cart")
      .findOne({ _id: ObjectId(cartId) });

    // if validateCart exists, send the items within that cart
    if (validateCart !== null) {
      return res.status(200).json({
        status: 200,
        data: validateCart.items,
        message: `You are now viewing Cart with ID ${cartId}.`,
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: cartId,
        message: `Cart with ID ${cartId} does not exist.`,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};

//-----------------------------------------------------------------------------------------------------
// gets latest order that has been placed in the orders DB
//-----------------------------------------------------------------------------------------------------
const getLatestOrder = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();

  try {
    const db = client.db("E-Commerce_Project");
    // checks if Order contains the provided order ID
    const allOrders = await db.collection("Orders").find().toArray();

    if (allOrders.length > 0) {
      await db.collection("Cart").findOne();

      return res.status(200).json({
        status: 200,
        data: allOrders[allOrders.length - 1],
        message: "You are now viewing order with ID ${cartId}.",
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: allOrders,
        message: `Cart with ID ${cartId} does not exist.`,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};

//-----------------------------------------------------------------------------------------------------
// gets all orders that have been placed in the orders DB
//-----------------------------------------------------------------------------------------------------
const getAllOrders = async (req, res) => {
  const client = new MongoClient(MONGO_URI, options);
  await client.connect();

  try {
    const db = client.db("E-Commerce_Project");

    // retrieves all orders
    const allOrders = await db.collection("Orders").find().toArray();

    if ((allOrders, length > 0)) {
      await db.collection("Cart").findOne();

      return res.status(200).json({
        status: 200,
        data: allOrders,
        message: "You are now viewing order with ID ${cartId}.",
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: allOrders,
        message: `Cart with ID ${cartId} does not exist.`,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};
//-----------------------------------------------------------------------------------------------------
// modifies the stock amount bought to update the itme data (stock)
//-----------------------------------------------------------------------------------------------------
const getUpdatedCart = async () => {
  const arr = req.body.items;
  const id = req.body.cartId;

  const client = new MongoClient(MONGO_URI, options);
  await client.connect();

  try {
    const db = client.db("E-Commerce_Project");

    //checks if said Cart with CartId exists
    const validateCart = await db
      .collection("Cart")
      .findOne({ _id: ObjectId(id) });

    if (validateCart !== null) {
      arr.forEach(async (item) => {
        await db.collection("Cart").updateOne(
          {
            _id: ObjectId(id),
            "items.amountBought": validateCart.amountBought,
          },
          { $set: { "items.$.amountBought": item.amountBought } }
        );
      });
      return res.status(201).json({
        status: 201,
        data: item,
        message: `Items inside cart with ID ${id} have been removed.`,
      });
    } else {
      return res.status(404).json({
        status: 404,
        data: _id,
        message: `Cart with ID ${id} was not found.`,
      });
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    client.close();
  }
};
module.exports = {
  getItems,
  getItemById,
  getCompanies,
  addItemToCart,
  createCart,
  deleteItemFromCart,
  goCheckOut,
  getCartItems,
  getAllOrders,
  getLatestOrder,
  getUpdatedCart,
};
