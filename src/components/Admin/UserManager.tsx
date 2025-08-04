import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/utils/helpers';
import { 
  Users,
  Settings,
  Shield,
  Mail,
  Calendar,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_roles?: {
    role: 'admin' | 'user';
  }[];
  email?: string;
  last_sign_in_at?: string;
}

const UserManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Get profiles and user roles separately to avoid join issues
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profile data with roles
      const combinedUsers: UserProfile[] = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          user_roles: userRole ? [{ role: userRole.role }] : [{ role: 'user' as const }],
          email: profile.username.includes('@') ? profile.username : `${profile.username}@company.com`,
          last_sign_in_at: undefined
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to just profiles
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;
        
        const simpleUsers: UserProfile[] = (profilesData || []).map(profile => ({
          ...profile,
          user_roles: [{ role: 'user' as const }],
          email: profile.username.includes('@') ? profile.username : `${profile.username}@company.com`
        }));
        
        setUsers(simpleUsers);
      } catch (fallbackError) {
        console.error('Error loading profiles:', fallbackError);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    setIsUpdatingRole(userId);
    try {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: userId,
            role: newRole
          }
        ]);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, user_roles: [{ role: newRole }] }
          : user
      ));

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const getCurrentRole = (user: UserProfile): 'admin' | 'user' => {
    return user.user_roles?.[0]?.role || 'user';
  };

  const getRoleBadgeVariant = (role: 'admin' | 'user'): 'default' | 'secondary' => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded w-48"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-64"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-20 bg-muted animate-pulse rounded"></div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>User Management</span>
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Users</h3>
              <p className="text-sm text-muted-foreground">
                No users found in the system
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const currentRole = getCurrentRole(user);
                return (
                  <div
                    key={user.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.display_name || user.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <UserCheck className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">
                              {user.display_name || user.username}
                            </h4>
                            <Badge variant={getRoleBadgeVariant(currentRole)}>
                              {currentRole}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.email || 'No email available'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Joined: {formatDateTime(new Date(user.created_at))}</span>
                          </div>
                          {user.last_sign_in_at && (
                            <div className="flex items-center space-x-1 mt-1">
                              <UserCheck className="w-3 h-3" />
                              <span>Last seen: {formatDateTime(new Date(user.last_sign_in_at))}</span>
                            </div>
                          )}
                        </div>

                        <Select
                          value={currentRole}
                          onValueChange={(newRole: 'admin' | 'user') => updateUserRole(user.user_id, newRole)}
                          disabled={isUpdatingRole === user.user_id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">
                              <div className="flex items-center space-x-2">
                                <UserCheck className="w-4 h-4" />
                                <span>User</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center space-x-2">
                                <Shield className="w-4 h-4" />
                                <span>Admin</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {isUpdatingRole === user.user_id && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Statistics */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <span>User Statistics</span>
          </CardTitle>
          <CardDescription>
            Overview of user activity and roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Administrators</span>
              </div>
              <p className="text-2xl font-bold">
                {users.filter(u => getCurrentRole(u) === 'admin').length}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Regular Users</span>
              </div>
              <p className="text-2xl font-bold">
                {users.filter(u => getCurrentRole(u) === 'user').length}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Active Today</span>
              </div>
              <p className="text-2xl font-bold">
                {users.filter(u => {
                  if (!u.last_sign_in_at) return false;
                  const lastSignIn = new Date(u.last_sign_in_at);
                  const today = new Date();
                  return lastSignIn.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManager;