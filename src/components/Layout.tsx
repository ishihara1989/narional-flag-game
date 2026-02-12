import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="w-full h-full flex flex-col items-center p-4">
            {children}
        </div>
    );
};
