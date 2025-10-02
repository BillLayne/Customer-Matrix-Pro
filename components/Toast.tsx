
import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

const toastConfig = {
  success: {
    icon: 'fa-solid fa-check-circle',
    style: 'border-green-500',
  },
  warning: {
    icon: 'fa-solid fa-exclamation-triangle',
    style: 'border-yellow-500',
  },
  danger: {
    icon: 'fa-solid fa-times-circle',
    style: 'border-red-500',
  },
  info: {
    icon: 'fa-solid fa-info-circle',
    style: 'border-blue-500',
  },
};

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const { icon, style } = toastConfig[type];

  return (
    <div
      className={`bg-card-light dark:bg-card-dark border-l-4 ${style} rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-in-right min-w-[300px]`}
    >
      <i className={`${icon} text-lg`}></i>
      <span className="font-semibold text-sm">{message}</span>
    </div>
  );
};

export default Toast;
