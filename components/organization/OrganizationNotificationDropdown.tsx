import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, X, Bell } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  link: string;
  is_read?: boolean;
}

export default function OrganizationNotificationDropdown({ isOpen, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("organization_token");
      let orgId = "unknown";
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        orgId = payload.organization_id;
      }

      const res = await fetch("/api/organization/policies/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter out locally read notifications (Scoped to User)
        // If we can't find orgId from token, we might have an issue, but fallback to general key? NO, better to be safe.
        // Actually the backend call succeeded so token is valid.

        const storageKey = `org_read_notifications_v4_${orgId}`;
        const readIds = JSON.parse(localStorage.getItem(storageKey) || '[]');

        const mapped = data.notifications.map((n: any) => ({
          ...n,
          is_read: readIds.includes(n.id)
        }));
        setNotifications(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const token = localStorage.getItem("organization_token");
    let orgId = "unknown";
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      orgId = payload.organization_id;
    }
    const storageKey = `org_read_notifications_v4_${orgId}`;

    // Mark as read locally
    const readIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!readIds.includes(notification.id)) {
      readIds.push(notification.id);
      localStorage.setItem(storageKey, JSON.stringify(readIds));

      // Dispatch event so Layout updates badge
      window.dispatchEvent(new Event('notifications-updated'));
    }

    // Navigate
    window.location.href = notification.link;
  };

  const markAllRead = () => {
    const token = localStorage.getItem("organization_token");
    let orgId = "unknown";
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      orgId = payload.organization_id;
    }
    const storageKey = `org_read_notifications_v4_${orgId}`;

    const readIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    notifications.forEach(n => {
      if (!readIds.includes(n.id)) readIds.push(n.id);
    });
    localStorage.setItem(storageKey, JSON.stringify(readIds));
    window.dispatchEvent(new Event('notifications-updated'));

    // Update local state
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently'; // Fallback

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/5 z-40 md:hidden" onClick={onClose} />
      <div className="fixed left-4 right-4 top-16 z-50 md:absolute md:left-auto md:right-0 md:top-10 md:w-96">
        <Card className="shadow-xl border border-gray-200 w-full bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </h3>
            <div className="flex gap-2">
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">
                Mark all read
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-all duration-200 group relative ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex gap-4">
                    {/* Icon Container */}
                    <div className={`mt-1 h-10 w-10 flex items-center justify-center rounded-xl shadow-sm flex-shrink-0 ${n.title.includes('Approved') ? 'bg-green-100 text-green-600' : 'bg-white border border-blue-100 text-blue-600'}`}>
                      {n.title.includes('Approved') ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm ${!n.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</h4>
                        {!n.is_read && <span className="h-2 w-2 bg-blue-600 rounded-full mt-1.5 shadow-sm shadow-blue-200"></span>}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-2">{n.message}</p>
                      <span className="inline-flex items-center text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                        {getTimeAgo(n.time)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
            <a href="/organization/policies" className="text-xs text-gray-500 hover:text-blue-600 block py-1">View All Activity</a>
          </div>
        </Card>
      </div>
    </>
  );
}