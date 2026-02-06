import React, { useEffect, useState } from 'react';
import { Key, Plus, Copy, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { keysApi } from '../../api/keys';
import type { APIKey, CreateAPIKeyRequest } from '../../types';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Modal,
  Input,
  Table,
} from '../../components/ui';

export const ApiKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<Partial<CreateAPIKeyRequest>>({
    name: '',
  });
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});

  const fetchKeys = async () => {
    try {
      const response = await keysApi.getKeys();
      setKeys(response);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    try {
      const response = await keysApi.createKey(newKeyData as CreateAPIKeyRequest);
      setNewlyCreatedKey(response.full_key);
      setKeys([...keys, response]);
      setNewKeyData({ name: '' });
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;
    try {
      await keysApi.deleteKey(selectedKey.id);
      setKeys(keys.filter((k) => k.id !== selectedKey.id));
      setIsDeleteModalOpen(false);
      setSelectedKey(null);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleRegenerate = async (key: APIKey) => {
    try {
      const response = await keysApi.regenerateKey(key.id);
      setKeys(keys.map((k) => (k.id === key.id ? response : k)));
      setNewlyCreatedKey(response.full_key);
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleShowKey = (id: number) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      render: (key: APIKey) => (
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-500" />
          <span className="text-white font-medium">{key.name}</span>
        </div>
      ),
    },
    {
      key: 'key',
      title: 'API Key',
      render: (key: APIKey) => (
        <div className="flex items-center gap-2">
          <code className="text-sm text-gray-400 font-mono">
            {showKey[key.id] ? key.key : `${key.key.slice(0, 8)}...${key.key.slice(-4)}`}
          </code>
          <button
            onClick={() => toggleShowKey(key.id)}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            {showKey[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (key: APIKey) => (
        <Badge variant={key.status === 'active' ? 'success' : 'danger'}>
          {key.status}
        </Badge>
      ),
    },
    {
      key: 'usage',
      title: 'Usage',
      render: (key: APIKey) => (
        <div className="text-sm text-gray-400">
          {key.quota_limit_usd ? (
            <span>
              ${key.quota_used_usd.toFixed(2)} / ${key.quota_limit_usd.toFixed(2)}
            </span>
          ) : (
            <span>${key.quota_used_usd.toFixed(2)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (key: APIKey) => (
        <span className="text-sm text-gray-400">
          {new Date(key.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      align: 'right' as const,
      render: (key: APIKey) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => copyToClipboard(key.key)}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRegenerate(key)}
            className="p-2 text-gray-500 hover:text-[#00F0FF] hover:bg-white/5 rounded-lg transition-colors"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedKey(key);
              setIsDeleteModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
            title="Delete"
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
          <h1 className="text-2xl font-bold text-white mb-1">API Keys</h1>
          <p className="text-gray-400">Manage your API keys for accessing the gateway</p>
        </div>
        <Button
          variant="primary"
          glow
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create API Key
        </Button>
      </div>

      {/* Keys Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={keys}
            loading={loading}
            emptyText="No API keys found. Create one to get started."
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewlyCreatedKey(null);
          setNewKeyData({ name: '' });
        }}
        title={newlyCreatedKey ? 'API Key Created' : 'Create API Key'}
        footer={
          newlyCreatedKey ? (
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewlyCreatedKey(null);
                setNewKeyData({ name: '' });
              }}
            >
              Done
            </Button>
          ) : (
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewKeyData({ name: '' });
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreate} disabled={!newKeyData.name}>
                Create
              </Button>
            </div>
          )
        }
      >
        {newlyCreatedKey ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400 mb-2">
                Your API key has been created. Copy it now as it won't be shown again.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-[#0A0A0C] border border-[#2A2A30] text-sm font-mono text-white break-all">
                {newlyCreatedKey}
              </code>
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(newlyCreatedKey)}
                leftIcon={<Copy className="w-4 h-4" />}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Name"
              value={newKeyData.name}
              onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
              placeholder="e.g., Production API Key"
              required
            />
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedKey(null);
        }}
        title="Delete API Key"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedKey(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-gray-300">
          Are you sure you want to delete the API key "{selectedKey?.name}"? This action cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
};

export default ApiKeysPage;
