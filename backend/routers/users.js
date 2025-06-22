import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';

// Make sure the uploads directory exists
const avatarDir = 'uploads/avatars';
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

export const usersRouter = express.Router();

// Configure multer with a storage strategy
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Serve avatar files from the uploads directory
usersRouter.use('/avatars', express.static(avatarDir));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

usersRouter.post('/signup', async (req, res) => {
  try {    
    const { username, email, password } = req.body; 
    
    // Field validations
    const errors = {};
    if (!username) errors.username = 'Username is required';
    if (!email) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Create a new user
    try {
      const newUser = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword
        }
      });
      
      // Session-cookie 
      req.session.userId = newUser.id;
      req.session.username = newUser.username;

      return res.status(201).json({ message: `Signup successful with ${newUser.email}` });
    } catch (dbError) {
      console.error('Database error during user creation:', dbError);
      return res.status(500).json({ error: 'Database error during user creation', details: dbError.message });
    }

  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

usersRouter.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    // Set session data
    req.session.userId = user.id;
    req.session.username = user.username;

    return res.json({ message: `Signed in as ${user.username}` });

  } catch (error) {
    console.error('Error during signin:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

usersRouter.get('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to sign out" });
    }
    res.clearCookie('connect.sid'); 
    return res.json({ message: "Signed out successfully" });
  });
});

// Check authentication status
usersRouter.get('/auth-status', (req, res) => {
  return res.json({ 
    authenticated: req.session.userId ? true : false,
    sessionId: req.sessionID,    
  });
});

usersRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId }
    });
    
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: "User not found" });
    }
    
    // Exclude sensitive fields
    const { password, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Get all users
usersRouter.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
usersRouter.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
        where: { id: parseInt(req.params.id) }
    });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update a user with optional avatar upload
usersRouter.patch('/:id', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
  
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (user) {
        // Ensure the user can only update their own profile
        if (user.id !== req.session.userId) {
            return res.status(403).json({ error: 'You can only update your own profile' });
        }

        const { username, password, avatar, homeAddr } =  req.body;
        const updateData = {};
        if (username) updateData.username = username;
        if (password) {
            const salt = bcrypt.genSaltSync(10);
            updateData.password = bcrypt.hashSync(password, salt);
        }
        if (homeAddr) updateData.homeAddr = homeAddr;

        // Copilot (line 230-240)
        // Prompt: "When isEditing=true (on frontend/src/app/profile/page.tsx), I want the image area to be clickable to upload a new file"
        if (req.file) {
            const avatarUrl = `http://localhost:8080/api/users/avatars/${req.file.filename}`;
            updateData.avatar = avatarUrl;
        } else if (avatar && typeof avatar === 'string') {
            console.log('Using avatar URL from form:', avatar);
            // Only update if it's a valid URL or path
            if (avatar.startsWith('/') || avatar.startsWith('http')) {
                updateData.avatar = avatar;
            }
        }
        
        if (Object.keys(updateData).length > 0) {
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatar: true,
                    homeAddr: true
                }
            });
            
            return res.json(updatedUser);
        } else {
            // If no updates were made, return the current user data
            const currentUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                homeAddr: user.homeAddr
            };
            return res.json(currentUser);
        }
    } else {
        return res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user
usersRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleteUser = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (deleteUser) {
      if (deleteUser.id !== req.session.userId) {
        return res.status(403).json({ error: 'You can only delete your own account' });
      }
      await prisma.user.delete({
        where: { id: deleteUser.id }
      });
      req.session.destroy();
      return res.status(204).end();
    } else {
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});
