import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

export const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdf2f8]">
      <div className="text-center p-8 border-2 border-pink-200 rounded-3xl bg-white shadow-xl">
        <div className="text-6xl mb-6">🌸</div>
        <h1 className="mb-2 text-4xl font-bold text-pink-600">404</h1>
        <p className="mb-8 text-lg text-foreground/70">
          Oops! It seems this petal has drifted away.
        </p>
        <Link 
          to="/" 
          className="px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors duration-200 font-medium"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
