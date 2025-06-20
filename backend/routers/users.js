import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma.js';

export const usersRouter = express.Router();
const upload = multer({
  dest: 'uploads/avatars/',
  limits: { filesize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startswith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});
usersRouter.use('/avatars', express.static('uploads/avatars'));

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
  return res.json({ authenticated: req.session.userId ? true : false });
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
    
    return res.json(`User ${user.username}`);
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
    const user = await prisma.user.findUnique({
        where: { id: req.session.userId }
    });

    if (user) {
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
        if (req.file) {
            updateData.avatar = `/api/users/avatars/${req.file.filename}`;
        }
        if (Object.keys(updateData).length > 0) {
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: updateData
            });
        }        

        return res.json({ message: 'User profile updated successfully' });
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
