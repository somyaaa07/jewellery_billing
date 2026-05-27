import { statusColor } from '../../utils/helper';

export default function Badge({ status, label }) {
  const text = label || status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(status)}`}>
      {text}
    </span>
  );
}