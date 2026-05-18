import { useTranslation } from 'react-i18next';
import FadeIn from './FadeIn';

const SNS = () => {
  const { t } = useTranslation();

  return (
    <div id="int-sns" className="fade-section">
      <div className="row">
        <p className="bTitle">{t('sns.title')}</p>
      </div>
      
      <FadeIn>
        <a className="snss" href="https://x.com/1itya" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'black', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold' }}>
          <img src={`${import.meta.env.BASE_URL}img/x.png`} alt="X Icon" style={{ width: '30px', height: '30px' }} />
          <span className="sns-id">@1itya</span>
        </a>

        <a className="snss" href="https://github.com/ityannel" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'black', marginBottom: '30px', fontSize: '18px', fontWeight: 'bold' }}>
          <img src={`${import.meta.env.BASE_URL}img/github.png`} alt="GitHub Icon" style={{ width: '30px', height: '30px' }} />
          <span className="sns-id">ityannel</span>
        </a>

        <a className="sTitle btn" href="#top" onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}>
          {t('sns.back')}
        </a>
      
      </FadeIn>
    </div>
  );
};

export default SNS;
