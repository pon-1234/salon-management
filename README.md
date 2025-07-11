# Salon Management

_Automatically synced with your [v0.dev](https://v0.dev) deployments_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/pons-projects-2da64dc3/v0-salon-management-jigb52crstx)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/JiGB52cRsTX)

## Overview

A comprehensive salon management application built with Next.js 15, featuring customer management, reservation system, and admin dashboard.

## Features

- 👥 **Customer Management**: Registration, profiles, and authentication
- 📅 **Reservation System**: Online booking and management
- 👨‍💼 **Admin Dashboard**: Business analytics and management tools
- 🔐 **Secure Authentication**: Role-based access control

## Deployment

Your project is live at:

**[https://vercel.com/pons-projects-2da64dc3/v0-salon-management-jigb52crstx](https://vercel.com/pons-projects-2da64dc3/v0-salon-management-jigb52crstx)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/JiGB52cRsTX](https://v0.dev/chat/projects/JiGB52cRsTX)**

## Demo

Try the live demo with these credentials:

### Admin Access
- **URL**: `/admin/login`
- **Email**: `admin@example.com`
- **Password**: `admin123`

### Customer Access
- **URL**: `/[store]/login` (e.g., `/store1/login`)
- **Email**: `customer@example.com`
- **Password**: `customer123`

## Quick Start

```bash
npm install
npm run dev
```

## Environment Setup

1. Copy the environment variables:
```bash
cp env.example .env.local
```

2. Configure the required variables:
- **Database**: Set your PostgreSQL connection string
- **NextAuth**: Generate a secret with `openssl rand -base64 32`
- **Supabase**: Set your Supabase URL and anon key

### Image Upload Feature

This application uses Supabase Storage for persistent image storage:

- **Automatic**: Images are uploaded directly to cloud storage
- **CDN**: Global distribution for fast loading
- **Persistent**: Images remain available across deployments
- **Integrated**: Works seamlessly with your existing Supabase database

To enable image uploads:
1. Create a storage bucket named "images" in your Supabase dashboard
2. Add the following to your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
3. Deploy or run locally

### Database Seeding

Initialize your database with demo data:

```bash
# Create admin users
npm run create:admin

# Create full demo data (casts, customers, reservations)
npm run seed:full
```

## Development

For detailed development information, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
