const API_URL = "http://localhost:8080/api/users";

// Auth-related API functions
export const userApi = {

  checkAuthStatus: () => {
    return fetch(`${API_URL}/auth-status`, {
      method: 'GET', 
      credentials: 'include',
      cache: 'no-cache',
    })
    .then(res => {
      if (!res.ok) throw new Error('Auth status check failed');
      return res.json();
    })
    .then(data => {
      return {
        authenticated: data.authenticated || false,
        userData: data.debug || null,
        status: 200,
        message: 'Request successful',
      };
    })
    .catch(error => {
      console.error('Auth check error:', error);
      return {
        authenticated: false,
        userData: null,
        status: 500,
        message: error.message || 'Authentication check failed',
      };
    });
  },

  getCurrentUser: () => {      
    return fetch(`${API_URL}/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    .then(res => {
      if (!res.ok) {
        console.error('Failed to get user data:', res.status, res.statusText);
        throw new Error('Failed to get user data');
      }
      return res.json();
    })
    .then(userData => {
      return userData;
    })
    .catch(error => {
      console.error('Get user error:', error);
      throw error;
    });
  },

  updateUser: (
    userId: number,
    userData: FormData
  ) => {
    return fetch(`${API_URL}/${userId}`, {
      method: 'PATCH',
      credentials: 'include',
      body: userData,
    }).then((res) => {
      if (!res.ok) {
        console.error('Failed to update user with avatar:', res.status, res.statusText);
        throw new Error('Failed to update user with avatar');
      }
      return res.json();
    });
  },

  signOut: () => {
    return fetch(`${API_URL}/signout`, {
      method: 'GET', 
      credentials: 'include',
    })
    .then((res) => {
      if (!res.ok) {
        console.error('Sign out failed:', res.status, res.statusText);
        throw new Error('Sign out failed');
      }
      return res.json();
    });
  },

  deleteUser: (userId: number) => {
    return fetch(`${API_URL}/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    .then(res => {
      if (!res.ok) {
        console.error('Failed to delete user:', res.status, res.statusText);
        throw new Error('Failed to delete user');
      }
      // The API returns 204 No Content, so we don't try to parse JSON
      if (res.status === 204) {
        return { success: true };
      }
      return res.json();
    })
    .catch(error => {
      console.error('Delete user error:', error);
      throw error;
    });
  }
};
