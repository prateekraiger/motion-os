import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export function Button({ 
  children, 
  variant = 'black', 
  className,
  as = 'button',
  to
}: { 
  children: React.ReactNode; 
  variant?: 'yellow' | 'black' | 'ghost'; 
  className?: string;
  as?: 'button' | 'link';
  to?: string;
}) {
  const Component = as === 'link' ? motion.create(Link) : motion.button;
  
  return (
    <Component
      to={to as any}
      whileHover={{ y: -2 }}
      whileTap={{ y: 1 }}
      className={cn(
        "rounded-full-3 px-8 py-4 font-inter font-medium text-body inline-flex items-center justify-center transition-colors duration-200 cursor-pointer",
        variant === 'yellow' && "bg-highlighter-yellow text-carbon",
        variant === 'black' && "bg-carbon text-paper-white",
        variant === 'ghost' && "bg-transparent text-carbon border border-carbon",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function PhoneMockup({ label, icon, borderColor, color }: { label: string, icon: React.ReactNode, borderColor?: string, color?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-surface-card rounded-2xl w-40 h-60 border shadow-sm flex flex-col items-center p-4 relative"
      style={{ borderColor: borderColor || 'var(--color-hairline-gray)' }}
    >
      <div className="mt-auto mb-auto text-2xl font-bold" style={{ color: color || 'var(--color-signal-blue)' }}>
        {icon}
      </div>
      <div className="text-caption font-medium text-carbon mt-auto text-center">
        {label}
      </div>
    </motion.div>
  );
}
