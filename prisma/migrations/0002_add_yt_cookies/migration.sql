-- Add ytCookies column to User table for yt-dlp authentication
ALTER TABLE "User" ADD COLUMN "ytCookies" TEXT;
