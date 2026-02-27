import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, X, ChevronRight, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { announcementsApi } from '../api/announcements';
import type { Announcement } from '../types';
import { Badge } from './ui';

interface AnnouncementsProps {
  onUnreadCountChange?: (count: number) => void;
}

export const Announcements: React.FC<AnnouncementsProps> = ({ onUnreadCountChange }) => {
  const { t } = useTranslation('common');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await announcementsApi.getAnnouncements({ unread_only: true });
      // Ensure data is an array
      const announcementsArray = Array.isArray(data) ? data : [];
      setAnnouncements(announcementsArray);
      onUnreadCountChange?.(announcementsArray.length);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    fetchAnnouncements();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await announcementsApi.markAsRead(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      onUnreadCountChange?.(announcements.length - 1);
    } catch (error) {
      console.error('Failed to mark announcement as read:', error);
    }
  };

  const handleDismiss = (id: number) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-3 bg-[#121215] border border-[#2A2A30] rounded-lg shadow-lg hover:border-red-500/50 transition-colors group"
        >
          <div className="relative">
            <Bell className="w-5 h-5 text-red-400" />
            {visibleAnnouncements.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {visibleAnnouncements.length}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-300">
            {t('announcements.count', { count: visibleAnnouncements.length })}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-[#121215] border border-[#2A2A30] rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A30]">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-red-400" />
            <span className="font-medium text-white">{t('announcements.title')}</span>
            <Badge variant="danger" className="text-xs">
              {visibleAnnouncements.length}
            </Badge>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Announcements List */}
        <div className="max-h-96 overflow-y-auto">
          {visibleAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className="p-4 border-b border-[#2A2A30] last:border-b-0 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white mb-1">
                    {announcement.title}
                  </h4>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                    {announcement.type && (
                      <Badge variant="default" className="text-xs">
                        {announcement.type}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(announcement.id)}
                  className="p-1 text-gray-500 hover:text-white transition-colors"
                  title={t('announcements.dismiss')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => handleMarkAsRead(announcement.id)}
                className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                {t('announcements.markAsRead')}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#2A2A30] bg-[#0A0A0C]">
          <button
            onClick={() => {
              visibleAnnouncements.forEach(a => handleMarkAsRead(a.id));
            }}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            {t('announcements.markAllRead')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
