import type { FC, ReactNode } from 'react';

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="w-full h-full flex flex-col items-center p-4">
            {children}
        </div>
    );
};
