import React from 'react';

interface FlagCardProps {
    flagUrl: string;
    altText?: string;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const FlagCard: React.FC<FlagCardProps> = ({ flagUrl, altText, onClick, size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'h-16',
        md: 'h-32',
        lg: 'h-48',
    };

    return (
        <div
            className={`glass-panel p-4 flex justify-center items-center cursor-pointer hover:scale-105 transition-transform ${className}`}
            onClick={onClick}
        >
            <img
                src={flagUrl}
                alt={altText || 'Flag'}
                className={`${sizeClasses[size]} object-contain shadow-md rounded-md`}
            />
        </div>
    );
};

export default FlagCard;
