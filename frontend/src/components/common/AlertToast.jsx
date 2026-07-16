import { XMarkIcon, ExclamationTriangleIcon, ShieldExclamationIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../../context/WebSocketContext';

const typeConfig = {
  emergency: {
    icon: ShieldExclamationIcon,
    border: 'border-l-red-500',
    bg: 'bg-red-500/5',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-500/5',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: InformationCircleIcon,
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/5',
    iconColor: 'text-blue-400',
  },
  success: {
    icon: InformationCircleIcon,
    border: 'border-l-green-500',
    bg: 'bg-green-500/5',
    iconColor: 'text-green-400',
  },
};

function ToastItem({ toast, onClose }) {
  const config = typeConfig[toast.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`animate-slide-in flex items-start gap-3 p-4 rounded-lg border-l-4 ${config.border} ${config.bg} bg-slate-800 border border-slate-700 shadow-xl max-w-sm w-full`}
    >
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{toast.message}</p>
        {toast.worker && (
          <p className="text-xs text-slate-500 mt-1">Worker: {toast.worker}</p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function AlertToast() {
  const { toasts, removeToast } = useWebSocket();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}
