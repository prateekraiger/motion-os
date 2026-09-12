import { motion } from 'framer-motion';

export default function Privacy() {
  return (
    <div className="container mx-auto px-6 max-w-[800px] mt-10 mb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-card rounded-[35px] border border-hairline-gray p-10 md:p-16 shadow-sm"
      >
        <h1 className="font-poppins font-bold text-heading-lg mb-4 text-carbon">Privacy Policy</h1>
        <p className="font-inter text-body text-carbon/60 mb-12">Last Updated: September 2026</p>

        <div className="space-y-8 font-inter text-body leading-body text-carbon/80">
          <section>
            <h2 className="font-poppins font-bold text-heading-sm mb-4 text-carbon">1. Absolute Local Privacy</h2>
            <p>
              Motion OS is a quiet, private productivity app. Everything is stored locally on your device. There are no user accounts, no app servers, and no analytics tracking. 
            </p>
          </section>

          <section>
            <h2 className="font-poppins font-bold text-heading-sm mb-4 text-carbon">2. Data Storage</h2>
            <p>
              Your tasks, habits, focus sessions, and profile preferences are persisted securely on your device's local storage via standard platform persistence mechanisms. 
            </p>
            <p className="mt-4">
              You are completely in control of your data. The app provides built-in mechanisms to export all your data to a JSON file or your clipboard, and you can import it back at any time.
            </p>
          </section>

          <section>
            <h2 className="font-poppins font-bold text-heading-sm mb-4 text-carbon">3. Network Access</h2>
            <p>
              The application's core calculation engine and timers make zero network requests. The only external request made by the web shell is to load Google Fonts (such as Inter and Doto) when network access is available to display the interface correctly.
            </p>
          </section>
          
          <section>
            <h2 className="font-poppins font-bold text-heading-sm mb-4 text-carbon">4. Widget Architecture</h2>
            <p>
              Native Android widgets (Age in motion, Year in motion) store minimum widget state via native SharedPreferences. This is strictly required to power the home-screen remote views and contains no telemetry or remote connections.
            </p>
          </section>

          <div className="mt-16 pt-8 border-t border-hairline-gray text-center">
            <p className="font-inter font-medium text-carbon">
              Your time. Your data. Make time count.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
