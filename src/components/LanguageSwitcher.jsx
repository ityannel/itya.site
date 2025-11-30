import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../App.css';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages = {
        ja: '日本語',
        en: 'English',
        zh: '中文'
    }
    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
    };

    return (
        <div className="language-switcher">
            <button
                className="lang-btn main-btn"
                onClick={() => setIsOpen(!isOpen)}
            >
                {languages[i18n.language] || 'Language?'}
                <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
            </button>

            {isOpen && (
                <ul className="lang-menu">
                    {Object.keys(languages).map((lng) => (
                        <li key={lng}>
                            <button
                                className="lang-item"
                                onClick={() => changeLanguage(lng)}
                            >
                                {languages[lng]}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LanguageSwitcher;