import React, { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  Clock, 
  Video, 
  Search, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Interview {
  id: string;
  name: string;
  email: string;
  mockInterview: {
    meetLink: string;
    startTime: string;
    endTime: string;
  };
}

export default function MockInterviewList() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/public-mock-interviews");
      const data = await res.json();
      if (data.success) {
        setInterviews(data.interviews);
      }
    } catch (err) {
      console.error("Failed to fetch interviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const filteredInterviews = interviews.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-full text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
          <GraduationCap className="w-3.5 h-3.5" />
          Z444 Mock Interview Schedule
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Live Mock Interview Slots
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Check your assigned time slot and join the Google Meet link at the specified time for your mock interview.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col md:flex-row items-center gap-4 sticky top-4 z-10 transition-colors duration-300">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search your name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <button 
          onClick={fetchInterviews}
          disabled={isLoading}
          className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-900/10"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Slots
        </button>
      </div>

      {isLoading && interviews.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No schedules found</h3>
          <p className="text-slate-500 text-sm">Either no interviews are scheduled yet, or we couldn't find a match for your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInterviews.map((interview) => (
            <motion.div
              key={interview.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="flex flex-col h-full gap-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-indigo-600/20">
                      {interview.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">{interview.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{interview.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {interview.mockInterview.startTime} - {interview.mockInterview.endTime}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    Assigned Slot
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Google Meet Session
                  </span>
                  <a
                    href={interview.mockInterview.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-all group-hover:translate-x-1"
                  >
                    Join Session
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
