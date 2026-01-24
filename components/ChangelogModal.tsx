import React from 'react';
import {
  X,
  Sparkles,
  Zap,
  Bug,
  AlertTriangle,
  Tag,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { changelog, ChangelogEntry, APP_VERSION } from '../changelog';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const getChangeIcon = (type: ChangelogEntry['changes'][0]['type']) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      case 'improvement':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'fix':
        return <Bug className="w-4 h-4 text-green-500" />;
      case 'breaking':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <ChevronRight className="w-4 h-4 text-slate-400" />;
    }
  };

  const getChangeBadge = (type: ChangelogEntry['changes'][0]['type']) => {
    switch (type) {
      case 'feature':
        return 'bg-indigo-100 text-indigo-700';
      case 'improvement':
        return 'bg-amber-100 text-amber-700';
      case 'fix':
        return 'bg-green-100 text-green-700';
      case 'breaking':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Tag className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Changelog</h2>
              <p className="text-sm text-slate-500">
                Current version: <span className="font-medium text-indigo-600">v{APP_VERSION}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {changelog.map((entry, index) => (
            <div key={entry.version} className="relative">
              {/* Version Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  index === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  v{entry.version}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Calendar className="w-4 h-4" />
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                {index === 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Latest
                  </span>
                )}
              </div>

              {/* Version Title */}
              <h3 className="text-lg font-semibold text-slate-800 mb-3">{entry.title}</h3>

              {/* Changes List */}
              <div className="space-y-2">
                {entry.changes.map((change, changeIndex) => (
                  <div
                    key={changeIndex}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="mt-0.5">
                      {getChangeIcon(change.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getChangeBadge(change.type)}`}>
                          {formatType(change.type)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{change.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider between versions */}
              {index < changelog.length - 1 && (
                <div className="mt-6 border-b border-slate-200" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Inbox Guardian - AI-Powered Email Management
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
