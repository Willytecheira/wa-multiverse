import { User, AuthResponse } from '@/types/whatsapp';
import { DEFAULT_USER } from '@/utils/constants';
import { storageService } from './storage';

class AuthService {
  private readonly TOKEN_EXPIRY_HOURS = 24;

  async login(username: string, password: string): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple authentication check
    if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
      const user: User = {
        id: '1',
        username: username,
        email: 'admin@whatsapp-api.com',
        role: 'admin',
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

      const token = this.generateToken(user, expiresAt);

      // Store auth data
      storageService.setAuthToken(token);
      storageService.setCurrentUser(user);

      return {
        token,
        user,
        expiresAt,
      };
    }

    throw new Error('Invalid credentials');
  }

  logout(): void {
    storageService.removeAuthToken();
    storageService.removeCurrentUser();
  }

  isAuthenticated(): boolean {
    const token = storageService.getAuthToken();
    const user = storageService.getCurrentUser();
    
    if (!token || !user) {
      return false;
    }

    // Check if token is expired
    try {
      const decoded = this.decodeToken(token);
      return decoded.expiresAt > Date.now();
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    return storageService.getCurrentUser();
  }

  private generateToken(user: User, expiresAt: Date): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresAt: expiresAt.getTime(),
    };

    // Simple base64 encoding (not secure, just for demo)
    return btoa(JSON.stringify(payload));
  }

  private decodeToken(token: string): any {
    try {
      return JSON.parse(atob(token));
    } catch {
      throw new Error('Invalid token');
    }
  }

  // Auto logout when token expires
  scheduleAutoLogout(): void {
    const token = storageService.getAuthToken();
    if (!token) return;

    try {
      const decoded = this.decodeToken(token);
      const timeUntilExpiry = decoded.expiresAt - Date.now();
      
      if (timeUntilExpiry > 0) {
        setTimeout(() => {
          this.logout();
          window.location.href = '/login';
        }, timeUntilExpiry);
      } else {
        this.logout();
      }
    } catch {
      this.logout();
    }
  }
}

export const authService = new AuthService();