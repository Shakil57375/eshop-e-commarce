import crypto from "crypto";
import { ValidationError } from "../../../../packages/error-handler";
import  { NextFunction } from "express";
import redis from "../../../../packages/libs/redis";
import { sendEmail } from "./sendMail";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (
  data: any,
  userType: "user" | "seller"
) => {
  const { name, email, password, phone_number, country } = data;
  if (
    !name ||
    !email ||
    !password ||
    (userType === "seller" && (!phone_number || !country))
  ) {
    throw new ValidationError("Missing required fields", {
      missingFields: Object.keys(data),
    });
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
};

export const checkOtpRestrictions = async (
  email: string,
  next: NextFunction
) => {
  // Example: Check if OTP requests exceed limit (this is a placeholder, implement actual logic)
  if (await redis.get(`otp_lock:${email}`)) {
    return next(
      new ValidationError(
        "Account is locked due to multiple failed OTP attempts. Please try again later after 30 minutes."
      )
    );
  }
  if (await redis.get(`otp_spam_lock:${email}`)) {
    return next(
      new ValidationError(
        "Too many OTP requests. Please try again after 1 hour."
      )
    );
  }
  if (await redis.get(`otp_cooldown:${email}`)) {
    return next(
      new ValidationError(
        "OTP request is on cooldown. Please wait for 1 minute before requesting a new OTP."
      )
    );
  }
};

export const trackOtpRequest = async (email: string, next: NextFunction) => {
  const otpRequestKey = `otp_requests_count:${email}`;
  let otpRequests = parseInt((await redis.get(otpRequestKey)) || "0", 10);
  if (otpRequests >= 2) {
    await redis.set(`otp_spam_lock:${email}`, "true", "EX", 3600); // 1 hour lock
    return next(
      new ValidationError(
        "Too many OTP requests. Please try again after 1 hour."
      )
    );
  }
  await redis.set(otpRequestKey, (otpRequests + 1).toString(), "EX", 3600); // Reset count every hour (3600 seconds)
};

export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  const otp = crypto.randomInt(100000, 999999).toString();
  console.log(`Sending OTP ${otp} to email: ${email}`);
  await sendEmail(email, "Your OTP Code", template, { name, otp });
  await redis.set(`otp:${email}`, otp, "EX", 300); // OTP valid for 5 minutes
  await redis.set(`otp_coldown:${email}`, "true", "EX", 60); // 1 minute cooldown
};
