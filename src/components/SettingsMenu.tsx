import type { FC } from 'react';
import type { GameSettings } from '../types';

interface SettingsMenuProps {
    settings: GameSettings;
    onChangeSettings: (settings: GameSettings) => void;
    onBack: () => void;
}

const MIN_ROUNDS = 1;
const MAX_ROUNDS = 10;
const MIN_OPTION_COUNT = 2;
const MAX_OPTION_COUNT = 9;

const clamp = (value: number, min: number, max: number): number => {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
};

const SettingsMenu: FC<SettingsMenuProps> = ({ settings, onChangeSettings, onBack }) => {
    const handleRoundsChange = (value: number) => {
        onChangeSettings({
            ...settings,
            maxRounds: clamp(value, MIN_ROUNDS, MAX_ROUNDS)
        });
    };

    const handleOptionCountChange = (value: number) => {
        onChangeSettings({
            ...settings,
            optionCount: clamp(value, MIN_OPTION_COUNT, MAX_OPTION_COUNT)
        });
    };

    return (
        <div className="settings-screen glass-panel">
            <h2 className="settings-title">ゲーム設定</h2>
            <p className="settings-description">
                全ラウンドを通して、問題国と選択肢の国は重複しません。
            </p>

            <div className="settings-control">
                <label htmlFor="round-count" className="settings-label">
                    ラウンド数 ({MIN_ROUNDS} - {MAX_ROUNDS})
                </label>
                <div className="settings-input-row">
                    <input
                        id="round-count"
                        type="range"
                        min={MIN_ROUNDS}
                        max={MAX_ROUNDS}
                        value={settings.maxRounds}
                        onChange={(e) => handleRoundsChange(Number.parseInt(e.target.value, 10))}
                        className="settings-range"
                    />
                    <input
                        type="number"
                        min={MIN_ROUNDS}
                        max={MAX_ROUNDS}
                        value={settings.maxRounds}
                        onChange={(e) => handleRoundsChange(Number.parseInt(e.target.value, 10))}
                        className="settings-number-input"
                    />
                </div>
            </div>

            <div className="settings-control">
                <label htmlFor="option-count" className="settings-label">
                    1ラウンドあたりの選択肢数 ({MIN_OPTION_COUNT} - {MAX_OPTION_COUNT})
                </label>
                <div className="settings-input-row">
                    <input
                        id="option-count"
                        type="range"
                        min={MIN_OPTION_COUNT}
                        max={MAX_OPTION_COUNT}
                        value={settings.optionCount}
                        onChange={(e) => handleOptionCountChange(Number.parseInt(e.target.value, 10))}
                        className="settings-range"
                    />
                    <input
                        type="number"
                        min={MIN_OPTION_COUNT}
                        max={MAX_OPTION_COUNT}
                        value={settings.optionCount}
                        onChange={(e) => handleOptionCountChange(Number.parseInt(e.target.value, 10))}
                        className="settings-number-input"
                    />
                </div>
            </div>

            <div className="settings-actions">
                <button onClick={onBack} className="btn-glass">
                    メインメニューへ戻る
                </button>
            </div>
        </div>
    );
};

export default SettingsMenu;
