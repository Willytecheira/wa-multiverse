import { useState } from 'react';
import Navigation from '@/components/Common/Navigation';
import Notifications from '@/components/Common/Notifications';
import SessionManager from '@/components/Admin/SessionManager';
import WebhookManager from '@/components/Admin/WebhookManager';
import MessageSender from '@/components/Admin/MessageSender';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Admin = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Notifications />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp sessions, webhooks, and send test messages
          </p>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sessions">
            <SessionManager />
          </TabsContent>
          
          <TabsContent value="webhooks">
            <WebhookManager />
          </TabsContent>
          
          <TabsContent value="messages">
            <MessageSender />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;