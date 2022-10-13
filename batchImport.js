const { MongoClient } = require("mongodb");
require("dotenv").config();
const { MONGO_URI } = process.env;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const items = require("./data/items.json");
const companies = require("./data/companies.json");

const batchImport = async () => {
  const client = new MongoClient(MONGO_URI, options);

  try {
    const itemsUpdated = items.map((item) => {
      return { ...item, amountBought: "1" };
    });
    await client.connect();

    const db = client.db("E-Commerce_Project");

    //import items and companies to database
    const batch1 = await db.collection("Item Data").insertMany(itemsUpdated);
    const batch2 = await db.collection("Companies").insertMany(companies);

    if (batch1.acknowledged === true && batch2.acknowledged === true) {
      // console.log(batch1);
      // console.log(batch2);
    }
  } catch (err) {
    console.log(err.message);
  }
  client.close();
};

batchImport();
