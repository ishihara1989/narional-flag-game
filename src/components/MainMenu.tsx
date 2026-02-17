import type { FC } from 'react';
import type { GameMode, GameSettings } from '../types';

interface MainMenuProps {
    onSelectMode: (mode: GameMode) => void;
    settings: GameSettings;
    onOpenSettings: () => void;
}

const STANDARD_MENU_MODES: Array<{
    mode: GameMode;
    icon: string;
    title: string;
    description: string;
}> = [
    {
        mode: 'flag-to-map',
        icon: '🚩 ➜ 🗺️',
        title: 'Flag to Map',
        description: '国旗を見て、国の場所を地図上で当てます。'
    },
    {
        mode: 'name-to-flag',
        icon: '📛 ➜ 🚩',
        title: 'Name to Flag',
        description: '国名を見て、正しい国旗を選びます。'
    },
    {
        mode: 'flag-to-name',
        icon: '🚩 ➜ 📛',
        title: 'Flag to Name',
        description: '表示された国旗の国名を選びます。'
    },
    {
        mode: 'map-to-flag',
        icon: '🗺️ ➜ 🚩',
        title: 'Map to Flag',
        description: '地図で示された国に対応する国旗を選びます。'
    }
];

const MEMORY_MENU_MODES: Array<{
    mode: GameMode;
    icon: string;
    title: string;
    description: string;
}> = [
    {
        mode: 'memory-name-to-flag',
        icon: '🧠 📛 ➜ 🚩',
        title: 'Memory: Name to Flag',
        description: '地域を選び、その地域の全ての国を国名から国旗で暗記します。'
    },
    {
        mode: 'memory-flag-to-name',
        icon: '🧠 🚩 ➜ 📛',
        title: 'Memory: Flag to Name',
        description: '地域を選び、その地域の全ての国を国旗から国名で暗記します。'
    }
];

const MainMenu: FC<MainMenuProps> = ({ onSelectMode, settings, onOpenSettings }) => {
    return (
        <div className="main-menu">
            <header className="main-menu-header">
                <h1 className="main-menu-title">
                    🌏 Globe Master <span>Flag</span> Game
                </h1>
                <p className="main-menu-subtitle">遊びたいモードを選んでスタート</p>
                <button
                    onClick={onOpenSettings}
                    className="btn-glass main-menu-settings-button"
                >
                    設定を変更 ({settings.maxRounds} ラウンド / 選択肢 {settings.optionCount} / 高難易度 {settings.highDifficulty ? 'ON' : 'OFF'})
                </button>
            </header>

            <div className="main-menu-mode-sections">
                <section className="mode-section">
                    <h2 className="mode-section-title">通常モード</h2>
                    <div className="mode-grid">
                        {STANDARD_MENU_MODES.map((menuMode) => (
                            <button
                                key={menuMode.mode}
                                onClick={() => onSelectMode(menuMode.mode)}
                                className="glass-panel mode-card"
                            >
                                <span className="mode-card-icon">{menuMode.icon}</span>
                                <span className="mode-card-title">{menuMode.title}</span>
                                <p className="mode-card-description">{menuMode.description}</p>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="mode-section">
                    <h2 className="mode-section-title">暗記モード</h2>
                    <div className="mode-grid">
                        {MEMORY_MENU_MODES.map((menuMode) => (
                            <button
                                key={menuMode.mode}
                                onClick={() => onSelectMode(menuMode.mode)}
                                className="glass-panel mode-card"
                            >
                                <span className="mode-card-icon">{menuMode.icon}</span>
                                <span className="mode-card-title">{menuMode.title}</span>
                                <p className="mode-card-description">{menuMode.description}</p>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default MainMenu;
