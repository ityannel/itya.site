import { useTranslation } from 'react-i18next';
import '../App.css';

const Hero = () => {
  const { t } = useTranslation();

  return (
    <div id="top" className="fade-section">
      
      <div className="name-row">
        <h1 className="name-jp">{t('hero.title', 'いちゃ')}</h1>
        
        <span className="name-en">{t('hero.subtitle', 'ITYA')}</span>
      </div>

      <a className="btn" href="#int-name">
        {t('hero.button', '自己紹介')}
      </a>
    </div>
  );
}

export default Hero;