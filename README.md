# Authentication Template

A reusable authentication backend template built with **Node.js**, **Express**, **MongoDB**, **JWT**, **HTTP-only cookies**, **bcrypt**, and **Nodemailer**.

The project provides a basic authentication system that can be reused as a starting point for MERN or other Express-based applications.

---

## Features

- User registration
- User login
- Login using either:
  - Username
  - Email
- Password hashing using `bcryptjs`
- JWT authentication
- HTTP-only authentication cookies
- Authentication middleware
- Logout functionality
- Current-user authentication endpoint
- Unique usernames and emails
- Email format validation
- Email verification support
- Resend verification email
- Gmail SMTP support using Nodemailer
- MongoDB integration with Mongoose
- Environment-variable configuration
- Development and production cookie configuration

---

## Technologies

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose

### Authentication

- JSON Web Token
- bcryptjs
- cookie-parser

### Email

- Nodemailer
- Gmail SMTP

### Configuration

- dotenv
- CORS

---

## Project Structure

```text
Authentication-Template/
│
└── Server/
    │
    ├── Config/
    │   ├── MongoConfig.js
    │   └── nodemailer.js
    │
    ├── Controllers/
    │   └── authController.js
    │
    ├── Middleware/
    │   └── userAuth.js
    │
    ├── Model/
    │   └── userModel.js
    │
    ├── Routes/
    │   └── authRoutes.js
    │
    ├── .env
    ├── .gitignore
    ├── package.json
    └── server.js
```

The exact folder names may be changed depending on your preferred project structure.

---

# Installation

Clone the repository:

```bash
git clone <repository-url>
```

Move into the backend directory:

```bash
cd Authentication-Template/Server
```

Install dependencies:

```bash
npm install
```

---

# Required Packages

The main dependencies used by the project are:

```bash
npm install express mongoose bcryptjs jsonwebtoken cookie-parser cors dotenv nodemailer
```

For development, you can also install Nodemon:

```bash
npm install --save-dev nodemon
```

---

# Environment Variables

Create a `.env` file inside the `Server` directory.

```env
PORT=4000

MONGO_URI=mongodb://127.0.0.1:27017/authentication-template

JWT_SECRET=your_long_random_jwt_secret

NODE_ENV=development

EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_google_app_password
```

Never commit your `.env` file to GitHub.

Add it to `.gitignore`:

```gitignore
.env
node_modules/
```

---

# Gmail Configuration

This project can use Gmail SMTP through Nodemailer.

Do not use your normal Google account password.

Instead:

1. Enable **2-Step Verification** on your Google account.
2. Open your Google account security settings.
3. Search for **App Passwords**.
4. Generate an App Password for the project.
5. Add the generated password to `.env`.

Example:

```env
EMAIL_USER=example@gmail.com
EMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

---

# User Model

Example user schema:

```js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },

    displayName: {
      type: String,
      trim: true,
      required: true,
    },

    password: {
      type: String,
      required: true,
      minLength: 8,
    },

    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },

    age: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const userModel = mongoose.model("User", userSchema);

export default userModel;
```

For future versions, `age` may be better renamed to `dateOfBirth` because its type is `Date`.

---

# Authentication Flow

The basic authentication flow is:

```text
User registers
      ↓
Validate user data
      ↓
Hash password using bcrypt
      ↓
Create user in MongoDB
      ↓
Generate JWT
      ↓
Store JWT in HTTP-only cookie
      ↓
Send verification email
```

For login:

```text
Username / Email + Password
            ↓
Find matching user
            ↓
Compare password using bcrypt
            ↓
Generate JWT
            ↓
Store JWT in HTTP-only cookie
            ↓
User authenticated
```

---

# JWT Authentication

A token can be created using:

```js
const token = jwt.sign(
  {
    userId: user._id,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
  }
);
```

The JWT stores the user's MongoDB ID.

Example decoded token:

```json
{
  "userId": "68d123456789abcdef123456",
  "iat": 1234567890,
  "exp": 1235172690
}
```

---

# Cookie Authentication

The JWT is stored inside an HTTP-only cookie.

```js
res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? "none"
      : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### `httpOnly`

Prevents frontend JavaScript from accessing the authentication token.

### `secure`

When enabled, the cookie is only sent over HTTPS.

### `sameSite`

Controls when the browser sends cookies across sites.

---

# Authentication Middleware

Protected routes use authentication middleware.

Example:

```js
import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default userAuth;
```

The middleware reads the JWT and places the user's ID inside:

```js
req.userId
```

