const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const request = async (path, options = {}, form = false) => {
  const token = localStorage.getItem('trackback_token');
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('trackback_token');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    throw new Error(data.errors?.[0]?.message || data.message || 'Something went wrong. Please try again.');
  }
  return data;
};
const download = async (path, filename) => {
  const token = localStorage.getItem('trackback_token');
  const response = await fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('trackback_token');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'The receipt is not available yet.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
const api = { get: path => request(path), post: (path, body, form=false) => request(path,{method:'POST',body:form?body:JSON.stringify(body)},form), patch: (path,body={}) => request(path,{method:'PATCH',body:JSON.stringify(body)}), download, asset: path => path?.startsWith('http')?path:`${baseUrl.replace('/api','')}${path}` };
export default api;
