import { AnimatePresence } from 'framer-motion';
import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Atmosphere from './components/Atmosphere';
import CustomCursor from './components/CustomCursor';
import Navigation from './components/Navigation';
import Preloader from './components/Preloader';
import About from './pages/About';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Shop from './pages/Shop';
import Visit from './pages/Visit';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => {
  return (
    <BrowserRouter>
      {/* Global Effects Layer */}
      <Atmosphere />
      <CustomCursor />
      
      {/* Introduction Sequence */}
      <AnimatePresence mode="wait">
        <Preloader />
      </AnimatePresence>

      {/* Main App Structure */}
      <Navigation />
      <ScrollToTop />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/visit" element={<Visit />} />
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;