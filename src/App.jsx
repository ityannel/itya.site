import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css'
import LanguageSwitcher from './components/LanguageSwitcher';
import Hero from './components/Hero';
import Section from './components/Section';
import SkinViewer from './components/SkinViewer';
import Portfolio from './components/Portfolio';
import Loader from './components/Loader';
import SNS from './components/SNS';

function App() {
  const { t, i18n } = useTranslation(); // i18nを追加！
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <> 
      <Loader isLoading={isLoading} /> 
      <div className="App">
        <div id="leftside">
          <SkinViewer />
        </div>

        <div id="rightside">
          <LanguageSwitcher />
          <Hero />

          <Section 
            id="int-name"
            title={t('profile.title')}
            text={t('profile.text')}
            nextId="int-kosen"
            nextText={t('profile.next')}
          />

          <Section 
              id="int-kosen"
              title={t('kosen.title')}
              text={t('kosen.text')}
              nextId="int-field"
              nextText={t('kosen.next')}
            />

            <Section 
              id="int-field"
              title={t('design.title')}
              text={t('design.text')}
              nextId="portfolio1"
              nextText={t('design.next')}
            />

            <Portfolio />

            <SNS />
        </div>
      </div>
    </>
  )
}

export default App;