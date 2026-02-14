import type { CSSProperties, FC } from 'react';

interface FlagCardProps {
    flagUrl: string;
    altText?: string;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    imageFit?: 'contain' | 'fill' | 'cover';
    fitToContainer?: boolean;
    className?: string;
}

const FlagCard: FC<FlagCardProps> = ({
    flagUrl,
    altText,
    onClick,
    size = 'md',
    imageFit = 'contain',
    fitToContainer = false,
    className = ''
}) => {
    const sizeStyles: Record<'sm' | 'md' | 'lg', CSSProperties> = {
        sm: { width: 112, height: 80 },
        md: { width: 160, height: 112 },
        lg: { width: 224, height: 160 },
    };
    const imageFitStyles: Record<'contain' | 'fill' | 'cover', CSSProperties> = {
        contain: { objectFit: 'contain' },
        fill: { objectFit: 'fill' },
        cover: { objectFit: 'cover' },
    };
    const frameStyle: CSSProperties = fitToContainer
        ? { width: '100%', maxWidth: '100%', aspectRatio: '5 / 3' }
        : sizeStyles[size];
    const interactionClasses = onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default';

    return (
        <div
            className={`glass-panel box-border p-4 flex justify-center items-center transition-transform ${interactionClasses} ${className}`}
            onClick={onClick}
        >
            <div className="flag-card-frame flex items-center justify-center" style={frameStyle}>
                <img
                    src={flagUrl}
                    alt={altText || 'Flag'}
                    className="flag-card-image shadow-md rounded-md"
                    style={{ width: '100%', height: '100%', ...imageFitStyles[imageFit] }}
                />
            </div>
        </div>
    );
};

export default FlagCard;
