const User = require("../models/userModel");
const AppError = require("../utils/appError");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const catchAsync = require("../utils/catchAsync");

const jwtSign = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });
};

const createSendToken = (user, statusCode, res) => {
  // Create token
  const token = jwtSign(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "none",
  };

  // Send token into response cookie
  res.cookie("token", token, cookieOptions);

  // remove password from the response
  user.password = undefined;

  // Send json response
  res.status(statusCode).json({
    success: true,
    token,
    user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // STEP 2: extract all fields and check all fields are present or not
  const { name, email, password } = req.body;
  if (!(name && email && password))
    return next(new AppError("name, email, password are required", 400));

  // STEP 3: check for existing user
  const existingUser = await User.findOne({ email });

  if (existingUser)
    return next(
      new AppError("You already have an account, try to login!", 400)
    );

  // STEP 4: encrypt the password and create a user
  const encryptedPaass = await bcrypt.hash(password, 12);
  const newUser = await User.create({ name, email, password: encryptedPaass });

  // STEP 5: create and send token to the response
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // STEP 1: extract email and password from reqest body
  const { email, password } = req.body;
  if (!(email && password))
    return next(new AppError("email & password both are required", 400));

  // STEP 2:  find the user from database & then verify then compare the passsword

  const user = await User.findOne({ email }).select("+password");
  if (!user)
    return next(
      new AppError("No user found with the following credentials", 404)
    );
  const isCorrectPass = await bcrypt.compare(password, user.password);
  if (!isCorrectPass)
    return next(new AppError("Invalid email or password!", 400));

  // if password is correct then send token
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1. Getting token
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else {
    return next(new AppError("Please login", 401));
  }

  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  // console.log(currentUser);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token is no longer exists!!",
        401
      )
    );
  }

  // 4) Check user changed password after the token was issued
  // NEED TO IMPLEMENT LATER

  // GRANT ACCESS USER TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

exports.restrictTo = (role) => {
  return (req, res, next) => {
    // if current user.role == user then return error
    if (role !== req.user.role) {
      return next(
        new AppError(
          "You do not have to permission to perform this action",
          403
        )
      );
    }
    next();
  };
};
