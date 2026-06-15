import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: 'http://linkvaultapi.runasp.net',
  headers: {
    'Content-Type': 'application/json',
  },
});

// PascalCase to camelCase normalizer
const normalizeKeys = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeKeys);
  if (typeof obj !== 'object') return obj;

  const keyMap = {
    Id: 'id',
    Title: 'title',
    Url: 'url',
    URL: 'url',
    CategoryId: 'categoryId',
    CategoryName: 'categoryName',
    Description: 'description',
    IsFavorite: 'isFavorite',
    IsArchived: 'isArchived',
    IsPinned: 'isPinned',
    Content: 'content',
    CreatedAt: 'createdAt',
    UpdatedAt: 'updatedAt',
    CreatedOn: 'createdOn',
    BookmarkId: 'bookmarkId',
    NoteId: 'noteId',
    UserId: 'userId',
    FirstName: 'firstName',
    LastName: 'lastName',
    Email: 'email',
    Token: 'token',
    Category: 'category',
    Pinned: 'pinned',
    Name: 'name',
    Message: 'message',
    Errors: 'errors',
    BookmarksCount: 'bookmarksCount',
    NotesCount: 'notesCount',
  };

  const result = {};
  for (const key of Object.keys(obj)) {
    const normalizedKey = keyMap[key] || (key.charAt(0).toLowerCase() + key.slice(1));
    result[normalizedKey] = normalizeKeys(obj[key]);
  }
  return result;
};

// Request interceptor to attach JWT
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Handle 204 No Content
    if (response.status === 204) return null;
    
    return normalizeKeys(response.data);
  },
  (error) => {
    if (error.response?.status === 401) {
      // Auto-logout on 401
      useAuthStore.getState().logout();
    }
    
    // Normalize error data
    if (error.response?.data) {
      error.response.data = normalizeKeys(error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
