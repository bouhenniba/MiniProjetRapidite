import React, { useState } from 'react';

const TailwindTest = () => {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-600 dark:text-blue-400">
            Tailwind CSS Test
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                Colors Working ✅
              </h3>
              <div className="space-y-2">
                <div className="w-full h-4 bg-red-500 rounded"></div>
                <div className="w-full h-4 bg-blue-500 rounded"></div>
                <div className="w-full h-4 bg-green-500 rounded"></div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold mb-4 text-purple-600 dark:text-purple-400">
                Spacing Working ✅
              </h3>
              <div className="space-y-4">
                <div className="p-2 bg-yellow-200 dark:bg-yellow-800 rounded">Small padding</div>
                <div className="p-4 bg-pink-200 dark:bg-pink-800 rounded">Medium padding</div>
                <div className="p-6 bg-indigo-200 dark:bg-indigo-800 rounded">Large padding</div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold mb-4 text-orange-600 dark:text-orange-400">
                Flexbox Working ✅
              </h3>
              <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded">
                <span>Left</span>
                <span>Center</span>
                <span>Right</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={toggleDarkMode}
              className="btn-primary mr-4"
            >
              Toggle Dark Mode
            </button>
            <button className="btn-secondary">
              Secondary Button
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you can see styled colors, spacing, and buttons above, Tailwind CSS is working correctly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailwindTest;