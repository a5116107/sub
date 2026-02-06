import React, { useEffect, useState, useCallback } from 'react';
import {
  Tags,
  Search,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  AlertCircle,
  Check,
  X,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  Code,
} from 'lucide-react';
import { userAttributesApi, type UserAttribute, type CreateUserAttributeRequest } from '../../api/admin/userAttributes';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Table,
  Modal,
} from '../../components/ui';

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'string':
      return <Type className="w-4 h-4" />;
    case 'number':
      return <Hash className="w-4 h-4" />;
    case 'boolean':
      return <ToggleLeft className="w-4 h-4" />;
    case 'date':
      return <Calendar className="w-4 h-4" />;
    case 'json':
      return <Code className="w-4 h-4" />;
    default:
      return <Type className="w-4 h-4" />;
  }
};

const getTypeBadge = (type: string) => {
  const colors: Record<string, string> = {
    string: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    number: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    boolean: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    date: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    json: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  };
  return (
    <Badge variant="default" className={colors[type] || colors.string}>
      <span className="flex items-center gap-1">
        {getTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    </Badge>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const UserAttributesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [attributes, setAttributes] = useState<UserAttribute[]>([]);
  const [search, setSearch] = useState('');
  const [filteredAttributes, setFilteredAttributes] = useState<UserAttribute[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<UserAttribute | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<UserAttribute | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateUserAttributeRequest>({
    key: '',
    name: '',
    description: '',
    type: 'string',
    required: false,
    default_value: '',
    validation_regex: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userAttributesApi.getList();
      setAttributes(response);
      setFilteredAttributes(response);
    } catch (error) {
      console.error('Failed to fetch user attributes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  useEffect(() => {
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      setFilteredAttributes(
        attributes.filter(
          (attr) =>
            attr.key.toLowerCase().includes(lowerSearch) ||
            attr.name.toLowerCase().includes(lowerSearch) ||
            attr.description?.toLowerCase().includes(lowerSearch)
        )
      );
    } else {
      setFilteredAttributes(attributes);
    }
  }, [search, attributes]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.key.trim()) {
      errors.key = 'Key is required';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.key)) {
      errors.key = 'Key must start with a letter and contain only letters, numbers, and underscores';
    }

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (formData.validation_regex) {
      try {
        new RegExp(formData.validation_regex);
      } catch {
        errors.validation_regex = 'Invalid regular expression';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setActionLoading(true);
    try {
      await userAttributesApi.create(formData);
      setShowCreateModal(false);
      resetForm();
      fetchAttributes();
    } catch (error) {
      console.error('Failed to create user attribute:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAttribute || !validateForm()) return;

    setActionLoading(true);
    try {
      await userAttributesApi.update(selectedAttribute.id, formData);
      setShowEditModal(false);
      setSelectedAttribute(null);
      resetForm();
      fetchAttributes();
    } catch (error) {
      console.error('Failed to update user attribute:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAttribute) return;

    setActionLoading(true);
    try {
      await userAttributesApi.delete(selectedAttribute.id);
      setShowDeleteModal(false);
      setSelectedAttribute(null);
      fetchAttributes();
    } catch (error) {
      console.error('Failed to delete user attribute:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReorder = async (newOrder: UserAttribute[]) => {
    setIsReordering(true);
    try {
      const ids = newOrder.map((attr) => attr.id);
      await userAttributesApi.reorder(ids);
      setAttributes(newOrder);
      setFilteredAttributes(newOrder);
    } catch (error) {
      console.error('Failed to reorder attributes:', error);
      // Revert to original order on error
      fetchAttributes();
    } finally {
      setIsReordering(false);
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      type: 'string',
      required: false,
      default_value: '',
      validation_regex: '',
    });
    setFormErrors({});
  };

  const openEditModal = (attribute: UserAttribute) => {
    setSelectedAttribute(attribute);
    setFormData({
      key: attribute.key,
      name: attribute.name,
      description: attribute.description || '',
      type: attribute.type,
      required: attribute.required,
      default_value: attribute.default_value || '',
      validation_regex: attribute.validation_regex || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (attribute: UserAttribute) => {
    setSelectedAttribute(attribute);
    setShowDeleteModal(true);
  };

  // Drag and drop handlers
  const handleDragStart = (attribute: UserAttribute) => {
    setDraggedItem(attribute);
  };

  const handleDragOver = (e: React.DragEvent, targetAttribute: UserAttribute) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetAttribute.id) return;

    const newOrder = [...attributes];
    const draggedIndex = newOrder.findIndex((a) => a.id === draggedItem.id);
    const targetIndex = newOrder.findIndex((a) => a.id === targetAttribute.id);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setAttributes(newOrder);
    setFilteredAttributes(newOrder);
  };

  const handleDragEnd = () => {
    if (draggedItem) {
      handleReorder(attributes);
    }
    setDraggedItem(null);
  };

  const columns = [
    {
      key: 'drag',
      title: '',
      width: '40px',
      render: (attribute: UserAttribute) => (
        <div
          className="cursor-move text-gray-500 hover:text-gray-300"
          draggable
          onDragStart={() => handleDragStart(attribute)}
          onDragOver={(e) => handleDragOver(e, attribute)}
          onDragEnd={handleDragEnd}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      ),
    },
    {
      key: 'key',
      title: 'Key',
      render: (attribute: UserAttribute) => (
        <div>
          <p className="text-sm font-medium text-white font-mono">{attribute.key}</p>
          {attribute.description && (
            <p className="text-xs text-gray-500 mt-0.5">{attribute.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Name',
      render: (attribute: UserAttribute) => (
        <span className="text-sm text-white">{attribute.name}</span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (attribute: UserAttribute) => getTypeBadge(attribute.type),
    },
    {
      key: 'required',
      title: 'Required',
      render: (attribute: UserAttribute) =>
        attribute.required ? (
          <Badge variant="success" className="flex items-center gap-1 w-fit">
            <Check className="w-3 h-3" />
            Yes
          </Badge>
        ) : (
          <Badge variant="default" className="flex items-center gap-1 w-fit">
            <X className="w-3 h-3" />
            No
          </Badge>
        ),
    },
    {
      key: 'default_value',
      title: 'Default Value',
      render: (attribute: UserAttribute) => (
        <span className="text-sm text-gray-400">
          {attribute.default_value || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (attribute: UserAttribute) => (
        <span className="text-sm text-gray-400">{formatDate(attribute.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (attribute: UserAttribute) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(attribute)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title="Edit Attribute"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteModal(attribute)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title="Delete Attribute"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">User Attributes</h1>
          <p className="text-gray-400">Manage custom user attribute definitions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Tags className="w-4 h-4" />
          <span>{attributes.length} attributes</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by key, name, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Attribute
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attributes Table */}
      <Card>
        <CardContent className="p-0">
          {isReordering && (
            <div className="px-6 py-2 bg-blue-500/10 border-b border-blue-500/20">
              <p className="text-sm text-blue-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Saving new order...
              </p>
            </div>
          )}
          <Table
            columns={columns}
            data={filteredAttributes}
            loading={loading}
            emptyText="No attributes found"
            rowKey="id"
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create User Attribute"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Key <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g., department"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                error={formErrors.key}
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier, used in API
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g., Department"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />
              <p className="text-xs text-gray-500 mt-1">
                Display name for UI
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <Input
              placeholder="Optional description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as UserAttribute['type'] })
                }
                className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Required</label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setFormData({ ...formData, required: !formData.required })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.required ? 'bg-red-500' : 'bg-[#2A2A30]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.required ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-400">
                  {formData.required ? 'Required' : 'Optional'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Value</label>
            <Input
              placeholder="Optional default value..."
              value={formData.default_value}
              onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Validation Regex</label>
            <Input
              placeholder="e.g., ^[A-Za-z]+$"
              value={formData.validation_regex}
              onChange={(e) => setFormData({ ...formData, validation_regex: e.target.value })}
              error={formErrors.validation_regex}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional regex pattern for validation
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={actionLoading}>
              Create Attribute
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAttribute(null);
          resetForm();
        }}
        title="Edit User Attribute"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Key</label>
              <Input value={formData.key} disabled className="bg-[#2A2A30]/50" />
              <p className="text-xs text-gray-500 mt-1">Key cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g., Department"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <Input
              placeholder="Optional description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as UserAttribute['type'] })
                }
                className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Required</label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setFormData({ ...formData, required: !formData.required })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.required ? 'bg-red-500' : 'bg-[#2A2A30]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.required ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-400">
                  {formData.required ? 'Required' : 'Optional'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Value</label>
            <Input
              placeholder="Optional default value..."
              value={formData.default_value}
              onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Validation Regex</label>
            <Input
              placeholder="e.g., ^[A-Za-z]+$"
              value={formData.validation_regex}
              onChange={(e) => setFormData({ ...formData, validation_regex: e.target.value })}
              error={formErrors.validation_regex}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedAttribute(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} isLoading={actionLoading}>
              Update Attribute
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAttribute(null);
        }}
        title="Delete User Attribute"
      >
        {selectedAttribute && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete the attribute{' '}
              <span className="text-white font-medium">{selectedAttribute.name}</span> (
              <code className="text-red-400">{selectedAttribute.key}</code>)?
            </p>
            <p className="text-sm text-red-400">
              This action cannot be undone. All user data associated with this attribute will be
              permanently deleted.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAttribute(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} isLoading={actionLoading}>
                Delete Attribute
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserAttributesPage;
