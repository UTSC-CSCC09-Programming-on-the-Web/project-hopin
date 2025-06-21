'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { userApi } from '../api/users'

type User = {
  id: number;
  username: string;
  email: string;
  avatar?: string; 
  homeAddr?: string;
}

function EditProfile(userId: number) {


}

function SignOut() {
  return userApi.signOut()
    .then(() => {
      console.log('User signed out successfully');
      window.location.href = '/'; 
    }
    )
    .catch((error) => {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  );
}

function DeleteAccount(userId: number) {
  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    return userApi.deleteUser(userId)
      .then(() => {
        console.log('User account deleted successfully');
        window.location.href = '/'; 
      })
      .catch((error) => {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again.');
      });
  }
  return Promise.resolve();
}

function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    
    setLoading(true);
    
    userApi.checkAuthStatus()
      .then((status) => {
        console.log('Auth status result:', status);
        if (status && status.authenticated) {
          setIsAuth(true);
          console.log('User is authenticated, fetching user data...');
          return userApi.getCurrentUser();
        } else {
          console.log('Authentication failed:', status);
          setError("User not authenticated. Please log in.");
          setIsAuth(false);
          throw new Error("Not authenticated");
        }
      })
      .then((userData) => {
        console.log('User data received:', userData);
        if (userData !== undefined && userData !== null) {
          setUser(userData);
          setError('');
        } else {
          console.log('No user data received');
          setError('Failed to load user profile. Please try again.');
          setUser(null);
        }
      })
      .catch((error) => {
        if (error.message !== "Not authenticated") {
          console.error('Error in authentication flow:', error);
          setError('Failed to load user profile. Please try again.');
          setIsAuth(false);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading profile...</p>;
  }
  if (!isAuth && error) {
    return <p>{ error }</p>;
  }
  if (!user && error) {
    return <p className="text-red-500">{'User data unavailable'}</p>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
        <div className="w-24 h-24 relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {user && user.avatar ? (
            <img 
              src={user.avatar}
              alt={`${user.username}'s avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold">{user && user.username ? user.username.charAt(0).toUpperCase() : ''}</span>
          )}
        </div>
        <div className="space-y-2 mt-4 md:mt-0">
          <h2 className="text-2xl font-bold">{user ? user.username : ''}</h2>
          <p><strong>Email:</strong> {user ? user.email : ''}</p>
          <p><strong>Home Address:</strong> {user && user.homeAddr ? user.homeAddr : 'Not provided'}</p>
          <div className="mt-6 space-x-4">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" 
              onClick={() => {
                if (user && user.id) {
                  EditProfile(user.id);
                } else {
                  alert('User ID unavailable.');
                }
              }}>
              Edit Profile
            </button>
            <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" onClick={SignOut}>
              Sign Out
            </button>
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              onClick={() => {
                if (user && user.username) {
                  DeleteAccount(user.id);
                } else {
                  alert('User ID unavailable.');
                }
              }}
            >
              Delete Account
            </button>   
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <div className="container mx-auto p-4">
      <UserProfile />
    </div>
  )
}

// TO DO:
// - Loading wheel
// - Edit profile functionality