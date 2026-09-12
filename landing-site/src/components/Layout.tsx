import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from './ui';

export default function Layout() {
  return (
    <div className="min-h-screen text-carbon pb-10 flex flex-col">
      {/* Navigation */}
      <div className="container mx-auto px-6 pt-6 mb-10 max-w-[1200px]">
        <motion.nav 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-surface-card rounded-nav shadow-md px-6 py-4 flex justify-between items-center"
        >
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-highlighter-yellow w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg font-poppins text-carbon">
              M
            </div>
            <div className="font-poppins font-medium text-subheading tracking-tight">Motion OS</div>
          </Link>
          
          <div className="hidden md:flex gap-8 font-inter font-medium text-[15px]">
            <Link to="/#features" className="hover:text-signal-blue transition-colors">Features</Link>
            <Link to="/#philosophy" className="hover:text-signal-blue transition-colors">Philosophy</Link>
            <Link to="/privacy" className="hover:text-signal-blue transition-colors">Privacy</Link>
          </div>
          
          <div className="flex gap-3">
            <Button variant="ghost" className="px-6 py-3 text-[15px]">Log in</Button>
            <Button variant="black" className="px-6 py-3 text-[15px]">Download</Button>
          </div>
        </motion.nav>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 mt-20 max-w-[1200px]">
        <div className="border-t border-hairline-gray pt-10 pb-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-highlighter-yellow w-6 h-6 rounded flex items-center justify-center font-bold text-sm font-poppins text-carbon">
              M
            </div>
            <div className="font-poppins font-medium text-[15px] tracking-tight">Motion OS</div>
          </div>
          
          <div className="flex gap-6 font-inter text-sm text-carbon/70">
            <Link to="/" className="hover:text-signal-blue transition-colors">Home</Link>
            <Link to="/privacy" className="hover:text-signal-blue transition-colors">Privacy Policy</Link>
            <a href="https://github.com/prateekraiger/motion-os" target="_blank" rel="noreferrer" className="hover:text-signal-blue transition-colors">GitHub</a>
          </div>
          
          <div className="text-sm font-inter text-carbon/50">
            Make time count.
          </div>
        </div>
      </footer>
    </div>
  );
}
