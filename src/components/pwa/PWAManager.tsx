import React, { useState, useEffect } from 'react';
import { Download, WifiOff, RefreshCcw, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-expect-error - virtual module provided at build time by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export const PWAManager = () => {
  // 1. Offline/Online state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // 2. Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // 3. PWA Auto-Update logic
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show prompt if not already installed and we haven't dismissed it today
      if (!isInstalled && !localStorage.getItem('pwa_prompt_dismissed_today')) {
        setTimeout(() => setShowInstallPrompt(true), 5000); // Show after 5 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    let offlineTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      clearTimeout(offlineTimeout);
      setIsOffline(false);
    };

    const handleOffline = () => {
      // Delay showing offline status by 3 seconds to avoid flickers
      offlineTimeout = setTimeout(() => {
        setIsOffline(true);
      }, 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(offlineTimeout);
    };
  }, []);

  // Show Toast for PWA updates
  useEffect(() => {
    if (needRefresh) {
      toast('Đã có phiên bản mới! 🚀', {
        description: 'Vui lòng làm mới ứng dụng để trải nghiệm các tính năng mới nhất.',
        action: {
          label: 'Cập nhật ngay',
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity, // Keep showing until user clicks
        icon: <RefreshCcw className="h-4 w-4 animate-spin text-sakura" />
      });
    } else if (offlineReady) {
      toast.success('Sẵn sàng hoạt động ngoại tuyến! 📶', {
        description: 'App đã tải xong tài nguyên, bạn có thể học kể cả khi mất mạng.'
      });
    }
  }, [needRefresh, offlineReady, updateServiceWorker]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismissPrompt = () => {
    setShowInstallPrompt(false);
    // Dismiss for 24 hours
    localStorage.setItem('pwa_prompt_dismissed_today', 'true');
    setTimeout(() => {
      localStorage.removeItem('pwa_prompt_dismissed_today');
    }, 24 * 60 * 60 * 1000);
  };

  return (
    <>
      {/* Offline Indicator */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2 shadow-md"
          >
            <WifiOff className="h-3.5 w-3.5" />
            <span>Đang ngoại tuyến. Một số tính năng sẽ bị hạn chế.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install App Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-[90] w-[calc(100%-2rem)] sm:w-80 bg-white/90 backdrop-blur-xl border border-sakura/20 shadow-2xl rounded-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-sakura to-crimson p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Smartphone className="h-6 w-6" />
                <div>
                  <h4 className="font-black text-sm leading-tight">Cài đặt Ứng dụng</h4>
                  <p className="text-[10px] font-medium opacity-90">Truy cập nhanh, mượt hơn!</p>
                </div>
              </div>
              <button 
                onClick={handleDismissPrompt}
                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <ul className="space-y-2 text-xs text-foreground/70 font-medium">
                <li className="flex items-center gap-2">✨ <span>Hoạt động <b>siêu nhanh</b>, không giật lag.</span></li>
                <li className="flex items-center gap-2">✨ <span>Không bị làm phiền bởi thanh URL.</span></li>
                <li className="flex items-center gap-2">✨ <span>Sử dụng ngay cả khi <b>mất mạng</b>.</span></li>
              </ul>
              
              <button 
                onClick={handleInstallClick}
                className="w-full py-3 rounded-xl bg-sakura hover:bg-crimson text-white font-black text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> CÀI ĐẶT NGAY
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
