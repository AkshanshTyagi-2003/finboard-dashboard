export function getNestedValue(obj: any, path: string): any {
  if (!path || path === '' || path === '.') return obj;
  if (!obj) return undefined;
  
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
}

export function flattenKeys(obj: any, prefix = ''): { path: string; value: any }[] {
  let result: { path: string; value: any }[] = [];
  
  if (obj === null || obj === undefined) return [];

  // Handle root array
  if (Array.isArray(obj) && prefix === '') {
    result.push({ path: '', value: obj });
    
    if (obj.length > 0 && typeof obj[0] === 'object') {
      const firstItemFields = flattenKeys(obj[0], '');
      result = result.concat(firstItemFields);
    }
    return result;
  }

  if (typeof obj !== 'object' || Array.isArray(obj)) return [];

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    
    if (Array.isArray(value)) {
      // Add the array itself
      result.push({ path, value });
      
      // Also flatten fields from first item if it's an object array
      if (value.length > 0 && typeof value[0] === 'object') {
        const arrayItemFields = flattenKeys(value[0], path);
        result = result.concat(arrayItemFields);
      }
    } else if (value !== null && typeof value === 'object') {
      result = result.concat(flattenKeys(value, path));
    } else {
      result.push({ path, value });
    }
  }
  
  return result;
}

export function formatValue(value: any, format?: string): string {
  if (value === undefined || value === null) return 'N/A';
  
  const num = Number(value);
  if (isNaN(num)) return String(value);

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      }).format(num);
    case 'percentage':
      return `${num.toFixed(2)}%`;
    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(num);
    default:
      return String(value);
  }
}