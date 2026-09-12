import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, CalendarDays, Activity } from 'lucide-react';
import { Button, PhoneMockup } from '../components/ui';

export default function Home() {
  return (
    <div className="container mx-auto px-6 max-w-[1200px]">
      {/* Hero Section */}
      <section className="text-center py-10 mb-24 max-w-[900px] mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-poppins font-bold text-display leading-[1.05] tracking-display mb-10 text-carbon"
        >
          Make time 
          <span className="inline-block mx-2 text-annotation-red text-5xl">●</span> 
          count 
          <span className="inline-block mx-2 text-signal-blue text-5xl">⏳</span>
          <br />
          with Motion OS.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-subheading text-carbon/70 mb-10 max-w-2xl mx-auto font-inter leading-subheading"
        >
          A quiet, private productivity app built around one idea: awareness of time should lead to action. Everything runs locally. No accounts, no servers.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 justify-center"
        >
          <Button variant="yellow">Download APK</Button>
          <Button variant="black" as="link" to="/#features">Explore Features</Button>
        </motion.div>
      </section>

      {/* Product Preview */}
      <motion.section 
        id="product"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-surface-card rounded-[35px] border border-hairline-gray p-4 min-h-[500px] shadow-[0_20px_40px_rgba(0,0,0,0.05)] relative overflow-hidden mb-24"
      >
        {/* Browser Controls */}
        <div className="flex gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-annotation-red"></div>
          <div className="w-3 h-3 rounded-full bg-highlighter-yellow"></div>
          <div className="w-3 h-3 rounded-full bg-signal-blue"></div>
        </div>
        
        {/* Canvas Area */}
        <div className="canvas-pattern bg-[#fcfcfc] rounded-2xl min-h-[450px] border border-hairline-gray p-10 flex flex-col gap-16 relative overflow-hidden">
          
          <div className="absolute top-20 right-20 w-96 h-96 bg-peach-wash/20 rounded-full blur-3xl -z-10"></div>
          
          {/* Flow Row 1 */}
          <div className="flex items-center justify-center gap-10 z-10 w-full flex-wrap lg:flex-nowrap">
            <div className="relative">
              <PhoneMockup label="Today Dashboard" icon={<Activity size={32} />} color="var(--color-carbon)" />
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                className="absolute -top-3 -right-5 bg-annotation-red text-paper-white px-3 py-1 rounded-full-3 text-[13px] font-medium shadow-md whitespace-nowrap"
              >
                What's next
              </motion.div>
            </div>
            
            <div className="hidden lg:block w-16 h-0.5 bg-carbon relative">
              <div className="absolute -right-1 -top-1 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-carbon"></div>
            </div>
            
            {/* Highlight Frame */}
            <div className="border-2 border-sunbeam rounded-[30px] p-6 flex gap-10 bg-sunbeam/5 relative flex-wrap lg:flex-nowrap">
              <PhoneMockup label="Tasks & Priorities" icon={<CheckCircle2 size={32} />} color="var(--color-signal-blue)" />
              
              <div className="hidden lg:block w-16 h-0.5 bg-carbon relative mt-[120px]">
                <div className="absolute -right-1 -top-1 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-carbon"></div>
              </div>
              
              <PhoneMockup label="Habit Streaks" icon={<CalendarDays size={32} />} color="var(--color-annotation-red)" />
            </div>
          </div>
          
          {/* Flow Row 2 */}
          <div className="flex items-center gap-10 lg:pl-[240px] z-10 flex-wrap lg:flex-nowrap justify-center lg:justify-start">
             <div className="hidden lg:block w-10 h-16 border-l-2 border-b-2 border-carbon rounded-bl-xl absolute left-[200px] top-[260px]">
                <div className="absolute -right-1 -bottom-1 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-carbon"></div>
             </div>
             
            <div className="relative">
              <PhoneMockup label="Focus Timer" icon={<Clock size={32} />} borderColor="var(--color-signal-blue)" />
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-3 -right-5 bg-signal-blue text-paper-white px-3 py-1 rounded-full-3 text-[13px] font-medium shadow-md whitespace-nowrap"
              >
                Pomodoro Mode
              </motion.div>
            </div>
          </div>
          
        </div>
      </motion.section>
      
      {/* Features Section */}
      <section id="features" className="mb-24 scroll-mt-24">
        <h2 className="font-poppins font-bold text-heading-lg mb-12 text-center">Quiet productivity.</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div whileHover={{ y: -5 }} className="bg-surface-card rounded-[35px] p-10 shadow-sm border border-hairline-gray">
            <div className="bg-sunbeam/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Activity className="text-carbon" />
            </div>
            <h3 className="font-poppins font-bold text-heading tracking-heading leading-heading mb-4">Today Dashboard</h3>
            <p className="font-inter text-body leading-body text-carbon/80">
              A dashboard that greets you, shows how much of the day is left, surfaces your next tasks and habits, and puts a one-tap focus timer front and centre.
            </p>
          </motion.div>
          
          <motion.div whileHover={{ y: -5 }} className="bg-surface-card rounded-[35px] p-10 shadow-sm border border-hairline-gray">
            <div className="bg-annotation-red/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Clock className="text-annotation-red" />
            </div>
            <h3 className="font-poppins font-bold text-heading tracking-heading leading-heading mb-4">Focus & Pomodoro</h3>
            <p className="font-inter text-body leading-body text-carbon/80">
              A Pomodoro-style timer with a live dot-ring, configurable work/break lengths, and long-break cycles. Every block is logged toward your active task.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="bg-surface-card rounded-[35px] p-10 shadow-sm border border-hairline-gray">
            <div className="bg-signal-blue/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <CalendarDays className="text-signal-blue" />
            </div>
            <h3 className="font-poppins font-bold text-heading tracking-heading leading-heading mb-4">Habits & Tasks</h3>
            <p className="font-inter text-body leading-body text-carbon/80">
              Capture and prioritise tasks, set due dates. Track daily habits with weekly goals, current streaks, and a tappable 28-day trail with 6 accent colours.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="bg-surface-card rounded-[35px] p-10 shadow-sm border border-hairline-gray relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-highlighter-yellow rounded-full blur-2xl opacity-40"></div>
            <div className="bg-carbon/5 w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
              <CheckCircle2 className="text-carbon" />
            </div>
            <h3 className="font-poppins font-bold text-heading tracking-heading leading-heading mb-4 relative z-10">Life Perspective</h3>
            <p className="font-inter text-body leading-body text-carbon/80 mb-6 relative z-10">
              The original Motion OS clocks: a live Life clock measuring age down to the millisecond, and a Year clock showing day, week, month, and year progress.
            </p>
            <a href="https://github.com/prateekraiger/motion-os" target="_blank" rel="noreferrer" className="font-inter font-bold text-signal-blue flex items-center gap-2 group relative z-10">
              View on GitHub <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>
      
      {/* Philosophy Section */}
      <section id="philosophy" className="mb-10 scroll-mt-24 bg-carbon text-paper-white rounded-[35px] p-12 md:p-20 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full canvas-pattern opacity-10 pointer-events-none"></div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <h2 className="font-poppins font-bold text-heading-lg mb-8">Instrument, not a feed.</h2>
          <p className="font-inter text-subheading leading-subheading text-paper-white/80 mb-10">
            Motion OS uses a monochrome, dot-led visual language with one red signal for the current moment. Each screen explains what it measures before showing the number. It's fully local, deeply private, and fiercely anti-distraction.
          </p>
          <Button variant="yellow" className="text-carbon">Start making time count</Button>
        </motion.div>
      </section>
    </div>
  );
}
