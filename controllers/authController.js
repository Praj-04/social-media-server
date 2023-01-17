const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { response } = require("express");
const { error, success } = require("../utils/responseWrapper");

const signupController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      // return res.status(400).send("All fields are required");
      return res.send(error(400, "All fields are required"));
    }

    const oldUser = await User.findOne({ email });
    if (oldUser) {
      // return res.status(409).send("User is already registered");
      return res.send(error(409, "User is already registered"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // return res.status(201).json({
    //   user,
    // });
    return res.send(success(201, "user created successfully"));
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      // return res.status(400).send("All fields are required");
      return res.send(error(400, "All fields are required"));
    }

    const user = await User.findOne({ email }).select("+password"); //adding password explicitly here using select , since in User.js (model) we made select:false for password..means donot pass password to frontend
    if (!user) {
      // return res.status(404).send("User is not registered");
      return res.send(error(404, "User is not registered"));
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      // return res.status(403).send("Incorrect password");
      return res.send(error(403, "Incorrect password"));
    }

    const accessToken = generateAccessToken({
      _id: user._id,
    });

    const refreshToken = generateRefreshToken({
      _id: user._id,
    });

    //creating cookie in the backend ,jwt is a name we are giving to cookie,refreshToken is the token,and setting few parameters for cookie
    //httpsOnly -> frontend cant access this cookie, secure -> used during http=>https .while setting SSl certificate in baceknd n front end..only then ookie should be visible
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,
    });

    return res.send(success(200, { accessToken }));

    // res.send("from login");

    // console.log("login called");
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message));
  }
};

//This api will check the refresh token validity and generate a new access token
const refreshAccessTokenController = async (req, res) => {
  //req.cookies is how we get all the cookies..cookies because it contains all cookies here..it is an array
  const cookies = req.cookies;

  //here we take our cookie named jwt from the cookies array
  if (!cookies.jwt) {
    // return res.status(401).send("Refresh token in cookies is required");
    return res.send(error(401, " Refresh token in cookies is required"));
  }

  //if we obtain refreshToken from cookie
  const refreshToken = cookies.jwt;
  console.log("refreshtoken from cookie", refreshToken);

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_PRIVATE_KEY
    );

    const _id = decoded._id;
    const accessToken = generateAccessToken({ _id });

    return res.send(success(201, { accessToken }));
  } catch (e) {
    console.log(e);
    // return res.status(401).send("Invalid refresh token");
    return res.send(error(401, " Invalid refresh token"));
  }
};

//LOGOUT CONTROLLER
//we delete the refresh token (cookie) at the backend side
const logoutController = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      //removing the refresh token in the backend ,we have to specify the name of cookie and also options that we set while creating cookie(http and secure)
      httpOnly: true,
      secure: true,
    });
    return res.send(success(200, "user logged out"));
  } catch (e) {
    console.log(e);

    return res.send(error(500, e.message));
  }
};

//internal functions
const generateAccessToken = (data) => {
  try {
    const token = jwt.sign(data, process.env.ACCESS_TOKEN_PRIVATE_KEY, {
      expiresIn: "1d",
    });
    // console.log("access token generated", token);
    return token;
  } catch (e) {
    console.log(e);
  }
};

const generateRefreshToken = (data) => {
  try {
    const token = jwt.sign(data, process.env.REFRESH_TOKEN_PRIVATE_KEY, {
      expiresIn: "1y",
    });
    console.log("refresh token generated", token);
    return token;
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  signupController,
  loginController,
  refreshAccessTokenController,
  logoutController,
};
