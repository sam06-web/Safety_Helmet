const variants = {
  safe: {
    dot: 'bg-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    label: 'Safe',
  },
  warning: {
    dot: 'bg-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    label: 'Warning',
  },
  emergency: {
    dot: 'bg-red-500 animate-pulse',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    label: 'Emergency',
  },
  offline: {
    dot: 'bg-gray-500',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    label: 'Offline',
  },
  active: {
    dot: 'bg-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    label: 'Active',
  },
  inactive: {
    dot: 'bg-gray-500',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    label: 'Inactive',
  },
  maintenance: {
    dot: 'bg-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    label: 'Maintenance',
  },
  acknowledged: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    label: 'Acknowledged',
  },
  resolved: {
    dot: 'bg-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    label: 'Resolved',
  },
  critical: {
    dot: 'bg-red-500 animate-pulse',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    label: 'Critical',
  },
};

export default function StatusBadge({ status, label, size = 'sm' }) {
  const variant = variants[status] || variants.offline;
  const displayLabel = label || variant.label;
  const dotSize = size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <span className={`badge ${variant.bg} ${variant.text} ${textSize}`}>
      <span className={`${dotSize} rounded-full ${variant.dot}`} />
      {displayLabel}
    </span>
  );
}
