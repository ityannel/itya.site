import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import FadeIn from './FadeIn';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const Portfolio = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = [
    { img: "/img/portfolio1/slide9.png", id: "0" },
    { img: "/img/portfolio1/slide1.png", id: "1" },
    { img: "/img/portfolio1/slide2.png", id: "2" },
    { img: "/img/portfolio1/slide4.png", id: "3" },
    { img: "/img/portfolio1/slide5.png", id: "4" },
    { img: "/img/portfolio1/slide6.png", id: "5" },
    { img: "/img/portfolio1/slide7.png", id: "6" },
    { img: "/img/portfolio1/slide8.png", id: "7" },
  ];

  return (
    <div id="portfolio1" className="fade-section">
      <div className="row">
        <p className="bTitle">{t('portfolio.title')}</p>
      </div>
      
      {/* 幅の制御は .description や .portfolio-wrapper クラスで行う */}
      <FadeIn>
        
        {/* CSSで定義したクラスを当てる */}
        <div className="portfolio-wrapper">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={0}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop={true}
            onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
            style={{ 
              width: '100%', 
              height: '100%',
              '--swiper-navigation-color': '#000',
              '--swiper-pagination-color': '#000',
            }}
          >
            {slides.map((slide, index) => (
              <SwiperSlide key={index}>
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  padding: '10px' // 少し余白がないと画像が壁にぶつかる
                }}>
                  <img 
                    src={slide.img} 
                    alt={`slide-${index}`} 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain' 
                    }}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <p className="description" style={{ 
          marginTop: '20px', 
          minHeight: '1.5em',
          textAlign: 'left'
        }}>
          {t(`portfolio.items.${slides[activeIndex]?.id || 0}`)}
        </p>

        <a className="sTitle btn" href="#int-sns">{t('portfolio.next')}</a>
      </FadeIn>
    </div>
  );
};

export default Portfolio;