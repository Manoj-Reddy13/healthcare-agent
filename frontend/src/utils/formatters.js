export function formatINR(amount) {
  if (amount === undefined || amount === null) return "N/A";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function getDataModeBadge(mode) {
  switch (mode) {
    case 'verified':
      return {
        label: 'Verified Data',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      };
    case 'estimated':
      return {
        label: 'Indicative Estimate',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      };
    case 'mock':
    default:
      return {
        label: 'Academic Mock',
        className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      };
  }
}
