# Pokojowo - Project Context

## Overview

Pokojowo is a web platform designed to make finding compatible roommates and rooms effortless. It aggregates offers from various public listing sources and enhances them with smart matching and communication tools powered by AI.

## Core Features

### 1. Room/Roommate Aggregation

- Aggregates offers from various public listing sources
- Centralizes room and roommate listings in one platform
- Provides a unified view of available options

### 2. Smart Matching

- AI-powered matching system
- Finds compatible roommates based on preferences and compatibility
- Matches users with suitable rooms/roommates

### 3. Communication Tools

- Built-in communication features
- AI-powered messaging and interaction tools
- Facilitates seamless communication between potential roommates

### 4. Enhanced Listings

- Enriches basic listings with additional information
- Provides smart insights and recommendations
- Improves the listing discovery experience

## Technical Stack

- **Frontend**: React + Vite
- **State Management**: TanStack React Query (for data fetching and caching)
- **Styling**: Tailwind CSS
- **AI Integration**: To be determined (for smart matching and communication)

## Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── services/      # Service layer for API calls
├── api/           # API configuration and endpoints
├── contexts/      # React contexts (QueryProvider, etc.)
├── utils/         # Utility functions
├── types/         # TypeScript types (if needed)
└── assets/        # Images, icons, and other assets
```

## Key Considerations

- Focus on user experience and ease of use
- Efficient data fetching and caching with React Query
- Responsive design with Tailwind CSS
- Scalable architecture for future AI integrations
- Seamless integration with multiple listing sources

## Backend Authentication API Reference

### Auth Controller Code (Backend Reference)

For future reference, here's the backend authentication controller code:

```javascript
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../model/userSchema.js";
import passport from "passport";
import logger from "../../utils/logger.js";
import mailer from "../../utils/mailer.js";
import crypto from "crypto";

dotenv.config();

const generateToken = () => crypto.randomBytes(32).toString("hex");
const saltround = 10;
const frontendURL =
  process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL
    : "http://localhost:5173";

// Create new user
const createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already taken",
      });
    }

    // Hash password and generate verification token
    const hashedPassword = await bcrypt.hash(password, saltround);
    const verificationToken = generateToken();

    // Create new user
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "tenant",
      isVerified: false,
      verificationToken,
      profileCompletionStep: 10,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    await newUser.save();

    // Send verification email (non-blocking - don't fail user creation if email fails)
    try {
      await mailer.sendVerificationEmail(
        newUser.email,
        verificationToken,
        newUser.username
      );
    } catch (emailError) {
      logger.error(
        "Failed to send verification email, but user was created:",
        emailError
      );
      // Continue even if email fails - user creation is successful
    }

    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    logger.error("Error during user creation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// User login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Missing identifier or password" });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email address before logging in.",
      });
    }

    // Check if account is frozen
    if (user.freez === true) {
      return res.status(403).json({
        message: "Account is frozen. Please contact support.",
      });
    }

    // Check profile completion - use JSON response instead of redirect
    if (!user.isProfileComplete || user.profileCompletionStep < 40) {
      const redirectUrl =
        user.role === "tenant"
          ? `${frontendURL}/profile-completion/tenant?step=${user.profileCompletionStep}`
          : `${frontendURL}/profile-completion/landlord?step=${user.profileCompletionStep}`;

      return res.status(302).json({
        message: "Profile completion required",
        redirectUrl,
        requiresProfileCompletion: true,
      });
    }

    // Generate JWT tokens
    const payload = {
      method: "local",
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    // Update user with refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token cookie
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstname: user.firstname,
        lastname: user.lastname,
        photo: user.photo,
      },
      token: accessToken,
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).render("email-verification-success", {
      message: "Email verified successfully",
    });
  } catch (error) {
    logger.error("Email verification error:", error);
    res.status(500).json({ message: "Server error during email verification" });
  }
};

// User logout
const logout = async (req, res) => {
  try {
    const cookies = req.cookies;

    if (cookies?.jwt) {
      const refreshToken = cookies.jwt;
      const user = await User.findOne({ refreshToken });

      if (user) {
        user.refreshToken = "";
        await user.save();
      }
    }

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.json({ message: "Logout successful" });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({ message: "Error during logout" });
  }
};

// Google OAuth
const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

// Google callback
const googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, user) => {
    if (err) {
      logger.error("Google auth error:", err);
      return res.redirect(`${frontendURL}/login?error=google_auth_failed`);
    }

    if (!user) {
      return res.redirect(`${frontendURL}/login?error=no_user`);
    }

    if (user.freez === true) {
      return res.redirect(`${frontendURL}/login?error=account_frozen`);
    }

    try {
      const payload = {
        method: "google",
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
      });

      const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      user.refreshToken = refreshToken;
      await user.save();

      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      // Check profile completion
      if (!user.isProfileComplete) {
        return res.redirect(
          `${frontendURL}/profile-completion?step=${user.profileCompletionStep}`
        );
      }

      res.redirect(`${frontendURL}/auth-success?token=${accessToken}`);
    } catch (error) {
      logger.error("Google auth callback error:", error);
      res.redirect(`${frontendURL}/login?error=server_error`);
    }
  })(req, res, next);
};

// Request password reset
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success message for security
    const successMessage =
      "If an account with that email exists, we have sent a password reset link.";

    if (!user) {
      return res.status(200).json({ message: successMessage });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Save token to database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email (non-blocking - always return success message for security)
    try {
      await mailer.sendResetPasswordEmail(
        user.email,
        resetToken,
        user.firstname || user.username
      );
      logger.info(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      logger.error(
        "Failed to send password reset email, but token was saved:",
        emailError
      );
      // Continue to return success message for security
    }

    res.status(200).json({ message: successMessage });
  } catch (error) {
    logger.error("Error processing password reset request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (
      !user ||
      user.resetPasswordToken !== token ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    res.status(200).json({
      message: "Token is valid",
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    logger.error("Error verifying reset token:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid reset token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (
      !user ||
      user.resetPasswordToken !== token ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, saltround);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send success email (non-blocking - don't fail password reset if email fails)
    try {
      await mailer.sendPasswordResetSuccessEmail(
        user.email,
        user.firstname || user.username
      );
    } catch (emailError) {
      logger.error(
        "Failed to send password reset success email, but password was reset:",
        emailError
      );
      // Continue even if email fails - password reset is successful
    }

    logger.info(`Password reset successful for user: ${user.email}`);
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    logger.error("Error resetting password:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid reset token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// Change password for logged-in users
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, saltround);
    user.password = hashedPassword;
    await user.save();

    logger.info(`Password changed successfully for user: ${user.email}`);
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    logger.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export default {
  createUser,
  login,
  logout,
  googleAuth,
  googleCallback,
  verifyEmail,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
};
```

### API Endpoints Reference

Based on the backend code above, the frontend should integrate with these endpoints:

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/verify-email?token=xxx` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/verify-reset-token?token=xxx` - Verify reset token
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)

### Authentication Flow

1. **Signup**: User creates account → Email verification sent → User verifies email
2. **Login**: User logs in → Profile completion checked → JWT tokens issued
3. **Password Reset**: User requests reset → Email sent → User resets password
4. **OAuth**: Google OAuth → Callback → JWT tokens issued
