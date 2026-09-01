import React from 'react';

interface TecnihubLogoProps {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TecnihubLogo: React.FC<TecnihubLogoProps> = ({ 
  className = '', 
  collapsed = false,
  size = 'md' 
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Agency Geometric Logo Monogram */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]} bg-black rounded-lg border border-zinc-800 flex items-center justify-center p-1.5 shadow-sm`}>
        <svg 
          viewBox="0 0 160 100" 
          className="w-full h-full text-white fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Block: Tall vertical left stem + top arm + bottom arm */}
          <rect x="0" y="0" width="18" height="100" />
          <rect x="18" y="28" width="60" height="16" />
          <rect x="18" y="84" width="60" height="16" />

          {/* Right Block: 3 horizontal bars separated by thin vertical divider */}
          <rect x="82" y="28" width="78" height="16" />
          <rect x="82" y="56" width="78" height="16" />
          <rect x="82" y="84" width="78" height="16" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span 
              className="font-logo-tecnihub font-extrabold text-sm text-white uppercase" 
              style={{ letterSpacing: '0.12em' }}
            >
              TECNIHUB
            </span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              AGÊNCIA
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 tracking-tight font-medium truncate">
            Gestão de Projetos & Demandas
          </span>
        </div>
      )}
    </div>
  );
};

