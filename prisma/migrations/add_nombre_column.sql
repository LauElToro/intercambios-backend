-- Migration: Add nombre column to User table
-- This migration adds the 'nombre' column if it doesn't exist

-- Check if column exists, if not, add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'nombre'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "nombre" TEXT;
        
        -- If there are existing users, set a default value
        UPDATE "User" SET "nombre" = 'Usuario' WHERE "nombre" IS NULL;
        
        -- Make it NOT NULL after setting defaults
        ALTER TABLE "User" ALTER COLUMN "nombre" SET NOT NULL;
    END IF;
END $$;
