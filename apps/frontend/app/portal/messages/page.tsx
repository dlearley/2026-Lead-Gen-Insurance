'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customerPortalService } from '../../../services/customer-portal.service';
import type { CustomerMessage, SendMessageDto } from '@insurance/types';
import { Send, User, MessageSquare, Check } from 'lucide-react';

export default function CustomerMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);

  const [newMessage, setNewMessage] = useState<Partial<SendMessageDto>>({
    subject: '',
    message: '',
  });

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const result = await customerPortalService.getMessages();
      setMessages(result.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.message) {
      return;
    }

    setSending(true);

    try {
      await customerPortalService.sendMessage(newMessage as SendMessageDto);
      setNewMessage({ subject: '', message: '' });
      loadMessages();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectMessage = async (message: CustomerMessage) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      try {
        await customerPortalService.markMessageAsRead(message.id);
        loadMessages();
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await customerPortalService.markAllMessagesAsRead();
      loadMessages();
    } catch (error) {
      console.error('Failed to mark all messages as read:', error);
    }
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;
  const agentMessages = messages.filter((m) => m.senderType === 'agent' || m.senderType === 'system');
  const customerMessages = messages.filter((m) => m.senderType === 'customer');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/portal/dashboard"
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              Mark all as read
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Send New Message */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Send a Message
                </h2>
              </div>
              <form onSubmit={handleSendMessage} className="p-6 space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={newMessage.subject || ''}
                    onChange={(e) =>
                      setNewMessage({ ...newMessage, subject: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Brief description of your message"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={newMessage.message || ''}
                    onChange={(e) =>
                      setNewMessage({ ...newMessage, message: e.target.value })
                    }
                    required
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Type your message here..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sending || !newMessage.message}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>

            {/* Message History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  Message History ({messages.length})
                </h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {messages.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Start a conversation above</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleSelectMessage(message)}
                      className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !message.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {message.senderType === 'customer' ? (
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {message.senderType === 'customer' ? 'You' : 'Agent'}
                              </span>
                              {!message.isRead && (
                                <span className="inline-flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleDateString()} at{' '}
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {message.subject && (
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {message.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Message Details */}
          {selectedMessage && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow sticky top-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    Message Details
                  </h2>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      From
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedMessage.senderType === 'customer' ? 'You' : 'Agent'}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Date & Time
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {selectedMessage.subject && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-500 uppercase">
                        Subject
                      </label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedMessage.subject}
                      </p>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Message
                    </label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                      {selectedMessage.message}
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    {selectedMessage.isRead ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                        Read
                      </>
                    ) : (
                      'Unread'
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
