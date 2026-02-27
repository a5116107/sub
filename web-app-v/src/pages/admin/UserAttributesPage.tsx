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
import { useTranslation } from 'react-i18next';
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

const getTypeBadge = (type: string, t: (key: string) => string) => {
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
        {t(`userAttributes.type.${type}`)}
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
  const { t } = useTranslation('admin');
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
      errors.key = t('userAttributes.form.keyRequired');
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.key)) {
      errors.key = t('userAttributes.form.keyInvalid');
    }

    if (!formData.name.trim()) {
      errors.name = t('userAttributes.form.nameRequired');
    }

    if (formData.validation_regex) {
      try {
        new RegExp(formData.validation_regex);
      } catch {
        errors.validation_regex = t('userAttributes.form.regexInvalid');
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
      title: t('userAttributes.col.key'),
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
      title: t('userAttributes.col.name'),
      render: (attribute: UserAttribute) => (
        <span className="text-sm text-white">{attribute.name}</span>
      ),
    },
    {
      key: 'type',
      title: t('userAttributes.col.type'),
      render: (attribute: UserAttribute) => getTypeBadge(attribute.type, t),
    },
    {
      key: 'required',
      title: t('userAttributes.col.required'),
      render: (attribute: UserAttribute) =>
        attribute.required ? (
          <Badge variant="success" className="flex items-center gap-1 w-fit">
            <Check className="w-3 h-3" />
            {t('userAttributes.required.yes')}
          </Badge>
        ) : (
          <Badge variant="default" className="flex items-center gap-1 w-fit">
            <X className="w-3 h-3" />
            {t('userAttributes.required.no')}
          </Badge>
        ),
    },
    {
      key: 'default_value',
      title: t('userAttributes.col.defaultValue'),
      render: (attribute: UserAttribute) => (
        <span className="text-sm text-gray-400">
          {attribute.default_value || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: t('userAttributes.col.created'),
      render: (attribute: UserAttribute) => (
        <span className="text-sm text-gray-400">{formatDate(attribute.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('userAttributes.col.actions'),
      render: (attribute: UserAttribute) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(attribute)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-white transition-colors"
            title={t('common:btn.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteModal(attribute)}
            className="p-1.5 rounded hover:bg-[#2A2A30] text-gray-400 hover:text-red-400 transition-colors"
            title={t('common:btn.delete')}
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
          <h1 className="text-2xl font-bold text-white mb-1">{t('userAttributes.title')}</h1>
          <p className="text-gray-400">{t('userAttributes.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Tags className="w-4 h-4" />
          <span>{t('userAttributes.attributesCount', { count: attributes.length })}</span>
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
                  placeholder={t('userAttributes.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('userAttributes.addAttribute')}
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
                {t('userAttributes.savingOrder')}
              </p>
            </div>
          )}
          <Table
            columns={columns}
            data={filteredAttributes}
            loading={loading}
            emptyText={t('userAttributes.empty')}
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
        title={t('userAttributes.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t('userAttributes.form.key')} <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g., department"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                error={formErrors.key}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('userAttributes.form.keyDesc')}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t('userAttributes.form.name')} <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g., Department"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('userAttributes.form.nameDesc')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.description')}</label>
            <Input
              placeholder={t('common:btn.filter')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.type')}</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as UserAttribute['type'] })
                }
                className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="string">{t('userAttributes.type.string')}</option>
                <option value="number">{t('userAttributes.type.number')}</option>
                <option value="boolean">{t('userAttributes.type.boolean')}</option>
                <option value="date">{t('userAttributes.type.date')}</option>
                <option value="json">{t('userAttributes.type.json')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.required')}</label>
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
                  {formData.required ? t('userAttributes.required.required') : t('userAttributes.required.optional')}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.defaultValue')}</label>
            <Input
              placeholder={t('common:btn.filter')}
              value={formData.default_value}
              onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.validationRegex')}</label>
            <Input
              placeholder="e.g., ^[A-Za-z]+$"
              value={formData.validation_regex}
              onChange={(e) => setFormData({ ...formData, validation_regex: e.target.value })}
              error={formErrors.validation_regex}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('userAttributes.form.regexDesc')}
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
              {t('common:btn.cancel')}
            </Button>
            <Button onClick={handleCreate} isLoading={actionLoading}>
              {t('userAttributes.create')}
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
        title={t('userAttributes.edit')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.key')}</label>
              <Input value={formData.key} disabled className="bg-[#2A2A30]/50" />
              <p className="text-xs text-gray-500 mt-1">{t('userAttributes.form.key')} {t('common:btn.filter')}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t('userAttributes.form.name')} <span className="text-red-400">*</span>
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
            <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.description')}</label>
            <Input
              placeholder={t('common:btn.filter')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.type')}</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as UserAttribute['type'] })
                }
                className="w-full bg-[#0A0A0C] border border-[#2A2A30] rounded-lg px-3 py-2 text-white text-sm focus:border-[#00F0FF] outline-none"
              >
                <option value="string">{t('userAttributes.type.string')}</option>
                <option value="number">{t('userAttributes.type.number')}</option>
                <option value="boolean">{t('userAttributes.type.boolean')}</option>
                <option value="date">{t('userAttributes.type.date')}</option>
                <option value="json">{t('userAttributes.type.json')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.required')}</label>
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
                  {formData.required ? t('userAttributes.required.required') : t('userAttributes.required.optional')}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.defaultValue')}</label>
            <Input
              placeholder={t('common:btn.filter')}
              value={formData.default_value}
              onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('userAttributes.form.validationRegex')}</label>
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
              {t('common:btn.cancel')}
            </Button>
            <Button onClick={handleUpdate} isLoading={actionLoading}>
              {t('common:btn.saveChanges')}
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
        title={t('userAttributes.delete')}
      >
        {selectedAttribute && (
          <div className="space-y-4">
            <p className="text-gray-400">
              {t('userAttributes.deleteConfirm')}{' '}
              <span className="text-white font-medium">{selectedAttribute.name}</span> (
              <code className="text-red-400">{selectedAttribute.key}</code>)?
            </p>
            <p className="text-sm text-red-400">
              {t('userAttributes.deleteWarning')}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAttribute(null);
                }}
              >
                {t('common:btn.cancel')}
              </Button>
              <Button variant="danger" onClick={handleDelete} isLoading={actionLoading}>
                {t('userAttributes.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserAttributesPage;