Controllers can then access the authenticated user.

---

# API Endpoints

Base URL:

```text
http://localhost:4000/api/auth
```

---

## Register

```http
POST /api/auth/register
```

Example request:

```json
{
  "userName": "testuser",
  "displayName": "Test User",
  "email": "test@example.com",
  "password": "TestPassword123!",
  "age": "2002-05-15"
}
```

Example response:

```json
{
  "success": true,
  "message": "Account created successfully"
}
```

---

## Login

```http
POST /api/auth/login
```

The user can log in using either their username or email.

Using email:

```json
{
  "identifier": "test@example.com",
  "password": "TestPassword123!"
}
```

Using username:

```json
{
  "identifier": "testuser",
  "password": "TestPassword123!"
}
```

Example query:

```js
const user = await userModel.findOne({
  $or: [
    {
      email: normalizedIdentifier.toLowerCase(),
    },
    {
      userName: normalizedIdentifier,
    },
  ],
});
```

---

## Logout

```http
POST /api/auth/logout
```

This removes the authentication cookie.

---

## Current User

```http
GET /api/auth/me
```

This route requires authentication.

Example route:

```js
authRouter.get(
  "/me",
  userAuth,
  getCurrentUser
);
```

The request flow is:

```text
GET /api/auth/me
        ↓
Authentication Middleware
        ↓
Verify JWT
        ↓
req.userId
        ↓
Get User
        ↓
Return User Data
```

---

## Resend Verification Email

```http
POST /api/auth/resend-verification
```

This can be used to send another email verification message when the previous one has expired or was not received.

---

# Email Validation

A basic email format can be validated using:

```js
const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {
  return res.status(400).json({
    success: false,
    message: "Invalid email format",
  });
}
```

This only verifies the format of the email address.

It does not prove that the mailbox actually exists.

Email verification should be used to confirm that the user controls the email address.

---

# Password Security

Passwords should never be stored directly in MongoDB.

Before saving a password:

```js
const salt = await bcrypt.genSalt(12);

const hashedPassword = await bcrypt.hash(
  password,
  salt
);
```

During login:

```js
const passwordMatch = await bcrypt.compare(
  password,
  user.password
);
```

---

# CORS Configuration

If the frontend and backend run on different ports during development:

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:4000
```

configure CORS:

```js
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
```

The frontend must also send credentials.

Example using Axios:

```js
axios.get(
  "http://localhost:4000/api/auth/me",
  {
    withCredentials: true,
  }
);
```

A reusable Axios instance can be created:

```js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true,
});

export default api;
```

---

# Starting the Server

With Node.js:

```bash
node server.js
```

With Nodemon:

```bash
nodemon server.js
```

Or add scripts to `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

Then run:

```bash
npm run dev
```

---

# Testing with Postman

## Register

Method:

```text
POST
```

URL:

```text
http://localhost:4000/api/auth/register
```

Body:

```json
{
  "userName": "testuser123",
  "displayName": "Test User",
  "email": "testuser123@example.com",
  "password": "TestPassword123!",
  "age": "2002-05-15"
}
```

Select:

```text
Body → raw → JSON
```

Postman should automatically include:

```text
Content-Type: application/json
```

After successful registration or login, check Postman's cookies.

You should see:

```text
token
```

---

# Security Considerations

This project is intended as a reusable authentication starting point.

Before using it in a production application, consider adding:

- Login rate limiting
- Register rate limiting
- Global request-size limits
- CSRF protection where appropriate
- Strong password requirements
- Email verification requirements
- Password-reset token expiration
- Account lockout or temporary cooldown
- Input validation
- Input sanitization
- Security headers using Helmet
- Production HTTPS
- Secure environment-variable management
- Logging and monitoring

---

# Recommended Security Packages

```bash
npm install helmet express-rate-limit
```

Example rate limiter:

```js
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    message:
      "Too many login attempts. Please try again later.",
  },
});
```

Then:

```js
authRouter.post(
  "/login",
  loginLimiter,
  login
);
```

---

# Possible Future Improvements

Future versions of this authentication template could include:

- Role-based authorization
- Google OAuth
- GitHub OAuth
- Two-factor authentication
- Account deletion
- Change password
- Change email
- Login-session management
- Device/session tracking
- Redis-backed session or token management
- Automated tests
- Docker configuration
- Swagger/OpenAPI documentation

---

# License

This project can be used as a reusable starting point for personal, educational, and software-development projects.

---

# Author

Created as a reusable Node.js and MongoDB authentication template.