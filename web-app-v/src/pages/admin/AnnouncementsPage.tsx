import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
} from 'lucide-react';
import { adminAnnouncementsApi, type AnnouncementQueryParams } from '../../api/admin/announcements';
import type { Announcement } from '../../types';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Table,
  Modal,
  Skeleton,
} from '../../components/ui';

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'draft':
      return <Badge variant="info">Draft</Badge>;
    case 'archived':
      return <Badge variant="default">Archived</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

const getTypeBadge = (type: string) => {
  switch (type.toLowerCase()) {
    case 'info':
      return <Badge variant="info">Info</Badge>;
    case 'warning':
      return <Badge variant="primary">Warning</Badge>;
    case 'important':
      return <Badge variant="danger">Important</Badge>;
    case 'maintenance':
      return <Badge variant="default">Maintenance</Badge>;
    default:
      return <Badge variant="default">{type}</Badge>;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface ReadStatus {
  user_id: number;
  user_email: string;
  read_at: string;
}

export const AnnouncementsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Modal states
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showReadStatusModal, setShowReadStatusModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [readStatusLoading, setReadStatusLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    type: 'info',
    status: 'draft',
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params: AnnouncementQueryParams = {
        page,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await adminAnnouncementsApi.getAnnouncements(params);
      setAnnouncements(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreateAnnouncement = async () => {
    if (!formData.title || !formData.content) return;

    setActionLoading(true);
    try {
      await adminAnnouncementsApi.createAnnouncement(formData);
      setShowCreateModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to create announcement:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    setActionLoading(true);
    try {
      await adminAnnouncementsApi.updateAnnouncement(selectedAnnouncement.id, formData);
      setShowEditModal(false);
      setSelectedAnnouncement(null);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to update announcement:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    setActionLoading(true);
    try {
      await adminAnnouncementsApi.deleteAnnouncement(selectedAnnouncement.id);
      setShowDeleteModal(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewReadStatus = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowReadStatusModal(true);
    setReadStatusLoading(true);
    try {
      const response = await adminAnnouncementsApi.getReadStatus(announcement.id, { page_size: 50 });
      setReadStatuses(response.items);
    } catch (error) {
      console.error('Failed to fetch read status:', error);
    } finally {
      setReadStatusLoading(false);
    }
  };

  const openEditModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      status: announcement.status,
    });
    setShowEditModal(true);
  };

  const openPreviewModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowPreviewModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      status: 'draft',
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const columns = [
    {
      key: 'id',
      title: 'ID',
      render: (announcement: Announcement) => (
        <span className="text-sm text-gray-400">#{announcement.id}</span>
      ),
    },
    {
      key: 'title',
      title: 'Title',
      render: (announcement: Announcement) => (
        <div>
          <p className="text-sm font-medium text-white truncate max-w-[250px]">
            {announcement.title}
          </p>
          <p className="text-xs text-gray-500 truncate max-w-[250px]">
            {announcement.content.substring(0, 50)}...
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (announcement: Announcement) => getTypeBadge(announcement.type),
    },
    {
      key: 'status',
      title: 'Status',
      render: (announcement: Announcement) => getStatusBadge(announcement.status),
    },
    {
      key: 'created',
      title: 'Created',
      render: (announcement: Announcement) => (
        <span className="text-sm text-gray-400">{formatDate(announcement.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (announcement: Announcement) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPreviewModal(announcement)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-cyan-400 transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewReadStatus(announcement)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-purple-400 transition-colors"
            title="Read Status"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(announcement)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedAnnouncement(announcement);
              setShowDeleteModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const AnnouncementForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Title *</label>
        <Input
          placeholder="Announcement title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Content *</label>
        <textarea
          placeholder="Announcement content (supports markdown)"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={6}
          className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="important">Important</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="secondary"
          onClick={() => {
            isEdit ? setShowEditModal(false) : setShowCreateModal(false);
            resetForm();
            setSelectedAnnouncement(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={isEdit ? handleUpdateAnnouncement : handleCreateAnnouncement}
          isLoading={actionLoading}
          disabled={!formData.title || !formData.content}
        >
          {isEdit ? 'Update Announcement' : 'Create Announcement'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Announcements</h1>
          <p className="text-gray-400">Create and manage system announcements</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Announcement
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">All Types</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="important">Important</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
              <Bell className="w-4 h-4" />
              <span>{total} total announcements</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={announcements}
            loading={loading}
            emptyText="No announcements found"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A30]">
              <p className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, total)} of {total} announcements
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Announcement"
      >
        <AnnouncementForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAnnouncement(null);
          resetForm();
        }}
        title="Edit Announcement"
      >
        <AnnouncementForm isEdit />
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedAnnouncement(null);
        }}
        title="Preview Announcement"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getTypeBadge(selectedAnnouncement.type)}
              {getStatusBadge(selectedAnnouncement.status)}
            </div>
            <h3 className="text-lg font-medium text-white">{selectedAnnouncement.title}</h3>
            <div className="p-4 bg-[#0A0A0C] rounded-lg">
              <p className="text-gray-300 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
            </div>
            <p className="text-xs text-gray-500">
              Created: {formatDate(selectedAnnouncement.created_at)}
              {selectedAnnouncement.updated_at !== selectedAnnouncement.created_at && (
                <> | Updated: {formatDate(selectedAnnouncement.updated_at)}</>
              )}
            </p>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAnnouncement(null);
        }}
        title="Delete Announcement"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete the announcement{' '}
              <span className="text-white font-medium">"{selectedAnnouncement.title}"</span>?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAnnouncement(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAnnouncement}
                isLoading={actionLoading}
              >
                Delete Announcement
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Read Status Modal */}
      <Modal
        isOpen={showReadStatusModal}
        onClose={() => {
          setShowReadStatusModal(false);
          setSelectedAnnouncement(null);
          setReadStatuses([]);
        }}
        title={`Read Status: ${selectedAnnouncement?.title || ''}`}
      >
        {readStatusLoading ? (
          <div className="space-y-4">
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        ) : readStatuses.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#121215]">
                <tr className="border-b border-[#2A2A30]">
                  <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">User</th>
                  <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Read At</th>
                </tr>
              </thead>
              <tbody>
                {readStatuses.map((status, index) => (
                  <tr key={index} className="border-b border-[#2A2A30]/50">
                    <td className="py-2 px-3">
                      <p className="text-sm text-white">{status.user_email}</p>
                      <p className="text-xs text-gray-500">ID: {status.user_id}</p>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-400">
                      {formatDate(status.read_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No one has read this announcement yet</p>
        )}
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
