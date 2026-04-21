import { escapeHtml } from './core.js';

export function nl2brSafe(value) {
  return escapeHtml(value ?? '').replace(/\n/g, '<br/>');
}

export function sanitizeHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

