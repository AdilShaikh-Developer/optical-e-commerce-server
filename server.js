import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

// DATABASE

mongoose
  .connect(process.env.MONGODB_URI)
  .then((req, res) => {
    console.log("Database is Connected");
  })
  .catch((error) => {
    console.log("Error while connecting to MongoDB");
  });

const AdminSchema = new mongoose.Schema({
  profile: { type: String },
  shop: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const AdminModel = mongoose.model("admin", AdminSchema);

const ProductSchema = new mongoose.Schema({
  creator: { type: String, ref: "Admin" },
  image: { type: String },
  name: { type: String },
  type: { type: String },
  idealFor: { type: String },
  frameSize: { type: Number },
  frameType: { type: String },
  frameShape: { type: String },
  frameColor: { type: String },
});

const ProductModel = mongoose.model("product", ProductSchema);

const app = express();

// MIDDLEWARES
app.use(
  cors({
    origin: process.env.FRONTEND_URI,
  })
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json());

// PATHS

app.get("/", (req, res) => {
  res.send("Your Server is Working");
});

app.post("/register", async (req, res) => {
  try {
    let { profilePicture, shop, username, password } = await req.body;

    let encryptedPassword = await bcrypt.hash(password, 10);

    let admin = await AdminModel.findOne({ username });
    if (admin === null) {
      AdminModel.create({
        profile: profilePicture,
        shop,
        username,
        password: encryptedPassword,
      });
      res.send(`Registration Successfull`);
    } else {
      res.send(`User Already Exist`);
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    let { username, password } = await req.body;

    let admin = await AdminModel.findOne({ username });

    if (admin === null) {
      res.json({ message: "user doesn't exist" });
    } else {
      const passwordVerification = await bcrypt.compare(
        password,
        admin.password
      );

      if (passwordVerification === true) {
        let token = jwt.sign({ _id: admin._id }, process.env.SECRET_KEY);

        res.json({ message: "login successful", token });
      } else {
        res.json({ message: "invalid username or password" });
      }
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/admin", async (req, res) => {
  let { accessToken } = req.body;

  let userId = jwt.decode(accessToken);

  let admin = await AdminModel.findById(userId._id);

  res.json({ admin });
});

app.post("/create-product", async (req, res) => {
  try {
    const { accessToken, product } = req.body;

    let userId = jwt.decode(accessToken);

    let admin = await AdminModel.findById(userId._id);

    const createdProduct = await ProductModel.create({
      creator: admin.username,
      image: product.image,
      name: product.name,
      type: product.type,
      idealFor: product.idealFor,
      frameSize: product.frameSize,
      frameType: product.frameType,
      frameShape: product.frameShape,
      frameColor: product.frameColor,
    });

    await createdProduct.save();
    res.status(201).json({
      response: "product is created successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(501).json({ response: "error" });
  }
});

app.post("/delete-product", async (req, res) => {
  const { productId } = req.body;
  try {
    await ProductModel.findOneAndRemove({ _id: productId });
    res.json({ response: "Deleted" });
  } catch (error) {
    res.json({ response: "Error" });
  }
});

app.post("/product-api", async (req, res) => {
  const { accessToken } = req.body;
  const userId = jwt.decode(accessToken);
  const admin = await AdminModel.findById(userId._id);
  const products = await ProductModel.find({ creator: admin.username });
  res.json(products);
});

app.get("/product-api", async (req, res) => {
  const products = await ProductModel.find({});
  res.json(products);
});

app.listen(process.env.PORT, () => {
  console.log(`Your Application is Hosted on PORT ${process.env.PORT}`);
});
