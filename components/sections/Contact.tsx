import Link from 'next/link';
 
export default function ContactPage() {
  return (
    <section id="contact"
     className="flex min-h-screen flex-col items-center justify-start relative overflow-x-hidden bg-[#05060a] pt-20 md:pt-32 pb-0 px-4 md:px-6 font-mono">
      
      {/* CYBER GRID BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none opacity-10 z-0 fixed"
           style={{ 
             backgroundImage: `linear-gradient(rgba(0, 210, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(ellipse at top, black, transparent 80%)'
           }} 
      />
 
      {/* Blue Cyber Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[500px] bg-[#00d2ff]/10 blur-[150px] rounded-full pointer-events-none -z-10" />
 
      {/* HEADER */}
      <div className="max-w-4xl w-full text-center mb-10 md:mb-16 z-10">
        <span className="text-[#00d2ff] font-mono text-xs md:text-sm tracking-[0.3em] md:tracking-[0.4em] uppercase mb-4 block">
          Directory / Ping_Us
        </span>
        <h1 className="text-4xl md:text-7xl font-extrabold text-white tracking-widest mb-6 uppercase">
          Get in <span className="text-[#00d2ff]">Touch</span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto font-mono">
          <span className="text-[#00d2ff]">&gt;</span> Have questions or want to collaborate? The terminal is open.
        </p>
      </div>
 
      {/* MAIN CONTACT SECTION */}
      <div className="w-full max-w-6xl z-10 mb-16 md:mb-24 grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12">
        
        {/* LEFT COLUMN: CONTACT INFO */}
        <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 tracking-tight">System Endpoints</h2>
          <p className="text-gray-500 text-sm mb-2 md:mb-4">Reach out to us through any of these authorized channels.</p>
 
          {/* Email Card */}
          <div className="bg-[#0a0c10] border border-white/5 rounded-2xl p-5 md:p-6 flex items-start gap-4 hover:border-[#00d2ff]/50 transition-all duration-300 group">
            <div className="w-11 h-11 md:w-12 md:h-12 bg-[#00d2ff]/10 rounded-xl flex items-center justify-center text-[#00d2ff] shrink-0 border border-[#00d2ff]/20 group-hover:bg-[#00d2ff] group-hover:text-black transition-all">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h4 className="text-white font-bold mb-1 uppercase text-xs tracking-widest">Email</h4>
              <p className="text-[#00d2ff] text-sm font-mono hover:underline cursor-pointer break-all">root@codeforcause.tech</p>
            </div>
          </div>
 
          {/* Location Card */}
          <div className="bg-[#0a0c10] border border-white/5 rounded-2xl p-5 md:p-6 flex items-start gap-4 hover:border-[#00d2ff]/50 transition-all duration-300 group">
            <div className="w-11 h-11 md:w-12 md:h-12 bg-[#00d2ff]/10 rounded-xl flex items-center justify-center text-[#00d2ff] shrink-0 border border-[#00d2ff]/20 group-hover:bg-[#00d2ff] group-hover:text-black transition-all">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <h4 className="text-white font-bold mb-1 uppercase text-xs tracking-widest">Location</h4>
              <p className="text-gray-500 text-sm leading-relaxed">
                Department of EC Engineering, CSPIT<br/>
                CHARUSAT Campus, Off. Nadiad-Petlad Highway<br/>
                Changa - 388421
              </p>
            </div>
          </div>
 
          {/* Office Hours Card */}
          <div className="bg-[#0a0c10] border border-[#00d2ff]/10 rounded-2xl p-5 md:p-6 shadow-[inset_0_0_20px_rgba(0,210,255,0.02)]">
            <h4 className="text-white font-bold mb-3 uppercase text-xs tracking-widest">Working Hours</h4>
            <p className="text-gray-400 text-sm mb-2">
              <strong className="text-[#00d2ff]">Mon - Sat:</strong> 09:10 AM - 4:20 PM (Except 2nd & 4th Sat)
            </p>
            <p className="text-gray-400 text-sm">
              <strong className="text-red-500/80">Sun:</strong>[ CAMPUS OFFLINE ] University closed on Sundays. We'll respond next working day
            </p>
          </div>
        </div>
 
        {/* RIGHT COLUMN: MESSAGE FORM */}
        <div className="lg:col-span-3">
          <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d2ff]/5 blur-3xl -z-10 group-hover:bg-[#00d2ff]/10 transition-all" />
            
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Contact us</h2>
            <p className="text-gray-500 text-sm mb-6 md:mb-8 font-mono tracking-tighter">Fill out the form below and we'll process your request within 24 hours.</p>
 
            <form className="flex flex-col gap-5 md:gap-6">
              
              {/* Name & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Name <span className="text-[#00d2ff]">*</span></label>
                  <input 
                    type="text" 
                    placeholder="USER_NAME" 
                    className="bg-[#05060a] border border-white/10 rounded-xl p-3 md:p-4 text-white placeholder-gray-700 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff]/20 transition-all text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email <span className="text-[#00d2ff]">*</span></label>
                  <input 
                    type="email" 
                    placeholder="USER_EMAIL@EXAMPLE.COM" 
                    className="bg-[#05060a] border border-white/10 rounded-xl p-3 md:p-4 text-white placeholder-gray-700 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff]/20 transition-all text-sm"
                  />
                </div>
              </div>
 
              {/* Subject */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subject <span className="text-[#00d2ff]">*</span></label>
                <input 
                  type="text" 
                  placeholder="INQUIRY_TYPE" 
                  className="bg-[#05060a] border border-white/10 rounded-xl p-3 md:p-4 text-white placeholder-gray-700 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff]/20 transition-all text-sm"
                />
              </div>
 
              {/* Message */}
              <div className="flex flex-col gap-2 mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message <span className="text-[#00d2ff]">*</span></label>
                <textarea 
                  rows={5} 
                  placeholder="ENTER_DATA..." 
                  className="bg-[#05060a] border border-white/10 rounded-xl p-3 md:p-4 text-white placeholder-gray-700 focus:outline-none focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff]/20 transition-all resize-none text-sm"
                />
              </div>
 
              {/* Submit Button */}
              <button 
                type="button" 
                className="w-full bg-[#00d2ff]/10 border border-[#00d2ff]/40 text-[#00d2ff] font-extrabold text-sm py-3 md:py-4 rounded-xl hover:bg-[#00d2ff] hover:text-black shadow-[0_0_30px_rgba(0,210,255,0.1)] transition-all duration-300 flex justify-center items-center gap-3 uppercase tracking-[0.2em] group"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Send Message
              </button>
 
            </form>
          </div>
        </div>
      </div>
 
      {/* SYSTEM FEEDBACK STRIP */}
      <div className="w-full mt-8 md:mt-12 mb-16 md:mb-24 animate-fadeUp">
        <div className="bg-[#0a0c10] border-y border-[#00d2ff]/20 py-5 md:py-6 px-4 md:px-8 relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]" />
          
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h4 className="text-[#00d2ff] font-bold uppercase text-[10px] tracking-[0.4em] flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse shadow-[0_0_10px_#00d2ff]" />
                SYSTEM_FEEDBACK_NODE
                <span className="hidden sm:inline">// ROOT_ACCESS_ENABLED</span>
              </h4>
              <div className="hidden sm:flex gap-4 text-gray-600 text-[9px] font-mono tracking-widest">
                <span>BUFFER_SIZE: 1024KB</span>
                <span className="text-[#00d2ff]/40">V2.0.4_STABLE</span>
              </div>
            </div>
            
            {/* Input Row */}
            <form className="flex flex-col sm:flex-row gap-3 md:gap-4 items-stretch sm:items-center">
              <div className="relative flex-grow">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00d2ff] font-bold text-xs">$</span>
                <input 
                  type="text" 
                  placeholder="ENTER_BUG_OR_OPTIMIZATION_LOG..." 
                  className="w-full bg-[#05060a] border border-white/5 rounded-xl pl-10 pr-4 py-3 md:py-4 text-xs text-white placeholder-gray-800 focus:border-[#00d2ff]/50 outline-none transition-all font-mono shadow-inner uppercase"
                />
              </div>
              
              <button 
                type="button" 
                className="sm:shrink-0 px-6 md:px-10 py-3 md:py-4 bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-xs text-[#00d2ff] font-black rounded-xl hover:bg-[#00d2ff] hover:text-black transition-all duration-300 uppercase tracking-[0.2em] flex items-center justify-center gap-3 group"
              >
                PUSH_LOG
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}